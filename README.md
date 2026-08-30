# 足球五行數據預測app ⚽☯

**AI + 風水命理足球預測應用** — 一套代碼同時支持 **iOS / Android / Web**

## ✨ 核心功能

| 功能 | 說明 |
|------|------|
| 📅 **今日賽事** | 每日自動拉取賽程，點擊進入預測詳情 |
| 🤖 **AI每日預測** | 4位代理人(紫微斗數師/數據分析師/奇門遁甲師/走地觀察員)協同預測 |
| ⚡ **即時比分** | WebSocket每30秒推送比分，AI走地即時覆盤 |
| ☯ **風水運勢** | 以五行生剋、流年氣場、陰陽方位推算兩隊運勢 |
| 🎯 **投注建議** | 勝平負、大細球(2.5)、波膽、全球總球數 |
| 👥 **AI代理人** | 各代理人獨立分析 + 共識表決 |

## 🏗️ 技術架構

```
├── app/                    # Expo Router 前端 (RN + Web)
│   ├── (tabs)/             # 五大頁面 (賽事/預測/即時/風水/代理人)
│   ├── prediction/[id].tsx # 預測詳情彈窗
│   ├── hooks/              # 即時比分 WebSocket Hook
│   └── utils/              # API client + 主題
├── server/                 # Express + Socket.IO 後端
│   ├── fengshui-engine/    # 風水命理計算引擎 (五行/流年/陰陽/方位)
│   ├── ai-predictor/       # AI預測引擎 (Poisson統計 + 風水50:50)
│   ├── data-fetcher/       # 即時比分數據獲取 (免費API + mock)
│   ├── services/           # AI代理人每日預測服務
│   └── routes/             # REST API + WebSocket
├── shared/                 # 共享類型定義
└── config/                 # 伺服器配置
```

## 🚀 快速開始

### 1. 啟動後端
```bash
cd server && npm install && npm start
# 啟動於 http://localhost:3001
```

### 2. 啟動前端 (Web / App)
```bash
npm install
npm run web      # Web 開發模式
npm run android  # Android App
npm run ios      # iOS App
```

> 無需 API Key 即可運行（自動使用演示數據 mock 模式）。

## 🔌 接入真實即時數據

使用免費的 [api-football (RapidAPI)](https://rapidapi.com/api-sports/api/api-football)，免費層每日100次請求：

```bash
# server/config/index.js 或環境變數
export FOOTBALL_API_KEY="你的_rapidapi_key"
```

### AI分析 (可選)
如配置 OpenAI/Gemini API Key，會升級為LLM深度分析：
```bash
export OPENAI_API_KEY="..."
export GEMINI_API_KEY="..."
```

## 🧠 預測演算法

**最終預測 = 統計模型 (50%) + 風水命理 (50%)**

- **統計模型**: Poisson分佈模擬進球 → 勝平負/大細/波膽/總球數
- **風水命理**: 以隊創立年份定五行 → 流年生剋 → 算運勢指數 → 轉勝率
- **AI代理人**: 4個不同角度獨立分析 → 加權共識表決輸出最終預測

## ⚠️ 聲明
本應用僅供娛樂與研究用途，不構成任何投注建議。
