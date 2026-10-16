import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import {
  MAX_SEATS,
  cleanCode,
  cleanClientId,
  cleanName,
  publicId,
  mutateRoom,
} from "../../_lib/rooms.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const code = cleanCode(body.code);
  const clientId = cleanClientId(body.clientId);
  if (!code || !clientId) return json({ error: "Invalid request." }, 400);

  const pid = await publicId(clientId);

  const result = await mutateRoom(env.DB, code, (state) => {
    if (state.seats.some((seat) => seat.id === pid)) return { skip: true };
    if (state.phase !== "lobby") {
      return { error: "That game has already started.", status: 400 };
    }
    if (state.seats.length >= MAX_SEATS) {
      return { error: "That room is full.", status: 400 };
    }
    state.seats.push({
      id: pid,
      name: cleanName(body.name, "Player " + (state.seats.length + 1)),
    });
    state.config.bots = Math.min(
      state.config.bots,
      MAX_SEATS - state.seats.length
    );
    return { state };
  });

  if (result.error) {
    return json(
      {
        error:
          result.status === 404
            ? "No room with that code."
            : result.error,
      },
      result.status
    );
  }

  return json({ code, version: result.version, state: result.state });
}
