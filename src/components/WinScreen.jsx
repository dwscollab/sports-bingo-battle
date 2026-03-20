// src/components/WinScreen.jsx
export default function WinScreen({ winner, teamColors, chatMessages = [], onPlayAgain }) {
  const isMe  = winner?.isMe;
  const isBot = winner?.isBot;
  const primary   = teamColors?.primary   ?? '#1a1a2e';
  const secondary = teamColors?.secondary ?? '#e94560';

  // Pull all selfie images from chat
  const selfies = chatMessages
    .filter(msg => msg.isSelfie && msg.selfieDataUrl)
    .slice(-9); // max 9 in the collage

  return (
    <div className="page win-screen" style={{
      background: isMe
        ? `radial-gradient(ellipse at center, ${primary}66 0%, var(--bg) 70%)`
        : 'var(--bg)',
      paddingBottom: 40,
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
      <div className="win-sub" style={{ marginBottom: 24 }}>
        {isMe
          ? "You crushed it! 🙌 Great game."
          : isBot
          ? "The bot got you this time. Rematch?"
          : "Better luck next period!"}
      </div>

      {teamColors?.name && teamColors.name !== 'Default' && (
        <div style={{
          marginBottom: 20, padding: '8px 20px',
          background: `linear-gradient(90deg, ${primary}, ${secondary})`,
          borderRadius: 20, fontSize: 13, fontWeight: 700,
          color: teamColors.text ?? '#fff',
        }}>
          {teamColors.name}
        </div>
      )}

      {/* Selfie collage */}
      {selfies.length > 0 && (
        <div style={{ width: '100%', marginBottom: 24 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 10, textAlign: 'center',
          }}>
            🧊 Icing Selfies
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${selfies.length === 1 ? 1 : selfies.length <= 4 ? 2 : 3}, 1fr)`,
            gap: 6,
            width: '100%',
          }}>
            {selfies.map((msg, i) => (
              <div key={i} style={{
                position: 'relative',
                borderRadius: 10,
                overflow: 'hidden',
                border: `2px solid ${secondary}66`,
                aspectRatio: '1',
                background: '#000',
              }}>
                <img
                  src={msg.selfieDataUrl}
                  alt={`${msg.name} selfie`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                  padding: '12px 6px 5px',
                  fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center',
                }}>
                  {msg.name}
                </div>
              </div>
            ))}
          </div>
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
