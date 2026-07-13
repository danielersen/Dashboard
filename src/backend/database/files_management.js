import { getClient, getFolderIfExists, getOrCreateFolder, megaRead, megaWrite, megaDelete } from "./mega.js";

const FILES_ROOT = "files";

function normalizePath(path) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized || "";
}

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function listDirectory(env, relativePath = "") {
  const storage = await getClient(env);
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  
  const folder = await getFolderIfExists(storage, fullPath);
  if (!folder) {
    return { files: [], folders: [], path: relativePath };
  }

  const children = await folder.children;
  
  const files = [];
  const folders = [];

  for (const child of children) {
    const item = {
      name: child.name,
      path: relativePath ? `${relativePath}/${child.name}` : child.name,
      size: child.size || 0,
      modified: child.timestamp ? formatDate(child.timestamp) : "",
      extension: child.directory ? "" : getFileExtension(child.name)
    };

    if (child.directory) {
      folders.push(item);
    } else {
      files.push(item);
    }
  }

  // Sort: folders first, then files, both alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { files, folders, path: relativePath };
}

async function readFile(env, relativePath) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  const storage = await getClient(env);
  
  try {
    const content = await megaRead(env, fullPath, storage);
    return { success: true, content };
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return { success: false, error: "File not found" };
    }
    throw e;
  }
}

async function writeFile(env, relativePath, content) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  const storage = await getClient(env);
  
  // Ensure parent folder exists
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length > 1) {
    const folderPath = segments.slice(0, -1).join("/");
    await getOrCreateFolder(storage, folderPath);
  }

  await megaWrite(env, fullPath, content, storage);
  return { success: true };
}

async function deleteFile(env, relativePath) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  
  try {
    await megaDelete(env, fullPath);
    return { success: true };
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return { success: false, error: "File not found" };
    }
    throw e;
  }
}

async function createFolder(env, relativePath) {
  const storage = await getClient(env);
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  
  await getOrCreateFolder(storage, fullPath);
  return { success: true };
}

export async function FilesFunction(env, path, method, body) {
  switch (method) {
    case "GET":
      if (path === "" || path === "/") {
        // List root directory
        return await listDirectory(env, "");
      }
      if (path.startsWith("list/")) {
        const relativePath = decodeURIComponent(path.slice("list/".length));
        return await listDirectory(env, relativePath);
      }
      if (path.startsWith("read/")) {
        const relativePath = decodeURIComponent(path.slice("read/".length));
        return await readFile(env, relativePath);
      }
      throw new Error("Invalid GET path");
    
    case "POST":
      if (path === "upload") {
        const { relativePath, content } = body;
        if (!relativePath) {
          throw new Error("relativePath is required");
        }
        return await writeFile(env, relativePath, content);
      }
      if (path === "folder") {
        const { relativePath } = body;
        if (!relativePath) {
          throw new Error("relativePath is required");
        }
        return await createFolder(env, relativePath);
      }
      throw new Error("Invalid POST path");
    
    case "DELETE":
      if (path.startsWith("delete/")) {
        const relativePath = decodeURIComponent(path.slice("delete/".length));
        return await deleteFile(env, relativePath);
      }
      throw new Error("Invalid DELETE path");
    
    default:
      throw new Error("Method not allowed");
  }
}
