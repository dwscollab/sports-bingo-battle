// src/data/nhlEventMap.js
// Maps NHL API play-by-play events to bingo square text patterns.

/**
 * matchesSquare — smart matching that handles LLM text variations.
 *
 * Checks three ways (any one passing = match):
 * 1. Direct substring: sq.includes(pattern)
 * 2. Normalized: strip hyphens/punctuation, then substring
 * 3. Word-set: every word in the pattern appears somewhere in the square
 *
 * Plus blockers to prevent false positives.
 */
export function matchesSquare(squareText, pattern) {
  const sq  = squareText.toLowerCase().trim();
  const pat = pattern.toLowerCase().trim();

  // Normalize: remove hyphens and extra punctuation for comparison
  const normalize = s => s.replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
  const sqN  = normalize(sq);
  const patN = normalize(pat);

  const directMatch = sq.includes(pat) || sqN.includes(patN);

  // Word-set fallback: every word in pattern (length > 2) appears in square
  const patWords = patN.split(' ').filter(w => w.length > 2);
  const wordSetMatch = patWords.length >= 2 && patWords.every(w => sqN.includes(w));

  if (!directMatch && !wordSetMatch) return false;

  // ── Blocker guards to prevent false positives ────────────────────────────

  // "goal scored" must not match qualified goal squares
  if (pat === 'goal scored') {
    const blockers = ['overtime', 'ot goal', 'shootout', 'shorthanded', 'short handed',
                      'power play', 'powerplay', 'empty net',
                      'game winning', 'game winner', 'winning goal',
                      'first goal', 'scores first'];
    if (blockers.some(b => sqN.includes(b))) return false;
  }

  // "celebrates goal" / "player celebrates" must not match game-winning squares
  if (pat === 'celebrates goal' || pat === 'player celebrates' || pat === 'goal celebration') {
    if (['game winning', 'game winner', 'winning goal'].some(b => sqN.includes(b))) return false;
  }

  // Generic "scores first" patterns are no longer emitted — team-specific only.
  // If somehow encountered, require exact team abbr match between pattern and square.
  if (pat === 'scores first' || pat === 'scores first goal') {
    if (sq.includes('your team scores') || sq.includes('opponent scores')) return true;
    // Both pattern and square must start with the same team abbr
    const patTeam = pat.split(' ')[0];
    const sqTeam  = sq.split(' ')[0];
    if (patTeam.length >= 2 && patTeam.length <= 4 && patTeam === sqTeam) return true;
    return false;
  }

  // OT patterns must reference overtime
  if (pat === 'overtime goal' || pat === 'overtime winner') {
    if (!sqN.includes('overtime') && !sqN.includes('ot ')) return false;
  }

  // "[TEAM] celebrates/scores/goal" must only match squares for that exact team
  const teamPrefixMatch = pat.match(/^([a-z]{2,4}) (scores|celebrates|goal|player)/);
  if (teamPrefixMatch) {
    const patTeam = teamPrefixMatch[1];
    const sqTeam  = sq.split(' ')[0];
    // If the square also starts with a team abbr and it's different — block
    if (sqTeam && sqTeam !== patTeam && sqTeam.length >= 2 && sqTeam.length <= 4 &&
        sq.match(/^[a-z]{2,4} (scores|goal|player|celebrates|gets|wins|pulls|ices|coach)/)) {
      return false;
    }
  }

  // "[TEAM] scores" must only match squares for that exact team
  const teamScoresMatch = pat.match(/^([a-z]{2,4}) scores/);
  if (teamScoresMatch) {
    const patTeam = teamScoresMatch[1];
    const sqTeam  = sq.split(' ')[0];
    if (sqTeam && sqTeam !== patTeam && sq.match(/^[a-z]{2,4} (scores|goal)/)) return false;
  }

  // "[TEAM] X" word-set match must not fire if square contains "scores"
  // in a way that means the team scored — e.g. "van power play" must not
  // match "VAN scores on power play" because "scores" changes the meaning.
  // Rule: if pattern doesn't contain "scores" but square contains "[team] scores",
  // the word-set match is a false positive.
  if (wordSetMatch && !directMatch && !pat.includes('scores')) {
    const sqTeamScores = sq.match(/^([a-z]{2,4})\s+scores/);
    const patTeam = pat.split(' ')[0];
    if (sqTeamScores && sqTeamScores[1] !== patTeam) return false;
    // Also block if square has "[patteam] scores" — means team scored, not just had the thing
    if (sq.match(new RegExp(`^${patTeam}\\s+scores`))) {
      if (!pat.includes('scores')) return false;
    }
  }

  // Team-specific goalie patterns: "chi goalie" must not match "min goalie pulled" square
  if (pat.match(/^[a-z]{2,4} goalie/)) {
    const patTeam = pat.split(' ')[0];
    if (sqN.match(/^[a-z]{2,4} goalie/) && !sqN.startsWith(patTeam)) return false;
  }

  return true;
}

