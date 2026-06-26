// Loads Cloudflare Turnstile invisibly ("background" mode) and hands out a
// fresh, single-use token on demand. If no site key is configured, every call
// resolves to null so login keeps working.

import { getTurnstileSiteKey } from "/lib/supabase.js";

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise;
let widgetPromise;
let pending = null; // { resolve, reject } for the in-flight execute()

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function getWidget() {
  if (widgetPromise) return widgetPromise;
  widgetPromise = (async () => {
    const sitekey = await getTurnstileSiteKey();
    if (!sitekey) return null; // Turnstile disabled.
    const turnstile = await loadScript();
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);
    const id = turnstile.render(container, {
      sitekey,
      size: "invisible",
      callback: (token) => {
        pending?.resolve(token);
        pending = null;
      },
      "error-callback": () => {
        pending?.resolve(null);
        pending = null;
      },
      "expired-callback": () => {
        pending?.resolve(null);
        pending = null;
      },
    });
    return { turnstile, id };
  })();
  return widgetPromise;
}

// Returns a fresh Turnstile token, or null when Turnstile is not configured /
// unavailable. Safe to call before every login attempt.
export async function getTurnstileToken() {
  try {
    const widget = await getWidget();
    if (!widget) return null;
    widget.turnstile.reset(widget.id);
    return await new Promise((resolve) => {
      pending = { resolve };
      widget.turnstile.execute(widget.id);
    });
  } catch (e) {
    return null;
  }
}

// Kick off script + widget load early so the first login isn't slowed down.
export function preloadTurnstile() {
  getWidget().catch(() => {});
}
