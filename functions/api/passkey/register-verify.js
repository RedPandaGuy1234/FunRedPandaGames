import { json, sameOrigin, readBody, getUser } from "../../_lib/auth.js";
import {
  consumeChallenge,
  verifyRegistration,
  securityStatus,
} from "../../_lib/webauthn.js";

function cleanPasskeyName(value) {
  const name =
    typeof value === "string"
      ? value
          .replace(/[\u0000-\u001f<>"'&]/g, "")
          .trim()
          .slice(0, 30)
      : "";
  return name || "Passkey";
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to add a passkey." }, 401);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const row = await consumeChallenge(env.DB, body.ticket, "register");
  if (!row || row.user_id !== user.id) {
    return json({ error: "Passkey setup expired. Please try again." }, 400);
  }

  let result;
  try {
    result = await verifyRegistration(request, row.challenge, body.credential);
  } catch {
    return json({ error: "Could not verify that passkey." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare(
      "INSERT INTO passkeys (user_id, credential_id, public_key, alg, counter, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        user.id,
        result.credentialId,
        result.publicKey,
        result.alg,
        result.counter,
        cleanPasskeyName(body.name),
        now
      )
      .run();
  } catch {
    return json({ error: "That passkey is already registered." }, 409);
  }

  return json({ ok: true, security: await securityStatus(env.DB, user.id) });
}
