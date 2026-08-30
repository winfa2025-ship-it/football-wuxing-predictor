// 載入 .env (若存在) — 支援 DeepSeek/OpenAI 等 OpenAI 相容 API
// 明確指定專案根目錄的 .env (避免受 process.cwd() 影響)
try {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) { /* dotenv 可選 */ }

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.DATABASE_URL || 'mongodb://localhost:27017/football-wuxing-predictor',
  },
  auth: {
    // 登入系統設定
    jwtSecret: process.env.JWT_SECRET || 'football-wuxing-VIP888-secret-change-me',
    jwtExpires: process.env.JWT_EXPIRES || '30d',
    // 邀請碼 (首次註冊需驗證，自用設定)
    inviteCode: process.env.INVITE_CODE || 'VIP888',
    // 是否啟用登入保護 (停用時可繞過，方便開發)
    enabled: (process.env.AUTH_ENABLED || 'true') !== 'false',
  },
  api: {
    // 免費足球API提供商 (api-football via rapidapi)
    // api-football.com - 免費版每日100次請求
    footballApiKey: process.env.FOOTBALL_API_KEY || '',
    footballApiBase: process.env.FOOTBALL_API_BASE || 'https://api-football-v1.p.rapidapi.com/v3',
    footballApiHost: process.env.FOOTBALL_API_HOST || 'api-football-v1.p.rapidapi.com',
  },
  ai: {
    // AI預測引擎 - 支援 DeepSeek / OpenAI / Gemini(OpenAI相容) 
    // 預設使用 DeepSeek (OpenAI 相容 API)
    aiApiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    aiBaseUrl: process.env.AI_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    aiModel: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
  websocket: {
    // 即時比分推送 - 每10秒輪詢式更新
    pollIntervalMs: 10000,
  },
  prediction: {
    // 風水:AI 權重比
    fengshuiWeight: 50,
    aiWeight: 50,
  }
};

module.exports = config;
