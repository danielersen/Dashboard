import { callModel } from "./core.js";

export async function pictures(env, model, body = {}) {
	const category = "pictures";
	const prompt = body?.prompt || body?.query || body?.text || "Generate an image";
	
	console.log("pictures - model:", model, "prompt:", prompt);
	
	// Image generation models need different input format than text models
	// According to Cloudflare Workers AI docs, image models expect { prompt: string }
	const result = await callModel(env, model, { prompt }, body?.options || {});
	return { result };
}

