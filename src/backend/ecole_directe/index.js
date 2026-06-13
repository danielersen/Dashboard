import { EDinformations } from "./informations.js";
import { EDgrades } from "./grades.js"
import { EDaverages } from "./grades.js"
import { EDnewgrades } from "./grades.js"
import { EDhomeworks } from "./homeworks.js"
import { EDtimetable } from "./timetable.js"

export async function EDfunction (env, subpath, headers) {
  let filter;
  if (headers.get("filter") === "true") {
    filter = true;
  } else {
    filter = false;
  }
  const informations = await EDinformations(env)
  
  if (subpath === "info") {
    return informations
  }
  if (subpath === "grades") {
    return await EDgrades (env, informations, filter)
  } else if (subpath === "averages") {
    return await EDaverages (await EDgrades (env, informations, true))
  } else if (subpath === "new-grades") {
    return await EDnewgrades (await EDgrades (env, informations, true))
  } else if (subpath === "homeworks") {
    return await EDhomeworks (env, informations, filter)
  } else if (subpath === "timetable") {
    return await EDtimetable (env, informations, filter)
  } else {
    return "There is no ed features which match with your request"
  }
}
