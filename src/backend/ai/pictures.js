import { callModel, addMessagePair } from "./core.js";
import { getGatewayMetadata } from "./gateway.js";

export async function pictures(env, model, body = {}) {
	const category = "pictures";
	const prompt = body?.prompt || (`Generate or describe an image for: ${body?.query || body?.text || ""}`);
	
	// Get gateway metadata with categorizedModels
	const gatewayMetadata = await getGatewayMetadata(env, {
		conversationId: body?.conversationId,
		conversationName: body?.conversationName,
		prompt: prompt,
		categorizedModels: body?.categorizedModels || {}
	});
	
	// Pass categorizedModels to callModel for model name conversion
	const callOptions = { ...body?.options, isImageModel: true, categorizedModels: body?.categorizedModels || {} };
	
	const result = await callModel(env, model, prompt, callOptions, gatewayMetadata);
	
	// Store conversation with gateway metadata - use the conversationId from gateway metadata
	const conversationId = gatewayMetadata.gateway?.metadata?.conversationId || body?.conversationId;
	const assistantContent = result?.response ?? String(result);
	const discussion = await addMessagePair(env, category, {
		discussionId: conversationId,
		userContent: prompt,
		assistantContent,
		metadata: { 
			model,
			gateway: gatewayMetadata.gateway
		}
	});
	
	return { result, discussion, conversationId, conversationName: gatewayMetadata.gateway?.metadata?.conversationName, isNewConversation: gatewayMetadata.gateway?.metadata?.isNewConversation };
}

