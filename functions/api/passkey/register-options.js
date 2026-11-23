import { json, sameOrigin, getUser } from "../../_lib/auth.js";
import {
  MAX_PASSKEYS,
  listPasskeys,
  creationOptions,
} from "../../_lib/webauthn.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to add a passkey." }, 401);

  const existing = await listPasskeys(env.DB, user.id);
  if (existing.length >= MAX_PASSKEYS) {
    return json({ error: "You can register up to " + MAX_PASSKEYS + " passkeys." }, 400);
  }

  return json(await creationOptions(env.DB, request, user));
}
