// src/components/WaitingRoom.jsx

const SPORT_LABELS = { hockey: '🏒 Hockey', nfl: '🏈 NFL', nba: '🏀 NBA' };
const LOC_LABELS   = { liveGame: '🏟️ Live Game', sportsBar: '🍺 Sports Bar', home: '🛋️ Home' };
const AVATAR_COLORS = ['#e94560','#0f3460','#533483','#00b894','#e17055','#6c5ce7'];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function WaitingRoom({ roomCode, roomData, playerId, isHost, onStartGame }) {
  const allPlayers  = Object.entries(roomData?.players || {});
  const humanCount  = allPlayers.filter(([, p]) => !p.isBot).length;
  const botCount    = allPlayers.filter(([, p]) =>  p.isBot).length;
  const sport       = SPORT_LABELS[roomData?.sport] || roomData?.sport;
  const loc         = LOC_LABELS[roomData?.location]  || roomData?.location;
  const canStart    = humanCount >= 1; // host can start solo (bots fill in)

  return (
    <div className="page">
      <div className="logo">
        <div style={{ fontSize: 36, marginBottom: 6 }}>🎮</div>
        <div className="logo-title" style={{ fontSize: 22 }}>Room Ready!</div>
        <div className="logo-sub">Share the code below to invite friends</div>
      </div>

      {/* Room code */}
      <div className="room-code-display" style={{ width: '100%', marginBottom: 16 }}>
        <div className="code">{roomCode}</div>
        <p>4-letter code — everyone types this to join</p>
      </div>

      {/* Tags */}
      <div style={{ width: '100%', display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <span className="tag">{sport}</span>
        <span className="tag">{loc}</span>
        {botCount > 0 && <span className="tag" style={{ color: 'var(--text-muted)' }}>🤖 {botCount} bot{botCount > 1 ? 's' : ''}</span>}
      </div>

      {/* Player list */}
      <div style={{ width: '100%' }}>
        <p className="section-title" style={{ marginBottom: 10 }}>
          Players ({humanCount}{botCount > 0 ? ` + ${botCount} 🤖` : ''})
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Human players */}
          {allPlayers.filter(([, p]) => !p.isBot).map(([pid, player], idx) => {
            const colors = player.colors;
            return (
              <div className="player-chip" key={pid} style={{
                borderLeft: colors ? `3px solid ${colors.primary}` : undefined,
              }}>
                <div className="player-avatar" style={{
                  background: colors
                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                    : AVATAR_COLORS[idx % AVATAR_COLORS.length],
                  color: colors?.text ?? '#fff',
                }}>
                  {initials(player.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="name">{player.name}</div>
                  <div className="team" style={{ color: colors?.primary ?? 'var(--text-muted)' }}>
                    🎽 {player.team || 'No team'}
                  </div>
                </div>
                {pid === playerId && (
                  <span className="you-tag">YOU</span>
                )}
                {pid === roomData?.host && pid !== playerId && (
                  <span className="you-tag" style={{ background: 'var(--gold)', color: '#111' }}>HOST</span>
                )}
                {pid === roomData?.host && pid === playerId && (
                  <span className="you-tag" style={{ background: 'var(--gold)', color: '#111' }}>YOU · HOST</span>
                )}
              </div>
            );
          })}

          {/* Bot players */}
          {allPlayers.filter(([, p]) => p.isBot).map(([bid, bot]) => {
            const colors = bot.colors;
            return (
              <div key={bid} className="bot-chip">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: colors
                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                    : 'var(--surface)',
                  border: '1px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  🤖
                </div>
                <div style={{ flex: 1 }}>
                  <div className="bot-name">{bot.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {colors?.name ?? 'AI Competitor'} · auto-marks squares
                  </div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 7px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)',
                }}>BOT</span>
              </div>
            );
          })}
        </div>

        {humanCount < 2 && botCount === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }} className="pulse">
            Waiting for more players to join…
          </p>
        )}
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <div style={{ width: '100%', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary btn-lg" onClick={onStartGame} disabled={!canStart}>
            🚀 Start Game
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            {botCount > 0
              ? `${botCount} bot${botCount > 1 ? 's' : ''} will compete against you`
              : 'Start once everyone has joined'}
          </p>
        </div>
      )}

      {!isHost && (
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }} className="pulse">
          ⏳ Waiting for the host to start…
        </p>
      )}
    </div>
  );
}
