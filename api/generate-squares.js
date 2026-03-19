// api/generate-squares.js
// Vercel Serverless Function — proxies Anthropic API to keep key server-side
// Deploy on Vercel: the ANTHROPIC_API_KEY env var is set in your Vercel project settings

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { sport, myTeam, opponentTeam, location, gameDate } = req.body;

  const locationLabel = {
    liveGame:  'a live arena/stadium game',
    sportsBar: 'a sports bar',
    home:      'home on TV/streaming',
  }[location] || location;

  const prompt = `You are a creative sports bingo card designer. Generate exactly 24 unique bingo squares for a ${sport} game.

Context:
- Sport: ${sport}
- My team: ${myTeam || 'unknown'}
- Opponent: ${opponentTeam || 'unknown'}
- Location: ${locationLabel}
- Date: ${gameDate || new Date().toDateString()}

Requirements:
1. Mix common/easy events AND rare/exciting moments
2. Mark 4–6 squares as "battle: true" — these are the most dramatic, rare moments (fight, hat trick, penalty shot, overtime winner, etc.)
3. Mark 3–5 squares as "camera: true" ONLY if location is liveGame or sportsBar — these are visually verifiable crowd/atmosphere moments (e.g., "Kiss Cam!" "Wave rolls through crowd" "Mascot spotted nearby" "Vendor passes your row")
4. If location is "home", set ALL camera to false
5. Be specific to the sport and teams where possible (mention team names/rivalries)
6. Include: game action squares, crowd/atmosphere squares, broadcast/commentary squares, player behavior squares
7. Keep each text under 32 characters
8. Make them FUN and surprising — avoid generic obvious ones like just "Goal"

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
    const raw = data.content?.[0]?.text ?? '';

    // Strip any accidental markdown fences
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
