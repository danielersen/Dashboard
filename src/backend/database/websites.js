import { megaRead, megaWrite, megaDelete } from "./mega.js";

const WEBSITES_INDEX_FILE = "websites/index.json";

function websiteFilePath(websiteId) {
  return `websites/${websiteId}.json`;
}

function websiteFilePathWithTimestamp(websiteId) {
  const timestamp = Date.now();
  return `websites/${websiteId}_${timestamp}.json`;
}

async function readIndex(env) {
  try {
    const index = await megaRead(env, WEBSITES_INDEX_FILE);
    if (Array.isArray(index)) {
      return index;
    }
    return [];
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return [];
    }
    throw e;
  }
}

async function writeIndex(env, index) {
  return await megaWrite(env, WEBSITES_INDEX_FILE, index);
}

async function readWebsite(env, websiteId) {
  try {
    const website = await megaRead(env, websiteFilePath(websiteId));
    return website;
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return null;
    }
    throw e;
  }
}

function nowTS() { return new Date().toISOString(); }

export async function addWebsite(env, name, url, websiteId = null) {
  if (!name || !url) {
    throw new Error("Name and URL are required");
  }

  let website;
  
  // Read existing website if websiteId is provided
  if (websiteId) {
    const existingWebsite = await readWebsite(env, websiteId);
    if (existingWebsite) {
      website = existingWebsite;
    } else {
      // Create new website if ID doesn't exist
      website = {
        id: websiteId,
        createdAt: nowTS(),
        updatedAt: nowTS(),
        name: name,
        url: url
      };
    }
  } else {
    // Create new website
    website = {
      id: String(Date.now()) + Math.random().toString(36).slice(2,8),
      createdAt: nowTS(),
      updatedAt: nowTS(),
      name: name,
      url: url
    };
  }

  // Update website data
  website.name = name;
  website.url = url;
  website.updatedAt = nowTS();

  // Save website to individual file
  try {
    await megaWrite(env, websiteFilePath(website.id), website);
    
    // Update index
    const index = await readIndex(env);
    const existingIndex = index.findIndex(w => w.id === website.id);
    if (existingIndex >= 0) {
      index[existingIndex] = {
        id: website.id,
        name: website.name,
        url: website.url,
        updatedAt: website.updatedAt,
        createdAt: website.createdAt
      };
    } else {
      index.push({
        id: website.id,
        name: website.name,
        url: website.url,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt
      });
    }
    await writeIndex(env, index);
  } catch (error) {
    console.error("Failed to save website:", error);
    throw error;
  }

  return { success: true, website };
}

export async function deleteWebsite(env, websiteId) {
  if (!websiteId) {
    throw new Error("Website ID is required");
  }

  try {
    // Delete the website file
    await megaDelete(env, websiteFilePath(websiteId));
    
    // Update index to remove the website
    const index = await readIndex(env);
    const updatedIndex = index.filter(w => w.id !== websiteId);
    await writeIndex(env, updatedIndex);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete website:", error);
    throw error;
  }
}

export async function getWebsites(env) {
  const index = await readIndex(env);
  return { success: true, websites: index };
}

export async function getWebsite(env, websiteId) {
  const website = await readWebsite(env, websiteId);
  if (!website) {
    throw new Error("Website not found");
  }
  return { success: true, website };
}

export async function WebsitesFunction(env, path, method, body) {
  switch (method) {
    case "GET":
      if (path === "" || path === "/") {
        return await getWebsites(env);
      }
      if (path.startsWith("get/")) {
        const websiteId = path.slice("get/".length);
        return await getWebsite(env, websiteId);
      }
      throw new Error("Invalid GET path");
    
    case "POST":
      if (path === "add") {
        return await addWebsite(env, body.name, body.url, body.websiteId);
      }
      throw new Error("Invalid POST path");
    
    case "DELETE":
      if (path.startsWith("delete/")) {
        const websiteId = path.slice("delete/".length);
        return await deleteWebsite(env, websiteId);
      }
      throw new Error("Invalid DELETE path");
    
    default:
      throw new Error("Method not allowed");
  }
}
