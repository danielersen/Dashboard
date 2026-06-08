// Workflows
import { CheckGradesWorkflow } from "./workflows/check_grades";
import { EDinformations } from "./backend/ecole_directe/index.js";

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

    
    /// Ecoledirecte paths
    // Informations
    if (url.pathname.startsWith("/api/ed/informations")&&
      request.method === "GET"
    ) {
      const resp = await EDinformations(env);
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    
    // Grades
    if (url.pathname.startsWith("/api/ed/grades")&&
      request.method === "GET"
    ) {
      const resp = None;
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    
    // Homeworks
    if (url.pathname.startsWith("/api/ed/homeworks")&&
      request.method === "GET"
    ) {
      const resp = None;
      return new Response(JSON.stringify({ resp }), {
        headers: corsHeaders
      })
    }
    
    // Timetable
    if (url.pathname.startsWith("/api/ed/timetable")&&
      request.method === "GET"
    ) {
      const resp = None;
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
