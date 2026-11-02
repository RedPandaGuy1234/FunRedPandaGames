import {
  json,
  sameOrigin,
  readBody,
  getUser,
  newSalt,
  hashPassword,
  safeEqual,
  validatePassword,
  createSession,
  sessionCookie,
} from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to change your password." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || currentPassword.length > 128) {
    return json({ error: "Your current password is incorrect." }, 400);
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) return json({ error: passwordError }, 400);

  const row = await env.DB.prepare(
    "SELECT password_hash, salt FROM users WHERE id = ?"
  )
    .bind(user.id)
    .first();

  if (!row) return json({ error: "Log in to change your password." }, 401);

  const attempt = await hashPassword(currentPassword, row.salt);
  if (!safeEqual(attempt, row.password_hash)) {
    return json({ error: "Your current password is incorrect." }, 400);
  }

  if (newPassword === currentPassword) {
    return json(
      { error: "Your new password must be different from your current one." },
      400
    );
  }

  const salt = newSalt();
  const passwordHash = await hashPassword(newPassword, salt);

  try {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?"
      ).bind(passwordHash, salt, user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    ]);
  } catch {
    return json(
      { error: "Could not change your password. Please try again." },
      500
    );
  }

  const token = await createSession(env.DB, user.id);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}
