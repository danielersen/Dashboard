export function handleED(user, password, category) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

  // Step 1: Get GTK cookie
  const gtkResponse = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0",
    {
      method: "GET",
      headers: {
        "User-Agent": userAgent
      }
    }
  );
  const setCookie = gtkResponse.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("GTK cookie not found");
  }
  const gtkMatch = setCookie.match(/GTK=([^;]+)/);
  if (!gtkMatch) {
    throw new Error("GTK token extraction failed");
  }
  const gtk = gtkMatch[1];

  // Step 2: Login request
  const response = await fetch(
    "https://api.ecoledirecte.com/v3/login.awp?v=4.75.0",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        "X-Gtk": gtk
      },
      body:
        "data=" +
        encodeURIComponent(
          JSON.stringify({
            identifiant: user,
            motdepasse: password,
            isRelogin: false,
            uuid: ""
          })
        )
    }
  );
  const result = await response.json();
  if (result.code !== 200) {
    throw new Error(
      result.message || `Login failed with code ${result.code}`
    );
  }
  return result.token;
}