const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta2';
const TEXT_MODEL = 'gemini-1.5-flash';
const IMAGE_MODEL = 'gemini-image-1.5';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set in .env');
}

function getGeminiConfig() {
  return {
    headers: {
      'Content-Type': 'application/json'
    },
    params: {
      key: GEMINI_API_KEY
    }
  };
}

async function retryGemini(fn) {
  let attempts = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && attempts < 3) {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      throw err;
    }
  }
}

function parseTextResponse(data) {
  const candidate = data?.candidates?.[0];
  if (candidate) {
    return candidate.content || candidate.output || '';
  }

  const output = data?.output?.[0];
  if (output?.content?.[0]?.text) {
    return output.content[0].text;
  }

  return data?.text || '';
}

async function classifyIntent(prompt) {
  const url = `${GEMINI_BASE}/models/${TEXT_MODEL}:generateText`;
  const body = {
    prompt: {
      text: `Classify the following user request as exactly one word: image or text.\n\n${prompt}`
    },
    temperature: 0,
    maxOutputTokens: 5,
    candidateCount: 1
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  const text = parseTextResponse(res.data).trim().toLowerCase();
  if (text.includes('image')) return 'image';
  return 'text';
}

async function generateImage(prompt) {
  const url = `${GEMINI_BASE}/images:generate`;
  const body = {
    model: IMAGE_MODEL,
    prompt,
    imageCount: 1,
    size: '1024x1024'
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  const artifact = res.data?.artifacts?.[0] || res.data?.data?.[0];
  const b64 = artifact?.image?.imageBytes || artifact?.imageBytes || artifact?.content || artifact?.b64_json;
  if (!b64) {
    throw new Error('Gemini image generation did not return base64 image bytes');
  }
  return b64;
}

async function getTextAnswer(prompt) {
  const url = `${GEMINI_BASE}/models/${TEXT_MODEL}:generateText`;
  const body = {
    prompt: {
      text: `Answer the following user prompt concisely:\n\n${prompt}`
    },
    temperature: 0.3,
    maxOutputTokens: 250,
    candidateCount: 1
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  return parseTextResponse(res.data).trim();
}

module.exports = { classifyIntent, generateImage, getTextAnswer };
