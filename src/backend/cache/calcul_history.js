import { getCacheValue, setCacheValue } from "./index.js";

const CALC_HISTORY_KEY = 'calculator_history';
const MAX_HISTORY_SIZE = 30;

export async function getCalculHistory(env) {
  try {
    const history = await getCacheValue(env, CALC_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting calculator history:', error);
    return [];
  }
}

export async function addCalculToHistory(env, calculation, result) {
  try {
    const history = await getCalculHistory(env);
    
    // Add new calculation to the beginning (most recent first)
    const newEntry = {
      calculation,
      result,
      timestamp: new Date().toISOString()
    };
    
    history.unshift(newEntry);
    
    // Keep only the most recent 30 entries
    if (history.length > MAX_HISTORY_SIZE) {
      history.splice(MAX_HISTORY_SIZE);
    }
    
    await setCacheValue(env, CALC_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (error) {
    console.error('Error adding to calculator history:', error);
    throw error;
  }
}

export async function clearCalculHistory(env) {
  try {
    await setCacheValue(env, CALC_HISTORY_KEY, JSON.stringify([]));
    return [];
  } catch (error) {
    console.error('Error clearing calculator history:', error);
    throw error;
  }
}
