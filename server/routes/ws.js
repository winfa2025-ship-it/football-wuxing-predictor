/**
 * WebSocket 即時比分推送
 * 
 * 每30秒輪詢API並向所有連接的客戶端推送即時比分
 */

const { getLiveScores } = require('../data-fetcher');
const config = require('../../config');
const { handleChat } = require('../services/ai-chat.service');

function initWebsocket(io) {
  const intervalMs = config.websocket.pollIntervalMs;

  io.on('connection', (socket) => {
    console.log('📱 客戶端已連接:', socket.id);

    socket.on('subscribe', (matchIds) => {
      socket.join('live-scores');
      socket.data.matchIds = matchIds || [];
    });

    // AI 對話：用戶傳訊息，伺服器回覆
    socket.on('chat:message', async (payload = {}) => {
      try {
        socket.emit('chat:typing', { typing: true, agent: payload.agent || '數據分析師' });
        const reply = await handleChat({
          message: payload.message,
          agent: payload.agent,
          focusTeam: payload.focusTeam,
          matchId: payload.matchId,
        });
        socket.emit('chat:response', { ok: true, message: payload.message, reply, agent: payload.agent || '數據分析師' });
        socket.emit('chat:typing', { typing: false, agent: payload.agent || '數據分析師' });
      } catch (err) {
        console.error('chat:message 處理失敗:', err.message);
        socket.emit('chat:response', { ok: false, error: err.message, agent: payload.agent || '數據分析師' });
        socket.emit('chat:typing', { typing: false, agent: payload.agent || '數據分析師' });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ 客戶端斷開:', socket.id);
    });
  });

  // 定時推送即時比分
  setInterval(async () => {
    try {
      const liveScores = await getLiveScores();
      if (liveScores && liveScores.length) {
        io.to('live-scores').emit('live:scores', liveScores);
      }
    } catch (err) {
      console.error('WebSocket 推送失敗:', err.message);
    }
  }, intervalMs);

  console.log(`📡 WebSocket 已就緒，每 ${intervalMs/1000}秒更新即時比分`);
}

module.exports = { initWebsocket };
