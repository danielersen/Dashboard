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

// Simple model caller: if OPENAI_API_KEY present and model includes "openai",
// call OpenAI chat completions; otherwise return a placeholder response.
export async function callModel(env, model, prompt, options = {}) {
  const message = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  if (env.OPENAI_API_KEY && String(model || "").toLowerCase().includes("openai")) {
    // Skip monthly quota check to reduce subrequests (already checked in caller)
    const url = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: options.apiModel || "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      max_tokens: options.maxTokens || 512,
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
    return { ok: true, model: model, response: content, raw: json };
  }

  // Fallback: mocked response
  return { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
}
