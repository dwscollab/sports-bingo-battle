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
  } else if (isFree && primary) {
    inlineStyle = {
      background: `linear-gradient(135deg, ${primary}aa, ${primary}44)`,
      borderColor: secondary || 'var(--gold)',
    };
  } else if (isWinning && secondary) {
    inlineStyle = { boxShadow: `0 0 14px ${secondary}`, borderColor: secondary };
  }

  return (
    <div className={classes} style={inlineStyle} onClick={onTap}>
      {!isBlocked && (
        <>
          <span className="sq-text" style={{ color: isMarked && teamColors ? teamColors.text : undefined }}>
            {text}
          </span>
          {/* Icons in corner */}
          {!isMarked && !isFree && (
            <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, display: 'flex', gap: 1 }}>
              {battle && <span>⚡</span>}
              {camera && <span>📷</span>}
              {llmGenerated && !battle && !camera && <span style={{ opacity: 0.4 }}>✨</span>}
            </span>
          )}
        </>
      )}
    </div>
  );
}
