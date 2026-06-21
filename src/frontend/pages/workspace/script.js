<<<<<<< HEAD:src/frontend/pages/workspace/script.js
const API_ROOT = "/api/ed";
=======
const API_ROOT = `/api/ed`;
>>>>>>> b508cf2c9dc079ad6c86041e20524a65e8fba44f:src/frontend/pages/ed/script.js

const state = {
  currentView: "home",
  menuOpen: false,
  activeTerm: "trimestre1",
  homeworkFilter: "all",
  homeworkSearch: "",
  selectedGradeId: null,
  loading: {
    home: false,
    grades: false,
    homeworks: false,
    planning: false,
  },
  loaded: {
    home: false,
    grades: false,
    homeworks: false,
    planning: false,
  },
  data: {
    newGrades: null,
    grades: null,
    homeworks: null,
    timetable: null,
  },
  optimisticDone: new Map(),
};

const labels = {
  home: "Accueil",
  grades: "Notes",
  homeworks: "Devoirs",
  planning: "Planning",
  trimestre1: "Trimestre 1",
  trimestre2: "Trimestre 2",
  trimestre3: "Trimestre 3",
  semaineA: "Semaine actuelle",
  semaineB: "Semaine prochaine",
};

const dayNames = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const orderedSchoolDays = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  collectDom();
  bindEvents();
  setMenu(false);
  switchView("home");
  loadHome();
});

window.addEventListener("site-navbar:refresh", () => {
  void refreshWorkspace();
});

function collectDom() {
  dom.shell = document.querySelector(".app-shell");
  dom.sideMenu = document.getElementById("sideMenu");
  dom.menuScrim = document.getElementById("menuScrim");
  dom.menuToggle = document.getElementById("menuToggle");
  dom.menuStatus = document.getElementById("menuStatus");
  dom.pageTitle = document.getElementById("pageTitle");
  dom.refreshViewButton = document.getElementById("refreshViewButton");
  dom.viewPanels = Array.from(document.querySelectorAll(".view-panel"));
  dom.menuItems = Array.from(document.querySelectorAll("[data-view-target]"));
  dom.refreshButtons = Array.from(document.querySelectorAll("[data-refresh]"));
  dom.tabButtons = Array.from(document.querySelectorAll("[data-term]"));
  dom.homeworkFilterButtons = Array.from(document.querySelectorAll("[data-homework-filter]"));
  dom.homeworkSearch = document.getElementById("homeworkSearch");
  dom.newGradesCount = document.getElementById("newGradesCount");
  dom.newGradesSummary = document.getElementById("newGradesSummary");
  dom.newGradesState = document.getElementById("newGradesState");
  dom.newGradesList = document.getElementById("newGradesList");
  dom.newGradesMiniCount = document.getElementById("newGradesMiniCount");
  dom.pendingHomeworksCount = document.getElementById("pendingHomeworksCount");
  dom.pendingHomeworksSummary = document.getElementById("pendingHomeworksSummary");
  dom.pendingHomeworksState = document.getElementById("pendingHomeworksState");
  dom.pendingHomeworksList = document.getElementById("pendingHomeworksList");
  dom.pendingHomeworksMiniCount = document.getElementById("pendingHomeworksMiniCount");
  dom.gradesList = document.getElementById("gradesList");
  dom.gradeDetail = document.getElementById("gradeDetail");
  dom.homeworksList = document.getElementById("homeworksList");
  dom.tomorrowTitle = document.getElementById("tomorrowTitle");
  dom.tomorrowSubjects = document.getElementById("tomorrowSubjects");
  dom.weekA = document.getElementById("weekA");
  dom.weekB = document.getElementById("weekB");
  dom.weekACount = document.getElementById("weekACount");
  dom.weekBCount = document.getElementById("weekBCount");
  dom.toastZone = document.getElementById("toastZone");
}

