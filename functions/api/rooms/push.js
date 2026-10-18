import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import {
  MAX_SEATS,
  cleanCode,
  cleanClientId,
  publicId,
  mutateRoom,
} from "../../_lib/rooms.js";

const MAX_GAME_BYTES = 300000;

function validGame(game, expectedPlayers) {
  if (!game || typeof game !== "object" || !Array.isArray(game.players)) {
    return false;
  }
  if (game.players.length < 2 || game.players.length > MAX_SEATS) return false;
  if (expectedPlayers !== null && game.players.length !== expectedPlayers) {
    return false;
  }
  return JSON.stringify(game).length <= MAX_GAME_BYTES;
}

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

  const result = await mutateRoom(env.DB, code, (state, version) => {
    if (!state.seats.some((seat) => seat.id === pid)) {
      return { error: "You are not in this room.", status: 403 };
    }
    const isHost = state.hostId === pid;

    if (kind === "config") {
      if (!isHost || state.phase !== "lobby") {
        return { error: "Only the host can change settings.", status: 403 };
      }
      const incoming = body.config && typeof body.config === "object" ? body.config : {};
      const maxBots = Math.max(0, MAX_SEATS - state.seats.length);
      const bots = Number.isInteger(incoming.bots)
        ? Math.min(Math.max(incoming.bots, 0), maxBots)
        : state.config.bots;
      state.config = {
        bots,
        hardMode: !!incoming.hardMode,
        cont: !!incoming.cont,
      };
      return { state };
    }

    if (kind === "start") {
      if (!isHost || state.phase !== "lobby") {
        return { error: "Only the host can start the game.", status: 403 };
      }
      if (body.baseVersion !== version) {
        return { error: "The room changed. Please try again.", status: 409 };
      }
      if (!validGame(body.game, null)) {
        return { error: "Invalid game.", status: 400 };
      }
      const humanIds = body.game.players
        .filter((p) => !p.isAI)
        .map((p) => p.cid)
        .sort();
      const seatIds = state.seats.map((seat) => seat.id).sort();
      if (humanIds.length < 2 || humanIds.join() !== seatIds.join()) {
        return { error: "At least two players are needed.", status: 400 };
      }
      state.phase = "playing";
      state.game = body.game;
      return { state };
    }

    if (kind === "game") {
      if (state.phase !== "playing" || !state.game) {
        return { error: "The game has not started.", status: 400 };
      }
      if (body.baseVersion !== version) {
        return { error: "Out of date.", status: 409 };
      }
      if (!validGame(body.game, state.game.players.length)) {
        return { error: "Invalid game.", status: 400 };
      }
      state.game = body.game;
      return { state };
    }

    if (kind === "leave") {
      if (state.phase !== "lobby") return { skip: true };
      if (isHost) return { remove: true };
      state.seats = state.seats.filter((seat) => seat.id !== pid);
      state.config.bots = Math.min(
        state.config.bots,
        Math.max(0, MAX_SEATS - state.seats.length)
      );
      return { state };
    }

    return { error: "Unknown action.", status: 400 };
  });

  if (result.error) {
    const payload = { error: result.error };
    if (result.status === 409 && result.state) {
      payload.state = result.state;
      payload.version = result.version;
    }
    return json(payload, result.status);
  }

  if (result.removed) return json({ ok: true });
  if (kind === "game") return json({ ok: true, version: result.version });
  return json({ ok: true, version: result.version, state: result.state });
}
