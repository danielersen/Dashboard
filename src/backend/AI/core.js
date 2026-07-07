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
  const modelId = model.toLowerCase();
  
  console.log("callModel - model:", model, "modelId:", modelId, "prompt:", prompt);
  
  // Check if this is an image generation model
  const isImageModel = modelId.includes("stable") || modelId.includes("flux") || 
                       modelId.includes("sd") || modelId.includes("diffusion") ||
                       modelId.includes("dreamshaper") || modelId.includes("realistic-vision") ||
                       modelId.includes("runwayml") || modelId.includes("lightning");
  
  // Leonardo models are also image models but need special handling
  const isLeonardoModel = modelId.includes("leonardo");
  
  console.log("isImageModel:", isImageModel, "for model:", model);
  
  // Use Cloudflare Workers AI binding
  if (env.AI) {
    try {
      let input;
      
      if (isImageModel || isLeonardoModel) {
        // Image generation models - try multiple formats for compatibility
        let promptText;
        if (typeof prompt === "string") {
          promptText = prompt;
        } else if (prompt && typeof prompt === "object" && prompt.prompt) {
          promptText = prompt.prompt;
        } else {
          promptText = JSON.stringify(prompt);
        }
        
        // According to Cloudflare docs, try all possible input format combinations
        // Cover all parameter variations across different models
        const inputFormats = [
          { prompt: promptText },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000) },
          { prompt: promptText, steps: 1 },
          { prompt: promptText, steps: 10 },
          { prompt: promptText, steps: 20 },
          { prompt: promptText, steps: 25 },
          { prompt: promptText, steps: 50 },
          { prompt: promptText, num_steps: 1 },
          { prompt: promptText, num_steps: 10 },
          { prompt: promptText, num_steps: 20 },
          { prompt: promptText, num_steps: 25 },
          { prompt: promptText, num_steps: 40 },
          { prompt: promptText, num_steps: 50 },
          { prompt: promptText, guidance: 2 },
          { prompt: promptText, guidance: 5 },
          { prompt: promptText, guidance: 7.5 },
          { prompt: promptText, guidance: 10 },
          { prompt: promptText, width: 512, height: 512 },
          { prompt: promptText, width: 768, height: 768 },
          { prompt: promptText, width: 1024, height: 1024 },
          { prompt: promptText, steps: 20, guidance: 7.5 },
          { prompt: promptText, steps: 20, width: 1024, height: 1024 },
          { prompt: promptText, steps: 20, guidance: 7.5, width: 1024, height: 1024 },
          { prompt: promptText, num_steps: 20, guidance: 7.5 },
          { prompt: promptText, num_steps: 20, width: 1024, height: 1024 },
          { prompt: promptText, num_steps: 20, guidance: 7.5, width: 1024, height: 1024 },
          { prompt: promptText, num_steps: 25, guidance: 5 },
          { prompt: promptText, num_steps: 25, width: 1024, height: 1024 },
          { prompt: promptText, num_steps: 25, guidance: 5, width: 1024, height: 1024 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), steps: 20 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), num_steps: 20 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), steps: 20, guidance: 7.5 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), num_steps: 20, guidance: 7.5 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), steps: 20, width: 1024, height: 1024 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), num_steps: 20, width: 1024, height: 1024 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), steps: 20, guidance: 7.5, width: 1024, height: 1024 },
          { prompt: promptText, seed: Math.floor(Math.random() * 1000000), num_steps: 20, guidance: 7.5, width: 1024, height: 1024 },
          // Additional formats for Leonardo-specific requirements
          { prompt: promptText, num_inference_steps: 25 },
          { prompt: promptText, num_inference_steps: 25, guidance_scale: 5 },
          { prompt: promptText, num_inference_steps: 25, guidance_scale: 5, width: 1024, height: 1024 },
          { prompt: promptText, num_inference_steps: 25, guidance_scale: 5, width: 1024, height: 1024, seed: Math.floor(Math.random() * 1000000) },
        ];
        
        // Try all formats in parallel and return first successful result
        const formatPromises = inputFormats.map(async (format) => {
          try {
            console.log("Trying image model format:", JSON.stringify(format));
            console.log("Format has prompt property:", 'prompt' in format);
            console.log("Format prompt value:", format.prompt);
            console.log("Format keys:", Object.keys(format));
            
            // Pass format directly to avoid any variable reassignment issues
            const aiModel = env.AI.run(model, format);
            const response = await aiModel;
            
            console.log("Raw Cloudflare AI response type:", typeof response);
            console.log("Response is ReadableStream:", response instanceof ReadableStream);
            
            // Handle ReadableStream responses (image models)
            if (response instanceof ReadableStream) {
              console.log("Processing ReadableStream response...");
              const reader = response.getReader();
              const chunks = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              const uint8Array = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of chunks) {
                uint8Array.set(chunk, offset);
                offset += chunk.length;
              }
              const base64 = btoa(String.fromCharCode(...uint8Array));
              const content = `data:image/jpeg;base64,${base64}`;
              return { ok: true, result: { content, isImage: true } };
            }
            
            // For non-stream responses, log as JSON
            if (typeof response === 'object') {
              console.log("Response keys:", response ? Object.keys(response) : "null/undefined");
              console.log("Raw response:", JSON.stringify(response));
            } else {
              console.log("Raw response:", response);
            }
            
            // Check for empty response
            if (!response || (typeof response === 'object' && Object.keys(response).length === 0)) {
              console.log("Empty response with this format");
              return null;
            }
            
            // If we got a valid response, process it
            let content = null;
            if (response?.image) {
              if (response.image.startsWith('data:')) {
                content = response.image;
              } else {
                content = `data:image/png;base64,${response.image}`;
              }
            } else if (response?.result?.image) {
              if (response.result.image.startsWith('data:')) {
                content = response.result.image;
              } else {
                content = `data:image/png;base64,${response.result.image}`;
              }
            } else if (typeof response === 'string') {
              if (response.startsWith('data:')) {
                content = response;
              } else {
                content = `data:image/png;base64,${response}`;
              }
            }
            
            if (content) {
              return { ok: true, result: { content, isImage: true } };
            } else {
              return null;
            }
          } catch (err) {
            console.log("Error with format:", format, "Error:", err.message);
            return null;
          }
        });
        
        // Use Promise.race to get first successful result
        const racePromises = formatPromises.map(p => 
          p.then(result => {
            if (result && result.ok) {
              return result; // Return success directly
            }
            return null;
          })
        );
        
        // Wait for all promises to complete
        const results = await Promise.all(racePromises);
        const firstSuccess = results.find(r => r !== null && r.ok);
        
        if (firstSuccess) {
          return firstSuccess;
        }
        
        // All formats failed
        return { ok: false, error: `All input formats failed for model ${model}` };
      }
      
      // Text generation models use { messages: [...] } format
      let message;
      if (typeof prompt === "string") {
        message = prompt;
      } else if (prompt && typeof prompt === "object" && prompt.prompt) {
        message = prompt.prompt;
      } else {
        message = JSON.stringify(prompt);
      }
      input = {
        messages: [{ role: "user", content: message }],
        max_tokens: options.maxTokens || 1024,
      };
      console.log("Using text model format:", input);
      
      const aiModel = env.AI.run(model, input);
      const response = await aiModel;
      
      console.log("Raw Cloudflare AI response:", JSON.stringify(response));
      console.log("Response type:", typeof response);
      console.log("Response keys:", response ? Object.keys(response) : "null/undefined");
      
      // Check for empty response
      if (!response || (typeof response === 'object' && Object.keys(response).length === 0)) {
        console.error("Empty response from Cloudflare AI for model:", model);
        return { ok: false, error: `Empty response from Cloudflare AI for model ${model}. The model may be unavailable or requires a different input format.` };
      }
      
      // Extract content from text response
      let content = null;
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
  const message = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  return { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
}