function bindEvents() {
  dom.menuToggle.addEventListener("click", () => {
    setMenu(!state.menuOpen);
  });

  dom.menuScrim.addEventListener("click", () => {
    setMenu(false);
  });

  dom.menuItems.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.viewTarget;
      switchView(target);
      setMenu(false);
    });
  });

  dom.refreshViewButton.addEventListener("click", () => {
    void refreshWorkspace();
  });

  dom.refreshButtons.forEach((button) => {
    button.addEventListener("click", () => {
      refreshView(button.dataset.refresh);
    });
  });

  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTerm = button.dataset.term;
      state.selectedGradeId = null;
      renderTermButtons();
      renderGrades();
    });
  });

  dom.homeworkFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.homeworkFilter = button.dataset.homeworkFilter;
      renderHomeworkFilters();
      renderHomeworks();
    });
  });

  dom.homeworkSearch.addEventListener("input", () => {
    state.homeworkSearch = dom.homeworkSearch.value.trim().toLowerCase();
    renderHomeworks();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.menuOpen) {
      setMenu(false);
    }
  });
}

async function refreshWorkspace() {
  if (Object.values(state.loading).some(Boolean)) return;

  state.activeTerm = "trimestre1";
  state.homeworkFilter = "all";
  state.homeworkSearch = "";
  state.selectedGradeId = null;
  state.loading = {
    home: false,
    grades: false,
    homeworks: false,
    planning: false,
  };
  state.loaded = {
    home: false,
    grades: false,
    homeworks: false,
    planning: false,
  };
  state.data = {
    newGrades: null,
    grades: null,
    homeworks: null,
    timetable: null,
  };
  state.optimisticDone = new Map();

  if (dom.homeworkSearch) {
    dom.homeworkSearch.value = "";
  }

  renderTermButtons();
  renderHomeworkFilters();
  setHomeLoading();
  dom.gradesList.innerHTML = loadingMarkup("Chargement des notes");
  dom.homeworksList.innerHTML = loadingMarkup("Chargement des devoirs");
  dom.tomorrowSubjects.innerHTML = loadingInlineMarkup();
  dom.weekA.innerHTML = loadingMarkup("Chargement de la semaine actuelle");
  dom.weekB.innerHTML = loadingMarkup("Chargement de la semaine prochaine");

  setMenu(false);
  switchView("home");

  await Promise.all([
    loadGrades(true),
    loadHomeworks(true),
    loadPlanning(true),
  ]);
  await loadHome();
}

function setMenu(open) {
  state.menuOpen = open;
  dom.shell.dataset.menuState = open ? "open" : "closed";
  dom.menuToggle.setAttribute("aria-expanded", String(open));
  dom.menuToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  dom.menuScrim.hidden = !open;
}

function switchView(view) {
  if (!labels[view]) return;
  state.currentView = view;
  dom.pageTitle.textContent = labels[view];
  dom.viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.view === view);
  });
  dom.menuItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === view);
  });
  ensureViewData(view);
}

function ensureViewData(view) {
  if (view === "home" && !state.loaded.home && !state.loading.home) {
    loadHome();
  }
  if (view === "grades" && !state.loaded.grades && !state.loading.grades) {
    loadGrades();
  }
  if (view === "homeworks" && !state.loaded.homeworks && !state.loading.homeworks) {
    loadHomeworks();
  }
  if (view === "planning" && !state.loaded.planning && !state.loading.planning) {
    loadPlanning();
  }
}

function refreshView(view) {
  if (view === "home") loadHome(true);
  if (view === "grades") loadGrades(true);
  if (view === "homeworks") loadHomeworks(true);
  if (view === "planning") loadPlanning(true);
}

async function requestEd(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  const requestOptions = {
    method: options.method || "GET",
    headers,
  };

  if (options.filter === true) {
    headers.filter = "true";
  }

  if (options.body) {
    headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_ROOT}/${path}`, requestOptions);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Réponse illisible pour ${path}`);
  }

  if (!response.ok) {
    throw new Error(json?.error || `Erreur API ${response.status}`);
  }

  if (json?.error) {
    throw new Error(json.error);
  }

  return json?.resp ?? json;
}

