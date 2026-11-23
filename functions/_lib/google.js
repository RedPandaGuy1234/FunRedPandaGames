import { b64uDecode } from "./webauthn.js";

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const decoder = new TextDecoder();
const encoder = new TextEncoder();

let cache = { keys: null, expires: 0 };

async function loadKeys() {
  const now = Date.now();
  if (cache.keys && cache.expires > now) return cache.keys;
  const response = await fetch(CERTS_URL);
  if (!response.ok) throw new Error("Could not load Google keys.");
  const data = await response.json();
  const match = /max-age=(\d+)/.exec(response.headers.get("Cache-Control") || "");
  const ttl = match ? Math.min(parseInt(match[1], 10), 21600) : 3600;
  cache = { keys: data.keys, expires: now + ttl * 1000 };
  return data.keys;
}

export async function verifyGoogleToken(env, token) {
  if (!env.GOOGLE_CLIENT_ID) return null;
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(decoder.decode(b64uDecode(parts[0])));
    const payload = JSON.parse(decoder.decode(b64uDecode(parts[1])));
    if (header.alg !== "RS256" || !header.kid) return null;

    const keys = await loadKeys();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64uDecode(parts[2]),
      encoder.encode(parts[0] + "." + parts[1])
    );
    if (!valid) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== env.GOOGLE_CLIENT_ID) return null;
    if (!ISSUERS.includes(payload.iss)) return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email.slice(0, 254) : "",
    };
  } catch {
    return null;
  }
}
