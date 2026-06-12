export async function EDgrades(env, informations) {
  const token = informations.json.token;
  const account = informations.json.data.accounts[0];
  const eleveId = account.id;

  // ⚠️ NE PAS modifier les cookies
  const cookieHeader = (informations.cookies || []).join("; ");

  async function edFetch(url, body = "data={}") {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.ecoledirecte.com/",
        "Origin": "https://www.ecoledirecte.com"
      },
      body
    });
  }

  const notesRes = await edFetch(
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`,
    'data={"anneeScolaire":""}'
  );

  const notesText = await notesRes.text();

  return {
    eleveId,
    token,
    cookies: cookieHeader,
    notes: notesText
  };
}
