import { Storage } from "megajs";

// Cache des connexions pour éviter trop de logins
const connectionCache = new Map();
const CACHE_TTL = 1 * 60 * 1000; // 1 minute (très réduit pour économiser la mémoire)
const MAX_CACHE_SIZE = 1; // Maximum 1 connexion simultanée

function normalizePath(path) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized || "";
}

function toText(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

// Exponential backoff pour éviter les blocages
async function retryOperation(operation, attempts = 2, baseTimeoutMs = 1500, baseDelayMs = 50) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const timeoutMs = baseTimeoutMs; // Timeout fixe pour éviter les dépassements
      return await withTimeout(operation(), timeoutMs, `Mega operation timed out after ${timeoutMs}ms`);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      const isNotFound = message.includes("file not found") || message.includes("folder not found");
      const isRateLimit = message.includes("rate limit") || message.includes("too many requests") || message.includes("bandwidth");
      
      if (isNotFound || attempt === attempts) {
        throw error;
      }
      
      // Exponential backoff pour rate limits
      const delayMs = isRateLimit ? baseDelayMs * Math.pow(2, attempt) : baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

async function getClient(env) {
  const email = env.MEGA_EMAIL;
  const password = env.MEGA_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing MEGA_EMAIL or MEGA_PASSWORD");
  }

  const cacheKey = email;
  const cached = connectionCache.get(cacheKey);
  
  // Vérifier si la connexion est encore valide
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.storage;
  }

  // Nettoyer le cache si trop d'entrées
  if (connectionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = connectionCache.keys().next().value;
    connectionCache.delete(oldestKey);
  }

  // Créer une nouvelle connexion avec optimisations de performance maximales
  const storage = new Storage({ 
    email, 
    password,
    userAgent: "DashboardWorker/1.0", // UserAgent personnalisé pour éviter le blocage
    keepalive: false, // Désactivé pour économiser les ressources
    autoload: false, // Désactivé pour éviter de charger toute la structure
    autologin: true, // Garder le login automatique
    // Autres optimisations potentielles selon la doc MEGA
  });
  
  await withTimeout(storage.ready, 3000, "Mega login timed out"); // Timeout ultra-réduit
  
  // Mettre en cache
  connectionCache.set(cacheKey, {
    storage,
    timestamp: Date.now()
  });
  
  return storage;
}

async function getOrCreateFolder(storage, folderPath) {
  const normalized = normalizePath(folderPath);
  if (!normalized) return storage.root;

  const segments = normalized.split("/").filter(Boolean);
  let current = storage.root;

  for (const segment of segments) {
    const children = await current.children;
    let folder = children.find(child => child.name === segment && child.directory);
    if (!folder) {
      folder = await current.mkdir(segment);
    }
    current = folder;
  }

  return current;
}

async function getFolderIfExists(storage, folderPath) {
  const normalized = normalizePath(folderPath);
  if (!normalized) return storage.root;

  const segments = normalized.split("/").filter(Boolean);
  let current = storage.root;

  for (const segment of segments) {
    const children = await current.children;
    const folder = children.find(child => child.name === segment && child.directory);
    if (!folder) return null;
    current = folder;
  }

  return current;
}

async function ensureParentFolder(storage, path) {
  const normalized = normalizePath(path);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  const folderPath = segments.slice(0, -1).join("/");
  return await getOrCreateFolder(storage, folderPath);
}

export async function megaRead(env, path, storage = null) {
  const fullPath = `dashboard/${normalizePath(path)}`;

  return await retryOperation(async () => {
    const storageInstance = storage || await getClient(env);

    try {
      const file = storageInstance.root.navigate(fullPath);
      if (file && !file.directory) {
        // Optimisations de download ultra-rapides
        const buffer = await withTimeout(
          file.downloadBuffer({
            maxConnections: 1, // 1 connexion unique pour minimiser la charge
            initialChunkSize: 16384, // 16KB encore plus petit
            chunkSizeIncrement: 16384, // 16KB incréments
            maxChunkSize: 131072, // 128KB max
          }), 
          3000, 
          `Mega download timed out for ${fullPath}`
        );
        const text = Buffer.from(buffer).toString("utf8");
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    } catch (e) {
      // Fallback à la méthode manuelle
    }

    const segments = fullPath.split("/").filter(Boolean);
    const fileName = segments.at(-1);
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

    const folder = folderPath ? await getFolderIfExists(storageInstance, folderPath) : storageInstance.root;
    if (!folder) {
      throw new Error(`File not found: ${path}`);
    }

    const children = await folder.children;
    const fileNode = children.find(child => child.name === fileName && !child.directory);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }

    const buffer = await withTimeout(
      fileNode.downloadBuffer({
        maxConnections: 1,
        initialChunkSize: 16384,
        chunkSizeIncrement: 16384,
        maxChunkSize: 131072,
      }), 
      3000, 
      `Mega download timed out for ${fullPath}`
    );
    const text = Buffer.from(buffer).toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }, 2, 3000, 50);
}

export async function megaWrite(env, path, body, storage = null) {
  const fullPath = `dashboard/${normalizePath(path)}`;
  const content = Buffer.from(toText(body), "utf8");

  return await retryOperation(async () => {
    const storageInstance = storage || await getClient(env);

    const segments = fullPath.split("/").filter(Boolean);
    const fileName = segments.at(-1);
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

    const folder = folderPath ? await getOrCreateFolder(storageInstance, folderPath) : storageInstance.root;
    const children = await folder.children;
    const existing = children.find(child => child.name === fileName && !child.directory);

    if (existing) {
      await existing.delete();
    }

    const uploadPromise = new Promise((resolve, reject) => {
      // Optimisations d'upload ultra-rapides
      folder.upload({ 
        name: fileName, 
        size: content.length,
        maxConnections: 1, // 1 connexion unique
        initialChunkSize: 16384, // 16KB très petit
        chunkSizeIncrement: 16384, // 16KB incréments
        maxChunkSize: 131072, // 128KB max
      }, content, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
    });

    const file = await withTimeout(uploadPromise, 3000, `Mega upload timed out for ${fullPath}`);
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  }, 2, 3000, 50);
}

export async function megaDelete(env, path) {
  const fullPath = `dashboard/${normalizePath(path)}`;

  return await retryOperation(async () => {
    const storage = await getClient(env);

    const segments = fullPath.split("/").filter(Boolean);
    const fileName = segments.at(-1);
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

    const folder = folderPath ? await getFolderIfExists(storage, folderPath) : storage.root;
    if (!folder) {
      // nothing to delete
      return { deleted: false };
    }

    const children = await folder.children;
    const existing = children.find(child => child.name === fileName && !child.directory);
    if (!existing) return { deleted: false };
    await existing.delete();
    return { deleted: true };
  }, 2, 3000, 50);
}
