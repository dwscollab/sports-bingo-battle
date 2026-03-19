// src/hooks/useAIPlayer.js
// Drives all bot players (host-only).
// Bots mark squares with reaction delays, miss ~15% of events, fire strategic Battle Shots.

import { useEffect, useRef, useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../firebase.js';
import { v4 as uuidv4 } from 'uuid';

const MARK_DELAY_MIN = 900;
const MARK_DELAY_MAX = 5000;
const IDLE_MIN       = 40_000;
const IDLE_MAX       = 100_000;

const rnd = (min, max) => Math.floor(Math.random() * (max - min) + min);

const LINES = (() => {
  const L = [];
  for (let r = 0; r < 5; r++) L.push([r*5,r*5+1,r*5+2,r*5+3,r*5+4]);
  for (let c = 0; c < 5; c++) L.push([c,c+5,c+10,c+15,c+20]);
  L.push([0,6,12,18,24], [4,8,12,16,20]);
  return L;
})();

function botBingo(card) {
  for (const line of LINES) {
    if (line.every(i => card[i]?.isMarked && !card[i]?.isBlocked)) return line;
  }
  return null;
}

async function strategicShot(roomCode, roomData, botId, botName, humanId) {
  const bot = roomData?.players?.[botId];
  if (!bot || (bot.battleShots || 0) < 1) return;

  const humans = Object.entries(roomData.players || {})
    .filter(([pid, p]) => pid !== botId && !p.isBot && !p.bingo)
    .map(([pid, p]) => ({ pid, card: p.card || [], n: (p.card||[]).filter(s=>s.isMarked&&!s.isFree).length }))
    .sort((a,b) => b.n - a.n);

  const target = humans.find(h => h.pid === humanId) ?? humans[0];
  if (!target) return;

  const blockable = target.card.map((sq,idx)=>({sq,idx})).filter(({sq})=>!sq.isMarked&&!sq.isBlocked&&!sq.isFree);
  if (!blockable.length) return;

  let best = null, bestScore = -1;
  for (const {idx} of blockable) {
    const score = LINES.reduce((a,l) => a + (l.includes(idx) ? l.filter(i=>target.card[i]?.isMarked).length : 0), 0);
    if (score > bestScore) { bestScore = score; best = idx; }
  }
  if (best === null) best = blockable[Math.floor(Math.random()*blockable.length)].idx;

  const card = target.card.map((sq,i) => i===best ? {...sq, isBlocked:true} : sq);
  const aid = uuidv4().slice(0,8);
  await update(ref(db), {
    [`rooms/${roomCode}/players/${target.pid}/card`]: card,
    [`rooms/${roomCode}/players/${botId}/battleShots`]: Math.max(0, (bot.battleShots||1)-1),
    [`rooms/${roomCode}/attacks/${aid}`]: { from:botId, fromName:botName, to:target.pid, squareIndex:best, resolved:true, timestamp:Date.now() },
  });
}

export function useAIPlayer({ roomCode, roomData, autoMarkPatterns, clearAutoMark, isHost, humanPlayerId }) {
  const processing = useRef(false);
  const idleTimers = useRef({});

  const bots = useCallback(() =>
    Object.entries(roomData?.players || {}).filter(([,p]) => p.isBot && !p.bingo),
  [roomData]);

  // Apply NHL feed patterns to bots with delays
  const applyFeed = useCallback(async (patterns) => {
    if (!isHost || !roomData || processing.current || !patterns.length) return;
    processing.current = true;
    try {
      for (const [botId, bot] of bots()) {
        const filtered = patterns.filter(() => Math.random() > 0.15); // 15% miss rate
        for (const pattern of filtered) {
          await new Promise(r => setTimeout(r, rnd(MARK_DELAY_MIN, MARK_DELAY_MAX)));
          const cur = roomData?.players?.[botId];
          if (!cur?.card || cur.bingo) continue;

          const card = cur.card.map(sq=>({...sq}));
          let changed = false;
          card.forEach((sq,idx) => {
            if (sq.isMarked||sq.isBlocked||sq.isFree) return;
            if (sq.text.toLowerCase().includes(pattern.toLowerCase())) {
              card[idx] = {...sq, isMarked:true}; changed = true;
            }
          });
          if (!changed) continue;

          const bingoLine = botBingo(card);
          const ups = { [`rooms/${roomCode}/players/${botId}/card`]: card };
          if (bingoLine && !cur.bingo) {
            ups[`rooms/${roomCode}/players/${botId}/bingo`] = true;
            ups[`rooms/${roomCode}/players/${botId}/bingoLine`] = bingoLine;
            const bi = card.findIndex((sq,i)=>bingoLine.includes(i)&&sq.isMarked&&sq.battle);
            if (bi >= 0) {
              ups[`rooms/${roomCode}/players/${botId}/battleShots`] = (cur.battleShots||0)+1;
              setTimeout(()=>strategicShot(roomCode,roomData,botId,cur.name,humanPlayerId), 3000);
            }
          }
          await update(ref(db), ups);
        }
      }
    } finally { processing.current = false; }
  }, [isHost, roomCode, roomData, bots, humanPlayerId]);

  useEffect(() => {
    if (!isHost || !autoMarkPatterns?.length) return;
    applyFeed([...autoMarkPatterns]);
  }, [autoMarkPatterns, isHost, applyFeed]);

  // Idle marks (crowd observation)
  useEffect(() => {
    if (!isHost || roomData?.status !== 'playing') return;

    for (const [botId] of bots()) {
      if (idleTimers.current[botId]) continue;
      const tick = async () => {
        const cur = roomData?.players?.[botId];
        if (!cur?.card || cur.bingo) return;
        const card = cur.card.map(sq=>({...sq}));
        const pool = card.map((sq,idx)=>({sq,idx})).filter(({sq})=>!sq.isMarked&&!sq.isBlocked&&!sq.isFree);
        if (!pool.length) return;
        const {idx} = pool[Math.floor(Math.random()*pool.length)];
        card[idx] = {...card[idx], isMarked:true};
        const bl = botBingo(card);
        const ups = { [`rooms/${roomCode}/players/${botId}/card`]: card };
        if (bl && !cur.bingo) { ups[`rooms/${roomCode}/players/${botId}/bingo`]=true; ups[`rooms/${roomCode}/players/${botId}/bingoLine`]=bl; }
        await update(ref(db), ups);
        idleTimers.current[botId] = setTimeout(tick, rnd(IDLE_MIN, IDLE_MAX));
      };
      idleTimers.current[botId] = setTimeout(tick, rnd(IDLE_MIN, IDLE_MAX));
    }

    return () => { Object.values(idleTimers.current).forEach(clearTimeout); idleTimers.current = {}; };
  }, [isHost, roomData?.status, bots, roomCode, roomData]);

  // Fire waiting battle shots
  useEffect(() => {
    if (!isHost) return;
    for (const [botId, bot] of bots()) {
      if ((bot.battleShots||0) > 0 && Math.random() < 0.4) {
        setTimeout(()=>strategicShot(roomCode,roomData,botId,bot.name,humanPlayerId), rnd(2000,8000));
      }
    }
  }, [isHost, bots, roomCode, roomData, humanPlayerId]);
}
