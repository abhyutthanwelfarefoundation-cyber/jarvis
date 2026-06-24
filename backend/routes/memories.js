import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

// Get all memories for context injection
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', 'naman')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a new memory
router.post('/', async (req, res) => {
  try {
    const { content, category } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    // Check if similar memory exists — avoid duplicates
    const { data: existing } = await supabase
      .from('memories')
      .select('id, content')
      .eq('user_id', 'naman')
      .ilike('content', `%${content.slice(0, 20)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing instead of duplicate
      const { data, error } = await supabase
        .from('memories')
        .update({ content, category, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select();
      if (error) throw error;
      return res.json({ ...data[0], updated: true });
    }

    const { data, error } = await supabase
      .from('memories')
      .insert([{ content, category: category || 'general', user_id: 'naman' }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a memory
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;