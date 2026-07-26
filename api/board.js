/* 星塵夢汐 · 辣妹留言板
   ────────────────────────────────────────
   GET  /api/board        → 取回最近的留言（只回傳暱稱、內容、時間）
   POST /api/board        → 新增一則留言（後台另外記錄 IP／UA 供法律追溯）

   儲存方式：Upstash Redis REST（與 register.js／feedback.js 同一套環境變數風格）
     BOARD_KV_URL   例：https://xxx.upstash.io
     BOARD_KV_TOKEN 例：AX...（REST token）
   未設定時：GET 回傳空清單並帶 enabled:false，POST 只 console.log，
   前端會顯示「留言板尚未啟用」而不會壞掉。

   ⚠️ IP 與 UA 只寫進後台紀錄，永遠不會出現在 GET 的回應裡。 */

const LIST_KEY = "stardust:board";
const MAX_KEEP = 500;   // 後台最多保留幾則
const MAX_RETURN = 50;  // 一次回傳給前端幾則
const RATE_SECONDS = 20; // 同一 IP 幾秒內只能留一則

function kvConf() {
  const url = (process.env.BOARD_KV_URL || "").replace(/\/$/, "");
  const token = process.env.BOARD_KV_TOKEN || "";
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const out = await redis([["LRANGE", LIST_KEY, 0, MAX_RETURN - 1]]);
      if (!out) return res.status(200).json({ ok: true, enabled: false, messages: [] });
      const raw = out[0]?.result || [];
      // 只挑公開欄位出來，IP／UA 絕不外流
      const messages = raw.map(safeParse).filter(Boolean).map(m => ({
        id: m.id || "",
        nickname: m.nickname || "訪客",
        content: m.content || "",
        at: m.at || "",
      }));
      return res.status(200).json({ ok: true, enabled: true, messages });
    } catch (e) {
      console.warn("board read failed", e);
      return res.status(200).json({ ok: true, enabled: false, messages: [] });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const nickname = String(body.nickname || "").trim().slice(0, 20);
  const content = String(body.content || "").trim().slice(0, 300);
  if (!content) return res.status(400).json({ error: "content required" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const record = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    nickname: nickname || "訪客",
    content,
    at: new Date().toISOString(),
    // 以下僅存後台，供惡意毀謗留言的法律追溯使用
    ip,
    ua: (req.headers["user-agent"] || "").slice(0, 200),
  };

  const conf = kvConf();
  if (!conf) {
    console.log("[board]", JSON.stringify(record));
    return res.status(200).json({ ok: true, enabled: false, message: publicOf(record) });
  }

  try {
    // 簡易頻率限制：同一 IP 每 RATE_SECONDS 秒只能留一則
    if (ip) {
      const key = `stardust:board:rl:${ip}`;
      const rl = await redis([["SET", key, "1", "NX", "EX", String(RATE_SECONDS)]]);
      if (rl && rl[0]?.result === null) {
        return res.status(429).json({ error: "too many requests" });
      }
    }
    await redis([
      ["LPUSH", LIST_KEY, JSON.stringify(record)],
      ["LTRIM", LIST_KEY, 0, MAX_KEEP - 1],
    ]);
    return res.status(200).json({ ok: true, enabled: true, message: publicOf(record) });
  } catch (e) {
    console.warn("board write failed", e);
    console.log("[board]", JSON.stringify(record));
    return res.status(200).json({ ok: true, enabled: false, message: publicOf(record) });
  }
}

function publicOf(m) { return { id: m.id, nickname: m.nickname, content: m.content, at: m.at }; }
function safeParse(s) { try { return typeof s === "string" ? JSON.parse(s) : s; } catch { return null; } }
