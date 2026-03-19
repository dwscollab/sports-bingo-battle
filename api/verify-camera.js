// api/verify-camera.js
// Vercel Serverless Function — uses Claude vision to verify a bingo square from a photo

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { imageBase64, mediaType, squareText, sport, location } = req.body;

  if (!imageBase64 || !squareText) {
    return res.status(400).json({ error: 'imageBase64 and squareText are required' });
  }

  const prompt = `You are a fair and impartial sports bingo referee.

A player at ${location === 'liveGame' ? 'a live sports game' : 'a sports bar'} has taken a photo to verify their bingo square.

The square they are trying to mark is: "${squareText}"

Examine the photo and determine if it genuinely shows evidence of this square.

Be fair but not too strict — if the photo plausibly shows what the square describes, mark it as verified. 
Be strict about obvious fakes or completely unrelated photos.

Reply with ONLY valid JSON, no other text:
{
  "verified": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "one short sentence explaining why"
}`;

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
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${err}` });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text ?? '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    console.error('verify-camera error:', err);
    return res.status(500).json({ error: err.message });
  }
}
