/* 星塵夢汐 · 宇宙新聞（每週自動更新）
   ────────────────────────────────────────
   為什麼要有這支：app.js 裡的 NEWS 陣列是手寫的，內容會越放越舊，
   每次要更新都得改 code 再部署。這支改成從 NASA 的公開 RSS 直接抓，
   前端每次打開「宇宙」分頁都會拿到當週最新的幾則。

   GET /api/space-news → { ok, items:[...], fetchedAt, translated }

   更新頻率：靠 CDN 快取控制，s-maxage=604800（7 天）。
   也就是說整個站一週只會真的去 NASA 抓一次，其餘都由 Vercel 邊緣節點回應；
   stale-while-revalidate 讓第 8 天的第一個訪客不用等待，先拿舊的、背景換新。

   來源（依序嘗試，第一個成功的就用）：NASA 官方 RSS，美國政府資訊屬公共領域。

   中文翻譯：若有設定 ANTHROPIC_API_KEY，會順手把標題與摘要翻成台灣繁中
   （一週只翻一次，成本可以忽略）。沒設定就只回英文，前端照樣能顯示，
   語言切換鈕會自動退回英文原文。 */

const FEEDS = [
  "https://science.nasa.gov/feed/",
  "https://www.nasa.gov/feed/",
  "https://www.nasa.gov/rss/dyn/breaking_news.rss",
];
const MAX_ITEMS = 6;
const WEEK = 604800;
const ICONS = ["☄️", "🛰️", "🚀", "🔭", "🌌", "🪐"];

/* ---------- 極簡 RSS／Atom 解析（不引外部套件） ---------- */
const stripTags = s => String(s || "").replace(/<[^>]*>/g, " ");
const unCdata = s => String(s || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
function decodeEntities(s) {
  return String(s || "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, "&");   // amp 必須最後解，否則 &amp;lt; 會被解兩次
}
const clean = s => decodeEntities(stripTags(unCdata(s))).replace(/\s+/g, " ").trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

function parseFeed(xml) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const out = [];
  // NASA 的 feed 本身就會出現重複條目（同一則稿子登兩次），
  // 不去重的話畫面上會連著看到兩則一模一樣的新聞
  const seen = new Set();
  for (const b of blocks) {
    const title = clean(tag(b, "title"));
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // RSS 用 <link>文字</link>；Atom 用 <link href="…"/>
    let url = clean(tag(b, "link"));
    if (!url) url = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    const body = clean(tag(b, "description") || tag(b, "summary") || tag(b, "content"));
    const dateRaw = clean(tag(b, "pubDate") || tag(b, "updated") || tag(b, "published"));
    const d = dateRaw ? new Date(dateRaw) : null;
    out.push({
      // 帶上序號：前端用 id 找回文章，兩則的網址尾段萬一相同就會抓錯篇
      id: `nasa-${out.length}-` + (url.split("/").filter(Boolean).pop() || "").slice(0, 50),
      date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : "",
      icon: ICONS[out.length % ICONS.length],
      enTitle: title,
      enBody: body ? [body.slice(0, 900)] : ["（本則僅有標題，點下方連結可看 NASA 全文。）"],
      source: "NASA",
      url,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

async function fetchFirstFeed() {
  for (const url of FEEDS) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "StardustDreamTide/1.0 (+https://stardust.bluechiou.com)", Accept: "application/rss+xml, application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const items = parseFeed(await r.text());
      if (items.length) return { items, feed: url };
    } catch { /* 換下一個來源 */ }
  }
  return null;
}

/* ---------- 中譯（選用；沒有金鑰就跳過） ---------- */
async function translate(items) {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const payload = items.map((n, i) => ({ i, title: n.enTitle, body: n.enBody.join("\n") }));
    const resp = await client.messages.create({
      model: process.env.STARDUST_AI_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: `你是天文新聞的台灣繁體中文譯者。把使用者給的 JSON 陣列翻成台灣繁體中文。
規則：專有名詞（任務名、望遠鏡、天體）採台灣天文界慣用譯名並在首次出現時附原文；語氣平實好讀；不要加入原文沒有的內容。
只輸出 JSON 陣列，每個元素為 {"i":數字,"zhTitle":"…","zhBody":"…"}，不要有其他文字或程式碼框。`,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const text = resp.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    const arr = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim());
    for (const t of arr) {
      const n = items[t.i];
      if (!n) continue;
      if (t.zhTitle) n.zhTitle = String(t.zhTitle);
      if (t.zhBody) n.zhBody = String(t.zhBody).split(/\n+/).filter(Boolean);
    }
    return true;
  } catch {
    return false;   // 翻譯失敗不影響英文原文照常回傳
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const got = await fetchFirstFeed();
  if (!got) {
    // 抓不到就明講，前端會退回 App 內建的那幾則，不會開天窗
    res.setHeader("Cache-Control", "public, s-maxage=600");
    return res.status(200).json({ ok: false, items: [], error: "feed_unavailable" });
  }

  const translated = await translate(got.items);
  // 一週一抓：CDN 擋在前面，NASA 那邊一週只會收到一次請求
  res.setHeader("Cache-Control", `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}`);
  return res.status(200).json({
    ok: true,
    items: got.items,
    feed: got.feed,
    translated,
    fetchedAt: new Date().toISOString(),
  });
}
