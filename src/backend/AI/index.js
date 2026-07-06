import { basic } from "./basic.js";
import { pictures } from "./pictures.js";
import { raisonning } from "./raisonning.js";
import { search_web } from "./search_web.js";
import { notes_remarks } from "./notes_remarks.js";
import { readIndex } from "./core.js";
import { checkAndIncrementMonthly } from "./limits.js";

const CATEGORIES = {
  basic,
  pictures,
  raisonning,
  search_web,
  notes_remarks,
};

// Alias mapping for frontend category names
const CATEGORY_ALIASES = {
  "ai": "basic",
  "search-web": "search_web",
  "reasoning": "raisonning",
  "pictures": "pictures",
};

// limits handled in src/backend/AI/limits.js

export async function AIfunction(env, subpath, method, headers, body) {
  const parts = (subpath || "").split("/").filter(Boolean);
  if (parts.length === 0) return { error: "no action" };

  if (parts.length === 1 && parts[0] === "categories" && method === "GET") {
    // Build human-readable consumption info
    let models = [];
    try {
      const raw = env.AI_AVAILABLE_MODELS ? JSON.parse(env.AI_AVAILABLE_MODELS) : [
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
        "openai/gpt-4-turbo",
        "openai/gpt-4",
        "openai/gpt-3.5-turbo",
        "openai/gpt-3.5-turbo-16k",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "meta-llama/llama-3.1-405b-instruct",
        "meta-llama/llama-3.1-70b-instruct",
        "meta-llama/llama-3.1-8b-instruct"
      ];
      const consumption = env.AI_MODEL_CONSUMPTION ? JSON.parse(env.AI_MODEL_CONSUMPTION) : {
        "openai/gpt-4o-mini": "very low",
        "openai/gpt-4o": "medium",
        "openai/gpt-4-turbo": "medium",
        "openai/gpt-4": "high",
        "openai/gpt-3.5-turbo": "very low",
        "openai/gpt-3.5-turbo-16k": "low",
        "claude-3-5-sonnet-20241022": "medium",
        "claude-3-5-haiku-20241022": "very low",
        "claude-3-opus-20240229": "high",
        "gemini-1.5-pro": "medium",
        "gemini-1.5-flash": "very low",
        "meta-llama/llama-3.1-405b-instruct": "high",
        "meta-llama/llama-3.1-70b-instruct": "medium",
        "meta-llama/llama-3.1-8b-instruct": "very low"
      };
      models = raw.map(m => ({ model: m, consumption: (consumption[m] || "unknown") }));
    } catch (e) {
      models = [
        { model: "openai/gpt-4o-mini", consumption: "very low" },
        { model: "openai/gpt-4o", consumption: "medium" },
        { model: "openai/gpt-4-turbo", consumption: "medium" },
        { model: "openai/gpt-4", consumption: "high" },
        { model: "openai/gpt-3.5-turbo", consumption: "very low" },
        { model: "openai/gpt-3.5-turbo-16k", consumption: "low" },
        { model: "claude-3-5-sonnet-20241022", consumption: "medium" },
        { model: "claude-3-5-haiku-20241022", consumption: "very low" },
        { model: "claude-3-opus-20240229", consumption: "high" },
        { model: "gemini-1.5-pro", consumption: "medium" },
        { model: "gemini-1.5-flash", consumption: "very low" },
        { model: "meta-llama/llama-3.1-405b-instruct", consumption: "high" },
        { model: "meta-llama/llama-3.1-70b-instruct", consumption: "medium" },
        { model: "meta-llama/llama-3.1-8b-instruct", consumption: "very low" }
      ];
    }
    return { categories: Object.keys(CATEGORIES), availableModels: models };
  }

  const category = parts[0];
  const action = parts[1] || "ask";
  // Map frontend category names to backend category names
  const mappedCategory = CATEGORY_ALIASES[category] || category;
  const fn = CATEGORIES[mappedCategory];
  if (!fn) return { error: "unknown category" };

  if (action === "ask" && method === "POST") {
    const model = body?.model || env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini";
    // check monthly limit (1 request)
    await checkAndIncrementMonthly(env, model, 1);
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
