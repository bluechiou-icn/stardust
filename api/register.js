/* 星塵夢汐 · 使用者註冊 / email 收集
   ────────────────────────────────────────
   前端於 Google／Apple／Email 註冊後呼叫此 endpoint，把 email 送到後端名單。
   個人紀錄（夢境、日記、CBT⋯）仍存在user本機 + user自己的雲端，
   後台只保留 email + provider + 選擇性暱稱 + 建議內容，用於功能更新與優惠碼通知。

   儲存方式（可選一種）：
   1. Vercel KV／Upstash Redis：設 REGISTER_KV_URL 與 REGISTER_KV_TOKEN
   2. Webhook：設 REGISTER_WEBHOOK_URL（例：Google Apps Script / Airtable / Notion）
   3. 都沒設 → 只 console.log，不落地（開發測試模式）。 */

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const email = (body.email || "").trim().toLowerCase();
  const provider = (body.provider || "email").toLowerCase();
  const nickname = (body.nickname || "").trim().slice(0, 60);
  const kind = (body.kind || "signup").toLowerCase();

  // 建議類別不強制 email
  if (kind === "signup" && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "invalid email" });
  }

  const record = {
    email, provider, nickname, kind,
    name: (body.name || "").slice(0, 120),
    why: (body.why || "").slice(0, 2000),
    at: new Date().toISOString(),
    ua: (req.headers["user-agent"] || "").slice(0, 200),
    ip: (req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
  };

  // Webhook 優先
  const hook = process.env.REGISTER_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!r.ok) console.warn("register webhook non-2xx", r.status);
    } catch (e) { console.warn("register webhook failed", e); }
  } else {
    // 沒接後端就 log 一行，方便 Vercel Function Logs 追蹤
    console.log("[register]", JSON.stringify(record));
  }

  return res.status(200).json({ ok: true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
