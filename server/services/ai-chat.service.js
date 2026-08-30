/**
 * AI 代理人對話服務
 *
 * 讓用戶與 AI 代理人即時對話，並可查詢比賽進程。
 * AI 會讀取：
 *   - 即時比分（比數 / 分鐘 / 狀態）
 *   - 詳細事件（進球者 / 紅黃牌 / 換人）— 經由 history-generator
 *   - 今日預測（勝平負 / 信心度 / 投注建議）
 *
 * 使用 DeepSeek (OpenAI 相容) 生成回覆。無 key 時使用規則回應。
 */

const ai = require('../ai/openai');
const { getLiveScores, getFixtures } = require('../data-fetcher');
const { getMatchHistory } = require('../history-generator');
const { getTodayPredictions } = require('../services/ai-agent.service');

const AGENTS = {
  紫微斗數師: {
    icon: '🌟',
    role: '風水命理角度',
    system: '你是一位「紫微斗數師」，以紫微斗數、五行生剋、流年流月推算兩隊的氣數吉凶。回覆要帶玄學色彩，但仍切合實際比賽數據。',
  },
  數據分析師: {
    icon: '📊',
    role: '統計模型角度',
    system: '你是一位「足球數據分析師」，以統計數據、期望進球(xG)、近況、對戰紀錄做嚴謹分析。回覆要數據化、客觀。',
  },
  奇門遁甲師: {
    icon: '🧭',
    role: '時空能量角度',
    system: '你是一位「奇門遁甲師」，從開賽時辰、方位、九宮八門判斷兩隊得失。回覆要提及時辰方位與吉凶，但配合實際比分。',
  },
  走地觀察員: {
    icon: '👁️',
    role: '臨場狀態角度',
    system: '你是一位「走地觀察員」，專注即時比分滾動、臨場狀態、比賽節奏與走勢。你的回覆要著重此刻場上的最新情況。',
  },
};

const DEFAULT_AGENT = '數據分析師';

function getAgentPrompt(name) {
  const a = AGENTS[name] || AGENTS[DEFAULT_AGENT];
  return {
    name: name || DEFAULT_AGENT,
    role: a.role,
    system: a.system,
    icon: a.icon,
  };
}

/** 將即時比分整理成文字 */
function describeLiveScores(live, focusTeam) {
  const relevant = live.filter(f =>
    !focusTeam || f.home?.team?.name === focusTeam || f.away?.team?.name === focusTeam
  );
  if (!relevant.length) return '目前沒有進行中的賽事。';
  return relevant.map(f =>
    `${f.home?.team?.name} ${f.home?.goals ?? 0} - ${f.away?.goals ?? 0} ${f.away?.team?.name}` +
    `（${mapStatusZH(f.status)}${f.minute ? `，${f.minute}` : ''}）`
  ).join('；');
}

function mapStatusZH(status) {
  return { live: '進行中', finished: '已完場', not_started: '未開始', postponed: '延期', cancelled: '取消' }[status] || status;
}

/** 整理某場的詳細事件成文字 */
function describeEvents(history) {
  if (!history) return '';
  const lines = [];
  for (const m of history.h2h?.list || []) {
    const dateStr = new Date(m.date).toLocaleDateString('zh-HK');
    const score = `${m.home?.team?.name} ${m.home?.goals} - ${m.away?.goals} ${m.away?.team?.name}`;
    lines.push(`${dateStr} ${score}`);
    for (const e of m.events || []) {
      lines.push(`  · ${e.detail}`);
    }
  }
  return lines.join('\n');
}

