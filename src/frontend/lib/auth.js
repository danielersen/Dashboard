// Client-side auth guard.
//
// The Supabase access token arrives in the URL hash (#access_token=...) after
// login. The hash is never sent to the server, so gating happens here: we read
// the token, ask the API to verify it and issue a short-lived server session
// token. If it is invalid or missing we remember where the user was heading in a
// cookie and send them to the login page; once authenticated we redirect back to
// that page and clear the cookie. The server token is then used for every API
// call, and re-requested automatically when it expires. Navigation re-appends
// the params to the URL so the next page is accepted too.
//
// A remembered device ("se souvenir de moi") has its Supabase session persisted
// in localStorage; on a later visit we restore it automatically so the user is
// recognised without retyping anything, like a normal website.

import {
  getRememberPref,
  getRestoredSession,
  persistSession,
  signOut as supabaseSignOut,
} from "/lib/supabase.js";

const AUTH_PAGE = "/pages/auth";
const HOME_PAGE = "/pages/home";
// Supabase drops the user on "/pages/" after login; those are not real pages,
// just landing spots from which we send the user to their destination.
const LANDING_PATHS = ["/pages", "/pages/"];
const REDIRECT_COOKIE = "post_auth_redirect";
const REDIRECT_COOKIE_TTL = 600; // seconds

const STORAGE_KEYS = {
  access: "sb_access_token",
  refresh: "sb_refresh_token",
  expiresAt: "sb_expires_at",
  session: "session_token",
  sessionExp: "session_token_exp",
};

const HASH_KEYS = ["access_token", "refresh_token", "expires_at", "expires_in", "token_type"];

// Writes go to the storage matching the remember preference (localStorage when
// remembered so they survive a browser restart, sessionStorage otherwise).
function store() {
  return getRememberPref() ? window.localStorage : window.sessionStorage;
}

// Reads look in both storages so a token is found whatever the mode was.
function readItem(key) {
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
}

function removeItemEverywhere(key) {
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
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
  return readItem(STORAGE_KEYS.access);
}

function storeSession(session) {
  if (!session?.access_token) return false;
  store().setItem(STORAGE_KEYS.access, session.access_token);
  if (session.refresh_token) store().setItem(STORAGE_KEYS.refresh, session.refresh_token);
  if (session.expires_at) store().setItem(STORAGE_KEYS.expiresAt, String(session.expires_at));
  return true;
}

// Make sure a Supabase access token is available locally. Order: tokens in the
// URL hash (fresh login) -> already in storage -> a remembered Supabase session
// restored automatically. Returns true if a token is now available.
async function ensureLocalSession() {
  if (captureHashTokens()) {
    await persistSession(readItem(STORAGE_KEYS.access), readItem(STORAGE_KEYS.refresh));
    return true;
  }
  if (getAccessToken()) return true;
  return storeSession(await getRestoredSession());
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
  const refresh = readItem(STORAGE_KEYS.refresh);
  const expiresAt = readItem(STORAGE_KEYS.expiresAt);
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
  const token = readItem(STORAGE_KEYS.session);
  const exp = Number(readItem(STORAGE_KEYS.sessionExp) || 0);
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

// --- post-auth redirect cookie ----------------------------------------------

function normalizePath(path) {
  return path.replace(/\/?$/, "/");
}

function setCookie(name, value, maxAgeSeconds) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function isAuthPage() {
  return normalizePath(window.location.pathname) === normalizePath(AUTH_PAGE);
}

function isLandingPath() {
  return LANDING_PATHS.includes(window.location.pathname);
}

// Remember the page the user was trying to reach, then send them to login.
function redirectToAuth() {
  if (isAuthPage()) return;
  const target = window.location.pathname + window.location.search;
  if (target && !normalizePath(target).startsWith(normalizePath(AUTH_PAGE))) {
    setCookie(REDIRECT_COOKIE, target, REDIRECT_COOKIE_TTL);
  }
  window.location.replace(AUTH_PAGE);
}

// After a successful guard, send the user back to the page they originally
// wanted (set before login) and clear the cookie. Returns true if it triggered
// a navigation, so the caller can keep the current page hidden meanwhile.
function consumePostAuthRedirect() {
  const target = getCookie(REDIRECT_COOKIE);
  if (!target) return false;
  deleteCookie(REDIRECT_COOKIE);
  if (!target.startsWith("/pages/")) return false;
  if (normalizePath(target).startsWith(normalizePath(AUTH_PAGE))) return false;
  if (normalizePath(target) === normalizePath(window.location.pathname + window.location.search)) {
    return false;
  }
  navigateWithAuth(target);
  return true;
}

// On the login page: if this device is already recognised (remembered session),
// skip the form and go straight in. Returns true if it triggered a navigation.
export async function redirectIfAuthenticated() {
  const session = await getRestoredSession();
  if (!storeSession(session)) return false;
  // Go through the landing path so any saved post-auth redirect is honoured.
  navigateWithAuth("/pages/");
  return true;
}

// Sign out: clear the Supabase session (forgetting this device if it was
// remembered), drop every local token and the redirect cookie, then return to
// the login page.
export async function logout() {
  try {
    await supabaseSignOut();
  } catch (e) {
    /* ignore, still clear locally */
  }
  for (const key of Object.values(STORAGE_KEYS)) removeItemEverywhere(key);
  deleteCookie(REDIRECT_COOKIE);
  window.location.replace(AUTH_PAGE);
}

// --- page guard --------------------------------------------------------------

// Run before showing protected content. Resolves to true if authenticated;
// otherwise redirects to the login page and resolves to false.
export async function guardPage() {
  if (!(await ensureLocalSession())) {
    redirectToAuth();
    return false;
  }
  const token = await ensureSessionToken();
  if (!token) {
    redirectToAuth();
    return false;
  }
  // Authenticated: if the user was sent here from login, bounce them back to the
  // page they originally wanted. Keep the page hidden while navigating.
  if (consumePostAuthRedirect()) {
    return false;
  }
  // No saved destination but we landed on "/pages/" (or came straight to the
  // login page): send the user to home.
  if (isLandingPath()) {
    navigateWithAuth(HOME_PAGE);
    return false;
  }
  return true;
}

// Authenticated fetch: attaches the session token and transparently re-acquires
// it once if the server reports it invalid.
export async function authedFetch(input, init = {}) {
  let token = await ensureSessionToken();
  if (!token) {
    redirectToAuth();
    throw new Error("Not authenticated");
  }
  const withAuth = (t) => ({
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` },
  });

  let res = await fetch(input, withAuth(token));
  if (res.status === 401) {
    removeItemEverywhere(STORAGE_KEYS.session);
    removeItemEverywhere(STORAGE_KEYS.sessionExp);
    token = await requestSessionToken();
    if (!token) {
      redirectToAuth();
      throw new Error("Not authenticated");
    }
    res = await fetch(input, withAuth(token));
  }
  return res;
}
