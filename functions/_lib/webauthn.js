import { sha256Hex, toHex } from "./auth.js";

const CHALLENGE_SECONDS = 300;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const MAX_PASSKEYS = 10;

export function b64uEncode(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function decodeCbor(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;

  function need(count) {
    if (pos + count > bytes.length) throw new Error("Truncated CBOR.");
  }

  function readLength(info) {
    if (info < 24) return info;
    if (info === 24) {
      need(1);
      const value = bytes[pos];
      pos += 1;
      return value;
    }
    if (info === 25) {
      need(2);
      const value = view.getUint16(pos);
      pos += 2;
      return value;
    }
    if (info === 26) {
      need(4);
      const value = view.getUint32(pos);
      pos += 4;
      return value;
    }
    throw new Error("Unsupported CBOR length.");
  }

  function read(depth) {
    if (depth > 8) throw new Error("CBOR too deep.");
    need(1);
    const first = bytes[pos++];
    const major = first >> 5;
    const info = first & 31;

    if (major === 7) {
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22 || info === 23) return null;
      throw new Error("Unsupported CBOR simple value.");
    }

    const length = readLength(info);
    if (major === 0) return length;
    if (major === 1) return -1 - length;
    if (major === 2 || major === 3) {
      need(length);
      const slice = bytes.slice(pos, pos + length);
      pos += length;
      return major === 2 ? slice : decoder.decode(slice);
    }
    if (major === 4) {
      if (length > 256) throw new Error("CBOR array too long.");
      const list = [];
      for (let i = 0; i < length; i++) list.push(read(depth + 1));
      return list;
    }
    if (major === 5) {
      if (length > 256) throw new Error("CBOR map too long.");
      const map = new Map();
      for (let i = 0; i < length; i++) {
        const key = read(depth + 1);
        map.set(key, read(depth + 1));
      }
      return map;
    }
    throw new Error("Unsupported CBOR type.");
  }

  const value = read(0);
  return { value, end: pos };
}

function parseAuthData(authData) {
  if (authData.length < 37) throw new Error("Bad authenticator data.");
  const view = new DataView(
    authData.buffer,
    authData.byteOffset,
    authData.byteLength
  );
  const result = {
    rpIdHash: authData.slice(0, 32),
    flags: authData[32],
    counter: view.getUint32(33),
    credentialId: null,
    publicKey: null,
  };
  if (result.flags & 0x40) {
    if (authData.length < 55) throw new Error("Bad credential data.");
    const idLength = view.getUint16(53);
    const idEnd = 55 + idLength;
    if (idLength < 1 || idLength > 1023 || authData.length < idEnd) {
      throw new Error("Bad credential id.");
    }
    result.credentialId = authData.slice(55, idEnd);
    result.publicKey = decodeCbor(authData.subarray(idEnd)).value;
  }
  return result;
}

function checkClientData(bytes, type, challenge, origin) {
  const data = JSON.parse(decoder.decode(bytes));
  if (
    data.type !== type ||
    data.challenge !== challenge ||
    data.origin !== origin ||
    data.crossOrigin === true
  ) {
    throw new Error("Bad client data.");
  }
}

function coseToJwk(map) {
  if (!(map instanceof Map)) throw new Error("Bad public key.");
  const kty = map.get(1);
  const alg = map.get(3);

  if (kty === 2 && alg === -7) {
    const x = map.get(-2);
    const y = map.get(-3);
    if (
      map.get(-1) !== 1 ||
      !(x instanceof Uint8Array) ||
      !(y instanceof Uint8Array) ||
      x.length !== 32 ||
      y.length !== 32
    ) {
      throw new Error("Bad EC key.");
    }
    return {
      alg: -7,
      jwk: { kty: "EC", crv: "P-256", x: b64uEncode(x), y: b64uEncode(y), ext: true },
    };
  }

  if (kty === 3 && alg === -257) {
    const n = map.get(-1);
    const e = map.get(-2);
    if (!(n instanceof Uint8Array) || !(e instanceof Uint8Array)) {
      throw new Error("Bad RSA key.");
    }
    return {
      alg: -257,
      jwk: { kty: "RSA", n: b64uEncode(n), e: b64uEncode(e), alg: "RS256", ext: true },
    };
  }

  throw new Error("Unsupported key type.");
}

