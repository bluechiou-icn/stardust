/* 星塵夢汐 · 星塵帳號（真正存在雲端、換手機也拿得回來的帳號）
   ────────────────────────────────────────────────────────────
   為什麼要有這支：舊版的「Email 註冊」只是把 email 寫進 localStorage 再送一份到
   行銷名單，資料完全沒有離開這台裝置——清掉瀏覽器資料就什麼都沒了，也沒辦法登入回來。
   這支才是真的帳號：帳號、密碼與紀錄都存在後端（Upstash Redis），
   換手機、清 cookie、重灌，只要 email + 密碼就能把紀錄全部拉回來。

   🔐 端對端加密（重要）
   後端「看不到」使用者的夢境／心情／日記。前端在上傳前就用密碼推導出來的金鑰
   （PBKDF2-SHA256 200,000 次 → AES-GCM 256）把整包資料加密，後端只收到一團密文。
   送到後端的也不是密碼本身，而是由金鑰再單向推導出的 verifier，
   所以就算後端資料庫外流，也拿不到密碼、更解不開紀錄。
   代價：密碼忘記＝雲端那份永遠解不開（本機那份與匯出檔還在）。前端已明講這件事。

   儲存（Upstash Redis REST，與 board.js／register.js 同一套風格）：
     ACCOUNT_KV_URL   例：https://xxx.upstash.io      （沒設就退回 BOARD_KV_URL）
     ACCOUNT_KV_TOKEN 例：AX...（REST token）          （沒設就退回 BOARD_KV_TOKEN）
   未設定時：GET ?action=status 回 { enabled:false }，前端會顯示「帳號系統尚未啟用」
   並保留本機＋匯出備份，不會壞掉。

   API（全部走 POST，除了 status）：
     GET  ?action=status                                   → { enabled }
     POST { action:"signup",  email, verifier, nickname }   → { token, nickname }
     POST { action:"login",   email, verifier }             → { token, nickname, blob }
     POST { action:"pull",    token }                       → { blob }
     POST { action:"push",    token, blob }                 → { ok, updatedAt }
     POST { action:"logout",  token }                       → { ok }
     POST { action:"passwd",  token, verifier, newVerifier, blob } → { ok }
     POST { action:"destroy", token, verifier }             → { ok }
*/

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const K = {
  user: e => `stardust:acct:u:${e}`,
  sess: t => `stardust:acct:s:${t}`,
  data: e => `stardust:acct:d:${e}`,
  rate: (bucket, id) => `stardust:acct:rl:${bucket}:${id}`,
};
const SESSION_DAYS = 180;
const SESSION_TTL = SESSION_DAYS * 86400;
const MAX_BLOB_CHARS = 700_000;   // 密文 base64 的上限（≈ 500 KB 原始 JSON），留在 Upstash 單次請求限制內
const IP_LIMIT = { max: 30, windowSec: 600 };   // 同一 IP 十分鐘內最多 30 次帳密操作
const USER_LIMIT = { max: 10, windowSec: 900 }; // 同一帳號十五分鐘內最多 10 次密碼錯誤

function kvConf() {
  const url = (process.env.ACCOUNT_KV_URL || process.env.BOARD_KV_URL || "").replace(/\/$/, "");
  const token = process.env.ACCOUNT_KV_TOKEN || process.env.BOARD_KV_TOKEN || "";
  return url && token ? { url, token } : null;
}

