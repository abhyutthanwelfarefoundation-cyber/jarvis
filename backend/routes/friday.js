// backend/routes/friday.js — Full upgrade
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TAVILY_URL = 'https://api.tavily.com/search';

// ── Helper: Tavily search ──
async function search(query, maxResults = 5) {
  try {
    const r = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: maxResults,
        include_answer: true,
      }),
    });
    const d = await r.json();
    return d.results?.map(r => `• ${r.title}: ${r.content?.slice(0, 200)}`).join('\n') || 'No results';
  } catch (e) {
    return 'Search unavailable';
  }
}

// ── Helper: Groq AI ──
async function groq(prompt, system = '') {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: system || 'You are FRIDAY, a sharp business intelligence AI assistant for Naman Jain, a freelance developer and entrepreneur based in Raipur, India.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || 'Analysis unavailable';
}

// ── Core brief generator ──
async function generateBrief(lang = 'en') {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  // Run all searches in parallel for speed
  const [
    marketRates,
    upworkTrends,
    techNews,
    indianFreelance,
    competitorRates,
  ] = await Promise.all([
    search('freelance web developer React Node.js rates 2026 India Upwork'),
    search('Upwork top skills demand 2026 freelance trends'),
    search('React Node.js AI developer news latest 2026'),
    search('Indian freelancer market rates 2026 software development'),
    search('freelance web development agency Raipur India rates'),
  ]);

  // Get ZEUS pipeline data
  let pipelineContext = '';
  try {
    const { data: leads } = await supabase.from('leads').select('name,stage,value').eq('user_id', 'naman').limit(10);
    const { data: projects } = await supabase.from('projects').select('name,status,progress,deadline').eq('user_id', 'naman').limit(10);
    const { data: tasks } = await supabase.from('tasks').select('title,due_date,completed').eq('user_id', 'naman').eq('completed', false).limit(10);

    const overdue = projects?.filter(p => p.deadline && new Date(p.deadline) < new Date() && p.status !== 'Completed') || [];
    const hotLeads = leads?.filter(l => ['Qualified', 'Proposal'].includes(l.stage)) || [];
    const dueTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) <= new Date(Date.now() + 86400000 * 2)) || [];

    pipelineContext = `
JARVIS PIPELINE STATUS:
- Total leads: ${leads?.length || 0} | Hot leads: ${hotLeads.map(l => l.name).join(', ') || 'none'}
- Active projects: ${projects?.filter(p => p.status === 'Active').length || 0} | Overdue: ${overdue.map(p => p.name).join(', ') || 'none'}
- Tasks due soon: ${dueTasks.map(t => t.title).join(', ') || 'none'}`;
  } catch (e) {
    pipelineContext = 'Pipeline data unavailable';
  }

  const langInstruction = lang === 'hi'
    ? 'Respond in a mix of Hindi and English (Hinglish). Use Hindi for conversational parts, English for technical terms and numbers.'
    : 'Respond in clear, concise English.';

  const brief = await groq(`
Today is ${today}, ${time} IST.

MARKET INTELLIGENCE GATHERED:
=== Freelance Market Rates ===
${marketRates}

=== Upwork Trends & In-Demand Skills ===
${upworkTrends}

=== Tech News ===
${techNews}

=== Indian Freelancer Market ===
${indianFreelance}

=== Local Competition ===
${competitorRates}

${pipelineContext}

Generate FRIDAY's daily intelligence brief for Naman Jain (freelance developer, Raipur). 
Structure it as:

1. 📊 MARKET RATES TODAY
   - What clients are paying for React/Node/AI work right now
   - Hourly rates in USD (Upwork) and INR (Indian market)

2. 🔥 OPPORTUNITIES & TRENDS  
   - Top skills in demand right now
   - Emerging opportunities Naman should know about

3. 📰 TECH INTEL
   - 2-3 key tech news items relevant to his work

4. ⚡ PIPELINE ALERT
   - Status of his leads and projects
   - What needs attention today

5. 🎯 TODAY'S RECOMMENDATION
   - One specific action Naman should take today based on all intel

${langInstruction}
Keep it sharp, specific, and actionable. No fluff.
`, `You are FRIDAY, Naman's sharp business intelligence AI. You give concise, data-driven briefings like a top-tier business analyst. Be direct and specific — no vague advice.`);

  return { brief, date: today, time, generatedAt: new Date().toISOString() };
}

// ── Routes ──

// GET brief (generates fresh one)
router.get('/brief', async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const result = await generateBrief(lang);

    // Save to Supabase for history
    try {
      await supabase.from('friday_briefs').insert({
        user_id: 'naman',
        brief: result.brief,
        date: result.date,
        generated_at: result.generatedAt,
      });
    } catch (e) { /* table may not exist yet */ }

    // Send to Telegram
    try {
      await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/telegram/friday-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: result.brief.slice(0, 3000) }),
      });
    } catch (e) { /* don't fail if telegram fails */ }

    res.json(result);
  } catch (e) {
    console.error('[FRIDAY] Brief error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET brief history
router.get('/history', async (req, res) => {
  try {
    const { data } = await supabase
      .from('friday_briefs')
      .select('*')
      .eq('user_id', 'naman')
      .order('generated_at', { ascending: false })
      .limit(10);
    res.json(data || []);
  } catch (e) {
    res.json([]);
  }
});

// POST quick search (for manual intel queries)
router.post('/search', async (req, res) => {
  try {
    const { query, lang = 'en' } = req.body;
    const results = await search(query, 6);
    const analysis = await groq(
      `User query: "${query}"\n\nSearch results:\n${results}\n\nProvide a sharp, actionable analysis in 3-4 sentences. ${lang === 'hi' ? 'Respond in Hinglish.' : 'Respond in English.'}`,
    );
    res.json({ query, analysis, raw: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;