import { EDinformations } from "./informations.js";
import { EDgrades } from "./grades.js"
import { EDhomeworks } from "./homeworks.js"
import { EDtimetable } from "./timetable.js"

export async function EDfunction (env, subpath) {
  const informations = await EDinformations(env)
  if (subpath === "info") {
    return informations
  } else if (subpath === "grades") {
    return await EDgrades (env, informations)
  } else if (subpath === "homeworks") {
    return await EDhomeworks (env, informations)
  } else if (subpath === "timetable") {
    return await EDtimetable (env, informations)
  } else if (subpath === "") {
    return ""
  } else {
    return "There is no ed features which match with your request"
  }
}
