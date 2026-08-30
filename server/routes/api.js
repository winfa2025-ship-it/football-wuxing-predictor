const router = require('express').Router();
const { getLiveScores, getFixtures, getStandings } = require('../data-fetcher');
const { generatePrediction } = require('../ai-predictor');
const { getTodayPredictions, updateLive, initAgents } = require('../services/ai-agent.service');
const { fengshuiPrediction } = require('../fengshui-engine');
const { getMatchHistory } = require('../history-generator');
const ai = require('../ai/openai');

// 初始化AI代理人
initAgents();

// 獲取今日所有賽事
router.get('/fixtures', async (req, res) => {
  try {
    const fixtures = await getFixtures(new Date());
    res.json({ success: true, data: fixtures, count: fixtures.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 獲取即時比分
router.get('/live', async (req, res) => {
  try {
    const live = await getLiveScores();
    res.json({ success: true, data: live, count: live.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 單場賽事過往歷史數據（頭對頭 + 近期狀態 + 詳細事件）
router.get('/fixtures/:id/history', async (req, res) => {
  try {
    const id = Number(req.params.id);
    // 嘗試從今日賽事解析出主客隊資料（含 team id）
    const fixtures = await getFixtures(new Date());
    let fixture = fixtures.find(f => Number(f.id) === id);

    // 若今日無此場次，允許以 query 帶入兩隊名稱作為後備
    let home = fixture?.home;
    let away = fixture?.away;
    let homeProfile = fixture?.homeProfile;
    let awayProfile = fixture?.awayProfile;

    if (!fixture && req.query.home && req.query.away) {
      home = { team: { id: -1, name: req.query.home } };
      away = { team: { id: -1, name: req.query.away } };
    }

    if (!home || !away) {
      return res.status(404).json({ success: false, error: '找不到該場賽事' });
    }

    const history = await getMatchHistory({ id, home, away, homeProfile, awayProfile });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI代理人今日預測列表
router.get('/predictions/today', async (req, res) => {
  try {
    const predictions = await getTodayPredictions();
    res.json({ success: true, data: predictions, count: predictions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 單場賽事詳細預測 (觸發實時計算)
router.post('/predict', async (req, res) => {
  try {
    const { homeTeam, awayTeam, homeCity, awayCity, homeFounded, awayFounded, homeForm, awayForm, league } = req.body;
    const prediction = generatePrediction({
      home: {
        teamName: homeTeam,
        form: homeForm || [3, 1, 0, 3, 3],
        recentGoals: [2, 1, 0, 3, 2],
        city: homeCity || '',
        foundedYear: homeFounded || 1900,
      },
      away: {
        teamName: awayTeam,
        form: awayForm || [0, 3, 1, 3, 0],
        recentGoals: [0, 2, 1, 2, 1],
        city: awayCity || '',
        foundedYear: awayFounded || 1900,
      },
      stats: { league: league || '英超', homeRank: 5, awayRank: 8 },
    });

    // 若有 AI key，用真 AI 生產/增強分析文字
    let aiAnalysis = false;
    if (ai.isEnabled()) {
      try {
        const aiRes = await ai.predictMatch({
          homeTeam, awayTeam, homeCity, awayCity, league,
          homeForm: homeForm || [3, 1, 0, 3, 3],
          awayForm: awayForm || [0, 3, 1, 3, 0],
        });
        if (aiRes && aiRes.analysis) {
          prediction.analysis = aiRes.analysis;
          aiAnalysis = true;
        }
        if (aiRes && aiRes.winner) prediction.winner = aiRes.winner;
        if (aiRes && aiRes.confidence) prediction.confidence = aiRes.confidence;
        if (aiRes && aiRes.correctScore) prediction.correctScore = aiRes.correctScore;
        if (aiRes && aiRes.overUnder) prediction.overUnder = aiRes.overUnder;
        if (aiRes && aiRes.totalGoals) prediction.totalGoals = aiRes.totalGoals;
      } catch (err) {
        console.error('AI 預測分析失敗:', err.message);
      }
    }
    prediction.aiAnalysis = aiAnalysis;
    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 風水命理即時分析
router.post('/fengshui', async (req, res) => {
  try {
    const { home, away, date } = req.body;
    const result = fengshuiPrediction(
      { name: home.name, city: home.city, foundedYear: home.foundedYear, league: home.league },
      { name: away.name, city: away.city, foundedYear: away.foundedYear, league: away.league },
      date ? new Date(date) : new Date()
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 聯賽排名
router.get('/standings', async (req, res) => {
  try {
    const standings = await getStandings(req.query.league || 39);
    res.json({ success: true, data: standings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 提供AI代理人的即時評論
router.get('/agents/commentary', async (req, res) => {
  const commentary = [
    { agent: '紫微斗數師', text: '依據今日流年能量場，主隊財星高照，門前運勢旺盛。' },
    { agent: '數據分析師', text: '歷史對戰數據顯示主隊近三次主場均取勝，但客隊防守穩健。' },
    { agent: '奇門遁甲師', text: '開盤時辰宜正午，主隊方位得生門之氣，佔先機。' },
    { agent: '走地觀察員', text: '客隊主力後衛有傷病困擾，臨場表現可能受影響。' },
  ];
  res.json({ success: true, data: commentary });
});

module.exports = router;
