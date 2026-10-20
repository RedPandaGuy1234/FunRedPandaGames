export async function onRequestPost(context) {
  try {
    const { text } = await context.request.json();
    if (!text) return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400 });

    const ACCOUNT_ID = context.env.CF_ACCOUNT_ID;
    const GATEWAY_NAME = context.env.CF_GATEWAY_NAME;
    const API_TOKEN = context.env.CF_AI_TOKEN;

    const response = await fetch(
      `https://cloudflare.com{ACCOUNT_ID}/${GATEWAY_NAME}/workers-ai/v1/components/toxic-detector`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
      }
    );

    if (response.status === 400) {
      return new Response(JSON.stringify({ 
        allowed: false, 
        message: 'Submission blocked: containing profanity or toxic language.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ allowed: true }), { 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Filter check failed' }), { status: 500 });
  }
}
