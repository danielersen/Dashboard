export async function EDhomeworks(env, informations) {
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

  async function requestHomeworks(url, token, cookieHeader, method, body) {
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ED_USER_AGENT,
      "X-Token": token,
      "X-Version": ED_VERSION,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    const opts = {
      method,
      headers,
    };

    if (body !== undefined) {
      opts.body = body;
    }

    return fetch(url, opts);
  }

  function parseHomeworks(json) {
    if (!json || typeof json !== "object") {
      return [];
    }

    const data = json.data ?? json;

    if (!data || typeof data !== "object") {
      return [];
    }

    const entries = [];

    for (const [date, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        entries.push({
          date,
          idDevoir: item?.idDevoir ?? item?.id ?? null,
          matiere: item?.matiere ?? "",
          codeMatiere: item?.codeMatiere ?? "",
          aFaire: item?.aFaire ?? null,
          documentsAFaire: item?.documentsAFaire ?? null,
          donneLe: item?.donneLe ?? null,
          effectue: item?.effectue ?? null,
          interrogation: item?.interrogation ?? null,
          rendreEnLigne: item?.rendreEnLigne ?? null,
          raw: item,
        });
      }
    }

    return entries;
  }

  const source = informations?.resp ?? informations?.json ?? informations ?? {};
  const login = source?.originalLogin ?? source;

  const token = source?.token ?? login?.token ?? null;
  const eleveId = source?.eleveId ?? login?.data?.accounts?.[0]?.id ?? null;
  const cookieHeader = normalizeCookieHeader(source?.cookies ?? informations?.cookies);
  const gtk = extractGtk(source?.cookies ?? informations?.cookies);

  if (!token || !eleveId) {
    return {
      ok: false,
      error: "Informations incomplètes: token ou eleveId manquant.",
      received: informations ?? null,
    };
  }

  const homeworkUrl = `https://api.ecoledirecte.com/v3/Eleves/${eleveId}/cahierdetexte.awp`;

  const bodyWithToken = `data=${JSON.stringify({ token })}`;

  // 1) Tentative la plus probable
  let res = await requestHomeworks(
    `${homeworkUrl}?verbe=get`,
    token,
    cookieHeader,
    "POST",
    bodyWithToken
  );

  let read = await readResponse(res);

  // 2) Fallback si l’API n’aime pas POST ici
  if (read.json?.code === 520 || read.json?.code === 525 || !read.json) {
    res = await requestHomeworks(
      homeworkUrl,
      token,
      cookieHeader,
      "GET"
    );
    read = await readResponse(res);
  }

  const code = read.json?.code ?? null;
  const invalid = code === 520;
  const expired = code === 525;

  return {
    ok: !invalid && !expired && res.ok,
    eleveId,
    token,
    gtk,
    cookieHeader,
    session: {
      invalid,
      expired,
      code,
    },
    homeworks: {
      status: read.status,
      raw: read.raw,
      json: read.json,
      list: parseHomeworks(read.json),
    },
    originalLogin: login ?? null,
  };
}
