/**
 * OpenAI 相容 AI 客戶端
 *
 * 支援 DeepSeek / OpenAI 等 OpenAI 相容的 chat/completions API。
 * 使用 Node 原生 fetch，不需額外依賴。
 *
 * 端點: POST {baseUrl}/v1/chat/completions  (DeepSeek 為 {baseUrl}/chat/completions)
 */

const config = require('../../config');

const API_KEY = config.ai.aiApiKey;
const MODEL = config.ai.aiModel;
const BASE = config.ai.aiBaseUrl;

// DeepSeek 同時支援 /v1/chat/completions 與 /chat/completions
const COMPLETIONS_URL = `${BASE.replace(/\/$/, '')}/v1/chat/completions`;

function isEnabled() {
  return Boolean(API_KEY);
}

/**
 * 呼叫 AI 產生一段文字分析
 * @param {Array<{role:string,content:string}>} messages
 * @param {object} opts - { temperature, maxTokens }
 * @returns {Promise<string>} AI 回覆文字
 */
async function chat(messages, opts = {}) {
  if (!API_KEY) throw new Error('未設定 AI API key');

  const res = await fetch(COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 900,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * 要求 AI 以 JSON 回傳比賽預測
 * @param {object} promptData - 比賽相關資料
 * @returns {Promise<object>} 解析後的 JSON (含 winner/confidence/correctScore/overUnder/totalGoals/analysis)
 */
async function predictMatch(promptData) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(promptData, null, 2) },
  ];
  const text = await chat(messages, { temperature: 0.5, maxTokens: 1200 });
  return parseJsonLoose(text);
}

/**
 * 要求 AI 以 JSON 回傳單一代理人的分析
 * @returns {Promise<object>} { pick, confidence, analysis }
 */
async function agentAnalysis(agentName, role, promptData) {
  const messages = [
    { role: 'system', content: `你是一位專業的足球 AI 分析師，名為「${agentName}」。\n你的分析角度：${role}。\n你必須以 JSON 物件回覆，格式如下（不要有多餘文字）：\n{ "pick": "主勝|和局|客勝", "confidence": 55至95之間的整數, "analysis": "200字以內的中文分析" }` },
    { role: 'user', content: JSON.stringify(promptData, null, 2) },
  ];
  const text = await chat(messages, { temperature: 0.7, maxTokens: 700 });
  const parsed = parseJsonLoose(text);
  // 保證欄位
  if (!parsed || typeof parsed !== 'object') throw new Error('AI 回覆無法解析');
  parsed.pick = ['主勝', '和局', '客勝'].includes(parsed.pick) ? parsed.pick : '和局';
  parsed.confidence = Math.min(95, Math.max(55, Number(parsed.confidence) || 65));
  parsed.analysis = parsed.analysis || '（AI 未提供分析）';
  return parsed;
}

/** 從 AI 文字中抽出 JSON 物件（處理 markdown 程式碼塊等） */
function parseJsonLoose(text) {
  if (!text) return null;
  // 去掉 ```json ... ``` 包裝
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `你是一位專業的足球賽事預測 AI，結合「統計數據分析」與「風水五行命理」做出綜合預測。
你會收到兩隊的資訊: 隊名、近5場狀態(form)、近5場進球數、城市、成立年份、主客場、聯賽排名。
請輸出 JSON (不要有多餘文字):
{
  "winner": "主勝|和局|客勝",
  "confidence": 55至95整數,
  "expectedGoals": {"home": 0.0-4.0, "away": 0.0-4.0},
  "correctScore": [{"score":"2-1","prob":"15.0"}...最多5個，由高到低],
  "overUnder": {"line":2.5,"over":"55"},
  "totalGoals": "大|中|小",
  "analysis": "150字內綜合分析(統計+五行角度)"
}`;

module.exports = { chat, predictMatch, agentAnalysis, isEnabled, parseJsonLoose };
