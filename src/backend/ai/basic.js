import { callModel, addMessagePair } from "./core.js";
import { getGatewayMetadata } from "./gateway.js";

export async function basic(env, model, body = {}) {
	const category = "basic";
	const prompt = body?.prompt || (`Basic AI request: ${body?.query || body?.text || ""}`);
	
	// Get gateway metadata
	const gatewayMetadata = await getGatewayMetadata(env, {
		conversationId: body?.conversationId,
		conversationName: body?.conversationName,
		prompt: prompt,
		categorizedModels: body?.categorizedModels || {}
	});
	
	const result = await callModel(env, model, prompt, body?.options || {}, gatewayMetadata);
	
	// Store conversation with gateway metadata
	const assistantContent = result?.response ?? String(result);
	const discussion = await addMessagePair(env, category, {
		discussionId: gatewayMetadata.gateway?.metadata?.conversationId,
		userContent: prompt,
		assistantContent,
		metadata: { 
			model,
			gateway: gatewayMetadata.gateway
		}
	});
	
	return { result, discussion };
}

