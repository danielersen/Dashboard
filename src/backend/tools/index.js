import { converterHandler } from "./converter.js";

export async function ToolsFunction(env, path, method, body) {
  if (path === 'convert') {
    return await converterHandler(env, path, method, body);
  } else {
    throw new Error('Invalid tools path');
  }
}
