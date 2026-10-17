import { sha256Hex } from "./auth.js";

export const MAX_SEATS = 5;
export const ROOM_TTL_SECONDS = 60 * 60 * 24;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(
    bytes,
    (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]
  ).join("");
}

export function cleanCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{5}$/.test(code) ? code : null;
}

export function cleanClientId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value)
    ? value
    : null;
}

export function cleanName(value, fallback) {
  const name =
    typeof value === "string"
      ? value
          .replace(/[\u0000-\u001f<>"'&]/g, "")
          .trim()
          .slice(0, 16)
      : "";
  return name || fallback;
}

export async function publicId(clientId) {
  return (await sha256Hex(clientId)).slice(0, 16);
}

export async function loadRoom(db, code) {
  const row = await db
    .prepare("SELECT version, state FROM rooms WHERE code = ?")
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
      await db.prepare("DELETE FROM rooms WHERE code = ?").bind(code).run();
      return { removed: true };
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await db
      .prepare(
        "UPDATE rooms SET state = ?, version = version + 1, updated_at = ? WHERE code = ? AND version = ?"
      )
      .bind(JSON.stringify(outcome.state), now, code, current.version)
      .run();

    if (result.meta && result.meta.changes === 1) {
      return { state: outcome.state, version: current.version + 1 };
    }
  }
  return { error: "The room is busy. Please try again.", status: 409 };
}
