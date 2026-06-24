import express from 'express';
import webpush from 'web-push';
import { supabase } from '../db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    await supabase.from('push_subscriptions').upsert([{ subscription, user_id: 'naman' }]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { title, body, url = '/' } = req.body;
    const { data } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', 'naman');

    const payload = JSON.stringify({ title, body, url });
    const results = await Promise.allSettled(
      data.map(row => webpush.sendNotification(row.subscription, payload))
    );

    res.json({ sent: results.filter(r => r.status === 'fulfilled').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
