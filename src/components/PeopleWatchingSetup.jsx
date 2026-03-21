// src/components/PeopleWatchingSetup.jsx
import { useState, useEffect } from 'react';
import { useLocation } from '../hooks/useLocation.js';
import { loadPreferences, savePreferences } from '../services/preferences.js';

const VIBE_OPTIONS = [
  { value: 'anywhere',    icon: '🌍', label: 'Anywhere',         desc: 'Generic public space' },
  { value: 'coffee_shop', icon: '☕', label: 'Coffee Shop',      desc: 'Cafes, bakeries, pastry spots' },
  { value: 'bar',         icon: '🍺', label: 'Bar / Restaurant', desc: 'Pubs, diners, patios' },
  { value: 'mall',        icon: '🛍️', label: 'Mall / Shopping',  desc: 'Retail, food courts' },
  { value: 'park',        icon: '🌳', label: 'Park / Outdoors',  desc: 'Green spaces, trails' },
  { value: 'airport',     icon: '✈️', label: 'Airport',           desc: 'Gates, terminals' },
  { value: 'beach',       icon: '🏖️', label: 'Beach / Waterfront', desc: 'Shoreline, boardwalk' },
  { value: 'stadium',     icon: '🏟️', label: 'Stadium / Arena',  desc: 'Non-game event' },
];

const LOCATION_METHODS = [
  { value: 'gps',      icon: '📍', label: 'Use My Location', desc: 'GPS auto-detects where you are' },
  { value: 'zip',      icon: '🔢', label: 'Zip Code',        desc: 'Type your zip or postal code' },
  { value: 'pluscode', icon: '⊞',  label: 'Plus Code',       desc: 'Google open location code' },
  { value: 'manual',   icon: '✏️', label: 'Type It In',      desc: 'Describe your location' },
];

