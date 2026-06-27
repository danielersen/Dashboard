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

### Token verification (page guard + server session token)
 - **Transport.** After login Supabase redirects to a page with the access token in the URL hash (`#access_token=...`). The hash is never sent to the server, so gating is driven client-side by `src/frontend/lib/auth.js`.
 - **Guard.** On a protected page (`html[data-auth-pending]` + the inline guard script), `guardPage()` reads the hash token (stores it in `sessionStorage`, strips it from the URL), then asks the API to verify it. If the token is missing or invalid the user is redirected to `/pages/error-token/` (a modern English error page). The body stays `visibility:hidden` until verification succeeds, so protected content never flashes.
 - **Verification (server).** `POST /api/auth/session { access_token }` -> `src/backend/auth/supabase_jwt.js` verifies the Supabase JWT **cryptographically**: it fetches the project's public JWKS (`/auth/v1/.well-known/jwks.json`, cached), checks the **ES256 signature** with WebCrypto, and validates `exp` / `iss` / `aud`.
 - **Server session token.** When the Supabase token is valid, `src/backend/auth/session.js` mints a short-lived **HS256 JWT** (signed with the `MY_SECRET` Secrets Store value), valid **10 minutes**, and returns it. The client stores it and sends it as `Authorization: Bearer <token>` on every API call (`authedFetch`). When it expires/`401`s, the client transparently re-requests one from the stored access token.
 - **Cache registry.** Issued token ids are kept in the cache under `session_tokens` via `src/backend/cache/` helpers: read the list, drop expired ids, add the new id, write it back. `POST /api/auth/check { token }` validates a session token (signature + not expired + still registered). Note: `caches.default` is per-edge-location and ephemeral, so the registry (revocation) is best-effort across colos; the signature + `exp` checks are stateless and always reliable. For production-grade revocation use Workers KV or a Durable Object.
 - **Navigation.** The navbar and home page re-append the auth params to internal links (`appendAuthParams` / `navigateWithAuth`), so each destination page re-runs the guard and obtains its own server token.

## By Cloudflare
 - To protect the API from bots, with "Bot Fight Mode".
 - To protect the API from malicious people or hackers, with "Web Application Firewall".