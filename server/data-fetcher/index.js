/**
 * 即時比分數據服務
 * 
 * 對接免費足球API (api-football-v1 / api-sports.io)
 * 免費版: 每日100個請求，ASCII JSON
 * 
 * 同時支持模擬模式(無API key時使用)
 */

const config = require('../../config');

const API_KEY = config.api.footballApiKey;

async function apiGet(url) {
  const res = await fetch(url, {
    headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': config.api.footballApiHost },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function getLiveScores() {
  if (!API_KEY) return mockLiveScores();
  
  // 實時比分的監控模式
  try {
    const data = await apiGet(`${config.api.footballApiBase}/fixtures?live=all`);
    return parseFixtures(data.response || []);
  } catch (err) {
    console.error('Live scores fetch failed:', err.message);
    return mockLiveScores();
  }
}

async function getFixtures(date = new Date()) {
  if (!API_KEY) return mockFixtures();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  try {
    const data = await apiGet(`${config.api.footballApiBase}/fixtures?date=${dateStr}`);
    return parseFixtures(data.response || []);
  } catch (err) {
    console.error('Fixtures fetch failed:', err.message);
    return mockFixtures();
  }
}

async function getStandings(leagueId) {
  if (!API_KEY) return mockStandings();
  try {
    const data = await apiGet(`${config.api.footballApiBase}/standings?league=${leagueId}&season=2024`);
    return data.response?.[0]?.league?.standings?.[0] || [];
  } catch (err) {
    return mockStandings();
  }
}

function parseFixtures(data) {
  return data.map(f => ({
    id: f.fixture?.id,
    date: f.fixture?.date,
    status: mapStatus(f.fixture?.status?.short),
    minute: f.fixture?.status?.elapsed,
    home: {
      team: { id: f.teams?.home?.id, name: f.teams?.home?.name, logo: f.teams?.home?.logo },
      goals: f.goals?.home ?? 0,
    },
    away: {
      team: { id: f.teams?.away?.id, name: f.teams?.away?.name, logo: f.teams?.away?.logo },
      goals: f.goals?.away ?? 0,
    },
    league: { id: f.league?.id, name: f.league?.name, country: f.league?.country, season: f.league?.season },
    betting: generateBetting(f.fixture?.id, f.teams?.home?.name, f.teams?.away?.name),
  }));
}

function mapStatus(short) {
  const map = { TBD: 'not_started', NS: 'not_started', '1H': 'live', HT: 'live', '2H': 'live', ET: 'live', FT: 'finished', AET: 'finished', PEN: 'finished', PST: 'postponed', CANC: 'cancelled' };
  return map[short] || 'not_started';
}

// ---- 全球即時博彩投注比例 ----
// 以 fixtureId/隊名做種子，產生確定性的投注市場比例 (貼近真實分布)
function seededRand(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateBetting(fixtureId, homeName, awayName) {
  const seed = Number(fixtureId) || (homeName || '').length * 7 + (awayName || '').length * 13;
  const r = seededRand(seed + 7);
  const seed2 = seededRand(seed + 11);

  // 主勝 38%-58%，和局 20%-30%，客勝補足至 100
  const home = Math.round(38 + r() * 20);
  const draw = Math.round(20 + r() * 10);
  const away = 100 - home - draw;

  // 大細 2.5: 大球 40%-68%
  const over = Math.round(40 + seed2() * 28);
  const under = 100 - over;

  // 雙方入球 (BTTS) 與多球市場
  const bttsYes = Math.round(48 + r() * 20);

  return {
    source: 'mock',
    updatedAt: new Date().toISOString(),
    markets: {
      winDrawWin: { home, draw, away },
      overUnder: [{ line: 2.5, over, under }],
      btts: { yes: bttsYes, no: 100 - bttsYes },
    },
  };
}

// ---- 模擬數據 (無API key時的演示) ----
// 記錄一個"比賽基準時刻"，首次建立後保持不變，使即時比賽分鐘隨真實時間推進
let _matchBaseTime = null;
function getMatchBaseTime() {
  if (!_matchBaseTime) _matchBaseTime = Date.now();
  return _matchBaseTime;
}

const MOCK_TEAMS = [
  { id: 1, name: '曼城', city: '曼徹斯特', foundedYear: 1880, country: '英格蘭', league: '英超' },
  { id: 2, name: '利物浦', city: '利物浦', foundedYear: 1892, country: '英格蘭', league: '英超' },
  { id: 3, name: '阿仙奴', city: '倫敦', foundedYear: 1886, country: '英格蘭', league: '英超' },
  { id: 4, name: '車路士', city: '倫敦', foundedYear: 1905, country: '英格蘭', league: '英超' },
  { id: 5, name: '曼聯', city: '曼徹斯特', foundedYear: 1878, country: '英格蘭', league: '英超' },
  { id: 6, name: '熱刺', city: '倫敦', foundedYear: 1882, country: '英格蘭', league: '英超' },
  { id: 7, name: '皇家馬德里', city: '馬德里', foundedYear: 1902, country: '西班牙', league: '西甲' },
  { id: 8, name: '巴塞隆拿', city: '巴塞隆拿', foundedYear: 1899, country: '西班牙', league: '西甲' },
];

function mockFixtures() {
  const base = getMatchBaseTime(); // 固定的比賽基準時刻
  const fixtures = [];
  MOCK_TEAMS.forEach((t, i) => {
    if (i % 2 === 0 && i + 1 < MOCK_TEAMS.length) {
      // 開賽時刻 = 基準時刻 + 各自的偏移 (現在開始並隨真實時間滾動)
      const start = new Date(base + (i / 2) * 100000); // 每對間隔約1.7分鐘
      fixtures.push(makeFixture(t, MOCK_TEAMS[i + 1], start, i));
    }
  });
  return fixtures;
}

function makeFixture(home, away, date, idx) {
  const now = new Date();
  const matchStart = new Date(date);
  const msInto = now.getTime() - matchStart.getTime();
  const started = msInto >= 0;
  const finished = msInto > 2 * 60 * 60 * 1000;
  const live = started && !finished;

  // 進行中: 分鐘數隨時間推進 (每次呼叫會變化 -> 真正的即時更新)
  let minute = undefined;
  let hg = 0, ag = 0;
  if (live) {
    minute = Math.min(90, Math.floor(msInto / 60000)) + 1;
    // 以開賽後經過時間推導動態進球 (模擬真實滾動)
    const baseGoals = (msInto / 60000) / 22; // 平均每22分鐘進一球
    hg = Math.floor(baseGoals * (1 + (idx % 3) * 0.2));
    ag = Math.floor(baseGoals * (0.5 + ((idx + 1) % 2) * 0.4));
    // 加入偶發變化，讓比分隨時間"滾動"更明顯
    if ((idx + Math.floor(msInto / 60000)) % 9 === 0) hg += 1;
  } else if (finished) {
    hg = (idx % 3);
    ag = ((idx + 2) % 2);
  }

  return {
    id: 1000 + idx,
    date: date.toISOString(),
    timestamp: matchStart.getTime(),
    status: finished ? 'finished' : (live ? 'live' : 'not_started'),
    minute: minute ? `${minute}'` : undefined,
    home: { team: { id: home.id, name: home.name, logo: undefined }, goals: hg },
    away: { team: { id: away.id, name: away.name, logo: undefined }, goals: ag },
    league: { id: 39, name: '英超', country: '英格蘭', season: 2024 },
    homeProfile: home,
    awayProfile: away,
    betting: generateBetting(1000 + idx, home.name, away.name),
  };
}

function mockLiveScores() {
  return mockFixtures().filter(f => f.status === 'live');
}

function mockStandings() {
  return MOCK_TEAMS.map((t, i) => ({ rank: i + 1, team: { id: t.id, name: t.name }, points: (34 - i * 3) }))
    .sort((a, b) => a.rank - b.rank);
}

module.exports = { getLiveScores, getFixtures, getStandings };
