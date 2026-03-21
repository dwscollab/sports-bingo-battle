// src/components/TruthOrDare.jsx
// Multiplayer Truth or Dare — Firebase rooms, join by code, voice toggle

import { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, set, onValue, off, update, push, get } from 'firebase/database';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#0a0a0b', surface: '#111113', card: '#16161a', border: '#222226',
  accent: '#c84b6e', warm: '#c8873a', text: '#e8e8ec', sub: '#888890', muted: '#55555c',
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const btn  = (bg, color, x={}) => ({ width:'100%', padding:'15px 20px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:15, background:bg, color, ...x });
const ghost = (color=T.sub) => ({ width:'100%', padding:'13px 20px', borderRadius:10, border:`1px solid ${T.border}`, background:'transparent', cursor:'pointer', color, fontSize:14 });
const card  = (x={}) => ({ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:'20px 22px', ...x });
const lbl   = (color=T.sub) => ({ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color, marginBottom:8 });

// ── Stable player ID (localStorage) ──────────────────────────────────────────
function getPlayerId() {
  let id = localStorage.getItem('tod_player_id');
  if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('tod_player_id', id); }
  return id;
}
const MY_ID = getPlayerId();

// ── TTS ───────────────────────────────────────────────────────────────────────
let ttsQueue = Promise.resolve();
function speak(text, voiceOn) {
  if (!voiceOn || !text?.trim()) return;
  ttsQueue = ttsQueue.then(() => _speak(text)).catch(() => {});
}
async function _speak(text) {
  try {
    const res = await fetch('/api/tts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text, voice:'nova' }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const { audio } = await res.json();
      const el = new Audio(`data:audio/mp3;base64,${audio}`);
      await new Promise((resolve) => { el.onended = resolve; el.onerror = resolve; el.play().catch(resolve); });
      return;
    }
  } catch {}
  await new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate=0.9; utt.pitch=1.05;
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v=>/Samantha|Karen|Victoria|Moira|Fiona/i.test(v.name)) || voices.find(v=>v.lang.startsWith('en'));
    if (pick) utt.voice = pick;
    utt.onend = resolve;
    window.speechSynthesis.speak(utt);
  });
}

// ── Image compress ────────────────────────────────────────────────────────────
function compress(file) {
  return new Promise((resolve,reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(800/img.width, 800/img.height, 1);
      const c = document.createElement('canvas');
      c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',0.75).split(',')[1]);
    };
    img.onerror=reject; img.src=url;
  });
}

