import express from 'express';
import https from 'https';
import http from 'http';

const router = express.Router();

function cleanText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[🎉🔍🌐✅❌⚠️💡🧠📱🎙️•]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// Split text into chunks of max 200 chars at sentence boundaries
function splitText(text, maxLen = 200) {
  const sentences = text.match(/[^.!?।]+[.!?।]+|\S+/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function fetchAudioChunk(text, lang) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const tl = lang === 'hi' ? 'hi' : 'en';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${tl}&client=tw-ob&ttsspeed=1`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      }
    };

    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

router.post('/speak', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const clean = cleanText(text);
    if (!clean) return res.status(400).json({ error: 'No speakable text' });

    // Split into chunks and fetch all audio
    const chunks = splitText(clean, 180);
    const audioBuffers = [];

    for (const chunk of chunks) {
      try {
        const audio = await fetchAudioChunk(chunk, lang);
        audioBuffers.push(audio);
      } catch (err) {
        console.log('Chunk failed:', chunk.slice(0, 30), err.message);
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(500).json({ error: 'All chunks failed' });
    }

    const finalBuffer = Buffer.concat(audioBuffers);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': finalBuffer.length,
      'Cache-Control': 'no-cache',
    });

    res.send(finalBuffer);

  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: 'TTS failed', message: err.message });
  }
});

router.get('/voices', (req, res) => {
  res.json([
    { name: 'Google TTS English', lang: 'en' },
    { name: 'Google TTS Hindi', lang: 'hi' },
  ]);
});

export default router;