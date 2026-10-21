import { json } from "../_lib/auth.js";

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM users"
  ).first();
  return json({ total: row ? row.total : 0 });
}
