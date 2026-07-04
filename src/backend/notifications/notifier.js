function normalizeNotifierBaseUrl(url) {
  if (!url) {
    throw new Error("Missing NOTIFER_URL");
  }

  return String(url).trim().replace(/\/+$/, "");
}

function buildNotifierUrl(env, topic) {
  const baseUrl = normalizeNotifierBaseUrl(env.NOTIFER_URL);
  const topicName = topic || env.NOTIFER_TOPIC || "";

  if (!topicName) {
    return baseUrl;
  }

  const normalizedTopic = String(topicName).trim().replace(/^\/+/, "");
  return baseUrl.endsWith(`/${normalizedTopic}`) ? baseUrl : `${baseUrl}/${encodeURIComponent(normalizedTopic)}`;
}

function buildNotifierText(body) {
  const parts = [];

  if (body.title) parts.push(`Title: ${body.title}`);
  if (body.subtitle) parts.push(`Subtitle: ${body.subtitle}`);
  if (body.event) parts.push(`Event: ${body.event}`);
  if (body.status) parts.push(`Status: ${body.status}`);
  if (body.level) parts.push(`Level: ${body.level}`);
  if (body.user) parts.push(`User: ${body.user}`);
  if (body.source) parts.push(`Source: ${body.source}`);
  if (body.link) parts.push(`Link: ${body.link}`);

  const message = body.message || body.text || body.content || "";
  const details = body.details && typeof body.details === "object" ? JSON.stringify(body.details, null, 2) : null;

  if (parts.length > 0) {
    parts.push("");
  }

  if (message) {
    parts.push(message);
  }

  if (details) {
    parts.push("");
    parts.push(details);
  }

  return parts.join("\n");
}

function buildNotifierHeaders(body) {
  const headers = {};
  const headerMap = {
    title: "Title",
    priority: "Priority",
    tags: "Tags",
    click: "Click",
    actions: "Actions",
    markdown: "Markdown",
    delay: "Delay",
    email: "Email",
    attach: "Attach",
    icon: "Icon",
    cache: "Cache",
    filename: "Filename",
  };

  for (const [key, headerName] of Object.entries(headerMap)) {
    const value = body[key];
    if (value !== undefined && value !== null && value !== "") {
      headers[headerName] = String(value);
    }
  }

  if (body.headers && typeof body.headers === "object") {
    for (const [key, value] of Object.entries(body.headers)) {
      if (value !== undefined && value !== null && value !== "") {
        headers[key] = String(value);
      }
    }
  }

  return headers;
}

export async function sendNotifierMessage(env, body = "No body send", topic = env.NOTIFER_TOPIC) {
  if (!env?.NOTIFER_TOKEN) {
    throw new Error("Missing NOTIFER_TOKEN");
  }

  const url = buildNotifierUrl(env, topic);
  const headers = {
    Authorization: `Bearer ${env.NOTIFER_TOKEN}`,
    "Content-Type": "text/plain; charset=utf-8",
    ...buildNotifierHeaders(body),
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: buildNotifierText(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notifier send failed (${response.status}): ${errorText}`);
  }

  return {
    ok: true,
    status: response.status,
    url,
    topic,
  };
}

export async function readNotifierMessages(env, topic = env.NOTIFER_TOPIC) {
  if (!env?.NOTIFER_TOKEN) {
    throw new Error("Missing NOTIFER_TOKEN");
  }

  const url = `${buildNotifierUrl(env, topic)}/json`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.NOTIFER_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notifier read failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [data];
}

export default {
  sendNotifierMessage,
  readNotifierMessages,
};

