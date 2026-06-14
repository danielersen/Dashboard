export async function EDhomeworks(env, informations, filter) {
  const ED_USER_AGENT = env.USER_AGENT;
  const ED_VERSION = "4.75.0";
  function normalizeCookieHeader(rawCookies) {
    if (!rawCookies) return "Cookies error";
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
    if (code1 === 520 || code1 === 525) {
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
  const urls = [
    `https://api.ecoledirecte.com/v3/Eleves/${eleveId}/cahierdetexte.awp?verbe=get`,
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/cahierdetexte.awp?verbe=get`,
  ];
  const primaryBody = `data=${JSON.stringify({
    anneeScolaire: "",
  })}`;
  const fallbackBody = `data=${JSON.stringify({
    token,
    ...schoolBounds,
  })}`;
  let attempt = null;
  let endpointUsed = null;
  for (const url of urls) {
    const res = await tryEndpoint(url, token, cookieHeader, primaryBody, fallbackBody);
    attempt = res;
    endpointUsed = url;
    const code = res.chosen.json?.code ?? null;
    const valid =
      res.chosen.status >= 200 &&
      res.chosen.status < 300 &&
      code !== 520 &&
      code !== 525 &&
      code !== 403;
    if (valid) break;
  }
  const homeworks = attempt.chosen;
  const homeworksCode = homeworks.json?.code ?? null;
  const invalid = homeworksCode === 520;
  const expired = homeworksCode === 525;
  const forbidden = homeworksCode === 403;
  const homeworkDetails = {};
  if (
    homeworks.status >= 200 &&
    homeworks.status < 300 &&
    homeworks.json?.data
  ) {
    for (const date of Object.keys(homeworks.json.data)) {
      const detailUrl =
        `https://api.ecoledirecte.com/v3/Eleves/${eleveId}/cahierdetexte/${date}.awp?verbe=get`;
      const detailResponse = await readResponse(
        await postED(
          detailUrl,
          token,
          cookieHeader,
          `data=${JSON.stringify({})}`
        )
      );
      const matieres = detailResponse.json?.data?.matieres ?? [];
      for (const matiere of matieres) {
        const idDevoir = matiere?.aFaire?.idDevoir ?? matiere?.id;
        if (idDevoir) {
          const contenuBrut =
            matiere?.aFaire?.contenu ??
            matiere?.aFaire?.contenuDeSeance?.contenu ??
            null;
          homeworkDetails[idDevoir] = contenuBrut
            ? atob(contenuBrut)
            : null;
        }
      }
    }
  }
  function stripHtml(html) {
    if (!html) return null;
    let text = String(html)
      .replace(/<\s*br\s*\/?\s*>/gi, "\u0000")
      .replace(/<\/p\s*>/gi, "\u0000")
      .replace(/<\/div\s*>/gi, "\u0000")
      .replace(/<[^>]*>/g, "");
    text = text
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/g, "'");
    const parts = text
      .split("\u0000")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const prev = result.trimEnd();
      result += /[.!?]$/.test(prev) ? " " : ". ";
      result += parts[i];
    }
    return result.replace(/\s+/g, " ").trim();
  }
  for (const [date, devoirs] of Object.entries(homeworks.json?.data ?? {})) {
    homeworks.json.data[date] = devoirs.map((devoir) => ({
      ...devoir,
      contenu: stripHtml(homeworkDetails[devoir.idDevoir] ?? null),
    }));
  }
  if (filter !== true) {
    return {
      ok:
        !invalid &&
        !expired &&
        !forbidden &&
        homeworks.status >= 200 &&
        homeworks.status < 300,
      eleveId,
      token,
      gtk,
      cookieHeader,
      session: {
        invalid,
        expired,
        forbidden,
        homeworksCode,
      },
      homeworks: {
        status: homeworks.status,
        raw: homeworks.raw,
        json: homeworks.json,
      },
      debug: {
        homeworksAlternate: attempt.alternate,
        homeworksEndpoint: endpointUsed,
        schoolBounds,
      },
      originalLogin: login ?? null,
    };
  };
  // Filter and organize the response
  return homeworks.json.data
}
export async function EDhomeworksDone(env, informations, filter, id) {
  return id
}
