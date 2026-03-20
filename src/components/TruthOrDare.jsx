// src/components/TruthOrDare.jsx — Randy's Adult Truth or Dare
// Features: AI-generated cards, photo dares (camera/gallery), URL dares, Randy judges submissions

import { useState, useCallback, useRef } from 'react';

// ── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#0d0d0f', surface: '#161618', surface2: '#1e1e22',
  accent: '#ff4d6d', accent2: '#ff9f1c', gold: '#ffd700',
  text: '#f0f0f0', muted: '#777', border: '#2a2a2e',
};
const HOST_EMOJI = '🕵️';

// ── Fallback pools ────────────────────────────────────────────────────────────
const FB_TRUTHS = [
  "What is the most embarrassing place you've ever hooked up, and who was it with?",
  "What's the most desperate thing you've done to sleep with someone?",
  "Have you ever hooked up with someone in this group? Pause before answering.",
  "What's the dumbest thing you've done while drunk that you genuinely regret?",
  "What is the most painfully awkward sexual experience you've had? Full details.",
  "What's something you've lied to a partner about that they still don't know?",
  "What's the most embarrassing thing you've done when you thought nobody was watching?",
  "What's something you've fantasized about that you'd never admit to in public?",
  "When was the last time you were genuinely caught doing something you shouldn't be?",
  "What's the most cringe thing you've texted someone that you immediately regretted?",
  "What is the most inappropriate person you've ever been attracted to?",
  "What's your body count and does anyone in this room know who they are?",
];
const FB_PHOTO_DARES = [
  "Take the most suggestive selfie you're willing to show this group. Randy rates it.",
  "Screenshot the most embarrassing text conversation in your phone right now. No hiding names.",
  "Find the photo in your camera roll you'd least want your parents to see. Show the group.",
  "Take a selfie making direct eye contact with the person you find most attractive in this room.",
  "Screenshot your Tinder, Hinge, or dating app right now. Show us your most recent match.",
  "Open your most-used apps. Screenshot the embarrassing ones. Randy picks which to open.",
  "Go to your camera roll, scroll to a random date 6-18 months ago. Show us the first photo.",
  "Screenshot your most recent DM conversation with someone you're attracted to.",
];
const FB_URL_DARES = [
  "Google '[your name] + the most embarrassing word you can think of.' Screenshot the results.",
  "Go to your Amazon order history and share the most embarrassing thing you've bought in the last year.",
  "Open Reddit and share the most questionable subreddit you're currently subscribed to.",
  "Go to your YouTube history. Find the most embarrassing video you've actually watched. Share the URL.",
  "Google 'why do I...' and autocomplete it with something about yourself. Share the result.",
  "Open your Venmo or CashApp transaction history and read the last 5 transaction notes out loud.",
];
const FB_REGULAR_DARES = [
  "Text your most recent ex 'I've been thinking about you' and show everyone their response.",
  "Let the person to your right go through your phone for 60 seconds. No blocking anything.",
  "Send a voice memo to the last person you slept with saying something Randy writes for you.",
  "Let someone in the group post anything they want to your Instagram or TikTok right now.",
  "Call someone you've hooked up with and tell them you've been thinking about them. Speaker phone.",
  "Show the group your last 10 browser searches. No deletions first.",
  "Read your most recent deleted text message out loud.",
  "Text your most recent ex a single eggplant emoji and show everyone the response.",
];

