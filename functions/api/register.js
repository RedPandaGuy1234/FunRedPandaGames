import {
  json,
  sameOrigin,
  readBody,
  newSalt,
  hashPassword,
  validateUsername,
  validatePassword,
  createSession,
  sessionCookie,
} from "../_lib/auth.js";
import { isAllowed } from "../_lib/moderation.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const usernameError = validateUsername(username);
  if (usernameError) return json({ error: usernameError }, 400);

  const passwordError = validatePassword(password);
  if (passwordError) return json({ error: passwordError }, 400);

  if (!(await isAllowed(env, username))) {
    return json(
      { error: "That username is not allowed. Please choose another." },
      400
    );
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE username_lower = ?"
  )
    .bind(username.toLowerCase())
    .first();

  if (existing) return json({ error: "That username is already taken." }, 409);

  const salt = newSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = Math.floor(Date.now() / 1000);

  let userId;
  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (username, username_lower, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(username, username.toLowerCase(), passwordHash, salt, now)
      .run();
    userId = result.meta.last_row_id;
  } catch {
    return json({ error: "That username is already taken." }, 409);
  }

  const token = await createSession(env.DB, userId);
  return json({ username }, 200, { "Set-Cookie": sessionCookie(token) });
}
