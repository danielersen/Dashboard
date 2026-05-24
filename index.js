import { handleED } from "./backend/ecole_directe.js"

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // GETTING VARIABLES...
    const MODE = env.MODE;
    const SITE = env.SITE;
    const USER = env.USER;
    const PASSWORD = env.PASSWORD;
    
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
    /// Ecoledirecte handle
    // Notes
    if (url.pathname.startsWith("/api/ed/notes")&&
      request.method === "GET"
    ) {
      return handleED(USER, PASSWORD, "notes")
    }
    // Agenda
    if (url.pathname.startsWith("/api/ed/agenda")&&
      request.method === "GET"
    ) {
      return handleED(USER, PASSWORD, "agenda")
    }
    // Timetable
    if (url.pathname.startsWith("/api/ed/timetable")&&
      request.method === "GET"
    ) {
      return handleED(USER, PASSWORD, "timetable")
    }
    
    // =========================
    // ❌ 404 NOT FOUND
    // =========================
    return new Response("Not Found", { status: 404 })
  }
}