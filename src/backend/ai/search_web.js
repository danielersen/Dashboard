import { callModel, addMessagePair } from "./core.js";
import { getGatewayMetadata } from "./gateway.js";

export async function search_web(env, model, body = {}) {
	const category = "search_web";
	const prompt = body?.prompt || (`Search web and summarize for: ${body?.query || body?.text || ""}`);
	
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

