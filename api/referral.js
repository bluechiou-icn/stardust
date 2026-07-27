/* 星塵夢汐 · 邀請碼歸戶
   ────────────────────────────────────────
   問題：舊版的邀請完全在前端。受邀者開啟魔法書時自己發一片碎片給自己，
   但「邀請人」那一片永遠發不出去——兩台裝置的 localStorage 互相看不見。
   這支就是那個缺掉的中間人：把「誰邀了誰」記在後端，
   邀請人下次打開 App 就能把累積的碎片領回去。

   POST /api/referral
     { action:"claim",   code, self }  受邀者回報：我是被 code 邀來的
                                        → { ok, credited }
     { action:"collect", code }        邀請人領取：我的碼被幾個人用了
                                        → { ok, count }
     GET  ?action=status               → { enabled }

   儲存（Upstash Redis REST，與 board.js／account.js 同一套環境變數）：
     REFERRAL_KV_URL / REFERRAL_KV_TOKEN  （沒設就退回 BOARD_KV_URL / BOARD_KV_TOKEN）
   未設定時：status 回 enabled:false，前端顯示「邀請回饋尚未啟用」，
   受邀者那一片碎片照樣在本機發得出來，功能不會壞。

   防刷：
   - 一個 self 碼只能被記為「受邀」一次（SET NX），重開連結不會重複計數
   - 不能自己邀自己
   - 同一 IP 每 10 分鐘最多 20 次請求
   - 邀請人領取用 GETDEL：領過就歸零，不會重複領 */

const K = {
  pending: c => `stardust:ref:pending:${c}`,   // 邀請人待領的碎片數
  claimed: c => `stardust:ref:claimed:${c}`,   // 這個受邀碼是否已回報過
  rate: ip => `stardust:ref:rl:${ip}`,
};
const CODE_RE = /^[A-Z0-9]{4,16}$/;
const RATE = { max: 20, windowSec: 600 };
const KEEP_DAYS = 365;

function kvConf() {
  const url = (process.env.REFERRAL_KV_URL || process.env.BOARD_KV_URL || "").replace(/\/$/, "");
  const token = process.env.REFERRAL_KV_TOKEN || process.env.BOARD_KV_TOKEN || "";
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

const clientIp = req =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress || "unknown";

async function rateLimited(ip) {
  const out = await redis([["INCR", K.rate(ip)], ["EXPIRE", K.rate(ip), RATE.windowSec, "NX"]]);
  return (out?.[0]?.result || 0) > RATE.max;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, enabled: !!kvConf() });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!kvConf()) return res.status(200).json({ ok: false, enabled: false, error: "not_configured" });

  const { action, code, self } = req.body || {};
  const up = s => String(s || "").toUpperCase();

  try {
    if (await rateLimited(clientIp(req))) {
      return res.status(429).json({ ok: false, error: "too_many_requests" });
    }

    if (action === "claim") {
      const c = up(code), s = up(self);
      if (!CODE_RE.test(c) || !CODE_RE.test(s)) return res.status(400).json({ ok: false, error: "bad_code" });
      if (c === s) return res.status(200).json({ ok: false, error: "self_referral" });
      // SET NX：這個受邀碼第一次回報才算數，重開連結不會重複灌水
      const out = await redis([["SET", K.claimed(s), c, "NX", "EX", KEEP_DAYS * 86400]]);
      if (out?.[0]?.result !== "OK") return res.status(200).json({ ok: true, credited: false });
      await redis([["INCR", K.pending(c)], ["EXPIRE", K.pending(c), KEEP_DAYS * 86400]]);
      return res.status(200).json({ ok: true, credited: true });
    }

    if (action === "collect") {
      const c = up(code);
      if (!CODE_RE.test(c)) return res.status(400).json({ ok: false, error: "bad_code" });
      const out = await redis([["GETDEL", K.pending(c)]]);
      const n = parseInt(out?.[0]?.result, 10);
      return res.status(200).json({ ok: true, count: Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 0 });
    }

    return res.status(400).json({ ok: false, error: "bad_action" });
  } catch {
    return res.status(200).json({ ok: false, error: "kv_error" });
  }
}
