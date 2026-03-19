// src/data/teamColors.js
// Primary + secondary colors for all 32 NHL teams, all 32 NFL teams, all 30 NBA teams

export const NHL_TEAMS = {
  // Atlantic Division
  BOS: { name: 'Boston Bruins',          abbr: 'BOS', primary: '#FFB81C', secondary: '#000000', text: '#000000' },
  BUF: { name: 'Buffalo Sabres',         abbr: 'BUF', primary: '#003087', secondary: '#FCB514', text: '#FFFFFF' },
  DET: { name: 'Detroit Red Wings',      abbr: 'DET', primary: '#CE1126', secondary: '#FFFFFF', text: '#FFFFFF' },
  FLA: { name: 'Florida Panthers',       abbr: 'FLA', primary: '#041E42', secondary: '#C8102E', text: '#FFFFFF' },
  MTL: { name: 'Montréal Canadiens',     abbr: 'MTL', primary: '#AF1E2D', secondary: '#192168', text: '#FFFFFF' },
  OTT: { name: 'Ottawa Senators',        abbr: 'OTT', primary: '#E31837', secondary: '#000000', text: '#FFFFFF' },
  TBL: { name: 'Tampa Bay Lightning',    abbr: 'TBL', primary: '#002868', secondary: '#FFFFFF', text: '#FFFFFF' },
  TOR: { name: 'Toronto Maple Leafs',    abbr: 'TOR', primary: '#003E7E', secondary: '#FFFFFF', text: '#FFFFFF' },
  // Metropolitan Division
  CAR: { name: 'Carolina Hurricanes',    abbr: 'CAR', primary: '#CC0000', secondary: '#000000', text: '#FFFFFF' },
  CBJ: { name: 'Columbus Blue Jackets',  abbr: 'CBJ', primary: '#002654', secondary: '#CE1126', text: '#FFFFFF' },
  NJD: { name: 'New Jersey Devils',      abbr: 'NJD', primary: '#CE1126', secondary: '#000000', text: '#FFFFFF' },
  NYI: { name: 'New York Islanders',     abbr: 'NYI', primary: '#003087', secondary: '#FC4C02', text: '#FFFFFF' },
  NYR: { name: 'New York Rangers',       abbr: 'NYR', primary: '#0038A8', secondary: '#CE1126', text: '#FFFFFF' },
  PHI: { name: 'Philadelphia Flyers',    abbr: 'PHI', primary: '#F74902', secondary: '#000000', text: '#FFFFFF' },
  PIT: { name: 'Pittsburgh Penguins',    abbr: 'PIT', primary: '#FCB514', secondary: '#000000', text: '#000000' },
  WSH: { name: 'Washington Capitals',    abbr: 'WSH', primary: '#041E42', secondary: '#C8102E', text: '#FFFFFF' },
  // Central Division
  ARI: { name: 'Utah Hockey Club',       abbr: 'UTA', primary: '#6CACE4', secondary: '#010101', text: '#000000' },
  CHI: { name: 'Chicago Blackhawks',     abbr: 'CHI', primary: '#CF0A2C', secondary: '#000000', text: '#FFFFFF' },
  COL: { name: 'Colorado Avalanche',     abbr: 'COL', primary: '#6F263D', secondary: '#236192', text: '#FFFFFF' },
  DAL: { name: 'Dallas Stars',           abbr: 'DAL', primary: '#006847', secondary: '#8F8F8C', text: '#FFFFFF' },
  MIN: { name: 'Minnesota Wild',         abbr: 'MIN', primary: '#154734', secondary: '#A6192E', text: '#FFFFFF' },
  NSH: { name: 'Nashville Predators',    abbr: 'NSH', primary: '#FFB81C', secondary: '#041E42', text: '#000000' },
  STL: { name: 'St. Louis Blues',        abbr: 'STL', primary: '#002F87', secondary: '#FCB514', text: '#FFFFFF' },
  WPG: { name: 'Winnipeg Jets',          abbr: 'WPG', primary: '#041E42', secondary: '#004C97', text: '#FFFFFF' },
  // Pacific Division
  ANA: { name: 'Anaheim Ducks',          abbr: 'ANA', primary: '#F47A38', secondary: '#B9975B', text: '#000000' },
  CGY: { name: 'Calgary Flames',         abbr: 'CGY', primary: '#C8102E', secondary: '#F1BE48', text: '#FFFFFF' },
  EDM: { name: 'Edmonton Oilers',        abbr: 'EDM', primary: '#FF4C00', secondary: '#003DA5', text: '#FFFFFF' },
  LAK: { name: 'Los Angeles Kings',      abbr: 'LAK', primary: '#111111', secondary: '#A2AAAD', text: '#FFFFFF' },
  SJS: { name: 'San Jose Sharks',        abbr: 'SJS', primary: '#006D75', secondary: '#EA7200', text: '#FFFFFF' },
  SEA: { name: 'Seattle Kraken',         abbr: 'SEA', primary: '#001628', secondary: '#99D9D9', text: '#FFFFFF' },
  VAN: { name: 'Vancouver Canucks',      abbr: 'VAN', primary: '#00205B', secondary: '#00843D', text: '#FFFFFF' },
  VGK: { name: 'Vegas Golden Knights',   abbr: 'VGK', primary: '#B4975A', secondary: '#333F48', text: '#000000' },
};

