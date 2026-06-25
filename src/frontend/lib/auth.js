// Client-side auth guard.
//
// The Supabase access token arrives in the URL hash (#access_token=...) after
// login. The hash is never sent to the server, so gating happens here: we read
// the token, ask the API to verify it and issue a short-lived server session
// token, and redirect to the error page if it is invalid or missing. The server
// token is then used for every API call, and re-requested automatically when it
// expires. Navigation re-appends the params to the URL so the next page is
// accepted too.

const ERROR_PAGE = "/pages/error-token/";

const STORAGE_KEYS = {
  access: "sb_access_token",
  refresh: "sb_refresh_token",
  expiresAt: "sb_expires_at",
  session: "session_token",
  sessionExp: "session_token_exp",
};

const HASH_KEYS = ["access_token", "refresh_token", "expires_at", "expires_in", "token_type"];

function store() {
  return window.sessionStorage;
}

// --- token transport (URL hash) ---------------------------------------------

function parseHashTokens() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const out = {};
  for (const key of HASH_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
}

function captureHashTokens() {
  const tokens = parseHashTokens();
  if (!tokens.access_token) return false;
  store().setItem(STORAGE_KEYS.access, tokens.access_token);
  if (tokens.refresh_token) store().setItem(STORAGE_KEYS.refresh, tokens.refresh_token);
  if (tokens.expires_at) store().setItem(STORAGE_KEYS.expiresAt, tokens.expires_at);
  // Remove the tokens from the visible URL.
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

function getAccessToken() {
  return store().getItem(STORAGE_KEYS.access);
}

// Re-append the auth params to a same-origin URL so the next page re-runs the
// guard and gets its own server token.
export function appendAuthParams(href) {
  const accessToken = getAccessToken();
  if (!accessToken) return href;
  let target;
  try {
    target = new URL(href, window.location.origin);
  } catch (e) {
    return href;
  }
  if (target.origin !== window.location.origin) return href;
  const params = new URLSearchParams();
  params.set("access_token", accessToken);
  const refresh = store().getItem(STORAGE_KEYS.refresh);
  const expiresAt = store().getItem(STORAGE_KEYS.expiresAt);
  if (refresh) params.set("refresh_token", refresh);
  if (expiresAt) params.set("expires_at", expiresAt);
  target.hash = params.toString();
  return target.toString();
}

export function navigateWithAuth(href) {
  window.location.href = appendAuthParams(href);
}

// --- server session token ----------------------------------------------------

function getValidSessionToken() {
  const token = store().getItem(STORAGE_KEYS.session);
  const exp = Number(store().getItem(STORAGE_KEYS.sessionExp) || 0);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (exp && exp <= now + 5) return null; // expired (with small skew)
  return token;
}

async function requestSessionToken() {
  const accessToken = getAccessToken();
  if (!accessToken) return null;
  let res;
  try {
    res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch (e) {
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (!data || !data.valid || !data.token) return null;
  store().setItem(STORAGE_KEYS.session, data.token);
  store().setItem(STORAGE_KEYS.sessionExp, String(data.exp || 0));
  return data.token;
}

// Returns a usable session token, refreshing it if needed; null if impossible.
export async function ensureSessionToken() {
  return getValidSessionToken() || (await requestSessionToken());
}

function redirectToError() {
  if (window.location.pathname.replace(/\/?$/, "/") === ERROR_PAGE) return;
  window.location.replace(ERROR_PAGE);
}

// --- page guard --------------------------------------------------------------

// Run before showing protected content. Resolves to true if authenticated;
// otherwise redirects to the error page and resolves to false.
export async function guardPage() {
  captureHashTokens();
  if (!getAccessToken()) {
    redirectToError();
    return false;
  }
  const token = await ensureSessionToken();
  if (!token) {
    redirectToError();
    return false;
  }
  return true;
}

// Authenticated fetch: attaches the session token and transparently re-acquires
// it once if the server reports it invalid.
export async function authedFetch(input, init = {}) {
  let token = await ensureSessionToken();
  if (!token) {
    redirectToError();
    throw new Error("Not authenticated");
  }
  const withAuth = (t) => ({
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` },
  });

  let res = await fetch(input, withAuth(token));
  if (res.status === 401) {
    store().removeItem(STORAGE_KEYS.session);
    store().removeItem(STORAGE_KEYS.sessionExp);
    token = await requestSessionToken();
    if (!token) {
      redirectToError();
      throw new Error("Not authenticated");
    }
    res = await fetch(input, withAuth(token));
  }
  return res;
}
