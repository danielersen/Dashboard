// Auth API: exchanges a verified Supabase access token for a short-lived
// server session token, and validates session tokens on subsequent calls.

import { verifySupabaseToken } from "./supabase_jwt.js";
import { issueSessionToken, verifySessionToken } from "./session.js";
import { verifyTurnstileToken } from "./turnstile.js";

export { verifySupabaseToken, issueSessionToken, verifySessionToken };

export async function Auth(env, path, method, body, request) {
  // POST /api/auth/turnstile  { token } -> { success }
  // Verifies a Cloudflare Turnstile token before the client proceeds to login.
  if (path === "turnstile" && method === "POST") {
    const remoteip = request?.headers?.get("CF-Connecting-IP") || undefined;
    const result = await verifyTurnstileToken(env, body?.token, remoteip);
    return { success: result.success, reason: result.reason };
  }

  // POST /api/auth/session  { access_token } -> { valid, token, exp }
  if (path === "session" && method === "POST") {
    const accessToken = body?.access_token;
    const result = await verifySupabaseToken(accessToken, env.SUPABASE_URL);
    if (!result.valid) {
      return { valid: false, reason: result.reason };
    }
    const session = await issueSessionToken(env, result.payload);
    return { valid: true, token: session.token, exp: session.exp, expiresIn: session.expiresIn };
  }

  // POST /api/auth/check  { token } -> { valid }
  if (path === "check" && method === "POST") {
    const result = await verifySessionToken(env, body?.token);
    return { valid: result.valid, reason: result.reason };
  }

  return { valid: false, reason: "unknown_route" };
}
