export async function EDgrades(env, informations) {
  const token = informations.json.token;

  const account = informations.json.data.accounts[0];
  const eleveId = account.id;

  const cookieHeader = informations.cookies
    .map(cookie => cookie.split(";")[0])
    .join("; ");

  // Test de la session avec timeline
  const timelineRes = await fetch(
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/timeline.awp?verbe=get`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0"
      },
      body: "data={}"
    }
  );

  const timelineText = await timelineRes.text();

  // Test des notes
  const notesRes = await fetch(
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0"
      },
      body: 'data={"anneeScolaire":""}'
    }
  );

  const notesText = await notesRes.text();

  return {
    token,
    eleveId,
    cookies: cookieHeader,
    timeline: {
      status: timelineRes.status,
      body: timelineText
    },
    notes: {
      status: notesRes.status,
      body: notesText
    },
    originalLogin: informations
  };
}