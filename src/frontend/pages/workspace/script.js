const ED_BASE = "/api/ed";

// Day keys match the EcoleDirecte timetable response (semaine[jour]); names are for display.
const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const state = {
  grades: null,
  timetable: null,
  homeworks: null,
  newGrades: null,
  trimester: "trimestre1",
  semaine: "semaineA",
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
function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  return parseFloat(String(value).replace(",", "."));
}

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

function timePart(value) {
  if (!value) return "";
  const str = String(value);
  const t = str.includes("T") ? str.split("T")[1] : str.split(" ")[1];
  return t ? t.slice(0, 5) : "";
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* Compute a per-subject and overall average from the grades of one period. */
function computeAverages(matieres) {
  const result = { matieres: {}, generale: null };
  if (!isObject(matieres)) return result;
  let totalGeneral = 0;
  let countGeneral = 0;
  for (const [matiere, notes] of Object.entries(matieres)) {
    if (!Array.isArray(notes)) continue;
    let total = 0;
    let coefTotal = 0;
    for (const note of notes) {
      const valeur = toNumber(note.note);
      const noteSur = toNumber(note.noteSur);
      const coef = toNumber(note.coefficient);
      const insignificant = String(note.significatif) === "true";
      if (isNaN(valeur) || isNaN(noteSur) || noteSur === 0 || insignificant) {
        continue;
      }
      const usedCoef = isNaN(coef) ? 1 : coef;
      total += (valeur / noteSur) * 20 * usedCoef;
      coefTotal += usedCoef;
    }
    const avg = coefTotal > 0 ? total / coefTotal : null;
    result.matieres[matiere] = avg;
    if (avg !== null) {
      totalGeneral += avg;
      countGeneral += 1;
    }
  }
  result.generale = countGeneral > 0 ? totalGeneral / countGeneral : null;
  return result;
}

/* ===================== SECTION NAV ===================== */
const sidebarButtons = document.querySelectorAll(".ws-nav");
const sections = document.querySelectorAll(".ws-section");

function showSection(target) {
  sections.forEach((section) => {
    section.hidden = section.id !== target;
  });
  sidebarButtons.forEach((btn) => {
    btn.dataset.active = String(btn.dataset.target === target);
  });
}

sidebarButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.target));
});

/* ===================== SEGMENTED SWITCH ===================== */
function setupSegmented(container, onChange) {
  if (!container) return;
  const thumb = container.querySelector("[data-thumb]");
  const buttons = container.querySelectorAll(".segmented-btn");

  function moveThumb(activeBtn) {
    if (!thumb || !activeBtn) return;
    thumb.style.width = `${activeBtn.offsetWidth}px`;
    thumb.style.transform = `translateX(${activeBtn.offsetLeft - 4}px)`;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => (b.dataset.active = "false"));
      btn.dataset.active = "true";
      moveThumb(btn);
      onChange(btn);
    });
  });

  const initial = container.querySelector('.segmented-btn[data-active="true"]') || buttons[0];
  requestAnimationFrame(() => moveThumb(initial));
  window.addEventListener("resize", () => {
    const active = container.querySelector('.segmented-btn[data-active="true"]');
    moveThumb(active);
  });
}