async function redis(commands) {
  const conf = kvConf();
  if (!conf) return null;
  const r = await fetch(`${conf.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${conf.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  return r.json();
}
async function kvGet(key) {
  const out = await redis([["GET", key]]);
  return out?.[0]?.result ?? null;
}
async function kvSet(key, val, ttlSec) {
  const cmd = ttlSec ? ["SET", key, val, "EX", String(ttlSec)] : ["SET", key, val];
  await redis([cmd]);
}
async function kvDel(...keys) {
  if (keys.length) await redis([["DEL", ...keys]]);
}

/* 滑動視窗做得太複雜沒必要：計數器 + TTL 就能擋掉暴力嘗試。
   先 SET…NX 建好帶 TTL 的計數器再 INCR，這樣視窗長度固定，不會被後續請求一直往後推。 */
async function hitLimit(bucket, id, { max, windowSec }) {
  if (!id) return false;
  const key = K.rate(bucket, id);
  const out = await redis([
    ["SET", key, "0", "EX", String(windowSec), "NX"],
    ["INCR", key],
  ]);
  const n = Number(out?.[1]?.result || 0);
  return n > max;
}
async function clearLimit(bucket, id) {
  if (id) await kvDel(K.rate(bucket, id));
}

/* verifier 前端已經做過 200k 次 PBKDF2，這裡再加一層 scrypt＋隨機 salt，
   純粹是為了「資料庫外流時也不能直接比對」 */
function hashVerifier(verifier, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(verifier, salt, 32, { N: 16384, r: 8, p: 1 }).toString("hex");
}
function verifierMatches(verifier, user) {
  const got = Buffer.from(hashVerifier(verifier, user.salt), "hex");
  const want = Buffer.from(user.hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}
function newToken() { return randomBytes(32).toString("hex"); }
function normEmail(s) { return String(s || "").trim().toLowerCase(); }
function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 190; }
function verifierOk(v) { return typeof v === "string" && /^[0-9a-f]{64}$/.test(v); }
function blobOk(b) {
  return b && typeof b === "object"
    && typeof b.iv === "string" && b.iv.length <= 64
    && typeof b.ct === "string" && b.ct.length > 0 && b.ct.length <= MAX_BLOB_CHARS;
}
/* 錯誤訊息不區分「查無此帳號」與「密碼錯誤」，避免變成帳號探測工具 */
const BAD_LOGIN = { status: 401, error: "bad-credentials" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const enabled = !!kvConf();
  const action = String((req.method === "GET" ? req.query?.action : null) || bodyOf(req).action || "").toLowerCase();

  if (req.method === "GET") {
    if (action && action !== "status") return res.status(405).json({ error: "method not allowed" });
    return res.status(200).json({ ok: true, enabled });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!enabled) return res.status(503).json({ error: "not-configured" });

  const body = bodyOf(req);
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();

  try {
    switch (action) {
      case "status":  return res.status(200).json({ ok: true, enabled });
      case "signup":  return await doSignup(res, body, ip);
      case "login":   return await doLogin(res, body, ip);
      case "pull":    return await doPull(res, body);
      case "push":    return await doPush(res, body);
      case "logout":  return await doLogout(res, body);
      case "passwd":  return await doPasswd(res, body, ip);
      case "destroy": return await doDestroy(res, body, ip);
      default:        return res.status(400).json({ error: "unknown action" });
    }
  } catch (e) {
    console.warn("[account]", action, e?.message || e);
    return res.status(500).json({ error: "server-error" });
  }
}

async function doSignup(res, body, ip) {
  const email = normEmail(body.email);
  const verifier = body.verifier;
  const nickname = String(body.nickname || "").trim().slice(0, 20);
  if (!emailOk(email)) return res.status(400).json({ error: "invalid-email" });
  if (!verifierOk(verifier)) return res.status(400).json({ error: "invalid-verifier" });
  if (await hitLimit("ip", ip, IP_LIMIT)) return res.status(429).json({ error: "too-many-requests" });

  if (await kvGet(K.user(email))) return res.status(409).json({ error: "email-taken" });

  const salt = randomBytes(16).toString("hex");
  const user = {
    email, nickname, salt,
    hash: hashVerifier(verifier, salt),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await kvSet(K.user(email), JSON.stringify(user));

  const token = newToken();
  await kvSet(K.sess(token), email, SESSION_TTL);
  return res.status(200).json({ ok: true, token, nickname, expiresInDays: SESSION_DAYS });
}

async function doLogin(res, body, ip) {
  const email = normEmail(body.email);
  const verifier = body.verifier;
  if (!emailOk(email) || !verifierOk(verifier)) return res.status(BAD_LOGIN.status).json({ error: BAD_LOGIN.error });
  if (await hitLimit("ip", ip, IP_LIMIT)) return res.status(429).json({ error: "too-many-requests" });
  if (await hitLimit("user", email, USER_LIMIT)) return res.status(429).json({ error: "too-many-attempts" });

  const user = parse(await kvGet(K.user(email)));
  if (!user || !verifierMatches(verifier, user)) {
    return res.status(BAD_LOGIN.status).json({ error: BAD_LOGIN.error });
  }
  await clearLimit("user", email); // 登入成功就把失敗計數歸零

  const token = newToken();
  await kvSet(K.sess(token), email, SESSION_TTL);
  const blob = parse(await kvGet(K.data(email)));
  return res.status(200).json({ ok: true, token, nickname: user.nickname || "", blob, expiresInDays: SESSION_DAYS });
}

async function sessionEmail(token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
  const email = await kvGet(K.sess(token));
  if (!email) return null;
  await redis([["EXPIRE", K.sess(token), String(SESSION_TTL)]]); // 有在用就續期
  return email;
}

async function doPull(res, body) {
  const email = await sessionEmail(body.token);
  if (!email) return res.status(401).json({ error: "session-expired" });
  const blob = parse(await kvGet(K.data(email)));
  return res.status(200).json({ ok: true, blob });
}

async function doPush(res, body) {
  const email = await sessionEmail(body.token);
  if (!email) return res.status(401).json({ error: "session-expired" });
  if (!blobOk(body.blob)) return res.status(413).json({ error: "blob-too-large" });
  const updatedAt = new Date().toISOString();
  await kvSet(K.data(email), JSON.stringify({ v: 1, iv: body.blob.iv, ct: body.blob.ct, updatedAt }));
  return res.status(200).json({ ok: true, updatedAt });
}

async function doLogout(res, body) {
  if (typeof body.token === "string" && /^[0-9a-f]{64}$/.test(body.token)) await kvDel(K.sess(body.token));
  return res.status(200).json({ ok: true });
}

/* 改密碼：金鑰跟著密碼走，所以整包資料必須由前端用新金鑰重新加密後一起送上來 */
async function doPasswd(res, body, ip) {
  const email = await sessionEmail(body.token);
  if (!email) return res.status(401).json({ error: "session-expired" });
  if (await hitLimit("ip", ip, IP_LIMIT)) return res.status(429).json({ error: "too-many-requests" });
  if (!verifierOk(body.verifier) || !verifierOk(body.newVerifier)) return res.status(400).json({ error: "invalid-verifier" });
  if (!blobOk(body.blob)) return res.status(413).json({ error: "blob-too-large" });

  const user = parse(await kvGet(K.user(email)));
  if (!user || !verifierMatches(body.verifier, user)) return res.status(401).json({ error: "bad-credentials" });

  const salt = randomBytes(16).toString("hex");
  user.salt = salt;
  user.hash = hashVerifier(body.newVerifier, salt);
  user.updatedAt = new Date().toISOString();
  await kvSet(K.user(email), JSON.stringify(user));
  await kvSet(K.data(email), JSON.stringify({ v: 1, iv: body.blob.iv, ct: body.blob.ct, updatedAt: user.updatedAt }));
  // 舊 session 留著也沒關係（金鑰在前端記憶體），但換密碼時一起換掉比較乾淨
  await kvDel(K.sess(body.token));
  const token = newToken();
  await kvSet(K.sess(token), email, SESSION_TTL);
  return res.status(200).json({ ok: true, token });
}

async function doDestroy(res, body, ip) {
  const email = await sessionEmail(body.token);
  if (!email) return res.status(401).json({ error: "session-expired" });
  if (await hitLimit("ip", ip, IP_LIMIT)) return res.status(429).json({ error: "too-many-requests" });
  const user = parse(await kvGet(K.user(email)));
  if (!user || !verifierMatches(body.verifier, user)) return res.status(401).json({ error: "bad-credentials" });
  await kvDel(K.user(email), K.data(email), K.sess(body.token));
  return res.status(200).json({ ok: true });
}

function bodyOf(req) {
  if (typeof req.body === "string") return parse(req.body) || {};
  return req.body || {};
}
function parse(s) { try { return typeof s === "string" ? JSON.parse(s) : (s || null); } catch { return null; } }
