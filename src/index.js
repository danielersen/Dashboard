// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";

// API functions
import { EDfunction } from "./backend/ecole_directe/index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = request.headers
    try {
      const body = JSON.parse(await request.text);
    } catch (e) {
      const body = null;
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
        "GET, POST, PATCH",

      "Access-Control-Allow-Headers":
        "*"
    };
    try {
      // Ecole directe paths
      if (url.pathname.startsWith("/api/ed/")) {
        const resp = await EDfunction(env, url.pathname.slice("/api/ed/".length), headers);
        
      // Return response
      return new Response(JSON.stringify({ 
        resp 
      }), {
        headers: corsHeaders
      })
      }
    } catch (e) {
      console.error("API ERROR:", e?.stack || e);
      return new Response(JSON.stringify({
        error: e?.message
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
