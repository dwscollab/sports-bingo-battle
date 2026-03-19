// src/components/PeopleWatchingSetup.jsx
import { useState, useEffect } from 'react';
import { useLocation } from '../hooks/useLocation.js';
import { loadPreferences, savePreferences } from '../services/preferences.js';

const VIBE_OPTIONS = [
  { value: 'anywhere',    icon: '🌍', label: 'Anywhere',      desc: 'Generic public space' },
  { value: 'coffee_shop', icon: '☕', label: 'Coffee Shop',   desc: 'Cafes, bakeries, pastry spots' },
  { value: 'bar',         icon: '🍺', label: 'Bar / Restaurant', desc: 'Pubs, diners, patios' },
  { value: 'mall',        icon: '🛍️', label: 'Mall / Shopping', desc: 'Retail, food courts' },
  { value: 'park',        icon: '🌳', label: 'Park / Outdoors', desc: 'Green spaces, trails' },
  { value: 'airport',     icon: '✈️', label: 'Airport',        desc: 'Gates, terminals' },
  { value: 'beach',       icon: '🏖️', label: 'Beach / Waterfront', desc: 'Shoreline, boardwalk' },
  { value: 'stadium',     icon: '🏟️', label: 'Stadium / Arena', desc: 'Non-game event' },
];

const LOCATION_METHODS = [
  { value: 'gps',    icon: '📍', label: 'Use My Location',  desc: 'GPS auto-detects where you are' },
  { value: 'zip',    icon: '🔢', label: 'Zip / Postal Code', desc: 'Type your zip or postal code' },
  { value: 'w3w',    icon: '///', label: 'what3words',        desc: '3-word location address' },
  { value: 'manual', icon: '✏️', label: 'Type It In',        desc: 'Describe your location yourself' },
];

