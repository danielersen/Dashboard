import { Storage } from "megajs";

// Cache des connexions pour éviter trop de logins
const connectionCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (réduit pour économiser la mémoire)
const MAX_CACHE_SIZE = 2; // Maximum 2 connexions simultanées

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
async function retryOperation(operation, attempts = 3, baseTimeoutMs = 3000, baseDelayMs = 300) {
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

  // Créer une nouvelle connexion avec userAgent personnalisé
  const storage = new Storage({ 
    email, 
    password,
    userAgent: "DashboardWorker/1.0", // UserAgent personnalisé pour éviter le blocage
    keepalive: false // Désactivé pour économiser les ressources
  });
  
  await withTimeout(storage.ready, 15000, "Mega login timed out"); // Timeout réduit
  
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
        const buffer = await withTimeout(file.downloadBuffer(), 10000, `Mega download timed out for ${fullPath}`);
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

    const buffer = await withTimeout(fileNode.downloadBuffer(), 10000, `Mega download timed out for ${fullPath}`);
    const text = Buffer.from(buffer).toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }, 4, 10000, 500);
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
      folder.upload({ name: fileName, size: content.length }, content, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
    });

    const file = await withTimeout(uploadPromise, 15000, `Mega upload timed out for ${fullPath}`);
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  }, 4, 15000, 500);
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
  });
}
