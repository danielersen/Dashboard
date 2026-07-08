// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";

// API features
import { EDfunction } from "./backend/ecole_directe/index.js";
import { AIfunction } from "./backend/AI/index.js";
import { Cache } from "./backend/cache/index.js";
import { Auth, verifySessionToken } from "./backend/auth/index.js";
import { Pomodoro } from "./backend/database/pomodoro.js";
 
import { sendMail } from "./backend/notifications/mail.js";

async function sendErrorEmail(env, error, context) {
  try {
    const rawError = error instanceof Error ? error.stack || error.message : String(error);
    await sendMail(env, {
      subject: `Dashboard error: ${context}`,
      text: `A runtime error occurred while processing the request in the Dashboard application.\n\nContext: ${context}\n\nRaw error:\n${rawError}`,
    });
  } catch (mailError) {
    console.error("Failed to send error email:", mailError);
  }
}

// API funtion
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const headers = request.headers

    // =========================
    // ✅ GOOGLE SITE VERIFICATION
    // =========================
    // Must stay reachable without any gating (no login, no production-mode
    // block) so Google can verify domain ownership at any time.
    if (env.GOOGLE_SITE_VERIFICATION && url.pathname === `/${env.GOOGLE_SITE_VERIFICATION}`) {
      return new Response(`google-site-verification: ${env.GOOGLE_SITE_VERIFICATION}`, {
        headers: { "content-type": "text/html" }
      });
    }

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
    
    // Public Supabase config for the frontend (anon key is public).
    if (url.pathname === "/api/config") {
      return new Response(JSON.stringify({
        supabaseUrl: env.SUPABASE_URL ?? null,
        supabaseAnonKey: env.SUPABASE_ANON_KEY ?? null,
        turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
      }), {
        headers: corsHeaders
      });
    }

    // Auth: verify Supabase token + issue/validate server session tokens.
    if (url.pathname.startsWith("/api/auth/")) {
      try {
        const resp = await Auth(env, url.pathname.slice("/api/auth/".length), method, body, request);
        return new Response(JSON.stringify(resp), { headers: corsHeaders });
      } catch (e) {
        console.error("AUTH ERROR:", e?.stack || e);
        await sendErrorEmail(env, e, "AUTH");
        return new Response(JSON.stringify({ valid: false, error: e?.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      // Every data route requires a valid server-issued JWT in the
      // Authorization header. /api/config and /api/auth/* are intentionally
      // reachable without one (they bootstrap the login + token exchange), and
      // google site verification is handled earlier, before any gating.
      const authHeader = headers.get("Authorization") || "";
      const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      const session = await verifySessionToken(env, bearer);
      if (!session.valid) {
        return new Response(JSON.stringify({ error: "unauthorized", reason: session.reason }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      try {
        // Ecole directe paths
        let resp;
        if (url.pathname.startsWith("/api/ed/")) {
          resp = await EDfunction(env, url.pathname.slice("/api/ed/".length), method, headers, body);
        } else if (url.pathname.startsWith("/api/ai/")) {
          resp = await AIfunction(env, url.pathname.slice("/api/ai/".length), method, headers, body);
        } else if (url.pathname.startsWith("/api/pomodoro/")) {
          resp = await Pomodoro(env, url.pathname.slice("/api/pomodoro/".length), method, body);
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
        await sendErrorEmail(env, e, "API");
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
    
    // Sitemap served from file
    if (url.pathname === "/sitemap.xml") {
      const sitemapResponse = await env.ASSETS.fetch(new Request(request.url.replace('/sitemap.xml', '/sitemap.xml'), request));
      const sitemapContent = await sitemapResponse.text();
      
      return new Response(sitemapContent, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    
    // Serve SVG icons from assets
    if (url.pathname.startsWith("/assets/icons/")) {
      const iconResponse = await env.ASSETS.fetch(request);
      const iconContent = await iconResponse.text();
      
      return new Response(iconContent, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    
    // Robots.txt with correct content-type
    if (url.pathname === "/robots.txt") {
      const assetResponse = await env.ASSETS.fetch(request);
      const newHeaders = new Headers(assetResponse.headers);
      newHeaders.set("Content-Type", "text/plain; charset=utf-8");
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        headers: newHeaders
      });
    }
    
    // "/", "/pages" and "/pages/" all land on home. Supabase sends users to
    // "/pages/" after login; serving home there lets the client guard run and
    // bounce to the originally-requested page (post-auth redirect cookie).
    if (
      url.pathname === "/" ||
      url.pathname === "" ||
      url.pathname === "/pages" ||
      url.pathname === "/pages/"
    ) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/pages/home/index.html";
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }
   
    if (url.pathname === `/pages/parent`) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = "/pages/workspace/index2.html";
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
