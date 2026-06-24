import { createMesh3D } from "./mesh3d.js";

const syncLabel = document.getElementById("syncLabel");
const meshCanvas = document.getElementById("meshCanvas");
let mesh = null;

function updateSyncTime() {
  const now = new Date();
  syncLabel.textContent = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bootHome() {
  updateSyncTime();

  if (!mesh && meshCanvas) {
    mesh = createMesh3D(meshCanvas);
    mesh.start();
    return;
  }

  mesh?.refresh();
}

document.addEventListener("DOMContentLoaded", bootHome);
window.addEventListener("site-navbar:refresh", (event) => {
  const done = bootHome();
  event.detail?.waitUntil?.(done);
});

document.addEventListener("visibilitychange", () => {
  if (!mesh) {
    return;
  }
  if (document.hidden) {
    mesh.stop();
  } else {
    mesh.start();
  }
});
