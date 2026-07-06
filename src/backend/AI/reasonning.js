import { callModel } from "./core.js";

export async function reasonning(env, model, body = {}) {
	const category = "reasonning";
	const prompt = body?.prompt || (`Perform reasoning task: ${body?.query || body?.text || ""}`);
	const result = await callModel(env, model, prompt, body?.options || {});
	// Skip discussion storage to reduce subrequests
	return { result };
}

