export async function EDgrades(env, informations) {
  const token = informations.json.token;

  const account = informations.json.data.accounts[0];
  const eleveId = account.id;

  // ⚠️ IMPORTANT : ne pas “nettoyer” les cookies trop agressivement
  const cookieHeader = (informations.cookies || []).join("; ");

  async function edFetch(url, body = "data={}") {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.ecoledirecte.com/"
      },
      body
    });
  }

  try {
    // =========================
    // 📌 Timeline (test session)
    // =========================
    const timelineRes = await edFetch(
      `https://api.ecoledirecte.com/v3/eleves/${eleveId}/timeline.awp?verbe=get`
    );

    const timelineText = await timelineRes.text();

    // =========================
    // 📌 Notes
    // =========================
    const notesRes = await edFetch(
      `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`,
      'data={"anneeScolaire":""}'
    );

    const notesText = await notesRes.text();

    // =========================
    // 📌 Parsing sécurisé JSON
    // =========================
    let notesJson = null;
    let timelineJson = null;

    try {
      notesJson = JSON.parse(notesText);
    } catch (e) {}

    try {
      timelineJson = JSON.parse(timelineText);
    } catch (e) {}

    // =========================
    // 📌 Détection session expirée
    // =========================
    const sessionExpired =
      notesJson?.code === 525 || timelineJson?.code === 525;

    return {
      token,
      eleveId,
      cookies: cookieHeader,

      session: {
        expired: sessionExpired
      },

      timeline: {
        status: timelineRes.status,
        raw: timelineText,
        json: timelineJson
      },

      notes: {
        status: notesRes.status,
        raw: notesText,
        json: notesJson
      },

      originalLogin: informations
    };

  } catch (err) {
    return {
      error: true,
      message: err.message,
      token,
      eleveId
    };
  }
}
