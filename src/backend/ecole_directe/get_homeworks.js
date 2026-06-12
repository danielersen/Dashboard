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
    const first = await readResponse(await postED(url, token, cookieHeader, primaryBody));

    const code1 = first.json?.code ?? null;

    if (code1 === 520 || code1 === 525 || code1 === 403) {
      const second = await readResponse(await postED(url, token, cookieHeader, fallbackBody));
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

  const source = informations?.resp ?? informations ?? {};
  const login = source?.originalLogin ?? source;

  const token = source?.token ?? login?.token;
  const eleveId = source?.eleveId ?? login?.data?.accounts?.[0]?.id;

  const cookieHeader = normalizeCookieHeader(source?.cookieHeader || source?.cookies);

  if (!token || !eleveId) {
    return {
      ok: false,
      error: "token ou eleveId manquant",
      received: informations,
    };
  }

  const url = `https://api.ecoledirecte.com/v3/eleves/${eleveId}/cahierdetexte.awp`;

  const primaryBody = 'data={"anneeScolaire":""}';

  const fallbackBody = `data=${JSON.stringify({
    anneeScolaire: "",
    token,
  })}`;

  const result = await tryEndpoint(url, token, cookieHeader, primaryBody, fallbackBody);

  const json = result.chosen.json;

  return {
    ok: json?.code === 200,
    eleveId,
    token,
    session: {
      code: json?.code,
    },
    homeworks: {
      status: result.chosen.status,
      raw: result.chosen.raw,
      json,
    },
    originalLogin: login,
  };
}
