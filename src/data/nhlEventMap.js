// src/data/nhlEventMap.js
//
// Maps NHL API play-by-play event typeDescKey values to
// bingo square text patterns (substring match, case-insensitive).
//
// Event docs: https://api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play

/**
 * Returns an array of bingo square text patterns to auto-mark.
 *
 * @param {object} event   - NHL play-by-play event object
 * @param {string} myTeamAbbr - e.g. 'COL'
 * @param {boolean} isMyTeamEvent - true if the event was caused by my team
 * @returns {string[]} - array of square text substrings to match
 */
export function mapNHLEventToSquares(event, myTeamAbbr, isMyTeamEvent) {
  const type = (event.typeDescKey || '').toLowerCase();
  const detail = (event.descKey || '').toLowerCase();
  const period = event.periodDescriptor?.number ?? 0;
  const squares = [];

  switch (type) {
    case 'goal':
      squares.push('Goal Scored');
      if (isMyTeamEvent) {
        squares.push('Your Team Scores First');
      } else {
        squares.push('Opponent Scores First');
      }
      if (detail.includes('penalty-shot')) squares.push('Penalty Shot Awarded');
      if (event.situationCode?.[1] === '3') squares.push('Shorthanded Goal');
      if (period > 3) squares.push('Empty Net Goal'); // OT goals often on empty net
      break;

    case 'penalty':
      squares.push('Penalty Called');
      const pimStr = String(event.details?.duration || '');
      if (pimStr === '5' || detail.includes('fight') || detail.includes('major')) {
        squares.push('Fight Breaks Out');
      }
      if (detail.includes('misconduct') || detail.includes('game-misconduct')) {
        squares.push('Player Gets Ejected');
      }
      break;

    case 'shot-on-goal':
      squares.push('Slap Shot'); // generic "shot on goal" matches slap shot
      break;

    case 'blocked-shot':
      squares.push('Goalie Makes Pad Save');
      break;

    case 'missed-shot':
      if (detail.includes('post') || detail.includes('bar')) {
        squares.push('Puck Hits the Post');
      }
      break;

    case 'stoppage':
      if (detail.includes('icing')) squares.push('Icing Called');
      if (detail.includes('offside')) squares.push('Offside Called');
      break;

    case 'delayed-penalty':
      squares.push('Delayed Penalty');
      break;

    case 'period-start':
      break;

    case 'period-end':
      if (period === 3) {
        // will be checked via score comparison in the hook
      }
      if (period > 3) {
        squares.push('Game Goes to Overtime');
      }
      break;

    case 'shootout-complete':
      squares.push('Overtime Shootout');
      break;

    case 'penalty-shot':
      squares.push('Penalty Shot Awarded');
      break;

    case 'challenge':
      squares.push("Coach Challenges a Call");
      break;

    case 'fight':
      squares.push('Fight Breaks Out');
      break;

    case 'goalie-change':
      squares.push('Goalie Gets Pulled');
      break;

    default:
      break;
  }

  return squares;
}

/**
 * Check whether the event was caused by the specified team.
 */
export function eventBelongsToTeam(event, teamAbbr) {
  if (!teamAbbr) return false;
  const eventTeam = event.details?.eventOwnerTeamId ?? null;
  // The NHL API returns team IDs not abbreviations in play-by-play;
  // we resolve this in the hook where we know the full team objects.
  return eventTeam !== null;
}

/**
 * Map live score state to auto-markable squares.
 * Called when the score changes.
 */
export function mapScoreStateToSquares(linescore, myTeamId) {
  const squares = [];
  const { homeTeam, awayTeam, periodDescriptor } = linescore;
  const period = periodDescriptor?.number ?? 0;

  const myScore   = homeTeam.id === myTeamId ? homeTeam.score : awayTeam.score;
  const oppScore  = homeTeam.id === myTeamId ? awayTeam.score : homeTeam.score;
  const diff      = Math.abs(myScore - oppScore);

  if (period === 3 && myScore === oppScore) squares.push('Game Tied in 3rd');
  if (period > 3) squares.push('Game Goes to Overtime');

  return squares;
}

// Human-readable power-play situation codes
// First digit: away skaters on ice; second digit: home skaters on ice
// '0' means goalie pulled
export function parseSituationCode(code, isHomeTeam) {
  if (!code || code.length < 4) return null;
  const awaySkaters = parseInt(code[0]);
  const homeSkaters = parseInt(code[2]);
  const mySkaters   = isHomeTeam ? homeSkaters : awaySkaters;
  const oppSkaters  = isHomeTeam ? awaySkaters : homeSkaters;

  if (mySkaters > oppSkaters)  return 'powerplay';
  if (mySkaters < oppSkaters)  return 'shorthanded';
  if (mySkaters === 5 && oppSkaters === 3) return '5on3';
  return 'even';
}
