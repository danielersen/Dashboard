// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";
import { ecole_directe } from "./backend/ecole_directe/index.js"

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
    /// Ecoledirecte handle
    // Notes
    if (url.pathname.startsWith("/api/ed/notes")&&
      request.method === "GET"
    ) {
      const resp = await handleED(USER, PASSWORD, DAY, MONTH, YEAR, CLASSE, TEACHER);
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    // Agenda
    if (url.pathname.startsWith("/api/ed/agenda")&&
      request.method === "GET"
    ) {
      const resp = await handleED(USER, PASSWORD, DAY, MONTH, YEAR, CLASSE, TEACHER);
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    // Timetable
    if (url.pathname.startsWith("/api/ed/timetable")&&
      request.method === "GET"
    ) {
      const resp = await handleED(USER, PASSWORD, DAY, MONTH, YEAR, CLASSE, TEACHER);
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    
    // =========================
    // ❌ 404 NOT FOUND
    // =========================
    return new Response("Not Found", { status: 404 })
  }
}

// export the workflows code
export { CheckGradesWorkflow };