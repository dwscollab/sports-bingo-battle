// api/percilla.js — Proxy for all Percilla Truth or Dare AI calls
// Routes: POST /api/percilla with { action, ...params }

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
// Haiku for speed (reactions, intros), Sonnet for quality (cards, judging)
const MODEL_FAST  = 'claude-haiku-4-5-20251001';
const MODEL_SMART = 'claude-sonnet-4-6';

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

async function callClaude(system, userPrompt, maxTokens = 200, imageBase64 = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const content = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: userPrompt },
      ]
    : userPrompt;

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ['card','judge_answer','judge_photo','judge_url'].includes(req.body?.action) ? MODEL_SMART : MODEL_FAST,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

function buildContext(players, currentPlayer, gameLog, roundCount) {
  const parts = [];
  if (players?.length > 0) parts.push(`Players tonight: ${players.join(', ')}`);
  if (currentPlayer) parts.push(`Current player: ${currentPlayer}`);
  if (roundCount > 0) parts.push(`Round: ${roundCount}`);
  if (gameLog?.length > 0) {
    parts.push(`What's happened so far:\n${gameLog.slice(-8).map(e => `- ${e}`).join('\n')}`);
  }
  return parts.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, ...params } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });

  try {
    const ctx = buildContext(params.players, params.currentPlayer, params.gameLog, params.roundCount);
    const system = PERCILLA_CORE + (ctx ? `\n\nGame context:\n${ctx}` : '');

    let result = '';

    if (action === 'card') {
      // Generate card + intro together
      const { type, dareSubtype, currentPlayer, players } = params;
      const others = (players || []).filter(p => p !== currentPlayer);
      let cardInstruction = '';

      if (type === 'truth') {
        cardInstruction = `Generate ONE truth question for ${currentPlayer || 'this player'}. Sexually forward, deeply personal, embarrassing. Use other players' names for awkward tension (others: ${others.join(', ') || 'none'}). Reference game history if it makes it sharper. One sentence.`;
      } else if (dareSubtype === 'photo') {
        cardInstruction = `Generate ONE photo dare for ${currentPlayer || 'this player'} — they take a selfie or share an existing photo as proof. Revealing, embarrassing, awkward. Percilla will judge it. One sentence.`;
      } else if (dareSubtype === 'url') {
        cardInstruction = `Generate ONE URL dare for ${currentPlayer || 'this player'} — look something up and share the link or screenshot. Percilla judges what they find. One sentence.`;
      } else {
        cardInstruction = `Generate ONE dare for ${currentPlayer || 'this player'} — something they can do RIGHT NOW. Phone-based, social, or physical. If it involves sending a message Percilla will write it. Use other players' names for specificity. One sentence.`;
      }

      const prompt = `${cardInstruction}

Also write a SHORT intro you'd say right before revealing this card. Max 10 words. Dramatic, personal, builds tension.

Respond in this exact format:
CARD: [the card text]
INTRO: [your intro line]

Nothing else.`;

      result = await callClaude(system, prompt, 200);

      const cardMatch = result.match(/CARD:\s*(.+)/i);
      const introMatch = result.match(/INTRO:\s*(.+)/i);
      return res.json({
        card: cardMatch?.[1]?.trim() || null,
        intro: introMatch?.[1]?.trim() || null,
      });
    }

    if (action === 'react') {
      const { type, playerName, outcome } = params;
      const prompt = outcome === 'skip'
        ? `${playerName || 'They'} just SKIPPED their ${type}. React as Percilla. Disappointed, dramatic, calling them out. Max 2 sentences.`
        : `${playerName || 'They'} just completed their ${type}. React as Percilla. Excited, chaotic, stirring up the group. Max 2 sentences.`;
      result = await callClaude(system, prompt, 120);
      return res.json({ text: result });
    }

    if (action === 'judge_answer') {
      const { transcript, question, playerName } = params;
      const prompt = `${playerName || 'Someone'} just answered this truth out loud.

Question: "${question}"
Their answer: "${transcript}"

React as Percilla. Rate 1-10 for honesty and boldness. Call them out if lying. Reference other players or earlier events if it sharpens the roast. Max 3 sentences. Format: Rating: X/10 | [response]`;
      result = await callClaude(system, prompt, 220);
      return res.json({ text: result });
    }

    if (action === 'judge_photo') {
      const { imageBase64, dare, playerName } = params;
      const prompt = `${playerName || 'Someone'} submitted this photo for their dare.\n\nDare: "${dare}"\n\nReact as Percilla. Rate 1-10. Roast them. Reference game history. Max 3 sentences. Format: Rating: X/10 | [response]`;
      result = await callClaude(system, prompt, 220, imageBase64);
      return res.json({ text: result });
    }

    if (action === 'judge_url') {
      const { url, dare, playerName } = params;
      const prompt = `${playerName || 'Someone'} submitted this URL for their dare.\n\nDare: "${dare}"\nURL: ${url}\n\nJudge them on the URL text alone. What does it say about them? Rate 1-10. Make it personal. Format: Rating: X/10 | [response]`;
      result = await callClaude(system, prompt, 220);
      return res.json({ text: result });
    }

    if (action === 'retry_threat') {
      const { transcript, question, playerName, rating } = params;
      const prompt = `${playerName || 'Someone'} just answered a truth and got rated ${rating}/10. Answer was: "${transcript}"

That's a dodge. React as Percilla — call them out, mock the weak answer in one sentence, then demand they answer PROPERLY or take a dare that sounds worse than honesty.

Format exactly:
CALLOUT: [1 sentence roasting the dodge]
RETRY_PROMPT: [push to re-answer — 1 sentence, more pointed]
DARE_THREAT: [the dare if they refuse — make it sound bad]`;
      const raw = await callClaude(system, prompt, 250);
      const calloutMatch = raw.match(/CALLOUT:\s*(.+)/i);
      const retryMatch   = raw.match(/RETRY_PROMPT:\s*(.+)/i);
      const dareMatch    = raw.match(/DARE_THREAT:\s*(.+)/i);
      return res.json({
        callout:     calloutMatch?.[1]?.trim() || null,
        retryPrompt: retryMatch?.[1]?.trim() || null,
        dareThreat:  dareMatch?.[1]?.trim() || null,
      });
    }

    if (action === 'write_content') {
      const { dare, playerName, players } = params;
      const others = (players || []).filter(p => p !== playerName).join(', ');
      const prompt = `${playerName || 'The player'} got this dare: "${dare}"

Write ONLY the exact content they need — the message to send, thing to say, post to make. Nothing else. No labels. No explanation. Just the raw text to copy or read. Make it embarrassing. Max 2 sentences.
${others ? `Other players they could name-drop: ${others}` : ''}`;
      result = await callClaude(PERCILLA_CORE, prompt, 150);
      return res.json({ text: result });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('Percilla API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
