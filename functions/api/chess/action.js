import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import { cleanCode, cleanClientId, publicId } from "../../_lib/rooms.js";
import {
  mutateRoom,
  buildView,
  beginGame,
  playMove,
  finish,
} from "../../_lib/chess.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const body = await readBody(request);
  if (body === null) return json({ error: "Invalid request." }, 400);

  const code = cleanCode(body.code);
  const clientId = cleanClientId(body.clientId);
  const kind = body.kind;
  if (!code || !clientId || typeof kind !== "string") {
    return json({ error: "Invalid request." }, 400);
  }

  const pid = await publicId(clientId);

  const result = await mutateRoom(env.DB, code, (state) => {
    const v = state.seats.findIndex((seat) => seat.id === pid);
    if (v < 0) return { error: "You are not in this room.", status: 403 };
    const o = 1 - v;

    if (kind === "leave") return { remove: true };

    if (state.phase === "lobby") {
      return { error: "The game hasn't started.", status: 400 };
    }

    const letter = v === state.whiteSeat ? "w" : "b";
    const opponentColor = o === state.whiteSeat ? "white" : "black";

    if (kind === "move") {
      if (state.phase !== "playing") {
        return { error: "The game is over.", status: 400 };
      }
      if (state.pos.turn !== letter) {
        return { error: "It's not your turn.", status: 400 };
      }
      const from = body.from;
      const to = body.to;
      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 0 ||
        from > 63 ||
        to < 0 ||
        to > 63
      ) {
        return { error: "Invalid move.", status: 400 };
      }
      if (!playMove(state, from, to)) {
        return { error: "That move isn't legal.", status: 400 };
      }
      return { state };
    }

    if (kind === "resign") {
      if (state.phase !== "playing") {
        return { error: "The game is over.", status: 400 };
      }
      finish(state, opponentColor, "resignation");
      return { state };
    }

    if (kind === "offer_draw") {
      if (state.phase !== "playing") {
        return { error: "The game is over.", status: 400 };
      }
      if (state.drawOffer === v) {
        return { error: "You already offered a draw.", status: 400 };
      }
      if (state.drawOffer === o) {
        finish(state, null, "agreement");
        return { state };
      }
      state.drawOffer = v;
      return { state };
    }

    if (kind === "accept_draw") {
      if (state.phase !== "playing" || state.drawOffer !== o) {
        return { error: "There is no draw offer to accept.", status: 400 };
      }
      finish(state, null, "agreement");
      return { state };
    }

    if (kind === "decline_draw") {
      if (state.phase !== "playing" || state.drawOffer !== o) {
        return { error: "There is no draw offer to decline.", status: 400 };
      }
      state.drawOffer = null;
      return { state };
    }

    if (kind === "rematch") {
      if (state.phase !== "over") return { skip: true };
      const round = state.round + 1;
      beginGame(state, 1 - state.whiteSeat);
      state.round = round;
      return { state };
    }

    return { error: "Unknown action.", status: 400 };
  });

  if (result.error) return json({ error: result.error }, result.status);
  if (result.removed) return json({ ok: true, removed: true });

  return json({
    ok: true,
    version: result.version,
    view: buildView(result.state, result.version, code, pid),
  });
}
