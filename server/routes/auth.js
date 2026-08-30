const router = require('express').Router();
const { register, login, verifyToken, authenticate } = require('../services/auth.service');
const config = require('../../config');

// 註冊 (需邀請碼 VIP888)
router.post('/register', async (req, res) => {
  try {
    const { email, password, inviteCode } = req.body || {};
    const result = await register({ email, password, inviteCode });
    if (!result.ok) return res.status(400).json({ success: false, error: result.message });
    res.json({ success: true, data: { token: result.token, user: result.user } });
  } catch (err) {
    res.status(500).json({ success: false, error: '註冊失敗: ' + err.message });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await login({ email, password });
    if (!result.ok) return res.status(401).json({ success: false, error: result.message });
    res.json({ success: true, data: { token: result.token, user: result.user } });
  } catch (err) {
    res.status(500).json({ success: false, error: '登入失敗: ' + err.message });
  }
});

// 驗證 token (前端啟動時檢查是否已登入)
router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.json({ success: false, data: null });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, data: null, error: 'token 無效' });
  res.json({ success: true, data: { id: decoded.id, email: decoded.email } });
});

// 取得登入是否啟用 (前端決定是否顯示登入)
router.get('/status', (req, res) => {
  res.json({ success: true, data: { enabled: config.auth.enabled, requiresInvite: true } });
});

// 受保護測試端點
router.get('/protected', authenticate, (req, res) => {
  res.json({ success: true, data: { message: '已登入', user: req.user } });
});

module.exports = router;