async function loadHome(force = false) {
  if (state.loading.home) return;
  state.loading.home = true;
  setStatus("Chargement de l'accueil");
  setHomeLoading();

  try {
    const [newGrades, homeworks] = await Promise.all([
      requestEd("new-grades", { filter: true }),
      force || !state.data.homeworks
        ? requestEd("homeworks", { filter: true })
        : Promise.resolve(state.data.homeworks),
    ]);

    state.data.newGrades = normalizeNewGrades(newGrades);
    state.data.homeworks = homeworks;
    state.loaded.home = true;
    state.loaded.homeworks = true;
    renderHome();
    renderHomeworks();
    setStatus("Accueil à jour");
  } catch (error) {
    renderHomeError(error);
    setStatus("Erreur de chargement");
    toast("Impossible de charger l'accueil", error.message, "error");
  } finally {
    state.loading.home = false;
  }
}

async function loadGrades(force = false) {
  if (state.loading.grades) return;
  state.loading.grades = true;
  state.loaded.grades = force ? false : state.loaded.grades;
  setStatus("Chargement des notes");
  dom.gradesList.innerHTML = loadingMarkup("Chargement des notes");

  try {
    const grades = await requestEd("grades", { filter: true });
    state.data.grades = grades;
    state.loaded.grades = true;
    renderGrades();
    setStatus("Notes à jour");
  } catch (error) {
    dom.gradesList.innerHTML = errorMarkup("Impossible de charger les notes", error.message);
    setStatus("Erreur de chargement");
    toast("Notes indisponibles", error.message, "error");
  } finally {
    state.loading.grades = false;
  }
}

async function loadHomeworks(force = false) {
  if (state.loading.homeworks) return;
  state.loading.homeworks = true;
  state.loaded.homeworks = force ? false : state.loaded.homeworks;
  setStatus("Chargement des devoirs");
  dom.homeworksList.innerHTML = loadingMarkup("Chargement des devoirs");

  try {
    const homeworks = await requestEd("homeworks", { filter: true });
    state.data.homeworks = homeworks;
    state.loaded.homeworks = true;
    renderHomeworks();
    renderHome();
    setStatus("Devoirs à jour");
  } catch (error) {
    dom.homeworksList.innerHTML = errorMarkup("Impossible de charger les devoirs", error.message);
    setStatus("Erreur de chargement");
    toast("Devoirs indisponibles", error.message, "error");
  } finally {
    state.loading.homeworks = false;
  }
}

async function loadPlanning(force = false) {
  if (state.loading.planning) return;
  state.loading.planning = true;
  state.loaded.planning = force ? false : state.loaded.planning;
  setStatus("Chargement du planning");
  dom.tomorrowSubjects.innerHTML = loadingInlineMarkup();
  dom.weekA.innerHTML = loadingMarkup("Chargement de la semaine actuelle");
  dom.weekB.innerHTML = loadingMarkup("Chargement de la semaine prochaine");

  try {
    const timetable = await requestEd("timetable", { filter: true });
    state.data.timetable = timetable;
    state.loaded.planning = true;
    renderPlanning();
    setStatus("Planning à jour");
  } catch (error) {
    dom.tomorrowSubjects.innerHTML = "";
    dom.weekA.innerHTML = errorMarkup("Impossible de charger le planning", error.message);
    dom.weekB.innerHTML = "";
    setStatus("Erreur de chargement");
    toast("Planning indisponible", error.message, "error");
  } finally {
    state.loading.planning = false;
  }
}

function setStatus(text) {
  const dot = dom.menuStatus.querySelector(".status-dot");
  const label = dom.menuStatus.querySelector("span:last-child");
  label.textContent = text;
  dot.style.background = text.toLowerCase().includes("erreur") ? "var(--rose)" : "var(--green)";
}

function setHomeLoading() {
  dom.newGradesCount.textContent = "--";
  dom.pendingHomeworksCount.textContent = "--";
  dom.newGradesSummary.textContent = "Chargement des dernières notes.";
  dom.pendingHomeworksSummary.textContent = "Chargement des devoirs à venir.";
  dom.newGradesState.textContent = "API";
  dom.pendingHomeworksState.textContent = "API";
  dom.newGradesList.innerHTML = loadingMarkup("Chargement des notes", true);
  dom.pendingHomeworksList.innerHTML = loadingMarkup("Chargement des devoirs", true);
}

