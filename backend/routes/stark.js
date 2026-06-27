import express from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Get all projects ───────────────────────────────────
router.get('/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get project with milestones ────────────────────────
router.get('/projects/:id', async (req, res) => {
  try {
    const [projectRes, milestonesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', req.params.id).single(),
      supabase.from('milestones').select('*').eq('project_id', req.params.id).order('order_index', { ascending: true }),
    ]);

    if (projectRes.error) throw projectRes.error;
    res.json({ ...projectRes.data, milestones: milestonesRes.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create project ─────────────────────────────────────
router.post('/projects', async (req, res) => {
  try {
    const { name, description, deadline, status, priority } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        user_id: 'naman',
        name, description,
        deadline: deadline || null,
        status: status || 'Active',
        priority: priority || 'Medium',
        progress: 0,
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update project progress ────────────────────────────
router.patch('/projects/:id/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const { data, error } = await supabase
      .from('projects')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update project ─────────────────────────────────────
router.patch('/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete project ─────────────────────────────────────
router.delete('/projects/:id', async (req, res) => {
  try {
    await supabase.from('milestones').delete().eq('project_id', req.params.id);
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add milestone ──────────────────────────────────────
router.post('/projects/:id/milestones', async (req, res) => {
  try {
    const { title, due_date } = req.body;
    const { data, error } = await supabase
      .from('milestones')
      .insert([{
        project_id: req.params.id,
        title, due_date: due_date || null,
        completed: false, order_index: Date.now(),
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Complete milestone ─────────────────────────────────
router.patch('/milestones/:id/complete', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('milestones')
      .update({ completed: true })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    // Auto-update project progress based on milestones
    const milestone = data[0];
    const { data: allMilestones } = await supabase
      .from('milestones')
      .select('completed')
      .eq('project_id', milestone.project_id);

    if (allMilestones?.length > 0) {
      const completedCount = allMilestones.filter(m => m.completed).length;
      const progress = Math.round((completedCount / allMilestones.length) * 100);
      await supabase.from('projects')
        .update({ progress })
        .eq('id', milestone.project_id);
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get summary ────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', 'naman');

    const projects = data || [];
    const now = new Date();

    res.json({
      total: projects.length,
      active: projects.filter(p => p.status === 'Active').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      overdue: projects.filter(p => p.deadline && new Date(p.deadline) < now && p.status !== 'Completed').length,
      avgProgress: projects.length > 0
        ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI chat with STARK ─────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, lang = 'en' } = req.body;

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', 'naman');

    const projectContext = (projects || []).map(p =>
      `${p.name} — Status: ${p.status} — Progress: ${p.progress}% — Priority: ${p.priority}${p.deadline ? ` — Deadline: ${new Date(p.deadline).toLocaleDateString('en-IN')}` : ''}`
    ).join('\n');

    const systemPrompt = lang === 'hi'
      ? `तुम STARK हो, Naman sir का Project Management AI agent।
Current projects:
${projectContext || 'कोई projects नहीं हैं अभी।'}
Hindi में जवाब दो। Concise रहो। "सर" से address करो।`
      : `You are STARK, Naman sir's Project Management AI agent. You track all projects and deliverables.
Current projects:
${projectContext || 'No projects in system yet.'}
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

// Add this route to backend/routes/stark.js
// POST /api/stark/check-alerts — manual trigger from frontend

router.get('/check-alerts', async (req, res) => {
  try {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', 'naman')
      .not('status', 'eq', 'Completed')
      .not('status', 'eq', 'Cancelled')
      .not('deadline', 'is', null);

    const now = new Date();
    const alerts = [];

    for (const p of projects || []) {
      const deadline = new Date(p.deadline);
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        alerts.push({
          id: p.id,
          name: p.name,
          deadline: p.deadline,
          daysLeft,
          progress: p.progress || 0,
          status: p.status,
          type: daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : 'soon',
        });
      }
    }

    res.json({ alerts, total: alerts.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;  