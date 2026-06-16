// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";

// API features
import { EDfunction } from "./backend/ecole_directe/index.js";

// Set cache
const cache = caches.default;
export async function setCacheValue(key, value, ttl = 1800) {
  const req = new Request("https://cache/" + key);
  const res = new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": `max-age=${ttl}`
    }
  });
  await cache.put(req, res);
}
export async function getCacheValue(key) {
  const req = new Request("https://cache/" + key);
  const res = await cache.match(req);
  if (!res) return null;
  return await res.json();
}

// API funtion
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const headers = request.headers
    let body;
    try {
      body = JSON.parse(await request.text());
    } catch (e) {
      body = {};
    }
    
    // =========================
    // ⛔ PRODUCTION MODE DISABLED
    // =========================
    if (env.MODE !== "production") {
      return new Response("Not Found", { status: 404 })
    }

    // =========================
    // 🌐 SITE (Cloudflare assets)
    // =========================
    if (
      (url.pathname === "/" ||
      url.pathname === "" ||
      url.pathname.startsWith("/assets"))&&
      env.SITE === "production"
    ) {
      return env.ASSETS.fetch(request)
    }

    // =========================
    // 📶 MAIN API
    // =========================
    /// CORS
    const corsHeaders = {
      "Content-Type":
        "application/json",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Methods":
        "GET, POST",

      "Access-Control-Allow-Headers":
        "*"
    };
    try {
      // Ecole directe paths
      let resp;
      if (url.pathname.startsWith("/api/ed/")) {
        resp = await EDfunction(env, url.pathname.slice("/api/ed/".length), method, headers, body);
      };
      // Return response
      return new Response(JSON.stringify({ 
        resp 
      }), {
        headers: corsHeaders
      })
    } catch (e) {
      console.error("API ERROR:", e?.stack || e);
      const match = e?.stack?.match(/at .*?\(?(.+):(\d+):(\d+)\)?/);
      return new Response(JSON.stringify({
        error: e?.message,
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // =========================
    // ❌ 404 NOT FOUND
    // =========================
    return new Response("Not Found", { status: 404 })
  }
}

// Export the workflows code
export { CheckGradesWorkflow };
