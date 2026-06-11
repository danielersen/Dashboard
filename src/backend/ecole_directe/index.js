import { EDinformations } from "./get_informations.js";
import { EDgrades } from "./get_grades.js"

export async funtion EDfunction (env, subpath) {
  const informations = EDinformations(env)
  if (subpath === "info") {
    return informations
  } else if (subpath === "/averages") {
    return EDgrades (env, informations)
  } else if (subpath === "") {
    return
  } else {
    return "There is no ed features which match with your request"
  }
}