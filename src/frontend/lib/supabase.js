import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The Supabase project URL and anon (public) key are served by the Worker from
// environment variables: GET /api/config -> { supabaseUrl, supabaseAnonKey }.
let configPromise;

// Whether this device should be remembered. When true the Supabase session is
// kept in localStorage (survives browser restarts, like a normal "stay signed
// in"); when false it lives in sessionStorage (cleared when the tab closes).
const REMEMBER_KEY = "auth_remember";

let clientCache = { remember: null, client: null };

async function loadConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) {
    throw new Error("Impossible de charger la configuration Supabase (/api/config).");
  }
  const { supabaseUrl, supabaseAnonKey } = await res.json();
  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
  return { supabaseUrl, supabaseAnonKey, missing };
}

// Checks that the required env variables exist, without throwing, so the UI can
// show a clear message before attempting any login. Returns { ok, missing }.
export async function checkConfig() {
  try {
    const { missing } = await loadConfig();
    return { ok: missing.length === 0, missing };
  } catch (err) {
    return { ok: false, missing: ["SUPABASE_URL", "SUPABASE_ANON_KEY"], error: err?.message };
  }
}

async function getConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const { supabaseUrl, supabaseAnonKey, missing } = await loadConfig();
      if (missing.length) {
        throw new Error(`Configuration Supabase manquante : ${missing.join(", ")}.`);
      }
      // supabase-js expects the base project URL (https://<ref>.supabase.co).
      // Strip any path (e.g. the Data API "/rest/v1" URL) so /auth/v1 routes work.
      const baseUrl = new URL(supabaseUrl).origin;
      return { baseUrl, supabaseAnonKey };
    })();
  }
  return configPromise;
}

export function getRememberPref() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  } catch (e) {
    return false;
  }
}

export function setRememberPref(remember) {
  try {
    if (remember) window.localStorage.setItem(REMEMBER_KEY, "1");
    else window.localStorage.removeItem(REMEMBER_KEY);
  } catch (e) {
    /* storage unavailable */
  }
}

// A single Supabase client whose storage backend matches the remember
// preference. autoRefreshToken keeps the session alive for the standard
// duration (refresh token), so a remembered device stays signed in like any
// normal website. The login hash is handled by lib/auth.js, not here.
async function getAuthClient() {
  const remember = getRememberPref();
  if (clientCache.client && clientCache.remember === remember) {
    return clientCache.client;
  }
  const { baseUrl, supabaseAnonKey } = await getConfig();
  const client = createClient(baseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: remember ? window.localStorage : window.sessionStorage,
    },
  });
  clientCache = { remember, client };
  return client;
}

// Returns the persisted session (refreshing it if needed) or null. This is how
// a remembered device is recognised automatically on a later visit.
export async function getRestoredSession() {
  try {
    const client = await getAuthClient();
    const { data } = await client.auth.getSession();
    return data?.session || null;
  } catch (e) {
    return null;
  }
}

// Persist tokens received in the URL hash (OAuth / email redirect) into the
// Supabase client storage so the device is recognised on later visits.
export async function persistSession(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) return null;
  try {
    const client = await getAuthClient();
    const { data } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return data?.session || null;
  } catch (e) {
    return null;
  }
}

// Starts the OAuth flow for the given provider. The Supabase `/auth/v1/authorize`
// endpoint requires the anon key, but a browser navigation cannot send the
// `apikey` header, so we build the URL ourselves and pass the key as a query
// param before redirecting. Supabase then redirects to the provider and back to
// the Site URL configured in the dashboard (Authentication -> URL Configuration).
export async function signInWithProvider(provider, remember = false) {
  setRememberPref(remember);
  const client = await getAuthClient();
  const { supabaseAnonKey } = await getConfig();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { skipBrowserRedirect: true },
  });
  if (error) {
    return { error };
  }
  const target = new URL(data.url);
  if (!target.searchParams.has("apikey")) {
    target.searchParams.set("apikey", supabaseAnonKey);
  }
  window.location.assign(target.toString());
  return { error: null };
}

export async function signInWithEmail(email, password, remember = false) {
  setRememberPref(remember);
  const supabase = await getAuthClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password, remember = false) {
  setRememberPref(remember);
  const supabase = await getAuthClient();
  return supabase.auth.signUp({ email, password });
}

// Sign out everywhere: clears the Supabase session and forgets this device
// (drops the remember preference and any persisted session in both storages).
export async function signOut() {
  try {
    const supabase = await getAuthClient();
    await supabase.auth.signOut();
  } catch (e) {
    /* ignore network/storage errors, still clear locally below */
  }
  setRememberPref(false);
  clientCache = { remember: null, client: null };
  try {
    const { baseUrl } = await getConfig();
    const ref = new URL(baseUrl).hostname.split(".")[0];
    const key = `sb-${ref}-auth-token`;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch (e) {
    /* ignore */
  }
}
