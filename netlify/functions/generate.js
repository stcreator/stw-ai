const { MODELS } = require("./_models");

const HF_API_KEY = process.env.HF_API_KEY; // set this in Netlify dashboard

async function callHuggingFace(modelName, prompt) {
  if (!HF_API_KEY) {
    throw new Error("Missing HF_API_KEY environment variable");
  }

  const res = await fetch(
    `https://router.huggingface.co/v1/inference/${model.modelName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 256,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF error (${modelName}): ${res.status} - ${text}`);
  }

  const data = await res.json();

  // Common HF format: [{ generated_text: "..." }]
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }

  // Fallback
  return JSON.stringify(data, null, 2);
}

exports.handler = async (event) => {
  // Allow only POST
  if (event.httpMethod === "OPTIONS") {
    // For CORS preflight (not strictly needed here, but safe)
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    const promises = MODELS.map(async (m) => {
      if (m.provider === "huggingface") {
        const output = await callHuggingFace(m.modelName, prompt);
        return { id: m.id, label: m.label, output };
      } else {
        return {
          id: m.id,
          label: m.label,
          output: "Provider not implemented",
        };
      }
    });

    const results = await Promise.all(promises);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
