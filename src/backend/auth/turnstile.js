// Verifies a Cloudflare Turnstile token server-side against the siteverify API.
// The secret key is never exposed to the client; only the public site key is.

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(env, token, remoteip) {
  const secret = env.TURNSTILE_SECRET_KEY;
  // If no secret is configured, treat Turnstile as disabled so login keeps
  // working (fail-open on missing config, fail-closed on a real failed check).
  if (!secret) {
    return { success: true, disabled: true };
  }
  if (!token) {
    return { success: false, reason: "missing_token" };
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteip) form.append("remoteip", remoteip);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    const data = await res.json();
    return {
      success: data.success === true,
      reason: data.success === true ? undefined : "verification_failed",
      errors: data["error-codes"],
    };
  } catch (e) {
    return { success: false, reason: "siteverify_unreachable" };
  }
}
