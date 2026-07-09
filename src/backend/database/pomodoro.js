import { megaRead, megaWrite } from "./mega.js";
import { getCacheValue, setCacheValue } from "../cache/index.js";

const VALID_DAYS = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"
];
const STATE_FILE = "pomodoro/state.json";
const STATE_CACHE_KEY = "pomodoro_state";
const STORAGE_CACHE_KEY = "pomodoro_storage";
const CACHE_PREFIX = "pomodoro_day_";
const CACHE_TTL = 3600; // 1 heure

// Fonction pour établir la connexion MEGA et la mettre en cache
export async function loginMega(env) {
  const { getClient } = await import("./mega.js");
  const storage = await getClient(env);
  
  // Mettre la connexion en cache pendant 30 minutes
  try {
    await setCacheValue(STORAGE_CACHE_KEY, "connected", 1800);
  } catch (e) {
    console.error("Failed to cache storage connection:", e);
  }
  
  return { connected: true };
}

// Fonction pour récupérer tous les jours en utilisant le cache
export async function readAllDays(env) {
  const allDays = {};
  const { getClient } = await import("./mega.js");
  let storage = null;
  
  // Essayer d'abord depuis le cache
  for (const day of VALID_DAYS) {
    const cacheKey = `${CACHE_PREFIX}${day}`;
    try {
      const cached = await getCacheValue(cacheKey);
      if (cached !== null) {
        allDays[day] = cached;
      }
    } catch (e) {
      console.error(`Cache read failed for ${day}:`, e);
    }
  }
  
  // Charger les jours manquants depuis MEGA avec une seule connexion
  const missingDays = VALID_DAYS.filter(day => allDays[day] === undefined);
  
  if (missingDays.length > 0) {
    try {
      storage = await getClient(env);
      
      for (const day of missingDays) {
        try {
          const subjects = await readDay(env, day, storage);
          allDays[day] = subjects;
          
          // Mettre en cache
          const cacheKey = `${CACHE_PREFIX}${day}`;
          try {
            await setCacheValue(cacheKey, subjects, CACHE_TTL);
          } catch (e) {
            console.error(`Cache write failed for ${day}:`, e);
          }
        } catch (e) {
          console.error(`Failed to read ${day} from MEGA:`, e);
          allDays[day] = [];
        }
      }
    } catch (e) {
      console.error("MEGA connection failed:", e);
      // En cas d'erreur, retourner ce qu'on a du cache
      for (const day of missingDays) {
        if (allDays[day] === undefined) {
          allDays[day] = [];
        }
      }
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
  // Essayer d'abord depuis le cache
  try {
    const cached = await getCacheValue(STATE_CACHE_KEY);
    if (cached !== null && typeof cached === "object") {
      return cached;
    }
  } catch (e) {
    console.error("State cache read failed:", e);
  }

  try {
    const state = await megaRead(env, STATE_FILE);
    if (state && typeof state === "object" && !Array.isArray(state)) {
      const result = {
        timerCount: Number(state.timerCount) || 0,
        checked: state.checked && typeof state.checked === "object" && !Array.isArray(state.checked)
          ? state.checked
          : {},
      };
      
      // Mettre en cache
      try {
        await setCacheValue(STATE_CACHE_KEY, result, CACHE_TTL);
      } catch (e) {
        console.error("State cache write failed:", e);
      }
      
      return result;
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
  const result = await megaWrite(env, STATE_FILE, safeState);
  
  // Mettre à jour le cache
  try {
    await setCacheValue(STATE_CACHE_KEY, safeState, CACHE_TTL);
  } catch (e) {
    console.error("State cache write failed:", e);
  }
  
  return result;
}

export async function readDay(env, day, storage = null) {
  const normalized = validateDay(day);
  const cacheKey = `${CACHE_PREFIX}${normalized}`;
  
  // Essayer d'abord depuis le cache
  try {
    const cached = await getCacheValue(cacheKey);
    if (cached !== null) {
      return cached;
    }
  } catch (e) {
    console.error(`Cache read failed for ${day}:`, e);
  }

  try {
    const result = await megaRead(env, filePath(normalized), storage);
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

  const result = await megaWrite(env, filePath(normalized), subjects);
  
  // Mettre à jour le cache
  const cacheKey = `${CACHE_PREFIX}${normalized}`;
  try {
    await setCacheValue(cacheKey, subjects, CACHE_TTL);
  } catch (e) {
    console.error(`Cache write failed for ${day}:`, e);
  }
  
  return result;
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
    setTimeout(() => reject(new Error("Pomodoro operation timeout")), 10000);
  });

  try {
    if (subpath === "login") {
      const result = await Promise.race([
        loginMega(env),
        timeoutPromise
      ]);
      return result;
    }

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
      const stateTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Pomodoro state operation timeout")), 20000);
      });
      const result = await Promise.race([
        readState(env),
        stateTimeoutPromise
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
