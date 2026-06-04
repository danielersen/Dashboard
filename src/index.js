// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";
export { CheckGradesWorkflow };

import { handleED } from "./backend/ecole_directe.js"

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // GETTING VARIABLES...
    const MODE = env.MODE;
    const SITE = env.SITE;
    const USER = env.USER;
    const PASSWORD = env.PASSWORD;
    const DAY = env.DAY;
    const MONTH = env.MONTH;
    const YEAR = env.YEAR;
    const CLASSE = env.CLASSE;
    const TEACHER = env.TEACHER;
    
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
