const ED_BASE = "/api/ed";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const state = {
  homeworks: null,
};

/* ===================== API ===================== */
async function edGet(sub) {
  const res = await fetch(`${ED_BASE}/${sub}`, {
    method: "GET",
    headers: {
      filter: "true",
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid API response");
  }
  if (json && json.error) {
    throw new Error(json.error);
  }
  const data = json && Object.prototype.hasOwnProperty.call(json, "resp")
    ? json.resp
    : json;
  if (data && data.ok === false && data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function edPost(sub, body) {
  const res = await fetch(`${ED_BASE}/${sub}`, {
    method: "POST",
    headers: {
      filter: "true",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return Object.prototype.hasOwnProperty.call(json, "resp") ? json.resp : json;
  } catch {
    return null;
  }
}

/* ===================== HELPERS ===================== */
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseYMD(value) {
  if (!value) return null;
  const ymd = String(value).slice(0, 10);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDayFull(date) {
  if (!date) return "";
  const dayName = DAY_NAMES[(date.getDay() + 6) % 7] ?? "";
  return `${dayName}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ===================== HOMEWORKS ===================== */
function renderHomeworks() {
  const body = document.querySelector("[data-homeworks-body]");
  if (!body) return;
  if (state.homeworks && state.homeworks.error) {
    body.innerHTML = `<p class="state-msg">Couldn't load homework: ${escapeHtml(state.homeworks.error)}</p>`;
    return;
  }
  const data = state.homeworks;
  const byDate = data && isObject(data.data) ? data.data : (isObject(data) ? data : null);
  if (!isObject(byDate)) {
    body.innerHTML = `<p class="state-msg">No homework available.</p>`;
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Object.keys(byDate)
    .filter((date) => {
      const d = parseYMD(date);
      return d && d >= today && Array.isArray(byDate[date]) && byDate[date].length > 0;
    })
    .sort((a, b) => a.localeCompare(b));

  if (dates.length === 0) {
    body.innerHTML = `<p class="state-msg">No upcoming homework.</p>`;
    return;
  }

  body.innerHTML = dates
    .map((date) => {
      const d = parseYMD(date);
      const items = byDate[date]
        .filter(isObject)
        .map((devoir) => renderHomeworkItem(date, devoir))
        .join("");
      return `
        <section class="hw-day">
          <h2 class="hw-day-title">${escapeHtml(formatDayFull(d))}</h2>
          <div class="hw-list">${items}</div>
        </section>`;
    })
    .join("");

  attachHomeworkHandlers(body);
}

function renderHomeworkItem(date, devoir) {
  const subject = devoir.matiere || devoir.codeMatiere || "Homework";
  const control = Boolean(devoir.interrogation);
  const done = Boolean(devoir.effectue);
  const content = devoir.contenu ? escapeHtml(devoir.contenu) : "No details provided.";
  const prof = devoir.nomProf ? `Teacher: ${escapeHtml(devoir.nomProf)}` : "";
  const id = devoir.idDevoir != null ? String(devoir.idDevoir) : "";
  const controlTag = control ? `<span class="hw-tag" data-kind="control">Test</span>` : "";
  return `
    <article class="hw-item" data-done="${done}">
      <div class="hw-main">
        <div class="hw-top">
          <span class="hw-subject">${escapeHtml(subject)}</span>
          ${controlTag}
        </div>
        <p class="hw-content">${content}</p>
        ${prof ? `<p class="hw-prof">${prof}</p>` : ""}
      </div>
      <button class="hw-check" type="button" data-id="${escapeHtml(id)}" data-done="${done}">
        ${done ? "Done ✓" : "Mark as done"}
      </button>
    </article>`;
}

function attachHomeworkHandlers(scope) {
  scope.querySelectorAll(".hw-check").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!/^\d{5}$/.test(id)) return;
      const willBeDone = btn.dataset.done !== "true";
      btn.dataset.busy = "true";
      const result = await edPost("homeworks", { id, done: String(willBeDone) });
      btn.dataset.busy = "false";
      const ok = result && (result.ok === true || result.ok === undefined);
      if (ok) {
        btn.dataset.done = String(willBeDone);
        btn.textContent = willBeDone ? "Done ✓" : "Mark as done";
        const item = btn.closest(".hw-item");
        if (item) item.dataset.done = String(willBeDone);
        updateLocalHomeworkDone(id, willBeDone);
      }
    });
  });
}

function updateLocalHomeworkDone(id, done) {
  const data = state.homeworks;
  const byDate = data && isObject(data.data) ? data.data : (isObject(data) ? data : null);
  if (!isObject(byDate)) return;
  for (const devoirs of Object.values(byDate)) {
    if (!Array.isArray(devoirs)) continue;
    for (const devoir of devoirs) {
      if (isObject(devoir) && String(devoir.idDevoir) === String(id)) {
        devoir.effectue = done;
      }
    }
  }
}

/* ===================== BOOT ===================== */
async function loadHomeworks() {
  try {
    state.homeworks = await edGet("homeworks");
  } catch (err) {
    state.homeworks = { error: err?.message || "Unknown error" };
  }
  renderHomeworks();
}

document.addEventListener("DOMContentLoaded", loadHomeworks);
window.addEventListener("site-navbar:refresh", loadHomeworks);
