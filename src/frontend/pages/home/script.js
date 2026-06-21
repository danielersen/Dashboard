const syncLabel = document.getElementById("syncLabel");
const clockLabel = document.getElementById("clockLabel");

function bootHome() {
  const now = new Date();
  syncLabel.textContent = "Synchronisé";
  clockLabel.textContent = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

document.addEventListener("DOMContentLoaded", bootHome);
window.addEventListener("site-navbar:refresh", bootHome);
