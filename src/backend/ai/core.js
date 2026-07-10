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

export async function readDiscussion(env, category, discussionId) {
  try {
    const discussion = await megaRead(env, discussionFilePath(category, `${discussionId}.json`));
    return discussion;
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("file not found") || String(e?.message || "").toLowerCase().includes("folder not found")) {
      return null;
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

  // Save discussion to file
  try {
    await megaWrite(env, discussionFilePath(category, `${discussion.id}.json`), discussion);
    
    // Update index
    const index = await readIndex(env, category);
    const existingIndex = index.findIndex(d => d.id === discussion.id);
    if (existingIndex >= 0) {
      index[existingIndex] = {
        id: discussion.id,
        title: discussion.title,
        updatedAt: discussion.updatedAt,
        lastPromptDate: discussion.lastPromptDate,
        metadata: discussion.metadata
      };
    } else {
      index.push({
        id: discussion.id,
        title: discussion.title,
        createdAt: discussion.createdAt,
        updatedAt: discussion.updatedAt,
        lastPromptDate: discussion.lastPromptDate,
        metadata: discussion.metadata
      });
    }
    await writeIndex(env, category, index);
  } catch (error) {
    console.error("Failed to save discussion:", error);
    // Continue without failing the request
  }

  return discussion;
}

// Simple model caller using Cloudflare Workers AI
export async function callModel(env, model, prompt, options = {}, gatewayMetadata = null) {
  const message = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  
  // Use Cloudflare Workers AI binding
  if (env.AI) {
    try {
      // Check if this is an image generation model (text-to-image)
      // Image models require 'prompt' parameter instead of 'messages' format
      const modelId = (model || "").toLowerCase();
      const isImageModel = modelId.includes("stable-diffusion") || 
                          modelId.includes("flux") || 
                          modelId.includes("text-to-image") ||
                          options.isImageModel === true;
      
      let aiModel;
      if (isImageModel) {
        // Image generation format
        aiModel = env.AI.run(model, {
          prompt: message,
        });
      } else {
        // Text generation format
        aiModel = env.AI.run(model, {
          messages: [{ role: "user", content: message }],
          max_tokens: options.maxTokens || 512,
        });
      }
      
      const response = await aiModel;
      const content = response?.response || response?.output || response?.image || JSON.stringify(response);
      
      // Build result object
      const result = {
        ok: true,
        model: model,
        response: content,
        raw: response,
      };
      
      // For image models, mark the response as image
      if (isImageModel) {
        result.isImage = true;
      }
      
      // Add gateway metadata if provided
      if (gatewayMetadata) {
        result.gateway = gatewayMetadata;
      }
      
      return result;
    } catch (error) {
      console.error("Cloudflare AI error:", error);
      const errorResult = { ok: false, error: error.message || "Failed to call AI model" };
      if (gatewayMetadata) {
        errorResult.gateway = gatewayMetadata;
      }
      return errorResult;
    }
  }

  // Fallback: mocked response
  const fallbackResult = { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
  if (gatewayMetadata) {
    fallbackResult.gateway = gatewayMetadata;
  }
  return fallbackResult;
}
