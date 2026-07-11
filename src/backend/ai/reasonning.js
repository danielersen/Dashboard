import { callModel, addMessagePair } from "./core.js";
import { getGatewayMetadata } from "./gateway.js";

export async function reasonning(env, model, body = {}) {
	const category = "reasonning";
	const prompt = body?.prompt || (`Perform reasoning task: ${body?.query || body?.text || ""}`);
	
	// Get gateway metadata
	const gatewayMetadata = await getGatewayMetadata(env, {
		conversationId: body?.conversationId,
		conversationName: body?.conversationName,
		prompt: prompt,
		categorizedModels: body?.categorizedModels || {}
	});
	
	const result = await callModel(env, model, prompt, body?.options || {}, gatewayMetadata);
	
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
	
	return { result, discussion };
}

