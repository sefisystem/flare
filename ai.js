// functions/api/ai.js
// Cloudflare Pages Function — secure Claude AI proxy
// Your API key is stored in Cloudflare dashboard, never in code

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  // Get key from Cloudflare environment variable
  const key = env.ANTHROPIC_API_KEY;

  if (!key || key.includes("PASTE_YOUR")) {
    return new Response(JSON.stringify({
      error: "API key not configured. Add ANTHROPIC_API_KEY in Cloudflare Pages → Settings → Environment Variables."
    }), { status: 503, headers });
  }

  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "No prompt provided" }), { status: 400, headers });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: `You are SEFI, an AI football monitoring system for the 2026 World Cup.
You detect anomalies in live match data and explain them clearly.
Always be concise — max 3 sentences.
Format: first sentence = what happened, second = why, third = what the app should show.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Claude API error ${response.status}`);
    }

    const text = data.content?.map(c => c.text || "").join("").trim();

    return new Response(JSON.stringify({ reply: text, tokens: data.usage }), {
      status: 200,
      headers,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
