import { setCacheValue } from "../../index.js";
import { getCacheValue } from "../../index.js";

export async function EDgrades(env, informations, filter) {
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
  const notesUrl = `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`;
  const timelineUrl = `https://api.ecoledirecte.com/v3/eleves/${eleveId}/timeline.awp?verbe=get`;
  const notesPrimary = 'data={"anneeScolaire":""}';
  const notesFallback = `data=${JSON.stringify({
    anneeScolaire: "",
    token,
  })}`;
  const timelinePrimary = "data={}";
  const timelineFallback = `data=${JSON.stringify({
    token,
  })}`;
  const notesAttempt = await tryEndpoint(
    notesUrl,
    token,
    cookieHeader,
    notesPrimary,
    notesFallback
  );
  const timelineAttempt = await tryEndpoint(
    timelineUrl,
    token,
    cookieHeader,
    timelinePrimary,
    timelineFallback
  );
  const notes = notesAttempt.chosen;
  const timeline = timelineAttempt.chosen;
  const notesCode = notes.json?.code ?? null;
  const timelineCode = timeline.json?.code ?? null;
  const invalid = notesCode === 520 || timelineCode === 520;
  const expired = notesCode === 525 || timelineCode === 525;
  if (filter !== true) {
    return {
      ok: !invalid && !expired && notes.status >= 200 && notes.status < 300 && timeline.status >= 200 && timeline.status < 300,
      eleveId,
      token,
      gtk,
      cookieHeader,
      session: {
        invalid,
        expired,
        notesCode,
        timelineCode,
      },
      notes: {
        status: notes.status,
        raw: notes.raw,
        json: notes.json,
      },
      timeline: {
        status: timeline.status,
        raw: timeline.raw,
        json: timeline.json,
      },
      debug: {
        notesAlternate: notesAttempt.alternate,
        timelineAlternate: timelineAttempt.alternate,
      },
      originalLogin: login ?? null,
    };
  }
  // Filter and organize the response
  const filtered_note = {
    trimestre1: {},
    trimestre2: {},
    trimestre3: {},
    examen_blanc: {},
    annee: {}
  };
  const periodeMap = {
    A001: "trimestre1",
    A002: "trimestre2",
    A003: "trimestre3",
    A002X001: "examen_blanc",
    A999Z: "annee"
  };
  for (const note of notes.json.data.notes) {
    const trimestre = periodeMap[note.codePeriode];
    if (!trimestre) continue;
    const matiere = note.libelleMatiere;
    if (!filtered_note[trimestre][matiere]) {
      filtered_note[trimestre][matiere] = [];
    }
    filtered_note[trimestre][matiere].push({
      note: note.valeur,
      noteSur: note.noteSur,
      coefficient: note.coef,
      significatif: note.nonSignificatif,
      max: note.maxClasse,
      min: note.minClasse,
      moyenne: note.moyenneClasse,
      titre: note.devoir,
      date: note.date,
      dateSaisie: note.dateSaisie
    });
  }
  for (const note of notes.json.data.notes) {
    if (note.codePeriode !== "A002X001") continue;
    const dateNote = new Date(note.date);
    let targetTrimestre = null;
    for (const periode of notes.json.data.periodes) {
      if (periode.examenBlanc) continue;
      const debut = new Date(periode.dateDebut);
      const fin = new Date(periode.dateFin);
      if (dateNote >= debut && dateNote <= fin) {
        targetTrimestre = periodeMap[periode.codePeriode];
        break;
      }
    }

    if (!targetTrimestre) continue;
    const matiere = note.libelleMatiere;
    if (!filtered_note[targetTrimestre][matiere]) {
      filtered_note[targetTrimestre][matiere] = [];
    }
    filtered_note[targetTrimestre][matiere].push({
      note: note.valeur,
      noteSur: note.noteSur,
      coefficient: note.coef,
      significatif: note.nonSignificatif,
      max: note.maxClasse,
      min: note.minClasse,
      moyenne: note.moyenneClasse,
      titre: note.devoir,
      date: note.date,
      dateSaisie: note.dateSaisie,
    });
  }
  for (const periode of notes.json.data.periodes) {
    if (periode.examenBlanc) continue;
    const debut = new Date(periode.dateDebut);
    const fin = new Date(periode.dateFin);
    const now = new Date();
    const dateActuel =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
    if (dateActuel >= debut && dateActuel <= fin) {
      filtered_note.trimetre = periode;
      break;
    }
  }
  return filtered_note
}

export async function EDnewgrades(filtered_note) {
    function setCacheValue(key, value) {
        globalThis.__ED_CACHE__ ??= new Map();
        globalThis.__ED_CACHE__.set(key, value);
    }

    function getCacheValue(key) {
        globalThis.__ED_CACHE__ ??= new Map();
        return globalThis.__ED_CACHE__.get(key);
    }

    function stableStringify(value) {
        if (value === null || typeof value !== "object") {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return `[${value.map(stableStringify).join(",")}]`;
        }

        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
    }

    function makeNoteId(note) {
        return [
            note?.dateSaisie ?? "",
            note?.date ?? "",
            note?.titre ?? "",
            note?.note ?? "",
            note?.noteSur ?? "",
            note?.coefficient ?? "",
            note?.min ?? "",
            note?.max ?? ""
        ].join("|");
    }

    const cacheKey = "EDnewgrades:lastSnapshot";
    const previousSnapshot = getCacheValue(cacheKey) || {};
    const currentSnapshot = {};
    const delta = {};

    if (!filtered_note || typeof filtered_note !== "object") {
        return {};
    }

    for (const [periode, matieres] of Object.entries(filtered_note)) {
        if (!matieres || typeof matieres !== "object") continue;

        currentSnapshot[periode] = {};
        delta[periode] = {};

        for (const [matiere, notes] of Object.entries(matieres)) {
            if (!Array.isArray(notes)) continue;

            const currentIds = new Set();
            const previousIds = new Set();

            for (const note of notes) {
                currentIds.add(makeNoteId(note));
            }

            const previousNotes = previousSnapshot?.[periode]?.[matiere];
            if (Array.isArray(previousNotes)) {
                for (const note of previousNotes) {
                    previousIds.add(makeNoteId(note));
                }
            }

            currentSnapshot[periode][matiere] = notes;

            const newNotes = notes.filter((note) => !previousIds.has(makeNoteId(note)));

            if (newNotes.length > 0) {
                delta[periode][matiere] = newNotes;
            }
        }
    }

    setCacheValue(cacheKey, currentSnapshot);

    // Si aucune nouvelle note n'a été trouvée, renvoie un objet vide
    const hasDelta = Object.keys(delta).some(
        (periode) => Object.keys(delta[periode] || {}).length > 0
    );

    return hasDelta ? delta : {};
}