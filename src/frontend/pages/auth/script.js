import {
  checkConfig,
  signInWithProvider,
  signInWithEmail,
} from "/lib/supabase.js";
import { redirectIfAuthenticated } from "/lib/auth.js";
import { getTurnstileToken, preloadTurnstile } from "/lib/turnstile.js";

// OAuth providers enabled in Supabase (Authentication -> Providers).
const OAUTH_PROVIDERS = ["github", "google"];

const PROVIDER_META = {
  github: {
    label: "Continuer avec GitHub",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"></path></svg>`,
  },
  google: {
    label: "Continuer avec Google",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.35 11.1H12v3.83h5.35a4.58 4.58 0 0 1-1.98 3v2.5h3.2c1.87-1.73 2.94-4.28 2.94-7.32 0-.68-.06-1.34-.16-1.97z" fill="#4285F4"></path><path d="M12 22c2.67 0 4.9-.89 6.53-2.4l-3.2-2.5c-.89.6-2.03.95-3.33.95-2.56 0-4.73-1.73-5.5-4.06H3.18v2.55A9.99 9.99 0 0 0 12 22z" fill="#34A853"></path><path d="M6.5 13.99a6 6 0 0 1 0-3.84V7.6H3.18a10 10 0 0 0 0 8.94l3.32-2.55z" fill="#FBBC05"></path><path d="M12 6.08c1.45 0 2.75.5 3.77 1.48l2.83-2.83A9.99 9.99 0 0 0 3.18 7.6L6.5 10.15C7.27 7.82 9.44 6.08 12 6.08z" fill="#EA4335"></path></svg>`,
  },
};

function metaFor(provider) {
  return (
    PROVIDER_META[provider] || {
      label: `Continuer avec ${provider.charAt(0).toUpperCase()}${provider.slice(1)}`,
      icon: "",
    }
  );
}

const providersEl = document.getElementById("providers");
const messageEl = document.getElementById("authMessage");
const emailForm = document.getElementById("emailForm");

// Remove every whitespace character (including non-breaking and zero-width ones
// often added by autofill / mobile keyboards) before validating. Supabase
// rejects any email containing whitespace with "Unable to validate email
// address: invalid format", and a plain .trim() does not strip these.
function sanitizeEmail(value) {
  return value.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showMessage(text, kind = "error") {
  messageEl.textContent = text;
  messageEl.dataset.kind = kind;
  messageEl.hidden = false;
}

function clearMessage() {
  messageEl.hidden = true;
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
}

function rememberChecked() {
  return document.getElementById("rememberDevice")?.checked === true;
}

// Run the invisible Turnstile challenge and have the Worker verify the token.
// Returns true when human-verification passes (or Turnstile is disabled), false
// when the challenge is required but fails.
async function passTurnstile() {
  const token = await getTurnstileToken();
  if (!token) return true; // Turnstile not configured / unavailable: don't block.
  try {
    const res = await fetch("/api/auth/turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return data?.success === true;
  } catch (e) {
    return false;
  }
}

// Show/hide the password like classic login forms.
function setupPasswordToggle() {
  const toggle = document.querySelector("[data-password-toggle]");
  const input = emailForm.querySelector('input[name="password"]');
  if (!toggle || !input) return;
  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      show ? "Masquer le mot de passe" : "Afficher le mot de passe",
    );
    input.focus();
  });
}

async function startOAuth(provider, button) {
  clearMessage();
  setBusy(button, true);
  try {
    if (!(await passTurnstile())) {
      throw new Error("Human verification failed, please try again.");
    }
    const { error } = await signInWithProvider(provider, rememberChecked());
    if (error) {
      throw error;
    }
  } catch (err) {
    showMessage(err?.message || "Login failed, try again.");
    setBusy(button, false);
  }
}

function renderProviders() {
  for (const provider of OAUTH_PROVIDERS) {
    const meta = metaFor(provider);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth-provider";
    button.dataset.provider = provider;
    button.innerHTML = `<span class="auth-provider-icon">${meta.icon}</span><span class="auth-provider-label">${meta.label}</span>`;
    button.addEventListener("click", () => startOAuth(provider, button));
    providersEl.appendChild(button);
  }
}

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const button = emailForm.querySelector('[data-action="signin"]');
  const data = new FormData(emailForm);
  const email = sanitizeEmail(String(data.get("email") || ""));
  const password = String(data.get("password") || "");
  const remember = data.get("remember") != null;

  if (!email || !password) {
    showMessage("Put your email and password");
    return;
  }

  if (!isValidEmail(email)) {
    showMessage("Enter a valid email address (e.g. name@example.com).");
    return;
  }

  const emailInput = emailForm.querySelector('input[name="email"]');
  if (emailInput) emailInput.value = email;

  setBusy(button, true);
  try {
    if (!(await passTurnstile())) {
      throw new Error("Human verification failed, please try again.");
    }
    const { error } = await signInWithEmail(email, password, remember);
    if (error) {
      throw error;
    }
    window.location.href = "/pages/";
    return;
  } catch (err) {
    showMessage(err?.message || "La connexion a échoué. Réessayez.");
  } finally {
    setBusy(button, false);
  }
});

function setFormDisabled(disabled) {
  for (const el of emailForm.querySelectorAll("input, button")) {
    el.disabled = disabled;
  }
  for (const el of providersEl.querySelectorAll("button")) {
    el.disabled = disabled;
  }
}

// Verify the required env variables exist before allowing any login attempt.
// If they are missing, disable the form and tell the user exactly what's wrong.
async function init() {
  // Already recognised on this device? Skip the form and go straight in.
  if (await redirectIfAuthenticated()) return;
  document.documentElement.removeAttribute("data-auth-pending");

  renderProviders();
  setupPasswordToggle();
  preloadTurnstile();
  const { ok, missing } = await checkConfig();
  if (!ok) {
    setFormDisabled(true);
    const list = missing.length ? ` : ${missing.join(", ")}` : "";
    showMessage(
      `Configuration Supabase manquante${list}. Définissez ces variables d'environnement sur le Worker avant de vous connecter.`,
    );
  }
}

init();
