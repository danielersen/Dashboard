import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The Supabase project URL and anon (public) key are served by the Worker from
// environment variables: GET /api/config -> { supabaseUrl, supabaseAnonKey }.
let configPromise;

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
      return {
        baseUrl,
        supabaseAnonKey,
        client: createClient(baseUrl, supabaseAnonKey),
      };
    })();
  }
  return configPromise;
}

async function getClient() {
  return (await getConfig()).client;
}

// Starts the OAuth flow for the given provider. The Supabase `/auth/v1/authorize`
// endpoint requires the anon key, but a browser navigation cannot send the
// `apikey` header, so we build the URL ourselves and pass the key as a query
// param before redirecting. Supabase then redirects to the provider and back to
// the Site URL configured in the dashboard (Authentication -> URL Configuration).
export async function signInWithProvider(provider) {
  const { client, supabaseAnonKey } = await getConfig();
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

export async function signInWithEmail(email, password) {
  const supabase = await getClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  const supabase = await getClient();
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  const supabase = await getClient();
  return supabase.auth.signOut();
}
