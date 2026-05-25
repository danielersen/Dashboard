export async function handleED(user, password, fa = null) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const gtkRes = await fetch("https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0", {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.ecoledirecte.com/",
      "Origin": "https://www.ecoledirecte.com"
    }
  });
  const cookies = typeof gtkRes.headers.getSetCookie === "function" ? gtkRes.headers.getSetCookie() : [];
  const rawSetCookie = gtkRes.headers.get("set-cookie");
  if (rawSetCookie && cookies.length === 0) cookies.push(rawSetCookie);
  const gtk = cookies.map(c => c.match(/GTK=([^;]+)/)?.[1]).find(Boolean);
  if (!gtk) throw new Error("GTK introuvable");
  const payload = {
    identifiant: user,
    motdepasse: password,
    isReLogin: false,
    uuid: ""
  };
  if (Array.isArray(fa) && fa.length > 0) payload.fa = fa;
  const body = new URLSearchParams();
  body.append("data", JSON.stringify(payload));
  const res = await fetch("https://api.ecoledirecte.com/v3/login.awp?v=4.75.0", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.ecoledirecte.com/",
      "Origin": "https://www.ecoledirecte.com",
      "X-Gtk": gtk,
      "Cookie": cookies.join("; ")
    },
    body: body.toString()
  });
  const json = await res.json();
  if (json.code === 250) {
    const err = new Error("Double authentification requise");
    err.code = 250;
    err.token = json.token;
    throw err;
  }
  if (json.code !== 200) {
    throw new Error(json.message || `Login failed with code ${json.code}`);
  }
  return json.token;
}
