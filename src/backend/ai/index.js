import { basic } from "./basic.js";
import { pictures } from "./pictures.js";
import { reasonning } from "./reasonning.js";
import { search_web } from "./search_web.js";
import { notes_remarks } from "./notes_remarks.js";
import { readIndex } from "./core.js";

const CATEGORIES = {
  basic,
  pictures,
  reasonning,
  search_web,
  notes_remarks,
};

// Alias mapping for frontend category names
const CATEGORY_ALIASES = {
  "ai": "basic",
  "search-web": "search_web",
  "reasoning": "reasonning",
  "pictures": "pictures",
};

// Model type categorization based on Cloudflare Workers AI capabilities
const MODEL_TYPES = {
  "text-generation": ["basic", "reasoning"],
  "text-embedding": ["basic"],
  "image-generation": ["pictures"],
  "image-classification": ["pictures"],
  "text-to-image": ["pictures"],
  "translation": [], // Exclude translation models from general categories
  "summarization": ["basic", "search_web", "reasoning"],
};

// limits handled in src/backend/ai/limits.js

// Function to extract brand from model ID
function extractBrand(modelId) {
  const withoutPrefix = modelId.replace(/^@cf\//, "");
  const parts = withoutPrefix.split("/");
  
  if (parts.length >= 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  
  return "Unknown";
}

// Function to format model name from @cf/company/model to Model (without brand)
function formatModelName(modelId) {
  const withoutPrefix = modelId.replace(/^@cf\//, "");
  const parts = withoutPrefix.split("/");
  
  if (parts.length >= 2) {
    const model = parts.slice(1).join("/").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return model;
  }
  
  // Fallback: just capitalize the whole thing
  return modelId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Function to fetch available models from Cloudflare Workers AI
async function fetchCloudflareModels(env) {
  if (!env.AI) {
    throw new Error("AI binding not configured. Please add [ai] binding = \"AI\" to wrangler.toml");
  }
  
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID not configured. Please add it to wrangler.toml [vars]");
  }
  
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN not configured. Please add it as a secret: wrangler secret put CLOUDFLARE_API_TOKEN");
  }
  
  // Fetch models from Cloudflare Workers AI API
  try {
    console.log("Fetching models from Cloudflare API for account:", accountId);
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("Cloudflare API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", errorText);
      throw new Error(`Cloudflare API returned ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Cloudflare API response data:", data);
    
    if (!data.success || !data.result) {
      throw new Error("Invalid response from Cloudflare API");
    }
    
    // Map Cloudflare API response to our model format
    const models = data.result.map(model => ({
      id: model.name,
      name: formatModelName(model.name),
      brand: extractBrand(model.name),
      description: model.description || "",
      type: model.task?.name || model.type || "text-generation",
      pricing: model.pricing || {},
      task: model.task?.name || model.type || "text-generation"
    }));
    
    console.log("Fetched", models.length, "models from Cloudflare API");
    console.log("Sample models:", models.slice(0, 5));
    return models;
    
  } catch (error) {
    console.error("Failed to fetch models from Cloudflare API:", error);
    throw new Error(`Failed to fetch models from Cloudflare: ${error.message}`);
  }
}

// Function to categorize models based on their capabilities
function categorizeModel(model) {
  const modelId = (model.id || model.name || "").toLowerCase();
  const modelType = (model.type || "text-generation").toLowerCase();
  const modelTask = (model.task || "").toLowerCase();
  const modelDescription = (model.description || "").toLowerCase();
  
  console.log("Categorizing model:", modelId, "type:", modelType, "task:", modelTask, "description:", modelDescription);
  
  // Exclude translation models from all categories
  if (modelTask.includes("translation") || modelType.includes("translation") || 
      modelId.includes("translation") || modelId.includes("nllb") || 
      modelId.includes("m2m100") || modelId.includes("translate")) {
    console.log("Excluding translation model:", modelId);
    return [];
  }
  
  // Exclude Leonardo models from all categories
  if (modelId.includes("leonardo") || modelId.includes("phoenix") || modelId.includes("lucid")) {
    console.log("Excluding Leonardo model:", modelId);
    return [];
  }
  
  // Exclude audio models from all text categories
  if (modelTask.includes("audio") || modelType.includes("audio") || modelType.includes("speech") ||
      modelTask.includes("speech") || modelId.includes("audio") || 
      modelId.includes("speech") || modelId.includes("tts") || 
      modelId.includes("whisper") || modelId.includes("vad")) {
    console.log("Excluding audio model:", modelId);
    return [];
  }
  
  // Exclude embedding/vector models from text categories
  if (modelTask.includes("embedding") || modelType.includes("embedding") || 
      modelTask.includes("vector") || modelType.includes("vector") ||
      modelId.includes("embedding") || modelId.includes("vector") ||
      modelId.includes("bge") || modelId.includes("e5")) {
    console.log("Excluding embedding/vector model:", modelId);
    return [];
  }
  
  const categories = [];
  
  // Use Cloudflare metadata to determine if model is text-to-image
  // Check task/type and description for text-to-image indicators
  const isTextToImage = (modelTask === "text-to-image" || 
                        modelType === "text-to-image" ||
                        modelTask.includes("text-to-image") ||
                        modelType.includes("text-to-image") ||
                        (modelTask.includes("image") && modelDescription.includes("text-to-image")) ||
                        (modelType.includes("image") && modelDescription.includes("text-to-image")));
  
  // Exclude models that require image input (img2img, inpainting) based on metadata
  const requiresImageInput = (modelTask.includes("img2img") ||
                             modelType.includes("img2img") ||
                             modelId.includes("img2img") ||
                             modelTask.includes("inpaint") ||
                             modelType.includes("inpaint") ||
                             modelId.includes("inpaint") ||
                             modelId.includes("inpainting") ||
                             modelDescription.includes("img2img") ||
                             modelDescription.includes("inpaint"));
  
  if (isTextToImage && !requiresImageInput) {
    categories.push("pictures");
    console.log("Added to pictures category (text-to-image from metadata):", modelId);
    return categories; // Return early - image models only in pictures
  }
  
  if (requiresImageInput) {
    console.log("Excluding model that requires image input:", modelId);
    return [];
  }
  
  // Reasoning models (larger models) - ONLY add to reasonning category, NOT basic or search_web
  if (modelId.includes("70b") || modelId.includes("72b") || 
      modelId.includes("405b") || modelId.includes("34b") ||
      modelId.includes("27b") || modelId.includes("large") ||
      modelId.includes("r1") || modelId.includes("deepseek-r1")) {
    categories.push("reasonning");
    console.log("Added to reasonning category ONLY:", modelId);
    return categories; // Return early - reasoning models only in reasonning
  }
  
  // Text generation models (basic) - smaller models only
  if (modelTask.includes("text") || modelType.includes("text") || modelType.includes("generation") || 
      modelId.includes("llama") || modelId.includes("mistral") || 
      modelId.includes("gemma") || modelId.includes("phi") ||
      modelId.includes("qwen") || modelId.includes("yi")) {
    categories.push("basic");
  }
  
  // Search/summarization models - add text generation models to search_web as well
  if (modelTask.includes("text") || modelType.includes("text") || modelType.includes("generation") || 
      modelId.includes("llama") || modelId.includes("mistral") || 
      modelId.includes("gemma") || modelId.includes("phi") ||
      modelId.includes("qwen") || modelId.includes("yi")) {
    categories.push("search_web");
  }
  
  // Default to basic if no specific category
  if (categories.length === 0) {
    categories.push("basic");
  }
  
  console.log("Final categories for", modelId, ":", categories);
  return categories;
}

// Function to estimate consumption based on model pricing (returns score 0-20, 20 = heaviest)
function estimateConsumption(model) {
  const pricing = model.pricing || {};
  const modelId = (model.id || model.name || "").toLowerCase();
  const modelType = (model.type || "").toLowerCase();
  
  console.log("Estimating consumption for", modelId, "pricing:", pricing, "type:", modelType);
  
  // Check if pricing information is available
  if (pricing.input && pricing.output) {
    const inputCost = parseFloat(pricing.input) || 0;
    const outputCost = parseFloat(pricing.output) || 0;
    const totalCost = inputCost + outputCost;
    
    // Convert cost to score (0-20 scale)
    // very low (<0.0001) -> 0-3
    // low (<0.001) -> 4-7
    // medium (<0.01) -> 8-14
    // high (>=0.01) -> 15-20
    if (totalCost < 0.0001) return Math.round(totalCost * 30000); // 0-3
    if (totalCost < 0.001) return Math.round(3 + (totalCost - 0.0001) * 4000); // 4-7
    if (totalCost < 0.01) return Math.round(7 + (totalCost - 0.001) * 700); // 8-14
    return Math.min(20, Math.round(14 + (totalCost - 0.01) * 60)); // 15-20
  }
  
  // Fallback based on model name patterns
  if (modelType.includes("image") || modelType.includes("text-to-image")) {
    return 18; // Image generation is always expensive
  }
  
  if (modelId.includes("8b") || modelId.includes("7b") || modelId.includes("small") || modelId.includes("mini")) {
    return 3;
  }
  if (modelId.includes("70b") || modelId.includes("72b") || modelId.includes("large") || modelId.includes("opus")) {
    return 18;
  }
  if (modelId.includes("27b") || modelId.includes("34b") || modelId.includes("405b") || modelId.includes("sonnet")) {
    return 12;
  }
  if (modelId.includes("9b") || modelId.includes("haiku")) {
    return 6;
  }
  
  return 5; // Default fallback
}

export async function AIfunction(env, subpath, method, headers, body) {
  const parts = (subpath || "").split("/").filter(Boolean);
  if (parts.length === 0) return { error: "no action" };

  if (parts.length === 1 && parts[0] === "categories" && method === "GET") {
    // Fetch models from Cloudflare Workers AI
    const cloudflareModels = await fetchCloudflareModels(env);
    console.log("Fetched models:", cloudflareModels.length, "models");
    
    // Categorize models and add consumption info
    const categorizedModels = {};
    
    // Initialize categories
    Object.keys(CATEGORIES).forEach(cat => {
      categorizedModels[cat] = [];
    });
    
    // Process each model
    cloudflareModels.forEach(model => {
      const categories = categorizeModel(model);
      const consumption = estimateConsumption(model);
      
      console.log("Model", model.id, "categories:", categories, "consumption:", consumption);
      
      const modelInfo = {
        id: model.id,
        name: model.name,
        brand: model.brand,
        description: model.description,
        type: model.type,
        consumption: consumption,
        pricing: model.pricing
      };
      
      console.log("Processing model:", model.name, "categories:", categories);
      
      // Add model to each applicable category
      categories.forEach(cat => {
        if (categorizedModels[cat]) {
          categorizedModels[cat].push(modelInfo);
        }
      });
    });
    
    console.log("Final categorized models:", categorizedModels);
    
    // Also create a flat list of all models for the frontend
    const allModels = cloudflareModels.map(model => ({
      model: model.id || model.name,
      name: model.name,
      description: model.description,
      type: model.type,
      consumption: estimateConsumption(model),
      categories: categorizeModel(model)
    }));
    
    return { 
      categories: Object.keys(CATEGORIES), 
      availableModels: allModels,
      categorizedModels: categorizedModels
    };
  }

  if (parts.length === 1 && parts[0] === "chat" && method === "POST") {
    // Chat endpoint for unified AI interface
    const category = body?.category || "basic";
    const model = body?.model || env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini";
    const prompt = body?.prompt || "";
    
    console.log("Chat request - category:", category, "model:", model, "prompt:", prompt);
    
    // Map frontend category names to backend category names
    const mappedCategory = CATEGORY_ALIASES[category] || category;
    const fn = CATEGORIES[mappedCategory];
    if (!fn) return { error: "unknown category" };
    
    console.log("Using mapped category:", mappedCategory, "function:", fn.name);
    
    // Call category function with proper body structure, including category
    const resp = await fn(env, model, { prompt, text: prompt, category: mappedCategory });
    return resp;
  }

  const category = parts[0];
  const action = parts[1] || "ask";
  // Map frontend category names to backend category names
  const mappedCategory = CATEGORY_ALIASES[category] || category;
  const fn = CATEGORIES[mappedCategory];
  if (!fn) return { error: "unknown category" };

  if (action === "ask" && method === "POST") {
    const model = body?.model || env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini";
    // Skip monthly limit check to reduce subrequests
    // call category function with mapped category name
    const resp = await fn(env, model, body || {});
    return resp;
  }

  if (action === "discussions" && method === "GET") {
    const list = await readIndex(env, mappedCategory);
    return { discussions: list };
  }

  return { error: "unsupported ai action" };
}
