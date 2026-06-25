import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The Supabase project URL and anon (public) key are served by the Worker from
// environment variables: GET /api/config -> { supabaseUrl, supabaseAnonKey }.
let clientPromise;

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const res = await fetch("/api/config");
      if (!res.ok) {
        throw new Error("Impossible de charger la configuration Supabase.");
      }
      const { supabaseUrl, supabaseAnonKey } = await res.json();
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuration Supabase manquante (SUPABASE_URL / SUPABASE_ANON_KEY).");
      }
      return createClient(supabaseUrl, supabaseAnonKey);
    })();
  }
  return clientPromise;
}

// Starts the OAuth flow for the given provider. Supabase redirects to the
// provider, then back to the Site URL configured in the Supabase dashboard
// (Authentication -> URL Configuration), so no redirect handling is needed here.
export async function signInWithProvider(provider) {
  const supabase = await getClient();
  return supabase.auth.signInWithOAuth({ provider });
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
