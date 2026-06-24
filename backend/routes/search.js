import express from 'express';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// ── Main search endpoint ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { query, lang = 'en' } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const response = await tvly.search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
      includeImages: false,
    });

    res.json({
      answer: response.answer,
      results: response.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 300),
        score: r.score,
      })),
      query,
      language: lang,
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Web search failed' });
  }
});

export default router;