// src/components/ChatBox.jsx
import { useState, useEffect, useRef } from 'react';

const TRASH_TALK_SUGGESTIONS = [
  "Your card is looking lonely 😢",
  "I can smell the BINGO coming 👀",
  "Nice try blocking me 😤",
  "Is that all you got? 🥱",
  "Your bots are better than you 🤖",
  "One square away… 👀",
];

export default function ChatBox({ messages, onSend, playerName, teamColors, isOpen, onToggle }) {
  const [input, setInput]   = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const bottomRef = useRef(null);

  const primary   = teamColors?.primary   ?? '#e94560';
  const textColor = teamColors?.text      ?? '#fff';

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
    setShowSugg(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 80,
          width: 52, height: 52, borderRadius: '50%',
          background: isOpen ? 'var(--surface)' : primary,
          border: `2px solid ${isOpen ? 'var(--border)' : primary}`,
          cursor: 'pointer', fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        {isOpen ? '✕' : '💬'}
        {/* Unread dot */}
        {!isOpen && messages.length > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#ff4444', border: '2px solid var(--bg)',
            fontSize: 8, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900,
          }}>
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 84, right: 16, left: 16,
          maxWidth: 360, marginLeft: 'auto',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 79,
          display: 'flex', flexDirection: 'column',
          maxHeight: 320,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            background: `linear-gradient(90deg, ${primary}cc, ${primary}66)`,
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: textColor }}>Trash Talk</span>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '12px 0' }}>
                No trash talk yet… start something 😈
              </p>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.name === playerName;
              const msgPrimary = msg.colors?.primary ?? 'var(--surface2)';
              const msgText    = msg.colors?.text    ?? 'var(--text)';
              return (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: 6,
                }}>
                  {/* Avatar */}
                  {!isMe && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: msgPrimary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: msgText,
                    }}>
                      {msg.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>
                        {msg.name}
                      </div>
                    )}
                    <div style={{
                      padding: '7px 10px',
                      borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: isMe ? primary : 'var(--surface2)',
                      color: isMe ? textColor : 'var(--text)',
                      fontSize: 13, lineHeight: 1.4,
                      border: `1px solid ${isMe ? primary + '88' : 'var(--border)'}`,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSugg && (
            <div style={{
              borderTop: '1px solid var(--border)',
              padding: '6px 8px',
              display: 'flex', flexWrap: 'wrap', gap: 4,
              maxHeight: 90, overflowY: 'auto',
            }}>
              {TRASH_TALK_SUGGESTIONS.map((s, i) => (
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
            padding: '8px 10px',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <button
              onClick={() => setShowSugg(s => !s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, padding: '0 4px', color: showSugg ? primary : 'var(--text-muted)',
              }}
              title="Quick trash talk"
            >
              😈
            </button>
            <input
              className="input"
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              placeholder="Talk trash…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={120}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                background: primary, border: 'none', borderRadius: 8,
                padding: '8px 12px', cursor: 'pointer', fontSize: 16,
                opacity: input.trim() ? 1 : 0.4,
              }}
            >
              📤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
