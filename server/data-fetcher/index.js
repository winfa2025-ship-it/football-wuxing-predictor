/**
 * 即時比分數據服務
 *
 * 資料來源 (免 key，免費):
 *  1. openfootball (football.json) — 完整賽季賽程/對戰 (含 2026-27 英超等主流聯賽)
 *  2. SportScore                  — 當日即時比分/賽事
 *  3. mock                        — 以上皆失敗時的最後備援
 */

const config = require('../../config');

// SportScore 免費 API (免 key, CORS 開放)
const SPORTSCORE_BASE = 'https://sportscore.com/api/widget';

// openfootball 各主流聯賽檔 (2026-27 賽季, 跨年制)
const OPENFOOTBALL_LEAGUES = [
  { file: 'en.1.json', name: '英超', country: '英格蘭' },
  { file: 'en.2.json', name: '英冠', country: '英格蘭' },
  { file: 'es.1.json', name: '西甲', country: '西班牙' },
  { file: 'de.1.json', name: '德甲', country: '德國' },
  { file: 'it.1.json', name: '意甲', country: '意大利' },
  { file: 'fr.1.json', name: '法甲', country: '法國' },
  { file: 'nl.1.json', name: '荷甲', country: '荷蘭' },
  { file: 'pt.1.json', name: '葡超', country: '葡萄牙' },
];
const OPENFOOTBALL_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master/2026-27';

async function ttGet(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- SportScore: 當日即時 + 近期賽事 ----
async function fetchSportScore() {
  try {
    const data = await ttGet(`${SPORTSCORE_BASE}/matches/?sport=football&limit=50&src=football-wuxing-predictor`);
    return (data.matches || []).map(m => ({
      home: m.home,
      away: m.away,
      home_score: m.home_score != null ? Number(m.home_score) : null,
      away_score: m.away_score != null ? Number(m.away_score) : null,
      status: m.status,
      status_text: m.status_text,
      time: m.time,
      competition: m.competition,
      url: m.url,
    }));
  } catch (err) {
    console.error('SportScore fetch failed:', err.message);
    return [];
  }
}

// ---- openfootball: 指定日期的賽程/對戰 ----
async function fetchOpenfootball(dateStr) {
  const results = [];
  for (const lg of OPENFOOTBALL_LEAGUES) {
    try {
      const data = await ttGet(`${OPENFOOTBALL_BASE}/${lg.file}`);
      const matches = (data.matches || []).filter(m => m.date === dateStr);
      matches.forEach(m => {
        let homeGoals = null, awayGoals = null, status = 'not_started';
        if (m.score && m.score.ft) { homeGoals = m.score.ft[0]; awayGoals = m.score.ft[1]; status = 'finished'; }
        results.push({
          id: `${lg.file}:${m.date}:${m.team1}-${m.team2}`,
          date: `${m.date}T${m.time || '00:00'}:00`,
          home: { team: { name: m.team1 }, goals: homeGoals },
          away: { team: { name: m.team2 }, goals: awayGoals },
          status,
          league: { id: lg.file, name: lg.name, country: lg.country, season: '2026-27' },
          homeProfile: { name: m.team1 },
          awayProfile: { name: m.team2 },
        });
      });
    } catch (err) {
      console.error(`openfootball ${lg.file} failed:`, err.message);
    }
  }
  return results;
}

// 合併: 以 openfootball 賽程為主體，用 SportScore 覆蓋即時比分/狀態
function mergeFixtures(open, ss) {
  const ssByKey = new Map();
  for (const s of ss) {
    const k = `${(s.home || '').toLowerCase()}-${(s.away || '').toLowerCase()}`;
    ssByKey.set(k, s);
  }
  const result = open.map(m => {
    const homeKey = (m.home?.team?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const awayKey = (m.away?.team?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const sl = ssByKey.get(`${homeKey}-${awayKey}`) || ssByKey.get(`${awayKey}-${homeKey}`);
    if (sl) {
      let status = m.status;
      if (sl.status === 'live') status = 'live';
      else if (sl.status === 'finished' && m.status !== 'finished') status = 'finished';
      return {
        ...m,
        status,
        minute: sl.status === 'live' ? (sl.status_text || 'LIVE') : undefined,
        home: { ...m.home, goals: sl.home_score ?? m.home.goals },
        away: { ...m.away, goals: sl.away_score ?? m.away.goals },
      };
    }
    return m;
  });
  return result.map(f => ({ ...f, betting: generateBetting(f.id, f.home?.team?.name, f.away?.team?.name, 'openfootball') }));
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

async function getFixtures(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  try {
    const [open, ss] = await Promise.all([fetchOpenfootball(dateStr), fetchSportScore()]);
    const merged = mergeFixtures(open, ss);
    if (merged.length > 0) return merged;
    return ssToFixtures(ss, dateStr);
  } catch (err) {
    console.error('Fixtures fetch failed:', err.message);
    return mockFixtures();
  }
}

// 當 openfootball 沒有該日賽程時，直接用 SportScore 當日賽事
function ssToFixtures(ss, dateStr) {
  return ss
    .filter(s => (s.time || '').startsWith(dateStr))
    .map((s, i) => ({
      id: `ss:${i}:${s.home}-${s.away}`,
      date: s.time,
      status: s.status === 'live' ? 'live' : (s.status === 'finished' ? 'finished' : 'not_started'),
      minute: s.status === 'live' ? (s.status_text || 'LIVE') : undefined,
      home: { team: { name: s.home }, goals: s.home_score },
      away: { team: { name: s.away }, goals: s.away_score },
      league: { name: s.competition || '足球' },
      betting: generateBetting(i, s.home, s.away, 'sportscore'),
    }));
}

async function getLiveScores() {
  const ss = await fetchSportScore();
  const live = ss.filter(s => s.status === 'live');
  if (live.length > 0) return ssToFixtures(live, '');
  return mockLiveScores();
}

async function getStandings(leagueId) {
  try {
    const data = await ttGet(`${SPORTSCORE_BASE}/standings/?sport=football&slug=premier-league&src=football-wuxing-predictor`);
    const table = data.standings || data.table || [];
    return table.map((r, i) => ({ rank: i + 1, team: { name: r.team || r.name }, points: r.points ?? 0 }));
  } catch (err) {
    return mockStandings();
  }
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

function generateBetting(fixtureId, homeName, awayName, source = 'mock') {
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
    source,
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
