// api/generate-people-squares.js
// Generates people-watching bingo squares based on location context

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const {
    locationDescription, // e.g. "Downtown Denver, CO — 16th Street Mall"
    locationType,        // 'gps' | 'zip' | 'w3w' | 'manual'
    vibe,                // 'coffee_shop' | 'mall' | 'park' | 'bar' | 'airport' | 'beach' | 'anywhere'
    playerCount,
  } = req.body;

  if (!locationDescription) {
    return res.status(400).json({ error: 'locationDescription is required' });
  }

  const vibeLabels = {
    coffee_shop: 'a coffee shop',
    mall:        'a shopping mall',
    park:        'a public park',
    bar:         'a bar or restaurant',
    airport:     'an airport',
    beach:       'a beach or waterfront',
    stadium:     'a stadium or arena (non-game)',
    anywhere:    'a public place',
  };

  const prompt = `You are a hilarious and observant people-watching bingo card designer.

LOCATION: ${locationDescription}
SETTING: ${vibeLabels[vibe] || 'a public place'}
PLAYERS: ${playerCount || 2} adults playing together

Generate exactly 24 unique bingo squares for a people-watching game at this specific location.

RULES:
1. Squares must be things you could realistically OBSERVE happening around you at this specific location and vibe — behaviors, fashion choices, overheard moments, situational comedy.
2. Be hyper-specific to the location and setting. A coffee shop in Denver gets different squares than a beach in Miami.
3. Be observational and funny — not mean-spirited or punching down at people. The humor is in the situation, not mocking individuals.
4. Include a range of likelihood: some easy (someone on their phone), some medium (a dog in a sweater), some rare gold (someone facetimes with their cat).
5. Mark 4–6 squares as "battle: true" — these are the rarest, most spectacular people-watching moments.
6. Mark 4–6 squares as "camera: true" — these require a sneaky photo as proof (e.g. "Matching couple outfits", "Someone reading an actual newspaper"). Camera squares must be visually verifiable without invading privacy.
7. Keep each square text under 32 characters.
8. Mix categories: fashion, behavior, technology use, food/drink, conversations overheard, animals, children, couple dynamics, solo activities.
9. Make them laugh out loud funny where possible.

NEVER include anything that:
- Requires identifying or targeting a specific person
- Involves photographing someone in a private or compromising moment
- Is cruel, discriminatory, or punches down

Return ONLY a valid JSON array of exactly 24 objects. No markdown, no preamble:
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
    const raw   = data.content?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const squares = JSON.parse(clean);

    if (!Array.isArray(squares) || squares.length < 20) {
      return res.status(502).json({ error: 'LLM returned unexpected format' });
    }

    return res.status(200).json({ squares: squares.slice(0, 24) });
  } catch (err) {
    console.error('generate-people-squares error:', err);
    return res.status(500).json({ error: err.message });
  }
}
