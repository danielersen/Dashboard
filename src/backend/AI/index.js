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
  "translation": ["basic", "search_web"],
  "summarization": ["basic", "search_web", "reasoning"],
};

// limits handled in src/backend/AI/limits.js

// Function to fetch available models from Cloudflare Workers AI
async function fetchCloudflareModels(env) {
  if (!env.AI) {
    throw new Error("AI binding not configured. Please add [ai] binding = \"AI\" to wrangler.toml");
  }
  
  // Use the AI binding to list available models
  const models = await env.AI.list();
  console.log("AI binding returned models:", models);
  
  if (!models || !Array.isArray(models) || models.length === 0) {
    throw new Error("No models available from Cloudflare Workers AI. Please check your AI binding configuration.");
  }
  
  const mappedModels = models.map(model => ({
    id: model.id || model.name,
    name: model.name || model.id,
    description: model.description || "",
    type: model.type || "text-generation",
    pricing: model.pricing || {}
  }));
  console.log("Mapped models:", mappedModels);
  return mappedModels;
}

// Function to categorize models based on their capabilities
function categorizeModel(model) {
  const modelId = (model.id || model.name || "").toLowerCase();
  const modelType = (model.type || "text-generation").toLowerCase();
  
  console.log("Categorizing model:", modelId, "type:", modelType);
  
  const categories = [];
  
  // Text generation models (basic)
  if (modelType.includes("text") || modelType.includes("generation") || 
      modelId.includes("llama") || modelId.includes("mistral") || 
      modelId.includes("gemma") || modelId.includes("phi") ||
      modelId.includes("qwen") || modelId.includes("yi") ||
      modelId.includes("deepseek")) {
    categories.push("basic");
  }
  
  // Reasoning models (larger models)
  if (modelId.includes("70b") || modelId.includes("72b") || 
      modelId.includes("405b") || modelId.includes("34b") ||
      modelId.includes("27b") || modelId.includes("large") ||
      modelId.includes("r1") || modelId.includes("deepseek")) {
    categories.push("reasonning");
    console.log("Added to reasonning category");
  }
  
  // Image generation models
  if (modelType.includes("image") || modelType.includes("text-to-image") ||
      modelId.includes("stable") || modelId.includes("flux") || 
      modelId.includes("sd") || modelId.includes("diffusion") ||
      modelId.includes("dreamshaper") || modelId.includes("realistic-vision") ||
      modelId.includes("runwayml")) {
    categories.push("pictures");
  }
  
  // Search/summarization models - add all text generation models to search_web as well
  if (modelType.includes("text") || modelType.includes("generation") || 
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

// Function to estimate consumption based on model pricing
function estimateConsumption(model) {
  const pricing = model.pricing || {};
  const modelId = (model.id || model.name || "").toLowerCase();
  
  // Check if pricing information is available
  if (pricing.input && pricing.output) {
    const inputCost = parseFloat(pricing.input) || 0;
    const outputCost = parseFloat(pricing.output) || 0;
    const totalCost = inputCost + outputCost;
    
    if (totalCost < 0.0001) return "very low";
    if (totalCost < 0.001) return "low";
    if (totalCost < 0.01) return "medium";
    return "high";
  }
  
  // Fallback based on model name patterns
  if (modelId.includes("8b") || modelId.includes("7b") || modelId.includes("small")) {
    return "very low";
  }
  if (modelId.includes("70b") || modelId.includes("large")) {
    return "high";
  }
  if (modelId.includes("405b") || modelId.includes("xl")) {
    return "very high";
  }
  
  return "medium";
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
      
      const modelInfo = {
        id: model.id,
        name: model.name,
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
