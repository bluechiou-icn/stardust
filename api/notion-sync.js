/* 星塵夢汐 → Notion 同步 proxy。
   Notion API 不允許瀏覽器直連（CORS），由這支 serverless function 代轉。
   token 只存在 Vercel 環境變數 NOTION_TOKEN，永不下發到前端。 */

const DB = {
  dreams: "5b76c7ec33884947a4bb3383f022e09c",
  diary: "2afc7bf9f5ed4f979a6d0dbef7ef6e4c",
  cbt: "7bc275d7547d4c0cb26b6b9ebeb6136f",
  focus: "4076037768974d3c8a68bff4f22c6d4b",
};

const rt = s => [{ text: { content: String(s ?? "").slice(0, 1900) } }];
const ms = arr => (arr || []).map(name => ({ name: String(name).slice(0, 90) }));
const sel = v => (v ? { name: String(v).slice(0, 90) } : undefined);
const num = v => (v == null || v === "" || !isFinite(+v) ? undefined : +v);

const MAPPERS = {
  dreams: d => ({
    "標題": { title: rt(d.text ? d.text.slice(0, 60) : d.date) },
    "日期": { date: { start: d.date } },
    "轉寫全文": { rich_text: rt(d.text) },
    "夢中情緒": { multi_select: ms(d.emotionsInDream) },
    "醒來情緒": d.wakeEmotion ? { select: sel(d.wakeEmotion) } : undefined,
    "清醒度": { number: num(d.lucidity) },
    "符號": { multi_select: ms(d.symbols) },
    "原型": { multi_select: ms(d.archetypes) },
    "重複夢": { checkbox: !!d.recurring },
    "共時性筆記": d.sync ? { rich_text: rt(d.sync) } : undefined,
  }),
  diary: d => ({
    "標題": { title: rt(d.text ? d.text.slice(0, 60) : `${d.date} 簽到`) },
    "日期": { date: { start: d.date } },
    "心情": { number: num(d.mood) },
    "情緒詞": { multi_select: ms(d.emotions) },
    "咖啡因": { checkbox: (d.habits || []).includes("咖啡因") },
    "酒精": { checkbox: (d.habits || []).includes("酒精") },
    "運動": { checkbox: (d.habits || []).includes("運動") },
    "冥想": { checkbox: (d.habits || []).includes("冥想") },
    "按時吃藥": { checkbox: (d.habits || []).includes("按時吃藥") },
    "明日三件事": d.three ? { rich_text: rt(d.three) } : undefined,
    "孵夢提示": d.incubation ? { rich_text: rt(d.incubation) } : undefined,
  }),
  cbt: r => ({
    "情境": { title: rt(r.situation || r.dump || r.date) },
    "日期時間": { date: { start: r.date } },
    "② 初始情緒": { multi_select: ms(r.emotions) },
    "初始強度": r.emoIntensity ? { rich_text: rt(r.emoIntensity) } : undefined,
    "③ 自動化思考": r.thoughts ? { rich_text: rt(r.thoughts) } : undefined,
    "④ 相信程度": { number: num(r.belief) },
    "⑤ 支持證據": r.evFor ? { rich_text: rt(r.evFor) } : undefined,
    "⑥ 反對證據": r.evAgainst ? { rich_text: rt(r.evAgainst) } : undefined,
    "⑦ 替代思考": r.alt ? { rich_text: rt(r.alt) } : undefined,
    "重評情緒強度": r.rerateEmotions ? { rich_text: rt(r.rerateEmotions) } : undefined,
    "重評相信程度": { number: num(r.rerateBelief) },
    "認知扭曲": { multi_select: ms(r.distortions) },
    "狀態": { select: sel(r.status === "done" ? "已完成" : "未完成") },
  }),
  focus: f => ({
    "意圖": { title: rt(f.intent || "專注") },
    "日期": { date: { start: f.date } },
    "時段": f.slot ? { select: sel(f.slot) } : undefined,
    "回合長度分": { number: num(f.mins) },
    "完成回合數": { number: num(f.rounds) },
    "專注度": { number: num(f.rating) },
    "回合後情緒": f.emotion ? { select: sel(f.emotion) } : undefined,
    "分心筆記": f.distractions?.length ? { rich_text: rt(f.distractions.join("、")) } : undefined,
  }),
};

const prune = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Surrogate-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(501).json({ error: "尚未設定 NOTION_TOKEN，請看 App 內的設定說明" });

  const body = req.body || {};
  const synced = {}, failures = [];
  for (const kind of Object.keys(DB)) {
    synced[kind] = [];
    for (const item of (body[kind] || []).slice(0, 20)) {
      try {
        const r = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
          body: JSON.stringify({ parent: { database_id: DB[kind] }, properties: prune(MAPPERS[kind](item)) }),
        });
        if (r.ok) synced[kind].push(item.id);
        else failures.push(`${kind}:${(await r.json()).message || r.status}`);
      } catch (e) { failures.push(`${kind}:${e.message}`); }
    }
  }
  return res.status(200).json({ synced, failed: failures.length, detail: failures.slice(0, 3) });
}
