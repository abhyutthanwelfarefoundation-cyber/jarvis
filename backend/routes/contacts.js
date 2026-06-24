import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('contacts').select('*').eq('user_id', 'naman');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/find/:nickname', async (req, res) => {
  try {
    const { nickname } = req.params;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', 'naman')
      .ilike('nickname', nickname)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Contact not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nickname, real_name, phone } = req.body;
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ nickname, real_name, phone, user_id: 'naman' }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
