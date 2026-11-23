import {
  json,
  sameOrigin,
  readBody,
  getUser,
  newSalt,
  hashPassword,
  toHex,
  validateUsername,
  createSession,
  sessionCookie,
} from "../_lib/auth.js";
import { beginTwoFactor } from "../_lib/webauthn.js";
import { verifyGoogleToken } from "../_lib/google.js";
import { isAllowed } from "../_lib/moderation.js";

function suggestUsername(email) {
  const local = email.split("@")[0] || "";
  return local.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20);
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const profile = await verifyGoogleToken(env, body.credential);
  if (!profile) return json({ error: "Google sign-in failed. Please try again." }, 401);

  const now = Math.floor(Date.now() / 1000);

  if (body.mode === "link") {
    const current = await getUser(request, env.DB);
    if (!current) return json({ error: "Log in to link a Google account." }, 401);

    const owner = await env.DB.prepare(
      "SELECT user_id FROM google_accounts WHERE google_sub = ?"
    )
      .bind(profile.sub)
      .first();
    if (owner && owner.user_id !== current.id) {
      return json({ error: "That Google account is already linked to another account." }, 409);
    }

    const mine = await env.DB.prepare(
      "SELECT google_sub FROM google_accounts WHERE user_id = ?"
    )
      .bind(current.id)
      .first();
    if (mine) {
      if (mine.google_sub === profile.sub) return json({ ok: true });
      return json({ error: "Your account is already linked to a different Google account." }, 409);
    }

    try {
      await env.DB.prepare(
        "INSERT INTO google_accounts (user_id, google_sub, email, created_at) VALUES (?, ?, ?, ?)"
      )
        .bind(current.id, profile.sub, profile.email, now)
        .run();
    } catch {
      return json({ error: "Could not link that Google account." }, 409);
    }
    return json({ ok: true });
  }

  const linked = await env.DB.prepare(
    "SELECT users.id AS id, users.username AS username FROM google_accounts JOIN users ON users.id = google_accounts.user_id WHERE google_accounts.google_sub = ?"
  )
    .bind(profile.sub)
    .first();

  if (linked) {
    const second = await beginTwoFactor(env.DB, request, linked.id);
    if (second) return json(second);
    const token = await createSession(env.DB, linked.id);
    return json({ username: linked.username }, 200, {
      "Set-Cookie": sessionCookie(token),
    });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) {
    return json({ needsUsername: true, suggestion: suggestUsername(profile.email) });
  }

  const usernameError = validateUsername(username);
  if (usernameError) return json({ error: usernameError }, 400);

  if (!(await isAllowed(env, username))) {
    return json({ error: "That username is not allowed. Please choose another." }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE username_lower = ?"
  )
    .bind(username.toLowerCase())
    .first();
  if (existing) return json({ error: "That username is already taken." }, 409);

  const salt = newSalt();
  const unusablePassword = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const passwordHash = await hashPassword(unusablePassword, salt);

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

  try {
    await env.DB.prepare(
      "INSERT INTO google_accounts (user_id, google_sub, email, created_at) VALUES (?, ?, ?, ?)"
    )
      .bind(userId, profile.sub, profile.email, now)
      .run();
  } catch {
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return json({ error: "That Google account is already linked to an account." }, 409);
  }

  const token = await createSession(env.DB, userId);
  return json({ username }, 200, { "Set-Cookie": sessionCookie(token) });
}
