// api/generate-squares.js
// Vercel Serverless Function — proxies Anthropic API to keep key server-side

const LOCATION_LABELS = {
  liveGame: 'attending the live game at the arena or stadium',
  sportsBar: 'watching at a loud sports bar',
  home: 'watching at home on TV or streaming',
};

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAnthropicText(data) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function parseJsonArray(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const stripped = raw.replace(/```json|```/gi, '').trim();

  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\[[\s\S]*\]/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeSquares(input, isHome) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const text = cleanText(item.text);
    const key = text.toLowerCase();

    if (!text) continue;
    if (text.length > 32) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push({
      text,
      battle: Boolean(item.battle),
      camera: isHome ? false : Boolean(item.camera),
    });
  }

  return normalized;
}

const FALLBACK_SQUARES = [
  { text: 'Announcer jinxes the team',   battle: false, camera: false },
  { text: 'Ref gets loudly booed',        battle: false, camera: false },
  { text: 'Someone stands for big play',  battle: false, camera: false },
  { text: 'Replay shown 3+ times',        battle: false, camera: false },
  { text: 'Coach argues the call',        battle: false, camera: false },
  { text: 'Team timeout at worst time',   battle: false, camera: false },
  { text: 'Someone says "We had this"',   battle: false, camera: false },
  { text: 'Score changes in 60 seconds',  battle: true,  camera: false },
];

function padSquares(squares, isHome) {
  let i = 0;
  while (squares.length < 24) {
    const fb = { ...FALLBACK_SQUARES[i % FALLBACK_SQUARES.length] };
    if (isHome) fb.camera = false;
    if (!squares.find(s => s.text === fb.text)) squares.push(fb);
    else squares.push({ text: `Play #${squares.length + 1}`, battle: false, camera: false });
    i++;
  }
  return squares.slice(0, 24);
}

function validateSquares(squares, isHome) {
  const errors = [];
  if (!Array.isArray(squares)) return { valid: false, errors: ['not_an_array'] };
  // Accept 20+ — we pad to 24 before returning
  if (squares.length < 20) errors.push('too_few');
  const tooLong = squares.some((s) => typeof s.text !== 'string' || s.text.length > 32);
  if (tooLong) errors.push('text_length');
  return { valid: errors.length === 0, errors };
}

