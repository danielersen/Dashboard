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

// limits handled in src/backend/AI/limits.js

export async function AIfunction(env, subpath, method, headers, body) {
  const parts = (subpath || "").split("/").filter(Boolean);
  if (parts.length === 0) return { error: "no action" };

  if (parts.length === 1 && parts[0] === "categories" && method === "GET") {
    // Build human-readable consumption info
    let models = [];
    try {
      const raw = env.AI_AVAILABLE_MODELS ? JSON.parse(env.AI_AVAILABLE_MODELS) : ["openai/gpt-4o-mini", "openai/gpt-4o", "openai/gpt-3.5-turbo"];
      const consumption = env.AI_MODEL_CONSUMPTION ? JSON.parse(env.AI_MODEL_CONSUMPTION) : {
        "openai/gpt-4o-mini": "low",
        "openai/gpt-4o": "medium",
        "openai/gpt-3.5-turbo": "low"
      };
      models = raw.map(m => ({ model: m, consumption: (consumption[m] || "unknown") }));
    } catch (e) {
      models = [
        { model: "openai/gpt-4o-mini", consumption: "low" },
        { model: "openai/gpt-4o", consumption: "medium" },
        { model: "openai/gpt-3.5-turbo", consumption: "low" }
      ];
    }
    return { categories: Object.keys(CATEGORIES), availableModels: models };
  }

  const category = parts[0];
  const action = parts[1] || "ask";
  const fn = CATEGORIES[category];
  if (!fn) return { error: "unknown category" };

  if (action === "ask" && method === "POST") {
    const model = body?.model || env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini";
    // check monthly limit (1 request)
    await checkAndIncrementMonthly(env, model, 1);
    // call category function
    const resp = await fn(env, model, body || {});
    return resp;
  }

  if (action === "discussions" && method === "GET") {
    const list = await readIndex(env, category);
    return { discussions: list };
  }

  return { error: "unsupported ai action" };
}