/** 整理今日預測成文字 */
function describePredictions(preds, focusTeam) {
  const relevant = preds.filter(p =>
    !focusTeam || p.homeTeam === focusTeam || p.awayTeam === focusTeam
  );
  if (!relevant.length) return '暫無相關預測。';
  return relevant.map(p => {
    const c = p.consensus || {};
    const overOver = Number(c.overUnder?.over) > 50 ? '大球' : '小球';
    return `${p.homeTeam} vs ${p.awayTeam}\n` +
      `  · AI綜合：${c.winner}（信心 ${c.confidence}%）\n` +
      `  · 期望進球：${c.expectedGoals?.home} : ${c.expectedGoals?.away}\n` +
      `  · 大細 2.5：${overOver} ｜ 總球數：${c.totalGoals}\n` +
      `  · 波膽：${c.correctScore?.[0]?.score}（${c.correctScore?.[0]?.prob}%）`;
  }).join('\n\n');
}

/**
 * 產生對某一場比賽的完整上下文
 */
async function buildContext({ focusTeam, matchId }) {
  const [live, fixtures, preds] = await Promise.all([
    getLiveScores(),
    getFixtures(new Date()),
    getTodayPredictions().catch(() => []),
  ]);

  // 找出目標場次（focusTeam 或 matchId）
  let fixture = null;
  if (matchId) {
    fixture = live.find(f => Number(f.id) === Number(matchId)) ||
      fixtures.find(f => Number(f.id) === Number(matchId));
  } else if (focusTeam) {
    fixture = live.find(f => f.home?.team?.name === focusTeam || f.away?.team?.name === focusTeam) ||
      fixtures.find(f => f.home?.team?.name === focusTeam || f.away?.team?.name === focusTeam);
  }
  // 若仍無，取第一場進行中的
  if (!fixture) fixture = live[0] || fixtures[0];

  let history = null;
  if (fixture) {
    try {
      history = await getMatchHistory({
        home: fixture.home, away: fixture.away,
        homeProfile: fixture.homeProfile, awayProfile: fixture.awayProfile,
      });
    } catch { /* 忽略歷史失敗 */ }
  }

  return {
    fixture,
    liveText: fixture
      ? `${fixture.home?.team?.name} ${fixture.home?.goals ?? 0} - ${fixture.away?.goals ?? 0} ${fixture.away?.team?.name}（${mapStatusZH(fixture.status)}${fixture.minute ? `，${fixture.minute}` : ''}）`
      : describeLiveScores(live),
    eventsText: fixture ? describeEvents(history) : '',
    predText: describePredictions(preds, fixture?.home?.team?.name),
  };
}

/**
 * 處理一則用戶查詢，回傳 AI 回覆字串
 * @param {object} req - { message, agent, focusTeam, matchId }
 */
async function handleChat(req = {}) {
  const message = (req.message || '').trim();
  if (!message) return '請輸入你想查詢的問題。';

  const agentInfo = getAgentPrompt(req.agent);
  const { fixture, liveText, eventsText, predText } = await buildContext(req);

  // 組裝給 AI 的上下文
  const context = [
    `【當前比賽進程】${liveText}`,
    eventsText ? `【該場過往對賽與事件】\n${eventsText}` : '',
    predText ? `【今日 AI 預測】\n${predText}` : '',
    `【用戶問題】${message}`,
  ].filter(Boolean).join('\n\n');

  // 無 AI key → 規則回覆
  if (!ai.isEnabled()) {
    return `【${agentInfo.name}】您好！${describeLiveScores([], '') ? '' : '目前'}當前比分：${liveText}\n\n（未設定 AI key，此為規則模式回覆。查詢：比分/進程/預測）`;
  }

  try {
    const systemPrompt = `${agentInfo.system}\n現在你用繁體中文回覆用戶關於足球比賽的問題。可查詢：即時比數、比賽分鐘、詳細事件（進球者/紅黃牌/換人）、即時統計、AI 預測與投注建議。請直接回答，開頭用「${agentInfo.icon} ${agentInfo.name}」。若問題與比賽無關，請簡短說明。`;
    const reply = await ai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context },
    ], { temperature: 0.7, maxTokens: 600 });
    return reply;
  } catch (err) {
    console.error('AI 對話失敗:', err.message);
    return `【${agentInfo.name}】暫時無法連線 AI。目前比分：${liveText}。請稍後再試。`;
  }
}

module.exports = { handleChat, getAgentPrompt, AGENTS };
