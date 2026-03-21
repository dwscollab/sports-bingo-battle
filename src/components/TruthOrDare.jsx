// src/components/TruthOrDare.jsx — Percilla's Truth or Dare

import { useState, useCallback, useRef } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#0a0a0b',
  surface: '#111113',
  card:    '#16161a',
  border:  '#222226',
  accent:  '#c84b6e',  // deep rose — not neon
  warm:    '#c8873a',  // warm amber
  text:    '#e8e8ec',
  sub:     '#888890',
  muted:   '#55555c',
};

// ── Server proxy — all AI calls go through /api/percilla ─────────────────────
async function percilla(action, params) {
  try {
    const res = await fetch('/api/percilla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...params }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Fire-and-forget — for background reactions we don't need to await
function percillaAsync(action, params, onResult) {
  percilla(action, params).then(r => onResult?.(r));
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.9; utt.pitch = 1.05; utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const pick = voices.find(v => /Samantha|Karen|Victoria|Moira|Fiona/i.test(v.name))
    || voices.find(v => v.lang.startsWith('en'));
  if (pick) utt.voice = pick;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

// ── Image compress ────────────────────────────────────────────────────────────
function compress(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(800 / img.width, 800 / img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.75).split(',')[1]);
    };
    img.onerror = reject; img.src = url;
  });
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const btn = (bg, color, extra = {}) => ({
  width: '100%', padding: '15px 20px', borderRadius: 10, border: 'none',
  cursor: 'pointer', fontWeight: 700, fontSize: 15, letterSpacing: '0.01em',
  background: bg, color, transition: 'opacity 0.15s', ...extra,
});
const ghostBtn = (color = T.sub) => ({
  width: '100%', padding: '13px 20px', borderRadius: 10,
  border: `1px solid ${T.border}`, background: 'transparent',
  cursor: 'pointer', color, fontSize: 14, letterSpacing: '0.01em',
});
const card = (extra = {}) => ({
  background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
  padding: '20px 22px', ...extra,
});
const label = (color = T.sub) => ({
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color, marginBottom: 8,
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function TruthOrDare({ onBack }) {
  const [phase,         setPhase]         = useState('menu');
  const [cardType,      setCardType]      = useState(null);
  const [dareSubtype,   setDareSubtype]   = useState(null);
  const [cardText,      setCardText]      = useState('');
  const [hostLine,      setHostLine]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [judging,       setJudging]       = useState(false);
  const [judgment,      setJudgment]      = useState('');
  const [reactionLine,  setReactionLine]  = useState('');
  const [submittedImg,  setSubmittedImg]  = useState(null);
  const [urlInput,      setUrlInput]      = useState('');
  const [followUp,      setFollowUp]      = useState('');
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [recording,     setRecording]     = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [players,       setPlayers]       = useState([]);
  const [playerInput,   setPlayerInput]   = useState('');
  const [playerIdx,     setPlayerIdx]     = useState(0);
  const [roundCount,    setRoundCount]    = useState(0);

  const [retryState,    setRetryState]    = useState(null); // { callout, retryPrompt, dareThreat }
  const [retryMode,     setRetryMode]     = useState(false); // re-answering after low score
  const gameLog        = useRef([]);
  const recognitionRef = useRef(null);
  const fileRef        = useRef(null);

  const currentPlayer = players[playerIdx] || '';
  const isTruth = cardType === 'truth';
  const isPhoto = dareSubtype === 'photo';
  const isURL   = dareSubtype === 'url';
  const cardColor = isTruth ? T.accent : T.warm;

  const addLog = (e) => { gameLog.current = [...gameLog.current, e].slice(-20); };

  // ── Draw card ─────────────────────────────────────────────────────────────────
  const drawCard = useCallback(async (type, sub = null) => {
    setCardType(type); setDareSubtype(sub); setLoading(true); setPhase('card');
    setHostLine(''); setJudgment(''); setTranscript(''); setRecording(false);
    setFollowUp(''); setSubmittedImg(null); setUrlInput('');

    const data = await percilla('card', {
      type, dareSubtype: sub, players, currentPlayer,
      gameLog: gameLog.current, roundCount,
    });

    const ct = data?.card || (type === 'truth'
      ? "What's the most embarrassing thing you've done for someone you were attracted to?"
      : "Text someone 'we need to talk' and don't respond for 5 minutes.");
    const intro = data?.intro || "I've been saving this one.";

    setCardText(ct); setHostLine(intro); setLoading(false);
    speak(`${intro}... ${ct}`);

    if (type === 'dare' && (!sub || sub === 'regular')) {
      if (/text|send|say|message|post|call|tell|write|voice/i.test(ct)) {
        setLoadingFollow(true);
        const fw = await percilla('write_content', { dare: ct, playerName: currentPlayer, players });
        if (fw?.text) setFollowUp(fw.text);
        setLoadingFollow(false);
      }
    }
  }, [players, currentPlayer, roundCount]);

  // ── Next turn — advance IMMEDIATELY, reaction loads async in background ─────
  const nextTurn = useCallback(async (skipped = false) => {
    window.speechSynthesis?.cancel();
    addLog(skipped
      ? `${currentPlayer || 'Player'} skipped their ${cardType}`
      : `${currentPlayer || 'Player'} completed ${isTruth ? 'truth' : 'dare'}: "${cardText.slice(0,60)}"`
    );

    // Advance turn immediately so next player sees their name right away
    const nextIdx = players.length > 0 ? (playerIdx + 1) % players.length : 0;
    if (players.length > 0) setPlayerIdx(nextIdx);
    setRoundCount(n => n + 1);
    setReactionLine(''); // clear while loading
    setPhase('picking'); // go straight to picking — no waiting

    // Load Percilla's reaction in the background, show it as a banner when ready
    percilla('react', {
      type: cardType, playerName: currentPlayer, outcome: skipped ? 'skip' : 'done',
      gameLog: gameLog.current, players, roundCount,
    }).then(r => {
      const line = r?.text || (skipped ? "Bold move. Noted." : "Now that's how you play.");
      setReactionLine(line);
      speak(line);
    });
  }, [cardType, cardText, currentPlayer, players, playerIdx, roundCount, isTruth]);

  // ── Speech ────────────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Try Chrome or Safari for speech recognition.'); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = e => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(' '));
    rec.onerror = () => setRecording(false);
    rec.onend   = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start(); setRecording(true); setTranscript('');
  }, []);

  const stopAndJudge = useCallback(async () => {
    recognitionRef.current?.stop(); setRecording(false);
    if (!transcript.trim()) return;
    addLog(`${currentPlayer || 'Player'} answered: "${transcript.slice(0, 80)}"`);
    setJudging(true);
    const r = await percilla('judge_answer', {
      transcript, question: cardText, playerName: currentPlayer,
      gameLog: gameLog.current, players,
    });
    const v = r?.text || "Processing...";
    setJudgment(v); setJudging(false);
    speak(v);

    // Check rating — if below 5, load a retry threat in background
    const ratingMatch = v.match(/Rating:\s*(\d+)/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 10;
    if (rating < 5) {
      percilla('retry_threat', {
        transcript, question: cardText, playerName: currentPlayer,
        rating, gameLog: gameLog.current, players,
      }).then(r2 => {
        if (r2?.callout) setRetryState(r2);
      });
    }
  }, [transcript, cardText, currentPlayer, players]);

  // ── Photo ─────────────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const b64 = await compress(file);
      setSubmittedImg(`data:image/jpeg;base64,${b64}`);
      addLog(`${currentPlayer || 'Player'} submitted photo`);
      setJudging(true);
      const r = await percilla('judge_photo', {
        imageBase64: b64, dare: cardText, playerName: currentPlayer,
        gameLog: gameLog.current, players,
      });
      const v = r?.text || "That's... something.";
      setJudgment(v); setJudging(false); speak(v);
    } catch { setJudgment("Couldn't load that image."); setJudging(false); }
  };

  // ── URL ───────────────────────────────────────────────────────────────────────
  const submitURL = async () => {
    if (!urlInput.trim()) return;
    addLog(`${currentPlayer || 'Player'} submitted URL`);
    setJudging(true);
    const r = await percilla('judge_url', {
      url: urlInput.trim(), dare: cardText, playerName: currentPlayer,
      gameLog: gameLog.current, players,
    });
    const v = r?.text || "That URL says a lot.";
    setJudgment(v); setJudging(false); speak(v);
  };

  const addPlayer = () => {
    const n = playerInput.trim();
    if (n && !players.includes(n)) { setPlayers(p => [...p, n]); setPlayerInput(''); }
  };

  const page = {
    minHeight: '100vh', background: T.bg, color: T.text,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 20px 60px', fontFamily: "'Georgia', serif",
  };

  // ── MENU ──────────────────────────────────────────────────────────────────────
  if (phase === 'menu') return (
    <div style={page}>
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 20, marginBottom: 40 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.muted,
          fontSize: 20, cursor: 'pointer', padding: 0,
        }}>←</button>
      </div>

      <div style={{ width: '100%', maxWidth: 480, marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em',
                      textTransform: 'uppercase', color: T.accent, marginBottom: 12 }}>
          Percilla's
        </div>
        <h1 style={{ fontSize: 'clamp(36px,9vw,56px)', fontWeight: 900, lineHeight: 1,
                     margin: '0 0 16px', color: T.text, letterSpacing: '-0.02em' }}>
          Truth or Dare
        </h1>
        <p style={{ color: T.sub, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Add everyone's names. The more Percilla knows, the more personal it gets.
        </p>
      </div>

      <div style={{ ...card(), width: '100%', maxWidth: 480, marginBottom: 16 }}>
        <div style={label()}>Who's here tonight</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={playerInput} onChange={e => setPlayerInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Add a name..."
            style={{
              flex: 1, background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '11px 14px', color: T.text, fontSize: 14, outline: 'none',
            }} />
          <button onClick={addPlayer} style={{
            background: T.accent, border: 'none', borderRadius: 8,
            padding: '0 18px', cursor: 'pointer', color: '#fff', fontWeight: 800, fontSize: 18,
          }}>+</button>
        </div>
        {players.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {players.map((p, i) => (
              <span key={i} style={{
                background: T.bg, borderRadius: 20, padding: '5px 12px 5px 14px',
                fontSize: 13, color: T.text, display: 'flex', alignItems: 'center', gap: 8,
                border: `1px solid ${T.border}`,
              }}>
                {p}
                <button onClick={() => setPlayers(ps => ps.filter((_,j)=>j!==i))} style={{
                  background: 'none', border: 'none', color: T.muted,
                  cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
                }}>×</button>
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: T.muted, fontSize: 13, margin: 0, fontStyle: 'italic' }}>
            No names yet — questions will be generic
          </p>
        )}
      </div>

      <button onClick={() => setPhase('picking')} style={{
        ...btn(`linear-gradient(135deg, ${T.accent}, ${T.warm})`, '#fff'),
        maxWidth: 480, padding: '18px 20px', fontSize: 16, letterSpacing: '0.02em',
      }}>
        Start
      </button>
    </div>
  );

  // ── PICKING / REACTION ────────────────────────────────────────────────────────
  if (phase === 'picking' || phase === 'reaction') return (
    <div style={{ ...page, justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Percilla's reaction — non-blocking banner at top, loads async */}
        {phase === 'picking' && reactionLine && (
          <div style={{
            ...card(), marginBottom: 24,
            display: 'flex', gap: 12, alignItems: 'flex-start',
            borderLeft: `3px solid ${T.accent}`,
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: T.accent, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>P</div>
            <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, fontStyle: 'italic' }}>
              "{reactionLine}"
            </div>
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          {roundCount > 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, letterSpacing: '0.1em',
                          textTransform: 'uppercase' }}>Round {roundCount}</div>
          )}
          {currentPlayer ? (
            <div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>It's</div>
              <div style={{ fontSize: 'clamp(36px,10vw,56px)', fontWeight: 900,
                            color: T.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {currentPlayer}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>your turn</div>
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>Choose</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          <button onClick={() => drawCard('truth')} style={btn(T.accent, '#fff')}>
            Truth
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[['regular','Dare'],['photo','Photo Dare'],['url','URL Dare']].map(([sub, label_]) => (
              <button key={sub} onClick={() => drawCard('dare', sub)} style={{
                padding: '14px 8px', borderRadius: 10,
                background: T.card, border: `1px solid ${T.border}`,
                cursor: 'pointer', color: T.warm,
                fontWeight: 700, fontSize: 13, letterSpacing: '0.01em',
              }}>{label_}</button>
            ))}
          </div>
        </div>

        <button onClick={onBack} style={{ ...ghostBtn(), marginTop: 8 }}>Back</button>
      </div>
    </div>
  );

  // ── CARD ──────────────────────────────────────────────────────────────────────
  if (phase === 'card') return (
    <div style={{ ...page, justifyContent: 'flex-start', paddingTop: 28 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Percilla intro line */}
        {hostLine && !loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: T.accent, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>P</div>
            <div style={{ fontSize: 14, color: T.sub, fontStyle: 'italic' }}>"{hostLine}"</div>
          </div>
        )}

        {/* Card */}
        <div style={{
          background: T.card, borderRadius: 16,
          border: `1px solid ${T.border}`,
          padding: '28px 26px', marginBottom: 20,
          borderLeft: `3px solid ${cardColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={label(cardColor)}>
              {isTruth ? 'Truth' : isPhoto ? 'Photo Dare' : isURL ? 'URL Dare' : 'Dare'}
              {currentPlayer && <span style={{ color: T.muted, fontWeight: 400, marginLeft: 8 }}>— {currentPlayer}</span>}
            </div>
          </div>

          {loading ? (
            <div>
              <div style={{ color: T.muted, fontSize: 13, marginBottom: 12 }}>Percilla is thinking...</div>
              <div style={{ height: 2, background: T.bg, borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '35%', background: cardColor, borderRadius: 1,
                              animation: 'slide 1.4s ease-in-out infinite' }} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 'clamp(16px,4vw,21px)', lineHeight: 1.7, color: T.text }}>
              {cardText}
            </div>
          )}

          {!loading && (
            <button onClick={() => speak(`${hostLine}... ${cardText}`)} style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
              padding: '5px 12px', cursor: 'pointer', color: T.muted,
              fontSize: 11, fontWeight: 600, marginTop: 16, letterSpacing: '0.05em',
            }}>
              Play again
            </button>
          )}
        </div>

        {/* Written follow-up for dares */}
        {!loading && !isTruth && !isPhoto && !isURL && (loadingFollow || followUp) && (
          <div style={{ ...card(), marginBottom: 16, borderLeft: `3px solid ${T.warm}` }}>
            <div style={label(T.warm)}>Percilla wrote this for you</div>
            {loadingFollow
              ? <div style={{ color: T.muted, fontSize: 13, fontStyle: 'italic' }}>Writing...</div>
              : (
                <>
                  <div style={{ fontSize: 15, color: T.text, lineHeight: 1.6,
                                padding: '12px 14px', background: T.bg,
                                borderRadius: 8, marginBottom: 10 }}>
                    {followUp}
                  </div>
                  <button onClick={() => speak(followUp)} style={{
                    background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                    padding: '5px 12px', cursor: 'pointer', color: T.muted, fontSize: 11, fontWeight: 600,
                  }}>Play</button>
                </>
              )
            }
          </div>
        )}

        {/* Speech for truths */}
        {!loading && isTruth && !judgment && (
          <div style={{ ...card(), marginBottom: 16 }}>
            <div style={label()}>
              {retryMode ? 'Try again — for real this time' : 'Answer out loud — Percilla will judge you'}
            </div>
            {retryMode && retryState?.retryPrompt && (
              <div style={{
                fontSize: 15, color: T.text, lineHeight: 1.6,
                padding: '12px 14px', background: T.bg, borderRadius: 8,
                marginBottom: 12, borderLeft: `2px solid ${T.accent}`,
              }}>
                {retryState.retryPrompt}
              </div>
            )}
            {!recording ? (
              <button onClick={startListening} style={btn(T.accent, '#fff')}>
                Start talking
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 14px', background: T.bg,
                              borderRadius: 8, marginBottom: 10, border: `1px solid ${T.border}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent,
                                 animation: 'pulse 1s infinite', flexShrink: 0 }} />
                  <span style={{ color: T.accent, fontSize: 13, fontWeight: 600 }}>Listening</span>
                </div>
                {transcript && (
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6,
                                padding: '10px 14px', background: T.bg,
                                borderRadius: 8, marginBottom: 10, fontStyle: 'italic' }}>
                    {transcript}
                  </div>
                )}
                <button onClick={stopAndJudge} style={btn(T.warm, '#111')}>
                  Done — judge me
                </button>
              </>
            )}
          </div>
        )}

        {/* Photo */}
        {!loading && isPhoto && !judgment && (
          <div style={{ ...card(), marginBottom: 16 }}>
            <div style={label()}>Take or upload a photo — Percilla will judge it</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { fileRef.current.setAttribute('capture','user'); fileRef.current.click(); }}
                style={{ ...btn(T.warm, '#111'), flex: 1 }}>Camera</button>
              <button onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.click(); }}
                style={{ ...ghostBtn(T.text), flex: 1 }}>Gallery</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        )}

        {/* URL */}
        {!loading && isURL && !judgment && (
          <div style={{ ...card(), marginBottom: 16 }}>
            <div style={label()}>Paste the URL — Percilla will judge it</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitURL()}
                placeholder="https://..."
                style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`,
                         borderRadius: 8, padding: '11px 14px', color: T.text, fontSize: 13, outline: 'none' }} />
              <button onClick={submitURL} disabled={!urlInput.trim()} style={{
                ...btn(T.accent, '#fff', { width: 'auto', padding: '0 18px', opacity: urlInput.trim() ? 1 : 0.4 }),
              }}>Judge</button>
            </div>
          </div>
        )}

        {/* Judging */}
        {judging && (
          <div style={{ ...card(), marginBottom: 16, textAlign: 'center' }}>
            <div style={{ color: T.muted, fontSize: 13 }}>Percilla is judging...</div>
          </div>
        )}

        {/* Photo preview */}
        {submittedImg && (
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16,
                        border: `1px solid ${T.border}` }}>
            <img src={submittedImg} alt="proof" style={{ width: '100%', maxHeight: 300,
                                                          objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Verdict */}
        {judgment && (
          <div style={{ ...card({ borderLeft: `3px solid ${T.warm}` }), marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: T.accent, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>P</div>
              <div style={{ flex: 1 }}>
                <div style={label(T.warm)}>Percilla's verdict</div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7 }}>{judgment}</div>
                <button onClick={() => speak(judgment)} style={{
                  background: 'none', border: `1px solid ${T.border}`, borderRadius: 6,
                  padding: '5px 12px', cursor: 'pointer', color: T.muted,
                  fontSize: 11, fontWeight: 600, marginTop: 10,
                }}>Play</button>
              </div>
            </div>
          </div>
        )}

        {/* Retry threat — appears after a low rating */}
        {retryState && !retryMode && (
          <div style={{
            ...card({ borderLeft: `3px solid ${T.accent}` }),
            marginBottom: 16, animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: T.accent, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>P</div>
              <div>
                <div style={label(T.accent)}>Percilla's not done</div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.7, marginBottom: 6 }}>
                  {retryState.callout}
                </div>
                <div style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>
                  "{retryState.retryPrompt}"
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setRetryMode(true);
                  setTranscript('');
                  setJudgment('');
                  speak(retryState.retryPrompt);
                }}
                style={{ ...btn(T.accent, '#fff'), flex: 2 }}
              >
                Answer for real
              </button>
              <button
                onClick={() => {
                  // Take the dare threat instead
                  setRetryState(null);
                  setRetryMode(false);
                  addLog(`${currentPlayer || 'Player'} refused to re-answer — escalated to dare: "${retryState.dareThreat?.slice(0,50)}"`);
                  // Show dare threat as the new card
                  setCardType('dare');
                  setDareSubtype('regular');
                  setCardText(retryState.dareThreat || 'Do something embarrassing instead.');
                  setHostLine("Fine. You asked for it.");
                  setJudgment('');
                  speak(`Fine. You asked for it. ${retryState.dareThreat}`);
                }}
                style={{ ...ghostBtn(T.warm), flex: 1, border: `1px solid ${T.warm}44` }}
              >
                Take the dare
              </button>
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 8, fontStyle: 'italic' }}>
              {retryState.dareThreat}
            </div>
          </div>
        )}

        {/* Actions */}
        {!loading && !recording && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(isPhoto || isURL) && !judgment && (
              <button onClick={() => nextTurn(false)} style={ghostBtn()}>
                Mark done without submitting
              </button>
            )}
            {((!isPhoto && !isURL) || judgment) && (
              <button onClick={() => nextTurn(false)} style={{
                ...btn(isTruth && !judgment ? T.card : `linear-gradient(135deg,${cardColor},${cardColor}cc)`,
                       isTruth && !judgment ? T.sub : '#fff'),
                border: isTruth && !judgment ? `1px solid ${T.border}` : 'none',
              }}>
                {isTruth ? (judgment ? 'Next round' : 'Answered without mic') : 'Done'}
              </button>
            )}
            <button onClick={() => nextTurn(true)} style={ghostBtn(T.muted)}>
              Skip
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide { 0%{margin-left:-35%} 100%{margin-left:135%} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );

  return null;
}
