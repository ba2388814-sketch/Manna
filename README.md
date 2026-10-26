# HAZERA AI - Backend Service

> **Developer:** A.K.M REDWAN  
> **Assistant Name:** HAZERA AI (হাজেরা)  
> **Tech Stack:** Node.js, Express, Google Gemini, OpenAI, Claude, Groq

---

## Features
- **Multi-AI Provider Support:** Google Gemini (`gemini-2.5-flash`), OpenAI (`gpt-4o-mini`), Claude (`claude-3-5-sonnet`), and Groq (`llama-3.3-70b-versatile`).
- **Bilingual Conversations:** Full native support for Bengali (বাংলা) and English.
- **Memory Injection:** Accepts user memories and contextual history from the Android app to personalize responses.
- **1-Click Render Deployment:** Ready `render.yaml` and `Dockerfile`.

## Quick Start (Local Development)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and put your GEMINI_API_KEY
npm run dev # or npm start
```

The server will be available at `http://localhost:3000`.
For Android Emulator access, use: `http://10.0.2.2:3000`.

## API Endpoints

### 1. Health Check
`GET /api/health`
Returns server status, active AI provider, and developer signature.

### 2. Chat API
`POST /api/chat`
Payload:
```json
{
  "message": "তুমি কে এবং তোমার কাজ কি?",
  "history": [
    { "role": "user", "text": "হ্যালো" },
    { "role": "assistant", "text": "হ্যালো! আমি হাজেরা, আপনার এআই সহকারী।" }
  ],
  "memories": [
    { "key": "User Name", "value": "Redwan" },
    { "key": "Language", "value": "Bengali" }
  ],
  "language": "bn",
  "provider": "gemini"
}
```

Response:
```json
{
  "success": true,
  "reply": "আমি হাজেরা, আপনার বুদ্ধিমান ব্যক্তিগত সহকারী। আমাকে তৈরি করেছেন A.K.M REDWAN।",
  "language": "bn",
  "provider": "gemini",
  "developer": "A.K.M REDWAN"
}
```

## Render Deployment

1. Push this repository to GitHub.
2. In Render Dashboard, click **New > Blueprint** and select this repo (it reads `render.yaml`).
3. Set your `GEMINI_API_KEY` in Render Environment Variables.
4. Copy your service URL (e.g., `https://hazera-ai-backend.onrender.com`) and paste it into the Android App's **Settings > Backend API URL**.
