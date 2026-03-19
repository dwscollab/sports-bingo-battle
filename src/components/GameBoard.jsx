// src/components/GameBoard.jsx
import { useState, useEffect, useRef } from 'react';
import BingoSquare from './BingoSquare.jsx';
import BattleModal from './BattleModal.jsx';
import CameraVerifyModal from './CameraVerifyModal.jsx';
import ChatBox from './ChatBox.jsx';
import OpponentBoardModal from './OpponentBoardModal.jsx';

const SPORT_LABELS = { hockey: '🏒', nfl: '🏈', nba: '🏀' };
const STATUS_CONFIG = {
  live:      { dot: '#00ff88', label: 'LIVE',     pulse: true  },
  'pre-game':{ dot: '#ffd700', label: 'PRE-GAME', pulse: true  },
  final:     { dot: '#888',    label: 'FINAL',    pulse: false },
  searching: { dot: '#ffd700', label: 'FINDING…', pulse: true  },
  'no-game': { dot: '#555',    label: 'NO GAME',  pulse: false },
  error:     { dot: '#ff4444', label: 'API ERR',  pulse: false },
  idle:      { dot: '#555',    label: '',         pulse: false },
};

function LiveBadge({ status, gameInfo }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  if (!cfg.label) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(0,0,0,0.45)', borderRadius: 20,
      padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: cfg.dot,
        display: 'inline-block',
        animation: cfg.pulse ? 'pulse 1.2s infinite' : 'none',
      }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#ccc', letterSpacing: '0.05em' }}>
        {cfg.label}
      </span>
      {gameInfo && status === 'live' && (
        <span style={{ fontSize: 10, color: '#aaa' }}>
          {gameInfo.awayTeam?.abbr} {gameInfo.awayTeam?.score}–{gameInfo.homeTeam?.score} {gameInfo.homeTeam?.abbr} P{gameInfo.period}
        </span>
      )}
    </div>
  );
}

