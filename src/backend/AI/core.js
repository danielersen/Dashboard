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
  
  console.log("callModel - model:", model, "modelId:", modelId, "prompt:", message);
  
  // Use Cloudflare Workers AI binding
  if (env.AI) {
    try {
      let input = {
        messages: [{ role: "user", content: message }],
        max_tokens: options.maxTokens || 1024,
      };
      
      console.log("Sending to Cloudflare AI:", input);
      const aiModel = env.AI.run(model, input);
      const response = await aiModel;
      
      console.log("Raw Cloudflare AI response:", JSON.stringify(response));
      
      // Extract text content from various response formats
      let content = null;
      
      // Try different response formats based on Cloudflare AI documentation
      if (response && typeof response === 'string') {
        content = response;
      } else if (response?.response && typeof response.response === 'string') {
        content = response.response;
      } else if (response?.result?.response && typeof response.result.response === 'string') {
        content = response.result.response;
      } else if (response?.result?.output && typeof response.result.output === 'string') {
        content = response.result.output;
      } else if (response?.output && typeof response.output === 'string') {
        content = response.output;
      } else if (response?.result && typeof response.result === 'string') {
        content = response.result;
      } else if (response?.choices && Array.isArray(response.choices) && response.choices[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else if (response?.choices && Array.isArray(response.choices) && response.choices[0]?.text) {
        content = response.choices[0].text;
      } else if (response?.message?.content && typeof response.message.content === 'string') {
        content = response.message.content;
      } else if (response?.text && typeof response.text === 'string') {
        content = response.text;
      } else if (response?.generated_text && typeof response.generated_text === 'string') {
        content = response.generated_text;
      } else {
        // If no string content found, log the full response for debugging
        console.error("Could not extract text content from response. Full response:", JSON.stringify(response));
        content = JSON.stringify(response);
      }
      
      console.log("Extracted content:", content);
      return { ok: true, model: model, response: content, raw: response };
    } catch (error) {
      console.error("Cloudflare AI error:", error.message, error.stack);
      return { ok: false, error: error.message || "Failed to call AI model" };
    }
  }

  // Fallback: mocked response
  return { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
}
