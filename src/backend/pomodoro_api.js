import { readDay } from "./database/pomodoro.js";
import { driveWrite } from "./database/write.js";
import { getCacheValue } from "./cache/get.js";
import { setCacheValue } from "./cache/set.js";

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function Pomodoro(env, path, method, body) {
  if (path === "read-subjects" && method === "POST") {
    const day = body?.day;
    if (!day) return { error: "Missing day" };
    const subjects = await readDay(env, day);
    return { subjects };
  }

  if (path === "save-subjects" && method === "POST") {
    const day = body?.day;
    const subjects = body?.subjects;
    if (!day) return { error: "Missing day" };
    if (!Array.isArray(subjects)) return { error: "Invalid subjects" };
    await driveWrite(env, `Pomodoro/${day.toLowerCase().trim()}.txt`, subjects);
    return { ok: true };
  }

  if (path === "get-state" && method === "POST") {
    const today = todayStr();
    const timerData = await getCacheValue("pomodoro_timer");
    const checkedData = await getCacheValue("pomodoro_checked");
    const timerCount = (timerData?.date === today) ? (timerData.count || 0) : 0;
    const checked = (checkedData?.date === today) ? (checkedData.checked || {}) : {};
    return { timerCount, checked };
  }

  if (path === "increment-timer" && method === "POST") {
    const today = todayStr();
    const timerData = await getCacheValue("pomodoro_timer");
    let count = (timerData?.date === today) ? (timerData.count || 0) : 0;
    count++;
    await setCacheValue("pomodoro_timer", { count, date: today });
    return { timerCount: count };
  }

  if (path === "set-checked" && method === "POST") {
    const today = todayStr();
    const checked = body?.checked;
    if (!checked || typeof checked !== "object") return { error: "Invalid checked data" };
    await setCacheValue("pomodoro_checked", { checked, date: today });
    return { ok: true };
  }

  return { error: "Unknown pomodoro endpoint" };
}
