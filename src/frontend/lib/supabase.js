import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The Supabase project URL and anon (public) key are served by the Worker from
// environment variables: GET /api/config -> { supabaseUrl, supabaseAnonKey }.
let configPromise;

async function getConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const res = await fetch("/api/config");
      if (!res.ok) {
        throw new Error("Impossible de charger la configuration Supabase.");
      }
      const { supabaseUrl, supabaseAnonKey } = await res.json();
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuration Supabase manquante (SUPABASE_URL / SUPABASE_ANON_KEY).");
      }
      return {
        supabaseUrl,
        supabaseAnonKey,
        client: createClient(supabaseUrl, supabaseAnonKey),
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
