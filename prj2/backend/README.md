# AI Voice & Image Backend

Backend for the AI assistant using AssemblyAI speech-to-text and Google Gemini text/image generation.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in your `ASSEMBLYAI_API_KEY` and `GEMINI_API_KEY`.
3. Run:

```bash
npm install
npm run dev
```

## API

POST `/api/session`

Request body:

- `user_id` (string)
- `timestamp` (ISO string)
- `input_type` (`text` or `audio`)
- `text` (string, if input_type is `text`)
- `audio_base64` (string, if input_type is `audio`)
- `audio_mime` (string, if input_type is `audio`)

Response:

- `intent`: `image_gen` or `text_answer`
- `image_path`: local file path when intent is `image_gen`
- `text`: generated answer when intent is `text_answer`
