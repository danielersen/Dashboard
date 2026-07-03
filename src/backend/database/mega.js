import { Storage } from "megajs";

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

async function retryOperation(operation, attempts = 4, timeoutMs = 3000, delayMs = 200) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await withTimeout(operation(), timeoutMs, `Mega operation timed out after ${timeoutMs}ms`);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      const isNotFound = message.includes("file not found") || message.includes("folder not found");
      if (isNotFound || attempt === attempts) {
        throw error;
      }
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

  const storage = new Storage({ email, password });
  await withTimeout(storage.login(), 20000, "Mega login timed out");
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

export async function megaRead(env, path) {
  const fullPath = `dashboard/${normalizePath(path)}`;

  return await retryOperation(async () => {
    const storage = await getClient(env);

    try {
      const file = storage.root.navigate(fullPath);
      if (file && !file.directory) {
        const buffer = await withTimeout(file.downloadBuffer(), 3000, `Mega download timed out for ${fullPath}`);
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

    const folder = folderPath ? await getFolderIfExists(storage, folderPath) : storage.root;
    if (!folder) {
      throw new Error(`File not found: ${path}`);
    }

    const children = await folder.children;
    const fileNode = children.find(child => child.name === fileName && !child.directory);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }

    const buffer = await withTimeout(fileNode.downloadBuffer(), 3000, `Mega download timed out for ${fullPath}`);
    const text = Buffer.from(buffer).toString("utf8");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}

export async function megaWrite(env, path, body) {
  const fullPath = `dashboard/${normalizePath(path)}`;
  const content = Buffer.from(toText(body), "utf8");

  return await retryOperation(async () => {
    const storage = await getClient(env);

    const segments = fullPath.split("/").filter(Boolean);
    const fileName = segments.at(-1);
    const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

    const folder = folderPath ? await getOrCreateFolder(storage, folderPath) : storage.root;
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

    const file = await uploadPromise;
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  }, 4, 3000, 200);
}
