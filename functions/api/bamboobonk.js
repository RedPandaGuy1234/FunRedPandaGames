import { json, sameOrigin, readBody, getUser } from "../_lib/auth.js";

const MIN_SCORE = 1;
const MAX_SCORE = 1000;
const LIMIT = 50;
const DEVICES = ["mobile", "desktop"];

async function loadScores(db, device) {
  const result = await db
    .prepare(
      "SELECT username, score FROM bamboobonk WHERE device = ? ORDER BY score DESC, created_at ASC LIMIT ?"
    )
    .bind(device, LIMIT)
    .all();
  return result.results;
}

async function loadBest(db, userId, device) {
  return await db
    .prepare(
      "SELECT username, score FROM bamboobonk WHERE user_id = ? AND device = ?"
    )
    .bind(userId, device)
    .first();
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to see the leaderboard." }, 401);

  const device = new URL(request.url).searchParams.get("device");
  if (!DEVICES.includes(device)) return json({ error: "Invalid device." }, 400);

  const scores = await loadScores(env.DB, device);
  const you = await loadBest(env.DB, user.id, device);
  return json({ device, scores, you });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to save your score." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const score = body.score;
  const device = body.device;
  if (!DEVICES.includes(device)) return json({ error: "Invalid device." }, 400);
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return json({ error: "Invalid score." }, 400);
  }

  const before = await loadBest(env.DB, user.id, device);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    "INSERT INTO bamboobonk (user_id, device, username, score, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, device) DO UPDATE SET score = excluded.score, created_at = excluded.created_at WHERE excluded.score > bamboobonk.score"
  )
    .bind(user.id, device, user.username, score, now)
    .run();

  const you = await loadBest(env.DB, user.id, device);
  const scores = await loadScores(env.DB, device);
  const improved = !before || score > before.score;
  return json({ device, improved, best: you.score, you, scores });
}
