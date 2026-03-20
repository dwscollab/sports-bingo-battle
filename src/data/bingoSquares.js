// src/data/bingoSquares.js

// ⚡ = Battleship square — completing a BINGO with this earns a Battle Shot
// Battle Shots let you block one of an opponent's unmarked squares

export const SQUARES = {
  hockey: {
    // Always included regardless of location
    universal: [
      { id: 'hu01', text: 'Power Play Called', battle: false },
      { id: 'hu02', text: 'Penalty Shot Awarded', battle: true },
      { id: 'hu03', text: 'Fight Breaks Out', battle: true },
      { id: 'hu04', text: 'Goalie Makes Glove Save', battle: false },
      { id: 'hu05', text: 'Offside Called', battle: false },
      { id: 'hu06', text: 'Puck Hits the Post', battle: false },
      { id: 'hu07', text: 'Hat Trick!', battle: true },
      { id: 'hu08', text: 'Coach Challenges a Call', battle: false },
      { id: 'hu09', text: 'Empty Net Goal', battle: true },
      { id: 'hu10', text: 'Game Goes to Overtime', battle: true },
      { id: 'hu11', text: 'Penalty in Final 2 Min', battle: false },
      { id: 'hu12', text: 'Goalie Gets Pulled', battle: false },
      { id: 'hu13', text: 'Your Team Scores First', battle: false },
      { id: 'hu14', text: 'Shorthanded Goal', battle: true },
      { id: 'hu15', text: 'Breakaway Attempt', battle: false },
      { id: 'hu16', text: 'Icing Called', battle: false },
      { id: 'hu17', text: 'Delayed Penalty', battle: false },
      { id: 'hu18', text: 'Goal Scored!', battle: false },
      { id: 'hu19', text: 'Penalty Called', battle: false },
      { id: 'hu20', text: 'Slap Shot', battle: false },
      { id: 'hu21', text: '3+ Shots in 30 Sec', battle: false },
      { id: 'hu22', text: 'Game Tied in 3rd', battle: false },
      { id: 'hu23', text: 'Goalie Makes Pad Save', battle: false },
      { id: 'hu24', text: 'Opponent Scores First', battle: false },
      { id: 'hu25', text: 'Player Gets Ejected', battle: true },
      { id: 'hu26', text: '5-on-3 Power Play', battle: true },
      { id: 'hu27', text: 'Comeback from 2+ Down', battle: true },
      { id: 'hu28', text: 'Overtime Shootout', battle: true },
    ],

    // Extra squares for live-game attendees
    liveGame: [
      { id: 'lg01', text: 'Wave Starts in Crowd', battle: false },
      { id: 'lg02', text: 'Kiss Cam! 💋', battle: false },
      { id: 'lg03', text: 'T-Shirt Cannon Fires', battle: false },
      { id: 'lg04', text: 'Jumbotron Shows Your Group', battle: true },
      { id: 'lg05', text: 'Between-Period Ice Game', battle: false },
      { id: 'lg06', text: 'Standing Ovation', battle: false },
      { id: 'lg07', text: 'Puck Flies Into Stands', battle: true },
      { id: 'lg08', text: 'Mascot Spotted Nearby', battle: false },
      { id: 'lg09', text: 'Organ Music Solo', battle: false },
      { id: 'lg10', text: 'Vendor Passes Your Row', battle: false },
      { id: 'lg11', text: 'Entire Section Stands Up', battle: false },
      { id: 'lg12', text: 'You Catch / Touch the Puck', battle: true },
    ],

    // Sports bar specific
    sportsBar: [
      { id: 'sb01', text: 'Bartender Predicts Score', battle: false },
      { id: 'sb02', text: 'Nachos Ordered Near You', battle: false },
      { id: 'sb03', text: 'Whole Bar Erupts in Cheer', battle: false },
      { id: 'sb04', text: 'Someone Spills a Drink', battle: true },
      { id: 'sb05', text: 'TV Switches to Different Game', battle: false },
      { id: 'sb06', text: 'Group Round of Shots Ordered', battle: false },
      { id: 'sb07', text: 'Stranger Starts a Convo', battle: false },
      { id: 'sb08', text: 'Loud Heckler Nearby', battle: false },
      { id: 'sb09', text: 'High Five a Stranger', battle: false },
      { id: 'sb10', text: 'Ref Debate with Strangers', battle: true },
      { id: 'sb11', text: 'Bar Goes Completely Silent', battle: false },
      { id: 'sb12', text: 'Someone Yells at the TV', battle: false },
    ],

    // Home / streaming
    home: [
      { id: 'hm01', text: 'Announcer Mispronounces Name', battle: false },
      { id: 'hm02', text: 'Replay Shown 3+ Times', battle: false },
      { id: 'hm03', text: 'Commercial at Worst Moment', battle: false },
      { id: 'hm04', text: 'Stream Buffers on Big Play', battle: true },
      { id: 'hm05', text: 'Slow-Mo Save Replay', battle: false },
      { id: 'hm06', text: 'Snack Run During Period', battle: false },
      { id: 'hm07', text: 'Someone Falls Asleep', battle: true },
      { id: 'hm08', text: 'You Predict the Play Correctly', battle: true },
      { id: 'hm09', text: 'Bathroom Break = Goal Scored', battle: true },
      { id: 'hm10', text: 'Someone Yells at TV Alone', battle: false },
      { id: 'hm11', text: 'Phone Dead at Critical Moment', battle: true },
      { id: 'hm12', text: 'Dog Blocks the Screen', battle: false },
    ],
  },

  nfl: {
    universal: [
      { id: 'nfu01', text: 'Touchdown!', battle: false },
      { id: 'nfu02', text: 'Interception', battle: true },
      { id: 'nfu03', text: 'Fumble', battle: true },
      { id: 'nfu04', text: 'Field Goal Made', battle: false },
      { id: 'nfu05', text: 'Sack', battle: false },
      { id: 'nfu06', text: 'Flag on the Play', battle: false },
      { id: 'nfu07', text: 'Coach Challenges Call', battle: false },
      { id: 'nfu08', text: 'Hail Mary Attempt', battle: true },
      { id: 'nfu09', text: 'Fake Punt / Trick Play', battle: true },
      { id: 'nfu10', text: 'Safety', battle: true },
      { id: 'nfu11', text: 'Blocked Kick', battle: true },
      { id: 'nfu12', text: '4th Down Conversion', battle: false },
      { id: 'nfu13', text: 'Two-Point Conversion', battle: false },
      { id: 'nfu14', text: 'Quarterback Sneak', battle: false },
      { id: 'nfu15', text: 'Your Team Scores First', battle: false },
      { id: 'nfu16', text: '3rd & Long Converted', battle: false },
      { id: 'nfu17', text: 'Pass Interference Called', battle: false },
      { id: 'nfu18', text: 'Injury Timeout', battle: false },
      { id: 'nfu19', text: 'No-Huddle Offense', battle: false },
      { id: 'nfu20', text: 'Game Tied in 4th', battle: false },
      { id: 'nfu21', text: 'Overtime', battle: true },
      { id: 'nfu22', text: 'Onside Kick', battle: true },
      { id: 'nfu23', text: '100+ Yard Rush', battle: false },
      { id: 'nfu24', text: 'Penalty on Defense', battle: false },
      { id: 'nfu25', text: 'Fumble Recovery', battle: false },
      { id: 'nfu26', text: 'Comeback from 14+ Down', battle: true },
      { id: 'nfu27', text: 'Pick Six!', battle: true },
      { id: 'nfu28', text: 'Intentional Grounding', battle: false },
    ],
    liveGame: [
      { id: 'nflg01', text: 'Wave Rolls Through Stadium', battle: false },
      { id: 'nflg02', text: 'Kiss Cam! 💋', battle: false },
      { id: 'nflg03', text: 'T-Shirt Cannon Fires', battle: false },
      { id: 'nflg04', text: 'You\'re on the Jumbotron', battle: true },
      { id: 'nflg05', text: 'Halftime Performance', battle: false },
      { id: 'nflg06', text: 'Cheerleaders Pass Nearby', battle: false },
      { id: 'nflg07', text: 'Ball Flies Into Stands', battle: true },
      { id: 'nflg08', text: 'Vendor Passes Your Row', battle: false },
      { id: 'nflg09', text: 'Crowd Counts Down Clock', battle: false },
      { id: 'nflg10', text: 'Entire Section Does Wave', battle: false },
    ],
    sportsBar: [
      { id: 'nfsb01', text: 'Bartender Predicts Score', battle: false },
      { id: 'nfsb02', text: 'Wings Ordered Near You', battle: false },
      { id: 'nfsb03', text: 'Whole Bar Erupts', battle: false },
      { id: 'nfsb04', text: 'Someone Spills Drink', battle: true },
      { id: 'nfsb05', text: 'TV Switches Games', battle: false },
      { id: 'nfsb06', text: 'Fantasy Player Scores', battle: true },
      { id: 'nfsb07', text: 'Stranger Bets You', battle: false },
      { id: 'nfsb08', text: 'Ref Controversy at Bar', battle: true },
      { id: 'nfsb09', text: 'Bar Argues about QB', battle: false },
      { id: 'nfsb10', text: 'High Five a Stranger', battle: false },
    ],
    home: [
      { id: 'nfhm01', text: 'Announcer is Biased', battle: false },
      { id: 'nfhm02', text: 'Replay 3+ Times', battle: false },
      { id: 'nfhm03', text: 'Commercial at Worst Time', battle: false },
      { id: 'nfhm04', text: 'Stream Buffers on TD', battle: true },
      { id: 'nfhm05', text: 'Predict the Play Right', battle: true },
      { id: 'nfhm06', text: 'Snack Run During Timeout', battle: false },
      { id: 'nfhm07', text: 'Bathroom Break = Touchdown', battle: true },
      { id: 'nfhm08', text: 'Someone Yells "PASS IT!"', battle: false },
      { id: 'nfhm09', text: 'Fantasy Alert Pops Up', battle: true },
      { id: 'nfhm10', text: 'Dog Steals a Snack', battle: false },
    ],
  },

  nba: {
    universal: [
      { id: 'nbu01', text: 'Slam Dunk!', battle: false },
      { id: 'nbu02', text: 'Alley-Oop', battle: true },
      { id: 'nbu03', text: 'Buzzer Beater', battle: true },
      { id: 'nbu04', text: 'Technical Foul', battle: true },
      { id: 'nbu05', text: 'Coach Ejected', battle: true },
      { id: 'nbu06', text: 'And-1 Play', battle: false },
      { id: 'nbu07', text: 'Half-Court Shot Made', battle: true },
      { id: 'nbu08', text: 'Player Argues with Ref', battle: false },
      { id: 'nbu09', text: '3-Pointer', battle: false },
      { id: 'nbu10', text: 'Fast Break', battle: false },
      { id: 'nbu11', text: 'Flagrant Foul', battle: true },
      { id: 'nbu12', text: 'Overtime', battle: true },
      { id: 'nbu13', text: 'Player Dunked On', battle: false },
      { id: 'nbu14', text: 'Full-Court Pass', battle: false },
      { id: 'nbu15', text: 'Your Team Scores First', battle: false },
      { id: 'nbu16', text: 'Timeout Called Quickly', battle: false },
      { id: 'nbu17', text: 'Star Player Injured', battle: false },
      { id: 'nbu18', text: 'Block on Dunk Attempt', battle: false },
      { id: 'nbu19', text: 'Charge Called', battle: false },
      { id: 'nbu20', text: 'Double-Digit Comeback', battle: true },
      { id: 'nbu21', text: 'Crowd Makes Ref Miss Call', battle: false },
      { id: 'nbu22', text: 'Last-Second Free Throws', battle: false },
      { id: 'nbu23', text: 'Steal + Fast Break', battle: false },
      { id: 'nbu24', text: '30+ Points by One Player', battle: true },
      { id: 'nbu25', text: 'Triple-Double', battle: true },
      { id: 'nbu26', text: 'Intentional Foul Strategy', battle: false },
      { id: 'nbu27', text: 'Possession Arrow Changes', battle: false },
      { id: 'nbu28', text: 'Time-Out Under 1 Minute', battle: false },
    ],
    liveGame: [
      { id: 'nblg01', text: 'Celebrity Spotted Courtside', battle: true },
      { id: 'nblg02', text: 'Kiss Cam! 💋', battle: false },
      { id: 'nblg03', text: 'T-Shirt Cannon', battle: false },
      { id: 'nblg04', text: 'You\'re on Jumbotron', battle: true },
      { id: 'nblg05', text: 'Halftime Show Performance', battle: false },
      { id: 'nblg06', text: 'Dance Cam Moment', battle: false },
      { id: 'nblg07', text: 'Ball Flies Into Stands', battle: true },
      { id: 'nblg08', text: 'Mascot Near Your Section', battle: false },
      { id: 'nblg09', text: 'Cheerleader Routine', battle: false },
      { id: 'nblg10', text: 'Fan Catches Ball Barehanded', battle: false },
    ],
    sportsBar: [
      { id: 'nbsb01', text: 'Bartender Makes Prediction', battle: false },
      { id: 'nbsb02', text: 'Bar Erupts on Dunk', battle: false },
      { id: 'nbsb03', text: 'Someone Spills Drink', battle: true },
      { id: 'nbsb04', text: 'TV Switches Games', battle: false },
      { id: 'nbsb05', text: 'Fantasy Alert Reaction', battle: true },
      { id: 'nbsb06', text: 'Argue About MVP', battle: false },
      { id: 'nbsb07', text: 'High Five a Stranger', battle: false },
      { id: 'nbsb08', text: 'Bar Goes Silent on FTs', battle: false },
      { id: 'nbsb09', text: 'Stranger Trash Talks', battle: false },
      { id: 'nbsb10', text: 'Group Bet on Outcome', battle: true },
    ],
    home: [
      { id: 'nbhm01', text: 'Announcer Is Excited', battle: false },
      { id: 'nbhm02', text: 'Replay 3+ Times', battle: false },
      { id: 'nbhm03', text: 'Stream Buffers on Dunk', battle: true },
      { id: 'nbhm04', text: 'Predict a Play Right', battle: true },
      { id: 'nbhm05', text: 'Snack Run During Timeout', battle: false },
      { id: 'nbhm06', text: 'Bathroom = Score', battle: true },
      { id: 'nbhm07', text: 'Fantasy Player Alert', battle: true },
      { id: 'nbhm08', text: 'Someone Mimics Player Move', battle: false },
      { id: 'nbhm09', text: 'Dog or Pet Steals Spot', battle: false },
      { id: 'nbhm10', text: 'Remote Battle for Channel', battle: false },
    ],
  },
};

