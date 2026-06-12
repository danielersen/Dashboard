export async function EDgrades (env, informations) {
  const token = informations.json.token;
  const cookies = informations.cookies;
  const account = informations.json.data.accounts[0];
  const eleveId = account.id;

  const body = new URLSearchParams();
  body.append("data", JSON.stringify({}));

  const res = await fetch(
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookies.join("; "),
        "User-Agent": "Mozilla/5.0"
      },
      body: body.toString()
    }
  );

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Réponse notes invalide: ${text.slice(0, 200)}`);
  }

  return json;
}
export async function EDnewgrades (env) {
}