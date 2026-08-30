/**
 * AI預測引擎
 * 
 * 結合:
 * 1. 統計模型 (Poisson分佈模擬進球數)
 * 2. 風水命理能量
 * 3. 近況狀態 (最近5場)
 * 4. 歷史對戰
 * 5. 聯賽排名
 * 
 * 輸出: 勝平負 + 大細球 + 波膽 + 總球數預測
 */

const { fengshuiPrediction, calculateTeamFengshui } = require('../fengshui-engine');

// Poisson進球概率計算
function poissonProbability(lambda, k) {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// 由近況進球計算攻擊/防守強度
function computeTeamStrength(form, recentGoals, isHome) {
  const homeBoost = isHome ? 1.15 : 0.85;
  const matches = form.length;
  let points = 0;
  let goals = 0;
  let against = 0;

  form.forEach((result, i) => {
    const isWin = result === 3;
    const isDraw = result === 1;
    const isLoss = result === 0;
    // 越近的比賽權重越高
    const weight = 1 + (i / Math.max(1, matches)) * 0.3;
    points += (isWin ? 3 : isDraw ? 1 : 0) * weight;
    const g = recentGoals[i] || 0;
    goals += g * weight;
    against += g * 0.5 * weight;
  });

  const avgPoints = matches ? points / matches : 1;
  const avgGoals = matches ? goals / matches : 1;
  const strength = avgGoals * homeBoost * (0.8 + avgPoints * 0.2);
  return { strength, defense: Math.max(0.5, 1.2 - (against / Math.max(1, matches))) };
}

function expectedGoals(home, away, stats) {
  const homeInfo = computeTeamStrength(home.form, home.recentGoals, true);
  const awayInfo = computeTeamStrength(away.form, away.recentGoals, false);

  const avgLeagueGoals = 2.6;

  let lamHome = homeInfo.strength * awayInfo.defense * (avgLeagueGoals / 2);
  let lamAway = awayInfo.strength * homeInfo.defense * (avgLeagueGoals / 2);

  // 排名差異修正
  const rankDiff = (stats.awayRank - stats.homeRank) / 100;
  lamHome += rankDiff * 0.2;
  lamAway -= rankDiff * 0.2;

  // 風水修正 (最多±0.3球)
  const feng = fengshuiPrediction(
    { name: home.teamName, city: home.city || '', foundedYear: home.foundedYear || 1900, league: stats.league },
    { name: away.teamName, city: away.city || '', foundedYear: away.foundedYear || 1900, league: stats.league },
    stats.date || new Date()
  );
  lamHome += (feng.homeWin - 50) / 100 * 0.6;
  lamAway += (feng.awayWin - 50) / 100 * 0.6;

  return { home: Math.max(0.2, lamHome), away: Math.max(0.2, lamAway), feng };
}

// 主函數: 生成綜合預測
function generatePrediction(match) {
  const { home, away, stats } = match;

  // 計算期望進球
  const { home: lamHome, away: lamAway, feng } = expectedGoals(home, away, stats || {});

  // 1. 勝平負概率 (基於Poisson模擬)
  const MATCH_SIM = 10000;
  let homeWins = 0, draws = 0, awayWins = 0;

  const scoreMatrix = {};
  const maxGoals = 6;
  for (let i = 0; i < maxGoals; i++) {
    for (let j = 0; j < maxGoals; j++) {
      const pHome = poissonProbability(lamHome, i);
      const pAway = poissonProbability(lamAway, j);
      const prob = pHome * pAway * MATCH_SIM;
      scoreMatrix[`${i}-${j}`] = prob;
      if (i > j) homeWins += prob;
      else if (i === j) draws += prob;
      else awayWins += prob;
    }
  }

  const total = homeWins + draws + awayWins;
  let probHome = (homeWins / total) * 100;
  let probDraw = (draws / total) * 100;
  let probAway = (awayWins / total) * 100;

  // 風水與AI各50%權重混合
  const ws = { probHome: probHome * 0.5 + feng.homeWin * 0.5, probDraw: probDraw * 0.5 + feng.draw * 0.5, probAway: probAway * 0.5 + feng.awayWin * 0.5 };
  const wsTotal = ws.probHome + ws.probDraw + ws.probAway;
  probHome = (ws.probHome / wsTotal) * 100;
  probDraw = (ws.probDraw / wsTotal) * 100;
  probAway = (ws.probAway / wsTotal) * 100;

  const winner = probHome > probDraw && probHome > probAway ? '主勝' : probAway > probDraw ? '客勝' : '和局';
  const winningProb = Math.max(probHome, probDraw, probAway);
  const spread = Math.abs(probHome - probAway);
  // 信心度: 取勝率和對賽差距 (55-92)
  let confidence = Math.round(55 + (winningProb - 34) * 0.8 + spread * 0.35);
  confidence = Math.min(92, Math.max(55, confidence));

  // 2. 大細球 (2.5)
  const totalGoals = lamHome + lamAway;
  const overProb = (1 - (poissonProbability(totalGoals, 0) + poissonProbability(totalGoals, 1) + poissonProbability(totalGoals, 2)));

  // 3. 最可能波膽
  const sortedScores = Object.entries(scoreMatrix).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const predictedScore = sortedScores[0][0].
    split('-').map(Number);

  // 4. AI分析文本
  const analysis = buildAnalysis(home, away, lamHome, lamAway, feng, winner, confidence);

  // 期望總球數範圍
  const totalGoalRange = totalGoals < 2.2 ? '小' : totalGoals > 2.8 ? '大' : '中';

  return {
    probability: { home: Math.round(probHome), draw: Math.round(probDraw), away: Math.round(probAway) },
    expectedGoals: { home: +lamHome.toFixed(2), away: +lamAway.toFixed(2) },
    winner,
    confidence: Math.min(99, confidence),
    correctScore: sortedScores.slice(0, 3).map(([s, p]) => ({ score: s, prob: (p / MATCH_SIM * 100).toFixed(1) })),
    overUnder: { line: 2.5, over: (overProb * 100).toFixed(0) },
    totalGoals: totalGoalRange,
    expectedTotal: totalGoals.toFixed(2),
    fengshui: feng,
    analysis,
    powerRating: Math.round(Math.max(probHome, probDraw, probAway) + confidence / 10),
  };
}

function buildAnalysis(home, away, lamHome, lamAway, feng, winner, confidence) {
  const homeFormText = (home.form || []).slice(0, 5).map(r => r === 3 ? '勝' : r === 1 ? '和' : '負').join('→') || '未知';
  const awayFormText = (away.form || []).slice(0, 5).map(r => r === 3 ? '勝' : r === 1 ? '和' : '負').join('→') || '未知';

  let text = `【AI綜合分析】${home.teamName} vs ${away.teamName}\n`;
  text += `主隊近5場: ${homeFormText} ｜ 客隊近5場: ${awayFormText}\n`;
  text += `AI預測期望進球: 主${lamHome.toFixed(1)} - 客${lamAway.toFixed(1)}\n`;
  text += `風水分析: ${feng.analysis}\n`;
  text += `綜合判斷傾向「${winner}」，參考信心度 ${confidence}%。`;
  return text;
}

module.exports = { generatePrediction, expectedGoals, poissonProbability };