export const FREE_SPACE = {
  id: 'free',
  text: '⭐ FREE',
  battle: false,
  isFree: true,
  isMarked: false,   // NOT auto-marked — only earned when your team wins
  isBlocked: false,
};

// The FREE space label changes based on whether team has won yet
export const FREE_SPACE_WON = {
  ...FREE_SPACE,
  isMarked: true,
  text: '⭐ YOUR TEAM WON!',
};

/**
 * Generate a randomized 5x5 bingo card.
 * @param {string} sport - 'hockey' | 'nfl' | 'nba'
 * @param {string} location - 'liveGame' | 'sportsBar' | 'home'
 * @returns {Array} Array of 25 square objects
 */
export function generateCard(sport, location) {
  const sportData = SQUARES[sport] || SQUARES.hockey;
  const universalPool = [...(sportData.universal || [])];
  const locationPool = [...(sportData[location] || sportData.liveGame || [])];

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const shuffledUniversal = shuffle(universalPool);
  const shuffledLocation = shuffle(locationPool);

  // Pick 20 universal + 4 location-specific, then insert FREE at index 12
  const picked = [
    ...shuffledUniversal.slice(0, 20),
    ...shuffledLocation.slice(0, 4),
  ];
  const shuffledPicked = shuffle(picked);

  const card = [
    ...shuffledPicked.slice(0, 12),
    { ...FREE_SPACE },
    ...shuffledPicked.slice(12, 24),
  ];

  return card.map((sq, idx) => ({
    ...sq,
    index: idx,
    isMarked: sq.isFree ? false : false,  // FREE starts unmarked
    isBlocked: false,
  }));
}

/**
 * Check if a card has bingo. Returns the winning line indices or null.
 */
export function checkBingo(squares) {
  const SIZE = 5;
  const lines = [];

  for (let r = 0; r < SIZE; r++) {
    lines.push([r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4]);
  }
  for (let c = 0; c < SIZE; c++) {
    lines.push([c, c + 5, c + 10, c + 15, c + 20]);
  }
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);

  for (const line of lines) {
    if (line.every((i) => squares[i]?.isMarked && !squares[i]?.isBlocked)) {
      return line;
    }
  }
  return null;
}

/**
 * Check if the winning square in a bingo line is a battleship square.
 * lastMarked = the index that was just marked.
 */
export function isBattleshipBingo(squares, bingoLine, lastMarkedIndex) {
  if (!bingoLine || lastMarkedIndex === null) return false;
  if (!bingoLine.includes(lastMarkedIndex)) return false;
  return squares[lastMarkedIndex]?.battle === true;
}
