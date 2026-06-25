// Verifies the authenticity of a Supabase access token (the JWT delivered in the
// URL hash after login). The token is signed with the project's asymmetric JWT
// signing key (ES256); we fetch the project's public JWKS and verify the
// signature + standard claims (exp / iss / aud) with WebCrypto.

import { getCacheValue, setCacheValue } from "../cache/index.js";
import { base64UrlToBytes, decodeJwtPart } from "./encoding.js";

const JWKS_CACHE_KEY = "supabase_jwks";

function projectOrigin(supabaseUrl) {
  return new URL(supabaseUrl).origin;
}

async function loadJwks(supabaseUrl) {
  const cached = await getCacheValue(JWKS_CACHE_KEY);
  if (cached && Array.isArray(cached.keys) && cached.keys.length) {
    return cached;
  }
  const res = await fetch(`${projectOrigin(supabaseUrl)}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`Unable to fetch Supabase JWKS (HTTP ${res.status})`);
  }
  const jwks = await res.json();
  await setCacheValue(JWKS_CACHE_KEY, jwks);
  return jwks;
}

async function importKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

// Returns { valid: boolean, payload?, reason? }.
export async function verifySupabaseToken(accessToken, supabaseUrl) {
  if (!accessToken || typeof accessToken !== "string") {
    return { valid: false, reason: "missing_token" };
  }
  if (!supabaseUrl) {
    return { valid: false, reason: "missing_supabase_url" };
  }

  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed_token" };
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);
  if (!header || !payload) {
    return { valid: false, reason: "malformed_token" };
  }
  if (header.alg !== "ES256") {
    return { valid: false, reason: "unexpected_alg" };
  }

  let jwks;
  try {
    jwks = await loadJwks(supabaseUrl);
  } catch (e) {
    return { valid: false, reason: "jwks_unavailable" };
  }
  const jwk = jwks.keys.find((k) => k.kid === header.kid) || jwks.keys[0];
  if (!jwk) {
    return { valid: false, reason: "unknown_kid" };
  }

  let signatureOk;
  try {
    const key = await importKey(jwk);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToBytes(signatureB64);
    signatureOk = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signature,
      data,
    );
  } catch (e) {
    return { valid: false, reason: "verify_error" };
  }
  if (!signatureOk) {
    return { valid: false, reason: "bad_signature" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    return { valid: false, reason: "expired" };
  }
  const expectedIss = `${projectOrigin(supabaseUrl)}/auth/v1`;
  if (payload.iss && payload.iss !== expectedIss) {
    return { valid: false, reason: "bad_issuer" };
  }
  if (payload.aud && payload.aud !== "authenticated") {
    return { valid: false, reason: "bad_audience" };
  }

  return { valid: true, payload };
}