async function callAnthropic({ apiKey, system, userPrompt, maxTokens = 2200 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature: 0.95,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await response.json();
  return extractAnthropicText(data);
}

function buildSystemPrompt() {
  return `You design sports bingo cards that feel like a drinking game for adults watching together.

You are not making a bland sports checklist.
You are creating short, hilarious, reactive triggers that make the room yell, groan, celebrate, argue, point at the TV, roast the announcers, and take a sip.

Your squares should feel:
- rowdy
- funny
- specific
- watchable
- social
- memorable

The humor should come from live sports culture:
- momentum swings
- ref nonsense
- announcer clichés
- fan superstition
- bar behavior
- group reactions
- rivalry tension
- absurdly predictable broadcast moments
- emotional overreactions
- crowd chaos

Important:
- Keep all squares realistic for the specific matchup and sport
- Avoid generic filler like "Score happens" or "Big play"
- Prefer vivid triggers people instantly recognize
- Write like a funny friend hosting game night, not a neutral assistant
- These are sip-worthy moments, not dangerous consumption challenges
- Never encourage binge drinking, shots, coercion, or unsafe behavior
- Return JSON only when asked`;
}

function buildUserPrompt({
  sport,
  homeTeam,
  awayTeam,
  matchup,
  gameDate,
  location,
  locationLabel,
}) {
  const isHome = location === 'home';

  return `Generate exactly 24 unique bingo squares for this sports-watching party game.

GAME CONTEXT
- Sport: ${sport || 'sports'}
- Matchup: ${matchup}
- Home team: ${homeTeam || 'home team'}
- Away team: ${awayTeam || 'away team'}
- Date: ${gameDate || new Date().toDateString()}
- Viewing setup: ${locationLabel}

GAME FEEL
This should feel closer to a drinking game than a plain bingo card.
Each square should feel like a moment that makes the group react:
- laugh
- groan
- yell at the TV
- side-eye the ref
- roast the commentators
- celebrate too early
- call out "drink"

CORE RULES
1. Every square must be something that could realistically happen during THIS specific game: ${matchup}.
2. Do not reference teams that are not playing.
3. Where helpful, reference ${homeTeam || 'the home team'} and ${awayTeam || 'the away team'} by name.
4. Keep each square under 32 characters.
5. Make squares punchy, funny, and easy to scan.
6. Mix easy/common triggers, medium triggers, and rare glorious chaos.
7. Avoid sterile filler like:
   - "Goal scored"
   - "Penalty happens"
   - "Big hit"
   - "Touchdown"
   unless rewritten into something more specific, social, or funny.
8. Favor moments people love calling out in a group:
   - announcer jinxes
   - ref complaints
   - replay drama
   - fan panic
   - momentum swings
   - missed easy chances
   - heroic flops
   - crowd chants
   - mascot nonsense
   - bar reactions
   - couch-coach behavior
   - superstition rituals
   - one guy celebrating too early
   - someone saying "ball game" way too soon

CATEGORY MIX
Include a mix of:
- game action
- player behavior
- referee / ump / official drama
- announcer / broadcast moments
- crowd or venue atmosphere
- viewer behavior specific to ${locationLabel}

SPECIAL TAGGING
1. Mark 4 to 6 squares as "battle": true.
   These are the rarest, loudest, most chaotic, room-popping moments.
   Think "everybody loses it" moments.
2. ${isHome
    ? 'Because this game is being watched at home, ALL squares must have "camera": false.'
    : 'Mark 3 to 5 squares as "camera": true. These should be visually provable crowd, venue, or bar moments someone could photograph without invading privacy.'}

LOCATION-SPECIFIC GUIDANCE
- If viewing at a live game, include crowd rituals, scoreboard bits, mascot antics, chant waves, fan signs, beer line timing, or arena chaos.
- If viewing at a sports bar, include bartender timing, table eruptions, one loud fan, bad takes, delayed reactions from other TVs, or everyone turning for the replay.
- If viewing at home, include couch-coach moments, someone standing during a key play, replay debates, snack timing, or "don't sit there, we were winning."

SAFETY
- Do not include shots, chugging, blackouts, dares, hazing, or coercion
- Keep it adult, funny, and party-forward without pushing unsafe drinking

OUTPUT
Return ONLY a valid JSON array of exactly 24 objects:
[
  { "text": "...", "battle": false, "camera": false }
]

No markdown
No explanation
No extra keys`;
}

function buildRepairPrompt(rawOutput, location) {
  const isHome = location === 'home';

  return `Repair this bingo card JSON so it exactly follows these rules:

- Return exactly 24 unique objects
- Each object must be: { "text": string, "battle": boolean, "camera": boolean }
- text must be 32 characters or fewer
- 4 to 6 squares must have "battle": true
- ${isHome ? '0 squares must have "camera": true' : '3 to 5 squares must have "camera": true'}
- Keep the tone entertaining, social, funny, and drinking-game-like
- Keep the strongest matchup-specific squares
- Return JSON only

BROKEN OUTPUT
${rawOutput}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { sport, homeTeam, awayTeam, location, gameDate } = req.body || {};

  const safeSport = cleanText(sport);
  const safeHomeTeam = cleanText(homeTeam);
  const safeAwayTeam = cleanText(awayTeam);
  const safeLocation = cleanText(location);

  const locationLabel = LOCATION_LABELS[safeLocation] || safeLocation || 'watching the game';
  const matchup = safeHomeTeam && safeAwayTeam
    ? `${safeAwayTeam} at ${safeHomeTeam}`
    : safeHomeTeam || safeAwayTeam || `a ${safeSport || 'sports'} game`;

  const isHome = safeLocation === 'home';

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    sport: safeSport,
    homeTeam: safeHomeTeam,
    awayTeam: safeAwayTeam,
    matchup,
    gameDate: cleanText(gameDate),
    location: safeLocation,
    locationLabel,
  });

  try {
    let raw = await callAnthropic({
      apiKey,
      system: systemPrompt,
      userPrompt,
    });

    let squares = normalizeSquares(parseJsonArray(raw), isHome);
    let validation = validateSquares(squares, isHome);

    if (!validation.valid) {
      const repairRaw = await callAnthropic({
        apiKey,
        system: 'You repair JSON for a production sports-bingo API. Return JSON only.',
        userPrompt: buildRepairPrompt(raw, safeLocation),
        maxTokens: 1800,
      });

      raw = repairRaw;
      squares = normalizeSquares(parseJsonArray(repairRaw), isHome);
      validation = validateSquares(squares, isHome);
    }

    if (!validation.valid) {
      // Last resort — pad what we have if we got at least 16
      if (squares.length >= 16) {
        return res.status(200).json({ squares: padSquares(squares, isHome) });
      }
      return res.status(502).json({
        error: 'LLM returned unexpected format',
        details: validation.errors,
      });
    }

    return res.status(200).json({
      squares: padSquares(squares, isHome),
    });
  } catch (err) {
    console.error('generate-squares error:', err);
    return res.status(500).json({ error: err.message });
  }
}