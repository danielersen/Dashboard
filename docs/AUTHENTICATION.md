# The securities

## On the domain (if you have one)
 - The project must have a domain rule for more security : at all http requests, set a token in headers not visible ny the client in devTools or others. Thanks to that the API can regongnize allowed requests.

## By using account
 - The website must have a real account security. So you can log in with Github.

### Supabase Auth (login page)
 - The login page lives at `/pages/auth` (`src/frontend/pages/auth/`). It offers email/password (sign in + sign up) and OAuth buttons (GitHub, Google).
 - Config is read at runtime from the Worker: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables (the anon key is public, safe to expose). The Worker exposes them to the frontend via `GET /api/config` -> `{ supabaseUrl, supabaseAnonKey }`.
 - `SUPABASE_URL` must be the **base project URL** (Supabase -> Project Settings -> API -> Project URL), e.g. `https://<ref>.supabase.co`. Do NOT use the Data API URL (`.../rest/v1`); supabase-js appends `/auth/v1` itself, so a `/rest/v1` suffix sends auth calls to PostgREST and yields `PGRST125 "Invalid path specified in request URL"`. As a safeguard, the client strips any path and uses the URL origin.
 - The login page calls `checkConfig()` on load and, if `SUPABASE_URL`/`SUPABASE_ANON_KEY` are missing, disables the form and shows which variables are absent instead of attempting a login.
 - The OAuth providers shown are listed in `OAUTH_PROVIDERS` in `src/frontend/pages/auth/script.js`. Each provider must also be enabled in Supabase -> Authentication -> Providers.
 - After OAuth login Supabase redirects to the Site URL configured in Supabase -> Authentication -> URL Configuration (set to `/pages/`). After email/password login the page redirects to `/pages/` itself.
 - "Se souvenir de cet appareil" checkbox controls session persistence for email/password login: checked stores the session in `localStorage` (survives browser restarts); unchecked uses `sessionStorage` (cleared when the tab/browser closes, so the device is not remembered).
 - Token verification / route gating is intentionally not implemented yet.

## By Cloudflare
 - To protect the API from bots, with "Bot Fight Mode".
 - To protect the API from malicious people or hackers, with "Web Application Firewall".