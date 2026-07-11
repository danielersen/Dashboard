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
  // Skip limit checking to reduce subrequests - can be re-enabled later with optimization
  // const limits = await readLimits(env);
  // const key = monthKeyForModel(model);
  // const current = Number(limits[key] || 0);
  // const envLimit = env[`AI_LIMIT_${String(model).toUpperCase().replace(/[^A-Z0-9]/g,'_')}`] || env.AI_MONTHLY_LIMIT;
  // if (envLimit) {
  //   const max = Number(envLimit);
  //   if (current + inc > max) {
  //     throw new Error("Monthly limit reached for model: " + model);
  //   }
  // }
  // limits[key] = current + inc;
  // await writeLimits(env, limits);
  // return limits[key];
  return inc; // Just return the increment without checking
}

// Fetch AI usage limits from Cloudflare API
export async function fetchCloudflareLimits(env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  
  if (!accountId || !apiToken) {
    // Return mock data if credentials not configured
    return {
      daily: {
        used: 0,
        limit: 10000,
        percentage: 0
      },
      models: []
    };
  }
  
  try {
    // Fetch usage from Cloudflare Analytics API
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/analytics/usage`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error("Cloudflare API error:", response.status);
      return {
        daily: {
          used: 0,
          limit: 10000,
          percentage: 0
        },
        models: []
      };
    }
    
    const data = await response.json();
    
    // Parse the response - Cloudflare may return different formats
    let dailyUsed = 0;
    let dailyLimit = 10000;
    let modelUsage = [];
    
    if (data.success && data.result) {
      // Try to extract usage data
      if (data.result.usage) {
        dailyUsed = data.result.usage.requests || 0;
      }
      if (data.result.limit) {
        dailyLimit = data.result.limit.requests || 10000;
      }
      if (data.result.models) {
        modelUsage = data.result.models;
      }
    }
    
    const percentage = dailyLimit > 0 ? Math.round((dailyUsed / dailyLimit) * 100) : 0;
    
    return {
      daily: {
        used: dailyUsed,
        limit: dailyLimit,
        percentage: percentage
      },
      models: modelUsage
    };
  } catch (error) {
    console.error("Failed to fetch Cloudflare limits:", error);
    return {
      daily: {
        used: 0,
        limit: 10000,
        percentage: 0
      },
      models: []
    };
  }
}
