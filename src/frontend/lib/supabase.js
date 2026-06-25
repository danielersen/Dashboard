import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Starts the OAuth flow for the given provider. Supabase redirects to the
// provider, then back to the Site URL configured in the Supabase dashboard
// (Authentication -> URL Configuration), so no redirect handling is needed here.
export function signInWithProvider(provider) {
  return supabase.auth.signInWithOAuth({ provider });
}

export function signOut() {
  return supabase.auth.signOut();
}
