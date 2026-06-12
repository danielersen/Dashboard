export async function EDhomeworks(env, informations) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const apiVersion = "4.75.0";

  const studentId = informations?.eleveId || env.ED_ID;

  if (!studentId) {
    throw new Error("eleveId manquant");
  }

  const body = new URLSearchParams();
  body.append("data", JSON.stringify({}));

  const res = await fetch(
    `https://api.ecoledirecte.com/v3/eleves/${studentId}/cahierdetexte.awp?verbe=get`,
    {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": informations.token,
        "Cookie": informations.cookieHeader
      },
      body: body.toString()
    }
  );

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Réponse invalide: " + text.slice(0, 200));
  }
  if (json.code !== 200) {
    throw new Error(json.message || `Erreur EDhomeworks code ${json.code}`);
  }
  return json.data;
}
