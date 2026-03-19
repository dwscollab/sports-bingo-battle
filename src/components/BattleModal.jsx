// src/components/BattleModal.jsx
import { useState } from 'react';
import BingoSquare from './BingoSquare.jsx';

export default function BattleModal({ players, roomData, onFire, onClose }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);

  const targetPlayerData = selectedPlayer
    ? roomData?.players?.[selectedPlayer]
    : null;

  const targetCard = targetPlayerData?.card || [];

  const handleSquareTap = (idx) => {
    const sq = targetCard[idx];
    if (!sq || sq.isMarked || sq.isBlocked || sq.isFree) return;
    setSelectedSquare(idx);
  };

  const handleFire = () => {
    if (selectedPlayer === null || selectedSquare === null) return;
    onFire(selectedPlayer, selectedSquare);
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-title">⚡ Battle Shot!</div>
        <div className="modal-sub">
          You earned a Battle Shot with a special BINGO!
          Pick an opponent and block one of their unmarked squares.
        </div>

        {/* Step 1: Pick a player */}
        {!selectedPlayer && (
          <>
            <p className="section-title" style={{ marginBottom: 10 }}>Choose your target:</p>
            <div className="target-player-list">
              {players.map(([pid, player]) => (
                <button
                  key={pid}
                  className="target-player-btn"
                  onClick={() => setSelectedPlayer(pid)}
                >
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <div>
                    <div>{player.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🎽 {player.team}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Pick a square on their card */}
        {selectedPlayer && (
          <>
            <p style={{ marginBottom: 8, fontSize: 13 }}>
              Tap an unmarked square on <strong>{targetPlayerData?.name}'s</strong> card to block it:
            </p>

            {/* Mini BINGO header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 3,
                marginBottom: 3,
              }}
            >
              {'BINGO'.split('').map(l => (
                <div key={l} style={{ textAlign: 'center', fontWeight: 900, color: 'var(--gold)', fontSize: 12 }}>
                  {l}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 3,
              }}
            >
              {targetCard.map((sq, idx) => {
                const isSelectable = !sq.isMarked && !sq.isBlocked && !sq.isFree;
                const isSelected   = selectedSquare === idx;
                return (
                  <div
                    key={sq.id || idx}
                    onClick={() => isSelectable && handleSquareTap(idx)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 6,
                      border: `1.5px solid ${
                        isSelected   ? 'var(--battle)' :
                        !isSelectable ? 'var(--border)' :
                        'var(--border)'
                      }`,
                      background: isSelected
                        ? 'rgba(255,107,53,0.3)'
                        : sq.isMarked ? 'var(--green)'
                        : sq.isBlocked ? '#1a0a0a'
                        : sq.isFree ? 'var(--blue)'
                        : 'var(--surface2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 2,
                      cursor: isSelectable ? 'crosshair' : 'not-allowed',
                      opacity: isSelectable ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontSize: '6px', textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>
                      {sq.isFree ? '⭐' : sq.isBlocked ? '🚫' : sq.isMarked ? '✅' : sq.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedSquare !== null && (
              <p style={{ fontSize: 12, color: 'var(--battle)', marginTop: 8, textAlign: 'center' }}>
                Selected: "{targetCard[selectedSquare]?.text}"
              </p>
            )}
          </>
        )}

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (selectedPlayer) { setSelectedPlayer(null); setSelectedSquare(null); }
              else onClose();
            }}
          >
            {selectedPlayer ? '← Back' : 'Cancel'}
          </button>
          {selectedPlayer && (
            <button
              className="btn btn-battle"
              onClick={handleFire}
              disabled={selectedSquare === null}
            >
              💣 Fire!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
