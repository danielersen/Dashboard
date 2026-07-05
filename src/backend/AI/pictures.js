import { callModel, addMessagePair } from "./core.js";

export async function pictures(env, model, body = {}) {
	const category = "pictures";
	const prompt = body?.prompt || (`Generate or describe an image for: ${body?.query || body?.text || ""}`);
	const result = await callModel(env, model, prompt, body?.options || {});
	const assistantContent = result?.response ?? String(result);
	const discussion = await addMessagePair(env, category, {
		discussionId: body?.discussionId || null,
		userContent: prompt,
		assistantContent,
		metadata: { model }
	});
	return { result, discussion };
}