function renderHome() {
  const newGrades = Array.isArray(state.data.newGrades) ? state.data.newGrades : [];
  const pendingHomeworks = getFlatHomeworks()
    .filter((homework) => !homework.done)
    .slice(0, 6);

  dom.newGradesCount.textContent = String(newGrades.length);
  dom.newGradesMiniCount.textContent = `${newGrades.length} élément${plural(newGrades.length)}`;
  dom.newGradesState.textContent = "OK";
  dom.newGradesSummary.textContent =
    newGrades.length === 0
      ? "Aucune nouvelle note détectée pour le moment."
      : `${newGrades.length} nouvelle${plural(newGrades.length)} note${plural(newGrades.length)} à consulter.`;

  dom.pendingHomeworksCount.textContent = String(getFlatHomeworks().filter((item) => !item.done).length);
  dom.pendingHomeworksMiniCount.textContent = `${pendingHomeworks.length} affiché${plural(pendingHomeworks.length)}`;
  dom.pendingHomeworksState.textContent = "OK";
  dom.pendingHomeworksSummary.textContent =
    pendingHomeworks.length === 0
      ? "Tout est classé comme fait ou aucun devoir futur n'est présent."
      : "Les prochains devoirs non faits sont listés juste en dessous.";

  renderNewGradesMiniList(newGrades);
  renderPendingHomeworksMiniList(pendingHomeworks);
}

function renderHomeError(error) {
  dom.newGradesCount.textContent = "!";
  dom.pendingHomeworksCount.textContent = "!";
  dom.newGradesState.textContent = "ERR";
  dom.pendingHomeworksState.textContent = "ERR";
  dom.newGradesSummary.textContent = error.message;
  dom.pendingHomeworksSummary.textContent = error.message;
  dom.newGradesList.innerHTML = errorMarkup("Nouvelles notes indisponibles", error.message, true);
  dom.pendingHomeworksList.innerHTML = errorMarkup("Devoirs indisponibles", error.message, true);
}

function renderNewGradesMiniList(items) {
  if (!items.length) {
    dom.newGradesList.innerHTML = emptyMarkup("Aucune nouvelle note");
    return;
  }

  dom.newGradesList.innerHTML = items.slice(0, 6).map((item) => {
    const score = formatScore(item.note, item.noteSur);
    return `
      <div class="mini-item">
        <strong>${escapeHtml(item.matiere || "Matière")}</strong>
        <span>${escapeHtml(score)}</span>
        <small>${escapeHtml(item.titre || labels[item.periode] || "Nouvelle note")}</small>
      </div>
    `;
  }).join("");
}

function renderPendingHomeworksMiniList(items) {
  if (!items.length) {
    dom.pendingHomeworksList.innerHTML = emptyMarkup("Aucun devoir non fait");
    return;
  }

  dom.pendingHomeworksList.innerHTML = items.map((item) => `
    <div class="mini-item">
      <strong>${escapeHtml(item.subject)}</strong>
      <span>${escapeHtml(formatShortDate(item.date))}</span>
      <small>${escapeHtml(item.content || "Aucun contenu détaillé")}</small>
    </div>
  `).join("");
}

