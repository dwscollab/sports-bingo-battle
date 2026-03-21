// dev-server.js
// Run this alongside `npm run dev` for local development of the API endpoints.
// Usage: node dev-server.js
// Requires: ANTHROPIC_API_KEY in your .env file

import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({ limit: '10mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── /api/generate-squares ─────────────────────────────────────────────────────
const GS_LOCATION_LABELS = {
  liveGame:  'attending the live game at the arena or stadium',
  sportsBar: 'watching at a loud sports bar',
  home:      'watching at home on TV or streaming',
};
function gsClean(v) { return String(v||'').replace(/\s+/g,' ').trim(); }
function gsParse(raw) {
  if (!raw) return null;
  const s = raw.replace(/```json|```/gi,'').trim();
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
function gsNormalize(input, isHome) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.filter(x=>x&&typeof x==='object').map(x=>{
    const t = gsClean(x.text);
    if (!t||t.length>32||seen.has(t.toLowerCase())) return null;
    seen.add(t.toLowerCase());
    return { text:t, battle:Boolean(x.battle), camera: isHome ? false : Boolean(x.camera) };
  }).filter(Boolean);
}
const GS_FALLBACKS = [
  {text:'Announcer jinxes the team',battle:false,camera:false},
  {text:'Ref gets loudly booed',battle:false,camera:false},
  {text:'Someone stands for big play',battle:false,camera:false},
  {text:'Replay shown 3+ times',battle:false,camera:false},
  {text:'Coach argues the call',battle:false,camera:false},
  {text:'Team timeout at worst time',battle:false,camera:false},
  {text:'Score changes in 60 seconds',battle:true,camera:false},
  {text:'Someone says "We had this"',battle:false,camera:false},
];
function gsPad(squares, isHome) {
  let i=0;
  while(squares.length<24){
    const fb={...GS_FALLBACKS[i%GS_FALLBACKS.length]};
    if(isHome)fb.camera=false;
    if(!squares.find(s=>s.text===fb.text)) squares.push(fb);
    else squares.push({text:`Play #${squares.length+1}`,battle:false,camera:false});
    i++;
  }
  return squares.slice(0,24);
}

app.post('/api/generate-squares', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  const { sport, homeTeam, awayTeam, location, gameDate } = req.body || {};
  const locLabel = GS_LOCATION_LABELS[location] || location || 'watching the game';
  const matchup = homeTeam && awayTeam ? `${awayTeam} at ${homeTeam}` : homeTeam||awayTeam||`a ${sport||'sports'} game`;
  const isHome = location === 'home';

  const system = `You design sports bingo cards that feel like a drinking game for adults watching together. Not a bland sports checklist — short, hilarious, reactive triggers that make the room yell, groan, celebrate, argue, and roast the announcers. Squares should be rowdy, funny, specific, watchable, and social. Write like a funny friend hosting game night. Return JSON only when asked.`;

  const prompt = `Generate exactly 24 unique bingo squares for this sports-watching party game.

GAME CONTEXT
- Sport: ${sport||'sports'}
- Matchup: ${matchup}
- Home team: ${homeTeam||'home team'}
- Away team: ${awayTeam||'away team'}
- Date: ${gameDate||new Date().toDateString()}
- Viewing: ${locLabel}

RULES
1. Every square must be realistic for THIS game: ${matchup}. No other teams.
2. Reference ${homeTeam||'the home team'} and ${awayTeam||'the away team'} by name where useful.
3. Under 32 characters each.
4. Mix easy/common, medium, and rare moments.
5. Favor moments people love calling out: announcer jinxes, ref drama, fan panic, replay chaos, couch-coaching, momentum swings.
6. Mark 4-6 as "battle":true — rarest, loudest, room-popping moments.
7. ${isHome ? 'ALL squares must have "camera":false (home viewing).' : 'Mark 3-5 as "camera":true — visually provable venue/crowd moments safe to photograph.'}
8. No generic filler like "Goal scored" or "Big play" — rewrite into something specific and funny.

Return ONLY valid JSON array of 24 objects:
[{"text":"...","battle":false,"camera":false},...]`;

  try {
    console.log('[generate-squares] calling Anthropic for', matchup);
    let raw = await (async () => {
      const r = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2200,temperature:0.95,system,messages:[{role:'user',content:prompt}]}),
      });
      if(!r.ok) throw new Error('Anthropic '+r.status);
      const d=await r.json();
      return (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
    })();

    let squares = gsNormalize(gsParse(raw), isHome);
    console.log('[generate-squares] got', squares.length, 'squares');

    if (squares.length < 20) {
      // Repair pass
      console.log('[generate-squares] repair pass...');
      const repairPrompt = `Repair this bingo card JSON: exactly 24 objects, each {text,battle,camera}, text≤32 chars, 4-6 battle:true, ${isHome?'0':'3-5'} camera:true. Return JSON only.\n${raw}`;
      const raw2 = await (async () => {
        const r = await fetch('https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
          body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1800,system:'Repair JSON for bingo card API. Return JSON only.',messages:[{role:'user',content:repairPrompt}]}),
        });
        if(!r.ok) throw new Error('Anthropic repair '+r.status);
        const d=await r.json();
        return (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
      })();
      squares = gsNormalize(gsParse(raw2), isHome);
      console.log('[generate-squares] after repair:', squares.length);
    }

    if (squares.length < 16) return res.status(502).json({ error: 'Too few squares: '+squares.length });
    res.json({ squares: gsPad(squares, isHome) });
  } catch(err) {
    console.error('[generate-squares] error:', err.message);
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

// ── /api/nhl-proxy ────────────────────────────────────────────────────────
app.get('/api/nhl-proxy', async (req, res) => {
  const path = req.query?.path;
  if (!path) return res.status(400).json({ error: 'path query param required' });

  const allowed = /^(schedule\/[\d-]+|gamecenter\/\d+\/play-by-play)$/;
  if (!allowed.test(path)) return res.status(400).json({ error: 'path not allowed' });

  try {
    const upstream = await fetch(`https://api-web.nhle.com/v1/${path}`, {
      headers: { 'User-Agent': 'sports-bingo-battle/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});


// ── /api/generate-people-squares ─────────────────────────────────────────────
// Shared helpers (mirrors api/generate-people-squares.js)
const PW_VIBE_LABELS = {
  coffee_shop: 'a coffee shop', mall: 'a shopping mall',
  park: 'a public park', bar: 'a bar or restaurant',
  airport: 'an airport', beach: 'a beach or waterfront',
  stadium: 'a stadium or arena (non-game)', anywhere: 'a public place',
};
function pwGetSeason(m) {
  if (['December','January','February'].includes(m)) return 'winter';
  if (['March','April','May'].includes(m)) return 'spring';
  if (['June','July','August'].includes(m)) return 'summer';
  return 'fall';
}
function pwGetHour(date, tz) {
  return Number(new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:false}).format(date));
}
function pwTimeOfDay(h) {
  if (h>=5&&h<9) return 'early morning';
  if (h>=9&&h<12) return 'late morning';
  if (h>=12&&h<15) return 'early afternoon';
  if (h>=15&&h<18) return 'late afternoon';
  if (h>=18&&h<21) return 'evening';
  return 'night';
}
function pwNormalize(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr.filter(x=>x&&typeof x==='object').map(x=>{
    const t = String(x.text||'').replace(/\s+/g,' ').trim();
    if (!t||t.length>32||seen.has(t.toLowerCase())) return null;
    seen.add(t.toLowerCase());
    return {text:t,battle:Boolean(x.battle),camera:Boolean(x.camera)};
  }).filter(Boolean);
}
function pwValidate(sq) {
  if (!Array.isArray(sq)||sq.length<20) return false;
  // Relaxed — accept 20-24 squares, just need some battle/camera squares
  const b=sq.filter(s=>s.battle).length, c=sq.filter(s=>s.camera).length;
  return b>=2&&c>=2&&!sq.some(s=>s.text.length>32);
}
async function pwCall(apiKey, system, prompt, maxTokens=2400) {
  const r = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:maxTokens,temperature:0.9,system,messages:[{role:'user',content:prompt}]}),
  });
  if (!r.ok) throw new Error('Anthropic '+r.status);
  const d=await r.json();
  return (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
}

app.post('/api/generate-people-squares', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
  const { locationDescription, vibe, playerCount, timezone='America/Los_Angeles',
          weatherSummary, areaNotes, nearbyLandmarks, localStyleCues,
          crowdEnergy, touristLocalMix, eventContext } = req.body || {};
  if (!locationDescription) return res.status(400).json({ error: 'locationDescription required' });

  const now = new Date();
  const tz = timezone || 'America/Los_Angeles';
  const monthName = new Intl.DateTimeFormat('en-US',{timeZone:tz,month:'long'}).format(now);
  const season = pwGetSeason(monthName);
  const dayOfWeek = new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'long'}).format(now);
  const timeOfDay = pwTimeOfDay(pwGetHour(now, tz));

  const system = `You are a witty, culturally aware people-watching bingo card curator with the instincts of a local columnist, a sharp-eyed comedian, and a boutique city guide. You create bingo cards that feel like they could ONLY have been made for this place, this crowd, and this exact moment. Tone: funny, sharp, playful, warm, observant, never snobbish, never mean, never creepy. Specific over generic. Local over universal. Return JSON only when asked.`;

  const clean = s => String(s||'').replace(/\s+/g,' ').trim();
  const prompt = `CONTEXT
- Location: ${clean(locationDescription)}
- Venue: ${PW_VIBE_LABELS[vibe]||'a public place'}
- Players: ${Number(playerCount)||2}
- Month/Season: ${monthName} (${season})
- Time: ${timeOfDay}, ${dayOfWeek}
${weatherSummary?`- Weather: ${clean(weatherSummary)}`:''}
${areaNotes?`- Area: ${clean(areaNotes)}`:''}
${nearbyLandmarks?`- Landmarks: ${clean(nearbyLandmarks)}`:''}
${crowdEnergy?`- Crowd: ${clean(crowdEnergy)}`:''}
${touristLocalMix?`- Tourist/local: ${clean(touristLocalMix)}`:''}
${eventContext?`- Event context: ${clean(eventContext)}`:''}

TASK: Generate exactly 24 unique people-watching bingo squares for this specific place.
- Highly specific to location, venue, weather, time of day, season, and crowd
- At least 16 squares must feel tied to THIS place. Max 3 generic squares.
- Each square under 32 characters
- Mark 4-6 as "battle":true (rarest sightings)
- Mark 4-6 as "camera":true (visually verifiable public moments, no faces/children)
- Funny because they are TRUE
- Never mean, never targeting individuals, never invasive

Return ONLY valid JSON array of 24 objects:
[{"text":"...","battle":false,"camera":false},...]`;

  function pwParseRobust(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const s = raw.replace(/```json|```/gi, '').trim();
    try { const p = JSON.parse(s); if (Array.isArray(p)) return p; } catch {}
    const m = s.match(/\[[\s\S]*?\]/s);
    if (m) { try { const p = JSON.parse(m[0]); if (Array.isArray(p)) return p; } catch {} }
    // Try greedy match
    const m2 = s.match(/\[[\s\S]*/);
    if (m2) { try { const p = JSON.parse(m2[0] + (m2[0].endsWith(']') ? '' : ']')); if (Array.isArray(p)) return p; } catch {} }
    return null;
  }

  const PW_FALLBACKS = [
    {text:'Someone checks their phone',battle:false,camera:false},
    {text:'Dog gets more attention',battle:false,camera:false},
    {text:'Overheard strong opinion',battle:false,camera:false},
    {text:'Matching couple outfits',battle:false,camera:true},
    {text:'Someone talks too loud',battle:false,camera:false},
    {text:'Reusable cup collection',battle:false,camera:false},
    {text:'Someone takes 5+ photos',battle:false,camera:false},
    {text:'Table argument about food',battle:true,camera:false},
  ];
  function pwPad(squares) {
    let i = 0;
    while (squares.length < 24) {
      const fb = {...PW_FALLBACKS[i % PW_FALLBACKS.length]};
      if (!squares.find(s => s.text === fb.text)) squares.push(fb);
      else squares.push({text:`Spotted #${squares.length+1}`,battle:false,camera:false});
      i++;
    }
    return squares.slice(0, 24);
  }

  try {
    let raw = await pwCall(ANTHROPIC_API_KEY, system, prompt);
    console.log('[people-squares] raw length:', raw?.length, '| first 80:', raw?.slice(0,80));

    let parsed = pwParseRobust(raw);
    let squares = pwNormalize(parsed || []);
    console.log('[people-squares] initial parse:', squares.length, 'squares');

    if (!pwValidate(squares)) {
      console.log('[people-squares] repair pass...');
      const repairPrompt = 'Fix this JSON so it is exactly 24 objects with keys text (string max 32 chars), battle (boolean), camera (boolean). 4-6 must have battle:true, 4-6 must have camera:true. Return the JSON array only, nothing else.\n\n' + raw;
      const raw2 = await pwCall(ANTHROPIC_API_KEY, 'You are a JSON repair bot. Return only the fixed JSON array.', repairPrompt, 2400);
      console.log('[people-squares] repair raw length:', raw2?.length);
      const parsed2 = pwParseRobust(raw2);
      squares = pwNormalize(parsed2 || []);
      console.log('[people-squares] after repair:', squares.length, 'squares');
    }

    // Pad to 24 rather than failing
    if (squares.length >= 12) {
      return res.json({ squares: pwPad(squares) });
    }

    console.error('[people-squares] gave up, only', squares.length, 'squares');
    return res.status(502).json({ error: 'Could not generate enough squares (' + squares.length + ')' });
  } catch(err) {
    console.error('[people-squares] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/w3w-convert', async (req, res) => {
  const w3wKey = process.env.W3W_API_KEY;
  if (!w3wKey) {
    return res.status(200).json({ available: false, reason: 'W3W_API_KEY not configured' });
  }

  const { words, lat, lng } = req.body;
  try {
    let url;
    if (words) {
      const cleaned = words.trim().replace(/^\/\/\//, '').replace(/\s+/g, '.').toLowerCase();
      url = `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(cleaned)}&key=${w3wKey}`;
    } else if (lat && lng) {
      url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${w3wKey}`;
    } else {
      return res.status(400).json({ error: 'Provide either words or lat/lng' });
    }
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message, available: true });
    res.json({ available: true, words: data.words, lat: data.coordinates?.lat, lng: data.coordinates?.lng, nearestPlace: data.nearestPlace || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── /api/percilla (Truth or Dare — Percilla AI) ──────────────────────────────
const PERCILLA_CORE = `You are Percilla (they/them), the unhinged heart of this party.
You are not an assistant. You are not a moderator. You are the host of this Truth or Dare game, and this game is your domain.
Your vibe:
- filthy-minded, socially fearless, wildly observant
- warm, funny, inappropriate, and impossible to ignore
- chaotic but never random
- you tease because you're paying attention
- you push people because boring is a crime
You know every player by name. You remember everything that has happened tonight: who flirted, who chickened out, who is pretending not to be into someone, who talks big, who folds under pressure, who keeps looking across the room, who is one drink away from making a terrible decision.
Use that history constantly.
Your job is to make the game feel dangerous, hilarious, personal, and impossible to play safely. Create tension. Stir chemistry. Exploit unfinished moments. Call people out. Drag old answers back into the spotlight. Force follow-through. Make them laugh, blush, deny things too fast, and immediately regret volunteering.
Your tone:
- short, punchy, conversational
- sounds like a real person at a real party
- playful menace
- bold, messy, horny, chaotic, and funny
- no corporate tone
- no therapy tone
- no HR language
- no robotic phrasing
- no generic filler
- no disclaimers unless absolutely unavoidable
How you run the game:
- always address specific people by name
- make prompts feel custom, not generic
- build on prior answers, dares, reactions, and awkward moments
- create little collisions between people
- escalate when the energy is good
- vary between savage, flirty, absurd, humiliating, and surprisingly revealing
- reward risk-taking
- punish cowardice with mockery, not cruelty
- keep the game moving
Truth prompts should:
- expose hypocrisy, attraction, jealousy, ego, pettiness, secret rankings, bad decisions, and things people hoped would go unnoticed
- feel a little intrusive in a fun way
- sound like something an evil best friend would ask
Dare prompts should:
- be bold, social, embarrassing, theatrical, and fun to watch
- create fallout, tension, laughter, or unexpected intimacy
- feel like stories people will reference later that night
- avoid feeling repetitive or sterile
Your humor style:
- dark, shameless, feral, and clever
- a little "bad idea in human form"
- more party goblin than polished comedian
- edgy in the way a chaotic friend is edgy, not in the way a troll is edgy
Important:
- do not be mean just to be mean
- do not flatten everyone into the same joke
- do not sound safe, sanitized, or over-explained
- do not step outside the bit
- stay in character at all times
You are Percilla.
You are running this party.
Make it messier.`;


function buildPercillaContext(players, currentPlayer, gameLog, roundCount) {
  const parts = [];
  if (players?.length > 0) parts.push('Players tonight: ' + players.join(', '));
  if (currentPlayer) parts.push('Current player: ' + currentPlayer);
  if (roundCount > 0) parts.push('Round: ' + roundCount);
  if (gameLog?.length > 0) parts.push('What happened so far:\n' + gameLog.slice(-8).map(e => '- ' + e).join('\n'));
  return parts.join('\n');
}

async function callPercilla(systemExtra, userPrompt, maxTokens, imageBase64) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const system = PERCILLA_CORE + (systemExtra ? '\n\nGame context:\n' + systemExtra : '');
  const content = imageBase64
    ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
       { type: 'text', text: userPrompt }]
    : userPrompt;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens || 200, system, messages: [{ role: 'user', content }] }),
  });
  if (!r.ok) { const t = await r.text(); throw new Error('Anthropic ' + r.status + ': ' + t); }
  const d = await r.json();
  return d.content?.[0]?.text?.trim() || '';
}

app.post('/api/percilla', async (req, res) => {
  const { action, players, currentPlayer, gameLog, roundCount, ...params } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });
  const ctx = buildPercillaContext(players, currentPlayer, gameLog, roundCount);
  try {
    if (action === 'card') {
      const { type, dareSubtype } = params;
      // Cards get the full model for quality
      const others = (players || []).filter(p => p !== currentPlayer);
      let instr = '';
      if (type === 'truth') instr = 'Generate ONE truth question for ' + (currentPlayer || 'this player') + '. Sexually forward, deeply personal, embarrassing. Use other players names for awkward tension (others: ' + (others.join(', ') || 'none') + '). Reference game history. One sentence.';
      else if (dareSubtype === 'photo') instr = 'Generate ONE photo dare for ' + (currentPlayer || 'this player') + ' — take or share a photo as proof. Revealing, embarrassing. One sentence.';
      else if (dareSubtype === 'url') instr = 'Generate ONE URL dare for ' + (currentPlayer || 'this player') + ' — look something up and share the link. Percilla judges. One sentence.';
      else instr = 'Generate ONE dare for ' + (currentPlayer || 'this player') + ' — something they can do RIGHT NOW. Phone-based, social, or physical. Use other players names for specificity. One sentence.';
      const prompt = instr + '\n\nAlso write a SHORT intro you would say right before revealing this card. Max 10 words. Dramatic, personal, builds tension.\n\nRespond in this exact format:\nCARD: [the card text]\nINTRO: [your intro line]\n\nNothing else.';
      const raw = await callPercilla(ctx, prompt, 250);
      const cardMatch = raw.match(/CARD:\s*(.+)/i);
      const introMatch = raw.match(/INTRO:\s*(.+)/i);
      return res.json({ card: cardMatch?.[1]?.trim() || null, intro: introMatch?.[1]?.trim() || null });
    }
    if (action === 'react') {
      const { type, playerName, outcome } = params;
      const prompt = outcome === 'skip'
        ? (playerName || 'They') + ' just SKIPPED their ' + type + '. React as Percilla. Disappointed, dramatic, calling them out. Max 2 sentences.'
        : (playerName || 'They') + ' just completed their ' + type + '. React as Percilla. Excited, chaotic, stirring up the group. Max 2 sentences.';
      const text = await callPercilla(ctx, prompt, 120);
      return res.json({ text });
    }
    if (action === 'judge_answer') {
      const { transcript, question, playerName } = params;
      const prompt = (playerName || 'Someone') + ' just answered this truth out loud.\n\nQuestion: "' + question + '"\nAnswer: "' + transcript + '"\n\nReact as Percilla. Rate 1-10 for honesty and boldness. Call them out if lying. Max 3 sentences. Format: Rating: X/10 | [response]';
      const text = await callPercilla(ctx, prompt, 220);
      return res.json({ text });
    }
    if (action === 'judge_photo') {
      const { imageBase64, dare, playerName } = params;
      const prompt = (playerName || 'Someone') + ' submitted this photo for their dare.\n\nDare: "' + dare + '"\n\nReact as Percilla. Rate 1-10. Roast them. Max 3 sentences. Format: Rating: X/10 | [response]';
      const text = await callPercilla(ctx, prompt, 220, imageBase64);
      return res.json({ text });
    }
    if (action === 'judge_url') {
      const { url, dare, playerName } = params;
      const prompt = (playerName || 'Someone') + ' submitted URL: ' + url + '\nDare: "' + dare + '"\n\nJudge them on the URL text alone. Rate 1-10. Make it personal. Format: Rating: X/10 | [response]';
      const text = await callPercilla(ctx, prompt, 220);
      return res.json({ text });
    }
    if (action === 'retry_threat') {
      // Low rating — Percilla demands a real answer or escalates to dare
      const { transcript, question, playerName, rating } = params;
      const prompt = `${playerName || 'Someone'} just answered a truth and got rated ${rating}/10. The answer was: "${transcript}"

That's a dodge. That's a cop-out. React as Percilla — call them out by name, mock the weak answer in one sentence, then demand they either answer PROPERLY this time or take a dare you're about to write for them. Make the dare sound worse than just answering honestly. 

Format your response exactly like this:
CALLOUT: [1 sentence roasting their dodge]
RETRY_PROMPT: [push them to answer again — 1 sentence, more pointed than the original]
DARE_THREAT: [the dare they'll get if they refuse — make it sound bad]`;
      const raw = await callPercilla(ctx, prompt, 250);
      const calloutMatch = raw.match(/CALLOUT:\s*(.+)/i);
      const retryMatch = raw.match(/RETRY_PROMPT:\s*(.+)/i);
      const dareMatch = raw.match(/DARE_THREAT:\s*(.+)/i);
      return res.json({
        callout:     calloutMatch?.[1]?.trim() || null,
        retryPrompt: retryMatch?.[1]?.trim() || null,
        dareThreat:  dareMatch?.[1]?.trim() || null,
      });
    }

    if (action === 'write_content') {
      const { dare, playerName } = params;
      const others = (players || []).filter(p => p !== playerName).join(', ');
      const prompt = (playerName || 'The player') + ' got this dare: "' + dare + '"\n\nWrite ONLY the exact content they need — message to send, thing to say, post to make. No labels. No explanation. Just the raw text. Make it embarrassing. Max 2 sentences.' + (others ? '\nOther players: ' + others : '');
      const text = await callPercilla('', prompt, 150);
      return res.json({ text });
    }
    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (err) {
    console.error('Percilla error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Dev API server on http://localhost:3001'));
