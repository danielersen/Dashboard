import { EDinformations } from "./get_informations.js";
import { EDgrades } from "./get_grades.js"

export async function EDfunction (env, subpath) {
  const informations = await EDinformations(env)
  if (subpath === "info") {
    return informations
  } else if (subpath === "averages") {
    return await EDgrades (env, informations)
  } else if (subpath === "") {
    return "None"
  } else {
    return "There is no ed features which match with your request"
  }
}