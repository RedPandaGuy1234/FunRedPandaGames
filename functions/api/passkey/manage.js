import { json, sameOrigin, readBody, getUser } from "../../_lib/auth.js";
import {
  listPasskeys,
  securityStatus,
  verifyAssertionTicket,
} from "../../_lib/webauthn.js";

async function setTwoFactor(db, userId, value) {
  await db
    .prepare(
      "INSERT INTO security_settings (user_id, passkey_2fa) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET passkey_2fa = excluded.passkey_2fa"
    )
    .bind(userId, value)
    .run();
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to manage your security settings." }, 401);
  return json(await securityStatus(env.DB, user.id));
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to manage your security settings." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const action = body.action;

  if (action === "enable") {
    const keys = await listPasskeys(env.DB, user.id);
    if (keys.length === 0) return json({ error: "Add a passkey first." }, 400);
    await setTwoFactor(env.DB, user.id, 1);
    return json({ ok: true, security: await securityStatus(env.DB, user.id) });
  }

  if (action === "disable" || action === "delete") {
    if (action === "delete" && !Number.isInteger(body.id)) {
      return json({ error: "Invalid request." }, 400);
    }

    const verified = await verifyAssertionTicket(
      env.DB,
      request,
      body.ticket,
      "stepup",
      body.credential,
      user.id
    );
    if (verified === null) {
      return json({ error: "Passkey check failed. Please try again." }, 403);
    }

    if (action === "disable") {
      await setTwoFactor(env.DB, user.id, 0);
    } else {
      await env.DB.prepare("DELETE FROM passkeys WHERE id = ? AND user_id = ?")
        .bind(body.id, user.id)
        .run();
      const remaining = await listPasskeys(env.DB, user.id);
      if (remaining.length === 0) await setTwoFactor(env.DB, user.id, 0);
    }

    return json({ ok: true, security: await securityStatus(env.DB, user.id) });
  }

  return json({ error: "Unknown action." }, 400);
}
