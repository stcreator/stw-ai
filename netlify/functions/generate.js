// netlify/functions/generate.js
const { MODELS } = require("./_models");

const HF_API_KEY = process.env.HF_API_KEY;

async function callHuggingFace(model, prompt) {
  if (!HF_API_KEY) {
    throw new Error("Missing HF_API_KEY environment variable");
  }

  const max_new_tokens = model.settings?.max_new_tokens ?? 256;
  const temperature = model.settings?.temperature ?? 0.7;

  // Correct new endpoint for HuggingFace
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
          max_new_tokens,
          temperature,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF error (${model.modelName}): ${res.status} - ${text}`);
  }

  const data = await res.json();

  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }

  return JSON.stringify(data, null, 2);
}

exports.handler = async (event) => {
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

    const promises = MODELS.map(async (model) => {
      if (model.provider === "huggingface") {
        const output = await callHuggingFace(model, prompt);
        return { id: model.id, label: model.label, output };
      }
      return {
        id: model.id,
        label: model.label,
        output: "Provider not implemented",
      };
    });

    const results = await Promise.all(promises);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
