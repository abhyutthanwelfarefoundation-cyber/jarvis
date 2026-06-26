// backend/routes/telegram.js
import express from 'express';
const router = express.Router();

function time() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Read env vars fresh every call (not at module load time)
export async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.log('[Telegram] API error:', data.description);
    } else {
      console.log('[Telegram] Message sent OK');
    }
    return data.ok;
  } catch (e) {
    console.log('[Telegram] Fetch error:', e.message);
    return false;
  }
}

// Test
router.get('/test', async (req, res) => {
  console.log('[Telegram] Test triggered');
  console.log('[Telegram] Token exists:', !!process.env.TELEGRAM_BOT_TOKEN);
  console.log('[Telegram] ChatID exists:', !!process.env.TELEGRAM_CHAT_ID);
  const ok = await sendTelegram(`🤖 <b>JARVIS ONLINE</b>\n\nSir, Telegram bridge is active!\n\n<i>${time()}</i>`);
  res.json({ success: ok, tokenSet: !!process.env.TELEGRAM_BOT_TOKEN, chatIdSet: !!process.env.TELEGRAM_CHAT_ID });
});

// JARVIS general
router.post('/notify', async (req, res) => {
  const { message, agent = 'JARVIS' } = req.body;
  const icons = { JARVIS:'🤖', FRIDAY:'🌅', HAROLD:'🎙', ZEUS:'⚡', STARK:'🔴' };
  const ok = await sendTelegram(`${icons[agent] || '🤖'} <b>${agent}</b>\n\n${message}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// FRIDAY
router.post('/friday-brief', async (req, res) => {
  const { brief } = req.body;
  const ok = await sendTelegram(`🌅 <b>FRIDAY DAILY BRIEF</b>\n\n${brief}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// HAROLD
router.post('/meeting-summary', async (req, res) => {
  const { title, summary } = req.body;
  const ok = await sendTelegram(`🎙 <b>HAROLD — Meeting Saved</b>\n\n📋 <b>${title}</b>\n\n${summary.slice(0, 800)}\n\n<i>${time()}</i>`);
  res.json({ success: ok });
});

// ZEUS
router.post('/new-lead', async (req, res) => {
  const { name, company, value, stage } = req.body;
  const parts = [`⚡ <b>ZEUS — New Lead</b>\n\n👤 <b>${name}</b>`];
  if (company) parts.push(`🏢 ${company}`);
  if (value) parts.push(`💰 ₹${Number(value).toLocaleString('en-IN')}`);
  parts.push(`📊 ${stage || 'New'}`);
  parts.push(`<i>${time()}</i>`);
  const ok = await sendTelegram(parts.join('\n'));
  res.json({ success: ok });
});

// STARK
router.post('/project-update', async (req, res) => {
  const { name, status, progress, message } = req.body;
  const parts = [`🔴 <b>STARK — Project Update</b>\n\n📁 <b>${name}</b>`];
  if (status) parts.push(`📌 ${status}`);
  if (progress !== undefined) parts.push(`📈 ${progress}%`);
  if (message) parts.push(message);
  parts.push(`<i>${time()}</i>`);
  const ok = await sendTelegram(parts.join('\n'));
  res.json({ success: ok });
});

export default router;