// Using Cloudflare API only for limits

// Fetch AI usage limits from Cloudflare API
export async function fetchCloudflareLimits(env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  
  if (!accountId || !apiToken) {
    console.log("Cloudflare credentials not configured, returning mock data");
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
    // Try multiple possible API endpoints for usage data
    const endpoints = [
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/analytics/usage`,
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics/ai/usage`,
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/ai/usage`
    ];
    
    let data = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying Cloudflare API endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json"
          }
        });
        
        if (response.ok) {
          data = await response.json();
          console.log("Cloudflare API response:", JSON.stringify(data));
          break;
        } else {
          console.log(`Endpoint ${endpoint} returned status: ${response.status}`);
          lastError = response.status;
        }
      } catch (e) {
        console.log(`Endpoint ${endpoint} failed:`, e.message);
        lastError = e.message;
      }
    }
    
    if (!data) {
      console.error("All Cloudflare API endpoints failed, last error:", lastError);
      return {
        daily: {
          used: 0,
          limit: 10000,
          percentage: 0
        },
        models: []
      };
    }
    
    // Parse the response - Cloudflare may return different formats
    let dailyUsed = 0;
    let dailyLimit = 10000;
    let modelUsage = [];
    
    console.log("Parsing Cloudflare response data:", JSON.stringify(data));
    
    if (data.success && data.result) {
      // Try to extract usage data from different possible structures
      if (data.result.usage) {
        dailyUsed = data.result.usage.requests || data.result.usage.count || data.result.usage.total || 0;
      } else if (data.result.requests) {
        dailyUsed = data.result.requests;
      } else if (data.result.count) {
        dailyUsed = data.result.count;
      } else if (data.result.total) {
        dailyUsed = data.result.total;
      }
      
      if (data.result.limit) {
        dailyLimit = data.result.limit.requests || data.result.limit.count || data.result.limit.total || 10000;
      } else if (data.result.max) {
        dailyLimit = data.result.max;
      }
      
      if (data.result.models) {
        modelUsage = data.result.models;
      } else if (data.result.model_usage) {
        modelUsage = data.result.model_usage;
      } else if (data.result.by_model) {
        modelUsage = data.result.by_model;
      }
    } else if (data.result) {
      // Try direct result access
      dailyUsed = data.result.requests || data.result.count || data.result.total || 0;
      dailyLimit = data.result.limit || data.result.max || 10000;
    }
    
    console.log(`Parsed usage: ${dailyUsed}/${dailyLimit}`);
    
    // If we don't have model usage data, try to fetch it separately
    if (modelUsage.length === 0) {
      try {
        console.log("Trying to fetch model-specific usage data");
        const modelEndpoints = [
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/analytics/usage?group_by=model`,
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics/ai/usage?group_by=model`
        ];
        
        for (const endpoint of modelEndpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json"
              }
            });
            
            if (response.ok) {
              const modelData = await response.json();
              console.log("Model usage API response:", JSON.stringify(modelData));
              
              if (modelData.success && modelData.result) {
                if (modelData.result.data) {
                  modelUsage = modelData.result.data;
                } else if (modelData.result.models) {
                  modelUsage = modelData.result.models;
                } else if (Array.isArray(modelData.result)) {
                  modelUsage = modelData.result;
                }
                break;
              }
            }
          } catch (e) {
            console.log(`Model endpoint ${endpoint} failed:`, e.message);
          }
        }
      } catch (e) {
        console.log("Failed to fetch model-specific usage:", e.message);
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
