import { authedFetch } from "/lib/auth.js";

const ED_BASE = "/api/ed";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const state = {
  grades: null,
  trimester: "trimestre1",
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/* ===================== BOOT ===================== */
async function loadGrades() {
  try {
    state.grades = await edGet("grades");
  } catch (err) {
    state.grades = { error: err?.message || "Unknown error" };
  }
  renderNotes();
}

function boot() {
  setupSegmented(document.querySelector("[data-trimester]"), (btn) => {
    state.trimester = btn.dataset.period;
    renderNotes();
  });
  loadGrades();
}

document.addEventListener("DOMContentLoaded", boot);
window.addEventListener("site-navbar:refresh", (event) => {
  const done = loadGrades();
  event.detail?.waitUntil?.(done);
});
window.addEventListener("scroll", hideTooltip, true);
