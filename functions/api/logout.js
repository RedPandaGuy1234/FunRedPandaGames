import {
  json,
  sameOrigin,
  getCookie,
  sha256Hex,
  clearSessionCookie,
} from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Forbidden." }, 403);

  const token = getCookie(request, "session");
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
  }

  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
