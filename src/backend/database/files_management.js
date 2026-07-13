import { getClient, getFolderIfExists, getOrCreateFolder, megaRead, megaWrite, megaDelete } from "./mega.js";

// Helper function to download from URL and stream to MEGA
async function uploadFromURL(env, relativePath, url, storage = null) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  const storageInstance = storage || await getClient(env);
  
  console.log(`uploadFromURL called: path=${fullPath}, url=${url}`);
  
  // Ensure parent folder exists
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length > 1) {
    const folderPath = segments.slice(0, -1).join("/");
    await getOrCreateFolder(storageInstance, folderPath);
  }

  // Get file info from URL to determine name and size
  const fileName = segments.at(-1);
  const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
  
  const folder = folderPath ? await getOrCreateFolder(storageInstance, folderPath) : storageInstance.root;
  
  // Download from URL and get file size
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download from URL: ${response.status}`);
  }
  
  const fileSize = parseInt(response.headers.get('content-length')) || 0;
  console.log(`File size from URL: ${fileSize} bytes`);
  
  // Create upload stream from MEGA (following MEGAJS documentation)
  const uploadStream = folder.upload({ 
    name: fileName,
    size: fileSize,
    maxConnections: 1,
    initialChunkSize: 65536,
    chunkSizeIncrement: 65536,
    maxChunkSize: 524288,
    handleRetries: (tries, error, cb) => {
      console.log(`MEGA upload retry ${tries}/8, error:`, error.message);
      if (tries > 8) {
        cb(error);
      } else {
        const delay = 1000 * Math.pow(2, tries);
        console.log(`Retrying upload in ${delay}ms...`);
        setTimeout(cb, delay);
      }
    }
  });
  
  // Read from URL response and write to upload stream
  const reader = response.body.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        uploadStream.end();
        break;
      }
      
      // Write chunk to upload stream
      const canContinueWriting = uploadStream.write(Buffer.from(value));
      
      if (!canContinueWriting) {
        // Wait for stream to drain if under pressure
        await new Promise(resolve => {
          uploadStream.once('drain', resolve);
        });
      }
    }
    
    // Wait for upload to complete
    const file = await uploadStream.complete;
    console.log(`Successfully uploaded file from URL: ${file.name}`);
    
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  } catch (error) {
    console.error(`MEGA streaming upload error:`, error);
    throw error;
  }
}

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

async function writeFile(env, relativePath, content = null, url = null, fileData = null) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  const storage = await getClient(env);
  
  console.log(`writeFile called: path=${fullPath}, hasFile=${!!fileData}`);
  
  // If file data is provided (FormData upload), stream to MEGA
  if (fileData) {
    return await uploadFromBuffer(env, relativePath, fileData, storage);
  }
  
  // If URL is provided, use streaming upload from URL
  if (url) {
    return await uploadFromURL(env, relativePath, url, storage);
  }
  
  // Otherwise, use traditional content upload
  console.log(`writeFile called: path=${fullPath}, content length=${typeof content === 'string' ? content.length : 'unknown'}`);
  
  // Ensure parent folder exists
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length > 1) {
    const folderPath = segments.slice(0, -1).join("/");
    await getOrCreateFolder(storage, folderPath);
  }

  // Decode base64 content if it's a data URL
  let actualContent = content;
  if (typeof content === 'string' && content.startsWith('data:')) {
    const base64Data = content.split(',')[1];
    actualContent = Buffer.from(base64Data, 'base64').toString('utf8');
    console.log(`Decoded base64 content, new length: ${actualContent.length}`);
  }

  await megaWrite(env, fullPath, actualContent, storage);
  return { success: true };
}

// Helper function to upload from buffer (FormData upload)
async function uploadFromBuffer(env, relativePath, fileData, storage = null) {
  const fullPath = normalizePath(`${FILES_ROOT}/${relativePath}`);
  const storageInstance = storage || await getClient(env);
  
  console.log(`uploadFromBuffer called: path=${fullPath}, size=${fileData.length} bytes`);
  
  // Ensure parent folder exists
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length > 1) {
    const folderPath = segments.slice(0, -1).join("/");
    await getOrCreateFolder(storageInstance, folderPath);
  }

  const fileName = segments.at(-1);
  const folderPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
  
  const folder = folderPath ? await getOrCreateFolder(storageInstance, folderPath) : storageInstance.root;
  
  // Create upload stream from MEGA
  const uploadStream = folder.upload({ 
    name: fileName,
    size: fileData.length,
    maxConnections: 1,
    initialChunkSize: 65536,
    chunkSizeIncrement: 65536,
    maxChunkSize: 524288,
    handleRetries: (tries, error, cb) => {
      console.log(`MEGA upload retry ${tries}/8, error:`, error.message);
      if (tries > 8) {
        cb(error);
      } else {
        const delay = 1000 * Math.pow(2, tries);
        console.log(`Retrying upload in ${delay}ms...`);
        setTimeout(cb, delay);
      }
    }
  });
  
  // Write buffer to upload stream in chunks
  const chunkSize = 65536;
  let offset = 0;
  
  try {
    while (offset < fileData.length) {
      const chunk = fileData.slice(offset, offset + chunkSize);
      const canContinueWriting = uploadStream.write(chunk);
      
      if (!canContinueWriting) {
        // Wait for stream to drain if under pressure
        await new Promise(resolve => {
          uploadStream.once('drain', resolve);
        });
      }
      
      offset += chunkSize;
    }
    
    // End the stream
    uploadStream.end();
    
    // Wait for upload to complete
    const file = await uploadStream.complete;
    console.log(`Successfully uploaded file from buffer: ${file.name}`);
    
    return {
      name: file.name,
      size: file.size,
      nodeId: file.nodeId,
      downloadId: file.downloadId
    };
  } catch (error) {
    console.error(`MEGA buffer upload error:`, error);
    throw error;
  }
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
        // Check if body is FormData (multipart)
        if (body instanceof FormData) {
          const file = body.get('file');
          const relativePath = body.get('relativePath');
          
          if (!relativePath) {
            throw new Error("relativePath is required");
          }
          if (!file) {
            throw new Error("file is required");
          }
          
          // Convert file to ArrayBuffer then Buffer
          const arrayBuffer = await file.arrayBuffer();
          const fileData = Buffer.from(arrayBuffer);
          
          return await writeFile(env, relativePath, null, null, fileData);
        } else {
          // Legacy JSON upload
          const { relativePath, content, url } = body;
          if (!relativePath) {
            throw new Error("relativePath is required");
          }
          if (!content && !url) {
            throw new Error("content or url is required");
          }
          return await writeFile(env, relativePath, content, url);
        }
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
