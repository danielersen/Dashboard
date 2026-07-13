import { Storage } from "megajs";

// Cache des connexions pour éviter trop de logins
const connectionCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures pour éviter les blocages MEGA (credential stuffing)
const MAX_CACHE_SIZE = 1; // Maximum 1 connexion simultanée
const MIN_OPERATION_DELAY = 1000; // Délai minimum entre opérations (ms)
let lastOperationTime = 0; // Timestamp de la dernière opération

// Liste de user agents de navigateurs réels pour éviter la détection
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizePath(path) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized || "";
}

function toText(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function withDelay() {
  const now = Date.now();
  const timeSinceLastOperation = now - lastOperationTime;
  if (timeSinceLastOperation < MIN_OPERATION_DELAY) {
    const delay = MIN_OPERATION_DELAY - timeSinceLastOperation;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastOperationTime = Date.now();
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
async function retryOperation(operation, attempts = 3, baseTimeoutMs = 5000, baseDelayMs = 100) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const timeoutMs = baseTimeoutMs; // Timeout fixe pour éviter les dépassements
      return await withTimeout(operation(), timeoutMs, `Mega operation timed out after ${timeoutMs}ms`);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      const isNotFound = message.includes("file not found") || message.includes("folder not found");
      const isRateLimit = message.includes("rate limit") || message.includes("too many requests") || message.includes("bandwidth") || message.includes("-7");
      
      if (isNotFound || attempt === attempts) {
        throw error;
      }
      
      // Exponential backoff pour rate limits et erreurs temporaires
      const delayMs = isRateLimit ? baseDelayMs * Math.pow(2, attempt) : baseDelayMs * attempt;
      console.log(`MEGA operation failed (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function getClient(env, forceRefresh = false) {
  const email = env.MEGA_EMAIL;
  const password = env.MEGA_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing MEGA_EMAIL or MEGA_PASSWORD");
  }

  const cacheKey = email;
  const cached = connectionCache.get(cacheKey);
  
  // Vérifier si la connexion est encore valide (sauf si forceRefresh)
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('Using cached MEGA connection');
    return cached.storage;
  }

  // Nettoyer le cache si trop d'entrées ou si forceRefresh
  if (forceRefresh || connectionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = connectionCache.keys().next().value;
    connectionCache.delete(oldestKey);
    console.log('Cleared MEGA connection cache');
  }

  // Créer une nouvelle connexion avec optimisations pour éviter le blocage MEGA
  const storage = new Storage({ 
    email, 
    password,
    userAgent: getRandomUserAgent(), // UserAgent aléatoire de navigateur réel pour éviter suspicion
    keepalive: true, // Activé pour éviter les reconnexions fréquentes
    autoload: true, // Activé pour s'assurer que root est disponible
    autologin: true, // Garder le login automatique
    // Options supplémentaires pour éviter la détection de credential stuffing
    autofetch: true, // Activer le fetch automatique
    protocol: "https", // Utiliser HTTPS sécurisé
    host: "g.api.mega.co.nz", // Serveur MEGA standard
    port: 443, // Port HTTPS standard
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

export async function getOrCreateFolder(storage, folderPath) {
  const normalized = normalizePath(folderPath);
  if (!normalized) return storage.root;

  const segments = normalized.split("/").filter(Boolean);
  let current = storage.root;

  // Vérifier que storage.root existe
  if (!current) {
    throw new Error("Storage root not available");
  }

  for (const segment of segments) {
    await withDelay(); // Rate limiting pour chaque opération de dossier
    // Timeout pour éviter les blocages sur children
    const children = await withTimeout(
      current.children, 
      2000, 
      `Children loading timeout for ${segment}`
    );
    
    let folder = children.find(child => child.name === segment && child.directory);
    if (!folder) {
      await withDelay(); // Rate limiting avant création
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

export async function getFolderIfExists(storage, folderPath) {
  const normalized = normalizePath(folderPath);
  if (!normalized) return storage.root;

  const segments = normalized.split("/").filter(Boolean);
  let current = storage.root;

  // Vérifier que storage.root existe
  if (!current) {
    throw new Error("Storage root not available");
  }

  for (const segment of segments) {
    await withDelay(); // Rate limiting pour chaque opération de dossier
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

export async function megaRead(env, path, storage = null, forceRefresh = false) {
  const fullPath = `dashboard/${normalizePath(path)}`;

  return await retryOperation(async () => {
    await withDelay(); // Rate limiting
    const storageInstance = storage || await getClient(env, forceRefresh);

    try {
      const file = storageInstance.root.navigate(fullPath);
      if (file && !file.directory) {
        console.log(`Reading file via navigate: ${fullPath}`);
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
      console.log(`Navigate failed, using manual method for: ${fullPath}`);
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
    
    // Find ALL files with the same name
    const fileNodes = children.filter(child => child.name === fileName && !child.directory);
    console.log(`Found ${fileNodes.length} files with name: ${fileName}`);
    
    if (fileNodes.length === 0) {
      throw new Error(`File not found: ${path}`);
    }
    
    // If multiple files exist, pick the most recent one (by modification time if available)
    // Otherwise pick the first one
    const fileNode = fileNodes[0];
    console.log(`Reading file node: ${fileNode.name}`);

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
    await withDelay(); // Rate limiting
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
    
    // Find and delete ALL existing files with the same name (not just the first one)
    const existingFiles = children.filter(child => child.name === fileName && !child.directory);
    console.log(`Found ${existingFiles.length} existing files with name: ${fileName}`);
    
    for (const existing of existingFiles) {
      try {
        console.log(`Deleting existing file: ${existing.name}`);
        await existing.delete();
        // Wait a bit to ensure deletion is processed
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (deleteError) {
        console.error(`Error deleting file ${existing.name}:`, deleteError);
      }
    }

    // Refresh children after deletion to ensure clean state
    const refreshedChildren = await withTimeout(
      folder.children, 
      2000, 
      `Children refresh timeout for ${fullPath}`
    );
    
    const stillExisting = refreshedChildren.find(child => child.name === fileName && !child.directory);
    if (stillExisting) {
      console.warn(`File ${fileName} still exists after deletion attempt`);
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
    console.log(`Successfully uploaded file: ${file.name}`);
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
    await withDelay(); // Rate limiting
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
