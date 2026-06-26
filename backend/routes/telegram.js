// backend/routes/telegram.js  (ES Module version)
import express from 'express';

const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Core send function — exported so other routes can use it directly
export async function sendTelegram(message) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.log('[Telegram] Missing token or chat ID');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) console.log('[Telegram] Error:', data.description);
    return data.ok;
  } catch (e) {
    console.log('[Telegram] Error:', e.message);
    return false;
  }
}

function time() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Test ping
router.get('/test', async (req, res) => {
  const ok = await sendTelegram(`🤖 <b>JARVIS ONLINE</b>\n\nSir, Telegram bridge is active and working!\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// JARVIS general
router.post('/notify', async (req, res) => {
  const { message, agent = 'JARVIS' } = req.body;
  const icons = { JARVIS:'🤖', FRIDAY:'🌅', HAROLD:'🎙', ZEUS:'⚡', STARK:'🔴' };
  const ok = await sendTelegram(`${icons[agent]||'🤖'} <b>${agent}</b>\n\n${message}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// FRIDAY daily brief
router.post('/friday-brief', async (req, res) => {
  const { brief } = req.body;
  const ok = await sendTelegram(`🌅 <b>FRIDAY DAILY BRIEF</b>\n\n${brief}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// HAROLD meeting summary
router.post('/meeting-summary', async (req, res) => {
  const { title, summary } = req.body;
  const ok = await sendTelegram(`🎙 <b>HAROLD — Meeting Saved</b>\n\n📋 <b>${title}</b>\n\n${summary.slice(0,800)}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// ZEUS new lead
router.post('/new-lead', async (req, res) => {
  const { name, company, value, stage } = req.body;
  const ok = await sendTelegram(`⚡ <b>ZEUS — New Lead</b>\n\n👤 <b>${name}</b>${company?`\n🏢 ${company}`:''}${value?`\n💰 ₹${Number(value).toLocaleString('en-IN')}`:''}'\n📊 ${stage||'New'}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// STARK project update
router.post('/project-update', async (req, res) => {
  const { name, status, progress, message } = req.body;
  const ok = await sendTelegram(`🔴 <b>STARK — Project Update</b>\n\n📁 <b>${name}</b>${status?`\n📌 ${status}`:''}${progress!==undefined?`\n📈 ${progress}%`:''} ${message?`\n${message}`:''}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

export default router;