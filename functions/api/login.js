import {
  json,
  sameOrigin,
  readBody,
  hashPassword,
  safeEqual,
  createSession,
  sessionCookie,
  DUMMY_SALT,
} from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password || password.length > 128) {
    return json({ error: "Incorrect username or password." }, 401);
  }

  const user = await env.DB.prepare(
    "SELECT id, username, password_hash, salt FROM users WHERE username_lower = ?"
  )
    .bind(username.toLowerCase())
    .first();

  if (!user) {
    await hashPassword(password, DUMMY_SALT);
    return json({ error: "Incorrect username or password." }, 401);
  }

  const attempt = await hashPassword(password, user.salt);
  if (!safeEqual(attempt, user.password_hash)) {
    return json({ error: "Incorrect username or password." }, 401);
  }

  const token = await createSession(env.DB, user.id);
  return json({ username: user.username }, 200, {
    "Set-Cookie": sessionCookie(token),
  });
}
