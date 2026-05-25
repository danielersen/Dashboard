export async function handleED(user, password, day, month, year, classe, teacher) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const apiVersion = "4.75.0";
  async function getGtk() {
    const gtkRes = await fetch(`https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=${apiVersion}`, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.ecoledirecte.com/",
        "Origin": "https://www.ecoledirecte.com"
      }
    });
    const cookies = [];
    if (typeof gtkRes.headers.getSetCookie === "function") {
      cookies.push(...gtkRes.headers.getSetCookie());
    }
    const rawSetCookie = gtkRes.headers.get("set-cookie");
    if (rawSetCookie && cookies.length === 0) cookies.push(rawSetCookie);
    const gtk = cookies.map((c) => c.match(/GTK=([^;]+)/)?.[1]).find(Boolean);
    if (!gtk) throw new Error("GTK introuvable");
    return { gtk, cookies };
  }
  async function login(extraFa = null) {
    const { gtk, cookies } = await getGtk();
    const payload = {
      identifiant: user,
      motdepasse: password,
      isRelogin: false,
      uuid: ""
    };
    if (Array.isArray(extraFa) && extraFa.length > 0) payload.fa = extraFa;
    const body = new URLSearchParams();
    body.append("data", JSON.stringify(payload));
    const res = await fetch(`https://api.ecoledirecte.com/v3/login.awp?v=${apiVersion}`, {
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
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Réponse login invalide: ${text.slice(0, 200)}`);
    }
    const tokenFromHeader = res.headers.get("x-token") || res.headers.get("X-Token") || "";
    const token = tokenFromHeader || json.token || "";
    return { json, gtk, cookies, token };
  }
  const first = await login();
  if (first.json.code === 200) {
    return { token: first.token || first.json.token, account: first.json.data };
  }
  if (first.json.code !== 250) {
    throw new Error(first.json.message || `Login failed with code ${first.json.code}`);
  }
  if (!first.token) {
    throw new Error(`Token absent sur le login 250: ${JSON.stringify(first.json)}`);
  }
  const challengeRes = await fetch("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=get", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.ecoledirecte.com/",
      "Origin": "https://www.ecoledirecte.com",
      "X-Token": first.token,
      "Cookie": first.cookies.join("; ")
    },
    body: new URLSearchParams({
      data: JSON.stringify({})
    }).toString()
  });
  const challengeText = await challengeRes.text();
  let challenge;
  try {
    challenge = JSON.parse(challengeText);
  } catch {
    throw new Error(`Réponse QCM invalide: ${challengeText.slice(0, 200)}`);
  }
  if (challenge.code === 520) {
    throw new Error(`Token invalide pendant l'accès au QCM: ${challengeText.slice(0, 200)}`);
  }
  if (challenge.code !== 200 || !challenge.data) {
    throw new Error(`QCM 2FA introuvable: ${challengeText.slice(0, 200)}`);
  }
  const question = challenge.data.question ? atob(challenge.data.question) : null;
  const propositions = Array.isArray(challenge.data.propositions) ? challenge.data.propositions.map((p) => atob(p)) : [];
  if (!question || propositions.length === 0) {
    throw new Error(`QCM 2FA introuvable: ${challengeText.slice(0, 200)}`);
  }
  if (question === "Quel est votre jour de naissance ?") {
    const answer = day;
  }
  if (question === "Quel est votre mois de naissance ?") {
    const answer = month;
  }
  if (question === "Quelle est votre année de naissance ?") {
    const answer = year;
  }
  if (question === "Quel est le nom de famille de votre professeur principal ?") {
    const answer = teacher;
  }
  if (question === "Quelle est votre classe ?") {
    const answer = classe;
  }
  const body_QCM = new URLSearchParams();
  body_QCM.append("data", JSON.stringify({
    choix: btoa(answer) // réponse choisie, encodée en base64
  }));
  const res_QCM = await fetch("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.ecoledirecte.com/",
      "Origin": "https://www.ecoledirecte.com",
      "X-Token": token,
      "Cookie": cookies.join("; ")
    },
    body: body_QCM.toString()
  });
  const json = await res_QCM.json();
  if (json.code !== 200 || !json.data?.cn || !json.data?.cv) {
    throw new Error(`Échec QCM: ${JSON.stringify(json)}`);
  }
  return json.data;
}
