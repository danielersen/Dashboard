export async function setCacheValue(key, value, ttl = 1800) {
  const req = new Request("https://cache/" + key);
  const res = new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": `max-age=${ttl}`
    }
  });
  await cache.put(req, res);
}