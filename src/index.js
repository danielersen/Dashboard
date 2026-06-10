// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";

// API functions
export { EDgrades } from "./backend/ecole_directe/index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    
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
      SITE === "production"
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
        const resp = EDfunction(env, url.pathname);
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