export default function PeopleWatchingSetup({ onCreateRoom, onJoinRoom, onBack, llmStatus }) {
  const [mode,     setMode]     = useState('create');
  const [name,     setName]     = useState('');
  const [vibe,     setVibe]     = useState('anywhere');
  const [method,   setMethod]   = useState('gps');
  const [zipInput, setZipInput] = useState('');
  const [w3wInput, setW3wInput] = useState('');
  const [manInput, setManInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [botCount, setBotCount] = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const loc = useLocation();

  // Load saved prefs
  useEffect(() => {
    const p = loadPreferences();
    if (p.name)    setName(p.name);
    if (p.pwVibe)  setVibe(p.pwVibe);
    if (p.botCount !== undefined) setBotCount(p.botCount);
  }, []);

  const canCreate = name.trim().length >= 2 && loc.status === 'done';
  const canJoin   = name.trim().length >= 2 && joinCode.trim().length === 4;

  const handleGPS = async () => {
    await loc.requestGPS();
  };

  const handleZip = async () => {
    if (!zipInput.trim()) return;
    await loc.lookupZip(zipInput.trim());
  };

  const handleW3W = async () => {
    if (!w3wInput.trim()) return;
    await loc.lookupW3W(w3wInput.trim());
  };

  const handleManual = () => {
    if (!manInput.trim()) return;
    loc.setManual(manInput.trim());
  };

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    savePreferences({ name: name.trim(), pwVibe: vibe, botCount });
    try {
      await onCreateRoom({
        name:                name.trim(),
        sport:               'people',        // special mode flag
        location:            'liveGame',       // always has camera squares
        locationDescription: loc.locationDescription,
        vibe,
        botCount,
        team:                '',
        homeTeam:            null,
        awayTeam:            null,
        gameLabel:           `People Watching · ${loc.locationDescription}`,
      });
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!canJoin || loading) return;
    setLoading(true);
    try {
      await onJoinRoom({
        name: name.trim(),
        team: '',
        code: joinCode.trim().toUpperCase(),
      });
    } finally { setLoading(false); }
  };

  const persistPrefs = () => {
    savePreferences({ name: name.trim(), pwVibe: vibe, botCount });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--text-muted)', padding: '4px 8px',
        }}>←</button>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(135deg, #a78bfa, #ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            👁 People Watching
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            AI-generated bingo based on your location
          </div>
        </div>
      </div>

      <div className="lobby-form">

        {/* Name */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>Your Info</p>
            {savedBadge && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✓ Saved</span>}
          </div>
          <div className="form-group">
            <label>Your Name</label>
            <input className="input" placeholder="e.g. Alex" value={name}
              onChange={e => setName(e.target.value)} maxLength={20} />
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, alignSelf: 'flex-start' }}
            onClick={persistPrefs}>💾 Save Preferences</button>
        </div>

        {/* Mode toggle */}
        <div className="segment-group">
          <button className={`segment-btn ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
            ✨ Create Game
          </button>
          <button className={`segment-btn ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
            🔗 Join Game
          </button>
        </div>

        {/* ── CREATE ── */}
        {mode === 'create' && (<>

          {/* Location method */}
          <div className="card">
            <p className="section-title" style={{ marginBottom: 12 }}>📍 Your Location</p>

            {/* Method tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
              {LOCATION_METHODS.map(m => (
                <button key={m.value}
                  onClick={() => { setMethod(m.value); loc.reset(); }}
                  style={{
                    padding: '7px 12px', borderRadius: 8, border: 'none',
                    background: method === m.value ? 'var(--accent)' : 'var(--surface2)',
                    color: method === m.value ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* GPS */}
            {method === 'gps' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Tap below to detect your location. Your device will ask for permission.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={handleGPS}
                  disabled={loc.status === 'requesting' || loc.status === 'resolving'}
                >
                  {loc.status === 'requesting' ? '📡 Requesting…'
                   : loc.status === 'resolving' ? '🗺 Resolving…'
                   : '📍 Detect My Location'}
                </button>
                {!loc.isSupported && (
                  <p style={{ fontSize: 11, color: 'var(--accent)' }}>
                    ⚠️ GPS not available on this browser. Use zip code or type your location.
                  </p>
                )}
              </div>
            )}

            {/* Zip code */}
            {method === 'zip' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }}
                  placeholder="e.g. 80202 or M5V 3A8"
                  value={zipInput} onChange={e => setZipInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleZip()}
                  maxLength={10}
                />
                <button className="btn btn-secondary"
                  onClick={handleZip}
                  disabled={loc.status === 'resolving' || !zipInput.trim()}
                >
                  {loc.status === 'resolving' ? '…' : '→'}
                </button>
              </div>
            )}

            {/* what3words */}
            {method === 'w3w' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Open the <strong>what3words app</strong> to find your 3-word address, then type it below.
                  Format: <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>word.word.word</code>
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }}
                    placeholder="e.g. filled.count.soap"
                    value={w3wInput}
                    onChange={e => setW3wInput(e.target.value.toLowerCase().replace(/[^a-z.]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleW3W()}
                  />
                  <button className="btn btn-secondary"
                    onClick={handleW3W}
                    disabled={loc.status === 'resolving' || !w3wInput.trim()}
                  >
                    {loc.status === 'resolving' ? '…' : '///'}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  what3words gives every 3m² on Earth a unique 3-word address.
                  Get the free app at what3words.com
                </p>
              </div>
            )}

            {/* Manual */}
            {method === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Describe where you are — be as specific as you like.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }}
                    placeholder="e.g. Pearl Street Mall, Boulder CO"
                    value={manInput}
                    onChange={e => setManInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManual()}
                    maxLength={80}
                  />
                  <button className="btn btn-secondary"
                    onClick={handleManual}
                    disabled={!manInput.trim()}
                  >→</button>
                </div>
              </div>
            )}

            {/* Error */}
            {loc.error && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(233,69,96,0.1)', border: '1px solid var(--accent)',
                fontSize: 12, color: 'var(--accent)',
              }}>
                ⚠️ {loc.error}
              </div>
            )}

            {/* Success */}
            {loc.status === 'done' && loc.locationDescription && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(0,184,148,0.1)', border: '1px solid var(--green)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                    Location found!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {loc.locationDescription}
                  </div>
                  {loc.w3wWords && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      ///{loc.w3wWords}
                    </div>
                  )}
                </div>
                <button
                  onClick={loc.reset}
                  style={{
                    marginLeft: 'auto', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)',
                  }}
                >✕</button>
              </div>
            )}
          </div>

          {/* Vibe selector */}
          <div className="card">
            <p className="section-title" style={{ marginBottom: 12 }}>Setting / Vibe</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {VIBE_OPTIONS.map(v => (
                <button key={v.value} onClick={() => setVibe(v.value)} style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: vibe === v.value ? 'rgba(167,139,250,0.15)' : 'var(--surface2)',
                  border: `1.5px solid ${vibe === v.value ? '#a78bfa' : 'var(--border)'}`,
                  color: 'var(--text)',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bot count */}
          <div className="card">
            <p className="section-title" style={{ marginBottom: 10 }}>
              AI Bot Competitors 🤖
            </p>
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

          {/* AI info */}
          <div style={{
            background: 'rgba(167,139,250,0.08)', border: '1px solid #a78bfa44',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span>✨</span>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>AI-Generated Squares</span>
              {llmStatus === 'generating' && (
                <span className="pulse" style={{ color: '#a78bfa', fontSize: 11 }}>Generating…</span>
              )}
            </div>
            <p style={{ lineHeight: 1.6 }}>
              Claude generates hyper-local people watching squares based on exactly where you are and the vibe you're in.
              📷 Camera squares require a sneaky photo as proof.
            </p>
          </div>

          <button
            className="btn btn-lg"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #ec4899)',
              color: '#fff', border: 'none',
            }}
            onClick={handleCreate}
            disabled={!canCreate || loading}
          >
            {loading ? (llmStatus === 'generating' ? '✨ Generating…' : 'Creating…')
              : loc.status !== 'done' ? '📍 Set location first'
              : '👁 Start People Watching'}
          </button>

        </>)}

        {/* ── JOIN ── */}
        {mode === 'join' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Enter Room Code</p>
            <input className="input" placeholder="e.g. AB3X" value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={4}
              style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.25em', textAlign: 'center' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              You'll get your own AI-generated card. Location and vibe match the host.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleJoin} disabled={!canJoin || loading}>
              {loading ? 'Joining…' : '🔗 Join Game'}
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
          <p className="section-title" style={{ marginBottom: 8 }}>How It Works</p>
          <p>📍 Share your location so AI can write location-specific squares</p>
          <p>👁 Spot things happening around you and tap to mark</p>
          <p>📷 Camera squares need a sneaky photo — AI referee verifies it</p>
          <p>⚡ Battle squares are the rarest, most spectacular sightings</p>
          <p>💬 Chat and trash talk while you watch the world go by</p>
          <p>🤖 Letterkenny bots keep things lively in chat</p>
        </div>
      </div>
    </div>
  );
}
