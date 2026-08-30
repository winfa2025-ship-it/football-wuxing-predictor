/**
 * 風水命理預測引擎
 * 
 * 採用傳統中國風水五術理論：
 * - 五行生剋 (木火土金水)
 * - 十天干地支
 * - 流年流月運勢
 * - 陰陽調和
 * - 方位吉凶 (八宅明鏡)
 * 
 * 結合足球隊名、城市、創立年份計算"氣場能量"
 */

const WUXING = {
  WOOD: { name: '木', color: '#2E7D32', direction: '東', mascot: '青龍', strength: ['木', '水', '火'], weakness: ['金'] },
  FIRE: { name: '火', color: '#D32F2F', direction: '南', mascot: '朱雀', strength: ['火', '木', '土'], weakness: ['水'] },
  EARTH: { name: '土', color: '#8D6E63', direction: '中央', mascot: '麒麟', strength: ['土', '火', '金'], weakness: ['木'] },
  METAL: { name: '金', color: '#B8860B', direction: '西', mascot: '白虎', strength: ['金', '土', '水'], weakness: ['火'] },
  WATER: { name: '水', color: '#1565C0', direction: '北', mascot: '玄武', strength: ['水', '金', '木'], weakness: ['土'] },
};

const GEN_MAP = { WOOD: 'WATER', FIRE: 'WOOD', EARTH: 'FIRE', METAL: 'EARTH', WATER: 'METAL' };
const KE_MAP = { WOOD: 'EARTH', FIRE: 'METAL', EARTH: 'WATER', METAL: 'WOOD', WATER: 'FIRE' };

const yearElementCache = new Map();

function getYearElement(year) {
  if (yearElementCache.has(year)) return yearElementCache.get(year);
  const cycle = (year - 1864) % 60;
  if (cycle < 0) return 'WOOD';
  const elements = ['WOOD', 'WOOD', 'FIRE', 'FIRE', 'EARTH', 'EARTH', 'METAL', 'METAL', 'WATER', 'WATER'];
  const idx = Math.floor(cycle / 12);
  const result = elements[idx] || 'WOOD';
  yearElementCache.set(year, result);
  return result;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function calculateTeamFengshui(profile, matchDate) {
  const teamElement = getYearElement(profile.foundedYear);
  const currentYear = matchDate.getFullYear();
  const currentElement = getYearElement(currentYear);

  const yi = GEN_MAP[teamElement] === currentElement ? 1.0 : 0.4;
  const yang = profile.name.length % 2 === 0 ? 1.0 : 0.5;
  const di = getDirectionLuck(profile.city, matchDate);

  const baseLuck = (yi * 35 + di * 30 + (profile.foundedYear % 100 > 20 ? 20 : 8) + (teamElement === currentElement ? 15 : 5));
  const luck = Math.min(99, Math.max(20, Math.round(baseLuck)));

  const isYinYang = (profile.foundedYear + currentYear) % 2 === 0;

  return {
    element: WUXING[teamElement].name,
    luck,
    yinYang: isYinYang ? '陽' : '陰',
    color: WUXING[teamElement].color,
    direction: getBestDirection(teamElement, matchDate),
    teamMomentum: luck > 75 ? '氣勢如虹' : luck > 55 ? '平穩上升' : luck > 40 ? '起伏不定' : '氣場低迷',
    winChance: Math.round(luck),
  };
}

function getDirectionLuck(city, date) {
  const hash = hashString(city + date.toISOString().slice(0, 10));
  return (hash % 100) / 100;
}

function getBestDirection(element, date) {
  const directions = { WOOD: 75, FIRE: 90, EARTH: 60, METAL: 80, WATER: 65 };
  const dayFactor = (date.getFullYear() + date.getMonth() * 5 + date.getDate()) % 4;
  const luck = Math.min(99, directions[element] + dayFactor * 5);
  if (luck > 80) return WUXING[element].direction + '方 (吉)';
  if (luck > 60) return '中庸';
  return '西南 (需化解)';
}

function compareFengshui(home, away) {
  const diff = home.luck - away.luck;
  const winner = Math.abs(diff) < 5 ? 'draw' : (diff > 0 ? 'home' : 'away');
  const clash = diff > 20 ? '主隊氣勢壓倒客隊' : diff < -20 ? '客隊來勢洶洶' : '雙方實力相當';

  let analysis = `主隊五行屬${home.element}，客隊五行屬${away.element}。`;
  analysis += diff > 0
    ? `主隊運勢指數${home.luck}高於客隊${away.luck}，氣場占優。`
    : `客隊運勢指數${away.luck}高於主隊${home.luck}，氣勢占優。`;
  analysis += ` 本日建議：${home.yinYang === '陽' ? '陽氣旺盛，可主動出擊' : '陰氣較重，宜穩守反擊'}，${away.yinYang === '陰' ? '客隊宜保守應對' : '客隊蓄勢待發'}。`;

  return { winner, advantage: Math.abs(diff), clash, analysis };
}

function fengshuiPrediction(homeProfile, awayProfile, date) {
  const home = calculateTeamFengshui(homeProfile, date);
  const away = calculateTeamFengshui(awayProfile, date);
  const cmp = compareFengshui(home, away);

  let homeWin = home.winChance;
  let awayWin = away.winChance;

  const homeEl = getYearElement(homeProfile.foundedYear);
  const awayEl = getYearElement(awayProfile.foundedYear);
  if (KE_MAP[homeEl] === awayEl) homeWin += 8;
  if (KE_MAP[awayEl] === homeEl) awayWin += 8;

  // 保留合理和局比例
  const diff = Math.abs(homeWin - awayWin);
  const draw = diff > 40 ? 8 : diff > 20 ? 15 : 25;
  const total = homeWin + awayWin + draw;
  homeWin = (homeWin / total) * 100;
  awayWin = (awayWin / total) * 100;
  const drawFinal = Math.max(0, 100 - homeWin - awayWin);

  return { homeWin: Math.round(homeWin), draw: Math.round(drawFinal), awayWin: Math.round(awayWin), home, away, analysis: cmp.analysis };
}

module.exports = {
  WUXING,
  getYearElement,
  calculateTeamFengshui,
  compareFengshui,
  fengshuiPrediction,
};
