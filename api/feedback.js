/* 星塵夢汐 · 用戶功能建議收集
   ────────────────────────────────────────
   前端用戶點擊「分享你的靈感」後，提交建議到此 endpoint。
   建議儲存方式與 register.js 相同：
   1. Vercel KV／Upstash Redis：設 FEEDBACK_KV_URL 與 FEEDBACK_KV_TOKEN
   2. Webhook：設 FEEDBACK_WEBHOOK_URL（例：Google Apps Script / Airtable / Notion）
   3. 都沒設 → 只 console.log，不落地（開發測試模式）。 */

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const content = (body.content || "").trim().slice(0, 2000);
  const email = (body.email || "").trim().toLowerCase();

  if (!content) {
    return res.status(400).json({ error: "content required" });
  }

  const record = {
    id: body.id || "",
    content,
    email,
    date: body.date || new Date().toISOString().split("T")[0],
    time: body.time || "",
    ua: (req.headers["user-agent"] || "").slice(0, 200),
    ip: (req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
    submittedAt: new Date().toISOString(),
  };

  // Webhook 優先
  const hook = process.env.FEEDBACK_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!r.ok) console.warn("feedback webhook non-2xx", r.status);
    } catch (e) { console.warn("feedback webhook failed", e); }
  } else {
    // 沒接後端就 log 一行，方便 Vercel Function Logs 追蹤
    console.log("[feedback]", JSON.stringify(record));
  }

  return res.status(200).json({ ok: true });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
