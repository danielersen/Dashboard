import { EDinformations } from "./get_informations.js";
import { EDgrades } from "./get_grades.js"
import { EDhomeworks } from "./get_homeworks.js"

export async function EDfunction (env, subpath) {
  const informations = await EDinformations(env)
  if (subpath === "info") {
    return informations
  } else if (subpath === "grades") {
    return await EDgrades (env, informations)
  } else if (subpath === "homeworks") {
    return await EDhomeworks (env, informations)
  } else if (subpath === "") {
    return ""
  } else {
    return "There is no ed features which match with your request"
  }
}
