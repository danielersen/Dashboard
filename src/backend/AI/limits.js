import { megaRead, megaWrite } from "../database/mega.js";

function limitsPath() { return `artificial_intelligence/limits.json`; }

export async function readLimits(env) {
  try {
    return await megaRead(env, limitsPath());
  } catch (e) {
    return {};
  }
}

export async function writeLimits(env, data) {
  return await megaWrite(env, limitsPath(), data || {});
}

function monthKeyForModel(model) {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  return `${model}::${ym}`;
}

export async function checkAndIncrementMonthly(env, model, inc = 1) {
  const limits = await readLimits(env);
  const key = monthKeyForModel(model);
  const current = Number(limits[key] || 0);
  const envLimit = env[`AI_LIMIT_${String(model).toUpperCase().replace(/[^A-Z0-9]/g,'_')}`] || env.AI_MONTHLY_LIMIT;
  if (envLimit) {
    const max = Number(envLimit);
    if (current + inc > max) {
      throw new Error("Monthly limit reached for model: " + model);
    }
  }
  limits[key] = current + inc;
  await writeLimits(env, limits);
  return limits[key];
}