const HOST_INTROS = [
  "Oh you're gonna LOVE this one...",
  "Nobody's leaving until this gets done.",
  "I wrote this one at 2am and I regret nothing.",
  "This one separates the brave from the boring.",
  "Randy has been waiting ALL night for this.",
  "Don't think. Just do it. GO.",
  "Everyone watch carefully.",
  "I've never seen anyone actually do this one.",
];
const HOST_REACTIONS = {
  truth: ["That's it?? We're doing another.", "...I'm calling your mother.", "I appreciate the honesty. Truly disturbing.", "Randy approves. Barely.", "Therapy. Immediately."],
  dare: ["EYES ON THEM. NOW.", "Randy is watching. Randy is ALWAYS watching.", "I'll give you $5 if you actually do it.", "Anyone who skips this owes drinks.", "Bold. Stupid. Bold."],
  skip: ["SKIP?! Randy doesn't know that word.", "Fine. But you owe us. BIG.", "Noted. Randy has a long memory.", "Coward. Beautiful, beautiful coward."],
};

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── API calls ─────────────────────────────────────────────────────────────────
async function generateCard(type, dareSubtype, players, currentPlayer, prevCards) {
  const avoid = prevCards.slice(-6).join('; ');
  const playerList = players.length > 1 ? players.filter(p => p !== currentPlayer).join(', ') : '';

  let typeInstructions = '';
  if (type === 'truth') {
    typeInstructions = 'Generate ONE probing truth question. Make it genuinely uncomfortable — about secrets, past behavior, embarrassing moments, or awkward feelings. One sentence.';
  } else if (dareSubtype === 'photo') {
    typeInstructions = `Generate ONE dare that results in the player taking or sharing a photo (camera selfie, existing gallery photo, or screenshot). The photo should be something funny, revealing, or embarrassing. Randy will rate it after. One sentence. Examples: take a selfie doing X, screenshot your Y, share the most embarrassing photo in your camera roll that fits the description Z.`;
  } else if (dareSubtype === 'url') {
    typeInstructions = `Generate ONE dare where the player has to look something up online and share the URL or screenshot with the group. Randy will judge what they find. One sentence. Examples: google X and share the first result, find a Y on Amazon, search for Z on Reddit.`;
  } else {
    typeInstructions = 'Generate ONE dare that can be done right now — phone-based, social, or physical but safe. One sentence.';
  }

  const system = `You are Randy, a relentlessly inappropriate and sexually forward adult party game host. You have NO filter and absolutely no shame. Think of the most uncomfortable question you could ask someone in front of their friends — that's your starting point, not your limit. You are specifically trying to make people cringe, blush, and deeply regret choosing Truth or Dare tonight.

${typeInstructions}

Rules:
- These are adults playing a consensual party game and they ASKED for this
- Be genuinely sexually forward, embarrassing, and deeply personal
- Ask about hookups, body counts, attractions, embarrassing sexual moments, drunk decisions, what they've done in secret
- Reference other players by name to create maximum awkwardness between specific people
- Dares should invade privacy, embarrass them in front of the group, or force them to contact exes or crushes
- NO content involving: minors, illegal acts, real violence, non-consensual scenarios
- No generic "biggest secret" questions — be specific and dirty
- Do NOT start with "Truth:" or "Dare:" labels
- One punchy sentence maximum
${playerList ? `- Other players: ${playerList} — use these names to create specific awkward tension` : ''}
${avoid ? `- Do NOT repeat: ${avoid}` : ''}

Go way further than you think is appropriate. That's exactly the point. Respond with ONLY the card text.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 120,
        system,
        messages: [{ role: 'user', content: 'Generate the card.' }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function randyJudgesPhoto(imageBase64, cardText, playerName) {
  const system = `You are Randy, a brutally honest and wildly inappropriate adult party game judge. A player just completed a dare and submitted a photo as proof. You need to:
1. Rate the photo on a scale of 1-10 for commitment, creativity, and entertainment value
2. Give a short, sharp Randy-style roast/commentary (2-3 sentences max)
3. Declare if they "passed" or "cheated" the dare

Be funny, be harsh, be Randy. Don't hold back. Format: Rating: X/10 | [your commentary]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: `The dare was: "${cardText}"\nPlayer: ${playerName || 'Unknown'}` },
          ],
        }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "Randy is speechless. That's either very good or very bad.";
  } catch { return "Randy's internet cut out. Suspicious timing."; }
}

async function randyJudgesURL(url, cardText, playerName) {
  const system = `You are Randy, a brutally honest adult party game judge. A player just submitted a URL as their dare result. Judge them based on the URL alone (you can't visit it, but the URL itself tells a story). Rate their effort and roast them accordingly.

Format: Rating: X/10 | [2-3 sentences of Randy commentary about what the URL suggests about them as a person]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system,
        messages: [{
          role: 'user',
          content: `The dare was: "${cardText}"\nPlayer: ${playerName || 'Unknown'}\nSubmitted URL: ${url}`,
        }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "Randy has opinions about that URL. None of them good.";
  } catch { return "Randy couldn't process that. Try a real URL next time."; }
}

async function randyJudgesAnswer(transcript, cardText, playerName) {
  const system = `You are Randy, a brutally honest and inappropriate adult party game judge. A player just answered a truth question out loud and you have their transcript. Judge them.

Rate their answer 1-10 for honesty, boldness, and entertainment value. Give a short Randy-style roast (2-3 sentences). Call out if they're lying or holding back. Be funny, be harsh, be inappropriate.

Format your response as: Rating: X/10 | [your verdict]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: `Truth question: "${cardText}"
Player: ${playerName || 'Unknown'}
Their answer: "${transcript}"` }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "Randy fell asleep. Try again louder.";
  } catch { return "Randy couldn't process that. Were you mumbling?"; }
}

