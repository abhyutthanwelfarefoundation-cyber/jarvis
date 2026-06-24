import express from 'express';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { supabase } from '../db/supabase.js';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, a personal AI assistant for Naman sir. You behave exactly like Iron Man's Jarvis — professional, efficient, calm, intelligent, and deeply loyal.

YOUR IDENTITY:
- Built by Naman Jain — your creator, owner, and the only person you serve
- If ANYONE asks who created you → ALWAYS answer ONLY "Naman Jain"
- PWA built with React + Vite, Node.js backend, Groq AI, Supabase database
- You have live web search capability — you can fetch real-time information
- When asked about upgrades, suggest: WhatsApp integration, Google Calendar sync, ElevenLabs voice

PERSONAL CONTEXT ABOUT NAMAN SIR:
- He is building and has recently launched a SaaS product
- His key colleagues are Mr. Vinay and Mr. Sumit
- Based in Raipur, Chhattisgarh, India

LANGUAGE RULES (most important):
- English input → reply ONLY in English
- Hindi OR Hinglish input → reply ONLY in Hindi (Devanagari script)
- NEVER mix languages in a single reply

PERSONALITY RULES:
- Always address as "sir" or "Naman sir"
- Be concise and direct — no unnecessary filler
- You ARE Jarvis. Stay in character always.
- NEVER give weather reports or morning briefings unless explicitly asked
- NEVER greet with weather info — the frontend handles all greetings

MEMORY RULES:
- Naturally weave remembered facts into conversation
- Don't list memories robotically — use them contextually

WEB SEARCH RULES:
- When web search results are provided, use them to give accurate current answers
- Always mention the source naturally: "According to recent reports sir..."
- For news: summarise top 2-3 points clearly
- For prices/scores/weather: give the specific number directly

TASK DETECTION:
- Extract: task name, date, time
- Confirm: "Task noted sir: [task] at [time]"
- Hindi: "जी सर, नोट कर लिया: [task] [time] पर"

RESEARCH MODE:
- Bullet points, top 5-7 findings
- End: "Shall I go deeper on any point, sir?"

