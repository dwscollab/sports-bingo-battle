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

// ── /api/generate-people-squares ─────────────────────────────────────────
app.post('/api/generate-people-squares', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const { locationDescription, vibe, playerCount } = req.body;

  if (!locationDescription) {
    return res.status(400).json({ error: 'locationDescription is required' });
  }

  const vibeLabels = {
    coffee_shop: 'a coffee shop', mall: 'a shopping mall',
    park: 'a public park', bar: 'a bar or restaurant',
    airport: 'an airport', beach: 'a beach or waterfront',
    stadium: 'a stadium or arena (non-game)', anywhere: 'a public place',
  };

  const prompt = `You are a hilarious and observant people-watching bingo card designer.

LOCATION: ${locationDescription}
SETTING: ${vibeLabels[vibe] || 'a public place'}
PLAYERS: ${playerCount || 2} adults playing together

Generate exactly 24 unique bingo squares for a people-watching game at this specific location.

RULES:
1. Squares must be things you could realistically OBSERVE happening around you at this specific location and vibe — behaviors, fashion choices, overheard moments, situational comedy.
2. Be hyper-specific to the location and setting. A coffee shop in a small California coastal town gets very different squares than a mall in Denver.
3. Be observational and funny — not mean-spirited. The humor is in the situation, not mocking individuals.
4. Include a range of likelihood: some easy (someone on their phone), some medium (a dog in a sweater), some rare gold (someone facetimes with their cat).
5. Mark 4–6 squares as "battle: true" — the rarest, most spectacular people-watching moments.
6. Mark 4–6 squares as "camera: true" — require a sneaky photo as proof. Must be visually verifiable without invading privacy.
7. Keep each square text under 32 characters.
8. Mix: fashion, behavior, tech use, food/drink, overheard conversations, animals, children, couple dynamics, solo activities.
9. Make them laugh out loud funny where possible.

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
    console.error('generate-people-squares error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Dev API server on http://localhost:3001'));
