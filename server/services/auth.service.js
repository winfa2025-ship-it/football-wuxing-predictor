/**
 * 用戶認證服務
 *
 * 電郵 + 密碼 註冊/登入，首此註冊需驗證邀請碼。
 * 用戶資料儲存於 MongoDB。
 *
 * - bcryptjs   : 密碼雜湊
 * - jsonwebtoken: JWT token 簽發/驗證
 * - mongodb    : 資料庫驅動
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

let client = null;
let db = null;

function getDb() {
  return db;
}

async function connectDB() {
  try {
    client = new MongoClient(config.database.uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    const name = config.database.uri.split('/').pop();
    db = client.db(name || 'football-wuxing-predictor');
    await db.command({ ping: 1 });
    console.log('🍃 MongoDB 已連接');
    return db;
  } catch (err) {
    console.error('❌ MongoDB 連接失敗:', err.message);
    throw err;
  }
}

function users() {
  return db.collection('users');
}

/** 密碼強度檢查 (至少8碼，含字母與數字) */
function validatePassword(pw) {
  if (!pw || pw.length < 8) return '密碼長度至少 8 個字元';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return '密碼需同時包含英文字母與數字';
  return null;
}

function validateEmail(email) {
  const e = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return '電郵格式不正確';
  return null;
}

/**
 * 註冊新用戶
 * @returns {Promise<{ok:boolean, message:string, token?:string, user?:object}>}
 */
async function register({ email, password, inviteCode }) {
  if (!db) await connectDB();

  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, message: emailErr };
  const pwErr = validatePassword(password);
  if (pwErr) return { ok: false, message: pwErr };
  // 邀請碼驗證 (首次註冊解鎖)
  if (String(inviteCode || '').trim() !== String(config.auth.inviteCode)) {
    return { ok: false, message: '邀請碼無效，無法註冊' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const exist = await users().findOne({ email: cleanEmail });
  if (exist) return { ok: false, message: '此電郵已註冊過' };

  const hash = await bcrypt.hash(password, 10);
  const result = await users().insertOne({
    email: cleanEmail,
    password: hash,
    role: 'vip',
    createdAt: new Date(),
  });

  const user = { id: result.insertedId, email: cleanEmail, role: 'vip' };
  const token = jwt.sign({ id: result.insertedId, email: cleanEmail }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpires });
  return { ok: true, message: '註冊成功', token, user };
}

/**
 * 登入
 * @returns {Promise<{ok:boolean, message:string, token?:string, user?:object}>}
 */
async function login({ email, password }) {
  if (!db) await connectDB();

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) return { ok: false, message: '請輸入電郵與密碼' };

  const user = await users().findOne({ email: cleanEmail });
  if (!user) return { ok: false, message: '電郵或密碼錯誤' };

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { ok: false, message: '電郵或密碼錯誤' };

  const token = jwt.sign({ id: user._id, email: user.email }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpires });
  return { ok: true, message: '登入成功', token, user: { id: user._id, email: user.email, role: user.role || 'vip' } };
}

/**
 * Express 中間件：驗證 JWT
 */
function authenticate(req, res, next) {
  // 若未啟用登入保護，直接放行 (開發用)
  if (!config.auth.enabled) return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: '未登入' });

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '登入已過期，請重新登入' });
  }
}

/** 驗證 token 是否有效 (供 WebSocket / 前端預檢查) */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch {
    return null;
  }
}

module.exports = { connectDB, register, login, authenticate, verifyToken, getDb, validateEmail, validatePassword };
