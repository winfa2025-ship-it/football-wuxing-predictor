export type Team = {
  id: number;
  name: string;
  shortName?: string;
  country: string;
  founded?: number;
  logo?: string;
  stadium?: string;
  city?: string;
};

export type League = {
  id: number;
  name: string;
  country: string;
  logo?: string;
  season: number;
};

export type Fixture = {
  id: number;
  date: string;
  time: string;
  timestamp: number;
  status: 'not_started' | 'live' | 'finished' | 'postponed' | 'cancelled';
  minute?: string;
  home: TeamStats;
  away: TeamStats;
  league: League;
};

export type TeamStats = {
  team: Team;
  goals: number;
  halftimeGoals?: number;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
};

export type PredictionType = 'win_draw_win' | 'over_under' | 'correct_score' | 'total_goals' | 'both_teams_score';

export type PredictionInput = {
  homeTeam: string;
  awayTeam: string;
  homeForm: number[];
  awayForm: number[];
  homeRecentGoals: number[];
  awayRecentGoals: number[];
  headToHead: { homeGoals: number; awayGoals: number }[];
  league: string;
  homeRank: number;
  awayRank: number;
  fengshui: FengshuiEnergy;
  aiData: AIData;
};

export type FengshuiEnergy = {
  home: FengshuiReading;
  away: FengshuiReading;
};

export type FengshuiReading = {
  element: string;
  luck: number;
  yinYang: '陰' | '陽';
  color: string;
  direction: string;
  teamMomentum: string;
  winChance: number;
};

export type AIData = {
  probability: {
    home: number;
    draw: number;
    away: number;
  };
  expectedGoals: {
    home: number;
    away: number;
  };
  confidence: number;
  modelAnalysis: string;
  factors: string[];
};

export type PredictionResult = {
  fixtureId: number;
  team: string;
  predictionType: PredictionType;
  prediction: string;
  confidence: number;
  expectedScore: { home: number; away: number };
  overUnder?: { line: number; probability: number };
  fengshuiAnalysis: string;
  aiAnalysis: string;
  finalAnalysis: string;
  powerRating: number;
  timestamp: number;
};