// ── Percilla API ──────────────────────────────────────────────────────────────
async function percilla(action, params) {
  try {
    const res = await fetch('/api/percilla', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action, ...params }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TruthOrDare({ onBack }) {
  // ── Local UI state ─────────────────────────────────────────────────────────
  const [screen,        setScreen]        = useState('home');   // home|create|join|lobby|game
  const [voiceOn,       setVoiceOn]       = useState(true);
  const [nameInput,     setNameInput]     = useState('');
  const [codeInput,     setCodeInput]     = useState('');
  const [roomCode,      setRoomCode]      = useState('');
  const [roomData,      setRoomData]      = useState(null);
  const [myName,        setMyName]        = useState('');
  const [isHost,        setIsHost]        = useState(false);
  const [loadingAction, setLoadingAction] = useState('');

  // Card / game local state (host drives, everyone reads from Firebase)
  const [cardType,      setCardType]      = useState(null);
  const [dareSubtype,   setDareSubtype]   = useState(null);
  const [cardText,      setCardText]      = useState('');
  const [hostLine,      setHostLine]      = useState('');
  const [judgment,      setJudgment]      = useState('');
  const [reactionLine,  setReactionLine]  = useState('');
  const [followUp,      setFollowUp]      = useState('');
  const [retryState,    setRetryState]    = useState(null);
  const [submittedImg,  setSubmittedImg]  = useState(null);
  const [urlInput,      setUrlInput]      = useState('');
  const [recording,     setRecording]     = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [textAnswer,    setTextAnswer]    = useState('');
  const [judging,       setJudging]       = useState(false);
  const [retryMode,     setRetryMode]     = useState(false);

  const gameLog        = useRef([]);
  const recognitionRef = useRef(null);
  const fileRef        = useRef(null);

  // ── Firebase subscribe ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    const r = ref(db, `tod_rooms/${roomCode}`);
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (data) setRoomData(data);
    });
    return () => off(r, 'value', unsub);
  }, [roomCode]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const players      = roomData?.players ? Object.values(roomData.players) : [];
  const playerList   = players.map(p => p.name);
  const currentIdx   = roomData?.currentIdx ?? 0;
  const currentPlayer= players[currentIdx]?.name || '';
  const isMyTurn     = players[currentIdx]?.id === MY_ID;
  const isTruth      = cardType === 'truth';
  const isPhoto      = dareSubtype === 'photo';
  const isURL        = dareSubtype === 'url';
  const cardAccent   = isTruth ? T.accent : T.warm;
  const gamePhase    = roomData?.phase || 'lobby';

  const addLog = (e) => { gameLog.current = [...gameLog.current, e].slice(-20); };

  // ── Create room ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!nameInput.trim()) return;
    const code = Math.random().toString(36).substring(2,6).toUpperCase();
    await set(ref(db, `tod_rooms/${code}`), {
      hostId: MY_ID,
      phase: 'lobby',
      currentIdx: 0,
      roundCount: 0,
      players: { [MY_ID]: { id: MY_ID, name: nameInput.trim(), isHost: true } },
    });
    setMyName(nameInput.trim());
    setRoomCode(code);
    setIsHost(true);
    setScreen('lobby');
  };

  // ── Join room ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!nameInput.trim() || !codeInput.trim()) return;
    const code = codeInput.trim().toUpperCase();
    const snap = await get(ref(db, `tod_rooms/${code}`));
    if (!snap.exists()) { alert('Room not found. Check the code.'); return; }
    await update(ref(db, `tod_rooms/${code}/players`), {
      [MY_ID]: { id: MY_ID, name: nameInput.trim(), isHost: false },
    });
    setMyName(nameInput.trim());
    setRoomCode(code);
    setIsHost(false);
    setScreen('lobby');
  };

  // ── Start game ─────────────────────────────────────────────────────────────
  const handleStart = async () => {
    await update(ref(db, `tod_rooms/${roomCode}`), { phase: 'picking' });
  };

  // ── Draw card ──────────────────────────────────────────────────────────────
  const drawCard = useCallback(async (type, sub=null) => {
    setCardType(type); setDareSubtype(sub);
    setLoadingAction('card');
    setJudgment(''); setTranscript(''); setTextAnswer(''); setRecording(false);
    setFollowUp(''); setSubmittedImg(null); setUrlInput('');
    setRetryState(null); setRetryMode(false);

    // Push card-loading state to Firebase so everyone sees it
    await update(ref(db, `tod_rooms/${roomCode}`), { phase: 'card_loading' });

    const data = await percilla('card', {
      type, dareSubtype: sub, players: playerList, currentPlayer,
      gameLog: gameLog.current, roundCount: roomData?.roundCount || 0,
    });

    const ct    = data?.card  || (type==='truth' ? "What's the most embarrassing thing you've done for someone you were attracted to?" : "Text someone 'we need to talk' and don't respond for 5 minutes.");
    const intro = data?.intro || "I've been saving this one.";

    setCardText(ct); setHostLine(intro); setLoadingAction('');
    speak(`${intro}... ${ct}`, voiceOn);

    await update(ref(db, `tod_rooms/${roomCode}`), {
      phase: 'card',
      currentCard: { type, dareSubtype: sub, text: ct, intro, judgment:'', followUp:'', forPlayerId: players[currentIdx]?.id },
    });

    if (type==='dare' && (!sub || sub==='regular')) {
      if (/text|send|say|message|post|call|tell|write|voice/i.test(ct)) {
        const fw = await percilla('write_content', { dare:ct, playerName:currentPlayer, players:playerList });
        if (fw?.text) {
          setFollowUp(fw.text);
          await update(ref(db, `tod_rooms/${roomCode}/currentCard`), { followUp: fw.text });
        }
      }
    }
  }, [playerList, currentPlayer, roomCode, roomData, voiceOn, currentIdx, players]);

  // ── Next turn ──────────────────────────────────────────────────────────────
  const nextTurn = useCallback(async (skipped=false) => {
    window.speechSynthesis?.cancel();
    addLog(skipped ? `${currentPlayer} skipped` : `${currentPlayer} completed ${cardType==='truth'?'truth':'dare'}: "${cardText.slice(0,50)}"`);

    const nextIdx = players.length > 0 ? (currentIdx+1) % players.length : 0;
    const newRound = (roomData?.roundCount||0) + 1;

    await update(ref(db, `tod_rooms/${roomCode}`), {
      phase: 'picking',
      currentIdx: nextIdx,
      roundCount: newRound,
      currentCard: null,
    });
    setJudgment(''); setRetryState(null); setCardText(''); setHostLine('');

    // Load reaction async
    percilla('react', {
      type: cardType, playerName: currentPlayer, outcome: skipped?'skip':'done',
      gameLog: gameLog.current, players: playerList, roundCount: newRound,
    }).then(r => {
      const line = r?.text || (skipped ? "Bold move. Noted." : "Now that's how you play.");
      setReactionLine(line);
      speak(line, voiceOn);
      update(ref(db, `tod_rooms/${roomCode}`), { lastReaction: line });
    });
  }, [cardType, cardText, currentPlayer, players, currentIdx, roomCode, roomData, voiceOn, playerList]);

  // ── Answer submit (mic or text) ────────────────────────────────────────────
  const submitAnswer = useCallback(async (answerText) => {
    if (!answerText.trim()) return;
    addLog(`${currentPlayer} answered: "${answerText.slice(0,80)}"`);
    setJudging(true); setRecording(false);
    const r = await percilla('judge_answer', {
      transcript: answerText, question: cardText, playerName: currentPlayer,
      gameLog: gameLog.current, players: playerList,
    });
    const v = r?.text || "Percilla is processing that.";
    setJudgment(v); setJudging(false);
    speak(v, voiceOn);
    await update(ref(db, `tod_rooms/${roomCode}/currentCard`), { judgment: v });

    const ratingMatch = v.match(/Rating:\s*(\d+)/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 10;
    if (rating < 5) {
      percilla('retry_threat', {
        transcript: answerText, question: cardText, playerName: currentPlayer,
        rating, gameLog: gameLog.current, players: playerList,
      }).then(r2 => { if (r2?.callout) setRetryState(r2); });
    }
  }, [cardText, currentPlayer, playerList, roomCode, voiceOn]);

  const stopAndJudge = useCallback(async () => {
    recognitionRef.current?.stop();
    if (transcript.trim()) await submitAnswer(transcript);
  }, [transcript, submitAnswer]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Try Chrome or Safari for speech recognition.'); return; }
    const rec = new SR();
    rec.continuous=true; rec.interimResults=true; rec.lang='en-US';
    rec.onresult = e => setTranscript(Array.from(e.results).map(r=>r[0].transcript).join(' '));
    rec.onerror = () => setRecording(false);
    rec.onend   = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start(); setRecording(true); setTranscript('');
  }, []);

  // ── Photo ──────────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const b64 = await compress(file);
      setSubmittedImg(`data:image/jpeg;base64,${b64}`);
      setJudging(true);
      const r = await percilla('judge_photo', { imageBase64:b64, dare:cardText, playerName:currentPlayer, gameLog:gameLog.current, players:playerList });
      const v = r?.text || "That photo says a lot.";
      setJudgment(v); setJudging(false); speak(v, voiceOn);
      await update(ref(db, `tod_rooms/${roomCode}/currentCard`), { judgment: v });
    } catch { setJudgment("Couldn't load that image."); setJudging(false); }
  };

  // ── URL ────────────────────────────────────────────────────────────────────
  const submitURL = async () => {
    if (!urlInput.trim()) return;
    setJudging(true);
    const r = await percilla('judge_url', { url:urlInput.trim(), dare:cardText, playerName:currentPlayer, gameLog:gameLog.current, players:playerList });
    const v = r?.text || "That URL tells a story.";
    setJudgment(v); setJudging(false); speak(v, voiceOn);
    await update(ref(db, `tod_rooms/${roomCode}/currentCard`), { judgment: v });
  };

  // ── Page wrapper ───────────────────────────────────────────────────────────
  const Page = ({ children, center=false }) => (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text, display:'flex', flexDirection:'column', alignItems:'center', padding:'0 20px 60px', fontFamily:"'Georgia',serif", justifyContent:center?'center':undefined }}>
      {/* Voice toggle — always visible */}
      <div style={{ width:'100%', maxWidth:480, paddingTop:18, display:'flex', alignItems:'center', marginBottom:28 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer', padding:0 }}>←</button>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>Percilla's voice</span>
          <button onClick={() => setVoiceOn(v => !v)} style={{
            width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
            background: voiceOn ? T.accent : T.border, transition:'background 0.2s',
          }}>
            <span style={{ position:'absolute', top:3, left: voiceOn?21:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
          </button>
        </div>
      </div>
      <div style={{ width:'100%', maxWidth:480 }}>{children}</div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HOME ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'home') return (
    <Page>
      <div style={{ marginBottom:40 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.2em', textTransform:'uppercase', color:T.accent, marginBottom:10 }}>Percilla's</div>
        <h1 style={{ fontSize:'clamp(36px,9vw,54px)', fontWeight:900, lineHeight:1, margin:'0 0 14px', letterSpacing:'-0.02em' }}>Truth or Dare</h1>
        <p style={{ color:T.sub, fontSize:14, lineHeight:1.7 }}>
          Everyone joins on their own phone.<br/>Percilla knows who's here and makes it personal.
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={() => setScreen('create')} style={btn(`linear-gradient(135deg,${T.accent},${T.warm})`, '#fff')}>
          Create a Room
        </button>
        <button onClick={() => setScreen('join')} style={ghost(T.text)}>
          Join a Room
        </button>
      </div>
    </Page>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CREATE ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'create') return (
    <Page>
      <h2 style={{ fontSize:26, fontWeight:900, marginBottom:6, letterSpacing:'-0.01em' }}>Create a room</h2>
      <p style={{ color:T.sub, fontSize:13, marginBottom:28 }}>You're the host. Share the code when everyone's ready.</p>
      <div style={{ ...card(), marginBottom:14 }}>
        <div style={lbl()}>Your name</div>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleCreate()}
          placeholder="What do people call you?"
          style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'11px 14px', color:T.text, fontSize:15, outline:'none' }} />
      </div>
      <button onClick={handleCreate} disabled={!nameInput.trim()} style={{ ...btn(`linear-gradient(135deg,${T.accent},${T.warm})`, '#fff'), opacity:nameInput.trim()?1:0.4 }}>
        Create Room
      </button>
      <button onClick={()=>setScreen('home')} style={{ ...ghost(), marginTop:8 }}>Back</button>
    </Page>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── JOIN ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'join') return (
    <Page>
      <h2 style={{ fontSize:26, fontWeight:900, marginBottom:6, letterSpacing:'-0.01em' }}>Join a room</h2>
      <p style={{ color:T.sub, fontSize:13, marginBottom:28 }}>Ask the host for the room code.</p>
      <div style={{ ...card(), marginBottom:14 }}>
        <div style={lbl()}>Your name</div>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
          placeholder="What do people call you?"
          style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'11px 14px', color:T.text, fontSize:15, outline:'none', marginBottom:14 }} />
        <div style={lbl()}>Room code</div>
        <input value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())}
          onKeyDown={e=>e.key==='Enter'&&handleJoin()}
          placeholder="e.g. AB3X" maxLength={4}
          style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'11px 14px', color:T.text, fontSize:20, outline:'none', letterSpacing:'0.2em', textAlign:'center', fontWeight:800 }} />
      </div>
      <button onClick={handleJoin} disabled={!nameInput.trim()||!codeInput.trim()} style={{ ...btn(`linear-gradient(135deg,${T.accent},${T.warm})`, '#fff'), opacity:(nameInput.trim()&&codeInput.trim())?1:0.4 }}>
        Join
      </button>
      <button onClick={()=>setScreen('home')} style={{ ...ghost(), marginTop:8 }}>Back</button>
    </Page>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── LOBBY ─────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'lobby') return (
    <Page>
      <div style={{ marginBottom:32 }}>
        <div style={lbl(T.accent)}>Room code</div>
        <div style={{ fontSize:48, fontWeight:900, letterSpacing:'0.25em', color:T.text }}>{roomCode}</div>
        <p style={{ color:T.sub, fontSize:13, marginTop:4 }}>Share this with everyone. They join at the same URL.</p>
      </div>

      <div style={{ ...card(), marginBottom:20, width:'100%' }}>
        <div style={lbl()}>Who's here ({players.length})</div>
        {players.length === 0
          ? <p style={{ color:T.muted, fontSize:13, fontStyle:'italic' }}>Waiting for players...</p>
          : players.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:p.isHost?T.accent:T.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', flexShrink:0 }}>
                {p.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize:14, color:T.text }}>{p.name}</span>
              {p.isHost && <span style={{ marginLeft:'auto', fontSize:10, color:T.accent, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Host</span>}
              {p.id === MY_ID && !p.isHost && <span style={{ marginLeft:'auto', fontSize:10, color:T.sub }}>You</span>}
            </div>
          ))
        }
      </div>

      {isHost ? (
        <button onClick={handleStart} disabled={players.length < 1} style={{ ...btn(`linear-gradient(135deg,${T.accent},${T.warm})`, '#fff'), opacity:players.length>=1?1:0.4 }}>
          Start Game ({players.length} {players.length===1?'player':'players'})
        </button>
      ) : (
        <div style={{ ...card(), textAlign:'center' }}>
          <div style={{ color:T.sub, fontSize:14 }}>Waiting for the host to start...</div>
        </div>
      )}

      {/* Auto-advance non-host players when game starts */}
      {gamePhase !== 'lobby' && <AutoAdvance onAdvance={()=>setScreen('game')} />}
    </Page>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ── GAME ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'game') {
    const roundCount = roomData?.roundCount || 0;

    // ── PICKING ────────────────────────────────────────────────────────────
    if (gamePhase === 'picking') return (
      <Page>
        {/* Percilla's last reaction */}
        {reactionLine && (
          <div style={{ ...card({ borderLeft:`3px solid ${T.accent}` }), marginBottom:24, display:'flex', gap:12, alignItems:'flex-start', animation:'fadeIn 0.3s ease' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:T.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0 }}>P</div>
            <div style={{ fontSize:14, color:T.text, lineHeight:1.6, fontStyle:'italic' }}>"{reactionLine}"</div>
          </div>
        )}

        <div style={{ marginBottom:32 }}>
          {roundCount > 0 && <div style={{ fontSize:11, color:T.muted, marginBottom:6, letterSpacing:'0.1em', textTransform:'uppercase' }}>Round {roundCount}</div>}
          <div style={{ fontSize:12, color:T.sub, marginBottom:4 }}>It's</div>
          <div style={{ fontSize:'clamp(32px,10vw,52px)', fontWeight:900, color:T.text, lineHeight:1, letterSpacing:'-0.02em' }}>
            {currentPlayer || 'Someone'}
          </div>
          <div style={{ fontSize:12, color:T.sub, marginTop:4 }}>your turn</div>
          {!isMyTurn && <div style={{ fontSize:12, color:T.muted, marginTop:8, fontStyle:'italic' }}>Waiting for {currentPlayer} to pick...</div>}
        </div>

        {/* Only the current player (or host) picks */}
        {(isMyTurn || isHost) && (
          <>
            <button onClick={()=>drawCard('truth')} style={{ ...btn(T.accent,'#fff'), marginBottom:10 }}>Truth</button>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, color:T.warm, fontWeight:800, textAlign:'center', marginBottom:8, letterSpacing:'0.1em', textTransform:'uppercase' }}>Dare</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['regular','Regular'],['photo','Photo'],['url','URL']].map(([sub,label]) => (
                  <button key={sub} onClick={()=>drawCard('dare',sub)} style={{ padding:'14px 8px', borderRadius:10, background:T.card, border:`1px solid ${T.border}`, cursor:'pointer', color:T.warm, fontWeight:700, fontSize:13 }}>{label}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <button onClick={onBack} style={{ ...ghost(), marginTop:8 }}>Leave Game</button>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </Page>
    );

    // ── CARD LOADING ───────────────────────────────────────────────────────
    if (gamePhase === 'card_loading') return (
      <Page center>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:T.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', margin:'0 auto 16px' }}>P</div>
          <div style={{ color:T.muted, fontSize:14 }}>Percilla is cooking...</div>
          <div style={{ height:2, background:T.border, borderRadius:1, overflow:'hidden', marginTop:16, width:200 }}>
            <div style={{ height:'100%', width:'35%', background:T.accent, borderRadius:1, animation:'slide 1.4s ease-in-out infinite' }} />
          </div>
        </div>
        <style>{`@keyframes slide{0%{margin-left:-35%}100%{margin-left:135%}}`}</style>
      </Page>
    );

    // ── CARD ───────────────────────────────────────────────────────────────
    if (gamePhase === 'card') {
      // Non-host / non-current-player sees a spectator view
      const isActivePlayer = isMyTurn || isHost;
      const displayCard = roomData?.currentCard;
      const displayText = cardText || displayCard?.text || '';
      const displayIntro = hostLine || displayCard?.intro || '';
      const displayJudgment = judgment || displayCard?.judgment || '';
      const displayFollowUp = followUp || displayCard?.followUp || '';

      return (
        <Page>
          {/* Percilla intro */}
          {displayIntro && (
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:T.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>P</div>
              <div style={{ fontSize:14, color:T.sub, fontStyle:'italic' }}>"{displayIntro}"</div>
            </div>
          )}

          {/* Card face */}
          <div style={{ background:isTruth?'linear-gradient(135deg,#1a0018,#2d0030)':'linear-gradient(135deg,#1a0700,#2d1200)', borderRadius:16, padding:'28px 24px', border:`1px solid ${cardAccent}44`, marginBottom:20, minHeight:140, borderLeft:`3px solid ${cardAccent}` }}>
            <div style={{ fontSize:10, fontWeight:900, letterSpacing:'0.15em', textTransform:'uppercase', color:cardAccent, marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              {isTruth?'Truth':isPhoto?'Photo Dare':isURL?'URL Dare':'Dare'}
              {currentPlayer && <span style={{ color:T.muted, fontWeight:400 }}>— {currentPlayer}</span>}
            </div>
            <div style={{ fontSize:'clamp(15px,4vw,20px)', lineHeight:1.7, color:T.text }}>{displayText}</div>
            {voiceOn && displayText && (
              <button onClick={()=>speak(`${displayIntro}... ${displayText}`, true)} style={{ background:'none', border:`1px solid ${cardAccent}44`, borderRadius:6, padding:'5px 12px', cursor:'pointer', color:cardAccent, fontSize:11, fontWeight:600, marginTop:14 }}>
                Play again
              </button>
            )}
          </div>

          {/* Written follow-up for dares */}
          {displayFollowUp && !isTruth && !isPhoto && !isURL && (
            <div style={{ ...card({ borderLeft:`3px solid ${T.warm}` }), marginBottom:16 }}>
              <div style={lbl(T.warm)}>Percilla wrote this for you</div>
              <div style={{ fontSize:15, color:T.text, lineHeight:1.6, padding:'12px 14px', background:T.bg, borderRadius:8, marginBottom:10 }}>{displayFollowUp}</div>
              {voiceOn && <button onClick={()=>speak(displayFollowUp,true)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 12px', cursor:'pointer', color:T.muted, fontSize:11, fontWeight:600 }}>Play</button>}
            </div>
          )}

          {/* ── Answer section — always show BOTH mic and text ── */}
          {isActivePlayer && !displayJudgment && isTruth && (
            <div style={{ ...card(), marginBottom:16 }}>
              <div style={lbl()}>Answer — mic or type, your choice</div>

              {/* Text input — always visible */}
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <input
                  value={textAnswer} onChange={e=>setTextAnswer(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&textAnswer.trim()&&submitAnswer(textAnswer)}
                  placeholder="Type your answer..."
                  style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', color:T.text, fontSize:14, outline:'none' }}
                />
                <button onClick={()=>textAnswer.trim()&&submitAnswer(textAnswer)} disabled={!textAnswer.trim()} style={{ background:T.accent, border:'none', borderRadius:8, padding:'0 16px', cursor:'pointer', color:'#fff', fontWeight:800, opacity:textAnswer.trim()?1:0.4 }}>
                  Send
                </button>
              </div>

              {/* Mic */}
              {!recording ? (
                <button onClick={startListening} style={btn(`${T.accent}22`, T.accent, { border:`1px solid ${T.accent}44` })}>
                  🎙 Speak instead
                </button>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:`${T.accent}11`, borderRadius:8, marginBottom:10, border:`1px solid ${T.accent}44` }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:T.accent, animation:'pulse 1s infinite', flexShrink:0 }} />
                    <span style={{ color:T.accent, fontSize:13, fontWeight:600 }}>Listening...</span>
                  </div>
                  {transcript && <div style={{ fontSize:13, color:T.sub, lineHeight:1.6, padding:'10px 14px', background:T.bg, borderRadius:8, marginBottom:10, fontStyle:'italic' }}>{transcript}</div>}
                  <button onClick={stopAndJudge} style={btn(T.warm, '#111')}>Done — judge me</button>
                </>
              )}
            </div>
          )}

          {/* Photo */}
          {isActivePlayer && !displayJudgment && isPhoto && (
            <div style={{ ...card(), marginBottom:16 }}>
              <div style={lbl()}>Take or upload a photo — Percilla will judge it</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{fileRef.current.setAttribute('capture','user');fileRef.current.click();}} style={{ ...btn(T.warm,'#111'), flex:1 }}>Camera</button>
                <button onClick={()=>{fileRef.current.removeAttribute('capture');fileRef.current.click();}} style={{ ...ghost(T.text), flex:1 }}>Gallery</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
            </div>
          )}

          {/* URL */}
          {isActivePlayer && !displayJudgment && isURL && (
            <div style={{ ...card(), marginBottom:16 }}>
              <div style={lbl()}>Paste the URL — Percilla will judge it</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitURL()} placeholder="https://..."
                  style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'11px 14px', color:T.text, fontSize:13, outline:'none' }} />
                <button onClick={submitURL} disabled={!urlInput.trim()} style={{ ...btn(T.accent,'#fff',{width:'auto',padding:'0 16px'}), opacity:urlInput.trim()?1:0.4 }}>Judge</button>
              </div>
            </div>
          )}

          {/* Judging spinner */}
          {judging && <div style={{ ...card(), marginBottom:16, textAlign:'center' }}><div style={{ color:T.muted, fontSize:13 }}>Percilla is judging...</div></div>}

          {/* Photo preview */}
          {submittedImg && <div style={{ borderRadius:12, overflow:'hidden', marginBottom:16, border:`1px solid ${T.border}` }}><img src={submittedImg} alt="proof" style={{ width:'100%', maxHeight:300, objectFit:'cover', display:'block' }} /></div>}

          {/* Verdict */}
          {displayJudgment && (
            <div style={{ ...card({ borderLeft:`3px solid ${T.warm}` }), marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:T.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>P</div>
                <div style={{ flex:1 }}>
                  <div style={lbl(T.warm)}>Percilla's verdict</div>
                  <div style={{ fontSize:14, color:T.text, lineHeight:1.7 }}>{displayJudgment}</div>
                  {voiceOn && <button onClick={()=>speak(displayJudgment,true)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'5px 12px', cursor:'pointer', color:T.muted, fontSize:11, fontWeight:600, marginTop:10 }}>Play</button>}
                </div>
              </div>
            </div>
          )}

          {/* Retry threat */}
          {retryState && !retryMode && isActivePlayer && (
            <div style={{ ...card({ borderLeft:`3px solid ${T.accent}` }), marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:T.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>P</div>
                <div>
                  <div style={lbl(T.accent)}>Percilla's not done</div>
                  <div style={{ fontSize:14, color:T.text, lineHeight:1.7, marginBottom:6 }}>{retryState.callout}</div>
                  <div style={{ fontSize:13, color:T.sub, fontStyle:'italic' }}>"{retryState.retryPrompt}"</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{ setRetryMode(true); setTextAnswer(''); setTranscript(''); setJudgment(''); speak(retryState.retryPrompt, voiceOn); }} style={{ ...btn(T.accent,'#fff'), flex:2 }}>Answer for real</button>
                <button onClick={()=>{ setRetryState(null); setCardType('dare'); setDareSubtype('regular'); setCardText(retryState.dareThreat||'Do something embarrassing.'); setHostLine('Fine. You asked for it.'); setJudgment(''); speak(`Fine. You asked for it. ${retryState.dareThreat}`, voiceOn); }} style={{ ...ghost(T.warm), flex:1, border:`1px solid ${T.warm}44` }}>Take the dare</button>
              </div>
              <div style={{ fontSize:11, color:T.muted, marginTop:8, fontStyle:'italic' }}>{retryState.dareThreat}</div>
            </div>
          )}

          {/* Retry mode answer box */}
          {retryMode && !displayJudgment && isActivePlayer && (
            <div style={{ ...card(), marginBottom:16, borderLeft:`2px solid ${T.accent}` }}>
              <div style={lbl()}>Try again — for real</div>
              {retryState?.retryPrompt && <div style={{ fontSize:15, color:T.text, lineHeight:1.6, padding:'10px 12px', background:T.bg, borderRadius:8, marginBottom:12 }}>{retryState.retryPrompt}</div>}
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&textAnswer.trim()&&submitAnswer(textAnswer)} placeholder="Type your real answer..."
                  style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', color:T.text, fontSize:14, outline:'none' }} />
                <button onClick={()=>textAnswer.trim()&&submitAnswer(textAnswer)} disabled={!textAnswer.trim()} style={{ background:T.accent, border:'none', borderRadius:8, padding:'0 16px', cursor:'pointer', color:'#fff', fontWeight:800, opacity:textAnswer.trim()?1:0.4 }}>Send</button>
              </div>
              {!recording
                ? <button onClick={startListening} style={btn(`${T.accent}22`, T.accent, { border:`1px solid ${T.accent}44` })}>🎙 Speak instead</button>
                : <>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:`${T.accent}11`, borderRadius:8, marginBottom:10 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:T.accent, animation:'pulse 1s infinite', flexShrink:0 }} />
                      <span style={{ color:T.accent, fontSize:13, fontWeight:600 }}>Listening...</span>
                    </div>
                    {transcript && <div style={{ fontSize:13, color:T.sub, padding:'10px 14px', background:T.bg, borderRadius:8, marginBottom:10, fontStyle:'italic' }}>{transcript}</div>}
                    <button onClick={stopAndJudge} style={btn(T.warm,'#111')}>Done — judge me</button>
                  </>
              }
            </div>
          )}

          {/* Spectator notice */}
          {!isActivePlayer && !displayJudgment && (
            <div style={{ ...card(), marginBottom:16, textAlign:'center' }}>
              <div style={{ color:T.sub, fontSize:14 }}>Watching {currentPlayer}...</div>
            </div>
          )}

          {/* Action buttons */}
          {!recording && isActivePlayer && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(isPhoto||isURL) && !displayJudgment && (
                <button onClick={()=>nextTurn(false)} style={ghost()}>Mark done without submitting</button>
              )}
              {((!isPhoto&&!isURL)||displayJudgment) && (
                <button onClick={()=>nextTurn(false)} style={{ ...btn(isTruth&&!displayJudgment?T.card:`linear-gradient(135deg,${cardAccent},${cardAccent}99)`, isTruth&&!displayJudgment?T.sub:'#fff'), border:isTruth&&!displayJudgment?`1px solid ${T.border}`:'none', opacity:isTruth&&!displayJudgment?0.7:1 }}>
                  {isTruth?(displayJudgment?'Next round':'Answered without mic'):'Done'}
                </button>
              )}
              <button onClick={()=>nextTurn(true)} style={ghost(T.muted)}>Skip</button>
            </div>
          )}

          <style>{`@keyframes slide{0%{margin-left:-35%}100%{margin-left:135%}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        </Page>
      );
    }

    // ── Fallback game state ────────────────────────────────────────────────
    return (
      <Page center>
        <div style={{ textAlign:'center', color:T.sub }}>Loading...</div>
      </Page>
    );
  }

  return null;
}

// ── Auto-advance helper for lobby → game ──────────────────────────────────────
function AutoAdvance({ onAdvance }) {
  useEffect(() => { onAdvance(); }, []);
  return null;
}
