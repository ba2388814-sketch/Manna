/**
 * HAZERA AI - Personal AI Assistant Backend
 * Developed by: A.K.M REDWAN
 * Compatible with Render, Node.js 18+, Docker
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configuration
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'HAZERA AI';
const DEVELOPER_NAME = process.env.DEVELOPER_NAME || 'A.K.M REDWAN';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

// Build System Prompt with Memories and Developer Context
function buildSystemPrompt(memories = [], language = 'auto') {
  let memoryBlock = '';
  if (Array.isArray(memories) && memories.length > 0) {
    const memoryItems = memories
      .filter((m) => m && (m.key || m.value))
      .map((m) => `- ${m.key || 'Fact'}: ${m.value}`)
      .join('\n');
    if (memoryItems) {
      memoryBlock = `\n\n[USER FACTS & MEMORY]\nYou remember these key facts about the user:\n${memoryItems}\nUse these memories naturally when relevant.`;
    }
  }

  let languageInstruction = '';
  if (language === 'bn') {
    languageInstruction = '\nAlways reply in natural, clear, polite Bengali (বাংলা).';
  } else if (language === 'en') {
    languageInstruction = '\nAlways reply in fluent, natural English.';
  } else {
    languageInstruction = '\nLanguage Mode: Bilingual (Bengali & English). Detect the language used by the user. If they write or speak in Bengali (বাংলা or phonetic banglish), reply in beautiful, polite Bengali. If they communicate in English, reply in friendly English.';
  }

  return `You are ${ASSISTANT_NAME} (হাজেরা এআই), an ultra-intelligent, warm, articulate, and empathetic female personal AI assistant created and developed by ${DEVELOPER_NAME}.

Core Directives:
1. Identity: When asked who created you or who your developer is, always state that you were developed by ${DEVELOPER_NAME}.
2. Tone: Warm, helpful, respectful, modern, and engaging.
3. Conversational Style: Provide direct, clear, conversational answers. Keep responses well-paced and easy to listen to if read aloud by Text-to-Speech. Use formatting (bullet points, bold text) where it aids clarity.
4. Voice Readiness: Avoid excessive robotic boilerplate or overly lengthy disclaimers.${languageInstruction}${memoryBlock}`;
}

// ----------------- AI Provider Handlers -----------------

// 1. Google Gemini Provider
async function callGemini(message, history, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Format contents array
  const contents = [];

  // Add conversation history
  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h || !h.text) continue;
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      });
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: parseInt(process.env.MAX_TOKENS || '1024', 10)
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText;
    throw new Error(`Gemini API Error: ${errorMsg}`);
  }

  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;
  if (!replyText) {
    throw new Error('Empty response received from Gemini.');
  }

  return replyText;
}

// 2. OpenAI Provider
async function callOpenAI(message, history, systemPrompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [{ role: 'system', content: systemPrompt }];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h || !h.text) continue;
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text
      });
    }
  }

  messages.push({ role: 'user', content: message });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS || '1024', 10)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI Error: ${data?.error?.message || response.statusText}`);
  }

  return data.choices?.[0]?.message?.content || 'No reply generated.';
}

// 3. Anthropic Claude Provider
async function callAnthropic(message, history, systemPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const url = 'https://api.anthropic.com/v1/messages';

  const messages = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h || !h.text) continue;
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text
      });
    }
  }
  messages.push({ role: 'user', content: message });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages,
      max_tokens: parseInt(process.env.MAX_TOKENS || '1024', 10)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Anthropic Error: ${data?.error?.message || response.statusText}`);
  }

  return data.content?.[0]?.text || 'No response from Claude.';
}

// 4. Groq Provider
async function callGroq(message, history, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h || !h.text) continue;
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text
      });
    }
  }
  messages.push({ role: 'user', content: message });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Groq Error: ${data?.error?.message || response.statusText}`);
  }

  return data.choices?.[0]?.message?.content || 'No reply generated.';
}

// ----------------- API Routes -----------------

// Health & Root Status
app.get(['/', '/api/health'], (req, res) => {
  res.json({
    status: 'online',
    service: ASSISTANT_NAME,
    version: '1.0.0',
    developer: DEVELOPER_NAME,
    activeProvider: AI_PROVIDER,
    supportedProviders: ['gemini', 'openai', 'anthropic', 'groq'],
    languages: ['Bengali (বাংলা)', 'English'],
    timestamp: new Date().toISOString()
  });
});

// App Info
app.get('/api/info', (req, res) => {
  res.json({
    name: ASSISTANT_NAME,
    tagline: 'Your Intelligent Personal AI Companion',
    developer: DEVELOPER_NAME,
    capabilities: [
      'Voice input & Text-to-speech',
      'Bilingual Bengali & English conversations',
      'Persistent memory & user preference tracking',
      'Multi-engine AI backend with Render deployment',
      'Customizable speech pitch and tone'
    ]
  });
});

// Chat Conversation Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], memories = [], language = 'auto', provider } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const selectedProvider = (provider || AI_PROVIDER).toLowerCase();
    const systemPrompt = buildSystemPrompt(memories, language);

    let reply = '';
    let executedProvider = selectedProvider;

    switch (selectedProvider) {
      case 'openai':
        reply = await callOpenAI(message, history, systemPrompt);
        break;
      case 'anthropic':
        reply = await callAnthropic(message, history, systemPrompt);
        break;
      case 'groq':
        reply = await callGroq(message, history, systemPrompt);
        break;
      case 'gemini':
      default:
        // Default to Gemini
        executedProvider = 'gemini';
        reply = await callGemini(message, history, systemPrompt);
        break;
    }

    // Detect language of response for TTS guidance
    const isBengali = /[\u0980-\u09FF]/.test(reply);
    const detectedLanguage = isBengali ? 'bn' : 'en';

    res.json({
      success: true,
      reply: reply.trim(),
      language: detectedLanguage,
      provider: executedProvider,
      timestamp: Date.now(),
      assistant: ASSISTANT_NAME,
      developer: DEVELOPER_NAME
    });
  } catch (err) {
    console.error('Error handling /api/chat:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while processing AI response.',
      assistant: ASSISTANT_NAME
    });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 ${ASSISTANT_NAME} Backend running on port ${PORT}`);
  console.log(`👨‍💻 Developer: ${DEVELOPER_NAME}`);
  console.log(`⚡ AI Provider: ${AI_PROVIDER}`);
  console.log(`===============================================`);
});
