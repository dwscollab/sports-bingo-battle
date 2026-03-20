// src/data/botPlayers.js
import { v4 as uuidv4 } from 'uuid';
import { NHL_TEAMS, NFL_TEAMS, NBA_TEAMS } from './teamColors.js';

// ── Letterkenny characters ────────────────────────────────────────────────────

export const LETTERKENNY_CHARACTERS = [
  {
    name: 'Wayne 🌾',
    // Short, dry, decisive. "To be fair." "Hard no." "Figure it out."
    // Rapid-fire insult chains, pitter patter.
    idle: [
      "To be fair.",
      "Pitter patter, let's get at 'er.",
      "Hard no.",
      "Figure it out.",
      "That's a Texas-sized 10-4.",
      "You're spare parts, bud.",
      "Ain't that the way she goes.",
      "Give yer balls a tug.",
      "That's a good problem to have.",
      "How's yer father?",
      "Thirty bucks is thirty bucks.",
      "It's a hard life picking stones and pulling stumps.",
    ],
    winning: [
      "Pitter patter, BINGO's done.",
      "Figure it out. I did.",
      "That's a Texas-sized 10-4 on that BINGO.",
      "Hard yes on that one.",
    ],
    losing: [
      "Well that ain't ideal.",
      "Give yer balls a tug, I'll catch up.",
      "To be fair, you got lucky.",
      "Hard no on that result.",
    ],
    battleShot: [
      "Blocked. You're spare parts, bud.",
      "To be fair, you never saw that coming.",
      "Give yer balls a tug, that square's gone.",
      "That's a hard no on that square for ya.",
    ],
    markedSquare: [
      "Pitter patter.",
      "That's a 10-4.",
      "Figure it out.",
      "Yep.",
    ],
  },
  {
    name: 'Squirrelly Dan 🐿️',
    // Adds "s" to random words. "I appreciates it." "What she saids was..."
    // Malapropisms, word salad, oddly philosophical.
    idle: [
      "I appreciates it.",
      "That's not what she said. What she saids was...",
      "I finds that very interestings.",
      "Allegedly.",
      "Well I'll tells ya, the words is important.",
      "She was a beaut, she was.",
      "I'm not not sayin' it.",
      "Now THAT is a good looks.",
      "Allegedly she was very into it.",
      "The things is, right, the things is...",
      "Words is hard sometimes, bud.",
    ],
    winning: [
      "I appreciates this BINGO very much.",
      "That's not what she saids would happen but here we is.",
      "Allegedly I just wins.",
    ],
    losing: [
      "I finds that very disappointings.",
      "Allegedly that squares was mine.",
      "What she saids was I was gonna win.",
    ],
    battleShot: [
      "I appreciates blockins that square.",
      "That's not what she saids you'd wants.",
      "Allegedly your square is mine now.",
    ],
    markedSquare: [
      "I appreciates it.",
      "Allegedly.",
      "That's the ones.",
      "Yeps.",
    ],
  },
  {
    name: 'Reilly 🏒',
    // Hockey bro. "Ferda." "Bro." "Chel." "Chirpin'." "Titties." "Tilt."
    // Everything is about hockey and being a bro.
    idle: [
      "Ferda boys!",
      "Bro that was FILTHY.",
      "Let's go bro, ferda!",
      "Absolute beauty, bro.",
      "Tilt! Full tilt!",
      "That celly was sick bro.",
      "Chel later bro?",
      "Bro those mitts though.",
      "Chirp city out here.",
      "That's gross bro. Beauuutiful.",
      "Rip it, bro. Top shelf where mama hides the cookies.",
      "Boys, it's a puck drop situation. Ferda.",
    ],
    winning: [
      "FERDA! BINGO bro!",
      "Absolute filth, bro. Let's go!",
      "Tilt! Full tilt BINGO!",
      "That's beauty bro, beauty.",
    ],
    losing: [
      "Bro that's a tilt situation.",
      "Nah bro, that ain't ferda.",
      "Full tilt disappointment bro.",
    ],
    battleShot: [
      "CHIRP! Blocked that square bro!",
      "Ferda blocking your square!",
      "That's filthy bro. Beauty block.",
    ],
    markedSquare: [
      "Ferda!",
      "Beauty bro!",
      "Filthy!",
      "Let's go bro!",
    ],
  },
  {
    name: 'Jonesy 🏒',
    // Reilly's twin energy. "Yo." "Yer not wrong." "Hardest working guy in the room."
    // Same hockey bro dialect, slightly dumber.
    idle: [
      "Yo bro, let's go!",
      "Yer not wrong.",
      "I'm the hardest working guy in this room bro.",
      "Bro I'm literally built different.",
      "Yo that's nasty bro.",
      "Bender alert! Bender alert!",
      "My bad bro, my bad.",
      "Yo I'm so tilted right now.",
      "Bro that's a clapper from the point.",
      "I'm not even sorry bro.",
      "Snipe city population me.",
      "Yo Reilly— oh wait it's just us.",
    ],
    winning: [
      "YO! BINGO! I'm literally built different!",
      "Yer not wrong — I just won!",
      "Hardest working guy in the room WINS!",
    ],
    losing: [
      "Yo I'm so tilted bro.",
      "My bad, my bad, my bad.",
      "Bro I am a bender right now.",
    ],
    battleShot: [
      "Yo blocked! Snipe city population me!",
      "Bro your square is DONE. My bad not my bad.",
      "Yer not wrong that I just blocked that.",
    ],
    markedSquare: [
      "Yo!",
      "Snipe!",
      "Yer not wrong!",
      "Built different!",
    ],
  },
  {
    name: 'Katy 💅',
    // Wayne's sister. Confident, sharp, not taking anyone's shit.
    // "Ohhh, let's go." Short devastating reads of other players.
    idle: [
      "Ohhh, let's go.",
      "That's not a good look.",
      "Pull up.",
      "Oh, you're struggling.",
      "Don't embarrass yourself.",
      "Hard pass.",
      "Oh honey.",
      "That's unfortunate.",
      "Cool it, bud.",
      "Get it together.",
      "You call that playing?",
    ],
    winning: [
      "Ohhh, let's go. BINGO.",
      "Obviously.",
      "Did anyone expect differently?",
      "Pull up, I won.",
    ],
    losing: [
      "That's not a good look.",
      "We don't talk about this.",
      "I'm choosing not to acknowledge that.",
    ],
    battleShot: [
      "Pull up — that square's blocked.",
      "Oh honey, not that square.",
      "That's not a good look for you.",
    ],
    markedSquare: [
      "Obviously.",
      "Pull up.",
      "Let's go.",
      "Mmhm.",
    ],
  },
  {
    name: 'Stewart 🧪',
    // Drug-fueled intellectual. Scottish accent, big words, non sequiturs.
    // "Allegedly." "I would like to purchase some marijuana."
    idle: [
      "Allegedly.",
      "I've been known to partake.",
      "Intellectually speaking, this game is stimulating.",
      "I find this development most intriguing.",
      "The puck, she is a metaphor.",
      "Allegedly I'm winning.",
      "My cerebral cortex is fully engaged.",
      "This is making me want to eat an entire pizza.",
      "I am… considerably high right now.",
      "Allegedly none of this is real.",
      "The squares, they speak to me.",
      "I would like to purchase some more of this game.",
    ],
    winning: [
      "Allegedly I have achieved BINGO.",
      "My intellectual superiority is confirmed.",
      "The squares told me this would happen.",
      "Considerably excellent outcome.",
    ],
    losing: [
      "Allegedly that square was rigged.",
      "I find this outcome… unsatisfying.",
      "I am too high for this result.",
    ],
    battleShot: [
      "Allegedly your square no longer exists.",
      "I find blocking most intellectually satisfying.",
      "The square is gone. Allegedly.",
    ],
    markedSquare: [
      "Allegedly.",
      "Intriguing.",
      "As expected.",
      "Mmyes.",
    ],
  },
];

