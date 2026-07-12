import { megaRead, megaWrite } from "./mega.js";

const WEBSITES_FILE = "websites/websites.json";

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

// AJOUTER un site web
export async function addWebsite(env, name, url) {
  if (!name || !url) {
    throw new Error("Name and URL are required");
  }

  const websites = await readWebsites(env);
  
  // Check if website with same name already exists
  const existingIndex = websites.findIndex(w => w.name === name);
  if (existingIndex !== -1) {
    throw new Error("Website with this name already exists");
  }
  
  // Add new website
  websites.push({ name, url });

  await writeWebsites(env, websites);
  return { success: true, websites };
}

// SUPPRIMER un site web
export async function deleteWebsite(env, name) {
  if (!name) {
    throw new Error("Name is required");
  }

  const websites = await readWebsites(env);
  const filteredWebsites = websites.filter(w => w.name !== name);
  
  await writeWebsites(env, filteredWebsites);
  return { success: true, websites: filteredWebsites };
}

// MODIFIER un site web
export async function updateWebsite(env, oldName, newName, newUrl) {
  if (!oldName || !newName || !newUrl) {
    throw new Error("Old name, new name and new URL are required");
  }

  const websites = await readWebsites(env);
  const existingIndex = websites.findIndex(w => w.name === oldName);
  
  if (existingIndex === -1) {
    throw new Error("Website not found");
  }
  
  // Update the website
  websites[existingIndex] = { name: newName, url: newUrl };
  
  await writeWebsites(env, websites);
  return { success: true, websites };
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
      if (path === "update") {
        return await updateWebsite(env, body.oldName, body.newName, body.newUrl);
      }
      throw new Error("Invalid POST path");
    
    case "DELETE":
      if (path.startsWith("delete/")) {
        const name = decodeURIComponent(path.slice("delete/".length));
        return await deleteWebsite(env, name);
      }
      throw new Error("Invalid DELETE path");
    
    default:
      throw new Error("Method not allowed");
  }
}
