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
import WinScreen            from './components/WinScreen.jsx';
import IcingChallenge       from './components/IcingChallenge.jsx';
import TruthOrDare          from './components/TruthOrDare.jsx';
import PeopleWatchingSetup  from './components/PeopleWatchingSetup.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import { useNHLFeed }    from './hooks/useNHLFeed.js';
import { matchesSquare } from './data/nhlEventMap.js';
import { useLLMSquares } from './hooks/useLLMSquares.js';
import { useAIPlayer }   from './hooks/useAIPlayer.js';
import { getTeamColors, buildTeamTheme } from './data/teamColors.js';
import { createBotPlayer, getBotChatLine, getMentionResponse } from './data/botPlayers.js';

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
  const [showPeopleWatching, setShowPeopleWatching] = useState(false);
  const [chatMessages,setChatMessages]= useState([]);
  const [activeIcing,  setActiveIcing]  = useState(null); // live icing challenge
  const seenAttacks   = useRef(new Set());
  const seenIcingIds  = useRef(new Set());
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

  // ── NHL feed — track the actual game teams set by the host ───────────────
  const { gameInfo, autoMarkPatterns, clearAutoMark, feedEvents, clearFeedEvents, icingEvent, clearIcingEvent, connectionStatus, gameWon, reprocessAllPlays } = useNHLFeed({
    sport,
    homeTeamAbbr: roomData?.homeTeam || '',
    awayTeamAbbr: roomData?.awayTeam || '',
    myTeamAbbr:   playerTeam || '',   // fallback only if host set no teams
    enabled: screen === 'game',
  });

  // ── Auto-mark from NHL feed ───────────────────────────────────────────────
  useEffect(() => {
    if (!autoMarkPatterns.length || !roomData) return;
    const allPlayers = roomData.players || {};
    const myPlayer   = allPlayers[playerId];
    if (!myPlayer?.card) return;

    import('./data/bingoSquares.js').then(({ checkBingo, isBattleshipBingo }) => {
      const updates = {};
      const markedTexts = [];

      // ── Update every player's card (human + bots) ──────────────────────────
      // Bots only get updated by the host to avoid duplicate writes
      for (const [pid, player] of Object.entries(allPlayers)) {
        const isBotPlayer = !!player.isBot;
        const isMe        = pid === playerId;

        // Only the host processes bot cards; everyone processes their own
        if (isBotPlayer && !isHost) continue;
        if (!player.card) continue;

        const card = player.card.map(sq => ({ ...sq }));
        let changed = false;

        for (const pattern of autoMarkPatterns) {
          card.forEach((sq, idx) => {
            if (sq.isMarked || sq.isBlocked || sq.isFree) return;
            if (matchesSquare(sq.text, pattern)) {
              card[idx] = { ...sq, isMarked: true };
              changed = true;
              if (isMe) markedTexts.push(sq.text);
            }
          });
        }

        if (!changed) continue;

        updates[`rooms/${roomCode}/players/${pid}/card`] = card;

        const bingoLine = checkBingo(card);
        if (bingoLine && !player.bingo) {
          updates[`rooms/${roomCode}/players/${pid}/bingo`]     = true;
          updates[`rooms/${roomCode}/players/${pid}/bingoLine`] = bingoLine;

          if (isMe) {
            addToast('🎉 BINGO! You won!', 'win');
            const lastIdx = card.findLastIndex((sq, i) =>
              bingoLine.includes(i) && sq.isMarked
            );
            if (isBattleshipBingo(card, bingoLine, lastIdx)) {
              updates[`rooms/${roomCode}/players/${pid}/battleShots`] =
                (player.battleShots || 0) + 1;
              addToast('⚡ Battleship BINGO! Battle Shot earned!', 'battle');
            }
          } else if (isBotPlayer) {
            addToast(`🤖 ${player.name} got BINGO!`, 'battle');
          }
        }
      }

      if (Object.keys(updates).length > 0) update(ref(db), updates);
      markedTexts.forEach(t => addToast(`🏒 Auto-marked: "${t}"`, 'success'));
    });

    clearAutoMark();
  }, [autoMarkPatterns, roomData, playerId, roomCode, isHost, addToast, clearAutoMark]);

  // ── Trigger icing selfie challenge when icing is called ─────────────────────
  useEffect(() => {
    if (!icingEvent || !isHost || screen !== 'game') return;
    if (seenIcingIds.current.has(icingEvent.eventId)) return; // already triggered
    seenIcingIds.current.add(icingEvent.eventId);

    setActiveIcing(icingEvent);
    clearIcingEvent();

    const now = Date.now();

    // Announce in chat
    push(ref(db, `rooms/${roomCode}/chat`), {
      name: '🧊 Icing Challenge',
      text: '🧊 ICING CALLED! Selfie challenge — last to post loses a marked square! 60 seconds! 📸',
      timestamp: now, isFeed: true,
      colors: { primary: '#003060', text: '#99d9d9' },
    }).catch(() => {});

    // Bots auto-submit immediately with a small random delay (they have cameras 🤖)
    const players = roomData?.players || {};
    const bots = Object.entries(players).filter(([, p]) => p.isBot);
    for (const [botId, bot] of bots) {
      const delay = 2000 + Math.random() * 8000; // 2-10 seconds
      setTimeout(() => {
        update(ref(db, `rooms/${roomCode}/icingSubmissions/${botId}`), {
          timestamp: Date.now(), name: bot.name,
        });
        push(ref(db, `rooms/${roomCode}/chat`), {
          name: bot.name,
          text: `🤖📸 ${bot.name} posts their selfie (allegedly)`,
          timestamp: Date.now(),
          colors: bot.colors ? { primary: bot.colors.primary, text: bot.colors.text } : null,
          isBot: true,
        });
      }, delay);
    }

    // Write icing challenge to Firebase so all players see the banner
    import('firebase/database').then(({ ref: fbRef, set }) => {
      set(fbRef(db, `rooms/${roomCode}/icingChallenge`), {
        eventId:   icingEvent.eventId,
        startedAt: now,
        period:    icingEvent.period,
      });
    });
  }, [icingEvent, isHost, screen, roomCode, activeIcing, clearIcingEvent]);

  // ── Post NHL feed events to chat (host only — avoids duplicate posts) ──────
  useEffect(() => {
    if (!feedEvents.length || !roomCode || !isHost || screen !== 'game') return;

    const postEvents = async () => {
      for (const line of feedEvents) {
        await push(ref(db, `rooms/${roomCode}/chat`), {
          name:      '🏒 NHL Feed',
          text:      line,
          timestamp: Date.now(),
          isFeed:    true,
          colors:    { primary: '#1a3a5c', text: '#99d9d9' },
        });
      }
    };

    postEvents();
    clearFeedEvents();
  }, [feedEvents, roomCode, isHost, screen, clearFeedEvents]);


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

    // Icing challenge (for non-host players who need to see the banner)
    const icingRef = ref(db, `rooms/${roomCode}/icingChallenge`);
    const icingHandle = onValue(icingRef, snap => {
      if (!snap.exists()) { setActiveIcing(null); return; }
      const data = snap.val();
      if (!isHost) setActiveIcing(data); // host sets it locally, others get it from Firebase
    });

    // Chat
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    const seenChats = new Set();
    const chatHandle = onValue(chatRef, snap => {
      if (!snap.exists()) { setChatMessages([]); return; }
      const msgs = Object.values(snap.val())
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setChatMessages(msgs);

      // Toast when someone @mentions this player
      for (const msg of msgs) {
        const key = `${msg.timestamp}_${msg.name}`;
        if (seenChats.has(key)) continue;
        seenChats.add(key);
        if (msg.name === playerName) continue; // own message
        if (!msg.text?.toLowerCase().includes(`@${playerName.toLowerCase()}`)) continue;
        addToast(`💬 ${msg.name} mentioned you!`, 'battle');
      }
    });

    return () => {
      off(roomRef,  'value', roomHandle);
      off(chatRef,  'value', chatHandle);
      off(icingRef, 'value', icingHandle);
    };
  }, [roomCode, playerId, winner, addToast]);

  // Auto-advance to game
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'waiting') setScreen('game');
  }, [roomData?.status, screen]);

  // ── Post selfie for icing challenge ──────────────────────────────────────────
  const handlePostSelfie = useCallback(async (imageDataUrl) => {
    if (!roomCode || !playerName) return;
    const myPlayer = roomData?.players?.[playerId];
    const colors = myPlayer?.colors
      ? { primary: myPlayer.colors.primary, text: myPlayer.colors.text }
      : null;

    // Post to chat — imageDataUrl may be null if camera was denied
    const chatMsg = {
      name: playerName,
      text: imageDataUrl ? `📸 ${playerName}'s icing selfie!` : `📸 ${playerName} submitted (no camera)`,
      timestamp: Date.now(),
      colors,
      isSelfie: !!imageDataUrl,
    };
    if (imageDataUrl) chatMsg.selfieDataUrl = imageDataUrl;

    await push(ref(db, `rooms/${roomCode}/chat`), chatMsg);

    // Record submission time for penalty adjudication
    await update(ref(db, `rooms/${roomCode}/icingSubmissions/${playerId}`), {
      timestamp: Date.now(), name: playerName,
    });
  }, [roomCode, playerName, roomData, playerId]);

  // ── Adjudicate icing challenge — reads FRESH from Firebase to avoid stale state
  const handleIcingAdjudicate = useCallback(async () => {
    if (!roomCode) return null;

    // Fetch current submissions and players fresh from Firebase
    const [playersSnap, submissionsSnap] = await Promise.all([
      get(ref(db, `rooms/${roomCode}/players`)),
      get(ref(db, `rooms/${roomCode}/icingSubmissions`)),
    ]);

    const players     = playersSnap.exists()     ? playersSnap.val()     : {};
    const submissions = submissionsSnap.exists() ? submissionsSnap.val() : {};

    // Find the human who submitted last (or not at all)
    const humanPlayers = Object.entries(players)
      .filter(([, p]) => !p.isBot)
      .map(([pid, p]) => ({
        pid, name: p.name,
        submitTime: submissions[pid]?.timestamp ?? Infinity,
      }))
      .sort((a, b) => b.submitTime - a.submitTime); // last/non-submitter first

    const loser = humanPlayers[0];
    if (!loser || loser.submitTime === Infinity && Object.keys(submissions).length >= humanPlayers.length) {
      // Everyone submitted — no penalty
      push(ref(db, `rooms/${roomCode}/chat`), {
        name: '🧊 Icing Challenge', text: '❄️ Everyone posted in time! No penalty.',
        timestamp: Date.now(), isFeed: true,
        colors: { primary: '#003060', text: '#99d9d9' },
      }).catch(() => {});
      import('firebase/database').then(({ ref: fbRef, remove }) => {
        remove(fbRef(db, `rooms/${roomCode}/icingChallenge`));
        remove(fbRef(db, `rooms/${roomCode}/icingSubmissions`));
      });
      setActiveIcing(null);
      return null;
    }

    // Penalize the loser
    const player = players[loser.pid];
    if (!player?.card) return null;

    const bingoLine  = player.bingoLine || [];
    const candidates = player.card
      .map((sq, idx) => ({ sq, idx }))
      .filter(({ sq, idx }) => sq.isMarked && !sq.isFree && !bingoLine.includes(idx));

    if (candidates.length > 0) {
      const pick    = candidates[Math.floor(Math.random() * candidates.length)];
      const newCard = player.card.map(sq => ({ ...sq }));
      newCard[pick.idx] = { ...newCard[pick.idx], isMarked: false };

      await update(ref(db, `rooms/${roomCode}/players/${loser.pid}`), { card: newCard });
      addToast(`🧊 ${loser.name} lost a square for being last!`, 'battle');

      push(ref(db, `rooms/${roomCode}/chat`), {
        name: '🧊 Icing Penalty',
        text: `❄️ ${loser.name} was last and lost "${pick.sq?.text ?? 'a square'}"!`,
        timestamp: Date.now(), isFeed: true,
        colors: { primary: '#003060', text: '#99d9d9' },
      }).catch(() => {});
    }

    import('firebase/database').then(({ ref: fbRef, remove }) => {
      remove(fbRef(db, `rooms/${roomCode}/icingChallenge`));
      remove(fbRef(db, `rooms/${roomCode}/icingSubmissions`));
    });
    setActiveIcing(null);
    return { loserName: loser.name };
  }, [roomCode, addToast]);

  // ── Send chat message + handle @mentions ─────────────────────────────────
  const handleSendChat = useCallback(async (text) => {
    if (!text.trim() || !roomCode) return;
    const myPlayer = roomData?.players?.[playerId];
    const colors = myPlayer?.colors
      ? { primary: myPlayer.colors.primary, text: myPlayer.colors.text }
      : null;

    // Post the message
    await push(ref(db, `rooms/${roomCode}/chat`), {
      name: playerName, text: text.trim(),
      timestamp: Date.now(), colors,
    });

    // ── Handle @mentions ───────────────────────────────────────────────────
    const mentioned = [...text.matchAll(/@([^\s@]+)/g)].map(m => m[1].toLowerCase());
    if (!mentioned.length) return;

    const players = roomData?.players || {};

    for (const [pid, player] of Object.entries(players)) {
      const pNameLower = player.name?.toLowerCase() ?? '';
      const isMentioned = mentioned.some(m => pNameLower.startsWith(m) || pNameLower === m);
      if (!isMentioned) continue;

      if (player.isBot) {
        // Bot responds after a short human-like delay (1.5–3.5s)
        const delay = 1500 + Math.random() * 2000;
        setTimeout(async () => {
          const charIdx = player.characterIndex ?? 0;
          const response = getMentionResponse(charIdx);
          // Address the sender back
          const reply = `@${playerName} ${response}`;
          await push(ref(db, `rooms/${roomCode}/chat`), {
            name: player.name, text: reply,
            timestamp: Date.now(),
            colors: player.colors ? { primary: player.colors.primary, text: player.colors.text } : null,
            isBot: true,
          });
        }, delay);

      } else if (pid !== playerId) {
        // Human player — they'll see a toast when their name appears in chat
        // The toast fires on the listener side (handled in the Firebase listener below)
      }
    }
  }, [roomCode, playerName, roomData, playerId]);


  // ── Generate people-watching card ─────────────────────────────────────────
  const generatePeopleCard = useCallback(async ({ locationDescription, vibe, playerCount }) => {
    try {
      const response = await fetch('/api/generate-people-squares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationDescription, vibe, playerCount }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Server ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.squares)) throw new Error('Bad response');

      const { FREE_SPACE } = await import('./data/bingoSquares.js');
      const shaped = data.squares.slice(0, 24).map((sq, i) => ({
        id: `pw_${Date.now()}_${i}`, text: sq.text || `Square ${i+1}`,
        battle: !!sq.battle, camera: !!sq.camera,
        isMarked: false, isBlocked: false, llmGenerated: true,
      }));
      return [
        ...shaped.slice(0, 12),
        { ...FREE_SPACE, isMarked: false, isBlocked: false },
        ...shaped.slice(12, 24),
      ].map((sq, idx) => ({ ...sq, index: idx }));
    } catch (err) {
      console.warn('People squares failed, using fallback:', err.message);
      const { generateCard } = await import('./data/bingoSquares.js');
      return generateCard('hockey', 'liveGame');
    }
  }, []);

  // ── Create room ───────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async ({
    name, sport, team, homeTeam, awayTeam, gameLabel, location, botCount,
    locationDescription, vibe,
  }) => {
    const code   = Math.random().toString(36).substring(2, 6).toUpperCase();
    const colors = team ? getTeamColors(sport, team) : null;

    addToast('✨ Generating your card with AI…', 'success');

    const card = sport === 'people'
      ? await generatePeopleCard({
          locationDescription: locationDescription || gameLabel,
          vibe: vibe || 'anywhere',
          playerCount: 1 + (botCount || 0),
        })
      : await generateLLMCard({
          sport, homeTeam, awayTeam,
          location, gameDate: new Date().toDateString(),
        });

    const players = {
      [playerId]: { name, team, colors, card, bingo: false, bingoLine: null, battleShots: 0 },
    };

    for (let i = 0; i < (botCount || 0); i++) {
      const botId   = `bot_${uuidv4().slice(0, 8)}`;
      const bot     = createBotPlayer(i, sport);
      const botCard = sport === 'people'
        ? await generatePeopleCard({ locationDescription: locationDescription || gameLabel, vibe: vibe || 'anywhere', playerCount: 2 })
        : await generateLLMCard({ sport, homeTeam, awayTeam, location, gameDate: new Date().toDateString() });
      bot.card = botCard;
      players[botId] = bot;
    }

    await set(ref(db, `rooms/${code}`), {
      sport, location,
      homeTeam: homeTeam || null,
      awayTeam: awayTeam || null,
      gameLabel: gameLabel || null,
      locationDescription: locationDescription || null,
      vibe: vibe || null,
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
    seenIcingIds.current.clear();
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
    setShowPeopleWatching(false);
  }, []);

  return (
    <>
      <ToastContainer toasts={toasts} />

      {screen === 'lobby' && !showPeopleWatching && (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onPeopleWatching={() => setShowPeopleWatching(true)}
          llmStatus={llmStatus}
        />
      )}
      {screen === 'lobby' && showPeopleWatching && (
        <PeopleWatchingSetup
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={() => setShowPeopleWatching(false)}
          onTruthOrDare={() => { setShowPeopleWatching(false); setScreen('truth-or-dare'); }}
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
        <WinScreen winner={winner} teamColors={teamColors} chatMessages={chatMessages} onPlayAgain={handlePlayAgain} />
      )}

      {screen === 'truth-or-dare' && (
        <TruthOrDare onBack={() => setScreen('lobby')} />
      )}

      {/* Icing selfie challenge — overlays on top of game */}
      {screen === 'game' && activeIcing && (
        <IcingChallenge
          isHost={isHost}
          playerId={playerId}
          playerName={playerName}
          roomData={roomData}
          roomCode={roomCode}
          onPostSelfie={handlePostSelfie}
          onAdjudicate={handleIcingAdjudicate}
          onDismiss={() => {
            setActiveIcing(null);
            import('firebase/database').then(({ ref: fbRef, remove }) => {
              remove(fbRef(db, `rooms/${roomCode}/icingChallenge`));
              remove(fbRef(db, `rooms/${roomCode}/icingSubmissions`));
            });
          }}
        />
      )}
    </>
  );
}