export const NFL_TEAMS = {
  ARI: { name: 'Arizona Cardinals',      abbr: 'ARI', primary: '#97233F', secondary: '#000000', text: '#FFFFFF' },
  ATL: { name: 'Atlanta Falcons',        abbr: 'ATL', primary: '#A71930', secondary: '#000000', text: '#FFFFFF' },
  BAL: { name: 'Baltimore Ravens',       abbr: 'BAL', primary: '#241773', secondary: '#000000', text: '#FFFFFF' },
  BUF: { name: 'Buffalo Bills',          abbr: 'BUF', primary: '#00338D', secondary: '#C60C30', text: '#FFFFFF' },
  CAR: { name: 'Carolina Panthers',      abbr: 'CAR', primary: '#0085CA', secondary: '#101820', text: '#FFFFFF' },
  CHI: { name: 'Chicago Bears',          abbr: 'CHI', primary: '#0B162A', secondary: '#C83803', text: '#FFFFFF' },
  CIN: { name: 'Cincinnati Bengals',     abbr: 'CIN', primary: '#FB4F14', secondary: '#000000', text: '#FFFFFF' },
  CLE: { name: 'Cleveland Browns',       abbr: 'CLE', primary: '#311D00', secondary: '#FF3C00', text: '#FFFFFF' },
  DAL: { name: 'Dallas Cowboys',         abbr: 'DAL', primary: '#003594', secondary: '#869397', text: '#FFFFFF' },
  DEN: { name: 'Denver Broncos',         abbr: 'DEN', primary: '#FB4F14', secondary: '#002244', text: '#FFFFFF' },
  DET: { name: 'Detroit Lions',          abbr: 'DET', primary: '#0076B6', secondary: '#B0B7BC', text: '#FFFFFF' },
  GB:  { name: 'Green Bay Packers',      abbr: 'GB',  primary: '#203731', secondary: '#FFB612', text: '#FFFFFF' },
  HOU: { name: 'Houston Texans',         abbr: 'HOU', primary: '#03202F', secondary: '#A71930', text: '#FFFFFF' },
  IND: { name: 'Indianapolis Colts',     abbr: 'IND', primary: '#002C5F', secondary: '#A2AAAD', text: '#FFFFFF' },
  JAX: { name: 'Jacksonville Jaguars',   abbr: 'JAX', primary: '#006778', secondary: '#D7A22A', text: '#FFFFFF' },
  KC:  { name: 'Kansas City Chiefs',     abbr: 'KC',  primary: '#E31837', secondary: '#FFB81C', text: '#FFFFFF' },
  LAC: { name: 'Los Angeles Chargers',   abbr: 'LAC', primary: '#0080C6', secondary: '#FFC20E', text: '#FFFFFF' },
  LAR: { name: 'Los Angeles Rams',       abbr: 'LAR', primary: '#003594', secondary: '#FFA300', text: '#FFFFFF' },
  LV:  { name: 'Las Vegas Raiders',      abbr: 'LV',  primary: '#000000', secondary: '#A5ACAF', text: '#FFFFFF' },
  MIA: { name: 'Miami Dolphins',         abbr: 'MIA', primary: '#008E97', secondary: '#FC4C02', text: '#FFFFFF' },
  MIN: { name: 'Minnesota Vikings',      abbr: 'MIN', primary: '#4F2683', secondary: '#FFC62F', text: '#FFFFFF' },
  NE:  { name: 'New England Patriots',   abbr: 'NE',  primary: '#002244', secondary: '#C60C30', text: '#FFFFFF' },
  NO:  { name: 'New Orleans Saints',     abbr: 'NO',  primary: '#D3BC8D', secondary: '#101820', text: '#000000' },
  NYG: { name: 'New York Giants',        abbr: 'NYG', primary: '#0B2265', secondary: '#A71930', text: '#FFFFFF' },
  NYJ: { name: 'New York Jets',          abbr: 'NYJ', primary: '#125740', secondary: '#000000', text: '#FFFFFF' },
  PHI: { name: 'Philadelphia Eagles',    abbr: 'PHI', primary: '#004C54', secondary: '#A5ACAF', text: '#FFFFFF' },
  PIT: { name: 'Pittsburgh Steelers',    abbr: 'PIT', primary: '#101820', secondary: '#FFB612', text: '#FFFFFF' },
  SEA: { name: 'Seattle Seahawks',       abbr: 'SEA', primary: '#002244', secondary: '#69BE28', text: '#FFFFFF' },
  SF:  { name: 'San Francisco 49ers',    abbr: 'SF',  primary: '#AA0000', secondary: '#B3995D', text: '#FFFFFF' },
  TB:  { name: 'Tampa Bay Buccaneers',   abbr: 'TB',  primary: '#D50A0A', secondary: '#FF7900', text: '#FFFFFF' },
  TEN: { name: 'Tennessee Titans',       abbr: 'TEN', primary: '#0C2340', secondary: '#4B92DB', text: '#FFFFFF' },
  WSH: { name: 'Washington Commanders',  abbr: 'WSH', primary: '#5A1414', secondary: '#FFB612', text: '#FFFFFF' },
};

