import { megaRead, megaWrite, getClient } from "./mega.js";
import { getCacheValue, setCacheValue } from "../cache/index.js";

const VALID_DAYS = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"
];
const STATE_FILE = "pomodoro/state.json";
const STATE_CACHE_KEY = "pomodoro_state";
const STORAGE_CACHE_KEY = "pomodoro_storage";
const CACHE_PREFIX = "pomodoro_day_";
const DAY_CHECKED_PREFIX = "pomodoro_day_checked_";
const DAY_TIMER_PREFIX = "pomodoro_day_timer_";
const CACHE_TTL = 3600; // 1 heure

// Fonction pour établir la connexion MEGA et la mettre en cache
export async function loginMega(env) {
  try {
    const storage = await getClient(env);
    
    // Mettre la connexion en cache pendant 30 minutes
    try {
      await setCacheValue(STORAGE_CACHE_KEY, "connected", 1800);
    } catch (e) {
      console.error("Failed to cache storage connection:", e);
    }
    
    return { connected: true };
  } catch (e) {
    const errorMessage = String(e?.message || "").toLowerCase();
    // Détecter les erreurs de compte bloqué ou de login
    if (errorMessage.includes("locked") || errorMessage.includes("blocked") || errorMessage.includes("suspended")) {
      console.error("MEGA account appears to be locked:", e);
      return { connected: false, error: "Account locked or blocked" };
    }
    console.error("Failed to cache storage connection:", e);
    return { connected: false, error: String(e.message) };
  }
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
      console.log(`Cache check for ${day}:`, cached, `Length: ${Array.isArray(cached) ? cached.length : 'N/A'}`);
      
      if (cached !== null) {
        // Si le cache contient un tableau vide, considérer comme manquant pour forcer la relecture MEGA
        if (Array.isArray(cached) && cached.length === 0) {
          console.log(`Cache contains empty array for ${day}, will force MEGA read`);
          // Ne pas définir allDays[day] pour forcer la lecture MEGA
        } else {
          allDays[day] = cached;
          console.log(`Cache hit for ${day}:`, cached);
        }
      } else {
        console.log(`Cache miss for ${day} (null value)`);
      }
    } catch (e) {
      console.error(`Cache read failed for ${day}:`, e);
    }
  }
  
  // Charger les jours manquants depuis MEGA avec une seule connexion
  const missingDays = VALID_DAYS.filter(day => allDays[day] === undefined);
  console.log(`Missing days to load from MEGA:`, missingDays);
  
  if (missingDays.length > 0) {
    try {
      storage = await getClient(env);
      
      for (const day of missingDays) {
        try {
          console.log(`Attempting to read ${day} from MEGA...`);
          const subjects = await readDay(env, day, storage);
          allDays[day] = subjects;
          console.log(`Read ${day} from MEGA:`, subjects);
          
          // Mettre en cache
          const cacheKey = `${CACHE_PREFIX}${day}`;
          try {
            await setCacheValue(cacheKey, subjects, CACHE_TTL);
            console.log(`Cache updated for ${day} from MEGA:`, subjects);
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
  
  console.log("Final allDays:", allDays);
  return allDays;
}

// Fonction unique pour récupérer toutes les données pomodoro (matières, cases, compteurs)
export async function readAllPomodoroData(env) {
  const [allDays, allChecked, allTimerCount] = await Promise.all([
    readAllDays(env),
    readAllDaysChecked(env),
    readAllDaysTimerCount(env)
  ]);
  
  return {
    allDays,
    allChecked,
    allTimerCount
  };
}

// Fonction pour récupérer toutes les cases cochées pour tous les jours
export async function readAllDaysChecked(env) {
  const allChecked = {};
  
  // Essayer d'abord depuis le cache pour tous les jours
  for (const day of VALID_DAYS) {
    const cacheKey = `${DAY_CHECKED_PREFIX}${day}`;
    try {
      const cached = await getCacheValue(cacheKey);
      if (cached !== null && typeof cached === "object" && !Array.isArray(cached)) {
        allChecked[day] = cached;
      } else {
        allChecked[day] = {};
      }
    } catch (e) {
      console.error(`Day checked cache read failed for ${day}:`, e);
      allChecked[day] = {};
    }
  }
  
  return allChecked;
}

// Fonction pour récupérer tous les compteurs de pomodoros pour tous les jours
export async function readAllDaysTimerCount(env) {
  const allTimerCount = {};
  
  // Essayer d'abord depuis le cache pour tous les jours
  for (const day of VALID_DAYS) {
    const cacheKey = `${DAY_TIMER_PREFIX}${day}`;
    try {
      const cached = await getCacheValue(cacheKey);
      if (cached !== null && typeof cached === "number") {
        allTimerCount[day] = cached;
      } else {
        allTimerCount[day] = 0;
      }
    } catch (e) {
      console.error(`Day timer cache read failed for ${day}:`, e);
      allTimerCount[day] = 0;
    }
  }
  
  return allTimerCount;
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

// Fonction pour récupérer les cases cochées pour un jour spécifique depuis le cache
async function getDayChecked(day) {
  const cacheKey = `${DAY_CHECKED_PREFIX}${day}`;
  try {
    const cached = await getCacheValue(cacheKey);
    if (cached !== null && typeof cached === "object" && !Array.isArray(cached)) {
      return cached;
    }
  } catch (e) {
    console.error(`Day checked cache read failed for ${day}:`, e);
  }
  return {};
}

// Fonction pour sauvegarder les cases cochées pour un jour spécifique dans le cache
async function saveDayChecked(day, checked) {
  const cacheKey = `${DAY_CHECKED_PREFIX}${day}`;
  try {
    await setCacheValue(cacheKey, checked, CACHE_TTL);
  } catch (e) {
    console.error(`Day checked cache write failed for ${day}:`, e);
  }
}

// Fonction pour récupérer le nombre de pomodoros pour un jour spécifique depuis le cache
async function getDayTimerCount(day) {
  const cacheKey = `${DAY_TIMER_PREFIX}${day}`;
  try {
    const cached = await getCacheValue(cacheKey);
    if (cached !== null && typeof cached === "number") {
      return cached;
    }
  } catch (e) {
    console.error(`Day timer cache read failed for ${day}:`, e);
  }
  return 0;
}

// Fonction pour sauvegarder le nombre de pomodoros pour un jour spécifique dans le cache
async function saveDayTimerCount(day, count) {
  const cacheKey = `${DAY_TIMER_PREFIX}${day}`;
  try {
    await setCacheValue(cacheKey, count, CACHE_TTL);
  } catch (e) {
    console.error(`Day timer cache write failed for ${day}:`, e);
  }
}

export async function readDay(env, day, storage = null) {
  const normalized = validateDay(day);
  const cacheKey = `${CACHE_PREFIX}${normalized}`;
  const fullPath = filePath(normalized);
  
  console.log(`readDay called for ${day}, normalized: ${normalized}, fullPath: ${fullPath}`);
  console.log(`Cache key: ${cacheKey}`);
  
  // Essayer d'abord depuis le cache
  try {
    const cached = await getCacheValue(cacheKey);
    console.log(`Cache value for ${day}:`, cached, `Type: ${typeof cached}`);
    if (cached !== null) {
      console.log(`Returning cached value for ${day}:`, cached);
      return cached;
    } else {
      console.log(`Cache returned null for ${day}, will try MEGA`);
    }
  } catch (e) {
    console.error(`Cache read failed for ${day}:`, e);
  }

  try {
    console.log(`Reading from MEGA: ${fullPath}`);
    const result = await megaRead(env, fullPath, storage);
    console.log(`MEGA result for ${day}:`, result, `Type: ${typeof result}`);
    
    if (Array.isArray(result)) {
      console.log(`Returning array for ${day}:`, result);
      return result;
    }
    if (typeof result === "string" && result.trim()) {
      try {
        const parsed = JSON.parse(result);
        console.log(`Parsed JSON for ${day}:`, parsed);
        return parsed;
      } catch {
        console.log(`Failed to parse JSON for ${day}, returning []`);
        return [];
      }
    }
    console.log(`MEGA result is not array or string for ${day}, returning []`);
    return [];
  } catch (e) {
    console.error(`Error reading ${day} from MEGA:`, e);
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      console.log(`File not found for ${day}, returning []`);
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
  
  // Mettre à jour le cache avec un TTL plus long pour s'assurer que les données sont disponibles
  const cacheKey = `${CACHE_PREFIX}${normalized}`;
  try {
    await setCacheValue(cacheKey, subjects, CACHE_TTL);
    console.log(`Cache updated for ${day}:`, subjects);
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
    setTimeout(() => reject(new Error("Pomodoro operation timeout")), 15000);
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

    if (subpath === "read-all-pomodoro-data") {
      const result = await Promise.race([
        readAllPomodoroData(env),
        timeoutPromise
      ]);
      return result;
    }

    if (subpath === "save-subjects") {
      const result = await Promise.race([
        saveDay(env, body?.day, body?.subjects),
        timeoutPromise
      ]);
      return result;
    }

    if (subpath === "get-day-checked") {
      const day = validateDay(body?.day);
      const checked = await getDayChecked(day);
      return { checked };
    }

    if (subpath === "save-day-checked") {
      const day = validateDay(body?.day);
      const checked = body?.checked && typeof body.checked === "object" && !Array.isArray(body.checked)
        ? body.checked
        : {};
      await saveDayChecked(day, checked);
      return { success: true };
    }

    if (subpath === "get-day-timer") {
      const day = validateDay(body?.day);
      const count = await getDayTimerCount(day);
      return { count };
    }

    if (subpath === "save-day-timer") {
      const day = validateDay(body?.day);
      const count = Number(body?.count) || 0;
      await saveDayTimerCount(day, count);
      return { success: true };
    }

    if (subpath === "increment-day-timer") {
      const day = validateDay(body?.day);
      const currentCount = await getDayTimerCount(day);
      const newCount = currentCount + 1;
      await saveDayTimerCount(day, newCount);
      return { count: newCount };
    }

    throw new Error(`Unknown Pomodoro action: ${subpath}`);
  } catch (error) {
    if (error.message === "Pomodoro operation timeout") {
      throw new Error("Operation timeout - please try again");
    }
    throw error;
  }
}