function importPublicKey(jwk, alg) {
  if (alg === -7) {
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  }
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function derToRaw(der) {
  let pos = 0;
  if (der[pos++] !== 0x30) throw new Error("Bad signature.");
  const seqLength = der[pos++];
  if (seqLength & 0x80) pos += seqLength & 0x7f;
  const raw = new Uint8Array(64);
  for (let i = 0; i < 2; i++) {
    if (der[pos++] !== 0x02) throw new Error("Bad signature.");
    const length = der[pos++];
    let value = der.slice(pos, pos + length);
    pos += length;
    while (value.length > 32 && value[0] === 0) value = value.slice(1);
    if (value.length > 32) throw new Error("Bad signature.");
    raw.set(value, i * 32 + (32 - value.length));
  }
  return raw;
}

export function rpInfo(request) {
  const url = new URL(request.url);
  return { rpId: url.hostname, origin: url.origin };
}

async function rpIdHash(rpId) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(rpId))
  );
}

export async function createChallenge(db, userId, purpose) {
  const challenge = b64uEncode(crypto.getRandomValues(new Uint8Array(32)));
  const ticket = toHex(crypto.getRandomValues(new Uint8Array(24)));
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db
      .prepare("DELETE FROM webauthn_challenges WHERE expires_at < ?")
      .bind(now),
    db
      .prepare(
        "INSERT INTO webauthn_challenges (ticket_hash, user_id, purpose, challenge, expires_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(
        await sha256Hex(ticket),
        userId,
        purpose,
        challenge,
        now + CHALLENGE_SECONDS
      ),
  ]);
  return { ticket, challenge };
}

export async function consumeChallenge(db, ticket, purpose) {
  if (typeof ticket !== "string" || !/^[a-f0-9]{48}$/.test(ticket)) return null;
  const hash = await sha256Hex(ticket);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      "SELECT user_id, challenge FROM webauthn_challenges WHERE ticket_hash = ? AND purpose = ? AND expires_at > ?"
    )
    .bind(hash, purpose, now)
    .first();
  if (!row) return null;
  const removed = await db
    .prepare("DELETE FROM webauthn_challenges WHERE ticket_hash = ?")
    .bind(hash)
    .run();
  if (!removed.meta || removed.meta.changes !== 1) return null;
  return row;
}

export async function listPasskeys(db, userId) {
  const result = await db
    .prepare(
      "SELECT id, credential_id, name, created_at FROM passkeys WHERE user_id = ? ORDER BY id ASC"
    )
    .bind(userId)
    .all();
  return result.results;
}

export async function twoFactorEnabled(db, userId) {
  const row = await db
    .prepare("SELECT passkey_2fa FROM security_settings WHERE user_id = ?")
    .bind(userId)
    .first();
  return !!(row && row.passkey_2fa === 1);
}

export async function securityStatus(db, userId) {
  const passkeys = await listPasskeys(db, userId);
  const enabled = await twoFactorEnabled(db, userId);
  const google = await db
    .prepare("SELECT email FROM google_accounts WHERE user_id = ?")
    .bind(userId)
    .first();
  return {
    passkeys: passkeys.map((p) => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
    })),
    twofa: enabled && passkeys.length > 0,
    google: google ? { email: google.email || "" } : null,
  };
}

export async function requestOptions(db, request, userId, purpose) {
  const credentials = await listPasskeys(db, userId);
  const { rpId } = rpInfo(request);
  const { ticket, challenge } = await createChallenge(db, userId, purpose);
  return {
    ticket,
    options: {
      challenge,
      rpId,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: credentials.map((c) => ({
        type: "public-key",
        id: c.credential_id,
      })),
    },
  };
}

