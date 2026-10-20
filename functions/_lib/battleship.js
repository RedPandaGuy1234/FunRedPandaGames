export const COLS = "ABCDEFGHIJ";

export const SHIPS = [
  ["patrol", "Patrol Boat", 2],
  ["destroyer", "Destroyer", 3],
  ["submarine", "Submarine", 3],
  ["battleship", "Battleship", 4],
  ["carrier", "Carrier", 5],
];

function cellKey(c, r) {
  return c * 10 + r;
}

export function shotKeys(list) {
  return new Set(list.map(([c, r]) => cellKey(c, r)));
}

export function shipCellsSunk(cells, keys) {
  return cells.every(([c, r]) => keys.has(cellKey(c, r)));
}

export function shipName(shipId) {
  const ship = SHIPS.find(([id]) => id === shipId);
  return ship ? ship[1] : shipId;
}

export function newRoomState(pid, name) {
  return {
    phase: "lobby",
    round: 0,
    hostId: pid,
    seats: [{ id: pid, name }],
    fleets: [null, null],
    shots: [[], []],
    turn: 0,
    winner: null,
    last: null,
  };
}

export function validateFleet(fleet) {
  if (!fleet || typeof fleet !== "object" || Array.isArray(fleet)) return null;
  if (Object.keys(fleet).length !== SHIPS.length) return null;
  const seen = new Set();
  const clean = {};
  for (const [id, , length] of SHIPS) {
    const cells = fleet[id];
    if (!Array.isArray(cells) || cells.length !== length) return null;
    const parsed = [];
    for (const cell of cells) {
      if (!Array.isArray(cell) || cell.length !== 2) return null;
      const [c, r] = cell;
      if (!Number.isInteger(c) || !Number.isInteger(r)) return null;
      if (c < 0 || c > 9 || r < 0 || r > 9) return null;
      const key = cellKey(c, r);
      if (seen.has(key)) return null;
      seen.add(key);
      parsed.push([c, r]);
    }
    const sameRow = parsed.every((p) => p[1] === parsed[0][1]);
    const sameCol = parsed.every((p) => p[0] === parsed[0][0]);
    if (!sameRow && !sameCol) return null;
    const axis = sameRow ? 0 : 1;
    const sorted = parsed.map((p) => p[axis]).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return null;
    }
    clean[id] = parsed;
  }
  return clean;
}

function occupiedSet(fleet) {
  const set = new Set();
  if (fleet) {
    for (const id of Object.keys(fleet)) {
      for (const [c, r] of fleet[id]) set.add(cellKey(c, r));
    }
  }
  return set;
}

function buildGrid(occupied, shots, showUnhit, unhitLabel) {
  const rows = [];
  for (let r = 0; r < 10; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) {
      const key = cellKey(c, r);
      const isShip = occupied.has(key);
      const isShot = shots.has(key);
      if (isShip && isShot) row.push("hit");
      else if (isShot) row.push("miss");
      else if (isShip && showUnhit) row.push(unhitLabel);
      else row.push("empty");
    }
    rows.push(row);
  }
  return rows;
}

function sunkNames(fleet, shots) {
  if (!fleet) return [];
  return SHIPS.filter(([id]) => shipCellsSunk(fleet[id], shots)).map(
    ([, name]) => name
  );
}

export function buildView(state, version, code, pid) {
  const v = state.seats.findIndex((seat) => seat.id === pid);
  if (v < 0) return null;
  const o = 1 - v;
  const me = state.seats[v];
  const opponent = state.seats[o] || null;
  const myFleet = state.fleets[v];
  const enemyFleet = state.fleets[o];
  const shotsAtMe = shotKeys(state.shots[o]);
  const shotsByMe = shotKeys(state.shots[v]);
  const over = state.phase === "over";

  let last = null;
  if (state.last) {
    last = {
      mine: state.last.by === v,
      cell: COLS[state.last.c] + (state.last.r + 1),
      result: state.last.result,
      ship: state.last.ship,
    };
  }

  let winner = null;
  if (state.winner !== null) winner = state.winner === v ? "you" : "opponent";

  return {
    version,
    code,
    round: state.round,
    phase: state.phase,
    name: me.name,
    opponent_name: opponent ? opponent.name : null,
    ready: !!myFleet,
    opponent_ready: !!enemyFleet,
    my_turn: state.phase === "battle" && state.turn === v,
    winner,
    last,
    my_board: buildGrid(occupiedSet(myFleet), shotsAtMe, true, "ship"),
    enemy_board: buildGrid(occupiedSet(enemyFleet), shotsByMe, over, "remaining"),
    my_ships_sunk: sunkNames(myFleet, shotsAtMe),
    enemy_ships_sunk: sunkNames(enemyFleet, shotsByMe),
  };
}

export async function loadRoom(db, code) {
  const row = await db
    .prepare("SELECT version, state FROM battleship_rooms WHERE code = ?")
    .bind(code)
    .first();
  if (!row) return null;
  return { version: row.version, state: JSON.parse(row.state) };
}

export async function mutateRoom(db, code, change) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await loadRoom(db, code);
    if (!current) return { error: "Room not found.", status: 404 };

    const working = JSON.parse(JSON.stringify(current.state));
    const outcome = await change(working, current.version);

    if (outcome.error) {
      return {
        error: outcome.error,
        status: outcome.status || 400,
        state: current.state,
        version: current.version,
      };
    }
    if (outcome.skip) {
      return { state: current.state, version: current.version };
    }
    if (outcome.remove) {
      await db
        .prepare("DELETE FROM battleship_rooms WHERE code = ?")
        .bind(code)
        .run();
      return { removed: true };
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await db
      .prepare(
        "UPDATE battleship_rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?"
      )
      .bind(JSON.stringify(outcome.state), now, code, current.version)
      .run();

    if (result.meta && result.meta.changes === 1) {
      return { state: outcome.state, version: current.version + 1 };
    }
  }
  return { error: "The room is busy. Please try again.", status: 409 };
}
