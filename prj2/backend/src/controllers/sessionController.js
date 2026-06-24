const assemblyService = require('../services/assemblyService');
const geminiService = require('../services/geminiService');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function handleSession(req, res, next) {
  try {
    const { user_id, timestamp, input_type, text, audio_base64, audio_mime } = req.body;
    if (!user_id || !timestamp || !input_type) {
      const err = new Error('Missing required fields');
      err.status = 400;
      throw err;
    }

    // Stage 1: Transcription
    let prompt = '';
    if (input_type === 'text') {
      if (!text || typeof text !== 'string' || !text.trim()) {
        const err = new Error('Missing text field for text input');
        err.status = 400;
        throw err;
      }
      prompt = text.trim();
    } else if (input_type === 'audio') {
      if (!audio_base64 || !audio_mime) {
        const err = new Error('Missing audio data');
        err.status = 400;
        throw err;
      }
      const buffer = Buffer.from(audio_base64, 'base64');
      const uploadUrl = await assemblyService.uploadAudio(buffer, audio_mime);
      const transcriptId = await assemblyService.createTranscript(uploadUrl);
      const transcript = await assemblyService.pollTranscript(transcriptId);
      prompt = transcript;
    } else {
      const err = new Error('Invalid input_type');
      err.status = 400;
      throw err;
    }

    // Stage 2: Intent classification
    const intent = await geminiService.classifyIntent(prompt);

    if (intent === 'image') {
      // Stage 3A: Image generation
      const imageBase64 = await geminiService.generateImage(prompt);
      const filename = `${Date.now()}-${user_id}-${uuidv4()}.png`;
      const outDir = path.join(__dirname, '..', '..', 'public', 'images');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, imageBase64, 'base64');
      return res.json({ intent: 'image_gen', image_path: `/public/images/${filename}` });
    } else {
      // Stage 3B: Text answer
      const answer = await geminiService.getTextAnswer(prompt);
      return res.json({ intent: 'text_answer', text: answer });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { handleSession };
