import { getCacheValue } from "./get.js"
async function setValue (functionKey, functionValue, ttl = 84600) {
  const req = new Request("https://cache/" + functionKey);
  const res = new Response(JSON.stringify(functionValue), {
    headers: {
      "Cache-Control": `max-age=${ttl}`
    }
  });
  return await caches.default.put(req, res);
}
export async function setCacheValue(key, value) {
  if (key === "cache_keys") {
    return "Error, this key is forbidden"
  }
  // Save all the keys
  let cache_keys = await getCacheValue("cache_keys");
  if (!cache_keys) {
    cache_keys = ["cache_keys"];
  } else {
    cache_keys = res.json();
  }
  cache_keys.push(key);
  await setValue("cache_keys", cache_keys);
  // Set the value
  return await setValue(key, value);
}
