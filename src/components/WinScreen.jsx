// src/components/WinScreen.jsx
export default function WinScreen({ winner, teamColors, onPlayAgain }) {
  const isMe    = winner?.isMe;
  const isBot   = winner?.isBot;
  const primary   = teamColors?.primary   ?? '#1a1a2e';
  const secondary = teamColors?.secondary ?? '#e94560';

  return (
    <div className="page win-screen" style={{
      background: isMe
        ? `radial-gradient(ellipse at center, ${primary}66 0%, var(--bg) 70%)`
        : 'var(--bg)',
    }}>
      <div className="win-emoji">
        {isMe ? '🏆' : isBot ? '🤖' : '😤'}
      </div>
      <div className="confetti-row">
        {isMe ? '🎉🎊🎉' : isBot ? '🤖💣🤖' : '💪🔥💪'}
      </div>
      <div className="win-title" style={{
        color: isMe ? (secondary || 'var(--gold)') : isBot ? 'var(--battle)' : 'var(--text)',
      }}>
        {isMe
          ? 'YOU GOT BINGO!'
          : isBot
          ? `${winner?.name} wins!`
          : `${winner?.name} got BINGO!`}
      </div>
      <div className="win-sub" style={{ marginBottom: 32 }}>
        {isMe
          ? "You crushed it! 🙌 Great game."
          : isBot
          ? "The bot got you this time. Rematch?"
          : "Better luck next period!"}
      </div>

      {teamColors?.name && teamColors.name !== 'Default' && (
        <div style={{
          marginBottom: 24, padding: '8px 20px',
          background: `linear-gradient(90deg, ${primary}, ${secondary})`,
          borderRadius: 20, fontSize: 13, fontWeight: 700,
          color: teamColors.text ?? '#fff',
        }}>
          {teamColors.name}
        </div>
      )}

      <button
        className="btn btn-primary btn-lg"
        onClick={onPlayAgain}
        style={{ background: isMe ? secondary : undefined, maxWidth: 280 }}
      >
        🎮 Play Again
      </button>
    </div>
  );
}
