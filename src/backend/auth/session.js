// Server-issued session tokens.
//
// After a Supabase access token is verified, we mint our own short-lived JWT
// (HS256, signed with the project secret) and keep a registry of the live token
// ids in the cache for 10 minutes. The client sends this token on every API
// call; the API checks the signature AND that the id is still registered, so a
// token can be expired/pruned server-side.

import { getCacheValue, setCacheValue } from "../cache/index.js";
import { stringToBase64Url, bytesToBase64Url, decodeJwtPart } from "./encoding.js";

const REGISTRY_KEY = "session_tokens";
export const SESSION_TTL_SECONDS = 10 * 60; // 10 minutes

async function getSecret(env) {

  const secret = env?.PROJECT_TOKEN ? await env.PROJECT_TOKEN.get() : null;
  if (!secret) {
    throw new Error("Missing signing secret (MY_SECRET).");
  }
  return secret;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(signingInput, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return bytesToBase64Url(new Uint8Array(sig));
}

function randomId() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

// Read the registry, drop expired ids, add the new one, write it back.
async function registerToken(jti, exp) {
  let tokens = await getCacheValue(REGISTRY_KEY);
  if (!Array.isArray(tokens)) tokens = [];
  const now = Math.floor(Date.now() / 1000);
  tokens = tokens.filter((t) => t && typeof t.exp === "number" && t.exp > now);
  tokens.push({ jti, exp });
  await setCacheValue(REGISTRY_KEY, tokens);
}

async function isRegistered(jti) {
  const tokens = await getCacheValue(REGISTRY_KEY);
  if (!Array.isArray(tokens)) return false;
  const now = Math.floor(Date.now() / 1000);
  return tokens.some((t) => t && t.jti === jti && typeof t.exp === "number" && t.exp > now);
}

// Mint a session token for a verified Supabase user payload.
export async function issueSessionToken(env, supabasePayload = {}) {
  const secret = await getSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_TTL_SECONDS;
  const jti = randomId();

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: supabasePayload.sub ?? null,
    email: supabasePayload.email ?? null,
    jti,
    iat: now,
    exp,
  };
  const signingInput = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(
    JSON.stringify(payload),
  )}`;
  const signature = await sign(signingInput, secret);

  await registerToken(jti, exp);

  return { token: `${signingInput}.${signature}`, exp, expiresIn: SESSION_TTL_SECONDS };
}

// Validate a session token: signature + not expired + still registered.
export async function verifySessionToken(env, token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "missing_token" };
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed_token" };
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let secret;
  try {
    secret = await getSecret(env);
  } catch (e) {
    return { valid: false, reason: "no_secret" };
  }

  const expected = await sign(`${headerB64}.${payloadB64}`, secret);
  if (expected !== signatureB64) {
    return { valid: false, reason: "bad_signature" };
  }

  const payload = decodeJwtPart(payloadB64);
  if (!payload) {
    return { valid: false, reason: "malformed_token" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    return { valid: false, reason: "expired" };
  }
  if (!(await isRegistered(payload.jti))) {
    return { valid: false, reason: "revoked" };
  }

  return { valid: true, payload };
}