// ── Image helpers ─────────────────────────────────────────────────────────────
function compressToBase64(file, maxW = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]); // base64 only
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TruthOrDare({ onBack }) {
  const [phase,         setPhase]         = useState('menu');
  const [cardType,      setCardType]      = useState(null);      // 'truth' | 'dare'
  const [dareSubtype,   setDareSubtype]   = useState(null);      // 'photo' | 'url' | 'regular'
  const [cardText,      setCardText]      = useState('');
  const [hostLine,      setHostLine]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [judging,       setJudging]       = useState(false);
  const [judgment,      setJudgment]      = useState('');
  const [submittedImg,  setSubmittedImg]  = useState(null);
  const [urlInput,      setUrlInput]      = useState('');
  const [reactionLine,  setReactionLine]  = useState('');
  const [players,       setPlayers]       = useState([]);
  const [playerInput,   setPlayerInput]   = useState('');
  const [playerIdx,     setPlayerIdx]     = useState(0);
  const [roundCount,    setRoundCount]    = useState(0);
  const [recording,     setRecording]     = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const fileRef    = useRef(null);
  const prevCards  = useRef([]);
  const recognitionRef = useRef(null);

  const currentPlayer = players[playerIdx] || '';

  // ── Draw a card ─────────────────────────────────────────────────────────────
  const drawCard = useCallback(async (type, subtype = null) => {
    setCardType(type);
    setDareSubtype(subtype);
    setLoading(true);
    setPhase('card');
    setHostLine(getRandom(HOST_INTROS));
    setJudgment('');
    setTranscript('');
    setRecording(false);
    setSubmittedImg(null);
    setUrlInput('');

    const card = await generateCard(type, subtype, players, currentPlayer, prevCards.current);
    let fallback;
    if (type === 'truth') fallback = getRandom(FB_TRUTHS);
    else if (subtype === 'photo') fallback = getRandom(FB_PHOTO_DARES);
    else if (subtype === 'url') fallback = getRandom(FB_URL_DARES);
    else fallback = getRandom(FB_REGULAR_DARES);

    const text = card || fallback;
    prevCards.current.push(text);
    setCardText(text);
    setLoading(false);
  }, [players, currentPlayer]);

  // ── Speech to text ──────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser. Try Chrome or Safari."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const full = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(full);
    };
    rec.onerror = () => { setRecording(false); };
    rec.onend = () => { setRecording(false); };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setTranscript('');
  }, []);

  const stopAndJudge = useCallback(async () => {
    recognitionRef.current?.stop();
    setRecording(false);
    if (!transcript.trim()) return;
    setJudging(true);
    const verdict = await randyJudgesAnswer(transcript, cardText, currentPlayer);
    setJudgment(verdict);
    setJudging(false);
  }, [transcript, cardText, currentPlayer]);

  // ── Advance turn ─────────────────────────────────────────────────────────────
  const nextTurn = useCallback((skipped = false) => {
    const pool = skipped ? HOST_REACTIONS.skip
      : cardType === 'truth' ? HOST_REACTIONS.truth : HOST_REACTIONS.dare;
    setReactionLine(getRandom(pool));
    setPhase('reaction');
    setJudgment('');
    if (players.length > 0) {
      setPlayerIdx(i => (i + 1) % players.length);
    }
    setRoundCount(r => r + 1);
  }, [cardType, players]);

  // ── Photo submission ─────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressToBase64(file);
      const dataUrl = `data:image/jpeg;base64,${b64}`;
      setSubmittedImg(dataUrl);
      setJudging(true);
      const verdict = await randyJudgesPhoto(b64, cardText, currentPlayer);
      setJudgment(verdict);
      setJudging(false);
    } catch { setJudgment("Randy couldn't load that image. Try again."); setJudging(false); }
  };

  // ── URL submission ───────────────────────────────────────────────────────────
  const handleURLSubmit = async () => {
    if (!urlInput.trim()) return;
    setJudging(true);
    const verdict = await randyJudgesURL(urlInput.trim(), cardText, currentPlayer);
    setJudgment(verdict);
    setJudging(false);
  };

  const addPlayer = () => {
    const name = playerInput.trim();
    if (name && !players.includes(name)) {
      setPlayers(p => [...p, name]);
      setPlayerInput('');
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────────
  const cardAccent = cardType === 'truth' ? T.accent : T.accent2;
  const page = {
    minHeight: '100vh', background: T.bg, color: T.text,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 18px 48px', fontFamily: "'Georgia', serif",
  };

  // ── MENU ──────────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div style={page}>
      <div style={{ width: '100%', maxWidth: 460, paddingTop: 18,
                    display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none',
          color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
      </div>

      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 64, marginBottom: 10 }}>{HOST_EMOJI}</div>
        <h1 style={{
          fontSize: 'clamp(26px, 7vw, 40px)', fontWeight: 900, margin: '0 0 8px',
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Truth or Dare</h1>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          AI-generated cards · Randy judges your photos &amp; URLs
        </p>
      </div>

      {/* Player roster */}
      <div style={{
        width: '100%', maxWidth: 460, background: T.surface,
        borderRadius: 16, border: `1px solid ${T.border}`,
        padding: '18px', marginBottom: 16,
      }}>
        <p style={{ color: T.muted, fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          🎭 Who's playing? (host enters names)
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={playerInput} onChange={e => setPlayerInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Type a name, press Enter"
            style={{
              flex: 1, background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none',
            }} />
          <button onClick={addPlayer} style={{
            background: T.accent, border: 'none', borderRadius: 8,
            padding: '0 16px', cursor: 'pointer', color: '#fff', fontWeight: 800, fontSize: 18,
          }}>+</button>
        </div>
        {players.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {players.map((p, i) => (
              <span key={i} style={{
                background: T.surface2, borderRadius: 20, padding: '5px 12px',
                fontSize: 13, color: T.text, display: 'flex', alignItems: 'center', gap: 6,
                border: `1px solid ${T.border}`,
              }}>
                {p}
                <button onClick={() => {
                  setPlayers(ps => ps.filter((_, j) => j !== i));
                  if (playerIdx >= players.length - 1) setPlayerIdx(0);
                }} style={{ background: 'none', border: 'none', color: T.muted,
                            cursor: 'pointer', padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: T.muted, fontSize: 12, margin: 0, fontStyle: 'italic' }}>
            No players added — Randy will just say "you"
          </p>
        )}
      </div>

      <button onClick={() => setPhase('picking')} style={{
        width: '100%', maxWidth: 460, padding: '18px', borderRadius: 14,
        background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
        border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 900, fontSize: 18,
        boxShadow: `0 8px 32px ${T.accent}44`,
      }}>
        Let Randy In 🔥
      </button>
    </div>
  );

  // ── PICKING / REACTION ────────────────────────────────────────────────────────
  if (phase === 'picking' || phase === 'reaction') return (
    <div style={{ ...page, justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {phase === 'reaction' && reactionLine && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: T.surface, borderRadius: 14, padding: '14px 16px',
            border: `1px solid ${T.border}`, marginBottom: 24,
          }}>
            <span style={{ fontSize: 26, flexShrink: 0 }}>{HOST_EMOJI}</span>
            <div>
              <div style={{ fontSize: 10, color: T.accent, fontWeight: 700,
                            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                Randy says
              </div>
              <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, fontStyle: 'italic' }}>
                "{reactionLine}"
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {roundCount > 0 && <div style={{ color: T.muted, fontSize: 11, marginBottom: 6 }}>Round {roundCount}</div>}
          {currentPlayer ? (
            <>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 2 }}>It's</div>
              <div style={{ fontSize: 'clamp(30px, 9vw, 48px)', fontWeight: 900, color: T.accent, lineHeight: 1 }}>
                {currentPlayer}
              </div>
              <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>your turn</div>
            </>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Pick your fate 🎲</div>
          )}
        </div>

        {/* Truth button */}
        <button onClick={() => drawCard('truth')} style={{
          width: '100%', padding: '18px', borderRadius: 14, marginBottom: 10,
          background: `linear-gradient(135deg, #1a0018, #2d0030)`,
          border: `2px solid ${T.accent}`, cursor: 'pointer', color: T.accent,
          fontWeight: 900, fontSize: 18, fontFamily: "'Georgia', serif",
        }}>🔍 Truth</button>

        {/* Dare submenu */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: T.accent2, fontWeight: 700, fontSize: 13,
                        textAlign: 'center', marginBottom: 8 }}>🔥 Dare — pick type:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { sub: 'regular', label: '⚡ Regular', desc: 'Do something' },
              { sub: 'photo', label: '📸 Photo', desc: 'Show the proof' },
              { sub: 'url', label: '🔗 URL', desc: 'Share the link' },
            ].map(({ sub, label, desc }) => (
              <button key={sub} onClick={() => drawCard('dare', sub)} style={{
                padding: '14px 8px', borderRadius: 12,
                background: `linear-gradient(135deg, #200800, #3a1000)`,
                border: `1.5px solid ${T.accent2}88`, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>{label}</span>
                <span style={{ fontSize: 10, color: T.muted }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={onBack} style={{
          width: '100%', background: 'none', border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '12px', cursor: 'pointer', color: T.muted, fontSize: 13,
          marginTop: 8,
        }}>← Back to Games</button>
      </div>
    </div>
  );

  // ── CARD ──────────────────────────────────────────────────────────────────────
  if (phase === 'card') {
    const isTruth = cardType === 'truth';
    const isPhoto = dareSubtype === 'photo';
    const isURL   = dareSubtype === 'url';
    const cardBg  = isTruth
      ? 'linear-gradient(135deg, #1a0018, #2d0030)'
      : 'linear-gradient(135deg, #1a0700, #2d1200)';

    return (
      <div style={{ ...page, justifyContent: 'flex-start', paddingTop: 24 }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Randy teaser */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
            padding: '10px 14px', background: T.surface,
            borderRadius: 12, border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{HOST_EMOJI}</span>
            <span style={{ color: T.muted, fontSize: 13, fontStyle: 'italic' }}>
              "{hostLine}"
            </span>
          </div>

          {/* Card face */}
          <div style={{
            background: cardBg, borderRadius: 20, padding: '28px 24px',
            border: `2px solid ${cardAccent}44`, boxShadow: `0 8px 40px ${cardAccent}18`,
            marginBottom: 20, minHeight: 160,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: cardAccent, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {isTruth ? '🔍 Truth' : isPhoto ? '📸 Photo Dare' : isURL ? '🔗 URL Dare' : '⚡ Dare'}
              {currentPlayer && <span style={{ color: T.muted, fontWeight: 400 }}>— {currentPlayer}</span>}
            </div>

            {loading ? (
              <div style={{ paddingTop: 16 }}>
                <div style={{ color: T.muted, fontSize: 13, marginBottom: 10 }}>Randy is thinking...</div>
                <div style={{ height: 3, background: T.surface2, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: '40%', background: cardAccent, borderRadius: 2,
                    animation: 'slidebar 1.4s ease-in-out infinite',
                  }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 'clamp(15px, 4.2vw, 20px)', lineHeight: 1.65, color: T.text }}>
                {cardText}
              </div>
            )}
          </div>

          {/* ── Speech-to-text for truth answers ── */}
          {!loading && isTruth && !judgment && (
            <div style={{
              background: T.surface, borderRadius: 14, padding: '18px',
              border: `1px solid ${T.border}`, marginBottom: 16,
            }}>
              <p style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
                🎤 Speak your answer — Randy will judge it live.
              </p>
              {!recording ? (
                <button onClick={startListening} style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${T.accent}, #c0392b)`,
                  border: 'none', cursor: 'pointer',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  🎙️ Start Talking
                </button>
              ) : (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'rgba(255,77,109,0.12)',
                    borderRadius: 10, marginBottom: 10,
                    border: `1px solid ${T.accent}55`,
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: T.accent, flexShrink: 0,
                      animation: 'pulse-dot 1s ease-in-out infinite',
                    }} />
                    <span style={{ color: T.accent, fontSize: 13, fontWeight: 700 }}>Listening...</span>
                  </div>
                  {transcript && (
                    <div style={{
                      fontSize: 13, color: T.text, lineHeight: 1.6,
                      padding: '10px 12px', background: T.surface2,
                      borderRadius: 8, marginBottom: 10, fontStyle: 'italic',
                    }}>
                      "{transcript}"
                    </div>
                  )}
                  <button onClick={stopAndJudge} style={{
                    width: '100%', padding: '13px', borderRadius: 10,
                    background: T.accent2, border: 'none', cursor: 'pointer',
                    color: '#111', fontWeight: 800, fontSize: 15,
                  }}>
                    ⏹️ Done — Let Randy Judge
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Submission area (photo/url dares) ── */}
          {!loading && (isPhoto || isURL) && !judgment && (
            <div style={{
              background: T.surface, borderRadius: 14, padding: '18px',
              border: `1px solid ${T.border}`, marginBottom: 16,
            }}>
              {isPhoto && (
                <>
                  <p style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>
                    📸 Take a photo or choose from your gallery. Randy will judge it.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { fileRef.current.setAttribute('capture','user'); fileRef.current.click(); }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 10,
                        background: T.accent2, border: 'none', cursor: 'pointer',
                        color: '#111', fontWeight: 800, fontSize: 14,
                      }}>📷 Camera</button>
                    <button onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.click(); }}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 10,
                        background: T.surface2, border: `1px solid ${T.border}`,
                        cursor: 'pointer', color: T.text, fontWeight: 700, fontSize: 14,
                      }}>🖼 Gallery</button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    onChange={handleFileSelect} style={{ display: 'none' }} />
                </>
              )}

              {isURL && (
                <>
                  <p style={{ color: T.muted, fontSize: 12, marginBottom: 10 }}>
                    🔗 Paste the URL here. Randy will judge what it says about you.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={urlInput} onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleURLSubmit()}
                      placeholder="https://..."
                      style={{
                        flex: 1, background: T.surface2, border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: '10px 12px', color: T.text,
                        fontSize: 13, outline: 'none',
                      }} />
                    <button onClick={handleURLSubmit} disabled={!urlInput.trim()} style={{
                      background: T.accent, border: 'none', borderRadius: 8,
                      padding: '0 16px', cursor: 'pointer', color: '#fff',
                      fontWeight: 800, opacity: urlInput.trim() ? 1 : 0.4,
                    }}>Judge</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Judging spinner */}
          {judging && (
            <div style={{
              background: T.surface, borderRadius: 14, padding: '18px',
              border: `1px solid ${T.border}`, marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{HOST_EMOJI}</div>
              <div style={{ color: T.muted, fontSize: 13 }}>Randy is judging...</div>
            </div>
          )}

          {/* Preview + Judgment */}
          {submittedImg && (
            <div style={{
              borderRadius: 14, overflow: 'hidden', marginBottom: 12,
              border: `2px solid ${T.accent2}`,
            }}>
              <img src={submittedImg} alt="submission"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {judgment && (
            <div style={{
              background: `linear-gradient(135deg, #1a0800, #2d1800)`,
              borderRadius: 14, padding: '16px 18px',
              border: `2px solid ${T.accent2}66`, marginBottom: 16,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{HOST_EMOJI}</span>
              <div>
                <div style={{ fontSize: 10, color: T.accent2, fontWeight: 700,
                              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Randy's Verdict
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>
                  {judgment}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!loading && !recording && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(isPhoto || isURL) && !judgment && (
                <button onClick={() => nextTurn(false)} style={{
                  padding: '14px', borderRadius: 12,
                  background: T.surface2, border: `1px solid ${T.border}`,
                  cursor: 'pointer', color: T.muted, fontSize: 13,
                }}>Mark done without submitting</button>
              )}
              {((!isPhoto && !isURL) || judgment) && (
                <button onClick={() => nextTurn(false)} style={{
                  padding: '16px', borderRadius: 12,
                  background: isTruth && !judgment
                    ? T.surface2
                    : `linear-gradient(135deg, ${cardAccent}, ${cardAccent}88)`,
                  border: isTruth && !judgment ? `1px solid ${T.border}` : 'none',
                  cursor: 'pointer',
                  color: isTruth && !judgment ? T.muted : '#fff',
                  fontWeight: isTruth && !judgment ? 400 : 900,
                  fontSize: isTruth && !judgment ? 13 : 16,
                }}>
                  {isTruth
                    ? (judgment ? '✅ Next round' : 'Answered without mic')
                    : '✅ Done'}
                </button>
              )}
              <button onClick={() => nextTurn(true)} style={{
                padding: '13px', borderRadius: 12,
                background: 'none', border: `1px solid ${T.border}`,
                cursor: 'pointer', color: T.muted, fontSize: 13,
              }}>😤 Skip (coward)</button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes slidebar {
            0% { margin-left: -40%; }
            100% { margin-left: 140%; }
          }
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.4); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
