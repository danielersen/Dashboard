import { getCalculHistory, addCalculToHistory, clearCalculHistory } from "../cache/index.js";

export async function calculHistoryHandler(env, path, method, body) {
  if (method === 'GET') {
    // Get history
    const history = await getCalculHistory(env);
    return { history };
  } else if (method === 'POST') {
    // Add calculation to history
    const { calculation, result } = body;
    if (!calculation || result === undefined) {
      throw new Error('Missing required parameters: calculation, result');
    }
    const history = await addCalculToHistory(env, calculation, result);
    return { history };
  } else if (method === 'DELETE') {
    // Clear history
    const history = await clearCalculHistory(env);
    return { history };
  } else {
    throw new Error('Method not allowed');
  }
}
