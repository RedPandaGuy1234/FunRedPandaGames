import { json, sameOrigin, readBody, getUser } from "../_lib/auth.js";

const MIN_MS = 80;
const MAX_MS = 10000;
const LIMIT = 50;

async function loadScores(db) {
  const result = await db
    .prepare(
      "SELECT username, reaction_ms FROM reaction WHERE user_id IS NOT NULL ORDER BY reaction_ms ASC, created_at ASC LIMIT ?"
    )
    .bind(LIMIT)
    .all();
  return result.results;
}

async function loadBest(db, userId) {
  return await db
    .prepare("SELECT username, reaction_ms FROM reaction WHERE user_id = ?")
    .bind(userId)
    .first();
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to see the leaderboard." }, 401);

  const scores = await loadScores(env.DB);
  const you = await loadBest(env.DB, user.id);
  return json({ scores, you });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to save your score." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const ms = body.reaction_ms;
  if (!Number.isInteger(ms) || ms < MIN_MS || ms > MAX_MS) {
    return json({ error: "Invalid score." }, 400);
  }

  const before = await loadBest(env.DB, user.id);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    "INSERT INTO reaction (user_id, username, reaction_ms, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET reaction_ms = excluded.reaction_ms, created_at = excluded.created_at WHERE excluded.reaction_ms < reaction.reaction_ms"
  )
    .bind(user.id, user.username, ms, now)
    .run();

  const you = await loadBest(env.DB, user.id);
  const scores = await loadScores(env.DB);
  const improved = !before || ms < before.reaction_ms;
  return json({ improved, best: you.reaction_ms, you, scores });
}
