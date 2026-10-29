import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import {
  ROOM_TTL_SECONDS,
  newCode,
  cleanClientId,
  cleanName,
  publicId,
} from "../../_lib/rooms.js";
import { newRoomState, buildView } from "../../_lib/chess.js";
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

  await env.DB.prepare("DELETE FROM chess_rooms WHERE updated_at < ?")
    .bind(now - ROOM_TTL_SECONDS)
    .run();

  const state = newRoomState(pid, cleanName(body.name, "Player 1"));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await env.DB.prepare(
        "INSERT INTO chess_rooms (code, version, state, updated_at) VALUES (?, 1, ?, ?)"
      )
        .bind(code, JSON.stringify(state), now)
        .run();
      return json({ code, version: 1, view: buildView(state, 1, code, pid) });
    } catch {
      continue;
    }
  }

  return json({ error: "Could not create a room. Please try again." }, 500);
}
