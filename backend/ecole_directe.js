export async function handleED(user, password) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // 1. GTK
  const gtkRes = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.100.0",
    {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Referer": "https://www.ecoledirecte.com/",
      },
    }
  );

  const setCookie = gtkRes.headers.get("set-cookie") || "";
  const gtk = setCookie.match(/GTK=([^;]+)/)?.[1];

  if (!gtk) throw new Error("GTK introuvable");

  // 2. login payload (IMPORTANT: pas de double encodage inutile)
  const payload = {
    identifiant: user,
    motdepasse: password,
    isRelogin: false,
    uuid: "",
  };

  const res = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?v=4.100.0",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        "Referer": "https://www.ecoledirecte.com/",
        "Origin": "https://www.ecoledirecte.com",
        "X-Gtk": gtk,
      },
      body: `data=${encodeURIComponent(JSON.stringify(payload))}`,
    }
  );

  const json = await res.json();

  if (json.code !== 200) {
    throw new Error(`ED login failed: ${json.message} (code ${json.code})`);
  }

  return json.token;
}