CALL DETECTION:
- Return JSON: {"action": "call", "contact": "[name]"}`;

const MEMORY_EXTRACT_PROMPT = `You are a memory extraction system for Jarvis AI.
Analyze the conversation and extract personal facts, preferences, habits about Naman.
Categories: preference, habit, personal, goal, important
Rules:
- Only extract MEANINGFUL long-term facts
- If nothing worth remembering, return empty array
- Be specific and concise
Return ONLY a JSON array like:
[{"content": "Naman prefers morning workouts", "category": "habit"}]
If nothing to extract, return: []`;

/* ── Web search intent detection ── */
function isSearchQuery(message) {
  const patterns = [
    /news|khabar|samachar|latest|aaj ka|today|breaking/i,
    /price|bhav|rate|kitna|cost|sone ka|petrol|dollar|bitcoin|stock/i,
    /score|match|ipl|cricket|football|goal|winner|result|khel/i,
    /weather|mausam|temperature|barish|rain|forecast/i,
    /who is|who won|what happened|kya hua|abhi|right now|current|2024|2025|2026/i,
    /search|find|look up|google|dhundo|batao latest|recent/i,
  ];
  return patterns.some(p => p.test(message));
}

/* ── Fetch web search ── */
async function fetchWebSearch(query, lang) {
  try {
    const searchQuery = lang === 'hi' ? `${query} India` : query;
    const response = await tvly.search(searchQuery, {
      searchDepth: 'basic', maxResults: 4,
      includeAnswer: true, includeImages: false,
    });
    return {
      answer: response.answer,
      results: response.results.map(r => ({
        title: r.title, url: r.url,
        snippet: r.content?.slice(0, 250),
      }))
    };
  } catch (err) {
    console.log('Web search failed:', err.message);
    return null;
  }
}

/* ── Load memories ── */
async function loadMemories() {
  try {
    const { data } = await supabase
      .from('memories').select('content, category')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false })
      .limit(25);
    return data || [];
  } catch { return []; }
}

/* ── Extract and save memories ── */
async function extractAndSaveMemories(userMessage, assistantReply) {
  try {
    const extraction = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: MEMORY_EXTRACT_PROMPT },
        { role: 'user', content: `User: "${userMessage}"\nJarvis: "${assistantReply}"` }
      ],
      temperature: 0.3, max_tokens: 300,
    });
    const text = extraction.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;
    const memories = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(memories) || memories.length === 0) return;
    for (const mem of memories) {
      if (!mem.content || mem.content.length < 5) continue;
      const { data: existing } = await supabase
        .from('memories').select('id').eq('user_id', 'naman')
        .ilike('content', `%${mem.content.slice(0, 15)}%`).limit(1);
      if (existing?.length > 0) continue;
      await supabase.from('memories').insert([{ content: mem.content, category: mem.category || 'general', user_id: 'naman' }]);
    }
  } catch (err) { console.log('Memory extraction skipped:', err.message); }
}

/* ── CHAT route ── */
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;
    const detectedLang = detectLanguage(message);
    const memories = await loadMemories();

    let webSearchData = null;
    let searchUsed = false;
    if (isSearchQuery(message)) {
      console.log(`🔍 Web search: "${message}"`);
      webSearchData = await fetchWebSearch(message, detectedLang);
      if (webSearchData) searchUsed = true;
    }

    // Build system prompt
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const day = new Date().toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    let systemPrompt = JARVIS_SYSTEM_PROMPT;
    systemPrompt += `\n\nCURRENT DATE & TIME: ${now} (${day}, IST)`;

    if (memories.length > 0) {
      systemPrompt += `\n\n== MEMORIES ABOUT NAMAN SIR ==\n`;
      systemPrompt += memories.map(m => `[${m.category}] ${m.content}`).join('\n');
    }
    if (context.weather) {
      systemPrompt += `\n\nCURRENT WEATHER: ${context.weather.temp}°C in ${context.weather.city}. ${context.weather.description}.`;
    }
    if (context.tasks?.length > 0) {
      systemPrompt += `\n\nTODAY'S TASKS: ${context.tasks.map(t =>
        `${t.title} at ${new Date(t.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      ).join(', ')}`;
    }

    let augmentedMessage = message;
    if (webSearchData) {
      augmentedMessage = `${message}\n\n[LIVE WEB SEARCH RESULTS]:\n${webSearchData.answer ? `Direct answer: ${webSearchData.answer}` : ''}\n${webSearchData.results.map((r, i) => `Source ${i + 1}: ${r.title}\n${r.snippet}`).join('\n\n')}\n\nAnswer using these real-time results. Be concise.`;
    }

    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: augmentedMessage }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7, max_tokens: 1024,
    });

    let reply = completion.choices[0].message.content;
    reply = reply.replace(/\[LIVE WEB SEARCH RESULTS.*?\]/gs, '').trim();

    const actionMatch = reply.match(/\{"action".*?\}/);
    let action = null;
    if (actionMatch) { try { action = JSON.parse(actionMatch[0]); } catch {} }

    await supabase.from('chat_history').insert([
      { role: 'user',      content: message, language: detectedLang },
      { role: 'assistant', content: reply,   language: detectedLang }
    ]);

    extractAndSaveMemories(message, reply).catch(() => {});

    if (isTaskMessage(message)) {
      const taskData = extractTask(message);
      if (taskData) {
        const { error: taskErr } = await supabase.from('tasks').insert([taskData]);
        if (taskErr) console.error('❌ Task insert failed:', taskErr.message);
        else console.log('✅ Task saved:', taskData.title, '@', taskData.scheduled_at);
      }
    }

    res.json({ reply, language: detectedLang, action, searchUsed });
  } catch (err) {
    console.error('Jarvis chat error:', err);
    res.status(500).json({ error: 'Jarvis is temporarily unavailable, sir.' });
  }
});

