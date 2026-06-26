// backend/routes/telegram.js
const express = require('express');
const router = express.Router();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Core send function — used by all agents
async function sendTelegram(message, parseMode = 'HTML') {
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
        parse_mode: parseMode,
      }),
    });
    const data = await res.json();
    if (!data.ok) console.log('[Telegram] Error:', data.description);
    return data.ok;
  } catch (e) {
    console.log('[Telegram] Fetch error:', e.message);
    return false;
  }
}

// ── JARVIS general notification ──
router.post('/notify', async (req, res) => {
  const { message, agent = 'JARVIS' } = req.body;
  const icons = { JARVIS:'🤖', FRIDAY:'🌅', HAROLD:'🎙', ZEUS:'⚡', STARK:'🔴' };
  const icon = icons[agent] || '🤖';
  const text = `${icon} <b>${agent}</b>\n\n${message}\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok });
});

// ── FRIDAY daily brief ──
router.post('/friday-brief', async (req, res) => {
  const { brief } = req.body;
  const text = `🌅 <b>FRIDAY DAILY BRIEF</b>\n\n${brief}\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok });
});

// ── HAROLD meeting summary ──
router.post('/meeting-summary', async (req, res) => {
  const { title, summary } = req.body;
  const text = `🎙 <b>HAROLD — Meeting Recorded</b>\n\n📋 <b>${title}</b>\n\n${summary}\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok });
});

// ── ZEUS new lead ──
router.post('/new-lead', async (req, res) => {
  const { name, company, value, stage } = req.body;
  const text = `⚡ <b>ZEUS — New Lead Added</b>\n\n👤 <b>${name}</b>${company ? `\n🏢 ${company}` : ''}${value ? `\n💰 ₹${Number(value).toLocaleString('en-IN')}` : ''}\n📊 Stage: ${stage || 'New'}\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok });
});

// ── STARK task/project alert ──
router.post('/project-update', async (req, res) => {
  const { name, status, progress, message } = req.body;
  const text = `🔴 <b>STARK — Project Update</b>\n\n📁 <b>${name}</b>\n${status ? `📌 Status: ${status}\n` : ''}${progress !== undefined ? `📈 Progress: ${progress}%\n` : ''}${message ? `\n${message}` : ''}\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok });
});

// ── Test ping ──
router.get('/test', async (req, res) => {
  const text = `🤖 <b>JARVIS ONLINE</b>\n\nSir, all systems operational. Telegram bridge active.\n\n<i>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
  const ok = await sendTelegram(text);
  res.json({ success: ok, message: ok ? 'Telegram working!' : 'Failed — check token/chat ID' });
});

module.exports = { router, sendTelegram };