const ITERATIONS = 100000;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const encoder = new TextEncoder();

export const DUMMY_SALT = "00000000000000000000000000000000";

export function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function newSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(saltHex),
      iterations: ITERATIONS,
    },
    key,
    256
  );
  return toHex(bits);
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

export function validateUsername(username) {
  if (!USERNAME_PATTERN.test(username)) {
    return "Username must be 3-20 characters: letters, numbers, and underscores only.";
  }
  return null;
}

export function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return null;
  }
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(token) {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function createSession(db, userId) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db
      .prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?")
      .bind(userId, now),
    db
      .prepare(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
      )
      .bind(tokenHash, userId, now + SESSION_SECONDS),
  ]);
  return token;
}

export async function getUser(request, db) {
  const token = getCookie(request, "session");
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  return await db
    .prepare(
      "SELECT users.id AS id, users.username AS username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
    )
    .bind(tokenHash, now)
    .first();
}
