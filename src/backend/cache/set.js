import { getCacheValue } from "./get.js"
export async function setCacheValue(key, value, ttl = 1800) {
  // Save all the keys
  const req1 = new Request("https://cache/" + "cache_keys");
  const res1 = await cache.match(req1);
  let cache_keys;
  if (!res1) {
    cache_keys = ["cache_keys"];
  } else {
    cache_keys = res.json();
  }
  cache_keys.push(key)
  const req2 = new Request("https://cache/" + "cache_keys");
  const res2 = new Response(JSON.stringify(cache_keys), {
    headers: {
      "Cache-Control": `max-age=${ttl}`
    }
  });
  await cache.put(req2, res2);
  // Set the value
  if (key === "cache_keys") {
    return "Error, this key is forbidden"
  }
  const req3 = new Request("https://cache/" + key);
  const res3 = new Response(JSON.stringify(value), {
    headers: {
      "Cache-Control": `max-age=${ttl}`
    }
  });
  await cache.put(req3, res3);
}