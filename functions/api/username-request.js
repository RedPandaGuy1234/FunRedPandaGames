import {
  json,
  sameOrigin,
  readBody,
  getUser,
  validateUsername,
} from "../_lib/auth.js";
import { isAllowed } from "../_lib/moderation.js";

async function latestRequest(db, userId) {
  return await db
    .prepare(
      "SELECT requested_username, status, created_at FROM username_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1"
    )
    .bind(userId)
    .first();
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to request a username change." }, 401);

  const latest = await latestRequest(env.DB, user.id);
  return json({ username: user.username, request: latest || null });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to request a username change." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const requested = typeof body.username === "string" ? body.username.trim() : "";

  const usernameError = validateUsername(requested);
  if (usernameError) return json({ error: usernameError }, 400);

  if (requested === user.username) {
    return json({ error: "That is already your username." }, 400);
  }

  if (!(await isAllowed(env, requested))) {
    return json(
      { error: "That username is not allowed. Please choose another." },
      400
    );
  }

  const taken = await env.DB.prepare(
    "SELECT id FROM users WHERE username_lower = ? AND id != ?"
  )
    .bind(requested.toLowerCase(), user.id)
    .first();

  if (taken) return json({ error: "That username is already taken." }, 409);

  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM username_requests WHERE user_id = ? AND status = 'pending'"
      ).bind(user.id),
      env.DB.prepare(
        "INSERT INTO username_requests (user_id, current_username, requested_username, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
      ).bind(user.id, user.username, requested, now),
    ]);
  } catch {
    return json({ error: "Could not save your request. Please try again." }, 500);
  }

  const latest = await latestRequest(env.DB, user.id);
  return json({ ok: true, username: user.username, request: latest });
}