function renderTermButtons() {
  dom.tabButtons.forEach((button) => {
    const active = button.dataset.term === state.activeTerm;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderGrades() {
  renderTermButtons();

  const grades = state.data.grades;
  const term = grades?.[state.activeTerm];

  if (!grades) {
    dom.gradesList.innerHTML = loadingMarkup("Chargement des notes");
    return;
  }

  if (!term || typeof term !== "object" || Object.keys(term).length === 0) {
    dom.gradesList.innerHTML = emptyMarkup(`Aucune note pour ${labels[state.activeTerm].toLowerCase()}`);
    resetGradeDetail();
    return;
  }

  const groups = Object.entries(term)
    .filter(([, notes]) => Array.isArray(notes))
    .sort(([a], [b]) => a.localeCompare(b, "fr"));

  dom.gradesList.innerHTML = groups.map(([subject, notes]) => renderSubjectGrades(subject, notes)).join("");
  bindGradeRows();
  renderSelectedGradeDetail();
}

function renderSubjectGrades(subject, notes) {
  const sortedNotes = [...notes].sort((a, b) => compareDatesDesc(a.dateSaisie || a.date, b.dateSaisie || b.date));
  const average = computeSubjectAverage(sortedNotes);
  const averageLabel = average === null ? "Moyenne non calculable" : `Moyenne ${formatDecimal(average)}/20`;

  return `
    <article class="subject-group">
      <div class="subject-header">
        <h3>${escapeHtml(subject)}</h3>
        <span>${escapeHtml(averageLabel)}</span>
      </div>
      ${sortedNotes.map((note, index) => renderGradeRow(subject, note, index)).join("")}
    </article>
  `;
}

function renderGradeRow(subject, note, index) {
  const id = gradeId(state.activeTerm, subject, note, index);
  const title = note.titre || "Évaluation";
  const date = note.date || note.dateSaisie || "";
  const selected = state.selectedGradeId === id ? " is-selected" : "";

  return `
    <button class="grade-row${selected}" type="button" data-grade-id="${escapeAttribute(id)}">
      <span class="grade-row-title">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(formatLongDate(date))}</span>
      </span>
      <span class="grade-pill">${escapeHtml(formatScore(note.note, note.noteSur))}</span>
    </button>
  `;
}

function bindGradeRows() {
  dom.gradesList.querySelectorAll("[data-grade-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedGradeId = button.dataset.gradeId;
      renderGrades();
    });
  });
}

function renderSelectedGradeDetail() {
  if (!state.selectedGradeId) {
    resetGradeDetail();
    return;
  }

  const grade = findGradeById(state.selectedGradeId);
  if (!grade) {
    resetGradeDetail();
    return;
  }

  const counts = countsInAverage(grade.note);
  dom.gradeDetail.innerHTML = `
    <div class="detail-card">
      <div>
        <p class="eyebrow">${escapeHtml(labels[grade.term] || "Trimestre")}</p>
        <h3>${escapeHtml(grade.subject)}</h3>
      </div>
      <div class="detail-score">
        <strong>${escapeHtml(formatScore(grade.note.note, grade.note.noteSur))}</strong>
        <span>${escapeHtml(grade.note.titre || "Évaluation")}</span>
      </div>
      <div class="detail-lines">
        <div class="detail-line">
          <span>Date</span>
          <span>${escapeHtml(formatLongDate(grade.note.date || grade.note.dateSaisie))}</span>
        </div>
        <div class="detail-line">
          <span>Compte dans la moyenne</span>
          <span>${counts ? "Oui" : "Non"}</span>
        </div>
        <div class="detail-line">
          <span>Coefficient</span>
          <span>${escapeHtml(formatCoefficient(grade.note.coefficient))}</span>
        </div>
        <div class="detail-line">
          <span>Moyenne de classe</span>
          <span>${escapeHtml(formatMaybeScore(grade.note.moyenne))}</span>
        </div>
        <div class="detail-line">
          <span>Minimum</span>
          <span>${escapeHtml(formatMaybeScore(grade.note.min))}</span>
        </div>
        <div class="detail-line">
          <span>Maximum</span>
          <span>${escapeHtml(formatMaybeScore(grade.note.max))}</span>
        </div>
      </div>
    </div>
  `;
}

function resetGradeDetail() {
  dom.gradeDetail.innerHTML = `
    <div class="empty-detail">
      <span class="empty-symbol" aria-hidden="true">N</span>
      <h3>Sélectionne une note</h3>
      <p>La date, le coefficient et l'impact sur la moyenne apparaîtront ici.</p>
    </div>
  `;
}

function renderHomeworkFilters() {
  dom.homeworkFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.homeworkFilter === state.homeworkFilter);
  });
}

function renderHomeworks() {
  renderHomeworkFilters();

  if (!state.data.homeworks) {
    dom.homeworksList.innerHTML = loadingMarkup("Chargement des devoirs");
    return;
  }

  const grouped = groupHomeworksForRender();
  const dates = Object.keys(grouped).sort();

  if (!dates.length) {
    dom.homeworksList.innerHTML = emptyMarkup("Aucun devoir ne correspond au filtre");
    return;
  }

  dom.homeworksList.innerHTML = dates.map((date) => renderHomeworkDay(date, grouped[date])).join("");
  bindHomeworkActions();
}

