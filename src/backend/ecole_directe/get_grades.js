export async function EDgrades(env, informations) {
  const token = informations.token || informations.json?.token;

  const account = informations.json?.data?.accounts?.[0];
  const eleveId = account?.id;

  const cookieHeader = (informations.cookies || [])
    .map(cookie => cookie.split(";")[0])
    .join("; ");

  const body = new URLSearchParams();
  body.append(
    "data",
    JSON.stringify({
      anneeScolaire: ""
    })
  );

  const res = await fetch(
    `https://api.ecoledirecte.com/v3/eleves/${eleveId}/notes.awp?verbe=get`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Token": token,
        "Cookie": cookieHeader,
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
    json = null;
  }

  return {
    request: {
      eleveId,
      token,
      cookies: cookieHeader
    },
    response: {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      raw: text,
      json
    }
  };
}