export async function creationOptions(db, request, user) {
  const existing = await listPasskeys(db, user.id);
  const { rpId } = rpInfo(request);
  const { ticket, challenge } = await createChallenge(db, user.id, "register");
  return {
    ticket,
    options: {
      challenge,
      rp: { name: "Fun Red Panda Games", id: rpId },
      user: {
        id: b64uEncode(encoder.encode(String(user.id))),
        name: user.username,
        displayName: user.username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      excludeCredentials: existing.map((c) => ({
        type: "public-key",
        id: c.credential_id,
      })),
    },
  };
}

export async function beginTwoFactor(db, request, userId) {
  if (!(await twoFactorEnabled(db, userId))) return null;
  const credentials = await listPasskeys(db, userId);
  if (credentials.length === 0) return null;
  const { ticket, options } = await requestOptions(db, request, userId, "login");
  return { twofa: true, ticket, options };
}

export async function verifyRegistration(request, challenge, credential) {
  const { rpId, origin } = rpInfo(request);
  if (!credential || typeof credential !== "object" || !credential.response) {
    throw new Error("Bad credential.");
  }
  const { clientDataJSON, attestationObject } = credential.response;
  if (typeof clientDataJSON !== "string" || typeof attestationObject !== "string") {
    throw new Error("Bad credential.");
  }

  checkClientData(b64uDecode(clientDataJSON), "webauthn.create", challenge, origin);

  const attestation = decodeCbor(b64uDecode(attestationObject)).value;
  if (!(attestation instanceof Map)) throw new Error("Bad attestation.");
  const authData = attestation.get("authData");
  if (!(authData instanceof Uint8Array)) throw new Error("Bad attestation.");

  const parsed = parseAuthData(authData);
  if (!equalBytes(parsed.rpIdHash, await rpIdHash(rpId))) {
    throw new Error("Wrong relying party.");
  }
  if (!(parsed.flags & 0x01) || !(parsed.flags & 0x04)) {
    throw new Error("User verification missing.");
  }
  if (!parsed.credentialId || !parsed.publicKey) {
    throw new Error("No credential data.");
  }

  const credentialId = b64uEncode(parsed.credentialId);
  if (typeof credential.id === "string" && credential.id !== credentialId) {
    throw new Error("Credential id mismatch.");
  }

  const key = coseToJwk(parsed.publicKey);
  await importPublicKey(key.jwk, key.alg);

  return {
    credentialId,
    publicKey: JSON.stringify(key.jwk),
    alg: key.alg,
    counter: parsed.counter,
  };
}

async function verifyAssertion(request, challenge, credential, stored) {
  const { rpId, origin } = rpInfo(request);
  const response = credential && credential.response;
  if (
    !response ||
    typeof response.clientDataJSON !== "string" ||
    typeof response.authenticatorData !== "string" ||
    typeof response.signature !== "string"
  ) {
    throw new Error("Bad credential.");
  }

  const clientData = b64uDecode(response.clientDataJSON);
  checkClientData(clientData, "webauthn.get", challenge, origin);

  const authData = b64uDecode(response.authenticatorData);
  if (authData.length < 37) throw new Error("Bad authenticator data.");
  if (!equalBytes(authData.slice(0, 32), await rpIdHash(rpId))) {
    throw new Error("Wrong relying party.");
  }
  const flags = authData[32];
  if (!(flags & 0x01) || !(flags & 0x04)) {
    throw new Error("User verification missing.");
  }

  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  const counter = view.getUint32(33);
  if ((counter !== 0 || stored.counter !== 0) && counter <= stored.counter) {
    throw new Error("Counter did not increase.");
  }

  const clientHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", clientData)
  );
  const signedData = concatBytes(authData, clientHash);
  const key = await importPublicKey(JSON.parse(stored.public_key), stored.alg);

  let signature = b64uDecode(response.signature);
  let algorithm = { name: "RSASSA-PKCS1-v1_5" };
  if (stored.alg === -7) {
    signature = derToRaw(signature);
    algorithm = { name: "ECDSA", hash: "SHA-256" };
  }

  const valid = await crypto.subtle.verify(algorithm, key, signature, signedData);
  if (!valid) throw new Error("Bad signature.");
  return counter;
}

export async function verifyAssertionTicket(
  db,
  request,
  ticket,
  purpose,
  credential,
  expectedUserId
) {
  const row = await consumeChallenge(db, ticket, purpose);
  if (!row) return null;
  if (expectedUserId !== null && row.user_id !== expectedUserId) return null;

  const credentialId =
    credential && typeof credential.id === "string" ? credential.id : null;
  if (!credentialId) return null;

  const stored = await db
    .prepare(
      "SELECT id, public_key, alg, counter FROM passkeys WHERE credential_id = ? AND user_id = ?"
    )
    .bind(credentialId, row.user_id)
    .first();
  if (!stored) return null;

  try {
    const counter = await verifyAssertion(request, row.challenge, credential, stored);
    await db
      .prepare("UPDATE passkeys SET counter = ? WHERE id = ?")
      .bind(counter, stored.id)
      .run();
    return row.user_id;
  } catch {
    return null;
  }
}
