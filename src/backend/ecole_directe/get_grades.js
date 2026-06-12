export async function EDgrades(env, informations) {
  const ED_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

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

  function readLoginShape(input) {
    const base = input?.json ?? input ?? {};

    const token =
      base?.token ??
      input?.token ??
      null;

    const eleveId =
      base?.data?.accounts?.[0]?.id ??
      input?.eleveId ??
      null;

    const cookies =
      input?.cookies ??
      base?.cookies ??
      [];

    return { token, eleveId, cookies, base };
  }

  async function readJsonSafe(response) {
    const text = await response.text();
    try {
      return { text, json: JSON.parse(text) };
    } catch {
      return { text, json: null };
    }
  }

  async function postED(url, body, cookieHeader) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": ED_USER_AGENT,
        "X-Version": ED_VERSION,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body,
    });
  }

  const { token, eleveId, cookies, base } = readLoginShape(informations);
  const cookieHeader = normalizeCookieHeader(cookies);

  if (!token || !eleveId) {
    return {
      ok: false,
      error: "Informations incomplètes: token ou eleveId manquant.",
      received: informations ?? null,
    };
  }

  const notesUrl = `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`;
  const timelineUrl = `https://api.ecoledirecte.com/v3/eleves/${eleveId}/timeline.awp?verbe=get`;

  const notesBody = `data=${JSON.stringify({
    token,
    anneeScolaire: "",
  })}`;

  const timelineBody = `data=${JSON.stringify({
    token,
  })}`;

  const notesRes = await postED(notesUrl, notesBody, cookieHeader);
  const timelineRes = await postED(timelineUrl, timelineBody, cookieHeader);

  const notesRead = await readJsonSafe(notesRes);
  const timelineRead = await readJsonSafe(timelineRes);

  const notesCode = notesRead.json?.code ?? null;
  const timelineCode = timelineRead.json?.code ?? null;

  const expired = notesCode === 525 || timelineCode === 525;
  const invalid = notesCode === 520 || timelineCode === 520;

  return {
    ok: !expired && !invalid && notesRes.ok && timelineRes.ok,
    eleveId,
    token,
    cookieHeader,
    session: {
      expired,
      invalid,
      notesCode,
      timelineCode,
    },
    notes: {
      status: notesRes.status,
      raw: notesRead.text,
      json: notesRead.json,
    },
    timeline: {
      status: timelineRes.status,
      raw: timelineRead.text,
      json: timelineRead.json,
    },
    originalLogin: base ?? null,
  };
}
