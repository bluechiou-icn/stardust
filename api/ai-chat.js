/* 星塵夢汐 AI 陪伴／解夢參考 proxy。
   Anthropic API 金鑰只存在 Vercel 環境變數 ANTHROPIC_API_KEY，永不下發到前端。
   模型可用環境變數 STARDUST_AI_MODEL 覆蓋（預設 claude-opus-4-8；
   想省成本可改設 claude-haiku-4-5）。 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.STARDUST_AI_MODEL || "claude-opus-4-8";

const SYSTEM = {
  chat: `你是「夢汐」，星塵夢汐 App 裡溫暖的 AI 陪伴者。使用者用這個 App 記錄夢境、日記與情緒。
- 一律使用台灣繁體中文，語氣溫柔、真誠、不說教。
- 以傾聽與反映情緒為主，適時用溫和的開放式問題（蘇格拉底式）幫助使用者自我覺察。
- 回應精簡（通常 3 句以內），除非使用者想深聊。
- 你不是醫療或心理專業人員：不診斷、不開處方、不做治療承諾。若使用者表達自傷、傷人或急迫危機，溫柔地建議尋求專業協助（台灣可撥打安心專線 1925、生命線 1995），並繼續陪伴。
- 可以自然地使用星空、月相、潮汐等 App 的意象，但不要過度堆砌。`,
  dream: `你是「夢汐」，星塵夢汐 App 的解夢參考助手，以榮格取向觀點提供「參考視角」而非標準答案。使用者會給你一段夢境紀錄（可能附上情緒、符號、原型標籤）。
- 一律使用台灣繁體中文。
- 結構：先用一兩句話溫柔地回應夢的整體氛圍；再提出 2–3 個可能的象徵視角（符號的普遍意涵、可能的原型、與補償功能的關聯）；最後提出 1–2 個開放式問題，幫助做夢者自己聯想。
- 強調：夢的意義最終由做夢者自己的聯想決定，你提供的只是參考。
- 不做吉凶預言、不做醫療或心理診斷。全文控制在 250 字以內。`,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "not_configured" });

  const { mode = "chat", messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "bad_request" });

  // 只保留合法欄位並限制長度／則數，避免濫用
  const safe = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (safe.length && safe[0].role !== "user") safe.shift(); // 第一則必須是 user
  if (!safe.length) return res.status(400).json({ error: "bad_request" });

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" }, // 聊天陪伴取低延遲；夢汐的溫柔不需要長考
      system: SYSTEM[mode] || SYSTEM.chat,
      messages: safe,
    });
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ text: "這個話題我沒辦法回應，我們換個方式聊聊好嗎？🩵" });
    }
    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    return res.status(200).json({ text });
  } catch (e) {
    const status = e?.status >= 400 && e?.status < 600 ? 502 : 500;
    return res.status(status).json({ error: "upstream_error", message: String(e?.message || e).slice(0, 300) });
  }
}
