import { megaRead, megaWrite, megaDelete } from "../database/mega.js";
import { checkAndIncrementMonthly } from "./limits.js";

function indexPath(category) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/index.json`;
}

function discussionFilePath(category, filename) {
  return `artificial_intelligence/${String(category).replace(/^\/+|\/+$/g, "")}/${String(filename)}`;
}

export async function readIndex(env, category) {
  try {
    const idx = await megaRead(env, indexPath(category));
    if (!Array.isArray(idx)) return [];
    return idx;
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("file not found") || String(e?.message || "").toLowerCase().includes("folder not found")) {
      return [];
    }
    throw e;
  }
}

export async function writeIndex(env, category, index) {
  return await megaWrite(env, indexPath(category), index || []);
}

function nowTS() { return new Date().toISOString(); }

function trimDiscussionMessages(discussion, maxPairs = 10) {
  if (!discussion || !Array.isArray(discussion.messages)) discussion.messages = [];
  // messages are stored as alternating user/assistant entries. Count pairs.
  while (Math.floor(discussion.messages.length / 2) > maxPairs) {
    // remove oldest two messages (one pair)
    discussion.messages.splice(0, 2);
  }
  return discussion;
}

export async function addMessagePair(env, category, { discussionId = null, userContent, assistantContent, metadata = {} } = {}) {
  if (!userContent) throw new Error("Missing user content");
  const index = await readIndex(env, category);

  let entry = index.find(e => e.id === discussionId) || null;
  let discussion = null;

  if (entry) {
    try {
      discussion = await megaRead(env, discussionFilePath(category, entry.filename));
    } catch (e) {
      discussion = null;
    }
  }

  if (!discussion) {
    discussion = {
      id: discussionId || (String(Date.now()) + Math.random().toString(36).slice(2,8)),
      createdAt: nowTS(),
      updatedAt: nowTS(),
      title: null,
      lastPromptDate: null,
      messages: [],
      metadata: metadata || {}
    };
  }

  const userMsg = { role: "user", content: userContent, ts: nowTS() };
  const assistantMsg = { role: "assistant", content: assistantContent, ts: nowTS() };
  discussion.messages.push(userMsg);
  discussion.messages.push(assistantMsg);
  discussion.updatedAt = nowTS();
  discussion.lastPromptDate = userMsg.ts;

  trimDiscussionMessages(discussion, 10);

  // generate a short title if missing (simple local heuristic)
  if (!discussion.title) {
    const first = String(userContent || "").replace(/\s+/g, " ").trim();
    const words = first.split(/\s+/).slice(0,6);
    const title = words.join(" ") || `Conversation ${discussion.id}`;
    discussion.title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // filename: slugified title + id
  const slug = discussion.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0,60) || discussion.id;
  const filename = `${slug}-${discussion.id}.json`;

  // write discussion file
  await megaWrite(env, discussionFilePath(category, filename), discussion);

  // If OpenAI key available, ask the model to generate a short title (counts against limits)
  if (env.OPENAI_API_KEY) {
    try {
      const modelForTitle = discussion.metadata?.model || env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini";
      const sample = (discussion.messages || []).slice(-2).map(m => `${m.role}: ${m.content}`).join("\n");
      const titlePrompt = `Donne un titre très court en français (max 6 mots) pour la conversation suivante, réponds uniquement par le titre:\n\n${sample}`;
      const titleResp = await callModel(env, modelForTitle, titlePrompt, { apiModel: modelForTitle, maxTokens: 32 });
      if (titleResp?.ok && titleResp.response) {
        const candidate = String(titleResp.response).split(/\n/)[0].trim();
        if (candidate) {
          discussion.title = candidate.slice(0, 120);
          // rewrite discussion file with new title
          await megaWrite(env, discussionFilePath(category, filename), discussion);
        }
      }
    } catch (e) {
      // ignore title generation errors
    }
  }

  // update index
  const now = discussion.updatedAt;
  const existingIdx = index.find(i => i.id === discussion.id);
  if (existingIdx) {
    existingIdx.filename = filename;
    existingIdx.title = discussion.title;
    existingIdx.updatedAt = now;
  } else {
    index.push({ id: discussion.id, filename, title: discussion.title, updatedAt: now });
  }

  // sort and keep only last 3; delete older files
  index.sort((a,b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  while (index.length > 3) {
    const removed = index.shift();
    try {
      await megaDelete(env, discussionFilePath(category, removed.filename));
    } catch (e) {
      // ignore delete errors
    }
  }

  await writeIndex(env, category, index);

  return discussion;
}

// Simple model caller: if OPENAI_API_KEY present and model includes "openai",
// call OpenAI chat completions; otherwise return a placeholder response.
export async function callModel(env, model, prompt, options = {}) {
  const message = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  if (env.OPENAI_API_KEY && String(model || "").toLowerCase().includes("openai")) {
    // Ensure monthly quota for this model
    try {
      await checkAndIncrementMonthly(env, model, 1);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const url = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: options.apiModel || "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      max_tokens: options.maxTokens || 512,
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
    return { ok: true, model: model, response: content, raw: json };
  }

  // Fallback: mocked response
  return { ok: true, model: model, response: `Mock response for model=${model} prompt=${message}` };
}
