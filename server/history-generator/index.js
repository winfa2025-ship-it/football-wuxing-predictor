/**
 * 每場足球過往歷史數據生產器
 *
 * 提供每場賽事的完整詳細歷史表：
 *   - h2h      : 兩隊過往對賽紀錄（勝負平統計 + 最近對賽列表）
 *   - recent   : 兩隊各自近期狀態（最近幾場比賽結果）
 *   - events   : 每場過往賽事的進球者 / 紅黃牌 / 換人 詳細事件
 *
 * 支援真實 API (api-football via RapidAPI) 與 mock 兩種模式。
 * mock 數據以固定的"比賽基準時刻"為基礎，生成確定性的歷史數據。
 */

const config = require('../../config');

const API_KEY = config.api.footballApiKey;
const API_BASE = config.api.footballApiBase;
const API_HOST = config.api.footballApiHost;

async function apiGet(url) {
  const res = await fetch(url, {
    headers: { 'X-RapidAPI-Key': API_KEY, 'X-RapidAPI-Host': API_HOST },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const TEAM_NAMES = ['曼城', '利物浦', '阿仙奴', '車路士', '曼聯', '熱刺', '皇家馬德里', '巴塞隆拿'];

const PLAYERS = {
  曼城: ['夏蘭特', '迪布尼', '科頓', '格拉利殊', '貝拿度施華', '洛迪', '戴亞斯', '艾華利斯'],
  利物浦: ['沙拿', '紐尼斯', '迪亞斯', '加普', '阿歷山大阿諾特', '雲迪克', '蘇保斯拿爾', '麥亞里士打'],
  阿仙奴: ['薩卡', '奧迪加特', '哈伐斯', '馬天尼利', '賴斯', '加比爾', '沙利巴', '托沙'],
  車路士: ['龐馬', '積遜', '史達寧', '安素費南迪斯', '巴拉沙利', '古古列拿', '彭馬', '馬度基'],
  曼聯: ['華舒福', '海倫', '般奴', '拉舒福特', '馬勒', '卡斯米路', '艾歷臣', '加拿祖'],
  熱刺: ['孫興愍', '麥迪遜', '基斯頓羅美路', '李察利臣', '白官加', '莊遜', '索蘭基', '古路施夫斯基'],
  皇家馬德里: ['麥巴比', '雲尼斯奧斯', '比寧咸', '洛迪高', '華維迪', '卡馬雲加', '古拿', '摩迪'],
  巴塞隆拿: ['利雲度夫斯基', '亞馬爾', '拉菲尼亞', '柏迪', '加維', '迪莊', '費明盧比斯', '古比'],
};

/** 以 seed 生成確定性的偽隨機數 */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 取得兩場之間相隔的天數（用於產生歷史日期）
 * 基準 = 賽事開賽時間戳；歷史場次往回推
 */
function dateNDaysAgo(baseMs, days, offsetMin = 0) {
  return new Date(baseMs - days * 24 * 60 * 60 * 1000 + offsetMin * 60000);
}

/**
 * 產生一隊的過往賽事細節（含事件）
 */
function makeHistoricMatch({ homeName, awayName, homeGoals, awayGoals, dateMs, rand, isHomeTeam }) {
  const homePlayers = PLAYERS[homeName] || ['A隊球星'];
  const awayPlayers = PLAYERS[awayName] || ['B隊球星'];

  const events = [];

  // 主隊進球者
  const homeScorers = [];
  for (let i = 0; i < homeGoals; i++) {
    const player = homePlayers[Math.floor(rand() * homePlayers.length)];
    const minute = 5 + Math.floor(rand() * 88);
    homeScorers.push({ player, minute });
  }
  // 客隊進球者
  const awayScorers = [];
  for (let i = 0; i < awayGoals; i++) {
    const player = awayPlayers[Math.floor(rand() * awayPlayers.length)];
    const minute = 5 + Math.floor(rand() * 88);
    awayScorers.push({ player, minute });
  }

  // 進球事件（按分鐘排序）
  const goalEvents = [...homeScorers.map(s => ({ ...s, team: 'home', type: 'goal' })),
    ...awayScorers.map(s => ({ ...s, team: 'away', type: 'goal' }))]
    .sort((a, b) => a.minute - b.minute)
    .map((g, i) => ({
      type: 'goal',
      team: g.team,
      player: g.player,
      minute: g.minute,
      detail: `${g.minute}' ${g.player}${i + 1 === homeScorers.length && g.team === 'home' && false ? '' : ''} 入球`,
    }));

  const result = {
    id: Math.floor(rand() * 100000),
    date: dateMs,
    home: { team: { id: -1, name: homeName }, goals: homeGoals },
    away: { team: { id: -1, name: awayName }, goals: awayGoals },
    events,
  };

  // 紅黃牌事件（隨機 0-2 張）
  const cardTeams = [];
  if (rand() > 0.5) cardTeams.push('home');
  if (rand() > 0.65) cardTeams.push('away');
  cardTeams.forEach(team => {
    const isRed = rand() > 0.85;
    const player = (team === 'home' ? homePlayers : awayPlayers)[Math.floor(rand() *
      (team === 'home' ? homePlayers : awayPlayers).length)];
    const minute = 5 + Math.floor(rand() * 88);
    result.events.push({
      type: isRed ? 'red_card' : 'yellow_card',
      team,
      player,
      minute,
      detail: `${minute}' ${player} ${isRed ? '紅牌' : '黃牌'}`,
    });
  });

  // 換人事件（每隊 1-3 次）
  [homeName, awayName].forEach((name, idx) => {
    const team = idx === 0 ? 'home' : 'away';
    const subs = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < subs; i++) {
      const players = (team === 'home' ? homePlayers : awayPlayers);
      const outP = players[Math.floor(rand() * players.length)];
      const inP = players[Math.floor(rand() * players.length)];
      const minute = 30 + Math.floor(rand() * 55);
      result.events.push({
        type: 'sub',
        team,
        player: inP,
        minute,
        detail: `${minute}' 換人 ${inP} 換入，替換 ${outP}`,
      });
    }
  });

  // 全部事件按分鐘排序
  result.events.sort((a, b) => a.minute - b.minute);
  result.eventCount = result.events.length;

  return result;
}

/**
 * 產生兩隊的完整歷史數據
 * @param {object} opts - { id, home, away, homeProfile, awayProfile }
 */
function getMockHistory({ home, away }) {
  const homeName = typeof home?.team?.name === 'string' ? home.team.name : '主隊';
  const awayName = typeof away?.team?.name === 'string' ? away.team.name : '客隊';

  // 以兩隊 id 產生穩定 seed
  const seedBase = (home?.team?.id || 0) * 1009 + (away?.team?.id || 0) * 31;
  const rand = mulberry32(Math.abs(seedBase) % 2147483647 || 12345);

  const baseMs = Date.now();
  const HISTORIC_MATCHES = 8;

  // ---- 頭對頭 (H2H) ----
  const h2hMatches = [];
  let homeWins = 0, draws = 0, awayWins = 0, homeGoals = 0, awayGoals = 0;
  for (let i = 0; i < HISTORIC_MATCHES; i++) {
    const homeGoals_i = Math.floor(rand() * 4);
    const awayGoals_i = Math.floor(rand() * 3);
    h2hMatches.push(makeHistoricMatch({
      homeName, awayName,
      homeGoals: homeGoals_i, awayGoals: awayGoals_i,
      dateMs: dateNDaysAgo(baseMs, (i + 1) * 14 + rand() * 6).getTime(),
      rand,
    }));
    const m = h2hMatches[h2hMatches.length - 1];
    m.home.team.id = home?.team?.id;
    m.away.team.id = away?.team?.id;
    if (m.home.goals > m.away.goals) homeWins++;
    else if (m.home.goals < m.away.goals) awayWins++;
    else draws++;
    homeGoals += m.home.goals;
    awayGoals += m.away.goals;
  }

  const h2h = {
    total: HISTORIC_MATCHES,
    homeWins, draws, awayWins,
    goals: { home: homeGoals, away: awayGoals },
    list: h2hMatches,
  };

  // ---- 各隊近期狀態 (最近5場) ----
  const recent = [homeName, awayName].map((name, idx) => {
    const isHome = idx === 0;
    const matches = [];
    let wins = 0, draws_r = 0, losses = 0, scored = 0, conceded = 0;
    for (let i = 0; i < 5; i++) {
      // 對陣隨機其他隊
      const oppIdx = Math.floor(rand() * TEAM_NAMES.length);
      const oppName = TEAM_NAMES[oppIdx] === name ? TEAM_NAMES[(oppIdx + 1) % TEAM_NAMES.length] : TEAM_NAMES[oppIdx];
      const ownGoals = Math.floor(rand() * 4);
      const oppGoals = Math.floor(rand() * 3);
      const result = ownGoals > oppGoals ? 'W' : ownGoals < oppGoals ? 'L' : 'D';
      if (result === 'W') wins++;
      else if (result === 'D') draws_r++;
      else losses++;
      scored += ownGoals; conceded += oppGoals;
      const m = makeHistoricMatch({
        homeName: isHome ? name : oppName,
        awayName: isHome ? oppName : name,
        homeGoals: isHome ? ownGoals : oppGoals,
        awayGoals: isHome ? oppGoals : ownGoals,
        dateMs: dateNDaysAgo(baseMs, (i + 1) * 6 + rand() * 3).getTime(),
        rand,
      });
      m.status = 'FT';
      m.result = result;
      matches.push(m);
    }
    return {
      teamName: name,
      form: matches.map(m => m.result),
      wins, draws: draws_r, losses,
      scored, conceded,
      goals: { for: scored, against: conceded },
      matches,
    };
  });

  return { h2h, recent };
}

/**
 * 對外統一入口
 * @returns {Promise<{h2h: object, recent: object[], source: 'api'|'mock'}>}
 */
async function getMatchHistory({ id, home, away, homeProfile, awayProfile }) {
  // 無 API key 或缺少 team id 時使用 mock
  if (!API_KEY || !home?.team?.id || !away?.team?.id) {
    return { ...getMockHistory({ home, away, homeProfile, awayProfile }), source: 'mock' };
  }
  try {
    const [h2hRes, homeFormRes, awayFormRes] = await Promise.all([
      apiGet(`${API_BASE}/fixtures/headtohead?h2h=${home.team.id}-${away.team.id}&last=10`),
      apiGet(`${API_BASE}/fixtures?team=${home.team.id}&last=5`),
      apiGet(`${API_BASE}/fixtures?team=${away.team.id}&last=5`),
    ]);
    return { ...parseApiHistory(h2hRes, homeFormRes, awayFormRes), source: 'api' };
  } catch (err) {
    console.error('History fetch failed:', err.message);
    return { ...getMockHistory({ home, away, homeProfile, awayProfile }), source: 'mock' };
  }
}

module.exports = { getMatchHistory, getMockHistory };

// 附註：真實 API 的 events 需要每個 fixture id 再查一次 /fixtures/events
//       (在 parseApiHistory 中可進一步擴充；mock 已含完整事件)
// eslint-disable-next-line no-unused-vars
function parseApiHistory(h2hRes, homeFormRes, awayFormRes) {
  return {
    h2h: {
      total: h2hRes?.response?.length || 0,
      homeWins: (h2hRes?.response?.filter?.(m => m.teams?.home?.winner) || []).length,
      draws: (h2hRes?.response?.filter?.(m => m.teams?.home?.winner === false && m.teams?.away?.winner === false) || []).length,
      awayWins: (h2hRes?.response?.filter?.(m => m.teams?.away?.winner) || []).length,
      goals: {
        home: h2hRes?.response?.reduce?.((s, m) => s + (m.goals?.home || 0), 0) || 0,
        away: h2hRes?.response?.reduce?.((s, m) => s + (m.goals?.away || 0), 0) || 0,
      },
      list: (h2hRes?.response || []).map(m => ({
        id: m.fixture?.id,
        date: m.fixture?.date,
        home: { team: { id: m.teams?.home?.id, name: m.teams?.home?.name, logo: m.teams?.home?.logo }, goals: m.goals?.home },
        away: { team: { id: m.teams?.away?.id, name: m.teams?.away?.name, logo: m.teams?.away?.logo }, goals: m.goals?.away },
      })),
    },
    recent: [homeFormRes, awayFormRes].map((res, idx) => ({
      teamName: res?.response?.[0]?.teams?.[idx === 0 ? 'home' : 'away']?.team?.name || '',
      form: (res?.response || []).map(m =>
        m.teams?.home?.winner ? (idx === 0 ? 'W' : 'L') :
        m.teams?.away?.winner ? (idx === 0 ? 'L' : 'W') : 'D'),
      matches: (res?.response || []).map(m => ({
        id: m.fixture?.id,
        date: m.fixture?.date,
        result: m.teams?.home?.winner ? (idx === 0 ? 'W' : 'L') : m.teams?.away?.winner ? (idx === 0 ? 'L' : 'W') : 'D',
        home: { team: { id: m.teams?.home?.id, name: m.teams?.home?.name }, goals: m.goals?.home },
        away: { team: { id: m.teams?.away?.id, name: m.teams?.away?.name }, goals: m.goals?.away },
      })),
    })),
  };
}
