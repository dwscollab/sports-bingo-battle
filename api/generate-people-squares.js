// api/generate-people-squares.js
// Generates people-watching bingo squares based on location context

const DEFAULT_TIMEZONE = 'America/Los_Angeles';

const vibeLabels = {
  coffee_shop: 'a coffee shop',
  mall: 'a shopping mall',
  park: 'a public park',
  bar: 'a bar or restaurant',
  airport: 'an airport',
  beach: 'a beach or waterfront',
  stadium: 'a stadium or arena (non-game)',
  anywhere: 'a public place',
};

function getSeason(monthName) {
  if (['December', 'January', 'February'].includes(monthName)) return 'winter';
  if (['March', 'April', 'May'].includes(monthName)) return 'spring';
  if (['June', 'July', 'August'].includes(monthName)) return 'summer';
  return 'fall';
}

function getHourInTimezone(date, timeZone) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).format(date);

  return Number(formatted);
}

function inferTimeOfDay(hour) {
  if (hour >= 5 && hour < 9) return 'early morning';
  if (hour >= 9 && hour < 12) return 'late morning';
  if (hour >= 12 && hour < 15) return 'early afternoon';
  if (hour >= 15 && hour < 18) return 'late afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}

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

function normalizeSquares(input) {
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
      camera: Boolean(item.camera),
    });
  }

  return normalized;
}

const FALLBACK_SQUARES = [
  {text:'Someone checks their phone',battle:false,camera:false},
  {text:'Dog gets more attention',battle:false,camera:false},
  {text:'Someone talks too loud',battle:false,camera:false},
  {text:'Matching couple outfits',battle:false,camera:true},
  {text:'Eavesdrop on work drama',battle:false,camera:false},
  {text:'Someone takes 5 photos',battle:false,camera:false},
  {text:'Outdoor seating dispute',battle:false,camera:false},
  {text:'Reusable bag collection',battle:false,camera:false},
];

function padSquares(squares) {
  let i = 0;
  while (squares.length < 24) {
    const fb = FALLBACK_SQUARES[i % FALLBACK_SQUARES.length];
    if (!squares.find(s => s.text === fb.text)) squares.push({...fb});
    else squares.push({text:`Spotted #${squares.length+1}`,battle:false,camera:false});
    i++;
  }
  return squares.slice(0, 24);
}

function validateSquares(squares) {
  const errors = [];
  if (!Array.isArray(squares)) { errors.push('not_an_array'); return { valid: false, errors }; }
  // Relaxed — accept 20+ squares, we'll pad if needed
  if (squares.length < 20) errors.push('too_few');
  const tooLong = squares.some((s) => typeof s.text !== 'string' || s.text.length > 32);
  if (tooLong) errors.push('text_length');
  return { valid: errors.length === 0, errors };
}

async function callAnthropic({ apiKey, system, userPrompt, maxTokens = 2400 }) {
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
      temperature: 0.9,
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
  return `You are a witty, culturally aware people-watching bingo card curator with the instincts of a local columnist, a sharp-eyed comedian, and a boutique city guide.

You create bingo cards that feel like they could ONLY have been made for this place, this crowd, and this exact moment.

Your tone is:
- funny
- sharp
- playful
- warm
- observant
- lightly chaotic
- never snobbish
- never mean
- never creepy

Your quality bar:
- specific over generic
- local over universal
- situational truth over lazy filler
- stylish and cinematic over cheap joke app energy

You must avoid generic fallback squares unless they are made distinctly local and situational.
Bad: "Someone on their phone"
Better: "Phone call at crosswalk edge"

Humor must come from public behavior, awkward logistics, local texture, crowd rituals, and recognizable human comedy.
Never punch down.
Never target protected traits.
Never suggest invasive photography.
Never include anything private, humiliating, or unsafe.

Return JSON only when asked. No markdown. No preamble.`;
}

function buildUserPrompt({
  locationDescription,
  vibe,
  playerCount,
  monthName,
  season,
  timeOfDay,
  dayOfWeek,
  weatherSummary,
  areaNotes,
  nearbyLandmarks,
  localStyleCues,
  crowdEnergy,
  touristLocalMix,
  eventContext,
}) {
  return `CONTEXT
- Location: ${locationDescription}
- Venue type: ${vibeLabels[vibe] || 'a public place'}
- Players: ${playerCount || 2} adults playing together
- Month: ${monthName}
- Season: ${season}
- Time of day: ${timeOfDay}
- Day of week: ${dayOfWeek}
- Weather: ${weatherSummary || 'unknown'}
- Neighborhood / area notes: ${areaNotes || 'unknown'}
- Nearby landmarks or anchors: ${nearbyLandmarks || 'unknown'}
- Local style cues: ${localStyleCues || 'unknown'}
- Crowd energy: ${crowdEnergy || 'unknown'}
- Tourist vs local mix: ${touristLocalMix || 'unknown'}
- Special event context: ${eventContext || 'none'}

TASK
Generate exactly 24 unique bingo squares for a people-watching game at this specific place.

This card should feel premium, cinematic, and deeply tied to the setting. It should sound like a hilarious, observant friend is calling out what is happening around them in real time.

CORE RULES
1. Squares must describe things players could realistically OBSERVE around them at this exact location.
2. Be highly specific to the place, venue type, weather, month, season, time of day, and crowd behavior.
3. Use the location and contextual signals aggressively. If the card could work equally well in ten unrelated places, it is too generic.
4. At least 16 of the 24 squares must feel distinctly tied to this place or this crowd.
5. No more than 3 squares may be broadly universal.
6. Keep every square under 32 characters.
7. Favor vivid micro-behaviors, local habits, awkward logistics, overheard fragments, couple dynamics, food and drink behavior, tourist behavior, pets, children, solo rituals, and tiny public absurdities.
8. Make them funny because they are true.

LIKELIHOOD MIX
Create a satisfying spread:
- easy wins
- medium-specific wins
- rare glorious sightings

SPECIAL TAGGING
- Mark 4 to 6 squares as "battle": true for the rarest, funniest, most legendary sightings
- Mark 4 to 6 squares as "camera": true for visually verifiable public moments that can be photographed without invading privacy
- A square may be both battle and camera if appropriate

NEVER include anything that:
- requires identifying, following, or targeting a specific person
- involves photographing faces up close, children, or vulnerable people
- involves a private, embarrassing, or compromising moment
- is discriminatory, cruel, creepy, or punching down
- depends on protected traits or stereotypes

OUTPUT FORMAT
Return ONLY a valid JSON array of exactly 24 objects:
[
  { "text": "...", "battle": false, "camera": false }
]

No markdown.
No explanation.
No extra keys.
No comments.`;
}

