// src/components/ChatBox.jsx
import { useState, useEffect, useRef, useCallback } from 'react';

const TRASH_TALK = [
  "Your card is looking lonely 😢",
  "I can smell the BINGO coming 👀",
  "Nice try blocking me 😤",
  "Is that all you got? 🥱",
  "One square away… 👀",
  "Bet you can't get BINGO before me 🎯",
  "That was a terrible play 💀",
];

export default function ChatBox({
  messages, onSend, playerName, teamColors,
  isOpen, onToggle, unreadCount,
  allPlayers = [], // [{ id, name, isBot }] for @ mentions
}) {
  const [input,       setInput]       = useState('');
  const [showSugg,    setShowSugg]    = useState(false);
  const [mentionQuery,setMentionQuery]= useState(''); // text after @
  const [showMention, setShowMention] = useState(false);
  const [mentionIdx,  setMentionIdx]  = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const primary   = teamColors?.primary ?? '#e94560';
  const textColor = teamColors?.text    ?? '#fff';

  // Auto-scroll to latest
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Build mention candidates from allPlayers
  const mentionCandidates = allPlayers.filter(p =>
    p.name && p.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Detect @ in input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    // Find last @ position
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      // Only show if no space after the @ (still typing the name)
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setMentionQuery(afterAt);
        setShowMention(true);
        setMentionIdx(0);
        return;
      }
    }
    setShowMention(false);
    setMentionQuery('');
  };

  const insertMention = useCallback((player) => {
    const lastAt = input.lastIndexOf('@');
    const before = input.slice(0, lastAt);
    const newVal = `${before}@${player.name} `;
    setInput(newVal);
    setShowMention(false);
    setMentionQuery('');
    inputRef.current?.focus();
  }, [input]);

  const handleKey = (e) => {
    if (showMention && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionCandidates.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionCandidates[mentionIdx]); return; }
      if (e.key === 'Escape')    { setShowMention(false); return; }
    }
    if (e.key === 'Enter' && !showMention) handleSend();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
    setShowMention(false);
    setShowSugg(false);
  };

  // Highlight @mentions in message text
  const renderText = (text) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ color: primary, fontWeight: 700 }}>{part}</span>
        : part
    );
  };

  return (
    <>
      {/* Float button */}
      <button onClick={onToggle} style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 80,
        width: 52, height: 52, borderRadius: '50%',
        background: isOpen ? 'var(--surface)' : primary,
        border: `2px solid ${isOpen ? 'var(--border)' : primary}`,
        cursor: 'pointer', fontSize: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.2s ease',
      }}>
        {isOpen ? '✕' : '💬'}
        {!isOpen && unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#ff4444', border: '2px solid var(--bg)',
            fontSize: 9, color: '#fff', fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 84, right: 16, left: 16,
          maxWidth: 380, marginLeft: 'auto',
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 79, display: 'flex', flexDirection: 'column',
          maxHeight: 380, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            background: `linear-gradient(90deg, ${primary}cc, ${primary}66)`,
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: textColor }}>Trash Talk</span>
            <span style={{ fontSize: 10, color: textColor, opacity: 0.6, marginLeft: 4 }}>
              Type @ to mention someone
            </span>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '12px 0' }}>
                No trash talk yet… start something 😈
              </p>
            )}
            {messages.map((msg, i) => {
              const isMe   = msg.name === playerName;
              const isFeed = !!msg.isFeed;
              const msgPrimary = msg.colors?.primary ?? 'var(--surface2)';
              const msgText    = msg.colors?.text    ?? 'var(--text)';

              // Feed events — centered pill
              if (isFeed) {
                return (
                  <div key={i} style={{ textAlign: 'center', margin: '2px 0' }}>
                    <span style={{
                      display: 'inline-block',
                      background: 'rgba(26,58,92,0.8)',
                      border: '1px solid #99d9d944',
                      borderRadius: 20, padding: '4px 12px',
                      fontSize: 11, color: '#99d9d9', fontWeight: 600,
                    }}>
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: 6,
                }}>
                  {!isMe && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: msgPrimary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: msgText,
                    }}>
                      {msg.isBot ? '🤖' : msg.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>
                        {msg.name}
                      </div>
                    )}
                    {msg.isSelfie && msg.selfieDataUrl ? (
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid #99d9d9` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#99d9d9', padding: '4px 8px', background: 'rgba(0,48,96,0.8)' }}>
                          🧊 Icing selfie!
                        </div>
                        <img src={msg.selfieDataUrl} alt="selfie"
                          style={{ width: '100%', maxWidth: 180, display: 'block', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{
                        padding: '7px 10px',
                        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: isMe ? primary : 'var(--surface2)',
                        color: isMe ? textColor : 'var(--text)',
                        fontSize: 13, lineHeight: 1.4,
                        border: `1px solid ${isMe ? primary + '88' : 'var(--border)'}`,
                      }}>
                        {renderText(msg.text)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* @ Mention autocomplete */}
          {showMention && mentionCandidates.length > 0 && (
            <div style={{
              borderTop: '1px solid var(--border)',
              background: 'var(--surface2)',
              maxHeight: 140, overflowY: 'auto',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 12px 2px', fontWeight: 700, letterSpacing: '0.06em' }}>
                MENTION
              </div>
              {mentionCandidates.map((p, i) => (
                <button key={p.id || p.name} onMouseDown={() => insertMention(p)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: i === mentionIdx ? `${primary}22` : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderLeft: i === mentionIdx ? `3px solid ${primary}` : '3px solid transparent',
                  color: 'var(--text)', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 16 }}>{p.isBot ? '🤖' : '👤'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>@{p.name}</div>
                    {p.isBot && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AI Bot · will respond</div>}
                    {!p.isBot && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Player · will get notified</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick suggestions */}
          {showSugg && (
            <div style={{
              borderTop: '1px solid var(--border)', padding: '6px 8px',
              display: 'flex', flexWrap: 'wrap', gap: 4,
              maxHeight: 90, overflowY: 'auto', flexShrink: 0,
            }}>
              {TRASH_TALK.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); setShowSugg(false); }} style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '4px 10px', fontSize: 11,
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{
            padding: '8px 10px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
          }}>
            <button onClick={() => setShowSugg(s => !s)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, padding: '0 4px',
              color: showSugg ? primary : 'var(--text-muted)',
            }} title="Quick trash talk">
              😈
            </button>
            <input
              ref={inputRef}
              className="input"
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              placeholder="Talk trash… @ to mention"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              maxLength={140}
              autoComplete="off"
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{
              background: primary, border: 'none', borderRadius: 8,
              padding: '8px 12px', cursor: 'pointer', fontSize: 16,
              opacity: input.trim() ? 1 : 0.4,
            }}>
              📤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
