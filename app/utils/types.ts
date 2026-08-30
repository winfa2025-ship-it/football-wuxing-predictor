// 前端 API 資料型別定義

export type FixtureTeam = {
  id?: number;
  name?: string;
  logo?: string;
};

export type BettingMarket = {
  home?: number;
  draw?: number;
  away?: number;
  over?: number;
  under?: number;
  yes?: number;
  no?: number;
};

export type BettingData = {
  source: 'mock' | 'api';
  updatedAt?: string;
  markets: {
    winDrawWin: { home: number; draw: number; away: number };
    overUnder: { line: number; over: number; under: number }[];
    btts: { yes: number; no: number };
  };
};

export type Favorite = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  date?: string;
  status?: string;
  minute?: string;
  homeGoals?: number;
  awayGoals?: number;
  savedAt: number;
};

export type Fixture = {
  id: number;
  date: string;
  timestamp?: number;
  status: string;
  minute?: string;
  home?: { team: FixtureTeam; goals?: number };
  away?: { team: FixtureTeam; goals?: number };
  league?: { id?: number; name?: string; country?: string; season?: number };
  homeProfile?: { name: string; city: string; foundedYear: number; league: string };
  awayProfile?: { name: string; city: string; foundedYear: number; league: string };
  betting?: BettingData;
};

export type Consensus = {
  winner: string;
  confidence: number;
  homeVotes: number;
  drawVotes: number;
  awayVotes: number;
  expectedGoals: { home: number; away: number };
  correctScore: { score: string; prob: string }[];
  overUnder: { line: number; over: string };
  totalGoals: string;
};

export type DailyPrediction = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  date: string;
  status: string;
  consensus: Consensus;
  betting?: BettingData;
  agentResults: {
    agentName: string;
    personalVote: { pick: string; confidence: number };
    analysis: string;
  }[];
  timestamp: number;
};

export type FengshuiAnalysis = {
  homeWin: number;
  draw: number;
  awayWin: number;
  home: {
    element: string;
    luck: number;
    yinYang: string;
    color: string;
    direction: string;
    teamMomentum: string;
  };
  away: {
    element: string;
    luck: number;
    yinYang: string;
    color: string;
    direction: string;
    teamMomentum: string;
  };
  analysis: string;
};

export type Commentary = {
  agent: string;
  text: string;
};

export type MatchEvent = {
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub';
  team: 'home' | 'away';
  player: string;
  minute: number;
  detail: string;
};

export type HistoricMatch = {
  id: number;
  date: number;
  home: { team: { id?: number; name?: string }; goals: number };
  away: { team: { id?: number; name?: string }; goals: number };
  events?: MatchEvent[];
  eventCount?: number;
  result?: 'W' | 'D' | 'L';
  status?: string;
};

export type TeamRecent = {
  teamName: string;
  form: string[];
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  goals: { for: number; against: number };
  matches: HistoricMatch[];
};

export type MatchHistory = {
  source: 'api' | 'mock';
  h2h: {
    total: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    goals: { home: number; away: number };
    list: HistoricMatch[];
  };
  recent: TeamRecent[];
};
