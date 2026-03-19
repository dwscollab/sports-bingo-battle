// api/generate-squares.js
// Vercel Serverless Function — proxies Anthropic API to keep key server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  // homeTeam / awayTeam = the actual game being watched
  // myTeam is intentionally ignored — it must not influence square generation
  const { sport, homeTeam, awayTeam, location, gameDate } = req.body;

  const locationLabel = {
    liveGame:  'attending the live game at the arena/stadium',
    sportsBar: 'watching at a sports bar',
    home:      'watching at home on TV or streaming',
  }[location] || location;

  // Build a clear matchup string — this is what the squares must be about
  const matchup = homeTeam && awayTeam
    ? `${awayTeam} at ${homeTeam}`
    : homeTeam || awayTeam || `a ${sport} game`;

  const prompt = `You are a creative sports bingo card designer. Generate exactly 24 unique bingo squares for a specific game.

THE GAME: ${matchup}
Sport: ${sport}
Date: ${gameDate || new Date().toDateString()}
Viewer location: ${locationLabel}

CRITICAL RULES — read carefully:
1. ALL squares must be about events that could realistically happen in THIS specific game (${matchup}). Do NOT generate squares about teams not playing in this game.
2. Where relevant, reference the actual teams by name: ${homeTeam || 'home team'} and ${awayTeam || 'away team'}.
3. Mix easy/common events with rare exciting ones — not everything should be a longshot.
4. Mark 4–6 squares as "battle: true" — these are dramatic rare moments specific to this sport (e.g. hat trick, penalty shot, fight, overtime goal, blocked penalty kick, slam dunk with foul).
5. Mark 3–5 squares as "camera: true" ONLY when location is liveGame or sportsBar — these are visually provable crowd/atmosphere moments a person at the venue could photograph (e.g. "Kiss Cam!", "Wave rolls the arena", "Mascot high-fives a fan", "Zamboni wave"). If location is "home" set ALL camera to false.
6. Keep each square text under 32 characters.
7. Include a mix of: game-action squares, player-behavior squares, crowd/atmosphere squares, and broadcast/referee squares.
8. Make them fun, specific, and memorable — avoid generic filler like just "Goal Scored".

Return ONLY a valid JSON array of exactly 24 objects. No markdown, no preamble, no explanation:
[{"text":"...","battle":false,"camera":false},...]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${err}` });
    }

    const data = await response.json();
    const raw  = data.content?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const squares = JSON.parse(clean);

    if (!Array.isArray(squares) || squares.length < 20) {
      return res.status(502).json({ error: 'LLM returned unexpected format' });
    }

    return res.status(200).json({ squares: squares.slice(0, 24) });
  } catch (err) {
    console.error('generate-squares error:', err);
    return res.status(500).json({ error: err.message });
  }
}