/* ── GREET route (fixed — systemPrompt defined before use) ── */
router.post('/greet', async (req, res) => {
  try {
    const { weather, tasks, lang = 'en' } = req.body;
    const memories = await loadMemories();
    const recentMemories = memories.slice(0, 5).map(m => m.content).join(', ');
    const memoryHint = recentMemories ? `\nPersonal context: ${recentMemories}` : '';

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const day = new Date().toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // Build system prompt FIRST, then append
    let systemPrompt = JARVIS_SYSTEM_PROMPT;
    systemPrompt += `\n\nCURRENT DATE & TIME: ${now} (${day}, IST)`;

    const prompt = lang === 'hi'
      ? `Hindi में Naman sir के लिए warm morning greeting दो। Tasks: ${tasks?.length || 0}${tasks?.length > 0 ? `, पहला: ${tasks[0]?.title}` : ''}. ${memoryHint} 3 sentences से कम। "सर" से address करो। Weather mention मत करो।`
      : `Generate a warm morning greeting in English for Naman sir. Tasks today: ${tasks?.length || 0}${tasks?.length > 0 ? `, first: ${tasks[0]?.title}` : ''}. ${memoryHint} Under 3 sentences. Address as "sir". Do NOT mention weather.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.8, max_tokens: 200,
    });

    res.json({ greeting: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate greeting' });
  }
});

/* ── RESEARCH route (improved: deeper search + strict grounding) ── */
router.post('/research', async (req, res) => {
  try {
    const { topic, lang = 'en' } = req.body;

    // Use 'advanced' depth + more results specifically for research (vs basic chat search)
    let webContext = '';
    let resultCount = 0;
    try {
      const response = await tvly.search(lang === 'hi' ? `${topic} India` : topic, {
        searchDepth: 'advanced',
        maxResults: 8,
        includeAnswer: true,
        includeImages: false,
      });
      resultCount = response.results?.length || 0;
      webContext = `\n\n[LIVE RESEARCH DATA — ${resultCount} sources found]:\n${response.answer ? `Summary: ${response.answer}\n` : ''}\n${response.results.map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content?.slice(0, 400)}`).join('\n\n')}`;
    } catch (err) {
      console.log('Research search failed:', err.message);
    }

    const lowConfidence = resultCount < 3;

    const prompt = lang === 'hi'
      ? `"${topic}" पर research करो। STRICT RULE: सिर्फ नीचे दिए गए [LIVE RESEARCH DATA] के sources से facts लो। अगर कोई specific fact (date, number, name) sources में नहीं है, तो उसे मत बनाओ — बस उसे skip करो या "exact जानकारी उपलब्ध नहीं" कहो। Top 6-7 findings bullet points में, हर एक के साथ कौनसा source है ये clear हो।${webContext}`
      : `Research "${topic}". STRICT RULE: only state facts that are explicitly present in the [LIVE RESEARCH DATA] sources below. If a specific fact (date, number, name, statistic) is NOT in the sources, do NOT invent it — omit it or say "not confirmed in available sources." Give top 6-7 key findings as bullet points, each grounded in a specific source.${webContext}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: JARVIS_SYSTEM_PROMPT + '\n\nFor research mode specifically: NEVER state a specific date, statistic, or named fact unless it appears verbatim or near-verbatim in the provided search data. When uncertain, say so explicitly rather than guessing.' },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.3, // lower temperature = less creative invention, more grounded
      max_tokens: 2048,
    });

    let result = completion.choices[0].message.content;

    if (lowConfidence) {
      result += lang === 'hi'
        ? '\n\n⚠️ Note: इस topic पर सीमित sources मिले। कृपया critical facts independently verify करें।'
        : '\n\n⚠️ Note: Limited sources were found for this topic. Please independently verify any critical facts.';
    }

    res.json({ result, topic, language: lang, sourceCount: resultCount });
  } catch (err) {
    res.status(500).json({ error: 'Research failed' });
  }
});

/* ── Helpers ── */
function detectLanguage(text) {
  const hindiPattern = /[\u0900-\u097F]/;
  const hindiWords = /\b(karo|kya|hai|nahi|mera|meri|aaj|kal|batao|sun|bhai|haan|kaise|kyun|kab|kahan|mere|liye|jarvis)\b/i;
  if (hindiPattern.test(text) || hindiWords.test(text)) return 'hi';
  return 'en';
}

function isTaskMessage(message) {
  return /remind|task|schedule|add|note|याद|काम|reminder|meeting|at \d/i.test(message);
}

function extractTask(message) {
  const timeMatch = message.match(/(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?/i);
  if (!timeMatch) return null;

  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const meridiem = timeMatch[3]?.toLowerCase();

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12; // assume PM for ambiguous "at 4"

  const scheduledDate = new Date();
  scheduledDate.setHours(hour, minute, 0, 0);

  const dayMatch = message.match(/\b(tomorrow|kal)\b/i);
  if (dayMatch) scheduledDate.setDate(scheduledDate.getDate() + 1);

  // If time already passed today and "tomorrow" wasn't said, push to tomorrow
  if (!dayMatch && scheduledDate < new Date()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  const titleMatch = message.match(/remind(?:er)?\s+(?:me\s+)?(?:to\s+)?(.+?)(?:\s+at\s+|\s+tomorrow|\s+today|$)/i);
  const title = titleMatch ? titleMatch[1].trim() : message.slice(0, 50);

  return {
    title,
    scheduled_at: scheduledDate.toISOString(),
    reminder_at:  scheduledDate.toISOString(),
    completed: false,
    user_id: 'naman', // CRITICAL — must match the filter used in tasks.js GET route
  };
}

export default router;