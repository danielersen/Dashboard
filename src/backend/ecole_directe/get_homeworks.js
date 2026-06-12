export async function EDhomeworks(env, informations) {
  const ED_USER_AGENT = env.USER_AGENT;
  const ED_VERSION = "4.75.0";

  function normalizeCookieHeader(rawCookies) {
    if (!rawCookies) return "";
    const text = Array.isArray(rawCookies)
      ? rawCookies.join("; ")
      : String(rawCookies);

    const parts = text
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const attrs = new Set([
      "secure",
      "httponly",
      "samesite",
      "path",
      "domain",
      "expires",
      "max-age",
    ]);

    const cookies = [];
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;

      const key = part.slice(0, eq).trim().toLowerCase();
      if (attrs.has(key)) continue;

      cookies.push(part);
    }

    return cookies.join("; ");
  }

  function extractGtk(rawCookies) {
    const cookieHeader = normalizeCookieHeader(rawCookies);
    const match = cookieHeader.match(/(?:^|;\s*)GTK=([^;]+)/i);
    return match ? match[1] : null;
  }

  function safeParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function readResponse(response) {
    const raw = await response.text();
    return {
      status: response.status,
      raw,
      json: safeParse(raw),
    };
  }

  async function postED(url, token, cookieHeader, body) {
    return fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": ED_USER_AGENT,
        "X-Token": token,
        "X-Version": ED_VERSION,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body,
    });
  }

  async function tryEndpoint(url, token, cookieHeader, primaryBody, fallbackBody) {
    const first = await readResponse(
      await postED(url, token, cookieHeader, primaryBody)
    );

    const code1 = first.json?.code ?? null;

    // fallback si API EcoleDirecte casse (très fréquent)
    if (code1 === 520 || code1 === 225) {
      const second = await readResponse(
        await postED(url, token, cookieHeader, fallbackBody)
      );

      return {
        chosen: second,
        alternate: first,
        code: second.json?.code ?? null,
      };
    }

    return {
      chosen: first,
      alternate: null,
      code: code1,
    };
  }

  // =========================
  // 🔐 Extraction source login
  // =========================
  const source = informations?.resp ?? informations?.json ?? informations ?? {};
  const login = source?.originalLogin ?? source;

  const token = source?.token ?? login?.token ?? null;
  const eleveId =
    source?.eleveId ??
    login?.data?.accounts?.[0]?.id ??
    null;

  const cookieHeader = normalizeCookieHeader(
    source?.cookies ?? informations?.cookies
  );

  const gtk = extractGtk(source?.cookies ?? informations?.cookies);

  if (!token || !eleveId) {
    return {
      ok: false,
      error: "Token ou eleveId manquant",
      received: informations ?? null,
    };
  }

  // =========================
  // 📚 ENDPOINT HOMEWORKS
  // =========================
  const homeworkUrl =
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/cahierdetexte.awp?verbe=get`;

  const primaryBody = 'data={}';

  const fallbackBody = `data=${JSON.stringify({
    token,
  })}`;

  const homeworksAttempt = await tryEndpoint(
    homeworkUrl,
    token,
    cookieHeader,
    primaryBody,
    fallbackBody
  );

  const homeworks = homeworksAttempt.chosen;

  const code = homeworks.json?.code ?? null;

  const invalid = code === 520 || code === 225;

  return {
    ok: !invalid && homeworks.status >= 200 && homeworks.status < 300,

    eleveId,
    token,
    gtk,
    cookieHeader,

    session: {
      invalid,
      code,
    },

    homeworks: {
      status: homeworks.status,
      raw: homeworks.raw,
      json: homeworks.json,
    },

    debug: {
      alternate: homeworksAttempt.alternate,
    },

    originalLogin: login ?? null,
  };
}
