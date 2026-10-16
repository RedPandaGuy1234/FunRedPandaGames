import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import {
  cleanCode,
  cleanClientId,
  publicId,
  loadRoom,
} from "../../_lib/rooms.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const code = cleanCode(body.code);
  const clientId = cleanClientId(body.clientId);
  if (!code || !clientId) return json({ error: "Invalid request." }, 400);

  const since = Number.isInteger(body.since) ? body.since : 0;

  const room = await loadRoom(env.DB, code);
  if (!room) return json({ error: "Room not found." }, 404);

  const pid = await publicId(clientId);
  if (!room.state.seats.some((seat) => seat.id === pid)) {
    return json({ error: "You are not in this room." }, 403);
  }

  if (room.version <= since) {
    return json({ unchanged: true, version: room.version });
  }

  return json({ version: room.version, state: room.state });
}
