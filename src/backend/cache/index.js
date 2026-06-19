import { getCacheValue } from "./get.js"
import { setCacheValue } from "./set.js"
import { deleteCacheValue, deleteCache } from "./delete.js"

export async function Cache(method, path) {
  let resp
  if (method === "GET") {
    resp = await getCacheValue(path)
  } else if (method === "PATCH") {
    resp = delete deleteCacheValue(path)
}