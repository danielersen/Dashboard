import { handleAPI } from "./backend/API/app.js"
import { handleAPI_ws } from "./backend/Server/node/client_example.js"
import { handleWebSocket } from "./backend/Server/node/server_example.js"

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
      url.pathname === "/" ||
      url.pathname.startsWith("/assets")
    ) {
      return env.ASSETS.fetch(request)
    }

    // =========================
    // 📶 MAIN API
    // =========================
    if (url.pathname.startsWith("/api")) {
      return handleAPI(request, env, ctx, secretJson)
    }

    // =========================
    // 📡 WS API
    // =========================
    if (url.pathname.startsWith("/api-ws")) {
      return handleAPI_ws(request, env, ctx, secretJson)
    }

    // =========================
    // 🔌 WEBSOCKET
    // =========================
    if (url.pathname === "/ws") {
      return handleWebSocket(request, env, ctx, secretJson)
    }

    // =========================
    // ❌ 404 NOT FOUND
    // =========================
    return new Response("Not Found", { status: 404 })
  }
}