// src/App.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase.js';
import {
  ref, set, onValue, off, update, push, serverTimestamp, get,
} from 'firebase/database';
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
import { createBotPlayer, getBotChatLine } from './data/botPlayers.js';

export default function App() {
  const [screen,      setScreen]      = useState('lobby');
  const [playerId]                    = useState(() => {
    let id = sessionStorage.getItem('bingo_pid');
    if (!id) { id = uuidv4(); sessionStorage.setItem('bingo_pid', id); }
    return id;
  });
  const [playerName,  setPlayerName]  = useState('');
  const [playerTeam,  setPlayerTeam]  = useState('');
  const [roomCode,    setRoomCode]    = useState('');
  const [roomData,    setRoomData]    = useState(null);
  const [teamColors,  setTeamColors]  = useState(null);
  const [toasts,      setToasts]      = useState([]);
  const [winner,      setWinner]      = useState(null);
  const [isHost,      setIsHost]      = useState(false);
  const [chatMessages,setChatMessages]= useState([]);
  const seenAttacks   = useRef(new Set());
  const botChatTimer  = useRef(null);
  const lastBotChat   = useRef({});   // botId → timestamp, prevents spam

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

  // ── NHL feed — use myTeam or homeTeam for tracking ────────────────────────
  const trackTeam = playerTeam || roomData?.homeTeam || '';
  const { gameInfo, autoMarkPatterns, clearAutoMark, connectionStatus } = useNHLFeed({
    sport, myTeamAbbr: trackTeam, enabled: screen === 'game',
  });

  // ── Auto-mark from NHL feed ───────────────────────────────────────────────
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
          const lastIdx = card.findLastIndex((sq, i) =>
            bingoLine.includes(i) && sq.isMarked
          );
          if (isBattleshipBingo(card, bingoLine, lastIdx)) {
            updates[`rooms/${roomCode}/players/${playerId}/battleShots`] =
              (myPlayer.battleShots || 0) + 1;
            addToast('⚡ Battleship BINGO! Battle Shot earned!', 'battle');
          }
        }
        update(ref(db), updates);
      });
      markedTexts.forEach(t => addToast(`🏒 Auto-marked: "${t}"`, 'success'));
    }
    clearAutoMark();
  }, [autoMarkPatterns, roomData, playerId, roomCode, addToast, clearAutoMark]);

  // ── Bot AI (host only) ────────────────────────────────────────────────────
  useAIPlayer({
    roomCode, roomData, autoMarkPatterns,
    clearAutoMark: () => {},
    isHost: isHost && screen === 'game',
    humanPlayerId: playerId,
  });

  // ── Bot chat tick (host only) — Letterkenny characters talk trash ─────────
  useEffect(() => {
    if (!isHost || screen !== 'game' || !roomCode) return;

    const BOT_CHAT_INTERVAL_MS = 28_000; // ~every 28 seconds per bot
    const BOT_CHAT_COOLDOWN_MS = 45_000; // each bot won't spam faster than this

    const tick = async () => {
      const players = roomData?.players || {};
      const bots = Object.entries(players).filter(([, p]) => p.isBot);
      if (bots.length === 0) return;

      const now = Date.now();

      for (const [botId, bot] of bots) {
        // Cooldown check — each bot has its own cooldown
        const lastTime = lastBotChat.current[botId] || 0;
        if (now - lastTime < BOT_CHAT_COOLDOWN_MS) continue;

        // ~45% chance per tick per bot to say something
        if (Math.random() > 0.45) continue;

        // Pick a trigger based on game state
        const charIdx = bot.characterIndex ?? 0;
        let trigger = 'idle';

        if (bot.bingo) {
          trigger = 'winning';
        } else {
          // Check if a human just got ahead
          const humanPlayers = Object.entries(players).filter(([pid, p]) => !p.isBot);
          const humanLeading = humanPlayers.some(([, p]) => {
            const theirMarked = (p.card || []).filter(sq => sq?.isMarked && !sq?.isFree).length;
            const botMarked   = (bot.card  || []).filter(sq => sq?.isMarked && !sq?.isFree).length;
            return theirMarked > botMarked + 3;
          });
          if (humanLeading) trigger = 'losing';
        }

        const line = getBotChatLine(charIdx, trigger);

        try {
          await push(ref(db, `rooms/${roomCode}/chat`), {
            name:      bot.name,
            text:      line,
            timestamp: now,
            colors:    bot.colors
              ? { primary: bot.colors.primary, text: bot.colors.text }
              : null,
            isBot: true,
          });
          lastBotChat.current[botId] = now;
        } catch (err) {
          console.warn('Bot chat push failed:', err.message);
        }
      }
    };

    botChatTimer.current = setInterval(tick, BOT_CHAT_INTERVAL_MS);
    return () => clearInterval(botChatTimer.current);
  }, [isHost, screen, roomCode, roomData]);

  // Also fire a contextual bot line when a bot fires a battle shot (called from
  // useAIPlayer's attack resolution) — we listen for new resolved attacks targeting
  // a human and let the attacker bot respond in chat.
  useEffect(() => {
    if (!isHost || !roomData || screen !== 'game') return;
    const attacks = roomData.attacks || {};
    for (const [, atk] of Object.entries(attacks)) {
      if (!atk.resolved || !atk.from?.startsWith('bot_')) continue;
      const attackKey = `${atk.from}_${atk.timestamp}`;
      if (lastBotChat.current[attackKey]) continue; // already handled
      lastBotChat.current[attackKey] = Date.now();

      const bot = roomData.players?.[atk.from];
      if (!bot) continue;
      const charIdx = bot.characterIndex ?? 0;
      const line = getBotChatLine(charIdx, 'battleShot');

      push(ref(db, `rooms/${roomCode}/chat`), {
        name:      bot.name,
        text:      line,
        timestamp: Date.now(),
        colors:    bot.colors ? { primary: bot.colors.primary, text: bot.colors.text } : null,
        isBot:     true,
      }).catch(() => {});
    }
  }, [isHost, roomData?.attacks, screen, roomCode, roomData]);

  // ── Firebase: room + chat listener ───────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    // Room state
    const roomRef = ref(db, `rooms/${roomCode}`);
    const roomHandle = onValue(roomRef, snap => {
      if (!snap.exists()) return;
      const data = snap.val();
      setRoomData(data);

      for (const [pid, p] of Object.entries(data.players || {})) {
        if (p.bingo && !winner) {
          setWinner({ name: p.name, isMe: pid === playerId, isBot: !!p.isBot });
          setScreen('win');
        }
      }

      for (const [atkId, atk] of Object.entries(data.attacks || {})) {
        if (atk.to === playerId && !seenAttacks.current.has(atkId)) {
          seenAttacks.current.add(atkId);
          addToast(`💣 ${atk.fromName} blocked one of your squares!`, 'battle');
        }
      }
    });

    // Chat
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    const chatHandle = onValue(chatRef, snap => {
      if (!snap.exists()) { setChatMessages([]); return; }
      const msgs = Object.values(snap.val())
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setChatMessages(msgs);
    });

    return () => {
      off(roomRef,  'value', roomHandle);
      off(chatRef,  'value', chatHandle);
    };
  }, [roomCode, playerId, winner, addToast]);

  // Auto-advance to game
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'waiting') setScreen('game');
  }, [roomData?.status, screen]);

  // ── Send chat message ─────────────────────────────────────────────────────
  const handleSendChat = useCallback(async (text) => {
    if (!text.trim() || !roomCode) return;
    const myPlayer = roomData?.players?.[playerId];
    const colors = myPlayer?.colors
      ? { primary: myPlayer.colors.primary, text: myPlayer.colors.text }
      : null;
    await push(ref(db, `rooms/${roomCode}/chat`), {
      name: playerName,
      text: text.trim(),
      timestamp: Date.now(),
      colors,
    });
  }, [roomCode, playerName, roomData, playerId]);

  // ── Create room ───────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async ({
    name, sport, team, homeTeam, awayTeam, gameLabel, location, botCount,
  }) => {
    const code   = Math.random().toString(36).substring(2, 6).toUpperCase();
    const colors = team ? getTeamColors(sport, team) : null;

    addToast('✨ Generating your card with AI…', 'success');

    const card = await generateLLMCard({
      sport, homeTeam, awayTeam,
      location, gameDate: new Date().toDateString(),
    });

    const players = {
      [playerId]: { name, team, colors, card, bingo: false, bingoLine: null, battleShots: 0 },
    };

    for (let i = 0; i < (botCount || 0); i++) {
      const botId   = `bot_${uuidv4().slice(0, 8)}`;
      const bot     = createBotPlayer(i, sport);
      const botCard = await generateLLMCard({
        sport, homeTeam, awayTeam,
        location, gameDate: new Date().toDateString(),
      });
      bot.card = botCard;
      players[botId] = bot;
    }

    await set(ref(db, `rooms/${code}`), {
      sport, location,
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
      gameLabel: gameLabel || null,
      createdAt: serverTimestamp(),
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
      sport: roomSnap.sport,
      homeTeam: roomSnap.homeTeam || null,
      awayTeam: roomSnap.awayTeam || null,
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
        updates[`rooms/${roomCode}/players/${playerId}/battleShots`] =
          (myPlayer.battleShots || 0) + 1;
        addToast('⚡ Battleship BINGO! Battle Shot earned!', 'battle');
      }
    }
    await update(ref(db), updates);
  }, [roomData, playerId, roomCode, addToast]);

  // ── UNMARK a square ───────────────────────────────────────────────────────
  const handleUnmarkSquare = useCallback(async (squareIndex) => {
    if (!roomData) return;
    const myPlayer = roomData.players?.[playerId];
    if (!myPlayer) return;

    const card = myPlayer.card.map(sq => ({ ...sq }));
    const sq   = card[squareIndex];

    // Safety checks: can't unmark free, blocked, or winning-line squares
    if (!sq || !sq.isMarked || sq.isFree || sq.isBlocked) return;
    const bingoLine = myPlayer.bingoLine || [];
    if (bingoLine.includes(squareIndex)) return;

    card[squareIndex] = { ...sq, isMarked: false };

    // Recheck bingo — might need to clear it if somehow bingo was partial
    const { checkBingo } = await import('./data/bingoSquares.js');
    const stillBingo = checkBingo(card);
    const updates = { [`rooms/${roomCode}/players/${playerId}/card`]: card };

    // If no bingo line remains and player had bingo, clear it
    if (!stillBingo && myPlayer.bingo) {
      updates[`rooms/${roomCode}/players/${playerId}/bingo`]     = false;
      updates[`rooms/${roomCode}/players/${playerId}/bingoLine`] = null;
    }

    await update(ref(db), updates);
  }, [roomData, playerId, roomCode]);

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
    seenAttacks.current.clear();
    lastBotChat.current = {};
    clearInterval(botChatTimer.current);
    setScreen('lobby');
    setRoomCode('');
    setRoomData(null);
    setWinner(null);
    setPlayerTeam('');
    setTeamColors(null);
    setIsHost(false);
    setChatMessages([]);
  }, []);

  return (
    <>
      <ToastContainer toasts={toasts} />

      {screen === 'lobby' && (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          llmStatus={llmStatus}
        />
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
          roomCode={roomCode}   roomData={roomData}
          playerId={playerId}   playerName={playerName}
          teamColors={teamColors}
          gameInfo={gameInfo}   connectionStatus={connectionStatus}
          chatMessages={chatMessages}
          onMarkSquare={handleMarkSquare}
          onUnmarkSquare={handleUnmarkSquare}
          onBattleShot={handleBattleShot}
          onSendChat={handleSendChat}
          addToast={addToast}
        />
      )}

      {screen === 'win' && (
        <WinScreen winner={winner} teamColors={teamColors} onPlayAgain={handlePlayAgain} />
      )}
    </>
  );
}
