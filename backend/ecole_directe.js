export async function handleED(user, password) {
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
    const cookies = typeof gtkRes.headers.getSetCookie === "function" ? gtkRes.headers.getSetCookie() : [];
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
      isReLogin: false,
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
    const json = await res.json();
    return { json, gtk, cookies };
  }
  const first = await login();
  if (first.json.code === 200) {
    return { token: first.json.token, account: first.json.data };
  }
  if (first.json.code !== 250) {
    throw new Error(first.json.message || `Login failed with code ${first.json.code}`);
  }
  const challengeRes = await fetch("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp", {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.ecoledirecte.com/",
      "Origin": "https://www.ecoledirecte.com",
      "X-Token": first.json.token || ""
    },
    body: "{}"
  });
  const challenge = await challengeRes.json();
  const question = challenge.data?.question ? atob(challenge.data.question) : null;
  const propositions = Array.isArray(challenge.data?.propositions)
    ? challenge.data.propositions.map((p) => atob(p))
    : [];
  if (!question || propositions.length === 0) {
    throw new Error("QCM 2FA introuvable");
  }
  return {
    needs2FA: true,
    token: first.json.token || null,
    question,
    propositions,
    answer: async (choixTexte) => {
      const answerRes = await fetch("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": userAgent,
          "Accept": "application/json, text/plain, */*",
          "Referer": "https://www.ecoledirecte.com/",
          "Origin": "https://www.ecoledirecte.com",
          "X-Token": first.json.token || ""
        },
        body: new URLSearchParams({
          data: JSON.stringify({
            choix: btoa(choixTexte)
          })
        }).toString()
      });
      const answerJson = await answerRes.json();
      if (answerJson.code !== 200) {
        throw new Error(answerJson.message || "Double auth failed");
      }
      const fa = [{
        cn: answerJson.data.cn,
        cv: answerJson.data.cv,
        uniq: false
      }];
      const second = await login(fa);
      if (second.json.code !== 200) {
        throw new Error(second.json.message || `Login failed with code ${second.json.code}`);
      }
      return { token: second.json.token, account: second.json.data };
    }
  };
}
