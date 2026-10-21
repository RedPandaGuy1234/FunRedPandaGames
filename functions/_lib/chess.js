import { sha256Hex } from "./auth.js";

export const FILES = "abcdefgh";

const KNIGHT_STEPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];
const KING_STEPS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const CORNER_RIGHTS = { 0: "wQ", 7: "wK", 56: "bQ", 63: "bK" };

function squareOf(f, r) {
  return r * 8 + f;
}

function inside(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

function squareName(i) {
  return FILES[i % 8] + (Math.floor(i / 8) + 1);
}

export function startPosition() {
  const board = Array(64).fill(null);
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let f = 0; f < 8; f++) {
    board[squareOf(f, 0)] = "w" + back[f];
    board[squareOf(f, 1)] = "wP";
    board[squareOf(f, 6)] = "bP";
    board[squareOf(f, 7)] = "b" + back[f];
  }
  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: -1,
    half: 0,
    full: 1,
  };
}

function copyPos(pos) {
  return {
    board: pos.board.slice(),
    turn: pos.turn,
    castling: { ...pos.castling },
    ep: pos.ep,
    half: pos.half,
    full: pos.full,
  };
}

function slideAttack(board, tf, tr, dirs, by, types) {
  for (const [df, dr] of dirs) {
    let f = tf + df;
    let r = tr + dr;
    while (inside(f, r)) {
      const p = board[squareOf(f, r)];
      if (p) {
        if (p[0] === by && types.includes(p[1])) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }
  return false;
}

function isAttacked(board, target, by) {
  const tf = target % 8;
  const tr = Math.floor(target / 8);
  const pawnRank = by === "w" ? tr - 1 : tr + 1;
  for (const df of [-1, 1]) {
    const f = tf + df;
    if (inside(f, pawnRank) && board[squareOf(f, pawnRank)] === by + "P") {
      return true;
    }
  }
  for (const [df, dr] of KNIGHT_STEPS) {
    const f = tf + df;
    const r = tr + dr;
    if (inside(f, r) && board[squareOf(f, r)] === by + "N") return true;
  }
  for (const [df, dr] of KING_STEPS) {
    const f = tf + df;
    const r = tr + dr;
    if (inside(f, r) && board[squareOf(f, r)] === by + "K") return true;
  }
  if (slideAttack(board, tf, tr, BISHOP_DIRS, by, ["B", "Q"])) return true;
  return slideAttack(board, tf, tr, ROOK_DIRS, by, ["R", "Q"]);
}

function findKing(board, color) {
  return board.indexOf(color + "K");
}

function inCheck(pos, color) {
  const king = findKing(pos.board, color);
  if (king < 0) return false;
  return isAttacked(pos.board, king, color === "w" ? "b" : "w");
}

function addCastling(pos, moves) {
  const { board, turn } = pos;
  const enemy = turn === "w" ? "b" : "w";
  const base = turn === "w" ? 0 : 56;
  if (board[base + 4] !== turn + "K") return;
  if (isAttacked(board, base + 4, enemy)) return;
  if (
    pos.castling[turn + "K"] &&
    board[base + 7] === turn + "R" &&
    !board[base + 5] &&
    !board[base + 6] &&
    !isAttacked(board, base + 5, enemy) &&
    !isAttacked(board, base + 6, enemy)
  ) {
    moves.push({ from: base + 4, to: base + 6, promo: false });
  }
  if (
    pos.castling[turn + "Q"] &&
    board[base] === turn + "R" &&
    !board[base + 1] &&
    !board[base + 2] &&
    !board[base + 3] &&
    !isAttacked(board, base + 3, enemy) &&
    !isAttacked(board, base + 2, enemy)
  ) {
    moves.push({ from: base + 4, to: base + 2, promo: false });
  }
}

function pseudoMoves(pos) {
  const { board, turn } = pos;
  const enemy = turn === "w" ? "b" : "w";
  const moves = [];
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || piece[0] !== turn) continue;
    const f = from % 8;
    const r = Math.floor(from / 8);
    const type = piece[1];

    if (type === "P") {
      const dir = turn === "w" ? 1 : -1;
      const startRank = turn === "w" ? 1 : 6;
      const lastRank = turn === "w" ? 7 : 0;
      const r1 = r + dir;
      if (inside(f, r1) && !board[squareOf(f, r1)]) {
        moves.push({ from, to: squareOf(f, r1), promo: r1 === lastRank });
        const r2 = r + 2 * dir;
        if (r === startRank && !board[squareOf(f, r2)]) {
          moves.push({ from, to: squareOf(f, r2), promo: false });
        }
      }
      for (const df of [-1, 1]) {
        const cf = f + df;
        if (!inside(cf, r1)) continue;
        const to = squareOf(cf, r1);
        const target = board[to];
        if ((target && target[0] === enemy) || to === pos.ep) {
          moves.push({ from, to, promo: r1 === lastRank });
        }
      }
    } else if (type === "N" || type === "K") {
      const steps = type === "N" ? KNIGHT_STEPS : KING_STEPS;
      for (const [df, dr] of steps) {
        const nf = f + df;
        const nr = r + dr;
        if (!inside(nf, nr)) continue;
        const to = squareOf(nf, nr);
        const target = board[to];
        if (!target || target[0] === enemy) {
          moves.push({ from, to, promo: false });
        }
      }
      if (type === "K") addCastling(pos, moves);
    } else {
      const dirs =
        type === "B"
          ? BISHOP_DIRS
          : type === "R"
          ? ROOK_DIRS
          : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const [df, dr] of dirs) {
        let nf = f + df;
        let nr = r + dr;
        while (inside(nf, nr)) {
          const to = squareOf(nf, nr);
          const target = board[to];
          if (!target) {
            moves.push({ from, to, promo: false });
          } else {
            if (target[0] === enemy) moves.push({ from, to, promo: false });
            break;
          }
          nf += df;
          nr += dr;
        }
      }
    }
  }
  return moves;
}

