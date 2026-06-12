import { EDinformations } from "./informations.js";
import { EDgrades } from "./grades.js"
import { EDhomeworks } from "./homeworks.js"
import { EDtimetable } from "./timetable.js"

export async function EDfunction (env, subpath, headers) {
  const informations = await EDinformations(env)
  if (subpath === "info") {
    return informations
  }

  // Cases with filter
  let filter;
  if (headers.filter === "true") {
    filter = true;
  } else {
    filter = false;
  }
  if (subpath === "grades") {
    return await EDgrades (env, informations, filter)
  } else if (subpath === "homeworks") {
    return await EDhomeworks (env, informations, filter)
  } else if (subpath === "timetable") {
    return await EDtimetable (env, informations, filter)
  } else if (subpath === "") {
    return ""
  } else {
    return "There is no ed features which match with your request"
  }
}
