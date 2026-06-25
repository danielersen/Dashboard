import { getCacheValue } from "./get.js"
import { setCacheValue } from "./set.js"
import { deleteCacheValue, deleteCache } from "./delete.js"

export { getCacheValue, setCacheValue, deleteCacheValue, deleteCache }

export async function Cache(method, path, body) {
  let resp
  if (method === "GET") {
    resp = await getCacheValue(path)
  } else if (method === "PATCH") {
    resp = await setCacheValue(path, body.get("value"))
  } else if (method === "DELETE" && path) {
    resp = await deleteCacheValue(path)
  } else if (method === "DELETE") {
    resp = await deleteCache()
  }
  return resp
}