import { getCacheValue } from "./get.js"
export async function deleteCacheValue(key) {
  const req = new Request("https://cache/" + key);
  return await cache.delete(req);
}
export async function deleteCache() {
  const req = new Request("https://cache/" + key);
  return await cache.delete(req);
}