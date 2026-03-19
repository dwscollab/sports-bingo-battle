// src/components/OpponentBoardModal.jsx
// Full read-only view of an opponent's bingo card

export default function OpponentBoardModal({ player, onClose }) {
  if (!player) return null;

  const card     = player.card || [];
  const colors   = player.colors;
  const primary  = colors?.primary   ?? '#1a1a2e';
  const secondary= colors?.secondary ?? '#e94560';
  const teamText = colors?.text      ?? '#fff';
  const bingoLine = player.bingoLine || null;

  const markedCount = card.filter(sq => sq?.isMarked && !sq?.isFree).length;
  const blockedCount = card.filter(sq => sq?.isBlocked).length;

  return (
    <div className="overlay" style={{ zIndex: 150 }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: `2px solid ${secondary}`,
          borderRadius: 16,
          padding: 16,
          width: '100%',
          maxWidth: 400,
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: `0 0 40px ${primary}55`,
        }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${primary}, ${primary}99)`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: teamText }}>
              {player.isBot ? '🤖 ' : ''}{player.name}
            </div>
            {colors?.name && (
              <div style={{ fontSize: 11, color: teamText, opacity: 0.7 }}>{colors.name}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: teamText, opacity: 0.8 }}>
              {markedCount}/24 marked
            </div>
            {blockedCount > 0 && (
              <div style={{ fontSize: 11, color: teamText, opacity: 0.6 }}>
                {blockedCount} blocked
              </div>
            )}
            {player.bingo && (
              <div style={{
                marginTop: 4, background: secondary, color: teamText,
                borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
              }}>
                🏆 BINGO!
              </div>
            )}
          </div>
        </div>

        {/* BINGO letters */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 3, marginBottom: 3,
        }}>
          {'BINGO'.split('').map(l => (
            <div key={l} style={{
              textAlign: 'center', fontWeight: 900, fontSize: 14,
              color: secondary, padding: '4px 0',
            }}>{l}</div>
          ))}
        </div>

        {/* Board */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {card.map((sq, idx) => {
            if (!sq) return <div key={idx} style={{ aspectRatio: '1' }} />;
            const isWin     = bingoLine?.includes(idx);
            const isMarked  = sq.isMarked;
            const isBlocked = sq.isBlocked;
            const isFree    = sq.isFree;

            let bg      = 'var(--surface2)';
            let border  = 'var(--border)';
            let txtColor = 'var(--text)';

            if (isFree)    { bg = `${primary}55`; border = secondary; txtColor = secondary; }
            if (isMarked && !isFree)  { bg = primary; border = secondary; txtColor = teamText; }
            if (isBlocked) { bg = '#1a0a0a'; border = '#440000'; txtColor = '#660000'; }
            if (isWin)     { border = secondary; }

            return (
              <div key={idx} style={{
                aspectRatio: '1', borderRadius: 6,
                border: `1.5px solid ${border}`,
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 3, position: 'relative',
                boxShadow: isWin ? `0 0 8px ${secondary}` : undefined,
                animation: isWin ? 'winPulse 0.6s infinite alternate' : undefined,
              }}>
                {isBlocked
                  ? <span style={{ fontSize: 14 }}>🚫</span>
                  : <span style={{
                      fontSize: 'clamp(6px, 1.6vw, 9px)',
                      textAlign: 'center', lineHeight: 1.2,
                      color: txtColor, fontWeight: isMarked ? 700 : 500,
                    }}>
                      {sq.text}
                    </span>
                }
                {/* Tiny icons */}
                {!isMarked && !isBlocked && !isFree && (sq.battle || sq.camera) && (
                  <span style={{ position: 'absolute', top: 1, right: 1, fontSize: 6 }}>
                    {sq.battle ? '⚡' : '📷'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 12,
          background: 'var(--surface2)', borderRadius: 8, height: 6,
          overflow: 'hidden', border: '1px solid var(--border)',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round((markedCount / 24) * 100)}%`,
            background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            borderRadius: 8, transition: 'width 0.4s',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 4, fontSize: 10, color: 'var(--text-muted)',
        }}>
          <span>{Math.round((markedCount / 24) * 100)}% complete</span>
          {player.battleShots > 0 && <span>💣 {player.battleShots} battle shot{player.battleShots > 1 ? 's' : ''}</span>}
        </div>

        {/* Close */}
        <button
          className="btn btn-secondary"
          onClick={onClose}
          style={{ width: '100%', marginTop: 14 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
