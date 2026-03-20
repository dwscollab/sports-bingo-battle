// src/hooks/useNHLFeed.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { mapNHLEventToSquares, mapScoreStateToSquares } from '../data/nhlEventMap.js';

// All NHL API calls go through /api/nhl-proxy to avoid CORS on localhost
const NHL_PROXY = '/api/nhl-proxy';
const POLL_INTERVAL_MS = 20_000;

/**
 * Find today's game for a given team abbreviation.
 * Searches the correct day in the gameWeek array instead of assuming index 0.
 */
// Use LOCAL date string to avoid UTC timezone mismatches in the evening
// e.g. 6pm Pacific = 2am UTC next day — would look for tomorrow's games
function getLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchGamesForDate(dateStr) {
  try {
    const res = await fetch(`${NHL_PROXY}?path=schedule/${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    const gameWeek = data?.gameWeek ?? [];
    const entry = gameWeek.find(d => d.date === dateStr) ?? gameWeek[0];
    return entry?.games ?? [];
  } catch {
    return [];
  }
}

// Search today AND yesterday (covers games started before midnight local)
async function getAllCandidateGames() {
  const today     = await fetchGamesForDate(getLocalDate());
  const yesterday = await fetchGamesForDate(getYesterdayDate());
  // Dedupe by game id
  const seen = new Set();
  return [...today, ...yesterday].filter(g => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

async function findGameForTeam(abbr) {
  if (!abbr) return null;
  try {
    const games = await getAllCandidateGames();
    const upper = abbr.toUpperCase();
    return games.find(g =>
      g.homeTeam?.abbrev?.toUpperCase() === upper ||
      g.awayTeam?.abbrev?.toUpperCase() === upper
    ) ?? null;
  } catch {
    return null;
  }
}

/**
 * Find the game matching EITHER of two team abbreviations.
 */
async function findGameForMatchup(homeAbbr, awayAbbr) {
  if (!homeAbbr && !awayAbbr) return null;
  try {
    const games = await getAllCandidateGames();
    const home = homeAbbr?.toUpperCase() ?? '';
    const away = awayAbbr?.toUpperCase() ?? '';

    // Prefer exact matchup, fall back to either team alone
    return (
      games.find(g => {
        const gh = g.homeTeam?.abbrev?.toUpperCase();
        const ga = g.awayTeam?.abbrev?.toUpperCase();
        return (gh === home && ga === away) || (gh === away && ga === home);
      }) ??
      games.find(g => {
        const gh = g.homeTeam?.abbrev?.toUpperCase();
        const ga = g.awayTeam?.abbrev?.toUpperCase();
        return gh === home || ga === home || gh === away || ga === away;
      }) ??
      null
    );
  } catch {
    return null;
  }
}

async function fetchPlayByPlay(gameId) {
  try {
    const res = await fetch(`${NHL_PROXY}?path=gamecenter/${gameId}/play-by-play`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Build a human-readable chat line for a play event ───────────────────────
function buildEventChatLine(play, homeAbbr, awayAbbr, homeTeamId, awayTeamId) {
  const type   = (play.typeDescKey || '').toLowerCase();
  const period = play.periodDescriptor?.number ?? 0;
  const pLabel = period === 4 ? 'OT' : period === 5 ? 'SO' : `P${period}`;

  // Resolve team abbr from the event owner team ID
  const ownerTeamId = play.details?.eventOwnerTeamId;
  const team = ownerTeamId === homeTeamId ? homeAbbr
             : ownerTeamId === awayTeamId ? awayAbbr
             : null;
  const teamLabel = team || '';

  switch (type) {
    case 'goal': {
      const sc = play.situationCode ?? '1551';
      const awayS = parseInt(sc[1]) || 5;
      const homeS = parseInt(sc[3]) || 5;
      const awayG = sc[0] === '1';
      const homeG = sc[2] === '1';
      const isPP  = awayS !== homeS;
      const isEmpty = !awayG || !homeG;
      const isOT  = period > 3;
      const sit = isOT ? ' (OT)' : isPP ? ' (PP)' : isEmpty ? ' (EN)' : '';
      return `🚨 GOAL${sit} — ${teamLabel} scores! [${pLabel}]`;
    }
    case 'penalty': {
      const ptype = play.details?.typeCode || play.details?.descKey || 'minor';
      return `🚩 PENALTY — ${teamLabel} (${ptype}) [${pLabel}]`;
    }
    case 'fight':
      return `🥊 FIGHT — ${teamLabel} drops the gloves! [${pLabel}]`;
    case 'penalty-shot':
      return `🎯 PENALTY SHOT awarded [${pLabel}]`;
    case 'goalie-change':
      return `🥅 GOALIE CHANGE — ${teamLabel} pulls goalie [${pLabel}]`;
    case 'period-end':
      if (period === 1) return `🔔 End of Period 1`;
      if (period === 2) return `🔔 End of Period 2`;
      if (period === 3) return `🔔 End of Regulation`;
      if (period === 4) return `🔔 End of OT`;
      return null;
    case 'period-start':
      if (period === 1) return `🏒 Game Started — ${awayAbbr} @ ${homeAbbr}`;
      if (period === 4) return `⚡ OVERTIME begins!`;
      if (period === 5) return `🎯 SHOOTOUT begins!`;
      return `🏒 Period ${period} starts`;
    case 'shootout-complete':
      return `🏆 SHOOTOUT complete!`;
    default:
      return null;
  }
}

/**
 * useNHLFeed
 *
 * @param {string}  sport
 * @param {string}  homeTeamAbbr  — the home team set by the host (primary)
 * @param {string}  awayTeamAbbr  — the away team set by the host (primary)
 * @param {string}  myTeamAbbr    — the player's personal team (fallback only)
 * @param {boolean} enabled
 */
export function useNHLFeed({ sport, homeTeamAbbr, awayTeamAbbr, myTeamAbbr, enabled = true }) {
  const [gameInfo,         setGameInfo]         = useState(null);
  const [autoMarkPatterns, setAutoMarkPatterns] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [feedEvents,       setFeedEvents]       = useState([]); // chat-ready event strings
  const [icingEvent,       setIcingEvent]       = useState(null); // triggers selfie challenge
  const [gameWon,          setGameWon]          = useState(false); // tracked team won
  const prevGameState = useRef('');

  const processedEventIds = useRef(new Set());
  const currentGameId     = useRef(null);
  const trackedTeamId     = useRef(null); // numeric ID of team to track (home or away)
  const pollTimer         = useRef(null);
  // Plays with a timestamp BEFORE this are skipped — prevents catching up on
  // events that happened before the user opened the game screen.
  const sessionStartTime  = useRef(Date.now());

  const clearAutoMark = useCallback(() => setAutoMarkPatterns([]), []);
  const clearFeedEvents = useCallback(() => setFeedEvents([]), []);
  const clearIcingEvent = useCallback(() => setIcingEvent(null), []);

  const poll = useCallback(async () => {
    if (sport !== 'hockey') { setConnectionStatus('idle'); return; }

    setConnectionStatus(prev => prev === 'idle' ? 'searching' : prev);

    // ── Find the game ─────────────────────────────────────────────────────────
    if (!currentGameId.current) {
      let game = null;

      // 1. Try to find the exact matchup the host set
      if (homeTeamAbbr || awayTeamAbbr) {
        game = await findGameForMatchup(homeTeamAbbr, awayTeamAbbr);
      }

      // 2. Fall back to tracking the player's personal team
      if (!game && myTeamAbbr) {
        game = await findGameForTeam(myTeamAbbr);
      }

      if (!game) {
        setConnectionStatus('no-game');
        return;
      }

      currentGameId.current = game.id;

      // Track whichever playing team best matches — prefer homeTeam from room
      const gameHome = game.homeTeam?.abbrev?.toUpperCase();
      const gameAway = game.awayTeam?.abbrev?.toUpperCase();
      const roomHome = homeTeamAbbr?.toUpperCase();
      const roomAway = awayTeamAbbr?.toUpperCase();
      const personal = myTeamAbbr?.toUpperCase();

      if (roomHome && gameHome === roomHome) {
        trackedTeamId.current = game.homeTeam.id;
      } else if (roomAway && gameAway === roomAway) {
        trackedTeamId.current = game.awayTeam.id;
      } else if (personal && gameHome === personal) {
        trackedTeamId.current = game.homeTeam.id;
      } else if (personal && gameAway === personal) {
        trackedTeamId.current = game.awayTeam.id;
      } else {
        trackedTeamId.current = game.homeTeam.id; // default to home
      }
    }

    // ── Fetch play-by-play ────────────────────────────────────────────────────
    const pbp = await fetchPlayByPlay(currentGameId.current);
    if (!pbp) { setConnectionStatus('error'); return; }

    const homeTeam  = pbp.homeTeam ?? {};
    const awayTeam  = pbp.awayTeam ?? {};
    const gameState = pbp.gameState ?? 'OFF';
    const period    = pbp.periodDescriptor?.number ?? 0;

    setGameInfo({
      gameId:   currentGameId.current,
      homeTeam: { abbr: homeTeam.abbrev, name: homeTeam.name?.default, score: homeTeam.score ?? 0, id: homeTeam.id },
      awayTeam: { abbr: awayTeam.abbrev, name: awayTeam.name?.default, score: awayTeam.score ?? 0, id: awayTeam.id },
      period,
      gameState,
    });

    if      (['LIVE','CRIT'].includes(gameState)) setConnectionStatus('live');
    else if (gameState === 'PRE')                  setConnectionStatus('pre-game');
    else if (['FINAL','OFF'].includes(gameState)) {
      setConnectionStatus('final');
      // Only fire once when game transitions to FINAL
      if (prevGameState.current !== 'FINAL' && prevGameState.current !== 'OFF') {
        // Determine if tracked team won
        const myScore  = homeTeam.id === trackedTeamId.current ? (homeTeam.score ?? 0) : (awayTeam.score ?? 0);
        const oppScore = homeTeam.id === trackedTeamId.current ? (awayTeam.score ?? 0) : (homeTeam.score ?? 0);
        const didWin   = myScore > oppScore;
        setGameWon(didWin);
        // Emit game-winning goal pattern so that square marks
        setAutoMarkPatterns(prev => [...prev,
          'Game-winning goal', 'game-winning goal', 'game winner',
          'winning goal', 'game winning',
        ]);
      }
    }
    prevGameState.current = gameState;

    // ── Process new plays ─────────────────────────────────────────────────────
    const plays = pbp.plays ?? [];
    const newPatterns = [];
    const newFeedEvents = [];

    // isFirstPoll = no plays seen yet AND not a manual reprocess
    const isFirstPoll = processedEventIds.current.size === 0 ||
      (processedEventIds.current.size === 1 && processedEventIds.current.has('__reprocess__'));
    const isReprocess = processedEventIds.current.has('__reprocess__');

    // On first poll: track which teams have scored so far (for "first goal" detection)
    // and which once-per-game events have occurred.
    let homeHasScored = false;
    let awayHasScored = false;
    let hasFight      = false;
    let hasHatTrick   = false;
    let hasOT         = false;
    let hasShootout   = false;

    // Pre-scan for once-per-game state
    if (isFirstPoll && !isReprocess) {
      for (const play of plays) {
        const t = (play.typeDescKey || '').toLowerCase();
        if (t === 'goal') {
          const tid = play.details?.eventOwnerTeamId;
          if (tid === homeTeam.id) homeHasScored = true;
          else if (tid === awayTeam.id) awayHasScored = true;
          const d = (play.details?.descKey || '').toLowerCase();
          if (d.includes('hat') || d.includes('hat-trick')) hasHatTrick = true;
        }
        if (t === 'fight' || t === 'penalty') {
          const tc = (play.details?.typeCode || '').toLowerCase();
          if (tc.includes('fight') || tc.includes('major') ||
              parseInt(play.details?.duration) === 5) hasFight = true;
        }
        if (t === 'period-start') {
          const p = play.periodDescriptor?.number ?? 0;
          if (p === 4) hasOT = true;
          if (p === 5) hasShootout = true;
        }
      }
    }

    // Clear reprocess sentinel
    processedEventIds.current.delete('__reprocess__');

    for (const play of plays) {
      const eid = play.eventId;
      if (processedEventIds.current.has(eid)) continue;
      processedEventIds.current.add(eid);

      // ── First-poll filtering ─────────────────────────────────────────────
      if (isFirstPoll && !isReprocess) {
        const t = (play.typeDescKey || '').toLowerCase();

        // Events that happen multiple times — always skip from history
        const repeatable = [
          'shot-on-goal', 'blocked-shot', 'missed-shot', 'hit',
          'faceoff', 'stoppage', 'delayed-penalty', 'timeout',
          'goalie-change', 'giveaway', 'takeaway',
        ];
        if (repeatable.includes(t)) continue;

        // Penalties are repeatable — skip (power plays will be gone by now anyway)
        if (t === 'penalty') continue;

        // Goals: only fire patterns for the FIRST goal of each team
        // so "VAN scores first goal" marks correctly
        if (t === 'goal') {
          const tid = play.details?.eventOwnerTeamId;
          const isHome = tid === homeTeam.id;
          const isAway = tid === awayTeam.id;
          // If this team had already scored before this play in history, skip
          // We count goals in order — track as we go
          if (isHome) {
            // Was this the FIRST home goal? Check if any earlier goal exists
            const priorHomeGoal = plays
              .filter(p => p.eventId < play.eventId &&
                           (p.typeDescKey || '').toLowerCase() === 'goal' &&
                           p.details?.eventOwnerTeamId === homeTeam.id)
              .length > 0;
            if (priorHomeGoal) continue; // not the first — skip
          } else if (isAway) {
            const priorAwayGoal = plays
              .filter(p => p.eventId < play.eventId &&
                           (p.typeDescKey || '').toLowerCase() === 'goal' &&
                           p.details?.eventOwnerTeamId === awayTeam.id)
              .length > 0;
            if (priorAwayGoal) continue;
          }
          // Fall through — process this as the first goal
        }

        // Fights: only fire the first fight
        if (t === 'fight') {
          const priorFight = plays
            .filter(p => p.eventId < play.eventId &&
                         (p.typeDescKey || '').toLowerCase() === 'fight')
            .length > 0;
          if (priorFight) continue;
        }

        // Period events: only fire period-start for OT/shootout (not P1/P2/P3 — those are gone)
        if (t === 'period-start') {
          const p = play.periodDescriptor?.number ?? 0;
          if (p < 4) continue; // skip regular period starts from history
        }
        if (t === 'period-end') continue; // skip all period ends from history

        // Icing is repeatable — skip
        // (already covered by stoppage above, but be explicit)
      }
      // ── End first-poll filtering ──────────────────────────────────────────

      const isTrackedTeamEvent = play.details?.eventOwnerTeamId === trackedTeamId.current;

      // Pass the ACTUAL scoring team's abbreviation so team-named squares
      // like "CHI scores first goal" match when CHI scored (not just "my team")
      const scoringTeamId = play.details?.eventOwnerTeamId;
      const scoringAbbr =
        scoringTeamId === homeTeam.id ? homeTeam.abbrev :
        scoringTeamId === awayTeam.id ? awayTeam.abbrev :
        (homeTeamAbbr || myTeamAbbr);

      const patterns = mapNHLEventToSquares(
        play, scoringAbbr, isTrackedTeamEvent,
        homeTeam.abbrev, awayTeam.abbrev
      );
      newPatterns.push(...patterns);

      // Build a human-readable event description for chat
      const chatLine = buildEventChatLine(play, homeTeam.abbrev, awayTeam.abbrev, homeTeam.id, awayTeam.id);
      if (chatLine) newFeedEvents.push(chatLine);

      // Detect icing for selfie challenge
      // NHL API uses multiple fields — check all of them
      const playType   = (play.typeDescKey || '').toLowerCase();
      const playDesc   = (play.descKey || play.details?.descKey || '').toLowerCase();
      const playReason = (play.details?.reason || play.details?.stopReason || '').toLowerCase();
      const allText    = playType + ' ' + playDesc + ' ' + playReason;
      if (playType === 'stoppage' && allText.includes('icing')) {
        setIcingEvent({ timestamp: Date.now(), period, eventId: play.eventId });
      }
    }

    // ── Score-based squares ───────────────────────────────────────────────────
    const scorePatterns = mapScoreStateToSquares(
      {
        homeTeam: { id: homeTeam.id, score: homeTeam.score ?? 0 },
        awayTeam: { id: awayTeam.id, score: awayTeam.score ?? 0 },
        periodDescriptor: pbp.periodDescriptor,
      },
      trackedTeamId.current
    );
    newPatterns.push(...scorePatterns);

    // ── Power play ────────────────────────────────────────────────────────────
    const lastPlay = plays[plays.length - 1];
    if (lastPlay?.situationCode) {
      const sc = lastPlay.situationCode;
      // Format: [awayGoalie][awaySkaters][homeSkaters][homeGoalie]
      const awaySkaters = parseInt(sc[1]) || 5;
      const homeSkaters = parseInt(sc[2]) || 5;  // position 2, not 3
      const myIsHome = homeTeam.id === trackedTeamId.current;
      const myOn  = myIsHome ? homeSkaters : awaySkaters;
      const oppOn = myIsHome ? awaySkaters : homeSkaters;
      if (Math.abs(myOn - oppOn) >= 2) newPatterns.push('5-on-3 Power Play');
      else if (myOn > oppOn)           newPatterns.push('Power Play Called');
    }

    if (newPatterns.length > 0) {
      setAutoMarkPatterns(prev => [...prev, ...newPatterns]);
    }
    if (newFeedEvents.length > 0) {
      setFeedEvents(prev => [...prev, ...newFeedEvents]);
    }
  }, [sport, homeTeamAbbr, awayTeamAbbr, myTeamAbbr]);

  // Clears the processed event ID cache so all historical plays re-fire.
  // Safe to call mid-game after deploying a matcher fix.
  const reprocessAllPlays = useCallback(() => {
    // Add a sentinel value so the isFirstPoll guard knows this is a reprocess,
    // not a cold start — use a special key that can't be a real eventId
    processedEventIds.current = new Set(['__reprocess__']);
    poll();
  }, [poll]);

  // ── Reset when the matchup changes (new room) ─────────────────────────────
  useEffect(() => {
    currentGameId.current     = null;
    trackedTeamId.current     = null;
    processedEventIds.current = new Set();
    setConnectionStatus('idle');
    setGameInfo(null);
  }, [homeTeamAbbr, awayTeamAbbr]);

  // ── Polling lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || sport !== 'hockey') return;
    poll();
    pollTimer.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(pollTimer.current);
  }, [enabled, sport, poll]);

  return { gameInfo, autoMarkPatterns, clearAutoMark, feedEvents, clearFeedEvents, icingEvent, clearIcingEvent, connectionStatus, gameWon, reprocessAllPlays };
}
