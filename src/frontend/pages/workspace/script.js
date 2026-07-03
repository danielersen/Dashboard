import { authedFetch } from "/lib/auth.js";

const ED_BASE = "/api/ed";

// Day keys match the EcoleDirecte timetable response (semaine[jour]); names are for display.
const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const POMO_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const POMO_DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const POMO_CIRCUMFERENCE = 2 * Math.PI * 90;

const state = {
  grades: null,
  timetable: null,
  homeworks: null,
  newGrades: null,
  trimester: "trimestre1",
  semaine: "semaineA",
  pomoDayIndex: ((new Date().getDay() + 6) % 7),
  pomoSubjects: [],
  pomoSubjectsOriginal: null,
  pomoDirty: false,
  pomoChecked: {},
  pomoTimerCount: 0,
  pomoTimerRunning: false,
  pomoTimerInterval: null,
  pomoTimerTotal: 25 * 60,
  pomoTimerRemaining: 25 * 60,
};

/* ===================== API ===================== */
async function edGet(sub) {
  const res = await authedFetch(`${ED_BASE}/${sub}`, {
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
  const res = await authedFetch(`${ED_BASE}/${sub}`, {
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

/* ===================== POMODORO ===================== */
const POMO_BASE = "/api/pomodoro";

function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function pomoPost(sub, body) {
  const res = await withTimeout(
    authedFetch(`${POMO_BASE}/${sub}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }),
    25000,
    `Pomodoro request timed out for ${sub}`
  );
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return Object.prototype.hasOwnProperty.call(json, "resp") ? json.resp : json;
  } catch {
    return null;
  }
}

function pomoTodayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function pomoIsToday() {
  return state.pomoDayIndex === pomoTodayIndex();
}

/* --- Timer --- */
function pomoUpdateTimerDisplay() {
  const timeEl = document.querySelector("[data-pomo-time]");
  const ring = document.querySelector("[data-pomo-ring]");
  const startBtn = document.querySelector("[data-pomo-start]");
  if (timeEl) {
    const m = Math.floor(state.pomoTimerRemaining / 60);
    const s = state.pomoTimerRemaining % 60;
    timeEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (ring) {
    const progress = state.pomoTimerTotal > 0 ? state.pomoTimerRemaining / state.pomoTimerTotal : 1;
    ring.style.strokeDashoffset = String(POMO_CIRCUMFERENCE * (1 - progress));
  }
  if (startBtn) {
    startBtn.textContent = state.pomoTimerRunning ? "Pause" : "Start";
  }
}

function pomoStartTimer() {
  if (state.pomoTimerRunning) {
    clearInterval(state.pomoTimerInterval);
    state.pomoTimerRunning = false;
    pomoUpdateTimerDisplay();
    return;
  }
  if (state.pomoTimerRemaining <= 0) return;
  state.pomoTimerRunning = true;
  pomoUpdateTimerDisplay();
  state.pomoTimerInterval = setInterval(async () => {
    state.pomoTimerRemaining--;
    pomoUpdateTimerDisplay();
    if (state.pomoTimerRemaining <= 0) {
      clearInterval(state.pomoTimerInterval);
      state.pomoTimerRunning = false;
      pomoUpdateTimerDisplay();
      pomoPlaySound();
      const result = await pomoPost("increment-timer", {});
      if (result && result.timerCount != null) {
        state.pomoTimerCount = result.timerCount;
      }
      pomoUpdateCounterDisplay();
    }
  }, 1000);
}

function pomoResetTimer() {
  clearInterval(state.pomoTimerInterval);
  state.pomoTimerRunning = false;
  const input = document.querySelector("[data-pomo-duration]");
  const minutes = input ? Math.max(1, Math.min(120, parseInt(input.value, 10) || 25)) : 25;
  state.pomoTimerTotal = minutes * 60;
  state.pomoTimerRemaining = minutes * 60;
  pomoUpdateTimerDisplay();
}

function pomoOnDurationChange() {
  if (!state.pomoTimerRunning) {
    pomoResetTimer();
  }
}

function pomoPlaySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.stop(ctx.currentTime + 1.5);
  } catch {
    /* audio not available */
  }
}

function pomoUpdateCounterDisplay() {
  const el = document.querySelector("[data-pomo-count]");
  if (el) el.textContent = String(state.pomoTimerCount);
}

/* --- Day navigation --- */
function pomoChangeDay(offset) {
  state.pomoDayIndex = ((state.pomoDayIndex + offset) % 7 + 7) % 7;
  state.pomoDirty = false;
  pomoLoadSubjects();
}

function pomoUpdateDayLabel() {
  const label = document.querySelector("[data-pomo-day-label]");
  if (label) {
    const dayLabel = POMO_DAY_LABELS[state.pomoDayIndex];
    label.textContent = pomoIsToday() ? `${dayLabel} (today)` : dayLabel;
  }
}

/* --- Subjects --- */
async function pomoLoadSubjects() {
  pomoUpdateDayLabel();
  const listEl = document.querySelector("[data-pomo-subjects]");
  if (listEl) listEl.innerHTML = `<p class="state-msg">Loading subjects\u2026</p>`;
  try {
    const result = await pomoPost("read-subjects", { day: POMO_DAYS[state.pomoDayIndex] });
    const subjects = Array.isArray(result?.subjects) ? result.subjects : [];
    state.pomoSubjects = subjects.map(s => ({ ...s }));
    state.pomoSubjectsOriginal = JSON.stringify(subjects);
    state.pomoDirty = false;
  } catch {
    state.pomoSubjects = [];
    state.pomoSubjectsOriginal = "[]";
  }
  pomoRenderSubjects();
}

function pomoFlattenSubjects() {
  const flat = [];
  state.pomoSubjects.forEach((s) => {
    const name = s.matière || s.matiere || "";
    const count = Number(s.nb_fois) || 1;
    for (let j = 0; j < count; j++) {
      flat.push({ name, instance: j });
    }
  });
  return flat;
}

function pomoRenderSubjects() {
  pomoUpdateDayLabel();
  const listEl = document.querySelector("[data-pomo-subjects]");
  if (!listEl) return;
  const isToday = pomoIsToday();
  const flat = pomoFlattenSubjects();
  if (flat.length === 0) {
    listEl.innerHTML = `<p class="state-msg">No subjects for this day.</p>`;
    return;
  }
  listEl.innerHTML = flat
    .map((item, i) => {
      const checkedCount = Number(state.pomoChecked[item.name]) || 0;
      const subject = state.pomoSubjects.find(
        (s) => (s.matière || s.matiere || "") === item.name
      );
      const quantity = subject ? Number(subject.nb_fois) || 1 : 1;
      const isChecked = isToday && item.instance < checkedCount;
      return `
        <label class="pomo-subject">
          <input type="checkbox" ${isChecked ? "checked" : ""} ${isToday ? "" : "disabled"}
            data-pomo-check="${i}" data-pomo-subj-name="${escapeHtml(item.name)}" />
          <span class="pomo-subject-name">${escapeHtml(item.name)}${quantity > 1 ? ` <span class="pomo-subject-count">×${quantity}</span>` : ""}</span>
        </label>`;
    })
    .join("");
}

/* --- Three-dots menu --- */
function pomoToggleMenu() {
  const menu = document.querySelector("[data-pomo-menu]");
  if (!menu) return;
  if (menu.hasAttribute("hidden")) {
    menu.removeAttribute("hidden");
    pomoRenderMenu();
  } else {
    menu.setAttribute("hidden", "");
  }
}

function pomoRenderMenu() {
  const listEl = document.querySelector("[data-pomo-menu-list]");
  if (!listEl) return;
  if (state.pomoSubjects.length === 0) {
    listEl.innerHTML = `<p class="pomo-menu-empty">No subjects yet.</p>`;
  } else {
    listEl.innerHTML = state.pomoSubjects
      .map((s, i) => {
        const name = escapeHtml(s.matière || s.matiere || "");
        const count = Number(s.nb_fois) || 1;
        return `
          <div class="pomo-menu-item">
            <div class="pomo-menu-item-main">
              <span class="pomo-menu-item-name">${name}</span>
              <label class="pomo-menu-item-count">
                <span>Times</span>
                <input type="number" min="1" max="99" value="${count}" data-pomo-count-input="${i}" />
              </label>
            </div>
            <button class="pomo-menu-remove" type="button" data-pomo-remove="${i}" aria-label="Remove ${name}">&times;</button>
          </div>`;
      })
      .join("");
  }
  listEl.querySelectorAll("[data-pomo-count-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = parseInt(input.dataset.pomoCountInput, 10);
      const entry = state.pomoSubjects[idx];
      if (!entry) return;
      let value = parseInt(input.value, 10);
      if (!Number.isFinite(value) || value < 1) value = 1;
      value = Math.min(99, value);
      entry.nb_fois = value;
      input.value = String(value);
      state.pomoDirty = true;
      pomoRenderSubjects();
      pomoRenderMenu();
    });
  });
  listEl.querySelectorAll("[data-pomo-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.pomoRemove, 10);
      const entry = state.pomoSubjects[idx];
      if (!entry) return;
      const count = Number(entry.nb_fois) || 1;
      if (count <= 1) {
        state.pomoSubjects.splice(idx, 1);
      } else {
        entry.nb_fois = count - 1;
      }
      state.pomoDirty = true;
      pomoRenderSubjects();
      pomoRenderMenu();
    });
  });
}

function pomoAddSubject() {
  const input = document.querySelector("[data-pomo-add-input]");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const existing = state.pomoSubjects.find(
    (s) => (s.matière || s.matiere || "").toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    existing.nb_fois = (Number(existing.nb_fois) || 1) + 1;
  } else {
    state.pomoSubjects.push({ "matière": name, nb_fois: 1 });
  }
  input.value = "";
  state.pomoDirty = true;
  pomoRenderSubjects();
  pomoRenderMenu();
}

async function pomoSave() {
  const saveBtn = document.querySelector("[data-pomo-save]");
  if (!saveBtn || saveBtn.disabled) return;

  saveBtn.textContent = "Saving…";
  saveBtn.disabled = true;
  state.pomoSaveCooldown = Date.now() + 5000;

  try {
    const result = await pomoPost("save-subjects", {
      day: POMO_DAYS[state.pomoDayIndex],
      subjects: state.pomoSubjects,
    });
    if (result && result.error) {
      throw new Error(result.error);
    }
    state.pomoSubjectsOriginal = JSON.stringify(state.pomoSubjects);
    state.pomoDirty = false;
    if (saveBtn) saveBtn.textContent = "Saved!";
    setTimeout(() => { if (saveBtn) saveBtn.textContent = "Save"; }, 1500);
  } catch (err) {
    if (saveBtn) saveBtn.textContent = "Error!";
    setTimeout(() => { if (saveBtn) saveBtn.textContent = "Save"; }, 2000);
    console.error("Pomodoro save failed:", err);
  }

  setTimeout(() => {
    if (!saveBtn) return;
    if (Date.now() >= state.pomoSaveCooldown) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  }, 5000);
}

function pomoCloseMenuOnOutsideClick(e) {
  const menu = document.querySelector("[data-pomo-menu]");
  const toggle = document.querySelector("[data-pomo-menu-toggle]");
  if (!menu || menu.hasAttribute("hidden")) return;
  if (toggle && toggle.contains(e.target)) return;
  if (menu.contains(e.target)) return;
  menu.setAttribute("hidden", "");
}

function initPomodoro() {
  const startBtn = document.querySelector("[data-pomo-start]");
  const resetBtn = document.querySelector("[data-pomo-reset]");
  const durationInput = document.querySelector("[data-pomo-duration]");
  const prevBtn = document.querySelector("[data-pomo-prev]");
  const nextBtn = document.querySelector("[data-pomo-next]");
  const menuToggle = document.querySelector("[data-pomo-menu-toggle]");
  const menu = document.querySelector("[data-pomo-menu]");
  const addBtn = document.querySelector("[data-pomo-add-btn]");
  const addInput = document.querySelector("[data-pomo-add-input]");
  const saveBtn = document.querySelector("[data-pomo-save]");
  const ring = document.querySelector("[data-pomo-ring]");
  const subjectsList = document.querySelector("[data-pomo-subjects]");

  if (menu) menu.setAttribute("hidden", "");
  if (ring) {
    ring.style.strokeDasharray = String(POMO_CIRCUMFERENCE);
    ring.style.strokeDashoffset = "0";
  }

  if (startBtn) startBtn.addEventListener("click", pomoStartTimer);
  if (resetBtn) resetBtn.addEventListener("click", pomoResetTimer);
  if (durationInput) durationInput.addEventListener("change", pomoOnDurationChange);
  if (prevBtn) prevBtn.addEventListener("click", () => pomoChangeDay(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => pomoChangeDay(1));
  if (menuToggle) {
    menuToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pomoToggleMenu();
    });
  }
  if (addBtn) addBtn.addEventListener("click", pomoAddSubject);
  if (addInput) addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") pomoAddSubject(); });
  if (saveBtn) saveBtn.addEventListener("click", pomoSave);

  if (subjectsList) {
    subjectsList.addEventListener("change", async (e) => {
      const cb = e.target;
      if (!cb.matches("[data-pomo-check]")) return;
      if (!pomoIsToday()) { cb.checked = false; return; }
      const name = cb.dataset.pomoSubjName;
      if (!name) return;
      if (cb.checked) {
        state.pomoChecked[name] = (Number(state.pomoChecked[name]) || 0) + 1;
      } else {
        const cur = (Number(state.pomoChecked[name]) || 0) - 1;
        if (cur <= 0) { delete state.pomoChecked[name]; } else { state.pomoChecked[name] = cur; }
      }
      await pomoPost("set-checked", { checked: state.pomoChecked });
    });
  }

  document.addEventListener("click", pomoCloseMenuOnOutsideClick);
  document.addEventListener("pointerdown", pomoCloseMenuOnOutsideClick);
  pomoUpdateTimerDisplay();
  pomoUpdateCounterDisplay();
}

async function loadPomodoro() {
  const [stateResult] = await Promise.all([
    pomoPost("get-state", {}).catch(() => null),
    pomoLoadSubjects(),
  ]);
  if (stateResult) {
    state.pomoTimerCount = stateResult.timerCount || 0;
    const raw = stateResult.checked;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      state.pomoChecked = raw;
    } else {
      state.pomoChecked = {};
    }
    pomoUpdateCounterDisplay();
    pomoRenderSubjects();
  }
}

/* ===================== BOOT ===================== */
async function loadAll() {
  updateSyncTime();

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  const pomoPromise = loadPomodoro();
  const tasks = [
    ["grades", () => edGet("grades")],
    ["timetable", () => edGet("timetable")],
    ["homeworks", () => edGet("homeworks")],
    ["newGrades", () => edGet("new-grades")],
  ];
  for (const [key, fn] of tasks) {
    try {
      state[key] = await fn();
    } catch (err) {
      state[key] = { error: err?.message || "Unknown error" };
    }
    await sleep(5);
  }
  
  renderNewGradesCard();
  renderHomeworksCard();
  renderTomorrowCard();
  renderNotes();
  renderTimetable();
  renderHomeworks();
  await pomoPromise;
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
  initPomodoro();
  loadAll();
}

document.addEventListener("DOMContentLoaded", boot);
window.addEventListener("site-navbar:refresh", (event) => {
  const done = loadAll();
  event.detail?.waitUntil?.(done);
});
window.addEventListener("scroll", hideTooltip, true);
