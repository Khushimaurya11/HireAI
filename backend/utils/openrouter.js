const axios = require('axios');

const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

function isConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Send a chat completion request to OpenRouter (GPT-4o-mini).
 * Returns the raw text content of the model's reply.
 * Throws if OPENROUTER_API_KEY is missing or the request fails —
 * callers are expected to catch this and fall back to local heuristics
 * (see utils/heuristics.js) so the product keeps working without a key.
 */
async function chatComplete({ system, user, maxTokens = 800, temperature = 0.4 }) {
  if (!isConfigured()) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data?.choices?.[0]?.message?.content ?? '';
}

/** Same as chatComplete, but strips ```json fences and parses the result. */
async function chatCompleteJSON(args) {
  const raw = await chatComplete(args);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { chatComplete, chatCompleteJSON, isConfigured };
