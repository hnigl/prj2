const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY (or GOOGLE_API_KEY) not set in .env');
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

function buildContents(prompt) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };
}

function parseTextResponse(data) {
  const candidate = data?.candidates?.[0];
  const part = candidate?.content?.parts?.find((item) => typeof item.text === 'string');
  if (part?.text) {
    return part.text;
  }

  return data?.text || '';
}

async function classifyIntent(prompt) {
  const url = `${GEMINI_BASE}/models/${TEXT_MODEL}:generateContent`;
  const body = {
    ...buildContents(`Classify the following user request as exactly one word: image or text.\n\n${prompt}`),
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 5,
      candidateCount: 1
    }
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  const text = parseTextResponse(res.data).trim().toLowerCase();
  if (text.includes('image')) return 'image';
  return 'text';
}

async function generateImage(prompt) {
  const url = `${GEMINI_BASE}/models/${IMAGE_MODEL}:generateContent`;
  const body = {
    ...buildContents(prompt),
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  const candidate = res.data?.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((part) => part.inlineData?.data);
  const b64 = imagePart?.inlineData?.data;
  if (!b64) {
    throw new Error('Gemini image generation did not return base64 image bytes');
  }
  return b64;
}

async function getTextAnswer(prompt) {
  const url = `${GEMINI_BASE}/models/${TEXT_MODEL}:generateContent`;
  const body = {
    ...buildContents(`Answer the following user prompt concisely:\n\n${prompt}`),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 250,
      candidateCount: 1
    }
  };

  const res = await retryGemini(() => axios.post(url, body, getGeminiConfig()));
  return parseTextResponse(res.data).trim();
}

module.exports = { classifyIntent, generateImage, getTextAnswer };
