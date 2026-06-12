export async function EDtimetable(env, informations, filter) {
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

    if (code1 === 520 || code1 === 525 || code1 === 403) {
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toYMD(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function startOfWeek(date) {
    const copy = new Date(date);
    const day = copy.getDay(); // 0 = dimanche
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  function resolveRange(source) {
    const today = new Date();
    const dateDebut = source?.dateDebut || source?.dateStart || source?.debut;
    const dateFin = source?.dateFin || source?.dateEnd || source?.fin;
    const avecTrous =
      typeof source?.avecTrous === "boolean"
        ? source.avecTrous
        : false;

    if (dateDebut && dateFin) {
      return { dateDebut, dateFin, avecTrous };
    }

    if (source?.date) {
      return {
        dateDebut: source.date,
        dateFin: source.date,
        avecTrous,
      };
    }

    if (source?.week === true || source?.semaine === true) {
      const start = startOfWeek(today);
      return {
        dateDebut: toYMD(start),
        dateFin: toYMD(addDays(start, 6)),
        avecTrous,
      };
    }

    return {
      dateDebut: toYMD(today),
      dateFin: toYMD(today),
      avecTrous,
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

  const range = resolveRange(source);

  const urls = [
    `https://api.ecoledirecte.com/v3/E/${eleveId}/emploidutemps.awp?verbe=get`,
    `https://api.ecoledirecte.com/v3/Eleves/${eleveId}/emploidutemps.awp?verbe=get`,
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/emploidutemps.awp?verbe=get`,
  ];

  const primaryBody = `data=${JSON.stringify({
    dateDebut: range.dateDebut,
    dateFin: range.dateFin,
    avecTrous: range.avecTrous,
  })}`;

  const fallbackBody = `data=${JSON.stringify({
    token,
    dateDebut: range.dateDebut,
    dateFin: range.dateFin,
    avecTrous: range.avecTrous,
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

  const timetable = attempt.chosen;
  const timetableCode = timetable.json?.code ?? null;

  return {
    ok:
      timetable.status >= 200 &&
      timetable.status < 300 &&
      timetableCode !== 520 &&
      timetableCode !== 525 &&
      timetableCode !== 403,
    eleveId,
    token,
    gtk,
    cookieHeader,
    session: {
      invalid: timetableCode === 520,
      expired: timetableCode === 525,
      forbidden: timetableCode === 403,
      timetableCode,
    },
    timetable: {
      status: timetable.status,
      raw: timetable.raw,
      json: timetable.json,
    },
    debug: {
      timetableAlternate: attempt.alternate,
      timetableEndpoint: endpointUsed,
      requestedRange: range,
    },
    originalLogin: login ?? null,
  };
}