function buildRepairPrompt(rawOutput) {
  return `Repair the following bingo card JSON so it exactly matches these rules:

RULES
- Return exactly 24 unique objects
- Each object must be: { "text": string, "battle": boolean, "camera": boolean }
- text must be 32 characters or fewer
- 4 to 6 squares must have "battle": true
- 4 to 6 squares must have "camera": true
- Keep the tone witty, specific, observational, and non-creepy
- Preserve the strongest location-specific squares where possible
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
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const {
    locationDescription, // e.g. "Downtown Denver, CO — 16th Street Mall"
    locationType, // 'gps' | 'zip' | 'w3w' | 'manual'
    vibe, // 'coffee_shop' | 'mall' | 'park' | 'bar' | 'airport' | 'beach' | 'anywhere'
    playerCount,

    // Optional richer context from client
    timezone = DEFAULT_TIMEZONE,
    timeOfDay: providedTimeOfDay,
    dayOfWeek: providedDayOfWeek,
    weatherSummary,
    areaNotes,
    nearbyLandmarks,
    localStyleCues,
    crowdEnergy,
    touristLocalMix,
    eventContext,
  } = req.body || {};

  if (!locationDescription) {
    return res.status(400).json({ error: 'locationDescription is required' });
  }

  const now = new Date();
  const monthName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'long',
  }).format(now);

  const season = getSeason(monthName);

  const inferredDayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);

  const hour = getHourInTimezone(now, timezone);
  const inferredTimeOfDay = inferTimeOfDay(hour);

  const dayOfWeek = cleanText(providedDayOfWeek || inferredDayOfWeek);
  const timeOfDay = cleanText(providedTimeOfDay || inferredTimeOfDay);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    locationDescription: cleanText(locationDescription),
    vibe,
    playerCount: Number(playerCount) > 0 ? Number(playerCount) : 2,
    monthName,
    season,
    timeOfDay,
    dayOfWeek,
    weatherSummary: cleanText(weatherSummary),
    areaNotes: cleanText(areaNotes),
    nearbyLandmarks: cleanText(nearbyLandmarks),
    localStyleCues: cleanText(localStyleCues),
    crowdEnergy: cleanText(crowdEnergy),
    touristLocalMix: cleanText(touristLocalMix),
    eventContext: cleanText(eventContext),
    locationType,
  });

  try {
    let raw = await callAnthropic({
      apiKey,
      system: systemPrompt,
      userPrompt,
    });

    let squares = normalizeSquares(parseJsonArray(raw));
    let validation = validateSquares(squares);

    if (!validation.valid) {
      const repairRaw = await callAnthropic({
        apiKey,
        system: 'You repair JSON for a production bingo-card API. Return JSON only.',
        userPrompt: buildRepairPrompt(raw),
        maxTokens: 2000,
      });

      raw = repairRaw;
      squares = normalizeSquares(parseJsonArray(repairRaw));
      validation = validateSquares(squares);
    }

    if (!validation.valid) {
      return res.status(502).json({
        error: 'LLM returned unexpected format',
        details: validation.errors,
      });
    }

    const finalSquares = padSquares(squares);
    return res.status(200).json({
      squares: finalSquares,
      contextUsed: {
        locationDescription: cleanText(locationDescription),
        vibe: vibeLabels[vibe] || 'a public place',
        monthName,
        season,
        dayOfWeek,
        timeOfDay,
        weatherSummary: cleanText(weatherSummary) || null,
        areaNotes: cleanText(areaNotes) || null,
        nearbyLandmarks: cleanText(nearbyLandmarks) || null,
        localStyleCues: cleanText(localStyleCues) || null,
        crowdEnergy: cleanText(crowdEnergy) || null,
        touristLocalMix: cleanText(touristLocalMix) || null,
        eventContext: cleanText(eventContext) || null,
        timezone,
      },
    });
  } catch (err) {
    console.error('generate-people-squares error:', err);
    return res.status(500).json({ error: err.message });
  }
}