function groupHomeworksForRender() {
  const result = {};
  const query = state.homeworkSearch;

  getFlatHomeworks().forEach((homework) => {
    if (state.homeworkFilter === "pending" && homework.done) return;
    if (state.homeworkFilter === "done" && !homework.done) return;

    if (query) {
      const haystack = `${homework.subject} ${homework.content}`.toLowerCase();
      if (!haystack.includes(query)) return;
    }

    if (!result[homework.date]) {
      result[homework.date] = [];
    }
    result[homework.date].push(homework);
  });

  return result;
}

function renderHomeworkDay(date, items) {
  const doneCount = items.filter((item) => item.done).length;
  const countLabel = `${doneCount}/${items.length} fait${plural(doneCount)}`;

  return `
    <article class="day-group">
      <div class="day-header">
        <h3>${escapeHtml(formatLongDate(date))}</h3>
        <span>${escapeHtml(countLabel)}</span>
      </div>
      ${items.map(renderHomeworkCard).join("")}
    </article>
  `;
}

function renderHomeworkCard(homework) {
  const doneClass = homework.done ? " is-done" : "";
  const doneText = homework.done ? "Fait" : "Non fait";
  const actionText = homework.done ? "Marquer non fait" : "Marquer fait";
  const disabled = isValidHomeworkId(homework.id) ? "" : " disabled";
  const title = disabled ? "L'identifiant de ce devoir ne peut pas être envoyé à l'API." : "";

  return `
    <article class="homework-card">
      <div class="homework-main">
        <div class="homework-subject">
          <strong>${escapeHtml(homework.subject)}</strong>
          <span class="state-badge${doneClass}">${doneText}</span>
        </div>
        <p class="homework-content">${escapeHtml(homework.content || "Aucun contenu détaillé")}</p>
      </div>
      <button class="homework-action${doneClass}" type="button" data-homework-id="${escapeAttribute(homework.id)}"${disabled} title="${escapeAttribute(title)}">
        ${actionText}
      </button>
    </article>
  `;
}

function bindHomeworkActions() {
  dom.homeworksList.querySelectorAll("[data-homework-id]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleHomeworkDone(button.dataset.homeworkId);
    });
  });
}

async function toggleHomeworkDone(id) {
  const homework = getFlatHomeworks().find((item) => String(item.id) === String(id));
  if (!homework || !isValidHomeworkId(id)) return;

  const nextDone = !homework.done;
  state.optimisticDone.set(String(id), nextDone);
  renderHomeworks();
  renderHome();

  try {
    await requestEd("homeworks", {
      method: "POST",
      body: {
        id: String(id),
        done: String(nextDone),
      },
    });
    toast("Devoir mis à jour", nextDone ? "Classé comme fait." : "Classé comme non fait.");
  } catch (error) {
    state.optimisticDone.delete(String(id));
    renderHomeworks();
    renderHome();
    toast("Mise à jour impossible", error.message, "error");
  }
}

function renderPlanning() {
  const timetable = state.data.timetable;

  if (!timetable) {
    dom.weekA.innerHTML = loadingMarkup("Chargement de la semaine actuelle");
    dom.weekB.innerHTML = loadingMarkup("Chargement de la semaine prochaine");
    return;
  }

  renderTomorrowSubjects(timetable);
  renderWeek("semaineA", dom.weekA, dom.weekACount);
  renderWeek("semaineB", dom.weekB, dom.weekBCount);
}

function renderTomorrowSubjects(timetable) {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowDay = dayNames[tomorrow.getDay()];
  const weekKey = isNextWeek(tomorrow) ? "semaineB" : "semaineA";
  const lessons = normalizeCourses(timetable?.[weekKey]?.[tomorrowDay] || []);
  const subjects = unique(lessons.map(getCourseSubject).filter(Boolean));

  dom.tomorrowTitle.textContent = `Matières de ${tomorrowDay}`;

  if (!subjects.length) {
    dom.tomorrowSubjects.innerHTML = `<span class="subject-chip">Aucune matière trouvée</span>`;
    return;
  }

  dom.tomorrowSubjects.innerHTML = subjects.map((subject) => `
    <span class="subject-chip">${escapeHtml(subject)}</span>
  `).join("");
}

