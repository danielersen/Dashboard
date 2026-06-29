import { driveRead } from "./read.js";
import { driveWrite } from "./write.js";
import { getCacheValue } from "../cache/get.js";
import { setCacheValue } from "../cache/set.js";

const VALID_DAYS = [
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"
];

function validateDay(day) {
  const normalized = day.toLowerCase().trim();
  if (!VALID_DAYS.includes(normalized)) {
    throw new Error(`Invalid day: "${day}". Must be one of: ${VALID_DAYS.join(", ")}`);
  }
  return normalized;
}

function filePath(day) {
  return `Pomodoro/${day}.txt`;
}

function cacheKey(day) {
  return `pomodoro_subjects:${day}`;
}

export async function readDay(env, day) {
  const normalized = validateDay(day);
  const cachedSubjects = await getCacheValue(cacheKey(normalized));
  if (Array.isArray(cachedSubjects)) {
    return cachedSubjects;
  }

  try {
    const subjects = await driveRead(env, filePath(normalized));
    await setCacheValue(cacheKey(normalized), subjects);
    return subjects;
  } catch (e) {
    if (e.message.includes("File not found") || e.message.includes("Folder not found")) {
      return [];
    }
    if (e.message.includes("storageQuotaExceeded") || e.message.includes("403")) {
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

  await setCacheValue(cacheKey(normalized), subjects);

  try {
    await driveWrite(env, filePath(normalized), subjects);
  } catch (e) {
    if (
      e.message.includes("storageQuotaExceeded") ||
      e.message.includes("Unable to create file") ||
      e.message.includes("Unable to update file")
    ) {
      return subjects;
    }
    throw e;
  }

  return subjects;
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
