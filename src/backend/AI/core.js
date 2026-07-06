import { megaRead, megaWrite, megaDelete } from "../database/mega.js";

function indexPath(category) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/index.json`;
}

function discussionFilePath(category, filename) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/${String(filename)}`;
}

export async function readIndex(env, category) {
  try {
    const idx = await megaRead(env, indexPath(category));
    if (!Array.isArray(idx)) return [];
    return idx;
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("file not found") || String(e?.message || "").toLowerCase().includes("folder not found")) {
      return [];
    }
    throw e;
  }
}

export async function writeIndex(env, category, index) {
  return await megaWrite(env, indexPath(category), index || []);
}

function nowTS() { return new Date().toISOString(); }

function trimDiscussionMessages(discussion, maxPairs = 10) {
  if (!discussion || !Array.isArray(discussion.messages)) discussion.messages = [];
  // messages are stored as alternating user/assistant entries. Count pairs.
  while (Math.floor(discussion.messages.length / 2) > maxPairs) {
    // remove oldest two messages (one pair)
    discussion.messages.splice(0, 2);
  }
  return discussion;
}

export async function addMessagePair(env, category, { discussionId = null, userContent, assistantContent, metadata = {} } = {}) {
  if (!userContent) throw new Error("Missing user content");
  
  // Skip storage for now to reduce subrequests - just return the discussion object
  // Storage can be added later with proper optimization
  const discussion = {
    id: discussionId || (String(Date.now()) + Math.random().toString(36).slice(2,8)),
    createdAt: nowTS(),
    updatedAt: nowTS(),
    title: null,
    lastPromptDate: null,
    messages: [],
    metadata: metadata || {}
  };

  const userMsg = { role: "user", content: userContent, ts: nowTS() };
  const assistantMsg = { role: "assistant", content: assistantContent, ts: nowTS() };
  discussion.messages.push(userMsg);
  discussion.messages.push(assistantMsg);
  discussion.updatedAt = nowTS();
  discussion.lastPromptDate = userMsg.ts;

  trimDiscussionMessages(discussion, 10);

  // generate a short title if missing (simple local heuristic)
  if (!discussion.title) {
    const first = String(userContent || "").replace(/\s+/g, " ").trim();
    const words = first.split(/\s+/).slice(0,6);
    const title = words.join(" ") || `Conversation ${discussion.id}`;
    discussion.title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Skip AI title generation to reduce subrequests
  // Skip file storage to reduce subrequests
  // Skip index management to reduce subrequests

  return discussion;
}

// Simple model caller using Cloudflare Workers AI
export async function callModel(env, model, prompt, options = {}) {
  const message = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  const modelId = model.toLowerCase();
  
  console.log("callModel - model:", model, "modelId:", modelId);
  
  // Use Cloudflare Workers AI binding
  if (env.AI) {
    try {
      // Try standard text generation format first (most models)
      let input = {
        messages: [{ role: "user", content: message }],
        max_tokens: options.maxTokens || 512,
      };
      
      const aiModel = env.AI.run(model, input);
      const response = await aiModel;
      const content = response?.response || response?.output || response?.result?.response || JSON.stringify(response);
      
      console.log("AI response:", content);
      return { ok: true, model: model, response: content, raw: response };
    } catch (error) {
      console.error("Cloudflare AI error with standard format:", error);
      
      // If standard format fails, try translation format as fallback
      try {
        console.log("Retrying with translation format...");
        const input = {
          text: message,
          target_language: options.targetLanguage || "en"
        };
        
        const aiModel = env.AI.run(model, input);
        const response = await aiModel;
        const content = response?.response || response?.output || response?.result?.response || JSON.stringify(response);
        
        console.log("AI response with translation format:", content);
        return { ok: true, model: model, response: content, raw: response };
      } catch (retryError) {
        console.error("Cloudflare AI error with translation format:", retryError);
        return { ok: false, error: retryError.message || "Failed to call AI model" };
      }
    }
  }

  // Fallback: mocked response
  return { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
}
