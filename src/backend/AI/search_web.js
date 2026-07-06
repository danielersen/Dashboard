import { callModel } from "./core.js";

export async function search_web(env, model, body = {}) {
	const category = "search_web";
	const prompt = body?.prompt || (`Search web and summarize for: ${body?.query || body?.text || ""}`);
	const result = await callModel(env, model, prompt, body?.options || {});
	// Skip discussion storage to reduce subrequests
	return { result };
}

