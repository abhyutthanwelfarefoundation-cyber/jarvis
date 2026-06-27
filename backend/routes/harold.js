import express from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// ── Summarize transcript ───────────────────────────────
router.post('/summarize', async (req, res) => {
  try {
    const { transcript, title, lang = 'en' } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });

    const prompt = lang === 'hi'
      ? `यह meeting transcript है। इसका structured summary दो Hindi में।

Transcript:
${transcript}

Format में दो:
📋 MEETING SUMMARY
**मुख्य बातें:** (3-5 bullet points)
**निर्णय:** (जो decisions लिए गए)
**Action Items:** (किसे क्या करना है)
**अगला कदम:** (next steps)`
      : `This is a meeting transcript. Give a structured summary in English.

Transcript:
${transcript}

Format:
📋 MEETING SUMMARY
**Key Points:** (3-5 bullet points)
**Decisions Made:** (what was decided)
**Action Items:** (who needs to do what)
**Next Steps:** (follow up actions)`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const summary = completion.choices[0].message.content;

    // Save to Supabase
    const { data, error } = await supabase
      .from('meetings')
      .insert([{
        user_id: 'naman',
        title: title || `Meeting ${new Date().toLocaleDateString('en-IN')}`,
        transcript,
        summary,
        language: lang,
        duration_seconds: Math.ceil(transcript.split(' ').length / 2.5), // estimate
      }])
      .select();

    if (error) console.log('Save meeting error:', error.message);

    res.json({ summary, meeting: data?.[0] || null });
  } catch (err) {
    console.error('HAROLD summarize error:', err.message);
    res.status(500).json({ error: 'Summarization failed', message: err.message });
  }
});

// ── Get all meetings ───────────────────────────────────
router.get('/meetings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, summary, language, duration_seconds, created_at')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single meeting ─────────────────────────────────
router.get('/meetings/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete meeting ─────────────────────────────────────
router.delete('/meetings/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Add this to backend/routes/harold.js
// New endpoint: POST /api/harold/extract-intel

router.post('/extract-intel', async (req, res) => {
  const { transcript, summary, title } = req.body;
  const text = summary || transcript || '';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are an AI that extracts structured data from meeting notes.
Extract:
1. ACTION ITEMS — specific tasks with owner and deadline if mentioned
2. PEOPLE/COMPANIES — anyone mentioned who could be a lead or contact

Respond ONLY with valid JSON, no explanation, no markdown:
{
  "tasks": [
    { "title": "task description", "due": "YYYY-MM-DD or null", "priority": "High/Medium/Low" }
  ],
  "leads": [
    { "name": "Person or Company Name", "notes": "context from meeting", "stage": "New" }
  ]
}`
          },
          {
            role: 'user',
            content: `Meeting title: ${title}\n\nContent:\n${text}`
          }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{"tasks":[],"leads":[]}';

    // Clean and parse JSON safely
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { tasks: [], leads: [] };
    }

    res.json({
      tasks: parsed.tasks || [],
      leads: parsed.leads || [],
    });
  } catch (e) {
    console.error('[HAROLD handoff] Error:', e.message);
    res.status(500).json({ error: e.message, tasks: [], leads: [] });
  }
});

// Add this endpoint too: POST /api/harold/approve-handoff
// Saves approved tasks to STARK and leads to ZEUS in one call
router.post('/approve-handoff', async (req, res) => {
  const { tasks = [], leads = [] } = req.body;
  const results = { tasksSaved: 0, leadsSaved: 0, errors: [] };

  // Save tasks to Supabase
  for (const task of tasks) {
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: 'naman',
        title: task.title,
        due_date: task.due || null,
        priority: task.priority || 'Medium',
        completed: false,
        source: 'harold',
        created_at: new Date().toISOString(),
      });
      if (error) results.errors.push(`Task: ${error.message}`);
      else results.tasksSaved++;
    } catch (e) {
      results.errors.push(`Task error: ${e.message}`);
    }
  }

  // Save leads to Supabase
  for (const lead of leads) {
    try {
      const { error } = await supabase.from('leads').insert({
        user_id: 'naman',
        name: lead.name,
        notes: lead.notes || '',
        stage: lead.stage || 'New',
        source: 'harold',
        created_at: new Date().toISOString(),
      });
      if (error) results.errors.push(`Lead: ${error.message}`);
      else results.leadsSaved++;
    } catch (e) {
      results.errors.push(`Lead error: ${e.message}`);
    }
  }

  // Telegram notification
  try {
    const msg = `🎙 <b>HAROLD HANDOFF COMPLETE</b>\n\n✅ ${results.tasksSaved} tasks → STARK\n⚡ ${results.leadsSaved} leads → ZEUS\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
    await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/telegram/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, agent: 'HAROLD' }),
    });
  } catch {}

  res.json(results);
});

export default router;