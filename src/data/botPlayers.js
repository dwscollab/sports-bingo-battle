// src/data/botPlayers.js
import { v4 as uuidv4 } from 'uuid';
import { NHL_TEAMS, NFL_TEAMS, NBA_TEAMS } from './teamColors.js';

const BOT_NAMES = [
  'PuckBot 🤖', 'IceBot 🤖', 'SlappyBot 🤖', 'GoalieBot 🤖',
  'RefBot 🤖', 'ZamboniBot 🤖', 'BoardBot 🤖', 'HatTrickBot 🤖',
];

const BOT_TEAM_POOLS = {
  hockey: Object.keys(NHL_TEAMS),
  nfl:    Object.keys(NFL_TEAMS),
  nba:    Object.keys(NBA_TEAMS),
};

/**
 * Creates a bot player object for Firebase.
 * @param {number} index - 0, 1, or 2
 * @param {string} sport
 * @param {string} [preferredTeamAbbr] - optional opponent team to root for
 */
export function createBotPlayer(index, sport, preferredTeamAbbr) {
  const teamPool = BOT_TEAM_POOLS[sport] || BOT_TEAM_POOLS.hockey;
  const teamAbbr = preferredTeamAbbr || teamPool[Math.floor(Math.random() * teamPool.length)];
  const teamMap  = { hockey: NHL_TEAMS, nfl: NFL_TEAMS, nba: NBA_TEAMS }[sport] || NHL_TEAMS;
  const team     = teamMap[teamAbbr];

  return {
    name:        BOT_NAMES[index % BOT_NAMES.length],
    team:        teamAbbr,
    colors:      team ? { primary: team.primary, secondary: team.secondary, text: team.text, name: team.name } : null,
    bingo:       false,
    bingoLine:   null,
    battleShots: 0,
    isBot:       true,
    botId:       uuidv4().slice(0, 8),
    card:        null, // set after card generation
  };
}

/**
 * Bot AI tick — decides what the bot does next.
 * Called periodically by the host's useEffect.
 *
 * Returns a list of actions: { type: 'mark' | 'battleShot', ... }
 */
export function botTick(botPlayer, allPlayers, playerId) {
  if (!botPlayer?.card || botPlayer.bingo) return [];
  const actions = [];

  const card = botPlayer.card;
  const unmarked = card
    .map((sq, idx) => ({ sq, idx }))
    .filter(({ sq }) => !sq.isMarked && !sq.isBlocked && !sq.isFree);

  if (unmarked.length === 0) return actions;

  // ~25% chance per tick to mark a random unmarked square
  if (Math.random() < 0.25) {
    const pick = unmarked[Math.floor(Math.random() * unmarked.length)];
    actions.push({ type: 'mark', squareIndex: pick.idx });
  }

  // ~15% chance to fire a battle shot if the bot has one
  if (botPlayer.battleShots > 0 && Math.random() < 0.15) {
    const humanPlayers = Object.entries(allPlayers).filter(
      ([pid, p]) => pid !== playerId && !p.isBot && !p.bingo
    );
    if (humanPlayers.length > 0) {
      const [targetPid, targetP] = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];
      const targetUnmarked = (targetP.card || [])
        .map((sq, idx) => ({ sq, idx }))
        .filter(({ sq }) => !sq.isMarked && !sq.isBlocked && !sq.isFree);

      if (targetUnmarked.length > 0) {
        const sq = targetUnmarked[Math.floor(Math.random() * targetUnmarked.length)];
        actions.push({ type: 'battleShot', targetPlayerId: targetPid, targetSquareIndex: sq.idx, targetPlayerName: targetP.name });
      }
    }
  }

  return actions;
}

/**
 * Check bingo for a card (simple version for bot use).
 */
export function checkBotBingo(card) {
  const SIZE = 5;
  const lines = [];
  for (let r = 0; r < SIZE; r++) lines.push([r*5, r*5+1, r*5+2, r*5+3, r*5+4]);
  for (let c = 0; c < SIZE; c++) lines.push([c, c+5, c+10, c+15, c+20]);
  lines.push([0,6,12,18,24]);
  lines.push([4,8,12,16,20]);
  for (const line of lines) {
    if (line.every(i => card[i]?.isMarked && !card[i]?.isBlocked)) return line;
  }
  return null;
}
