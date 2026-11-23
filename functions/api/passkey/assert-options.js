import { json, sameOrigin, getUser } from "../../_lib/auth.js";
import { listPasskeys, requestOptions } from "../../_lib/webauthn.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const user = await getUser(request, env.DB);
  if (!user) return json({ error: "Log in to continue." }, 401);

  const existing = await listPasskeys(env.DB, user.id);
  if (existing.length === 0) {
    return json({ error: "You have no passkeys registered." }, 400);
  }

  return json(await requestOptions(env.DB, request, user.id, "stepup"));
}
