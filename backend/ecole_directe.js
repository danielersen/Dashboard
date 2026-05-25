export async function handleED(user, password) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // 1. GTK (OBLIGATOIRE)
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

  const gtkCookie = gtkRes.headers.get("set-cookie") || "";
  const gtk = gtkCookie.match(/GTK=([^;]+)/)?.[1];

  if (!gtk) throw new Error("GTK introuvable");

  // 2. LOGIN (IMPORTANT : format strict ED)
  const body = new URLSearchParams();
  body.append(
    "data",
    JSON.stringify({
      identifiant: user,
      motdepasse: password,
      isRelogin: false,
      uuid: "",
    })
  );

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
      body: body.toString(),
    }
  );

  const json = await res.json();

  // ⚠️ ED renvoie code 200 même en erreur parfois → MAIS pas toujours
  if (json.code !== 200) {
    throw new Error(json.message || "Login ED failed");
  }

  return json.token;
}
