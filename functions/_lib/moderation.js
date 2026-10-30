const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function isAllowed(env, text) {
  const url = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_GATEWAY_NAME}/workers-ai/${MODEL}`;
  const headers = {
    Authorization: `Bearer ${env.CF_AI_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (env.CF_AIG_TOKEN) {
    headers["cf-aig-authorization"] = `Bearer ${env.CF_AIG_TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [{ role: "user", content: text }],
        max_tokens: 1,
      }),
    });

    if (response.ok) return true;

    const raw = await response.text();
    if (/"code"\s*:\s*2016\b/.test(raw)) return false;

    console.error("Moderation request failed", response.status, raw);
    return true;
  } catch (err) {
    console.error("Moderation request error", err);
    return true;
  }
}