export default function GameBoard({
  roomCode, roomData, playerId, playerName,
  teamColors, gameInfo, connectionStatus,
  onMarkSquare, onUnmarkSquare, onBattleShot,
  chatMessages, onSendChat, addToast,
}) {
  const [showBattleModal,   setShowBattleModal]   = useState(false);
  const [cameraSquare,      setCameraSquare]       = useState(null);
  const [chatOpen,          setChatOpen]           = useState(false);
  const [viewingOpponent,   setViewingOpponent]    = useState(null); // player object
  const [unreadCount,       setUnreadCount]        = useState(0);
  const prevMsgCount = useRef(0);

  const myPlayer    = roomData?.players?.[playerId];
  const allPlayers  = Object.entries(roomData?.players || {});
  const card        = myPlayer?.card || [];
  const bingoLine   = myPlayer?.bingoLine || null;
  const battleShots = myPlayer?.battleShots || 0;
  const sport       = roomData?.sport || 'hockey';
  const location    = roomData?.location || 'home';
  const markedCount = card.filter(sq => sq?.isMarked && !sq?.isFree).length;
  const otherPlayers = allPlayers.filter(([pid]) => pid !== playerId);

  const primary   = teamColors?.primary   ?? '#1a1a2e';
  const secondary = teamColors?.secondary ?? '#e94560';
  const teamText  = teamColors?.text      ?? '#fff';

  // Track unread chat messages
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
      prevMsgCount.current = chatMessages.length;
    } else {
      const newMsgs = chatMessages.length - prevMsgCount.current;
      if (newMsgs > 0) setUnreadCount(n => n + newMsgs);
      prevMsgCount.current = chatMessages.length;
    }
  }, [chatMessages.length, chatOpen]);

  const handleSquareTap = (idx) => {
    const sq = card[idx];
    if (!sq || sq.isFree) return;

    // Tap a marked square to UNMARK (unless it's part of the winning line)
    if (sq.isMarked && !sq.isBlocked) {
      if (bingoLine?.includes(idx)) {
        addToast("Can't unmark a winning square!", 'battle');
        return;
      }
      onUnmarkSquare(idx);
      return;
    }

    if (sq.isBlocked) return;

    // Camera squares open verify modal at live/bar
    if (sq.camera && (location === 'liveGame' || location === 'sportsBar')) {
      setCameraSquare({ square: sq, index: idx });
      return;
    }

    onMarkSquare(idx);
  };

  return (
    <div className="page" style={{ paddingBottom: 90 }}>

      {/* Team-colored header */}
      <div style={{
        width: '100%',
        background: `linear-gradient(135deg, ${primary}ee, ${primary}99)`,
        border: `1px solid ${secondary}44`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: teamText, opacity: 0.6, letterSpacing: '0.08em' }}>
            {SPORT_LABELS[sport]} · ROOM {roomCode}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: teamText }}>{playerName}</div>
          {teamColors?.name && teamColors.name !== 'Default' && (
            <div style={{ fontSize: 10, color: teamText, opacity: 0.5 }}>{teamColors.name}</div>
          )}
          {roomData?.gameLabel && (
            <div style={{ fontSize: 11, color: teamText, opacity: 0.7, marginTop: 2 }}>
              🏒 {roomData.gameLabel}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {sport === 'hockey' && <LiveBadge status={connectionStatus} gameInfo={gameInfo} />}
          {battleShots > 0 && (
            <button className="battle-shots-badge" onClick={() => setShowBattleModal(true)}>
              💣 {battleShots}
            </button>
          )}
        </div>
      </div>

      {/* BINGO letters */}
      <div className="bingo-header-row">
        {'BINGO'.split('').map(l => (
          <div key={l} className="bingo-header-cell" style={{ color: secondary }}>{l}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="bingo-grid">
        {card.map((sq, idx) => (
          <BingoSquare
            key={sq?.id || idx}
            square={sq}
            isWinning={bingoLine?.includes(idx)}
            teamColors={teamColors}
            onTap={() => handleSquareTap(idx)}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚡ Battle</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📷 Camera</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>tap again to unmark</span>
      </div>

      {/* Opponents — tap to view their full board */}
      {otherPlayers.length > 0 && (
        <div style={{ width: '100%', marginTop: 16 }}>
          <p className="section-title">Opponents <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— tap to view board</span></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherPlayers.map(([pid, player]) => {
              const theirCard    = player.card || [];
              const theirMarked  = theirCard.filter(sq => sq?.isMarked && !sq?.isFree).length;
              const total        = theirCard.filter(sq => !sq?.isFree).length || 24;
              const pct          = Math.round((theirMarked / total) * 100);
              const tc           = player.colors;
              return (
                <button
                  key={pid}
                  onClick={() => setViewingOpponent(player)}
                  className="score-row"
                  style={{
                    borderLeft: tc ? `3px solid ${tc.primary}` : undefined,
                    cursor: 'pointer',
                    background: 'var(--surface2)',
                    border: `1px solid var(--border)`,
                    borderLeftColor: tc?.primary,
                    borderLeftWidth: tc ? 3 : 1,
                    textAlign: 'left', width: '100%',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: tc ? `linear-gradient(135deg, ${tc.primary}, ${tc.secondary})` : 'var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: tc?.text ?? '#fff',
                  }}>
                    {player.isBot ? '🤖' : player.name?.[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="score-name" style={{ flex: 1 }}>
                    {player.name}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {player.isBot ? 'AI Bot' : player.team}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div style={{ width: 60 }}>
                    <div style={{
                      height: 4, borderRadius: 4,
                      background: 'var(--surface)',
                      overflow: 'hidden', marginBottom: 2,
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: tc ? `linear-gradient(90deg, ${tc.primary}, ${tc.secondary})` : 'var(--green)',
                        borderRadius: 4,
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{pct}%</div>
                  </div>

                  {player.bingo
                    ? <span className="score-bingo">🏆</span>
                    : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👁</span>
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* My Progress */}
      <div style={{ width: '100%', marginTop: 12 }}>
        <p className="section-title">Your Progress</p>
        <div style={{
          background: 'var(--surface2)', borderRadius: 8, height: 8,
          overflow: 'hidden', border: '1px solid var(--border)',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round((markedCount / 24) * 100)}%`,
            background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            transition: 'width 0.4s ease', borderRadius: 8,
          }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
          {markedCount} / 24 squares
        </p>
      </div>

      {/* Modals */}
      {showBattleModal && (
        <BattleModal
          players={otherPlayers}
          onFire={(targetPid, idx) => { onBattleShot(targetPid, idx); setShowBattleModal(false); }}
          onClose={() => setShowBattleModal(false)}
          roomData={roomData}
        />
      )}

      {cameraSquare && (
        <CameraVerifyModal
          square={cameraSquare.square}
          sport={sport}
          location={location}
          onVerified={() => {
            onMarkSquare(cameraSquare.index);
            setCameraSquare(null);
            addToast('📷 Camera verified! Square marked!', 'success');
          }}
          onClose={() => setCameraSquare(null)}
        />
      )}

      {viewingOpponent && (
        <OpponentBoardModal
          player={viewingOpponent}
          onClose={() => setViewingOpponent(null)}
        />
      )}

      {/* Chat */}
      <ChatBox
        messages={chatMessages}
        onSend={onSendChat}
        playerName={playerName}
        teamColors={teamColors}
        isOpen={chatOpen}
        onToggle={() => { setChatOpen(o => !o); setUnreadCount(0); }}
        unreadCount={unreadCount}
      />
    </div>
  );
}
