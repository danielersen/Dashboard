import { callModel } from "./core.js";

export async function pictures(env, model, body = {}) {
	const category = "pictures";
	const prompt = body?.prompt || body?.query || body?.text || "Generate an image";
	
	console.log("pictures - requested model:", model, "prompt:", prompt);
	
	// Call the requested model with all input formats in parallel
	// callModel will try all formats and return first successful result
	// Pass prompt as string directly, not as object
	const result = await callModel(env, model, prompt, body?.options || {});
	
	console.log("pictures result:", result);
	
	// If the result contains image data (base64), return it with a flag
	if (result.ok && result.result?.content) {
		return { 
			result: {
				ok: true,
				model: model,
				isImage: true,
				imageData: result.result.content
			}
		};
	}
	
	return { result };
}

