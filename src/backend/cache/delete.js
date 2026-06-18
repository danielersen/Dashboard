export async function deleteCacheValue(key) {
  const req = new Request("https://cache/" + key);
  return await cache.delete(req);
}