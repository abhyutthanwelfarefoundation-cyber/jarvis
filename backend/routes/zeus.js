import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ══════════════════════════════════════════════
// ORIGINAL CRM ROUTES
// ══════════════════════════════════════════════

// GET all leads
router.get('/leads', async (req, res) => {
  try {
    const { stage, search } = req.query;
    let query = supabase.from('leads').select('*').eq('user_id', 'naman').order('created_at', { ascending: false });
    if (stage) query = query.eq('stage', stage);
    if (search) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST add lead
router.post('/leads', async (req, res) => {
  try {
    const { name, company, phone, email, value, stage, notes, source } = req.body;
    const { data, error } = await supabase.from('leads').insert([{
      user_id: 'naman', name, company, phone, email,
      value: parseFloat(value) || 0,
      stage: stage || 'New',
      notes, source,
      created_at: new Date().toISOString(),
    }]).select();
    if (error) throw error;
    res.json(data?.[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH update stage
router.patch('/leads/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const { error } = await supabase.from('leads').update({ stage }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE lead
router.delete('/leads/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET pipeline summary
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leads').select('*').eq('user_id', 'naman');
    if (error) throw error;
    const leads = data || [];
    res.json({
      total: leads.length,
      active: leads.filter(l => !['Closed Won','Closed Lost'].includes(l.stage)).length,
      closedWon: leads.filter(l => l.stage === 'Closed Won').length,
      totalValue: leads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST zeus chat
router.post('/chat', async (req, res) => {
  try {
    const { message, lang = 'en' } = req.body;
    const { data: leads } = await supabase.from('leads').select('*').eq('user_id', 'naman');
    const context = leads?.map(l => `${l.name} (${l.stage}) - ₹${l.value || 0}`).join('\n') || 'No leads';
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        messages: [
          { role: 'system', content: `You are ZEUS, a CRM intelligence agent. Current pipeline:\n${context}\n${lang === 'hi' ? 'Reply in Hinglish.' : 'Reply in English.'}` },
          { role: 'user', content: message }
        ]
      })
    });
    const d = await r.json();
    res.json({ reply: d.choices?.[0]?.message?.content || 'ZEUS processing...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════
// LEAD ENGINE ROUTES
// ══════════════════════════════════════════════

const DEFAULT_SKILLS = [
  'React developer', 'Node.js developer', 'Full stack developer',
  'AI chatbot developer', 'ML integration', 'Next.js developer',
  'MERN stack', 'JavaScript developer', 'Web application developer',
  'AI integration developer'
];

async function searchUpworkGigs(skills) {
  const results = [];
  const batches = [];
  for (let i = 0; i < skills.length; i += 3) batches.push(skills.slice(i, i + 3));
  for (const batch of batches) {
    const query = `site:upwork.com/jobs ${batch.join(' OR ')} fixed price OR hourly 2026`;
    try {
      const r = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: 'advanced', max_results: 5, include_domains: ['upwork.com'] }),
      });
      const d = await r.json();
      if (d.results) results.push(...d.results);
    } catch (e) { console.log('[ZEUS] Search error:', e.message); }
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

function parseGig(result) {
  const text = result.content || result.snippet || '';
  const budgetMatch = text.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/);
  return {
    title: result.title?.replace(' | Upwork', '').replace(' - Upwork', '').trim() || 'Upwork Gig',
    url: result.url || '',
    budget: budgetMatch ? budgetMatch[0] : 'Not specified',
    type: text.toLowerCase().includes('hourly') ? 'Hourly' : 'Fixed',
    description: text.slice(0, 400),
    source: 'upwork',
    foundAt: new Date().toISOString(),
  };
}

async function draftProposalFn(gig, lang = 'en') {
  const profile = `Naman Jain — Freelance Developer from Raipur, India. Skills: React, Node.js, Next.js, AI/ML integration, chatbots, MERN stack. Experience: SaaS products, AI assistants, CRM systems, web apps. Approach: Clean code, on-time delivery.`;
  const prompt = lang === 'hi'
    ? `Upwork gig:\nTitle: ${gig.title}\nBudget: ${gig.budget}\nDescription: ${gig.description}\n\nProfile:\n${profile}\n\nHinglish mein 150-200 word proposal draft karo.`
    : `Upwork gig:\nTitle: ${gig.title}\nBudget: ${gig.budget}\nDescription: ${gig.description}\n\nProfile:\n${profile}\n\nWrite a 150-200 word winning proposal. Be specific to this job.`;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.6, max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    return d.choices?.[0]?.message?.content || 'Proposal generation failed.';
  } catch (e) { return 'Proposal generation failed: ' + e.message; }
}

// POST scan Upwork
router.post('/scan', async (req, res) => {
  const { customSkills = [], lang = 'en' } = req.body;
  const skills = [...DEFAULT_SKILLS, ...customSkills];
  try {
    console.log('[ZEUS] Scanning for', skills.length, 'skills...');
    const rawResults = await searchUpworkGigs(skills);
    const seen = new Set();
    const gigs = rawResults
      .filter(r => r.url?.includes('upwork.com'))
      .map(parseGig)
      .filter(g => { if (seen.has(g.url)) return false; seen.add(g.url); return true; })
      .slice(0, 10);
    const gigsWithProposals = await Promise.all(gigs.slice(0, 5).map(async gig => ({ ...gig, proposal: await draftProposalFn(gig, lang) })));
    const allGigs = [...gigsWithProposals, ...gigs.slice(5).map(g => ({ ...g, proposal: null }))];
    try {
      if (allGigs.length > 0) {
        const msg = `⚡ <b>ZEUS SCAN COMPLETE</b>\n\n🎯 Found <b>${allGigs.length} gigs</b>\n\n` +
          allGigs.slice(0, 3).map((g, i) => `${i+1}. <b>${g.title}</b>\n💰 ${g.budget} · ${g.type}`).join('\n\n') +
          `\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
        await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/telegram/notify`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: msg, agent: 'ZEUS' }) });
      }
    } catch {}
    res.json({ gigs: allGigs, scannedAt: new Date().toISOString(), total: allGigs.length });
  } catch (e) {
    res.status(500).json({ error: e.message, gigs: [] });
  }
});

// POST draft proposal
router.post('/draft-proposal', async (req, res) => {
  const { gig, lang = 'en' } = req.body;
  if (!gig) return res.status(400).json({ error: 'Gig required' });
  try {
    const proposal = await draftProposalFn(gig, lang);
    res.json({ proposal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;