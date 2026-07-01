import { Storage } from "megajs";

function normalizePath(path) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized || "";
}

function toText(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function getClient(env) {
  const email = env.MEGA_EMAIL;
  const password = env.MEGA_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing MEGA_EMAIL or MEGA_PASSWORD");
  }

  const storage = new Storage({ email, password });
  await storage.login();
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

async function ensureParentFolder(storage, path) {
  const normalized = normalizePath(path);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  const folderPath = segments.slice(0, -1).join("/");
  return await getOrCreateFolder(storage, folderPath);
}

export async function megaRead(env, path) {
  const storage = await getClient(env);
  const normalizedPath = normalizePath(path);
  
  try {
    // Essayer de naviguer directement jusqu'au fichier
    const file = storage.root.navigate(normalizedPath);
    if (file) {
      const buffer = await file.download();
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

  const segments = normalizedPath.split("/").filter(Boolean);
  const fileName = segments.at(-1);
  const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

  const folder = folderPath ? await getOrCreateFolder(storage, folderPath) : storage.root;
  const children = await folder.children;
  const fileNode = children.find(child => child.name === fileName && !child.directory);
  if (!fileNode) {
    throw new Error(`File not found: ${path}`);
  }

  const buffer = await fileNode.download();
  const text = Buffer.from(buffer).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function megaWrite(env, path, body) {
  const storage = await getClient(env);
  const normalizedPath = normalizePath(path);
  const content = Buffer.from(toText(body), "utf8");

  const segments = normalizedPath.split("/").filter(Boolean);
  const fileName = segments.at(-1);
  const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";

  const folder = folderPath ? await getOrCreateFolder(storage, folderPath) : storage.root;
  const children = await folder.children;
  const existing = children.find(child => child.name === fileName && !child.directory);

  if (existing) {
    await existing.delete();
  }

  const uploadStream = folder.upload({ name: fileName, size: content.length }, content);
  const file = await uploadStream.complete;
  
  return {
    name: file.name,
    size: file.size,
    nodeId: file.nodeId,
    downloadId: file.downloadId
  };
}
