// src/components/Lobby.jsx
import { useState, useMemo, useEffect } from 'react';
import { NHL_TEAMS, NFL_TEAMS, NBA_TEAMS } from '../data/teamColors.js';
import { loadPreferences, savePreferences } from '../services/preferences.js';

const SPORT_OPTIONS = [
  { value: 'hockey', label: '🏒', full: 'Hockey' },
  { value: 'nfl',    label: '🏈', full: 'NFL' },
  { value: 'nba',    label: '🏀', full: 'NBA' },
];

const LOCATION_OPTIONS = [
  { value: 'liveGame',  icon: '🏟️', label: 'Live Game',  desc: "At the arena!", camera: true  },
  { value: 'sportsBar', icon: '🍺', label: 'Sports Bar', desc: 'Out with a crowd', camera: true },
  { value: 'home',      icon: '🛋️', label: 'Home',       desc: 'TV / streaming', camera: false },
];

const TEAMS_BY_SPORT = { hockey: NHL_TEAMS, nfl: NFL_TEAMS, nba: NBA_TEAMS };

// ── Reusable team picker ──────────────────────────────────────────────────────
function TeamPicker({ sport, value, onChange, placeholder = 'Pick a team…', compact = false }) {
  const teams    = useMemo(() => Object.values(TEAMS_BY_SPORT[sport] || NHL_TEAMS), [sport]);
  const [open, setOpen] = useState(false);
  const selected = teams.find(t => t.abbr === value) ?? null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: selected ? selected.primary : 'var(--surface2)',
          border: `2px solid ${selected ? selected.secondary : 'var(--border)'}`,
          borderRadius: 10, padding: compact ? '8px 12px' : '11px 14px',
          color: selected ? selected.text : 'var(--text-muted)',
          fontSize: compact ? 13 : 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected && (
            <span style={{
              width: 16, height: 16, borderRadius: 3,
              background: selected.secondary, display: 'inline-block',
              border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0,
            }} />
          )}
          {selected ? selected.name : placeholder}
        </span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 10, maxHeight: 220, overflowY: 'auto', zIndex: 60,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            style={{
              width: '100%', padding: '9px 12px', background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, textAlign: 'left',
            }}
          >
            — No preference
          </button>
          {teams.map(team => (
            <button key={team.abbr} type="button"
              onClick={() => { onChange(team.abbr); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                background: value === team.abbr ? team.primary + '33' : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text)', textAlign: 'left',
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                background: `linear-gradient(135deg, ${team.primary} 50%, ${team.secondary} 50%)`,
                border: '1px solid rgba(255,255,255,0.08)',
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{team.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{team.abbr}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Lobby ────────────────────────────────────────────────────────────────
export default function Lobby({ onCreateRoom, onJoinRoom, llmStatus }) {
  const [mode,      setMode]      = useState('create');
  const [name,      setName]      = useState('');
  const [sport,     setSport]     = useState('hockey');
  const [myTeam,    setMyTeam]    = useState('');   // your team — for card colors
  const [homeTeam,  setHomeTeam]  = useState('');   // host sets the game being watched
  const [awayTeam,  setAwayTeam]  = useState('');
  const [location,  setLocation]  = useState('liveGame');
  const [botCount,  setBotCount]  = useState(0);
  const [joinCode,  setJoinCode]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [savedBadge,setSavedBadge]= useState(false);

  // Load saved prefs on mount
  useEffect(() => {
    const p = loadPreferences();
    if (p.name)     setName(p.name);
    if (p.sport)    setSport(p.sport);
    if (p.myTeam)   setMyTeam(p.myTeam);
    if (p.homeTeam) setHomeTeam(p.homeTeam);
    if (p.awayTeam) setAwayTeam(p.awayTeam);
    if (p.location) setLocation(p.location);
    if (p.botCount !== undefined) setBotCount(p.botCount);
  }, []);

  const handleSportChange = (s) => { setSport(s); setMyTeam(''); setHomeTeam(''); setAwayTeam(''); };

  const persistPrefs = (extra = {}) => {
    savePreferences({ name: name.trim(), sport, myTeam, homeTeam, awayTeam, location, botCount, ...extra });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const canCreate = name.trim().length >= 2;
  const canJoin   = name.trim().length >= 2 && joinCode.trim().length === 4;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    persistPrefs();
    try {
      // Build a readable game label from home/away teams
      const teams = TEAMS_BY_SPORT[sport] || {};
      const homeName = teams[homeTeam]?.name || homeTeam || null;
      const awayName = teams[awayTeam]?.name || awayTeam || null;
      const gameLabel = homeName && awayName
        ? `${awayName} @ ${homeName}`
        : homeName || awayName || null;

      await onCreateRoom({
        name: name.trim(), sport,
        team: myTeam,         // personal team for card colors
        homeTeam, awayTeam,   // game context for LLM + NHL feed
        gameLabel,
        location, botCount,
      });
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!canJoin || loading) return;
    setLoading(true);
    savePreferences({ name: name.trim(), myTeam, sport });
    try {
      await onJoinRoom({ name: name.trim(), team: myTeam, code: joinCode.trim().toUpperCase() });
    } finally { setLoading(false); }
  };

  const selectedMyTeam = (TEAMS_BY_SPORT[sport] || {})[myTeam];
  const locOption = LOCATION_OPTIONS.find(l => l.value === location);

  return (
    <div className="page">
      <div className="logo">
        <div style={{ fontSize: 44, marginBottom: 6 }}>🏒⚡</div>
        <div className="logo-title">Sports Bingo Battle</div>
        <div className="logo-sub">Multiplayer · AI-Generated · Live Feed</div>
      </div>

      <div className="lobby-form">

        {/* ── YOUR INFO ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>Your Info</p>
            {savedBadge && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✓ Saved</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name */}
            <div className="form-group">
              <label>Your Name</label>
              <input className="input" placeholder="e.g. Alex" value={name}
                onChange={e => setName(e.target.value)} maxLength={20} />
            </div>

            {/* Sport */}
            <div className="form-group">
              <label>Sport</label>
              <div className="segment-group">
                {SPORT_OPTIONS.map(s => (
                  <button key={s.value}
                    className={`segment-btn ${sport === s.value ? 'active' : ''}`}
                    onClick={() => handleSportChange(s.value)}>
                    {s.label} {s.full}
                  </button>
                ))}
              </div>
            </div>

            {/* Your team — for card colors only */}
            <div className="form-group">
              <label>Your Team <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— sets your card colors</span></label>
              <TeamPicker sport={sport} value={myTeam} onChange={setMyTeam} />
              {selectedMyTeam && (
                <div style={{
                  marginTop: 4, padding: '5px 10px', borderRadius: 8,
                  background: `${selectedMyTeam.primary}18`,
                  border: `1px solid ${selectedMyTeam.primary}33`,
                  fontSize: 11, color: 'var(--text-muted)',
                }}>
                  🎨 Your card will use {selectedMyTeam.name} colors
                </div>
              )}
            </div>

            <button className="btn btn-secondary btn-sm"
              onClick={() => persistPrefs()} style={{ alignSelf: 'flex-start' }}>
              💾 Save Preferences
            </button>
          </div>
        </div>

        {/* ── MODE TOGGLE ── */}
        <div className="segment-group">
          <button className={`segment-btn ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            ✨ Create Room
          </button>
          <button className={`segment-btn ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
            🔗 Join Room
          </button>
        </div>

        {/* ── CREATE MODE ── */}
        {mode === 'create' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Game being watched — host sets this */}
            <div className="form-group">
              <label>
                The Game You're Watching
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — sets the NHL live feed + AI squares</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Away</div>
                  <TeamPicker sport={sport} value={awayTeam} onChange={setAwayTeam}
                    placeholder="Away team" compact />
                </div>
                <div style={{ textAlign: 'center', fontWeight: 900, color: 'var(--text-muted)', fontSize: 16 }}>@</div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Home</div>
                  <TeamPicker sport={sport} value={homeTeam} onChange={setHomeTeam}
                    placeholder="Home team" compact />
                </div>
              </div>
              {homeTeam && awayTeam && (
                <div style={{
                  marginTop: 6, padding: '6px 10px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
                }}>
                  {(TEAMS_BY_SPORT[sport]||{})[awayTeam]?.name || awayTeam} @ {(TEAMS_BY_SPORT[sport]||{})[homeTeam]?.name || homeTeam}
                  {sport === 'hockey' && ' · NHL feed will track this game'}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="form-group">
              <label>Where are you watching?</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {LOCATION_OPTIONS.map(l => (
                  <button key={l.value} onClick={() => setLocation(l.value)} style={{
                    background: location === l.value ? 'rgba(233,69,96,0.12)' : 'var(--surface2)',
                    border: `1.5px solid ${location === l.value ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    color: 'var(--text)', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{l.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{l.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.desc}</div>
                    </div>
                    {l.camera && <span style={{ fontSize: 10, color: 'var(--gold)' }}>📷</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Bot count */}
            <div className="form-group">
              <label>AI Bot Competitors</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2,3].map(n => (
                  <button key={n} onClick={() => setBotCount(n)} style={{
                    flex: 1, padding: '10px 4px',
                    background: botCount === n ? 'var(--accent)' : 'var(--surface2)',
                    border: `1.5px solid ${botCount === n ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    color: botCount === n ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {n === 0 ? 'None' : `${n} 🤖`}
                  </button>
                ))}
              </div>
            </div>

            {/* LLM indicator */}
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--border)', fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span>✨</span>
                <span style={{ fontWeight: 700 }}>AI-Generated Card</span>
                {llmStatus === 'generating' && (
                  <span className="pulse" style={{ color: 'var(--gold)', fontSize: 11 }}>Generating…</span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Fresh squares for every game, tailored to the matchup and your location.
                {locOption?.camera && ' 📷 Camera squares included.'}
              </p>
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={!canCreate || loading}>
              {loading
                ? (llmStatus === 'generating' ? '✨ Generating card…' : 'Creating…')
                : '🎮 Create Room'}
            </button>
          </div>
        )}

        {/* ── JOIN MODE ── */}
        {mode === 'join' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Enter Room Code</p>
            <div className="form-group">
              <label>4-Letter Code</label>
              <input className="input" placeholder="e.g. AB3X" value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={4}
                style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.25em', textAlign: 'center' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Your card uses your team's colors. Sport and location match the host's game.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleJoin} disabled={!canJoin || loading}>
              {loading ? 'Joining…' : '🔗 Join Room'}
            </button>
          </div>
        )}

        {/* How to play */}
        <div className="card" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
          <p className="section-title" style={{ marginBottom: 8 }}>How to Play</p>
          <p>✨ AI generates unique squares for every game & location</p>
          <p>🏒 NHL games auto-mark squares from the live feed</p>
          <p>📷 Camera squares need a photo — AI referee verifies it</p>
          <p>⚡ BINGO with a battle square earns a 💣 Battle Shot</p>
          <p>💬 Tap the chat button to talk trash to your opponents</p>
          <p>👁 Tap any opponent to see their full board</p>
          <p>↩️ Tap a marked square again to unmark it</p>
        </div>
      </div>
    </div>
  );
}
