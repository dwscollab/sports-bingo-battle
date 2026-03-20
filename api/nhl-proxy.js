// api/nhl-proxy.js
// Proxies NHL API requests server-side — avoids CORS issues in the browser.
// Called as: /api/nhl-proxy?path=schedule/2026-03-19
//        or: /api/nhl-proxy?path=gamecenter/12345/play-by-play

const NHL_BASE = 'https://api-web.nhle.com/v1';

export default async function handler(req, res) {
  const path = req.query?.path;
  if (!path) return res.status(400).json({ error: 'path query param required' });

  // Whitelist only the two endpoints we use
  const allowed = /^(schedule\/[\d-]+|gamecenter\/\d+\/play-by-play)$/;
  if (!allowed.test(path)) {
    return res.status(400).json({ error: 'path not allowed' });
  }

  try {
    const upstream = await fetch(`${NHL_BASE}/${path}`, {
      headers: { 'User-Agent': 'sports-bingo-battle/1.0' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `NHL API returned ${upstream.status}` });
    }

    const data = await upstream.json();

    // Cache for 15 seconds — enough to avoid hammering the API
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
