// api/w3w-convert.js
// Server-side proxy for what3words API — keeps API key off the client
// what3words free tier: 1000 requests/month at what3words.com/select-plan

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const w3wKey = process.env.W3W_API_KEY;
  if (!w3wKey) {
    // Graceful fallback — tell the client w3w isn't configured
    return res.status(200).json({ available: false, reason: 'W3W_API_KEY not configured' });
  }

  const { words, lat, lng } = req.body;

  try {
    let url;

    if (words) {
      // Convert 3 words → coordinates + nearest place
      const cleaned = words.trim().replace(/^\/\/\//, '').replace(/\s+/g, '.').toLowerCase();
      url = `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(cleaned)}&key=${w3wKey}`;
    } else if (lat && lng) {
      // Convert coordinates → 3 words
      url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${w3wKey}`;
    } else {
      return res.status(400).json({ error: 'Provide either words or lat/lng' });
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message || 'what3words error', available: true });
    }

    // Return coordinates and nearest place label
    return res.status(200).json({
      available: true,
      words:     data.words,
      lat:       data.coordinates?.lat,
      lng:       data.coordinates?.lng,
      nearestPlace: data.nearestPlace || null,
      country:   data.country || null,
    });
  } catch (err) {
    console.error('w3w-convert error:', err);
    return res.status(500).json({ error: err.message });
  }
}
