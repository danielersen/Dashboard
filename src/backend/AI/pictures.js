import { callModel } from "./core.js";

export async function pictures(env, model, body = {}) {
	const category = "pictures";
	const prompt = body?.prompt || (`Generate or describe an image for: ${body?.query || body?.text || ""}`);
	const result = await callModel(env, model, prompt, body?.options || {});
	return { result };
}

