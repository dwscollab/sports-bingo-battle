// dev-server.js
// Run this alongside `npm run dev` for local development of the API endpoints.
// Usage: node dev-server.js
// Requires: ANTHROPIC_API_KEY in your .env file

import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── /api/generate-squares ─────────────────────────────────────────────────
app.post('/api/generate-squares', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const { sport, myTeam, opponentTeam, location, gameDate } = req.body;
  const locationLabel = { liveGame: 'a live arena/stadium game', sportsBar: 'a sports bar', home: 'home on TV/streaming' }[location] || location;

  const prompt = `You are a creative sports bingo card designer. Generate exactly 24 unique bingo squares for a ${sport} game.

Context:
- Sport: ${sport}
- My team: ${myTeam || 'unknown'}
- Opponent: ${opponentTeam || 'unknown'}
- Location: ${locationLabel}
- Date: ${gameDate || new Date().toDateString()}

Requirements:
1. Mix common/easy events AND rare/exciting moments
2. Mark 4–6 squares as "battle: true" — dramatic, rare moments (fight, hat trick, penalty shot, overtime winner, etc.)
3. Mark 3–5 squares as "camera: true" ONLY if location is liveGame or sportsBar — visually verifiable crowd/atmosphere moments
4. If location is "home", set ALL camera to false
5. Be specific to the sport and teams where possible
6. Include: game action, crowd/atmosphere, broadcast/commentary, and player behavior squares
7. Keep each text under 32 characters
8. Make them FUN and specific to the matchup

Return ONLY a valid JSON array of exactly 24 objects. No markdown, no preamble:
[{"text":"...","battle":false,"camera":false},...]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const squares = JSON.parse(clean);
    res.json({ squares: squares.slice(0, 24) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/verify-camera ────────────────────────────────────────────────────
app.post('/api/verify-camera', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const { imageBase64, mediaType, squareText, sport, location } = req.body;

  const prompt = `You are a fair sports bingo referee. A player at ${location === 'liveGame' ? 'a live game' : 'a sports bar'} took a photo to verify their bingo square: "${squareText}".

Examine the photo. Is this a genuine, plausible match?
Reply ONLY with valid JSON, no other text:
{"verified": true or false, "confidence": 0.0 to 1.0, "reason": "one short sentence"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '{}';
    res.json(JSON.parse(raw.replace(/```json|```/g, '').trim()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Dev API server on http://localhost:3001'));
