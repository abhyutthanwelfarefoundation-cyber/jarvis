import express from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost'];

// ── Get all leads ──────────────────────────────────────
router.get('/leads', async (req, res) => {
  try {
    const { stage, search } = req.query;
    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false });

    if (stage) query = query.eq('stage', stage);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get pipeline summary ───────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', 'naman');

    if (error) throw error;
    const leads = data || [];

    const summary = {
      total: leads.length,
      totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
      byStage: {},
      closedWon: leads.filter(l => l.stage === 'Closed Won').length,
      closedLost: leads.filter(l => l.stage === 'Closed Lost').length,
      active: leads.filter(l => !l.stage.includes('Closed')).length,
    };

    STAGES.forEach(s => {
      summary.byStage[s] = leads.filter(l => l.stage === s).length;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add lead ───────────────────────────────────────────
router.post('/leads', async (req, res) => {
  try {
    const { name, company, phone, email, value, stage, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        user_id: 'naman',
        name, company, phone, email,
        value: value || 0,
        stage: stage || 'New',
        notes: notes || '',
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update lead stage ──────────────────────────────────
router.patch('/leads/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const { data, error } = await supabase
      .from('leads')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update lead ────────────────────────────────────────
router.patch('/leads/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete lead ────────────────────────────────────────
router.delete('/leads/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI chat with ZEUS ──────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, lang = 'en' } = req.body;

    // Get current leads for context
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', 'naman');

    const leadsContext = (leads || []).map(l =>
      `${l.name} (${l.company || 'No company'}) - Stage: ${l.stage} - Value: ₹${l.value || 0} - Phone: ${l.phone || 'N/A'}`
    ).join('\n');

    const total = leads?.length || 0;
    const totalValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
    const won = leads?.filter(l => l.stage === 'Closed Won').length || 0;

    const systemPrompt = lang === 'hi'
      ? `तुम ZEUS हो, Naman sir का CRM AI agent। Sales pipeline manage करते हो।
Current pipeline: ${total} leads, Total value: ₹${totalValue}, Closed Won: ${won}

Leads:
${leadsContext || 'कोई leads नहीं हैं अभी।'}

Hindi में जवाब दो। Concise रहो। "सर" से address करो।`
      : `You are ZEUS, Naman sir's CRM AI agent. You manage the sales pipeline.
Current pipeline: ${total} leads, Total value: ₹${totalValue}, Closed Won: ${won}

Current leads:
${leadsContext || 'No leads in system yet.'}

Reply in English. Be concise. Address as "sir".`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;