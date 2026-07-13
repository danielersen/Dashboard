import { converterHandler } from "./converter.js";
import { calculHistoryHandler } from "./calcul_history.js";

export async function ToolsFunction(env, path, method, body) {
  if (path === 'convert') {
    return await converterHandler(env, path, method, body);
  } else if (path === 'calcul-history') {
    return await calculHistoryHandler(env, path, method, body);
  } else {
    throw new Error('Invalid tools path');
  }
}
