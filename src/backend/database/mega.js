import { Storage } from "megajs";

// Cache des connexions pour éviter trop de logins
const connectionCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes pour éviter trop de reconnexions et blocages MEGA
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
    timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(message));
    }, ms);
  });
  
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

// Exponential backoff pour éviter les blocages
async function retryOperation(operation, attempts = 1, baseTimeoutMs = 5000, baseDelayMs = 100) {
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

export async function getClient(env) {
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

  // Créer une nouvelle connexion avec optimisations pour éviter le blocage MEGA
  const storage = new Storage({ 
    email, 
    password,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", // UserAgent navigateur standard pour éviter suspicion
    keepalive: true, // Activé pour éviter les reconnexions fréquentes
    autoload: true, // Activé pour s'assurer que root est disponible
    autologin: true // Garder le login automatique
  });
  
  await withTimeout(storage.ready, 15000, "Mega login timed out"); // Timeout augmenté pour éviter les échecs de connexion
  
  // Attendre un peu plus que root soit chargé si autoload est activé
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Vérifier que root est disponible
  if (!storage.root) {
    throw new Error("Storage root not available after login");
  }
  
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

  // Vérifier que storage.root existe
  if (!current) {
    throw new Error("Storage root not available");
  }

  for (const segment of segments) {
    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      current.children, 
      2000, 
      `Children loading timeout for ${segment}`
    );
    
    let folder = children.find(child => child.name === segment && child.directory);
    if (!folder) {
      folder = await withTimeout(
        current.mkdir(segment), 
        2000, 
        `Mkdir timeout for ${segment}`
      );
    }
    current = folder;
    
    // Vérifier que current n'est pas null après l'itération
    if (!current) {
      throw new Error(`Failed to navigate to folder: ${segment}`);
    }
  }

  return current;
}

async function getFolderIfExists(storage, folderPath) {
  const normalized = normalizePath(folderPath);
  if (!normalized) return storage.root;

  const segments = normalized.split("/").filter(Boolean);
  let current = storage.root;

  // Vérifier que storage.root existe
  if (!current) {
    throw new Error("Storage root not available");
  }

  for (const segment of segments) {
    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      current.children, 
      2000, 
      `Children loading timeout for ${segment}`
    );
    
    const folder = children.find(child => child.name === segment && child.directory);
    if (!folder) return null;
    current = folder;
    
    // Vérifier que current n'est pas null après l'itération
    if (!current) {
      return null;
    }
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
        // Optimisations de download pour éviter les blocages
        const buffer = await withTimeout(
          file.downloadBuffer({
            maxConnections: 1, // 1 connexion unique pour minimiser la charge
            initialChunkSize: 65536, // 64KB pour réduire le nombre de requêtes
            chunkSizeIncrement: 65536, // 64KB incréments
            maxChunkSize: 524288, // 512KB max
          }), 
          10000, 
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

    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      folder.children, 
      2000, 
      `Children loading timeout for ${fullPath}`
    );
    
    const fileNode = children.find(child => child.name === fileName && !child.directory);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }

    const buffer = await withTimeout(
      fileNode.downloadBuffer({
        maxConnections: 1,
        initialChunkSize: 65536,
        chunkSizeIncrement: 65536,
        maxChunkSize: 524288,
      }), 
      10000, 
      `Mega download timed out for ${fullPath}`
    );
    const text = Buffer.from(buffer).toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }, 1, 5000, 100);
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
    
    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      folder.children, 
      2000, 
      `Children loading timeout for ${fullPath}`
    );
    
    const existing = children.find(child => child.name === fileName && !child.directory);

    if (existing) {
      await existing.delete();
    }

    const uploadPromise = new Promise((resolve, reject) => {
      // Optimisations d'upload pour éviter les blocages
      folder.upload({ 
        name: fileName, 
        size: content.length,
        maxConnections: 1, // 1 connexion unique
        initialChunkSize: 65536, // 64KB pour réduire le nombre de requêtes
        chunkSizeIncrement: 65536, // 64KB incréments
        maxChunkSize: 524288, // 512KB max
      }, content, (err, file) => {
        if (err) reject(err);
        else resolve(file);
      });
    });

    const file = await withTimeout(uploadPromise, 10000, `Mega upload timed out for ${fullPath}`);
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  }, 1, 5000, 100);
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

    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      folder.children, 
      2000, 
      `Children loading timeout for ${fullPath}`
    );
    
    const existing = children.find(child => child.name === fileName && !child.directory);
    if (!existing) return { deleted: false };
    await existing.delete();
    return { deleted: true };
  }, 1, 5000, 100);
}