// ── Team pools ────────────────────────────────────────────────────────────────

const BOT_TEAM_POOLS = {
  hockey: Object.keys(NHL_TEAMS),
  nfl:    Object.keys(NFL_TEAMS),
  nba:    Object.keys(NBA_TEAMS),
};

// ── createBotPlayer ───────────────────────────────────────────────────────────

export function createBotPlayer(index, sport, preferredTeamAbbr) {
  const character = LETTERKENNY_CHARACTERS[index % LETTERKENNY_CHARACTERS.length];
  const teamPool  = BOT_TEAM_POOLS[sport] || BOT_TEAM_POOLS.hockey;
  const teamAbbr  = preferredTeamAbbr || teamPool[Math.floor(Math.random() * teamPool.length)];
  const teamMap   = { hockey: NHL_TEAMS, nfl: NFL_TEAMS, nba: NBA_TEAMS }[sport] || NHL_TEAMS;
  const team      = teamMap[teamAbbr];

  return {
    name:            character.name,
    characterIndex:  index % LETTERKENNY_CHARACTERS.length,
    team:            teamAbbr,
    colors:          team
      ? { primary: team.primary, secondary: team.secondary, text: team.text, name: team.name }
      : null,
    bingo:           false,
    bingoLine:       null,
    battleShots:     0,
    isBot:           true,
    botId:           uuidv4().slice(0, 8),
    card:            null,
  };
}

