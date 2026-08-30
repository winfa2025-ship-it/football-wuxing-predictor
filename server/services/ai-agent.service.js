/**
 * AI代理人 - 每日自動預測
 * 
 * 每天自動檢查當日賽事，生成預測並推送
 * 支持定時任務 (cron) 與即時觸發
 */

const { getFixtures, getLiveScores } = require('../data-fetcher');
const { generatePrediction } = require('../ai-predictor');
const ai = require('../ai/openai');

const state = {
  dailyPredictions: [],
  lastRun: null,
  agents: [],
};

class AiAgent {
  constructor(name, role, weight) {
    this.name = name;
    this.role = role;
    this.weight = weight;
  }

  async analyze(matchData) {
    // 每個代理人對同一場賽事從不同角度分析
    const base = generatePrediction(matchData);

    // 若有 AI key，使用真 AI 產生個人判斷與分析
    let aiResult = null;
    if (ai.isEnabled()) {
      try {
        aiResult = await ai.agentAnalysis(this.name, this.role, matchData);
      } catch (err) {
        console.error(`AI agent "${this.name}" 分析失敗:`, err.message);
      }
    }

    return {
      agentName: this.name,
      role: this.role,
      weight: this.weight,
      ...base,
      personalVote: aiResult
        ? { pick: aiResult.pick, confidence: aiResult.confidence }
        : this.makeVote(base),
      analysis: aiResult ? aiResult.analysis : base.analysis,
    };
  }

  makeVote(base) {
    // 不同代理人給出略微不同的看法 (模擬真實分析師分歧)
    const jitter = (Math.random() - 0.5) * 6;
    const votes = ['主勝', '客勝', '和局'];
    const probs = {
      '主勝': base.probability.home,
      '和局': base.probability.draw,
      '客勝': base.probability.away,
    };
    const bestKey = votes[Math.max(0, Math.round(0 + jitter / 100))];
    // 取最大概率的選項
    const winnerKey = Object.keys(probs).reduce((a, b) => probs[a] > probs[b] ? a : b);
    return { pick: winnerKey, confidence: base.confidence + jitter };
  }
}

// 初始化AI代理人團隊
function initAgents() {
  const agents = [
    new AiAgent('紫微斗數師', '風水命理角度', 0.4),
    new AiAgent('數據分析師', '統計模型角度', 0.3),
    new AiAgent('奇門遁甲師', '時空能量角度', 0.15),
    new AiAgent('走地觀察員', '臨場狀態角度', 0.15),
  ];
  state.agents = agents;
  return agents;
}

// 每日預測任務
async function runDailyPrediction() {
  const agents = state.agents.length ? state.agents : initAgents();
  const fixtures = await getFixtures(new Date());
  
  if (!fixtures || !fixtures.length) {
    console.log('今日沒有可用賽事');
    return { predictions: [], count: 0 };
  }

  const predictions = [];
  for (const fixture of fixtures) {
    const matchData = buildMatchData(fixture);
    const agentResults = [];
    for (const a of agents) {
      agentResults.push(await a.analyze(matchData));
    }

    // 綜合代理人意見
    const consensus = buildConsensus(agentResults, fixture);

    predictions.push({
      fixtureId: fixture.id,
      homeTeam: fixture.home.team.name,
      awayTeam: fixture.away.team.name,
      league: fixture.league?.name,
      date: fixture.date,
      status: fixture.status,
      consensus,
      betting: fixture.betting || null,
      agentResults,
      timestamp: Date.now(),
    });
  }

  state.dailyPredictions = predictions;
  state.lastRun = new Date().toISOString();
  console.log(`✅ 完成今日 ${predictions.length} 場賽事預測`);
  return { predictions, count: predictions.length };
}

function buildMatchData(fixture) {
  const homeForm = fixture.homeForm || [3, 1, 0, 3, 3];
  const awayForm = fixture.awayForm || [0, 3, 1, 3, 0];
  const homeGoals = fixture.homeGoals || [2, 1, 0, 3, 2];
  const awayGoals = fixture.awayGoals || [0, 2, 1, 2, 1];

  return {
    home: {
      teamName: fixture.home.team.name,
      form: homeForm,
      recentGoals: homeGoals,
      city: fixture.homeProfile?.city || '',
      foundedYear: fixture.homeProfile?.foundedYear || 1900,
    },
    away: {
      teamName: fixture.away.team.name,
      form: awayForm,
      recentGoals: awayGoals,
      city: fixture.awayProfile?.city || '',
      foundedYear: fixture.awayProfile?.foundedYear || 1900,
    },
    stats: {
      league: fixture.league?.name,
      homeRank: fixture.homeRank || 5,
      awayRank: fixture.awayRank || 8,
      date: new Date(fixture.date),
    },
  };
}

function buildConsensus(agentResults, fixture) {
  // 加權計算最終共識
  let homeVotes = 0, drawVotes = 0, awayVotes = 0, confidenceSum = 0;
  agentResults.forEach(a => {
    const w = a.weight;
    confidenceSum += a.confidence * w;
    if (a.personalVote.pick === '主勝') homeVotes += w;
    else if (a.personalVote.pick === '和局') drawVotes += w;
    else awayVotes += w;
  });

  const winner = homeVotes > drawVotes && homeVotes > awayVotes ? '主勝' : awayVotes > drawVotes ? '客勝' : '和局';
  const avgConfidence = confidenceSum / agentResults.reduce((s, a) => s + a.weight, 0);

  return {
    winner,
    confidence: Math.min(99, Math.round(avgConfidence)),
    homeVotes: +(homeVotes * 100).toFixed(0),
    drawVotes: +(drawVotes * 100).toFixed(0),
    awayVotes: +(awayVotes * 100).toFixed(0),
    expectedGoals: agentResults[0]?.expectedGoals || { home: 1, away: 1 },
    correctScore: agentResults[0]?.correctScore || [],
    overUnder: agentResults[0]?.overUnder || { line: 2.5, over: 50 },
    totalGoals: agentResults[0]?.totalGoals || '中',
  };
}

async function getTodayPredictions() {
  if (!state.lastRun || isStale() || state.dailyPredictions.length === 0) {
    await runDailyPrediction();
  }
  return state.dailyPredictions;
}

function isStale() {
  const last = state.lastRun ? new Date(state.lastRun).getTime() : 0;
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return last < todayStart.getTime();
}

// 即時重新計算 (比分更新時)
async function updateLive(matchId) {
  const live = await getLiveScores();
  const match = live.find(f => f.id === matchId);
  if (match) {
    match.homeForm = [3, 1, 0, 3, 3, match.home.goals > match.away.goals ? 3 : 0];
    match.awayForm = [0, 3, 1, 3, 0, match.away.goals > match.home.goals ? 3 : 0];
    return runDailyPrediction();
  }
  return null;
}

module.exports = { initAgents, runDailyPrediction, getTodayPredictions, updateLive, AiAgent };