export const NBA_TEAMS = {
  ATL: { name: 'Atlanta Hawks',          abbr: 'ATL', primary: '#C1D32F', secondary: '#E03A3E', text: '#000000' },
  BOS: { name: 'Boston Celtics',         abbr: 'BOS', primary: '#007A33', secondary: '#BA9653', text: '#FFFFFF' },
  BKN: { name: 'Brooklyn Nets',          abbr: 'BKN', primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
  CHA: { name: 'Charlotte Hornets',      abbr: 'CHA', primary: '#1D1160', secondary: '#00788C', text: '#FFFFFF' },
  CHI: { name: 'Chicago Bulls',          abbr: 'CHI', primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
  CLE: { name: 'Cleveland Cavaliers',    abbr: 'CLE', primary: '#860038', secondary: '#FDBB30', text: '#FFFFFF' },
  DAL: { name: 'Dallas Mavericks',       abbr: 'DAL', primary: '#00538C', secondary: '#002B5E', text: '#FFFFFF' },
  DEN: { name: 'Denver Nuggets',         abbr: 'DEN', primary: '#0E2240', secondary: '#FEC524', text: '#FFFFFF' },
  DET: { name: 'Detroit Pistons',        abbr: 'DET', primary: '#C8102E', secondary: '#006BB6', text: '#FFFFFF' },
  GSW: { name: 'Golden State Warriors',  abbr: 'GSW', primary: '#1D428A', secondary: '#FFC72C', text: '#FFFFFF' },
  HOU: { name: 'Houston Rockets',        abbr: 'HOU', primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
  IND: { name: 'Indiana Pacers',         abbr: 'IND', primary: '#002D62', secondary: '#FDBB30', text: '#FFFFFF' },
  LAC: { name: 'Los Angeles Clippers',   abbr: 'LAC', primary: '#C8102E', secondary: '#1D428A', text: '#FFFFFF' },
  LAL: { name: 'Los Angeles Lakers',     abbr: 'LAL', primary: '#552583', secondary: '#FDB927', text: '#FFFFFF' },
  MEM: { name: 'Memphis Grizzlies',      abbr: 'MEM', primary: '#5D76A9', secondary: '#12173F', text: '#FFFFFF' },
  MIA: { name: 'Miami Heat',             abbr: 'MIA', primary: '#98002E', secondary: '#F9A01B', text: '#FFFFFF' },
  MIL: { name: 'Milwaukee Bucks',        abbr: 'MIL', primary: '#00471B', secondary: '#EEE1C6', text: '#FFFFFF' },
  MIN: { name: 'Minnesota Timberwolves', abbr: 'MIN', primary: '#0C2340', secondary: '#236192', text: '#FFFFFF' },
  NOP: { name: 'New Orleans Pelicans',   abbr: 'NOP', primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' },
  NYK: { name: 'New York Knicks',        abbr: 'NYK', primary: '#006BB6', secondary: '#F58426', text: '#FFFFFF' },
  OKC: { name: 'Oklahoma City Thunder',  abbr: 'OKC', primary: '#007AC1', secondary: '#EF3B24', text: '#FFFFFF' },
  ORL: { name: 'Orlando Magic',          abbr: 'ORL', primary: '#0077C0', secondary: '#000000', text: '#FFFFFF' },
  PHI: { name: 'Philadelphia 76ers',     abbr: 'PHI', primary: '#006BB6', secondary: '#ED174C', text: '#FFFFFF' },
  PHX: { name: 'Phoenix Suns',           abbr: 'PHX', primary: '#1D1160', secondary: '#E56020', text: '#FFFFFF' },
  POR: { name: 'Portland Trail Blazers', abbr: 'POR', primary: '#E03A3E', secondary: '#000000', text: '#FFFFFF' },
  SAC: { name: 'Sacramento Kings',       abbr: 'SAC', primary: '#5A2D81', secondary: '#63727A', text: '#FFFFFF' },
  SAS: { name: 'San Antonio Spurs',      abbr: 'SAS', primary: '#C4CED4', secondary: '#000000', text: '#000000' },
  TOR: { name: 'Toronto Raptors',        abbr: 'TOR', primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
  UTA: { name: 'Utah Jazz',              abbr: 'UTA', primary: '#002B5C', secondary: '#00471B', text: '#FFFFFF' },
  WAS: { name: 'Washington Wizards',     abbr: 'WAS', primary: '#002B5C', secondary: '#E31837', text: '#FFFFFF' },
};

export const TEAMS_BY_SPORT = { hockey: NHL_TEAMS, nfl: NFL_TEAMS, nba: NBA_TEAMS };

/**
 * Get team colors from a team name string (fuzzy match).
 * Falls back to default colors if no match found.
 */
export function getTeamColors(sport, teamNameOrAbbr) {
  const teams = TEAMS_BY_SPORT[sport] || NHL_TEAMS;
  if (!teamNameOrAbbr) return DEFAULT_COLORS;

  const q = teamNameOrAbbr.trim().toUpperCase();

  // Try abbr first
  if (teams[q]) return teams[q];

  // Try name match
  const match = Object.values(teams).find(
    t => t.name.toUpperCase().includes(q) || q.includes(t.abbr) || q.includes(t.name.toUpperCase().split(' ').pop())
  );
  return match || DEFAULT_COLORS;
}

export const DEFAULT_COLORS = {
  primary: '#1a1a2e',
  secondary: '#e94560',
  text: '#FFFFFF',
  name: 'Default',
};

/** Derive CSS variables string from team colors */
export function buildTeamTheme(colors) {
  return {
    '--team-primary':   colors.primary,
    '--team-secondary': colors.secondary,
    '--team-text':      colors.text,
    '--team-primary-fade': colors.primary + '44',
  };
}
