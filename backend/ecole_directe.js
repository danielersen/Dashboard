export async function handleED(user, password) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // 1. GET GTK
  const gtkRes = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0",
    {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Referer": "https://www.ecoledirecte.com/",
      },
    }
  );
  return gtkRes.headers
  const setCookie = gtkRes.headers.get("set-cookie") || "";
  const gtk = setCookie.match(/GTK=([^;]+)/)?.[1];
  if (!gtk) throw new Error("GTK introuvable");

  // 2. PAYLOAD EXACT (IMPORTANT)
  const payload = {
    identifiant: user,
    motdepasse: password,
    isReLogin: false,
    uuid: ""
  };

  // 3. POST LOGIN (FORMAT STRICT ECOLEDIRECTE)
  const res = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?v=4.75.0",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        "Referer": "https://www.ecoledirecte.com/",
        "Origin": "https://www.ecoledirecte.com",
        "X-Gtk": gtk,
      },
      body: new URLSearchParams({
        data: JSON.stringify(payload),
      }),
    }
  );

  const text = await res.text();
  const json = JSON.parse(text);

  // 4. ERREUR PROPRE
  if (json.code !== 200) {
    throw new Error(json.message || "Login failed");
  }

  return json.token;
}