/* ===================== ACCUEIL ===================== */
function updateSyncTime() {
  const label = document.getElementById("syncLabel");
  if (!label) return;
  label.textContent = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countNewGrades(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (!isObject(data)) return 0;
  let count = 0;
  for (const matieres of Object.values(data)) {
    if (Array.isArray(matieres)) {
      count += matieres.length;
    } else if (isObject(matieres)) {
      for (const notes of Object.values(matieres)) {
        if (Array.isArray(notes)) count += notes.length;
      }
    }
  }
  return count;
}

function renderNewGradesCard() {
  const card = document.querySelector('[data-card="new-grades"]');
  if (!card) return;
  const valueEl = card.querySelector("[data-value]");
  const descEl = card.querySelector("[data-desc]");
  if (state.newGrades && state.newGrades.error) {
    valueEl.textContent = "—";
    descEl.textContent = "New grades unavailable.";
    return;
  }
  const count = countNewGrades(state.newGrades);
  valueEl.textContent = String(count);
  valueEl.dataset.tone = count > 0 ? "accent" : "";
  descEl.textContent = count > 0
    ? (count > 1 ? `${count} new grades since your last visit.` : "1 new grade since your last visit.")
    : "No new grades.";
}

function collectUpcomingHomeworks() {
  const data = state.homeworks;
  const byDate = data && isObject(data.data) ? data.data : (isObject(data) ? data : {});
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = [];
  for (const [date, devoirs] of Object.entries(byDate)) {
    const d = parseYMD(date);
    if (!d || d < today || !Array.isArray(devoirs)) continue;
    for (const devoir of devoirs) {
      if (!isObject(devoir)) continue;
      if (devoir.aFaire === false) continue;
      items.push({ date, devoir });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

function renderHomeworksCard() {
  const card = document.querySelector('[data-card="homeworks"]');
  if (!card) return;
  const valueEl = card.querySelector("[data-value]");
  const descEl = card.querySelector("[data-desc]");
  const upcoming = collectUpcomingHomeworks().filter(({ devoir }) => !devoir.effectue);
  valueEl.textContent = String(upcoming.length);
  valueEl.dataset.tone = upcoming.length > 0 ? "accent" : "";
  descEl.textContent = upcoming.length > 0
    ? "Upcoming homework still to do."
    : "No upcoming homework to do.";
}

function flattenTimetable() {
  const data = state.timetable;
  const map = {};
  if (!isObject(data)) return map;
  for (const semaine of Object.values(data)) {
    if (!isObject(semaine)) continue;
    for (const courses of Object.values(semaine)) {
      if (!Array.isArray(courses)) continue;
      for (const course of courses) {
        if (!isObject(course)) continue;
        const date = String(course.start_date || course.startDate || "").slice(0, 10);
        if (!date) continue;
        (map[date] ||= []).push(course);
      }
    }
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  }
  return map;
}

function renderTomorrowCard() {
  const card = document.querySelector('[data-card="tomorrow"]');
  if (!card) return;
  const subtitle = card.querySelector("[data-subtitle]");
  const list = card.querySelector("[data-list]");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = ymd(tomorrow);
  subtitle.textContent = formatDayFull(tomorrow).replace(/^\w/, (c) => c.toUpperCase());
  const map = flattenTimetable();
  const courses = (map[key] || []).filter((c) => !c.isAnnule);
  if (courses.length === 0) {
    list.innerHTML = `<p class="card-desc">No classes scheduled tomorrow.</p>`;
    return;
  }
  list.innerHTML = courses
    .map((c) => {
      const time = `${timePart(c.start_date)}–${timePart(c.end_date)}`;
      const name = c.matiere || c.text || "Class";
      const room = c.salle ? `Room ${c.salle}` : "";
      return `
        <div class="tomorrow-row">
          <span class="t-time">${time}</span>
          <span class="t-name">${escapeHtml(name)}</span>
          <span class="t-room">${escapeHtml(room)}</span>
        </div>`;
    })
    .join("");
}

/* ===================== NOTES ===================== */
function renderNotes() {
  const body = document.querySelector("[data-notes-body]");
  if (!body) return;
  if (state.grades && state.grades.error) {
    body.innerHTML = `<p class="state-msg">Couldn't load grades: ${escapeHtml(state.grades.error)}</p>`;
    return;
  }
  const matieres = isObject(state.grades) ? state.grades[state.trimester] : null;
  if (!isObject(matieres) || Object.keys(matieres).length === 0) {
    body.innerHTML = `<p class="state-msg">No grades for this term.</p>`;
    return;
  }
  const averages = computeAverages(matieres);
  const overall = averages.generale;

  const cards = Object.entries(matieres)
    .map(([matiere, notes]) => {
      const avg = averages.matieres[matiere];
      const chips = (Array.isArray(notes) ? notes : [])
        .map((note) => renderNoteChip(matiere, note))
        .join("");
      return `
        <article class="subject-card">
          <div class="subject-head">
            <span class="subject-name" title="${escapeHtml(matiere)}">${escapeHtml(matiere)}</span>
            <span class="subject-avg">${avg !== null && avg !== undefined ? avg.toFixed(2) : "—"}<em>/20</em></span>
          </div>
          <div class="note-chips">${chips}</div>
        </article>`;
    })
    .join("");

  body.innerHTML = `
    <div class="subject-overall">
      <strong>${overall !== null ? overall.toFixed(2) : "—"}</strong>
      <span>Overall average&nbsp;/20</span>
    </div>
    <div class="notes-grid">${cards}</div>`;

  attachNoteTooltips(body);
}

function renderNoteChip(matiere, note) {
  const valeur = note.note ?? "—";
  const sur = note.noteSur ? `/${note.noteSur}` : "";
  const insignificant = String(note.significatif) === "true";
  const payload = encodeURIComponent(JSON.stringify({ matiere, note }));
  return `<span class="note-chip" data-note="${payload}" data-insignificant="${insignificant}">${escapeHtml(String(valeur))}<em>${escapeHtml(sur)}</em></span>`;
}

/* ===================== NOTE TOOLTIP ===================== */
const tooltip = document.querySelector("[data-note-tooltip]");

function buildTooltipHtml(matiere, note) {
  const significant = String(note.significatif) === "true" ? "No" : "Yes";
  const rows = [
    ["Date", formatNoteDate(note.date)],
    ["Subject", note.titre || "—"],
    ["Grade", `${note.note ?? "—"}${note.noteSur ? ` / ${note.noteSur}` : ""}`],
    ["Class average", fmtVal(note.moyenne)],
    ["Class min", fmtVal(note.min)],
    ["Class max", fmtVal(note.max)],
    ["Coefficient", fmtVal(note.coefficient)],
    ["Significant", significant],
  ];
  const dl = rows
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
    .join("");
  return `<p class="tt-title">${escapeHtml(matiere)}</p><dl>${dl}</dl>`;
}

function fmtVal(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatNoteDate(value) {
  const d = parseYMD(value);
  if (!d) return value || "—";
  return formatDayFull(d);
}

function attachNoteTooltips(scope) {
  scope.querySelectorAll(".note-chip[data-note]").forEach((chip) => {
    chip.addEventListener("mouseenter", () => {
      let parsed;
      try {
        parsed = JSON.parse(decodeURIComponent(chip.dataset.note));
      } catch {
        return;
      }
      tooltip.innerHTML = buildTooltipHtml(parsed.matiere, parsed.note);
      tooltip.hidden = false;
      requestAnimationFrame(() => {
        tooltip.dataset.show = "true";
        positionTooltip(chip);
      });
    });
    chip.addEventListener("mousemove", () => positionTooltip(chip));
    chip.addEventListener("mouseleave", hideTooltip);
  });
}

function positionTooltip(anchor) {
  if (!tooltip || tooltip.hidden) return;
  const rect = anchor.getBoundingClientRect();
  const ttRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - ttRect.width / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - ttRect.width - 10));
  let top = rect.top - ttRect.height - 10;
  if (top < 10) top = rect.bottom + 10;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.dataset.show = "false";
  tooltip.hidden = true;
}

/* ===================== TIMETABLE ===================== */
function renderTimetable() {
  const body = document.querySelector("[data-timetable-body]");
  if (!body) return;
  if (state.timetable && state.timetable.error) {
    body.innerHTML = `<p class="state-msg">Couldn't load the timetable: ${escapeHtml(state.timetable.error)}</p>`;
    return;
  }
  const semaine = isObject(state.timetable) ? state.timetable[state.semaine] : null;
  if (!isObject(semaine)) {
    body.innerHTML = `<p class="state-msg">No timetable available.</p>`;
    return;
  }
  const cols = DAY_KEYS.map((jour, i) => {
    const courses = Array.isArray(semaine[jour]) ? [...semaine[jour]] : [];
    courses.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
    const items = courses.length
      ? courses.map(renderCourse).join("")
      : `<p class="day-empty">—</p>`;
    return `
      <div class="day-col">
        <div class="day-name">${DAY_NAMES[i]}</div>
        ${items}
      </div>`;
  }).join("");
  body.innerHTML = `<div class="timetable-grid">${cols}</div>`;
}

function renderCourse(course) {
  const time = `${timePart(course.start_date)} – ${timePart(course.end_date)}`;
  const name = course.matiere || course.text || "Class";
  const prof = course.prof ? escapeHtml(course.prof) : "";
  const salle = course.salle ? `Room ${escapeHtml(course.salle)}` : "";
  const meta = [salle, prof].filter(Boolean)
    .map((m) => `<span>${m}</span>`)
    .join("");
  return `
    <div class="course" data-cancelled="${Boolean(course.isAnnule)}">
      <span class="c-time">${time}</span>
      <span class="c-name">${escapeHtml(name)}</span>
      <span class="c-meta">${meta}</span>
    </div>`;
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
        renderHomeworksCard();
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

/* ===================== UTIL ===================== */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ===================== BOOT ===================== */
async function loadAll() {
  updateSyncTime();

  const tasks = [
    ["grades", () => edGet("grades")],
    ["timetable", () => edGet("timetable")],
    ["homeworks", () => edGet("homeworks")],
    ["newGrades", () => edGet("new-grades")],
  ];

  await Promise.all(
    tasks.map(async ([key, fn]) => {
      try {
        state[key] = await fn();
      } catch (err) {
        state[key] = { error: err?.message || "Unknown error" };
      }
    })
  );

  renderNewGradesCard();
  renderHomeworksCard();
  renderTomorrowCard();
  renderNotes();
  renderTimetable();
  renderHomeworks();
}

function boot() {
  showSection("accueil");
  setupSegmented(document.querySelector("[data-trimester]"), (btn) => {
    state.trimester = btn.dataset.period;
    renderNotes();
  });
  setupSegmented(document.querySelector("[data-week]"), (btn) => {
    state.semaine = btn.dataset.semaine;
    renderTimetable();
  });
  loadAll();
}

document.addEventListener("DOMContentLoaded", boot);
window.addEventListener("site-navbar:refresh", loadAll);
window.addEventListener("scroll", hideTooltip, true);
