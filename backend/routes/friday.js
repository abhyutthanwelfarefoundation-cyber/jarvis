import express from 'express';
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { supabase } from '../db/supabase.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// ── Fetch today's news ─────────────────────────────────
async function fetchNews(lang = 'en') {
  try {
    const query = lang === 'hi'
      ? 'India aaj ki taaza khabar today'
      : 'India top news today';

    const result = await tvly.search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: false,
    });

    return result.results.slice(0, 3).map(r => ({
      title: r.title,
      snippet: r.content?.slice(0, 150),
      url: r.url,
    }));
  } catch {
    return [];
  }
}

// ── Fetch weather ──────────────────────────────────────
async function fetchWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Raipur&appid=${process.env.WEATHER_API_KEY}&units=metric`;
    const res = await axios.get(url);
    return {
      temp: Math.round(res.data.main.temp),
      feels_like: Math.round(res.data.main.feels_like),
      description: res.data.weather[0].description,
      humidity: res.data.main.humidity,
      city: 'Raipur',
    };
  } catch {
    return null;
  }
}

// ── Fetch today's tasks ────────────────────────────────
async function fetchTodayTasks() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', 'naman')
      .eq('completed', false)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    return data || [];
  } catch {
    return [];
  }
}

// ── Fetch memories ─────────────────────────────────────
async function fetchMemories() {
  try {
    const { data } = await supabase
      .from('memories')
      .select('content')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false })
      .limit(5);
    return (data || []).map(m => m.content);
  } catch {
    return [];
  }
}

// ── Main FRIDAY brief endpoint ─────────────────────────
router.get('/brief', async (req, res) => {
  try {
    const lang = req.query.lang || 'en';

    // Fetch everything in parallel
    const [weather, tasks, news, memories] = await Promise.all([
      fetchWeather(),
      fetchTodayTasks(),
      fetchNews(lang),
      fetchMemories(),
    ]);

    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const day = new Date().toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // Build brief prompt
    const newsText = news.length > 0
      ? news.map((n, i) => `${i + 1}. ${n.title}`).join('\n')
      : 'No news available';

    const tasksText = tasks.length > 0
      ? tasks.map(t => `- ${t.title}${t.scheduled_at ? ` at ${new Date(t.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`).join('\n')
      : 'No tasks scheduled';

    const memoriesText = memories.length > 0
      ? memories.join(', ')
      : '';

    const prompt = lang === 'hi'
      ? `
तुम FRIDAY हो, Naman sir की AI assistant। आज की morning brief दो।

आज: ${day}, ${now}
मौसम: ${weather ? `${weather.temp}°C, ${weather.description}, Raipur` : 'unavailable'}
आज के tasks:
${tasksText}

आज की top news:
${newsText}

${memoriesText ? `Naman sir के बारे में: ${memoriesText}` : ''}

Hindi में brief दो — warm, professional, 5-7 sentences। 
Format:
1. Greeting (Good morning/afternoon/evening Naman sir)
2. आज का दिन और मौसम
3. Tasks summary
4. Top 2 news headlines (short)
5. एक motivational line
FRIDAY की तरह बोलो — "FRIDAY reporting sir"
`
      : `
You are FRIDAY, Naman sir's AI assistant. Deliver today's morning brief.

Today: ${day}, ${now}
Weather: ${weather ? `${weather.temp}°C, ${weather.description}, Raipur` : 'unavailable'}
Today's tasks:
${tasksText}

Top news today:
${newsText}

${memoriesText ? `Personal context about Naman sir: ${memoriesText}` : ''}

Give the brief in English — warm, professional, 5-7 sentences.
Format:
1. Greeting (Good morning/afternoon/evening Naman sir)
2. Today's date, day and weather
3. Tasks summary
4. Top 2 news headlines (short)
5. One motivational line
Speak as FRIDAY — start with "FRIDAY reporting sir,"
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const brief = completion.choices[0].message.content;

    res.json({
      brief,
      data: { weather, tasks, news, day, time: now },
      language: lang,
    });

  } catch (err) {
    console.error('FRIDAY brief error:', err.message);
    res.status(500).json({ error: 'FRIDAY unavailable', message: err.message });
  }
});

// ── Quick news only ────────────────────────────────────
router.get('/news', async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const news = await fetchNews(lang);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;