// ── getBotChatLine ────────────────────────────────────────────────────────────
// Returns a contextual Letterkenny line for the given trigger.
// trigger: 'idle' | 'winning' | 'losing' | 'battleShot' | 'markedSquare'

export function getBotChatLine(characterIndex, trigger) {
  const char = LETTERKENNY_CHARACTERS[characterIndex % LETTERKENNY_CHARACTERS.length];
  const pool = char[trigger] || char.idle;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── botTick ───────────────────────────────────────────────────────────────────

export function botTick(botPlayer, allPlayers, playerId) {
  if (!botPlayer?.card || botPlayer.bingo) return [];
  const actions = [];

  const card = botPlayer.card;
  const unmarked = card
    .map((sq, idx) => ({ sq, idx }))
    .filter(({ sq }) => !sq.isMarked && !sq.isBlocked && !sq.isFree);

  if (unmarked.length === 0) return actions;

  // ~25% chance to mark a square
  if (Math.random() < 0.25) {
    const pick = unmarked[Math.floor(Math.random() * unmarked.length)];
    actions.push({ type: 'mark', squareIndex: pick.idx });
  }

  // ~15% chance to fire a battle shot
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
        actions.push({
          type: 'battleShot',
          targetPlayerId: targetPid,
          targetSquareIndex: sq.idx,
          targetPlayerName: targetP.name,
        });
      }
    }
  }

  return actions;
}

// ── checkBotBingo ─────────────────────────────────────────────────────────────

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

// ── getMentionResponse ────────────────────────────────────────────────────────
// Called when a player @mentions a bot in chat.
// Returns a contextual Letterkenny reply directed at the tagger.

const MENTION_RESPONSES = [
  // index 0 — Wayne
  [
    "To be fair, you're gonna wanna pick yer battles.",
    "Figure it out, bud.",
    "Hard no on whatever you're implying.",
    "That's a Texas-sized 10-4, not interested.",
    "Give yer balls a tug. You called?",
    "Pitter patter. What do ya want?",
    "You're spare parts, but I'm listenin'.",
    "Thirty bucks says you regret taggin' me.",
  ],
  // index 1 — Squirrelly Dan
  [
    "I appreciates the mentions, I really does.",
    "What she saids was… you shouldn't oughts tag me like that.",
    "I finds that very interestings that you'd tag me.",
    "Allegedly I was mentioned.",
    "Well I'll tells ya, I hears my name.",
    "That's not what she saids would happen when you tags someone.",
    "I appreciates it. Truly I does.",
    "The words is: I hears ya.",
  ],
  // index 2 — Reilly
  [
    "YO bro you tagged me! Ferda!",
    "Bro what do you want I'm watching the game!",
    "You called? Let's go bro, ferda!",
    "Bro I am LOCKED IN right now and you're tagging me?",
    "Absolute chirp bro. What do you want?",
    "Yo I see you. Ferda. What's up?",
    "Bro I'm tilted you tagged me during a PP.",
    "YO. Present. What. Ferda.",
  ],
  // index 3 — Jonesy
  [
    "Yo bro I'm here! Yer not wrong to tag me!",
    "YO. I'm literally built different and you noticed.",
    "Bro I heard my name, what's good?",
    "Yo my bad, I was watching the game. What?",
    "Yer not wrong that I'm here bro.",
    "Bro you tagged me! I'm so hyped right now!",
    "Yo Reilly — oh wait, you tagged me. What's up bro?",
    "Yo I'm here bro. Built different and ready to chat.",
  ],
  // index 4 — Katy
  [
    "You rang?",
    "I'm busy. What.",
    "Oh, it's you. What do you want.",
    "Pull up. I'm listening.",
    "You tagged me. Bold move. Talk.",
    "This better be worth interrupting me.",
    "Oh honey. What is it.",
    "I'm here. Don't waste it.",
  ],
  // index 5 — Stewart
  [
    "Allegedly I was mentioned.",
    "I find your tag most intellectually stimulating.",
    "I was… considerably elsewhere. You called?",
    "Allegedly my name was invoked.",
    "I am present. Allegedly.",
    "My cerebral cortex registered your mention.",
    "Allegedly I heard that.",
    "I would like to formally acknowledge your tag.",
  ],
];

export function getMentionResponse(characterIndex) {
  const pool = MENTION_RESPONSES[characterIndex % MENTION_RESPONSES.length];
  return pool[Math.floor(Math.random() * pool.length)];
}
