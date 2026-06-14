import { EDinformations } from "./informations.js";
import { EDgrades } from "./grades.js"
import { EDaverages } from "./grades.js"
import { EDnewgrades } from "./grades.js"
import { EDhomeworks } from "./homeworks.js"
import { EDhomeworksDone } from "./homeworks.js"
import { EDtimetable } from "./timetable.js"

export async function EDfunction (env, subpath, method, headers, body) {
  let filter;
  if (headers.get("filter") === "true") {
    filter = true;
  } else {
    filter = false;
  }
  const informations = await EDinformations(env)
  
  if (subpath === "info" && method === "GET") {
    return informations
  } else if (subpath === "grades" && method === "GET") {
    return await EDgrades (env, informations, filter)
  } else if (subpath === "averages" && method === "GET") {
    return await EDaverages (await EDgrades (env, informations, true))
  } else if (subpath === "new-grades" && method === "GET") {
    return await EDnewgrades (await EDgrades (env, informations, true))
  } else if (subpath === "homeworks" && method === "GET") {
    return await EDhomeworks (env, informations, filter)
  } else if (subpath === "homeworks" && method === "POST" && /^\d{5}$/.test(body?.id)) {
    return await EDhomeworksDone (env, informations, filter, body?.id)
  } else if (subpath === "timetable" && method === "GET") {
    return await EDtimetable (env, informations, filter)
  } else {
    return "There is no ed features matching with your request"
  }
}
