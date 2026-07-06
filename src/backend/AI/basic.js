import { callModel } from "./core.js";

export async function basic(env, model, body = {}) {
	const category = "basic";
	const prompt = body?.prompt || (`Basic AI request: ${body?.query || body?.text || ""}`);
	const result = await callModel(env, model, prompt, body?.options || {});
	return { result };
}

