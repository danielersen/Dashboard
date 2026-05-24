import { handleED } from "./backend/ecole_directe.js"

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // GETTING VARIABLES...
    const MODE = env.MODE;
    const SITE = env.SITE;
    
    // =========================
    // ⛔ PRODUCTION MODE DISABLED
    // =========================
    if (env.MODE !== "prodution") {
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
    
    // Ecoledirecte handle
    if (url.pathname.startsWith("/api/ed")) {
      return handleED(request, env, ctx, secretJson)
    }

    // =========================
    // ❌ 404 NOT FOUND
    // =========================
    return new Response("Not Found", { status: 404 })
  }
}