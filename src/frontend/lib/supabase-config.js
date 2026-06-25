// Supabase public configuration.
//
// The anon (public) key is designed to be exposed in frontend code, so it is
// safe to keep here. Replace the placeholders below with the values from your
// Supabase project: Dashboard -> Project Settings -> API.
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";

// OAuth providers shown on the /pages/auth login page, in display order.
// Each provider must also be enabled in Supabase:
// Dashboard -> Authentication -> Providers.
export const AUTH_PROVIDERS = ["github", "google"];
