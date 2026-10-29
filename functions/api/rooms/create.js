import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import {
  ROOM_TTL_SECONDS,
  newCode,
  cleanClientId,
  cleanName,
  publicId,
} from "../../_lib/rooms.js";
import { isAllowed } from "../../_lib/moderation.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const clientId = cleanClientId(body.clientId);
  if (!clientId) return json({ error: "Invalid request." }, 400);

  const typedName = cleanName(body.name, "");
  if (typedName && !(await isAllowed(env, typedName))) {
    return json({ error: "That name is not allowed. Please choose another." }, 400);
  }

  const pid = await publicId(clientId);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare("DELETE FROM rooms WHERE updated_at < ?")
    .bind(now - ROOM_TTL_SECONDS)
    .run();

  const state = {
    phase: "lobby",
    hostId: pid,
    seats: [{ id: pid, name: cleanName(body.name, "Player 1") }],
    config: { bots: 0, hardMode: false, cont: true },
    game: null,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await env.DB.prepare(
        "INSERT INTO rooms (code, version, state, updated_at) VALUES (?, 1, ?, ?)"
      )
        .bind(code, JSON.stringify(state), now)
        .run();
      return json({ code, version: 1, state });
    } catch {
      continue;
    }
  }

  return json({ error: "Could not create a room. Please try again." }, 500);
}
