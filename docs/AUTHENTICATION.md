# The securities

## On the domain (if you have one)
 - The project must have a domain rule for more security : at all http requests, set a token in headers not visible ny the client in devTools or others. Thanks to that the API can regongnize allowed requests.

## By using account
 - The website must have a real account security. So you can log in with Github.

### Supabase Auth (login page)
 - The login page lives at `/pages/auth` (`src/frontend/pages/auth/`). It offers email/password (sign in + sign up) and OAuth buttons (GitHub, Google).
 - Config is read at runtime from the Worker: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables (the anon key is public, safe to expose). The Worker exposes them to the frontend via `GET /api/config` -> `{ supabaseUrl, supabaseAnonKey }`.
 - The OAuth providers shown are listed in `OAUTH_PROVIDERS` in `src/frontend/pages/auth/script.js`. Each provider must also be enabled in Supabase -> Authentication -> Providers.
 - After OAuth login Supabase redirects to the Site URL configured in Supabase -> Authentication -> URL Configuration (set to `/pages/`). After email/password login the page redirects to `/pages/` itself.
 - Token verification / route gating is intentionally not implemented yet.

## By Cloudflare
 - To protect the API from bots, with "Bot Fight Mode".
 - To protect the API from malicious people or hackers, with "Web Application Firewall".