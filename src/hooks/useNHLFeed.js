// src/hooks/useNHLFeed.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { mapNHLEventToSquares, mapScoreStateToSquares } from '../data/nhlEventMap.js';

const NHL_BASE = 'https://api-web.nhle.com/v1';
const POLL_INTERVAL_MS = 20_000; // 20 seconds

/**
 * Fetches today's NHL schedule to find a live (or soon-starting) game
 * that involves myTeamAbbr.
 */
async function findLiveGame(myTeamAbbr) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${NHL_BASE}/schedule/${today}`);
    if (!res.ok) return null;
    const data = await res.json();

    const games = data?.gameWeek?.[0]?.games ?? [];

    // Find a game involving our team that is live, pre-game, or today's final
    const teamGame = games.find(g => {
      const home = g.homeTeam?.abbrev ?? '';
      const away = g.awayTeam?.abbrev ?? '';
      return (
        home.toUpperCase() === myTeamAbbr.toUpperCase() ||
        away.toUpperCase() === myTeamAbbr.toUpperCase()
      );
    });

    return teamGame ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches play-by-play for a given gameId.
 */
async function fetchPlayByPlay(gameId) {
  try {
    const res = await fetch(`${NHL_BASE}/gamecenter/${gameId}/play-by-play`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * useNHLFeed
 *
 * Polls the NHL API for live game events and returns:
 *   - gameInfo: { gameId, homeTeam, awayTeam, score, period, status }
 *   - autoMarkPatterns: string[] of square text substrings to mark
 *   - clearAutoMark: clears the queue after the caller processes it
 *   - connectionStatus: 'idle' | 'searching' | 'live' | 'pre-game' | 'final' | 'error' | 'no-game'
 */
export function useNHLFeed({ sport, myTeamAbbr, enabled = true }) {
  const [gameInfo, setGameInfo] = useState(null);
  const [autoMarkPatterns, setAutoMarkPatterns] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const processedEventIds = useRef(new Set());
  const currentGameId = useRef(null);
  const myTeamId = useRef(null);
  const pollTimer = useRef(null);

  const clearAutoMark = useCallback(() => {
    setAutoMarkPatterns([]);
  }, []);

  const poll = useCallback(async () => {
    if (!myTeamAbbr || sport !== 'hockey') {
      setConnectionStatus('idle');
      return;
    }

    setConnectionStatus(prev => prev === 'idle' ? 'searching' : prev);

    // ── Find game ─────────────────────────────────────────────────────────────
    if (!currentGameId.current) {
      const game = await findLiveGame(myTeamAbbr);
      if (!game) {
        setConnectionStatus('no-game');
        return;
      }
      currentGameId.current = game.id;

      // Determine my team's numeric ID
      const home = game.homeTeam?.abbrev?.toUpperCase();
      const myAbbr = myTeamAbbr.toUpperCase();
      myTeamId.current = home === myAbbr ? game.homeTeam.id : game.awayTeam.id;
    }

    // ── Fetch play-by-play ────────────────────────────────────────────────────
    const pbp = await fetchPlayByPlay(currentGameId.current);
    if (!pbp) {
      setConnectionStatus('error');
      return;
    }

    // Update game info
    const homeTeam = pbp.homeTeam ?? {};
    const awayTeam = pbp.awayTeam ?? {};
    const gameState = pbp.gameState ?? 'OFF';
    const period = pbp.periodDescriptor?.number ?? 0;

    setGameInfo({
      gameId:    currentGameId.current,
      homeTeam:  { abbr: homeTeam.abbrev, name: homeTeam.name?.default, score: homeTeam.score ?? 0, id: homeTeam.id },
      awayTeam:  { abbr: awayTeam.abbrev, name: awayTeam.name?.default, score: awayTeam.score ?? 0, id: awayTeam.id },
      period,
      gameState,
    });

    // Map game state to connection status
    if (['LIVE', 'CRIT'].includes(gameState)) setConnectionStatus('live');
    else if (gameState === 'PRE')              setConnectionStatus('pre-game');
    else if (gameState === 'FINAL' || gameState === 'OFF') setConnectionStatus('final');

    // ── Process new plays ─────────────────────────────────────────────────────
    const plays = pbp.plays ?? [];
    const newPatterns = [];

    for (const play of plays) {
      const eid = play.eventId;
      if (processedEventIds.current.has(eid)) continue;
      processedEventIds.current.add(eid);

      const isMyTeamEvent = play.details?.eventOwnerTeamId === myTeamId.current;

      const patterns = mapNHLEventToSquares(play, myTeamAbbr, isMyTeamEvent);
      newPatterns.push(...patterns);
    }

    // ── Check score-based squares ─────────────────────────────────────────────
    const linescore = {
      homeTeam: { id: homeTeam.id, score: homeTeam.score ?? 0 },
      awayTeam: { id: awayTeam.id, score: awayTeam.score ?? 0 },
      periodDescriptor: pbp.periodDescriptor,
    };
    const scorePatterns = mapScoreStateToSquares(linescore, myTeamId.current);
    newPatterns.push(...scorePatterns);

    // Power play detection from situation code
    const lastPlay = plays[plays.length - 1];
    if (lastPlay?.situationCode) {
      const sc = lastPlay.situationCode;
      const homeOn  = parseInt(sc[0]);
      const awayOn  = parseInt(sc[2]);
      const myIsHome = homeTeam.id === myTeamId.current;
      const myOn    = myIsHome ? homeOn : awayOn;
      const oppOn   = myIsHome ? awayOn : homeOn;
      if (Math.abs(myOn - oppOn) >= 2) newPatterns.push('5-on-3 Power Play');
      else if (myOn > oppOn)           newPatterns.push('Power Play Called');
    }

    if (newPatterns.length > 0) {
      setAutoMarkPatterns(prev => [...prev, ...newPatterns]);
    }
  }, [myTeamAbbr, sport]);

  // ── Polling lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || sport !== 'hockey') return;

    poll(); // immediate first poll
    pollTimer.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollTimer.current);
    };
  }, [enabled, sport, poll]);

  return { gameInfo, autoMarkPatterns, clearAutoMark, connectionStatus };
}
