import { megaRead, megaWrite } from "./mega.js";

const WEBSITES_FILE = "dashboard/websites/websites.json";

async function readWebsites(env) {
  try {
    const websites = await megaRead(env, WEBSITES_FILE);
    if (Array.isArray(websites)) {
      return websites;
    }
    return [];
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return [];
    }
    throw e;
  }
}

async function writeWebsites(env, websites) {
  return await megaWrite(env, WEBSITES_FILE, websites);
}

export async function addWebsite(env, name, url) {
  if (!name || !url) {
    throw new Error("Name and URL are required");
  }

  const websites = await readWebsites(env);
  
  // Check if website with same name already exists
  const existingIndex = websites.findIndex(w => w.name === name);
  if (existingIndex !== -1) {
    // Update existing website
    websites[existingIndex] = { name, url };
  } else {
    // Add new website
    websites.push({ name, url });
  }

  await writeWebsites(env, websites);
  return { success: true, websites };
}

export async function deleteWebsite(env, name) {
  if (!name) {
    throw new Error("Name is required");
  }

  const websites = await readWebsites(env);
  const initialLength = websites.length;
  
  const filteredWebsites = websites.filter(w => w.name !== name);
  
  if (filteredWebsites.length === initialLength) {
    throw new Error("Website not found");
  }

  await writeWebsites(env, filteredWebsites);
  return { success: true, websites: filteredWebsites };
}

export async function getWebsites(env) {
  const websites = await readWebsites(env);
  return { success: true, websites };
}

export async function WebsitesFunction(env, path, method, body) {
  switch (method) {
    case "GET":
      if (path === "" || path === "/") {
        return await getWebsites(env);
      }
      throw new Error("Invalid GET path");
    
    case "POST":
      if (path === "add") {
        return await addWebsite(env, body.name, body.url);
      }
      throw new Error("Invalid POST path");
    
    case "DELETE":
      if (path.startsWith("delete/")) {
        const name = path.slice("delete/".length);
        return await deleteWebsite(env, name);
      }
      throw new Error("Invalid DELETE path");
    
    default:
      throw new Error("Method not allowed");
  }
}