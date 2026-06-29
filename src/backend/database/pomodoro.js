import { megaRead, megaWrite } from "./mega.js";

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

export async function readDay(env, day) {
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
