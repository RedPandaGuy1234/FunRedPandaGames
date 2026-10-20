import { json, sameOrigin, readBody } from "../../_lib/auth.js";
import { cleanCode, cleanClientId, publicId } from "../../_lib/rooms.js";
import {
  SHIPS,
  shotKeys,
  shipCellsSunk,
  shipName,
  validateFleet,
  mutateRoom,
  buildView,
} from "../../_lib/battleship.js";

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

    if (kind === "place") {
      if (state.phase !== "placing" || state.fleets[v] !== null) {
        return { error: "You can't place a fleet right now.", status: 400 };
      }
      const fleet = validateFleet(body.fleet);
      if (!fleet) return { error: "That fleet isn't valid.", status: 400 };
      state.fleets[v] = fleet;
      if (state.fleets[0] && state.fleets[1]) {
        state.phase = "battle";
        state.turn = Math.random() < 0.5 ? 0 : 1;
        state.last = null;
      }
      return { state };
    }

    if (kind === "fire") {
      if (state.phase !== "battle") {
        return { error: "The battle hasn't started.", status: 400 };
      }
      if (state.turn !== v) {
        return { error: "It's not your turn.", status: 400 };
      }
      const c = body.c;
      const r = body.r;
      if (
        !Number.isInteger(c) ||
        !Number.isInteger(r) ||
        c < 0 ||
        c > 9 ||
        r < 0 ||
        r > 9
      ) {
        return { error: "Invalid coordinate.", status: 400 };
      }
      const mine = shotKeys(state.shots[v]);
      if (mine.has(c * 10 + r)) {
        return { error: "You already fired there.", status: 400 };
      }
      state.shots[v].push([c, r]);
      mine.add(c * 10 + r);

      const enemy = state.fleets[o];
      let hitShip = null;
      for (const [id] of SHIPS) {
        if (enemy[id].some(([cc, rr]) => cc === c && rr === r)) hitShip = id;
      }

      let outcome = "miss";
      let ship = null;
      if (hitShip) {
        outcome = shipCellsSunk(enemy[hitShip], mine) ? "sunk" : "hit";
        ship = shipName(hitShip);
      }
      state.last = { by: v, c, r, result: outcome, ship };

      if (SHIPS.every(([id]) => shipCellsSunk(enemy[id], mine))) {
        state.phase = "over";
        state.winner = v;
      } else {
        state.turn = o;
      }
      return { state };
    }

    if (kind === "rematch") {
      if (state.phase !== "over") return { skip: true };
      state.phase = "placing";
      state.round += 1;
      state.fleets = [null, null];
      state.shots = [[], []];
      state.winner = null;
      state.last = null;
      return { state };
    }

    if (kind === "leave") return { remove: true };

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
