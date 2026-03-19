// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { db } from './firebase.js';
import { ref, set, onValue, off, update, serverTimestamp, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import Lobby          from './components/Lobby.jsx';
import WaitingRoom    from './components/WaitingRoom.jsx';
import GameBoard      from './components/GameBoard.jsx';
import WinScreen      from './components/WinScreen.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { useNHLFeed }    from './hooks/useNHLFeed.js';
import { useLLMSquares } from './hooks/useLLMSquares.js';
import { useAIPlayer }   from './hooks/useAIPlayer.js';
import { getTeamColors, buildTeamTheme } from './data/teamColors.js';
import { createBotPlayer } from './data/botPlayers.js';

export default function App() {
  const [screen,     setScreen]     = useState('lobby');
  const [playerId]                  = useState(() => {
    let id = sessionStorage.getItem('bingo_pid');
    if (!id) { id = uuidv4(); sessionStorage.setItem('bingo_pid', id); }
    return id;
  });
  const [playerName, setPlayerName] = useState('');
  const [playerTeam, setPlayerTeam] = useState('');
  const [roomCode,   setRoomCode]   = useState('');
  const [roomData,   setRoomData]   = useState(null);
  const [teamColors, setTeamColors] = useState(null);
  const [toasts,     setToasts]     = useState([]);
  const [winner,     setWinner]     = useState(null);
  const [isHost,     setIsHost]     = useState(false);

  const { generateLLMCard, status: llmStatus } = useLLMSquares();
  const sport = roomData?.sport ?? 'hockey';

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Team CSS vars ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerTeam) return;
    const colors = getTeamColors(sport, playerTeam);
    setTeamColors(colors);
    Object.entries(buildTeamTheme(colors))
      .forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [playerTeam, sport]);

  // ── NHL live feed ─────────────────────────────────────────────────────────
  const { gameInfo, autoMarkPatterns, clearAutoMark, connectionStatus } = useNHLFeed({
    sport, myTeamAbbr: playerTeam, enabled: screen === 'game',
  });

  // ── Auto-mark my own card from NHL feed ───────────────────────────────────
  useEffect(() => {
    if (!autoMarkPatterns.length || !roomData) return;
    const myPlayer = roomData.players?.[playerId];
    if (!myPlayer?.card) return;

    const card = myPlayer.card.map(sq => ({ ...sq }));
    let changed = false;
    const markedTexts = [];

    for (const pattern of autoMarkPatterns) {
      const lower = pattern.toLowerCase();
      card.forEach((sq, idx) => {
        if (sq.isMarked || sq.isBlocked || sq.isFree) return;
        if (sq.text.toLowerCase().includes(lower)) {
          card[idx] = { ...sq, isMarked: true };
          changed = true;
          markedTexts.push(sq.text);
        }
      });
    }

    if (changed) {
      import('./data/bingoSquares.js').then(({ checkBingo, isBattleshipBingo }) => {
        const bingoLine = checkBingo(card);
        const updates = { [`rooms/${roomCode}/players/${playerId}/card`]: card };
        if (bingoLine && !myPlayer.bingo) {
          updates[`rooms/${roomCode}/players/${playerId}/bingo`]     = true;
          updates[`rooms/${roomCode}/players/${playerId}/bingoLine`] = bingoLine;
          addToast('🎉 BINGO! You won!', 'win');
          const lastIdx = card.findLastIndex((sq, i) => bingoLine.includes(i) && sq.isMarked);
          if (isBattleshipBingo(card, bingoLine, lastIdx)) {
            updates[`rooms/${roomCode}/players/${playerId}/battleShots`] = (myPlayer.battleShots || 0) + 1;
            addToast('⚡ Battleship BINGO! Battle Shot earned!', 'battle');
          }
        }
        update(ref(db), updates);
      });
      markedTexts.forEach(t => addToast(`🏒 Auto-marked: "${t}"`, 'success'));
    }
    clearAutoMark();
  }, [autoMarkPatterns, roomData, playerId, roomCode, addToast, clearAutoMark]);

  // ── Bot AI (host only) — uses the sophisticated useAIPlayer hook ──────────
  useAIPlayer({
    roomCode,
    roomData,
    autoMarkPatterns,
    clearAutoMark: () => {}, // bots get their own copy from roomData listener
    isHost: isHost && screen === 'game',
    humanPlayerId: playerId,
  });

  // ── Firebase room listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = ref(db, `rooms/${roomCode}`);
    const handle = onValue(roomRef, snap => {
      if (!snap.exists()) return;
      const data = snap.val();
      setRoomData(data);

      // Check for first bingo
      for (const [pid, p] of Object.entries(data.players || {})) {
        if (p.bingo && !winner) {
          setWinner({ name: p.name, isMe: pid === playerId, isBot: !!p.isBot });
          setScreen('win');
        }
      }

      // Incoming attack notifications
      for (const [, atk] of Object.entries(data.attacks || {})) {
        if (atk.to === playerId && !atk.resolved) {
          addToast(`💣 ${atk.fromName} blocked one of your squares!`, 'battle');
        }
      }
    });
    return () => off(roomRef, 'value', handle);
  }, [roomCode, playerId, winner, addToast]);

  // ── Advance to game when host starts ─────────────────────────────────────
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'waiting') setScreen('game');
  }, [roomData?.status, screen]);

  // ── Create room ───────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async ({ name, sport, team, location, botCount }) => {
    const code   = Math.random().toString(36).substring(2, 6).toUpperCase();
    const colors = team ? getTeamColors(sport, team) : null;

    addToast('✨ Generating your card with AI…', 'success');

    const card = await generateLLMCard({
      sport, myTeam: team, location, gameDate: new Date().toDateString(),
    });

    const players = {
      [playerId]: { name, team, colors, card, bingo: false, bingoLine: null, battleShots: 0 },
    };

    // Spin up bot players
    for (let i = 0; i < (botCount || 0); i++) {
      const botId  = `bot_${uuidv4().slice(0, 8)}`;
      const bot    = createBotPlayer(i, sport);
      const botCard = await generateLLMCard({
        sport, myTeam: bot.team, location, gameDate: new Date().toDateString(),
      });
      bot.card = botCard;
      players[botId] = bot;
    }

    await set(ref(db, `rooms/${code}`), {
      sport, location, createdAt: serverTimestamp(),
      status: 'waiting', host: playerId, players,
    });

    setPlayerName(name);
    setPlayerTeam(team || '');
    setRoomCode(code);
    setIsHost(true);
    setScreen('waiting');
  }, [playerId, generateLLMCard, addToast]);

  // ── Join room ─────────────────────────────────────────────────────────────
  const handleJoinRoom = useCallback(async ({ name, team, code }) => {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) { addToast('Room not found. Check the code!', 'battle'); return; }

    const roomSnap = snap.val();
    const colors   = team ? getTeamColors(roomSnap.sport, team) : null;

    addToast('✨ Generating your card with AI…', 'success');
    const card = await generateLLMCard({
      sport: roomSnap.sport, myTeam: team,
      location: roomSnap.location, gameDate: new Date().toDateString(),
    });

    await update(ref(db, `rooms/${code}/players/${playerId}`), {
      name, team, colors, card, bingo: false, bingoLine: null, battleShots: 0,
    });

    setPlayerName(name);
    setPlayerTeam(team || '');
    setRoomCode(code);
    setIsHost(false);
    setScreen('waiting');
  }, [playerId, addToast, generateLLMCard]);

  // ── Start game ────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(async () => {
    await update(ref(db, `rooms/${roomCode}`), { status: 'playing' });
    setScreen('game');
  }, [roomCode]);

  // ── Mark a square ─────────────────────────────────────────────────────────
  const handleMarkSquare = useCallback(async (squareIndex) => {
    if (!roomData) return;
    const myPlayer = roomData.players?.[playerId];
    if (!myPlayer) return;

    const card = myPlayer.card.map(sq => ({ ...sq }));
    const sq   = card[squareIndex];
    if (!sq || sq.isBlocked || sq.isFree || sq.isMarked) return;

    card[squareIndex] = { ...sq, isMarked: true };

    const { checkBingo, isBattleshipBingo } = await import('./data/bingoSquares.js');
    const bingoLine = checkBingo(card);
    const updates   = { [`rooms/${roomCode}/players/${playerId}/card`]: card };

    if (bingoLine && !myPlayer.bingo) {
      updates[`rooms/${roomCode}/players/${playerId}/bingo`]     = true;
      updates[`rooms/${roomCode}/players/${playerId}/bingoLine`] = bingoLine;
      addToast('🎉 BINGO! You won!', 'win');
      if (isBattleshipBingo(card, bingoLine, squareIndex)) {
        updates[`rooms/${roomCode}/players/${playerId}/battleShots`] = (myPlayer.battleShots || 0) + 1;
        addToast('⚡ Battleship BINGO! Battle Shot earned!', 'battle');
      }
    }
    await update(ref(db), updates);
  }, [roomData, playerId, roomCode, addToast]);

  // ── Fire battle shot ──────────────────────────────────────────────────────
  const handleBattleShot = useCallback(async (targetPlayerId, targetSquareIndex) => {
    if (!roomData) return;
    const myPlayer     = roomData.players?.[playerId];
    const targetPlayer = roomData.players?.[targetPlayerId];
    if (!myPlayer || !targetPlayer || (myPlayer.battleShots || 0) < 1) return;

    const targetCard = targetPlayer.card.map(sq => ({ ...sq }));
    const tSq        = targetCard[targetSquareIndex];
    if (!tSq || tSq.isMarked || tSq.isBlocked || tSq.isFree) {
      addToast("That square can't be blocked!", 'battle'); return;
    }

    targetCard[targetSquareIndex] = { ...tSq, isBlocked: true };
    const attackId = uuidv4().slice(0, 8);

    await update(ref(db), {
      [`rooms/${roomCode}/players/${targetPlayerId}/card`]:  targetCard,
      [`rooms/${roomCode}/players/${playerId}/battleShots`]: (myPlayer.battleShots || 1) - 1,
      [`rooms/${roomCode}/attacks/${attackId}`]: {
        from: playerId, fromName: myPlayer.name,
        to: targetPlayerId, squareIndex: targetSquareIndex,
        resolved: true, timestamp: Date.now(),
      },
    });
    addToast(`💣 Blocked a square on ${targetPlayer.name}'s card!`, 'battle');
  }, [roomData, playerId, roomCode, addToast]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    ['--team-primary','--team-secondary','--team-text','--team-primary-fade']
      .forEach(v => document.documentElement.style.removeProperty(v));
    setScreen('lobby');
    setRoomCode('');
    setRoomData(null);
    setWinner(null);
    setPlayerTeam('');
    setTeamColors(null);
    setIsHost(false);
  }, []);

  return (
    <>
      <ToastContainer toasts={toasts} />
      {screen === 'lobby' && (
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} llmStatus={llmStatus} />
      )}
      {screen === 'waiting' && roomData && (
        <WaitingRoom
          roomCode={roomCode} roomData={roomData}
          playerId={playerId} isHost={isHost}
          onStartGame={handleStartGame}
        />
      )}
      {screen === 'game' && roomData && (
        <GameBoard
          roomCode={roomCode}    roomData={roomData}
          playerId={playerId}    playerName={playerName}
          teamColors={teamColors}
          gameInfo={gameInfo}    connectionStatus={connectionStatus}
          onMarkSquare={handleMarkSquare}
          onBattleShot={handleBattleShot}
          addToast={addToast}
        />
      )}
      {screen === 'win' && (
        <WinScreen winner={winner} teamColors={teamColors} onPlayAgain={handlePlayAgain} />
      )}
    </>
  );
}