export default function PeopleWatchingSetup({ onCreateRoom, onJoinRoom, onBack, onTruthOrDare, llmStatus }) {
  const [mode,       setMode]       = useState('create');
  const [name,       setName]       = useState('');
  const [vibe,       setVibe]       = useState('anywhere');
  const [method,     setMethod]     = useState('gps');
  const [zipInput,   setZipInput]   = useState('');
  const [plusInput,  setPlusInput]  = useState('');
  const [manInput,   setManInput]   = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [botCount,   setBotCount]   = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);

  const loc = useLocation();

  useEffect(() => {
    const p = loadPreferences();
    if (p.name)    setName(p.name);
    if (p.pwVibe)  setVibe(p.pwVibe);
    if (p.botCount !== undefined) setBotCount(p.botCount);
  }, []);

  const canCreate = name.trim().length >= 2 && loc.status === 'done';
  const canJoin   = name.trim().length >= 2 && joinCode.trim().length === 4;

  const persistPrefs = () => {
    savePreferences({ name: name.trim(), pwVibe: vibe, botCount });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    persistPrefs();
    try {
      await onCreateRoom({
        name:                name.trim(),
        sport:               'people',
        location:            'liveGame',
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
      await onJoinRoom({ name: name.trim(), team: '', code: joinCode.trim().toUpperCase() });
    } finally { setLoading(false); }
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
            AI bingo cards tailored to your exact location
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
          <button className="btn btn-secondary btn-sm"
            style={{ marginTop: 10, alignSelf: 'flex-start' }}
            onClick={persistPrefs}>
            💾 Save Preferences
          </button>
        </div>

        {/* Mode toggle */}
        <div className="segment-group">
          <button className={`segment-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}>✨ Create Game</button>
          <button className={`segment-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}>🔗 Join Game</button>
        </div>

        {/* ── CREATE ── */}
        {mode === 'create' && (<>

          {/* Location */}
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
                  Tap below — your device will ask for location permission.
                </p>
                <button className="btn btn-secondary" onClick={loc.requestGPS}
                  disabled={loc.status === 'requesting' || loc.status === 'resolving'}>
                  {loc.status === 'requesting' ? '📡 Waiting for permission…'
                   : loc.status === 'resolving' ? '🗺 Looking up address…'
                   : '📍 Detect My Location'}
                </button>
                {loc.debugInfo && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {loc.debugInfo}
                  </p>
                )}
                <div style={{
                  background: 'var(--surface2)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7,
                }}>
                  <strong style={{ color: 'var(--text)' }}>If it keeps failing on iPhone:</strong>
                  <br />Settings → Privacy & Security → Location Services
                  <br />→ Safari → <strong>While Using the App</strong>
                  <br /><br />
                  <strong style={{ color: 'var(--text)' }}>On Chrome (Android/desktop):</strong>
                  <br />Tap the 🔒 lock icon in the address bar → Allow location
                </div>
                {!loc.isSupported && (
                  <p style={{ fontSize: 11, color: 'var(--accent)' }}>
                    ⚠️ GPS not available in this browser. Use zip code instead.
                  </p>
                )}
              </div>
            )}

            {/* Zip */}
            {method === 'zip' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  US zip codes and Canadian postal codes both work.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }}
                    placeholder="e.g. 93402 or M5V 3A8"
                    value={zipInput}
                    onChange={e => setZipInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loc.lookupZip(zipInput)}
                    maxLength={10}
                  />
                  <button className="btn btn-secondary"
                    onClick={() => loc.lookupZip(zipInput)}
                    disabled={loc.status === 'resolving' || !zipInput.trim()}>
                    {loc.status === 'resolving' ? '…' : '→'}
                  </button>
                </div>
              </div>
            )}

            {/* Plus Code */}
            {method === 'pluscode' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 8,
                  padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7,
                }}>
                  <strong style={{ color: 'var(--text)' }}>How to find your Plus Code:</strong>
                  <br />1. Open <strong>Google Maps</strong> on your phone
                  <br />2. Tap and hold your location until a pin drops
                  <br />3. Tap the red pin — the Plus Code appears at the top
                  <br />4. It looks like <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>85GQ2222+GG</code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    placeholder="e.g. 85GQ2222+GG"
                    value={plusInput}
                    onChange={e => setPlusInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && loc.lookupPlusCode(plusInput)}
                    maxLength={15}
                  />
                  <button className="btn btn-secondary"
                    onClick={() => loc.lookupPlusCode(plusInput)}
                    disabled={loc.status === 'resolving' || !plusInput.trim()}>
                    {loc.status === 'resolving' ? '…' : '⊞'}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Plus Codes are Google's free open location standard — no account needed.
                  Decoded entirely on your device, nothing sent to Google.
                </p>
              </div>
            )}

            {/* Manual */}
            {method === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Describe where you are — the more specific the better.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ flex: 1 }}
                    placeholder="e.g. Pearl Street Mall, Boulder CO"
                    value={manInput}
                    onChange={e => setManInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loc.setManual(manInput)}
                    maxLength={80}
                  />
                  <button className="btn btn-secondary"
                    onClick={() => loc.setManual(manInput)}
                    disabled={!manInput.trim()}>→</button>
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
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                    Location set!
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>
                    {loc.locationDescription}
                  </div>
                  {loc.plusCode && (
                    <div style={{
                      fontSize: 10, color: 'var(--text-muted)', marginTop: 3,
                      fontFamily: 'monospace',
                    }}>
                      ⊞ {loc.plusCode}
                    </div>
                  )}
                </div>
                <button onClick={loc.reset} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-muted)', flexShrink: 0,
                }}>✕</button>
              </div>
            )}
          </div>

          {/* Vibe */}
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
            <p className="section-title" style={{ marginBottom: 10 }}>AI Bot Competitors 🤖</p>
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
              Claude writes squares specific to your exact location and vibe.
              📷 Camera squares require a sneaky photo as proof.
            </p>
          </div>

          <button
            className="btn btn-lg"
            style={{
              background: canCreate
                ? 'linear-gradient(135deg, #a78bfa, #ec4899)'
                : 'var(--surface2)',
              color: '#fff', border: 'none',
            }}
            onClick={handleCreate}
            disabled={!canCreate || loading}
          >
            {loading
              ? (llmStatus === 'generating' ? '✨ Generating…' : 'Creating…')
              : loc.status !== 'done'
              ? '📍 Set your location first'
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
              You'll get your own AI-generated card. Location and vibe match the host's.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleJoin}
              disabled={!canJoin || loading}>
              {loading ? 'Joining…' : '🔗 Join Game'}
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
          <p className="section-title" style={{ marginBottom: 8 }}>How It Works</p>
          <p>📍 Share your location so AI writes location-specific squares</p>
          <p>⊞ Use a Plus Code from Google Maps for pinpoint accuracy</p>
          <p>👁 Spot things around you and tap to mark</p>
          <p>📷 Camera squares need a photo — AI referee verifies it</p>
          <p>⚡ Battle squares are the rarest, most spectacular sightings</p>
          <p>💬 Chat and trash talk with your fellow people watchers</p>
        </div>

        {/* Truth or Dare — no location needed */}
        <div
          onClick={onTruthOrDare}
          style={{
            width: '100%', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
            border: '1.5px dashed rgba(255,77,109,0.55)',
            background: 'rgba(255,77,109,0.06)',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'background 0.15s',
          }}
        >
          <span style={{ fontSize: 30, flexShrink: 0 }}>🕵️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#ff4d6d', marginBottom: 2 }}>
              Truth or Dare
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              No location needed · AI questions · Percilla judges your answers
            </div>
          </div>
          <span style={{ color: '#ff4d6d', fontSize: 18 }}>→</span>
        </div>

      </div>
    </div>
  );
}
