import {
  json,
  sameOrigin,
  readBody,
  createSession,
  sessionCookie,
} from "../../_lib/auth.js";
import { verifyAssertionTicket } from "../../_lib/webauthn.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const userId = await verifyAssertionTicket(
    env.DB,
    request,
    body.ticket,
    "login",
    body.credential,
    null
  );
  if (userId === null) {
    return json({ error: "Passkey check failed. Please log in again." }, 401);
  }

  const user = await env.DB.prepare("SELECT id, username FROM users WHERE id = ?")
    .bind(userId)
    .first();
  if (!user) return json({ error: "Passkey check failed. Please log in again." }, 401);

  const token = await createSession(env.DB, user.id);
  return json({ username: user.username }, 200, {
    "Set-Cookie": sessionCookie(token),
  });
}