function renderWeek(weekKey, target, counter) {
  const week = state.data.timetable?.[weekKey] || {};
  const days = orderedSchoolDays.filter((day) => Array.isArray(week[day]));
  const total = days.reduce((sum, day) => sum + normalizeCourses(week[day]).length, 0);

  counter.textContent = `${total} cours`;

  if (!days.length) {
    target.innerHTML = emptyMarkup("Aucune donnée pour cette semaine");
    return;
  }

  target.innerHTML = days.map((day) => renderWeekDay(day, normalizeCourses(week[day]))).join("");
}

function renderWeekDay(day, courses) {
  const count = courses.length;
  return `
    <section class="week-day">
      <div class="week-day-header">
        <strong>${escapeHtml(day)}</strong>
        <span>${count} cours</span>
      </div>
      <div class="course-list">
        ${count ? courses.map(renderCourse).join("") : `<div class="course-item"><span class="course-time">Libre</span><span class="course-name"><strong>Aucun cours</strong></span></div>`}
      </div>
    </section>
  `;
}

function renderCourse(course) {
  const subject = getCourseSubject(course) || "Matière";
  const room = course.salle || course.room || course.lieu || "";
  const teacher = course.prof || course.professeur || course.enseignant || "";
  const detail = [room, teacher].filter(Boolean).join(" · ");
  const start = course.start_date || course.dateDebut || course.debut || course.heureDebut || "";
  const end = course.end_date || course.dateFin || course.fin || course.heureFin || "";

  return `
    <div class="course-item">
      <span class="course-time">${escapeHtml(formatCourseTime(start, end))}</span>
      <span class="course-name">
        <strong>${escapeHtml(subject)}</strong>
        ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
      </span>
    </div>
  `;
}

function normalizeNewGrades(payload) {
  if (Array.isArray(payload)) return payload;

  const result = [];
  if (!payload || typeof payload !== "object") return result;

  Object.entries(payload).forEach(([periode, subjects]) => {
    if (!subjects || typeof subjects !== "object") return;
    Object.entries(subjects).forEach(([matiere, notes]) => {
      if (!Array.isArray(notes)) return;
      notes.forEach((note) => {
        result.push({
          ...note,
          periode,
          matiere,
        });
      });
    });
  });

  return result.sort((a, b) => compareDatesDesc(a.dateSaisie || a.date, b.dateSaisie || b.date));
}

function getFlatHomeworks() {
  const source = state.data.homeworks;
  const data = source?.data || source;
  const result = [];

  if (!data || typeof data !== "object") return result;

  Object.entries(data).forEach(([date, items]) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const id = String(item.idDevoir || item.id || item.idDevoirs || "");
      const originalDone = Boolean(item.effectue || item.fait || item.done);
      const done = state.optimisticDone.has(id) ? state.optimisticDone.get(id) : originalDone;
      result.push({
        id,
        date,
        subject: item.matiere || item.libelleMatiere || item.nomMatiere || item.discipline || "Matière",
        content: item.contenu || item.aFaire?.contenu || item.description || item.titre || "",
        done,
        raw: item,
      });
    });
  });

  return result
    .filter((item) => isFutureOrToday(item.date))
    .sort((a, b) => compareDatesAsc(a.date, b.date));
}

function normalizeCourses(courses) {
  if (!Array.isArray(courses)) return [];
  return courses
    .filter((course) => !isCancelledCourse(course))
    .sort((a, b) => String(a.start_date || a.dateDebut || a.debut || "").localeCompare(String(b.start_date || b.dateDebut || b.debut || "")));
}

function isCancelledCourse(course) {
  const status = String(course?.status || course?.etat || course?.typeCours || "").toLowerCase();
  return status.includes("annul") || course?.isAnnule === true || course?.annule === true;
}

function getCourseSubject(course) {
  return (
    course?.matiere ||
    course?.text ||
    course?.libelleMatiere ||
    course?.discipline ||
    course?.title ||
    course?.nomMatiere ||
    ""
  );
}

