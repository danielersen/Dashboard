export async function handleED(user, password) {
  return `user ${user}, password ${password}`
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
  const gtkResponse = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0",
    {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.ecoledirecte.com/",
        "Origin": "https://www.ecoledirecte.com"
      }
    }
  );
  const setCookie =
    gtkResponse.headers.get("set-cookie");
  const gtk =
    setCookie?.match(/GTK=([^;]+)/)?.[1];
  if (!gtk) {
    throw new Error("GTK introuvable");
  }
  const body =
    new URLSearchParams({
      data: JSON.stringify({
        identifiant: user,
        motdepasse: password,
        isRelogin: false,
        uuid: ""
      })
    }).toString();
  const response = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?v=4.75.0",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        "User-Agent":
          userAgent,
        "X-Gtk":
          gtk,
        "Cookie":
          `GTK=${gtk}`,
        "Accept":
          "application/json, text/plain, */*",
        "Referer":
          "https://www.ecoledirecte.com/",
        "Origin":
          "https://www.ecoledirecte.com"
      },
      body
    }
  );
  const result =
    await response.json();
  if (result.code !== 200) {
    throw new Error(
      result.message ||
      `Login failed with code ${result.code}`
    );
  }
  return result.token;
}
