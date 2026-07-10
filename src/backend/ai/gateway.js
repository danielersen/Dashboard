import { callModel } from "./core.js";
import { estimateConsumption } from "./index.js";

// Generate a long random ID for conversations
function generateConversationId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const extraRandom = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}-${extraRandom}`;
}

// Find the cheapest model for title generation
function findCheapestModel(categorizedModels) {
  let cheapestModel = null;
  let lowestConsumption = Infinity;
  
  // Check basic category for cheapest model
  const basicModels = categorizedModels?.basic || [];
  for (const model of basicModels) {
    const consumption = model.consumption || 0;
    if (consumption < lowestConsumption) {
      lowestConsumption = consumption;
      cheapestModel = model.id || model.model;
    }
  }
  
  return cheapestModel || "@cf/meta/llama-2-7b-chat-int8";
}

// Generate a conversation title using a cheap model
async function generateConversationTitle(env, prompt, categorizedModels = {}) {
  try {
    const cheapestModel = findCheapestModel(categorizedModels);
    const titlePrompt = `Generate a very short title (max 3 words) for this conversation: ${prompt.substring(0, 200)}`;
    
    const result = await callModel(env, cheapestModel, titlePrompt, { maxTokens: 20 });
    
    if (result.ok && result.response) {
      // Clean up the title
      let title = result.response.trim();
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
      // Limit to 3 words
      const words = title.split(/\s+/).slice(0, 3);
      title = words.join(' ');
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      return title || "New Conversation";
    }
  } catch (error) {
    console.error("Failed to generate conversation title:", error);
  }
  
  // Fallback: use first few words of prompt
  const words = prompt.split(/\s+/).slice(0, 3);
  return words.join(' ').charAt(0).toUpperCase() + words.join(' ').slice(1) || "New Conversation";
}

// Main function to get gateway metadata
export async function getGatewayMetadata(env, { conversationId = null, conversationName = null, prompt = "", categorizedModels = {} } = {}) {
  const gatewayId = env.GATEWAY_ID || "default-gateway";
  
  const metadata = {
    conversationId: conversationId,
    conversationName: conversationName,
    timestamp: new Date().toISOString(),
  };
  
  // If conversation ID or name is missing, create new conversation
  if (!conversationId || !conversationName) {
    const newId = conversationId || generateConversationId();
    let newName = conversationName;
    
    // Generate title if name is missing and prompt is provided
    if (!newName && prompt) {
      newName = await generateConversationTitle(env, prompt, categorizedModels);
    }
    
    metadata.conversationId = newId;
    metadata.conversationName = newName || "New Conversation";
    metadata.isNewConversation = true;
  } else {
    metadata.isNewConversation = false;
  }
  
  return {
    gateway: {
      id: gatewayId,
      metadata: metadata
    }
  };
}