function findGradeById(id) {
  const grades = state.data.grades;
  if (!grades) return null;

  for (const term of ["trimestre1", "trimestre2", "trimestre3"]) {
    const subjects = grades[term];
    if (!subjects || typeof subjects !== "object") continue;
    for (const [subject, notes] of Object.entries(subjects)) {
      if (!Array.isArray(notes)) continue;
      for (let index = 0; index < notes.length; index += 1) {
        const note = notes[index];
        if (gradeId(term, subject, note, index) === id) {
          return {
            term,
            subject,
            note,
          };
        }
      }
    }
  }

  return null;
}

function gradeId(term, subject, note, index) {
  return [
    term,
    subject,
    note?.dateSaisie || "",
    note?.date || "",
    note?.titre || "",
    note?.note || "",
    index,
  ].join("::");
}

function computeSubjectAverage(notes) {
  let total = 0;
  let coefficientTotal = 0;

  notes.forEach((note) => {
    if (!countsInAverage(note)) return;

    const value = parseFrenchNumber(note.note);
    const outOf = parseFrenchNumber(note.noteSur);
    const coefficient = parseFrenchNumber(note.coefficient) || 1;

    if (!Number.isFinite(value) || !Number.isFinite(outOf) || outOf <= 0) return;

    total += (value / outOf) * 20 * coefficient;
    coefficientTotal += coefficient;
  });

  return coefficientTotal > 0 ? total / coefficientTotal : null;
}

function countsInAverage(note) {
  const raw = note?.significatif;
  if (raw === true) return false;
  if (raw === false) return true;
  const normalized = String(raw ?? "").toLowerCase();
  if (normalized === "true") return false;
  if (normalized === "false") return true;
  return true;
}

function isValidHomeworkId(id) {
  return /^\d{5}$/.test(String(id));
}

function isFutureOrToday(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return true;
  const today = startOfDay(new Date());
  return date >= today;
}

function isNextWeek(date) {
  const currentMonday = startOfWeek(new Date());
  const nextMonday = addDays(currentMonday, 7);
  return startOfDay(date) >= nextMonday;
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return startOfDay(value);

  const text = String(value);
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function compareDatesAsc(a, b) {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA - dateB;
}

function compareDatesDesc(a, b) {
  return compareDatesAsc(b, a);
}

function formatLongDate(value) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "--";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatCourseTime(start, end) {
  const startTime = extractTime(start);
  const endTime = extractTime(end);
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return startTime;
  return "Horaire";
}

function extractTime(value) {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/(\d{1,2})[:h](\d{2})/i);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatScore(note, noteSur) {
  const value = note ?? "--";
  const outOf = noteSur ?? "20";
  return `${value}/${outOf}`;
}

function formatMaybeScore(value) {
  if (value === null || value === undefined || value === "") return "Non disponible";
  return String(value);
}

function formatCoefficient(value) {
  if (value === null || value === undefined || value === "") return "1";
  return String(value).replace(".", ",");
}

function formatDecimal(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseFrenchNumber(value) {
  if (value === null || value === undefined) return NaN;
  return Number.parseFloat(String(value).replace(",", "."));
}

function plural(count) {
  return Math.abs(Number(count)) > 1 ? "s" : "";
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function loadingMarkup(label, compact = false) {
  return `
    <div class="loading-state"${compact ? " style=\"min-height: 130px;\"" : ""}>
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function loadingInlineMarkup() {
  return `<span class="subject-chip">Chargement</span>`;
}

function emptyMarkup(label) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(label)}</strong>
      <span>Les informations apparaîtront ici dès que l'API les renvoie.</span>
    </div>
  `;
}

function errorMarkup(title, message, compact = false) {
  return `
    <div class="error-state"${compact ? " style=\"min-height: 130px;\"" : ""}>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message || "Une erreur est survenue.")}</span>
    </div>
  `;
}

function toast(title, message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast${type === "error" ? " is-error" : ""}`;
  node.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(message || "")}</span>
  `;
  dom.toastZone.appendChild(node);
  window.setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    window.setTimeout(() => node.remove(), 180);
  }, 3400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
