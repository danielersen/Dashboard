import { megaRead, megaWrite } from "./mega.js";

const VALID_DAYS = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"
];
const STATE_FILE = "pomodoro/state.json";

// Fonction pour récupérer tous les jours en une seule connexion MEGA
export async function readAllDays(env) {
  const { getClient } = await import("./mega.js");
  const storage = await getClient(env);
  
  const allDays = {};
  
  for (const day of VALID_DAYS) {
    try {
      const subjects = await readDay(env, day, storage);
      allDays[day] = subjects;
    } catch (e) {
      console.error(`Failed to read ${day}:`, e);
      allDays[day] = [];
    }
  }
  
  return allDays;
}

function validateDay(day) {
  const normalized = String(day || "").toLowerCase().trim();
  if (!VALID_DAYS.includes(normalized)) {
    throw new Error(`Invalid day: "${day}". Must be one of: ${VALID_DAYS.join(", ")}`);
  }
  return normalized;
}

function filePath(day) {
  return `pomodoro/${day}.txt`;
}

async function readState(env) {
  try {
    const state = await megaRead(env, STATE_FILE);
    if (state && typeof state === "object" && !Array.isArray(state)) {
      return {
        timerCount: Number(state.timerCount) || 0,
        checked: state.checked && typeof state.checked === "object" && !Array.isArray(state.checked)
          ? state.checked
          : {},
      };
    }
    return { timerCount: 0, checked: {} };
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return { timerCount: 0, checked: {} };
    }
    throw e;
  }
}

async function saveState(env, state) {
  const safeState = {
    timerCount: Number(state.timerCount) || 0,
    checked: state.checked && typeof state.checked === "object" && !Array.isArray(state.checked)
      ? state.checked
      : {},
  };
  return await megaWrite(env, STATE_FILE, safeState);
}

export async function readDay(env, day, storage = null) {
  const normalized = validateDay(day);

  try {
    const result = await megaRead(env, filePath(normalized));
    if (Array.isArray(result)) return result;
    if (typeof result === "string" && result.trim()) {
      try {
        return JSON.parse(result);
      } catch {
        return [];
      }
    }
    return [];
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return [];
    }
    throw e;
  }
}

export async function saveDay(env, day, subjects) {
  const normalized = validateDay(day);
  if (!Array.isArray(subjects)) {
    throw new Error("Invalid subjects");
  }

  return await megaWrite(env, filePath(normalized), subjects);
}

export async function addSubject(env, day, subject) {
  const normalized = validateDay(day);
  if (!subject || typeof subject !== "string") {
    throw new Error("Invalid subject");
  }

  const list = await readDay(env, normalized);
  const existing = list.find(
    entry => entry.matière.toLowerCase() === subject.toLowerCase()
  );

  if (existing) {
    existing.nb_fois = Number(existing.nb_fois) + 1;
  } else {
    list.push({ matière: subject, nb_fois: 1 });
  }

  return await saveDay(env, normalized, list);
}

export async function removeSubject(env, day, subject) {
  const normalized = validateDay(day);
  if (!subject || typeof subject !== "string") {
    throw new Error("Invalid subject");
  }

  const list = await readDay(env, normalized);
  const index = list.findIndex(
    entry => entry.matière.toLowerCase() === subject.toLowerCase()
  );

  if (index === -1) {
    throw new Error(`Subject "${subject}" not found for ${normalized}`);
  }

  const entry = list[index];
  const count = Number(entry.nb_fois);

  if (count <= 1) {
    list.splice(index, 1);
  } else {
    entry.nb_fois = count - 1;
  }

  return await saveDay(env, normalized, list);
}

export async function Pomodoro(env, subpath, method, body) {
  if (method !== "POST") {
    throw new Error("Unsupported method for Pomodoro API");
  }

  // Timeout global pour éviter les dépassements de ressources
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Pomodoro operation timeout")), 12000);
  });

  try {
    if (subpath === "read-subjects") {
      const result = await Promise.race([
        readDay(env, body?.day),
        timeoutPromise
      ]);
      return { subjects: result };
    }

    if (subpath === "read-all-days") {
      const result = await Promise.race([
        readAllDays(env),
        timeoutPromise
      ]);
      return { allDays: result };
    }

    if (subpath === "save-subjects") {
      const result = await Promise.race([
        saveDay(env, body?.day, body?.subjects),
        timeoutPromise
      ]);
      return result;
    }

    if (subpath === "get-state") {
      const result = await Promise.race([
        readState(env),
        timeoutPromise
      ]);
      return result;
    }

    if (subpath === "increment-timer") {
      const result = await Promise.race([
        (async () => {
          const state = await readState(env);
          state.timerCount = Number(state.timerCount || 0) + 1;
          await saveState(env, state);
          return { timerCount: state.timerCount };
        })(),
        timeoutPromise
      ]);
      return result;
    }

    if (subpath === "set-checked") {
      const checked = body?.checked;
      if (!checked || typeof checked !== "object" || Array.isArray(checked)) {
        throw new Error("Invalid checked payload");
      }
      const result = await Promise.race([
        (async () => {
          const state = await readState(env);
          state.checked = checked;
          await saveState(env, state);
          return { checked: state.checked };
        })(),
        timeoutPromise
      ]);
      return result;
    }

    throw new Error(`Unknown Pomodoro action: ${subpath}`);
  } catch (error) {
    if (error.message === "Pomodoro operation timeout") {
      throw new Error("Operation timeout - please try again");
    }
    throw error;
  }
}
