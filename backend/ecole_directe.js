export async function handleED(user, password) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
  // GTK
  const gtkResponse = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0",
    {
      method: "GET",
      headers: {
        "User-Agent": userAgent
      }
    }
  );
  const setCookie =
    gtkResponse.headers.get("set-cookie");
  console.log(setCookie);
  const gtk =
    setCookie?.match(/GTK=([^;]+)/)?.[1];
  console.log(gtk);
  if (!gtk) {
    throw new Error("GTK introuvable");
  }
  // BODY EXACT
  const payload = JSON.stringify({
    identifiant: user,
    motdepasse: password,
    isRelogin: false,
    uuid: ""
  });
  const body =
    "data=" + payload;
  console.log(body);
  // LOGIN
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
          gtk
      },
      body: body
    }
  );
  const text =
    await response.text();
  console.log(text);
  return text;
}