// ── Main event mapper ─────────────────────────────────────────────────────────
export function mapNHLEventToSquares(event, scoringTeamAbbr, isTrackedTeamEvent, homeAbbr, awayAbbr) {
  const isMyTeamEvent = isTrackedTeamEvent;
  const myTeamAbbr    = scoringTeamAbbr;
  const type          = (event.typeDescKey || '').toLowerCase();
  const detail        = (event.details?.descKey || '').toLowerCase();
  const period        = event.periodDescriptor?.number ?? 0;
  const situationCode = event.situationCode ?? '';
  const squares       = [];

  switch (type) {

    case 'goal': {
      // NHL situationCode format: [awayGoalie][awaySkaters][homeSkaters][homeGoalie]
      // e.g. "1551" = awayGoalie(1), away5, home5, homeGoalie(1) = 5v5 both goalies in
      //      "1541" = awayGoalie(1), away5, home4, homeGoalie(1) = 5v4 away PP
      //      "0651" = awayGoalie(0=pulled), away6, home5, homeGoalie(1) = empty net away
      const sc = situationCode.length === 4 ? situationCode : '1551';
      const awayGoalie  = sc[0] === '1';
      const awaySkaters = parseInt(sc[1]) || 5;
      const homeSkaters = parseInt(sc[2]) || 5;   // position 2 = home skaters
      const homeGoalie  = sc[3] === '1';           // position 3 = home goalie

      const isOT    = period > 3;
      // isEmpty: the DEFENDING team (not scoring) has their goalie pulled
      const isEmpty = isMyTeamEvent ? !homeGoalie : !awayGoalie;
      const scoringSkaters   = isMyTeamEvent ? awaySkaters : homeSkaters;
      const defendingSkaters = isMyTeamEvent ? homeSkaters : awaySkaters;
      const isPP = scoringSkaters > defendingSkaters && !isOT;
      const isSH = scoringSkaters < defendingSkaters && !isOT;

      if (isOT) {
        squares.push('Overtime Goal', 'overtime goal', 'Overtime winner', 'overtime winner scored');
        if (isEmpty) squares.push('Empty Net Goal', 'empty net goal');
      } else if (isPP) {
        squares.push('Power Play Goal', 'power play goal', 'powerplay goal', 'Goal Scored');
      } else if (isSH) {
        squares.push('Shorthanded Goal', 'Short-handed Goal', 'shorthanded goal',
                     'short handed goal', 'short-handed goal', 'gets short-handed',
                     'gets shorthanded', 'scores short-handed', 'scores shorthanded',
                     'scores short', 'Goal Scored');
        if (scoringTeamAbbr) {
          const a = scoringTeamAbbr.toLowerCase();
          squares.push(`${a} scores short`);  // "VAN scores short-handed"
        }
      } else if (isEmpty) {
        squares.push('Empty Net Goal', 'empty net goal', 'Goal Scored');
      } else {
        squares.push('Goal Scored');
      }

      if (isMyTeamEvent) squares.push('Your Team Scores');
      else               squares.push('Opponent Scores');

      // Team-specific patterns only — using the ACTUAL scoring team's abbr.
      // All celebration and scoring patterns are prefixed so they never
      // cross-match another team's square.
      if (scoringTeamAbbr) {
        const a = scoringTeamAbbr.toLowerCase();
        squares.push(`${a} scores`);            // "TBL scores on power play", "TBL scores first goal"
        squares.push(`${a} scores first`);      // "TBL scores first goal"
        squares.push(`${a} player celebrates`); // "TBL player celebrates goal"
        squares.push(`${a} celebrates`);        // "TBL celebrates"
        squares.push(`${a} player celebrat`);   // prefix match
        // NOTE: do NOT push "${a} goal" — it's too short and word-set matches
        // unrelated squares like "TBL goalie pulled" or "TBL gets short-handed goal"
      }
      // Generic celebration only for non-team-prefixed squares like "Player celebrates goal"
      squares.push('Player celebrates goal');   // exact match — no team prefix
      squares.push('goal celebration');         // generic

      if (detail.includes('hat') || detail.includes('hat-trick')) {
        squares.push('Hat Trick', 'hat trick', 'gets hat trick', 'hat trick scored');
      }
      if (detail.includes('penalty-shot')) squares.push('Penalty Shot Awarded');
      break;
    }

    case 'penalty': {
      squares.push('Penalty Called', 'penalty called', 'gets penalty');

      const durationNum = parseInt(event.details?.duration ?? event.details?.pimMinutes ?? 0);
      const typeCode    = (event.details?.typeCode    || '').toLowerCase();
      const descCode    = (event.details?.descKey     || event.details?.penaltyCode || detail).toLowerCase();

      const isFight = durationNum === 5
        || typeCode.includes('fight') || typeCode.includes('major')
        || descCode.includes('fight') || descCode.includes('roughing');

      if (isFight) {
        squares.push('Fight Breaks Out', 'fight breaks out', 'drops gloves',
                     'drops the gloves', 'Player drops gloves', 'Players fight',
                     'fight after', 'gloves drop');
      }

      // Benefiting team gets power play
      const benefitingAbbr = isMyTeamEvent
        ? (homeAbbr?.toUpperCase() === scoringTeamAbbr?.toUpperCase() ? awayAbbr : homeAbbr)
        : scoringTeamAbbr;
      const penalizedAbbr = isMyTeamEvent ? scoringTeamAbbr : null;

      squares.push('Power Play Called', 'gets power play', 'power play', 'on power play');

      if (benefitingAbbr) {
        const b = benefitingAbbr.toLowerCase();
        // Use specific phrases only — avoid short patterns that word-set match "scores on power play"
        squares.push(`${b} gets power play`);   // "VAN gets power play"
        squares.push(`${b} on power play`);      // "VAN on power play"
        // Do NOT push bare "${b} power play" — word-set would match "${b} scores on power play"
      }
      if (penalizedAbbr) {
        const p = penalizedAbbr.toLowerCase();
        squares.push(`${p} player gets`, `${p} gets penalty`, `${p} penalty`);
        const periodNames = ['', 'first', 'second', 'third'];
        const pName = periodNames[period] || '';
        if (pName) {
          squares.push(`penalty in ${pName}`, `${p} penalty in ${pName}`, `${p} in ${pName} period`);
        }
      }
      const periodLabels = ['', 'first', 'second', 'third'];
      const pLabel = periodLabels[period] || '';
      if (pLabel) squares.push(`penalty in ${pLabel}`, `in ${pLabel} period`);

      if (descCode.includes('cross') || descCode.includes('crosscheck')) {
        squares.push('Cross-check', 'Cross Check', 'cross checking', 'crosschecking');
      }
      if (descCode.includes('boarding'))     squares.push('Boarding', 'boarding penalty');
      if (descCode.includes('hooking'))      squares.push('Hooking');
      if (descCode.includes('tripping'))     squares.push('Tripping');
      if (descCode.includes('high-stick') || descCode.includes('highstick')) squares.push('High Stick');
      if (descCode.includes('interference')) squares.push('Interference');
      if (descCode.includes('delay') || typeCode.includes('delay')) {
        squares.push('delay of game', 'delay of game pen', 'gets delay');
      }
      if (descCode.includes('too-many') || descCode.includes('too many') || typeCode.includes('too-many')) {
        squares.push('Too Many Men', 'too many men', 'too many skaters');
      }
      if (descCode.includes('misconduct') || typeCode.includes('misconduct')) {
        squares.push('Player Gets Ejected', 'ejected', 'game misconduct',
                     'misconduct', 'misconduct pen', 'gets misconduct');
      }
      if (durationNum === 4 || descCode.includes('double')) {
        squares.push('Double minor', 'double minor penalty');
      }
      if (descCode.includes('check') || typeCode.includes('check')) {
        squares.push('checks hard', 'player checks', 'big hit');
      }
      break;
    }

    case 'hit':
      // Some feeds have explicit hit events
      squares.push('checks hard', 'player checks', 'big hit', 'huge hit', 'checks');
      if (scoringTeamAbbr) {
        squares.push(`${scoringTeamAbbr.toLowerCase()} player check`);
      }
      break;

    case 'shot-on-goal':
      squares.push('Slap Shot', 'shot on goal', 'slap shot', 'takes shot');
      break;

    case 'blocked-shot':
      // Could be goalie or skater block
      squares.push('Goalie Makes Pad Save', 'Goalie Makes Glove Save', 'Goalie Makes Save',
                   'makes save', 'makes pad save', 'makes glove save',
                   'goalie makes', 'makes huge save', 'makes amazing save',
                   'spectacular save', 'big save', 'great save');
      break;

    case 'missed-shot':
      if (detail.includes('post') || detail.includes('crossbar') || detail.includes('bar')) {
        squares.push('Hits the Post', 'hits the post', 'hits goalpost',
                     'hit the post', 'off the post', 'rings the post');
      }
      break;

    case 'stoppage':
      if (detail.includes('icing')) {
        squares.push('Icing', 'icing called', 'ices the puck', 'icing on');
        if (scoringTeamAbbr) {
          const a = scoringTeamAbbr.toLowerCase();
          squares.push(`${a} ices`, `${a} icing`);
        }
      }
      if (detail.includes('offside')) squares.push('Offside', 'offside called');
      if (detail.includes('injury') || detail.includes('injured')) {
        squares.push('Player injured', 'player injured', 'injury', 'player limps');
      }
      if (detail.includes('stick') || detail.includes('broken-stick')) {
        squares.push('Stick breaks', 'stick breaks', 'broken stick', 'Stick broken');
      }
      if (detail.includes('puck-over-glass') || detail.includes('puck out')) {
        squares.push('Puck goes out', 'puck over glass', 'puck out of play');
      }
      break;

    case 'injury':
      squares.push('Player injured', 'player injured', 'injury', 'player limps',
                   'limps off', 'helped off');
      break;

    case 'broken-stick':
      squares.push('Stick breaks', 'stick breaks', 'broken stick', 'Stick broken', 'during play');
      break;

    case 'delayed-penalty':
      squares.push('Delayed Penalty', 'delayed penalty');
      break;

    case 'faceoff':
      squares.push('wins faceoff', 'wins face-off', 'face off win', 'faceoff win',
                   'wins the faceoff', 'wins face off');
      if (scoringTeamAbbr) {
        const a = scoringTeamAbbr.toLowerCase();
        squares.push(`${a} wins faceoff`, `${a} wins face`, `${a} face`);
      }
      break;

    case 'timeout':
      squares.push('takes timeout', 'calls timeout', 'timeout called');
      if (scoringTeamAbbr) {
        const a = scoringTeamAbbr.toLowerCase();
        squares.push(`${a} timeout`, `${a} takes timeout`, `${a} calls timeout`);
      }
      break;

    case 'period-start':
      break;

    case 'period-end':
      if (period > 3) squares.push('Game Goes to Overtime');
      break;

    case 'game-end':
    case 'period-end-final':
      squares.push('Game-winning goal', 'game-winning goal', 'game winner',
                   'winning goal', 'game winning');
      break;

    case 'challenge':
      squares.push('Coach Challenges', 'coach challenges', 'takes timeout',
                   'Replay Review', 'replay review', 'goal overturned',
                   'referee waves off', 'waves off goal', 'coach yells',
                   'argues with ref', 'yells at ref');
      if (scoringTeamAbbr) {
        const a = scoringTeamAbbr.toLowerCase();
        squares.push(`${a} coach`, `${a} challenge`);
      }
      break;

    case 'fight':
      squares.push('Fight Breaks Out', 'fight breaks out', 'drops gloves',
                   'drops the gloves', 'Player drops gloves', 'Players fight',
                   'fight after', 'gloves drop');
      break;

    case 'goalie-change': {
      squares.push('Goalie Gets Pulled', 'Goalie Pulled', 'goalie pulled', 'pulls goalie');
      if (scoringTeamAbbr) {
        const t = scoringTeamAbbr.toLowerCase();
        squares.push(`${t} goalie`, `${t} pulls goalie`, `${t} goalie pulled`,
                     `${t} pulled for extra`, `${t} goalie pulled for`);
      }
      break;
    }

    case 'shootout-complete':
      squares.push('Overtime Shootout', 'wins game in shootout', 'Shootout',
                   'shootout', 'game goes to shootout', 'goes to shootout');
      break;

    case 'penalty-shot':
      squares.push('Penalty Shot Awarded', 'Penalty Shot', 'penalty shot',
                   'gets penalty shot');
      break;

    default:
      break;
  }

  return squares;
}

// ── Score-state squares ───────────────────────────────────────────────────────
export function mapScoreStateToSquares(linescore, myTeamId) {
  const squares = [];
  const { homeTeam, awayTeam, periodDescriptor } = linescore;
  const period = periodDescriptor?.number ?? 0;

  const myScore  = homeTeam.id === myTeamId ? homeTeam.score  : awayTeam.score;
  const oppScore = homeTeam.id === myTeamId ? awayTeam.score  : homeTeam.score;

  if (period === 3 && myScore === oppScore) squares.push('Game Tied in 3rd');
  if (period > 3)                           squares.push('Game Goes to Overtime');

  return squares;
}
