export async function EDhomeworks (env, informations) {
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
    const first = await readResponse(await postED(url, token, cookieHeader, primaryBody));
    const code1 = first.json?.code ?? null;

    if (code1 === 520 || code1 === 525 || first.status < 200 || first.status >= 300) {
      const second = await readResponse(await postED(url, token, cookieHeader, fallbackBody));
      const code2 = second.json?.code ?? null;
      return {
        chosen: second,
        alternate: first,
        code: code2,
      };
    }

    return {
      chosen: first,
      alternate: null,
      code: code1,
    };
  }

  function formatYMD(date) {
    return date.toISOString().slice(0, 10);
  }

  function getSchoolYearBounds(now = new Date()) {
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      dateDebut: formatYMD(new Date(Date.UTC(year, 8, 1))),
      dateFin: formatYMD(new Date(Date.UTC(year + 1, 6, 31))),
    };
  }

  const source = informations?.resp ?? informations?.json ?? informations ?? {};
  const login = source?.originalLogin ?? source;
  const account = login?.data?.accounts?.[0] ?? source?.data?.accounts?.[0] ?? null;
  const token = source?.token ?? login?.token ?? account?.token ?? null;
  const eleveId = source?.eleveId ?? account?.id ?? null;
  const cookieHeader = normalizeCookieHeader(source?.cookies ?? informations?.cookies);
  const gtk = extractGtk(source?.cookies ?? informations?.cookies);

  if (!token || !eleveId) {
    return {
      ok: false,
      error: "Informations incomplètes: token ou eleveId manquant.",
      received: informations ?? null,
    };
  }

  const schoolBounds = getSchoolYearBounds();

  const homeworkPrimary = `data=${JSON.stringify({
    token,
    ...schoolBounds,
  })}`;

  const homeworkFallback = `data=${JSON.stringify({
    ...schoolBounds,
  })}`;

  const homeworkUrls = [
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/cahierdetexte.awp?verbe=get`,
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/cahierdetexte/homeworks.awp?verbe=get`,
  ];

  let homeworkAttempt = null;
  let homeworkUrlUsed = null;

  for (const url of homeworkUrls) {
    const attempt = await tryEndpoint(
      url,
      token,
      cookieHeader,
      homeworkPrimary,
      homeworkFallback
    );

    homeworkAttempt = attempt;
    homeworkUrlUsed = url;

    const homeworkStatus = attempt.chosen.status;
    const homeworkCode = attempt.code;
    const validHomework =
      homeworkStatus >= 200 &&
      homeworkStatus < 300 &&
      homeworkCode !== 520 &&
      homeworkCode !== 525;

    if (validHomework) break;
  }

  const homeworks = homeworkAttempt.chosen;
  const homeworksCode = homeworks.json?.code ?? null;
  const invalid = homeworksCode === 520;
  const expired = homeworksCode === 525;

  return {
    ok:
      !invalid &&
      !expired &&
      homeworks.status >= 200 &&
      homeworks.status < 300,
    eleveId,
    token,
    gtk,
    cookieHeader,
    session: {
      invalid,
      expired,
      homeworksCode,
    },
    homeworks: {
      status: homeworks.status,
      raw: homeworks.raw,
      json: homeworks.json,
    },
    debug: {
      homeworksAlternate: homeworkAttempt.alternate,
      homeworksEndpoint: homeworkUrlUsed,
      schoolBounds,
    },
    originalLogin: login ?? null,
  };
}
