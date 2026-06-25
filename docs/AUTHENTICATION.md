# The securities

## On the domain (if you have one)
 - The project must have a domain rule for more security : at all http requests, set a token in headers not visible ny the client in devTools or others. Thanks to that the API can regongnize allowed requests.

## By using account
 - The website must have a real account security. So you can log in with Github.

### Supabase Auth (login page)
 - The login page lives at `/pages/auth` (`src/frontend/pages/auth/`). It shows one button per OAuth provider and starts the flow with Supabase `signInWithOAuth`.
 - Configure your project in `src/frontend/lib/supabase-config.js`:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Supabase Dashboard -> Project Settings -> API (the anon key is public and safe to expose).
   - `AUTH_PROVIDERS` lists the providers to display (e.g. `["github", "google"]`). Each one must also be enabled in Supabase -> Authentication -> Providers.
 - After a successful login Supabase redirects to the Site URL configured in Supabase -> Authentication -> URL Configuration (set to `/pages/`), so no redirect/callback handling is done in the frontend.
 - Token verification / route gating is intentionally not implemented yet.

## By Cloudflare
 - To protect the API from bots, with "Bot Fight Mode".
 - To protect the API from malicious people or hackers, with "Web Application Firewall".