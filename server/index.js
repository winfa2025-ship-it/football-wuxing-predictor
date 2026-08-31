/**
 * Express 後端伺服器
 * 
 * 提供:
 * - REST API (賽事、預測、風水分析)
 * - WebSocket 即時比分推送
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('../config');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { initWebsocket } = require('./routes/ws');
const { connectDB, authenticate } = require('./services/auth.service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// 靜態資源 (Web構建產物，如存在)
const webDist = path.join(__dirname, '../dist');
const hasWebBuild = fs.existsSync(path.join(webDist, 'index.html'));
if (hasWebBuild) {
  app.use(express.static(webDist));
}

// 認證路由 (註冊/登入)
app.use('/api/auth', authRoutes);

// 所有資料 API 公開 (免登入即可查看賽事/預測)
// 若需開啟登入保護，請在 .env 設定 AUTH_ENABLED=true 並啟用下方 middleware
// if (config.auth.enabled) {
//   app.use('/api', authenticate);
// }

// API 路由
app.use('/api', apiRoutes);

// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// WebSocket 即時比分
initWebsocket(io);

// SPA fallback (僅當存在 Web 構建產物時)
if (hasWebBuild && config.server.nodeEnv === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

const PORT = config.server.port;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 足球五行數據預測app 伺服器已啟動: http://0.0.0.0:${PORT}`);
  console.log(`📡 即時比分 WebSocket 啟動中...`);
  console.log(`🔐 登入保護: ${config.auth.enabled ? '開啟 (邀請碼 ' + config.auth.inviteCode + ')' : '關閉'}`);

  // 連接 MongoDB (非阻斷，失敗不影響啟動)
  connectDB().catch(err => console.error('⚠️  無法初始化資料庫 (登入功能將不可用):', err.message));
});
