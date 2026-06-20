export async function getCacheValue(key) {
  const req = new Request("https://cache/" + key);
  const res = await caches.default.match(req);
  if (!res) return null;
  return await res.json();
}
