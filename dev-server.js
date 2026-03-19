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

  const { sport, homeTeam, awayTeam, location, gameDate } = req.body;  // myTeam intentionally excluded
  const locationLabel = {
    liveGame:  'attending the live game at the arena/stadium',
    sportsBar: 'watching at a sports bar',
    home:      'watching at home on TV or streaming',
  }[location] || location;

  const matchup = homeTeam && awayTeam
    ? `${awayTeam} at ${homeTeam}`
    : homeTeam || awayTeam || `a ${sport} game`;

  const prompt = `You are a creative sports bingo card designer. Generate exactly 24 unique bingo squares for a specific game.

THE GAME: ${matchup}
Sport: ${sport}
Date: ${gameDate || new Date().toDateString()}
Viewer location: ${locationLabel}

CRITICAL RULES:
1. ALL squares must be about events that could realistically happen in THIS specific game (${matchup}). Do NOT generate squares about teams not playing in this game.
2. Where relevant, reference the actual teams by name: ${homeTeam || 'home team'} and ${awayTeam || 'away team'}.
3. Mix easy/common events with rare exciting ones.
4. Mark 4-6 squares as "battle: true" — dramatic rare moments (hat trick, penalty shot, fight, overtime goal).
5. Mark 3-5 squares as "camera: true" ONLY when location is liveGame or sportsBar — visually provable crowd moments a person at the venue could photograph. If location is home set ALL camera to false.
6. Keep each square text under 32 characters.
7. Include a mix of: game-action, player-behavior, crowd/atmosphere, and broadcast/referee squares.
8. Make them fun, specific, and memorable.

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
