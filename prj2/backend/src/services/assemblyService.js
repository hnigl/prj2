const axios = require('axios');

const ASSEMBLY_API = process.env.ASSEMBLYAI_API_KEY;
if (!ASSEMBLY_API) {
  console.warn('Warning: ASSEMBLYAI_API_KEY not set in .env');
}

async function uploadAudio(buffer, mime) {
  // AssemblyAI upload endpoint
  const url = 'https://api.assemblyai.com/v2/upload';
  const res = await axios.post(url, buffer, {
    headers: {
      authorization: ASSEMBLY_API,
      'content-type': 'application/octet-stream'
    }
  });
  return res.data.upload_url;
}

async function createTranscript(uploadUrl) {
  const url = 'https://api.assemblyai.com/v2/transcript';
  const res = await axios.post(url, { audio_url: uploadUrl }, {
    headers: { authorization: ASSEMBLY_API }
  });
  return res.data.id;
}

async function pollTranscript(id) {
  const url = `https://api.assemblyai.com/v2/transcript/${id}`;
  // poll every 1.5s until completed or error
  while (true) {
    const res = await axios.get(url, { headers: { authorization: ASSEMBLY_API } });
    const status = res.data.status;
    if (status === 'completed') return res.data.text;
    if (status === 'error') {
      const err = new Error(`AssemblyAI error: ${res.data.error}`);
      err.status = 502;
      throw err;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

module.exports = { uploadAudio, createTranscript, pollTranscript };