function applyMove(pos, move) {
  const next = copyPos(pos);
  const { board } = next;
  const piece = board[move.from];
  const color = piece[0];
  const type = piece[1];
  const captured = board[move.to];

  board[move.to] = piece;
  board[move.from] = null;

  if (
    type === "P" &&
    move.to === pos.ep &&
    !captured &&
    move.from % 8 !== move.to % 8
  ) {
    board[move.to + (color === "w" ? -8 : 8)] = null;
  }

  if (move.promo) board[move.to] = color + "Q";

  if (type === "K" && Math.abs(move.to - move.from) === 2) {
    if (move.to > move.from) {
      board[move.from + 1] = board[move.from + 3];
      board[move.from + 3] = null;
    } else {
      board[move.from - 1] = board[move.from - 4];
      board[move.from - 4] = null;
    }
  }

  if (type === "K") {
    next.castling[color + "K"] = false;
    next.castling[color + "Q"] = false;
  }
  for (const s of [move.from, move.to]) {
    if (CORNER_RIGHTS[s]) next.castling[CORNER_RIGHTS[s]] = false;
  }

  next.ep =
    type === "P" && Math.abs(move.to - move.from) === 16
      ? (move.from + move.to) / 2
      : -1;
  next.half = type === "P" || captured ? 0 : pos.half + 1;
  if (color === "b") next.full = pos.full + 1;
  next.turn = color === "w" ? "b" : "w";
  return next;
}

export function legalMoves(pos) {
  const mover = pos.turn;
  const enemy = mover === "w" ? "b" : "w";
  return pseudoMoves(pos).filter((move) => {
    const next = applyMove(pos, move);
    const king = findKing(next.board, mover);
    return king >= 0 && !isAttacked(next.board, king, enemy);
  });
}

function positionKey(pos) {
  const rights = ["wK", "wQ", "bK", "bQ"]
    .filter((k) => pos.castling[k])
    .join("");
  return (
    pos.board.map((p) => p || "--").join("") + pos.turn + rights + pos.ep
  );
}

function insufficientMaterial(board) {
  const rest = [];
  board.forEach((p, i) => {
    if (p && p[1] !== "K") rest.push([p, i]);
  });
  if (rest.length === 0) return true;
  if (rest.length === 1) return rest[0][0][1] === "B" || rest[0][0][1] === "N";
  if (rest.every(([p]) => p[1] === "B")) {
    const shades = new Set(
      rest.map(([, i]) => ((i % 8) + Math.floor(i / 8)) % 2)
    );
    return shades.size === 1;
  }
  return false;
}

