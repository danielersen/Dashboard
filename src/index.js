// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";

// API features
import { EDfunction } from "./backend/ecole_directe/index.js";
import { Cache } from "./backend/cache/index.js";
 
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
    
    if (url.pathname.startsWith("/api/")) {
      try {
        // Ecole directe paths
        let resp;
        if (url.pathname.startsWith("/api/ed/")) {
          resp = await EDfunction(env, url.pathname.slice("/api/ed/".length), method, headers, body);
        } else if (url.pathname.startsWith("/api/cache/")) {
          resp = await Cache(url.pathname.slice("/api/cache/".length), method, body)
        };
        // Return response
        return new Response(JSON.stringify({
          resp
        }), {
          headers: corsHeaders
        })
      } catch (e) {
        console.error("API ERROR:", e?.stack || e);
        return new Response(JSON.stringify({
          error: e?.message,
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // =========================
    // 🌐 SITE (Cloudflare assets)
    // =========================
    if (url.pathname === `/${env.GOOGLE_SITE_VERIFICATION}`) {
      return new Response(`google-site-verification: ${env.GOOGLE_SITE_VERIFICATION}`, {
        headers: { "content-type": "text/html" }
      });
    }

    if (url.pathname === "/" || url.pathname === "") {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/pages/home/index.html";
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    const pageMatch = url.pathname.match(/^\/pages\/([^/]+)\/?$/);
    if (pageMatch) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = `/pages/${pageMatch[1]}/index.html`;
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request)
  }
}

// Export the workflows code
export { CheckGradesWorkflow };
