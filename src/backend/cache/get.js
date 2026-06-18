export async function getCacheValue(key) {
  const req = new Request("https://cache/" + key);
  const res = await cache.match(req);
  if (!res) return null;
  return await res.json();
}