export function finish(state, winner, reason) {
  state.phase = "over";
  state.drawOffer = null;
  state.result = { winner, reason };
}

function settle(state) {
  const pos = state.pos;
  const moves = legalMoves(pos);
  if (moves.length === 0) {
    if (inCheck(pos, pos.turn)) {
      finish(state, pos.turn === "w" ? "black" : "white", "checkmate");
    } else {
      finish(state, null, "stalemate");
    }
    return;
  }
  if (insufficientMaterial(pos.board)) {
    finish(state, null, "insufficient material");
    return;
  }
  if (pos.half >= 150) {
    finish(state, null, "75-move rule");
    return;
  }
  const key = state.keys[state.keys.length - 1];
  if (state.keys.filter((k) => k === key).length >= 3) {
    finish(state, null, "threefold repetition");
  }
}

export function beginGame(state, whiteSeat) {
  state.phase = "playing";
  state.whiteSeat = whiteSeat;
  state.pos = startPosition();
  state.keys = [positionKey(state.pos)];
  state.moves = [];
  state.last = null;
  state.result = null;
  state.drawOffer = null;
}

export function playMove(state, from, to) {
  const move = legalMoves(state.pos).find(
    (m) => m.from === from && m.to === to
  );
  if (!move) return false;
  state.pos = applyMove(state.pos, move);
  state.moves.push(squareName(from) + squareName(to));
  const key = positionKey(state.pos);
  if (state.pos.half === 0) state.keys = [key];
  else state.keys.push(key);
  state.last = { from, to };
  state.drawOffer = null;
  settle(state);
  return true;
}

export function newRoomState(pid, name) {
  return {
    phase: "lobby",
    round: 0,
    hostId: pid,
    seats: [{ id: pid, name }],
    whiteSeat: 0,
    pos: null,
    keys: [],
    moves: [],
    last: null,
    result: null,
    drawOffer: null,
  };
}

export function buildView(state, version, code, pid) {
  const v = state.seats.findIndex((seat) => seat.id === pid);
  if (v < 0) return null;
  const o = 1 - v;
  const opponent = state.seats[o] || null;
  const base = {
    version,
    code,
    round: state.round,
    phase: state.phase,
    name: state.seats[v].name,
    opponent_name: opponent ? opponent.name : null,
  };

  if (state.phase === "lobby") {
    return {
      ...base,
      color: null,
      turn: null,
      my_turn: false,
      board: Array(64).fill(null),
      targets: {},
      in_check: false,
      last: null,
      result: null,
      draw_offer: null,
      move_count: 0,
    };
  }

  const color = v === state.whiteSeat ? "white" : "black";
  const turnColor = state.pos.turn === "w" ? "white" : "black";
  const playing = state.phase === "playing";
  const myTurn = playing && turnColor === color;

  const targets = {};
  if (myTurn) {
    for (const m of legalMoves(state.pos)) {
      (targets[m.from] = targets[m.from] || []).push(m.to);
    }
  }

  let result = null;
  if (state.result) {
    let winner = null;
    if (state.result.winner !== null) {
      winner = state.result.winner === color ? "you" : "opponent";
    }
    result = { winner, reason: state.result.reason };
  }

  let offer = null;
  if (playing && state.drawOffer !== null) {
    offer = state.drawOffer === v ? "mine" : "theirs";
  }

  return {
    ...base,
    color,
    turn: turnColor,
    my_turn: myTurn,
    board: state.pos.board,
    targets,
    in_check: inCheck(state.pos, state.pos.turn),
    last: state.last,
    result,
    draw_offer: offer,
    move_count: state.moves.length,
  };
}

export async function loadRoom(db, code) {
  const row = await db
    .prepare("SELECT version, state FROM chess_rooms WHERE code = ?")
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
      await db.prepare("DELETE FROM chess_rooms WHERE code = ?").bind(code).run();
      return { removed: true };
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await db
      .prepare(
        "UPDATE chess_rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?"
      )
      .bind(JSON.stringify(outcome.state), now, code, current.version)
      .run();

    if (result.meta && result.meta.changes === 1) {
      return { state: outcome.state, version: current.version + 1 };
    }
  }
  return { error: "The room is busy. Please try again.", status: 409 };
}
