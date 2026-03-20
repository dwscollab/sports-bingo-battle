// src/components/BingoSquare.jsx

export default function BingoSquare({ square, isWinning, teamColors, onTap }) {
  if (!square) return <div className="sq" />;
  const { isMarked, isBlocked, isFree, battle, camera, text, llmGenerated } = square;

  const primary   = teamColors?.primary   ?? null;
  const secondary = teamColors?.secondary ?? null;

  const classes = [
    'sq',
    isMarked  ? 'marked'   : '',
    isBlocked ? 'blocked'  : '',
    isFree    ? 'free'     : '',
    battle && !isMarked && !isBlocked ? 'battle-sq' : '',
    camera && !isMarked && !isBlocked ? 'camera-sq' : '',
    isWinning ? 'winning'  : '',
  ].filter(Boolean).join(' ');

  let inlineStyle = {};

  if (isMarked && primary && !isFree) {
    inlineStyle = { background: primary, borderColor: secondary || primary };
  } else if (isFree) {
    if (isMarked) {
      // Team won — glowing earned state
      inlineStyle = {
        background: primary
          ? `linear-gradient(135deg, ${secondary || primary}, ${primary}cc)`
          : 'linear-gradient(135deg, var(--gold), #b8860b)',
        borderColor: secondary || 'var(--gold)',
        boxShadow: `0 0 16px ${secondary || 'var(--gold)'}88`,
      };
    } else {
      // Not yet earned — locked dashed state
      inlineStyle = {
        background: 'var(--surface2)',
        border: '1.5px dashed var(--border)',
        opacity: 0.55,
      };
    }
  } else if (isWinning && secondary) {
    inlineStyle = { boxShadow: `0 0 14px ${secondary}`, borderColor: secondary };
  }

  return (
    <div className={classes} style={inlineStyle} onClick={onTap}>
      {!isBlocked && (
        <>
          <span className="sq-text" style={{
            color: isMarked && teamColors && !isFree ? teamColors.text : undefined,
            fontSize: isFree && isMarked ? 'clamp(6px, 1.4vw, 9px)' : undefined,
          }}>
            {text}
          </span>
          {!isMarked && !isFree && (
            <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, display: 'flex', gap: 1 }}>
              {battle && <span>⚡</span>}
              {camera && <span>📷</span>}
              {llmGenerated && !battle && !camera && <span style={{ opacity: 0.4 }}>✨</span>}
            </span>
          )}
          {isFree && !isMarked && (
            <span style={{ fontSize: 14 }}>🔒</span>
          )}
        </>
      )}
    </div>
  );
}
