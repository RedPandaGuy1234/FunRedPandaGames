import { json, getUser } from "../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env.DB);
  return json({ username: user ? user.username : null });
}
