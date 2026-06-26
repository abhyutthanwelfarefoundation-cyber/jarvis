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

export default router;