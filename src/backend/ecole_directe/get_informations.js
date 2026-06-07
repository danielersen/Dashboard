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
  const norm = (s) =>
    String(s)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  let expected = null;
  const q = norm(question);
  if (q.includes("jour") {
    expected = String(day);
  } else if (q.includes("mois")) {
    expected = String(month);
  } else if (q.includes("annee") || q.includes("année") || q.includes("annÃ©e")) {
    expected = String(year);
  } else if (q.includes("professeur")) {
    expected = String(teacher);
  } else if (q.includes("classe")) {
    expected = String(classe);
  }
  if (!expected) {
    throw new Error(`Question QCM non gérée: ${question}`);
  }
  const selected = propositions.find((p) => norm(p) === norm(expected));
  if (!selected) {
    throw new Error(`Aucune proposition ne correspond à "${expected}". Propositions: ${JSON.stringify(propositions)}`);
  }
  const body = new URLSearchParams();
  body.set("data", JSON.stringify({
    choix: btoa(unescape(encodeURIComponent(selected)))
  }));
  const res_QCM = await fetch(
    "https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=post", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Token": first.token,
      "Cookie": first.cookies.join("; "),
      "User-Agent": userAgent
    },
    body: body.toString()
  });
  const qcmJson = await res_QCM.json();
  if (qcmJson.code !== 200 || !qcmJson.data?.cn || !qcmJson.data?.cv) {
    throw new Error(`Échec QCM: ${JSON.stringify(qcmJson)}`);
  }
  const second = await login([{ cn: qcmJson.data.cn, cv: qcmJson.data.cv }]);
  if (second.json.code === 200) {
    return second;
  }
  throw new Error(`Re-login après QCM échoué: ${JSON.stringify(second.json)}`);
}
