// Using Cloudflare Gateway AI for storage

function indexPath(category) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/index.json`;
}

function discussionFilePath(category, filename) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/${String(filename)}`;
}

// Gateway AI storage functions
async function gatewayRead(env, key) {
  try {
    if (!env.GATEWAY_AI) {
      console.warn("Gateway AI binding not configured");
      return null;
    }
    const result = await env.GATEWAY_AI.get(key);
    return result;
  } catch (e) {
    console.error("Gateway AI read error:", e);
    return null;
  }
}

async function gatewayWrite(env, key, value) {
  try {
    if (!env.GATEWAY_AI) {
      console.warn("Gateway AI binding not configured");
      return;
    }
    await env.GATEWAY_AI.put(key, value);
  } catch (e) {
    console.error("Gateway AI write error:", e);
    throw e;
  }
}

export async function readIndex(env, category) {
  try {
    const idx = await gatewayRead(env, indexPath(category));
    if (!Array.isArray(idx)) return [];
    return idx;
  } catch (e) {
    return [];
  }
}

export async function readDiscussion(env, category, discussionId) {
  try {
    const discussion = await gatewayRead(env, discussionFilePath(category, `${discussionId}.json`));
    return discussion;
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("not found")) {
      return null;
    }
    throw e;
  }
}

export async function writeIndex(env, category, index) {
  return await gatewayWrite(env, indexPath(category), index || []);
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
    await gatewayWrite(env, discussionFilePath(category, `${discussion.id}.json`), discussion);
    
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
  
  // Convert model name to Cloudflare format if needed
  // If model doesn't start with @cf/, try to convert from display name to ID
  let actualModel = model;
  if (!model.startsWith("@cf/")) {
    // Try to find the matching model ID from categorized models if available
    if (gatewayMetadata?.categorizedModels) {
      for (const category of Object.values(gatewayMetadata.categorizedModels)) {
        const foundModel = category.find(m => 
          m.name === model || m.name === model.replace(/\s+/g, " ") || 
          m.name.toLowerCase() === model.toLowerCase()
        );
        if (foundModel) {
          actualModel = foundModel.id;
          console.log("Converted model name from display name to ID:", model, "->", actualModel);
          break;
        }
      }
    }
  }
  
  // Use Cloudflare Workers AI binding
  if (env.AI) {
    try {
      // Check if this is an image generation model (text-to-image)
      // Image models require 'prompt' parameter instead of 'messages' format
      const modelId = (actualModel || "").toLowerCase();
      const isImageModel = modelId.includes("stable-diffusion") || 
                          modelId.includes("flux") || 
                          modelId.includes("text-to-image") ||
                          modelId.includes("llava") ||
                          options.isImageModel === true;
      
      let aiModel;
      if (isImageModel) {
        // Image generation format
        aiModel = env.AI.run(actualModel, {
          prompt: message,
        }, options.gatewayMetadata);
      } else {
        // Text generation format
        aiModel = env.AI.run(actualModel, {
          messages: [{ role: "user", content: message }],
          max_tokens: options.maxTokens || 512,
        }, options.gatewayMetadata);
      }
      
      const response = await aiModel;
      const content = response?.response || response?.output || response?.image || JSON.stringify(response);
      
      // Build result object
      const result = {
        ok: true,
        model: actualModel,
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
  const fallbackResult = { ok: true, model: actualModel, response: `Mock response for model=${actualModel} prompt=${message}` };
  if (gatewayMetadata) {
    fallbackResult.gateway = gatewayMetadata;
  }
  return fallbackResult;
}
