import { callModel, addMessagePair } from "./core.js";

export async function notes_remarks(env, model, body = {}) {
	const category = "notes_remarks";
	const prompt = body?.prompt || (`Notes and remarks task: ${body?.query || body?.text || ""}`);
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

