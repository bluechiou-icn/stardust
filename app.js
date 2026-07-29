/* 星塵夢汐 Stardust DreamTide v1.0 — 個人內在紀錄工具，非專業醫療用途。
   全部資料存於裝置本機＆你的帳號（localStorage + IndexedDB），無後端、無隱私外漏問題。 */
"use strict";

/* 版本號：每次要讓使用者看到新東西時，這裡和 sw.js 的 CACHE 一起往上加。
   設定分頁會顯示這個號碼，回報問題時報這個數字最快能判斷對方在哪一版。 */
const APP_VERSION = "2026.07.30";

/* ---------- 小工具 ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, "0");
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tstr = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayStr = () => dstr(new Date());
const fromDstr = s => { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); };
const daysBetween = (a, b) => Math.round((fromDstr(b) - fromDstr(a)) / 86400000);
const fmtMD = s => { const d = fromDstr(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];          // 以 getDay() 直接索引（0=週日）
/* 月曆以週一為一週起始：表頭順序，以及每月 1 號前要空幾格 */
const WEEKDAYS_CAL = ["一", "二", "三", "四", "五", "六", "日"];
const calOffset = d => (d.getDay() + 6) % 7;   // 週一=0 … 週日=6
const fmtH = min => `${(min / 60).toFixed(1)} 小時`;
/* 睡眠紀錄以「醒來那天」為 date（昨晚的睡眠 = 今天的紀錄） */
const sleepForDate = ds => store.data.sleep.find(s => s.date === ds);
function sleepBadge(ds) {
  const s = sleepForDate(ds);
  if (!s) return "";
  const parts = [`⌚ 睡眠 ${fmtH(s.asleepMin)}`];
  if (s.remMin) parts.push(`REM ${fmtH(s.remMin)}`);
  if (s.deepMin) parts.push(`深睡 ${fmtH(s.deepMin)}`);
  if (s.wakes != null) parts.push(`醒來 ${s.wakes} 次`);
  return parts.join("・");
}

/* ============================================================
   喜怒哀樂・預設情緒（想改文字，直接在 GitHub 編輯這裡即可）
   每個分類的陣列就是下拉選單展開後的選項，可自由增刪、不限四個。
   ============================================================ */
const EMOTION_CATEGORIES = {
  "喜": ["開心", "興奮", "期待", "感恩"],
  "怒": ["憤怒", "煩躁", "委屈", "不滿"],
  "哀": ["悲傷", "失落", "無力", "孤單"],
  "樂": ["平靜", "滿足", "放鬆", "幸福"],
};

/* ============================================================
   每日顯化語錄（依日期輪替，一天一句；想改文字直接在 GitHub 編輯）
   ============================================================ */
const AFFIRMATIONS = [
  "我值得所有正在朝我而來的美好。",
  "允許自己慢慢來，每一小步都算數。",
  "宇宙正以我看不見的方式支持著我。",
  "放下無法控制的，專注於我能創造的。",
  "今天的我，比昨天更靠近想成為的自己。",
  "過去所有的選擇，都引領我至最好的當下。",
  "我吸引所有美好與幸運，而非追求。",
  "改變不了的過去，我不會浪費時間去後悔。",
  "每個微小的起心動念，都是內在要提醒我的訊號。",
  "我的感受是真實的，也值得被宇宙聽見。",
  "豐盛正在流向我，我已敞開心胸去接收。",
  "我原諒自己的不完美，沒有人能能替我定義完美。",
  "困難是暫時的，而我的韌性是長久的。",
  "我相信直覺，它是內在智慧的聲音。",
  "此刻的平靜與豐盛，由我自己創造給自己。",
  "我所散發的光與能量，會吸引同頻的人事物。",
  "我已擁有面對今天所需要的一切。",
  "所有的外在環境紛擾，都不會動搖我的決心。",
  "正視自己的陰影，也不需要立刻解決它。",
  "I do it antway，沒有什麼能擋住我的決心。",
  "Now or never，我的意念將即刻成為行動。",
  "磨難看似很長，但人生其實更短，我能突破一切障礙。",
  "感謝過去的我，撐起了現在的我。",
];

/* 📮 寫信給 Blue（設定頁「命理顧問服務」那張卡）
   mailto: 會打開使用者手機／電腦上的預設信件 App，並先填好收件者與主旨。
   想改收件信箱或主旨，直接改下面三個字串即可。 */
const BLUE_EMAIL = "blue@bluechiou.com";
const BLUE_MAIL_SUBJECT = "今天海是什麼顏色";
const BLUE_MAIL_BODY = "今天我看到的海是⋯\n\n";
const MAIL_TO_BLUE =
  `mailto:${BLUE_EMAIL}?subject=${encodeURIComponent(BLUE_MAIL_SUBJECT)}&body=${encodeURIComponent(BLUE_MAIL_BODY)}`;

/* 連續紀錄徽章（[天數, 名稱]；想修改可直接編輯） */
const STREAK_BADGES = [
  [3, "🌱 意念"], [7, "✨ 星芒"], [14, "🌙 星軌"], [30, "🌌 星座"], [60, "🌠 星河"], [100, "💫 星系"],
];

/* 🐚 神奇海螺碎片：以自然元素（木火土金水）分類，另有三階星際版；同色 5 顆合成一顆完整海螺
   權重總和 106，實際掉落率：五元素各 18.9%、量子糾纏 2.8%、綜觀效應 1.9%、克爾黑旋 0.9%。
   克爾黑旋（克爾史瓦西黑洞）是全系列最罕見的一種。 */
const SHELL_COLORS = [
  { key: "wood",  name: "聖木叢林", emoji: "🌲", weight: 20 },
  { key: "fire",  name: "緋紅火焰", emoji: "🔥", weight: 20 },
  { key: "earth", name: "蓋婭大地", emoji: "🌏", weight: 20 },
  { key: "metal", name: "金委員長", emoji: "🪙", weight: 20 },
  { key: "water", name: "湛藍海潮", emoji: "🌊", weight: 20 },
  { key: "cosmic",   name: "量子糾纏", emoji: "🪐",  weight: 3, rare: true, rarity: "星際罕見" },
  { key: "overview", name: "綜觀效應", emoji: "🚀",  weight: 2, rare: true, rarity: "深空稀有" },
  { key: "kerr",     name: "克爾黑旋", emoji: "⚫️", weight: 1, rare: true, rarity: "事件視界・最罕見" },
];
const SHELL_BY_KEY = Object.fromEntries(SHELL_COLORS.map(c => [c.key, c]));
const SHELL_FRAGMENTS_PER_SHELL = 5;
/* 機率設定（內部用，不寫進公開文案）：
   切換分頁時 3.3% 出現流星雨；流星雨出現後，再以 8% 掉落一片碎片（整體約 0.26%）。
   召喚儀式有 10% 摃龜（神奇海螺偏忙碌）。 */
const METEOR_SHOWER_CHANCE = 0.033;
const METEOR_FRAGMENT_CHANCE = 0.08;
const SUMMON_MISS_CHANCE = 0.10;
const SUMMON_PER_STREAK_DAYS = 3;   // 連續紀錄幾天轉化一次召喚機會
const SUMMON_PER_TODOS = 3;         // 完成幾件待辦轉化一次召喚機會

function shellState() {
  const st = store.data.settings;
  if (!st.shells) st.shells = {};
  const s = st.shells;
  s.frag ||= {}; s.complete ||= 0; s.lastStreak ||= 0; s.charges ||= 0; s.lastTodoDone ||= 0; s.summons ||= 0;
  return s;
}
/* 依權重抽一種元素（三種星際版極罕見） */
function randomShellKey() {
  const total = SHELL_COLORS.reduce((n, c) => n + c.weight, 0);
  let r = Math.random() * total;
  for (const c of SHELL_COLORS) { r -= c.weight; if (r <= 0) return c.key; }
  return SHELL_COLORS[0].key;
}
function awardShellFragment(colorKey) {
  const s = shellState();
  const c = colorKey || randomShellKey();
  s.frag[c] = (s.frag[c] || 0) + 1;
  let merged = false;
  if (s.frag[c] >= SHELL_FRAGMENTS_PER_SHELL) {
    s.frag[c] -= SHELL_FRAGMENTS_PER_SHELL;
    s.complete = (s.complete || 0) + 1;
    merged = true;
  }
  return { key: c, merged };
}
/* 直接給一顆完整神奇海螺（站內通報的贈禮用，不經過碎片合成） */
function awardCompleteShell() {
  const s = shellState();
  s.complete = (s.complete || 0) + 1;
  s.gifted = (s.gifted || 0) + 1;   // 分開記，之後要看有多少是活動送的
  store.save();
  return s.complete;
}
/* 召喚機會：連續紀錄每滿 3 天 ＋ 待辦每完成 3 件，各換一次；用「前次觀察值」判斷跨越 */
function countDoneTodos() { return (store.data.todos || []).filter(t => t.done).length; }
function checkSummonCharges({ silent = false } = {}) {
  const s = shellState();
  let gained = 0;
  const streak = calcStreak();
  const prevStreak = s.lastStreak || 0;
  if (streak > prevStreak) {
    gained += Math.floor(streak / SUMMON_PER_STREAK_DAYS) - Math.floor(prevStreak / SUMMON_PER_STREAK_DAYS);
  }
  s.lastStreak = streak;
  const done = countDoneTodos();
  const prevDone = s.lastTodoDone || 0;
  if (done > prevDone) {
    gained += Math.floor(done / SUMMON_PER_TODOS) - Math.floor(prevDone / SUMMON_PER_TODOS);
  }
  s.lastTodoDone = done;
  if (gained > 0) s.charges = (s.charges || 0) + gained;
  store.save();
  if (gained > 0 && !silent) toast(`🔮 解鎖 ${gained} 次神奇海螺召喚儀式！請到「召喚」分頁啟動神奇海螺的能量`);
  return gained;
}
function shellVaultHTML() {
  const s = shellState();
  const streak = calcStreak();
  const rem = streak % SUMMON_PER_STREAK_DAYS;
  const daysToNext = rem === 0 ? SUMMON_PER_STREAK_DAYS : SUMMON_PER_STREAK_DAYS - rem;
  const doneRem = countDoneTodos() % SUMMON_PER_TODOS;
  const todosToNext = doneRem === 0 ? SUMMON_PER_TODOS : SUMMON_PER_TODOS - doneRem;
  return `
    <h2>🐚 神奇海螺收藏寶庫 <span class="sub beta-tag">測試中</span></h2>
    <p class="muted small">
      目前擁有 <b>${s.complete || 0}</b> 顆完整神奇海螺、<b>${s.charges || 0}</b> 次召喚機會。
      再連續紀錄 ${daysToNext} 天，或再完成 ${todosToNext} 件待辦，就能開啟一次召喚儀式；
      同元素碎片集滿 ${SHELL_FRAGMENTS_PER_SHELL} 顆會自動合成一顆完整神奇海螺，未來可用於解鎖技能。
    </p>
    <div class="shell-grid">
      ${SHELL_COLORS.map(c => `
        <div class="shell-item shell-${c.key}${c.rare ? " shell-rare" : ""}">
          <span class="shell-emoji">${c.emoji}</span>
          <span class="shell-name">${esc(c.name)}神奇海螺${c.rare ? `<i>${esc(c.rarity)}</i>` : ""}</span>
          <span class="shell-count">${s.frag[c.key] || 0}/${SHELL_FRAGMENTS_PER_SHELL}</span>
        </div>`).join("")}
    </div>
    <div class="btn-row"><button class="btn" id="vault-summon">🔮 前往神奇海螺召喚祭壇${s.charges ? `（${s.charges} 次）` : ""}</button></div>`;
}

/* ---------- 心情 5 Level（心情日曆用；圖示可自訂） ----------
   level 1 = 最好、5 = 最壞；日曆格子只顯示圖示，方便和上方月相盈缺對照。 */
const MOOD_LABELS = ["大晴天", "晴天", "陰天", "雨天", "颱風天 （or軟今天）"];
const MOOD_SETS = {
  weather: { name: "天氣", icons: ["☀️", "🌤", "☁️", "🌧", "🌪"] },
  color:   { name: "顏色", icons: ["🟦", "🟩", "🟨", "🟧", "🟥"] },
  face:    { name: "表情", icons: ["😄", "🙂", "😐", "😔", "😫"] },
  moon:    { name: "月相", icons: ["🌕", "🌔", "🌓", "🌒", "🌑"] },
  heart:   { name: "愛心", icons: ["💙", "💚", "💛", "🧡", "❤️‍🔥"] },
};
function moodSetKey() { return store.data.settings.moodSet || "weather"; }
function moodIcons() {
  const custom = store.data.settings.moodCustomIcons;
  if (moodSetKey() === "custom" && Array.isArray(custom) && custom.length === 5) return custom;
  return (MOOD_SETS[moodSetKey()] || MOOD_SETS.weather).icons;
}
function moodIcon(level) { return moodIcons()[level - 1] || ""; }
function moodLabel(level) { return MOOD_LABELS[level - 1] || ""; }
function moodMap() {
  const m = new Map();
  for (const x of store.data.moods) m.set(x.date, x);
  return m;
}
function moodOf(ds) { return store.data.moods.find(x => x.date === ds) || null; }
/* 同一天只留一筆，重複點選就更新 */
function setMood(ds, level, note) {
  const ex = moodOf(ds);
  if (ex) { ex.level = level; if (note !== undefined) ex.note = note; ex.updatedAt = new Date().toISOString(); }
  else store.data.moods.push({ id: uid(), date: ds, level, note: note || "", createdAt: new Date().toISOString() });
  store.save();
}

/* ---------- 正向心態小工具：三件感謝、小勝利聖杯、自我關懷 ---------- */
const SELF_COMPASSION = [
  "如果今天的你只做到一點點，那也已經足夠了。",
  "對自己說一句，你平常會對好朋友說的安慰話語。",
  "情緒不需要被解決，它只需要先被你發現。",
  "你不必時刻都堅強，一邊流淚一邊勇敢也可以。",
  "犯錯不會損失你的價值，那是你正在學習的證據。",
  "此刻的難受會過去，你已經撐過 99% 的難關。",
  "允許自己慢慢來，我們不需要跟任何人比賽。",
  "願意記錄自己內在輪廓，就是一種很深層的自我照顧。",
];
function todaySelfCompassion() {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + (d.getMonth() + 1) * 40 + d.getDate();
  return SELF_COMPASSION[seed % SELF_COMPASSION.length];
}
function gratitudeOf(ds) { return store.data.gratitude.find(g => g.date === ds) || null; }
function saveGratitude(ds, items) {
  const clean = items.map(s => (s || "").trim()).filter(Boolean);
  const ex = gratitudeOf(ds);
  if (!clean.length) {
    store.data.gratitude = store.data.gratitude.filter(g => g.date !== ds);
  } else if (ex) { ex.items = clean; ex.updatedAt = new Date().toISOString(); }
  else store.data.gratitude.push({ id: uid(), date: ds, items: clean, createdAt: new Date().toISOString() });
  store.save();
}

/* ---------- 儲存層 ---------- */
const DB_KEY = "dreamtide.v1";
const store = {
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch { this.data = null; }
    if (!this.data) this.data = { dreams: [], diary: [], cbt: [], focus: [], capsules: [], customEvents: [], settings: {} };
    for (const k of ["dreams", "diary", "cbt", "focus", "capsules", "customEvents", "sleep", "aiChat", "crystals", "bracelets", "notes", "todos", "feedback", "moods", "gratitude", "wins"]) this.data[k] ||= [];
    this.data.settings ||= {};
    this.data.settings.symbols ||= [" 高山", "大海", "湖泊", "河流", "瀑布", "門", "迷宮", "下墜", "飛行", "追逐", "老房子", "牙齒", "樓梯", "考試", "迷路", "開車", "旅行", "朋友", "伴侶", "過去","Deja Vu"];
    this.data.settings.emotions ||= ["焦慮", "羞愧", "悲傷", "憤怒", "恐懼", "委屈", "無力", "罪惡感"];
    // 自訂情緒清單（喜怒哀樂預設之外，使用者自己新增過的）；舊版存在 emotions 裡的自訂項目自動搬過來
    if (!this.data.settings.customEmotions) {
      const preset = new Set([...Object.values(EMOTION_CATEGORIES).flat(), "焦慮", "羞愧", "悲傷", "憤怒", "恐懼", "委屈", "無力", "罪惡感"]);
      this.data.settings.customEmotions = this.data.settings.emotions.filter(e => !preset.has(e));
    }
    this.data.settings.notified ||= {};
    this.data.settings.broadcasts ||= {};   // 站內通報：領過的 id → 領取時間
  },
  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    // 已登入 Drive → 3 秒 debounce 自動推雲端；失敗不打擾（本機為主，雲端為鏡像）
    if (typeof Cloud !== "undefined" && Cloud.signedIn) {
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => { cloudSyncPush().catch(() => {}); }, 3000);
    }
    // 已登入星塵帳號 → 同樣 debounce 推一份加密備份上去（account.js 自己管節流）
    if (typeof accountSyncPushSoon === "function") accountSyncPushSoon();
  },
};

/* 照片存 IndexedDB（localStorage 容量不夠） */
const idb = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open("dreamtide", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("blobs");
      rq.onsuccess = () => { this.db = rq.result; res(); };
      rq.onerror = () => rej(rq.error);
    });
  },
  put(id, val) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(val, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  },
  get(id) {
    return new Promise((res, rej) => {
      const rq = this.db.transaction("blobs").objectStore("blobs").get(id);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  del(id) {
    return new Promise(res => {
      const tx = this.db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").delete(id);
      tx.oncomplete = res; tx.onerror = res;
    });
  },
};

/* ---------- 月相 ----------
   為什麼不再用「固定 29.53 天平均值」推朔望：
   月球軌道是橢圓的（正是星塵專欄第一篇在講的事），近地點快、遠地點慢，
   真正的「朔」與「望」最多會比平均值早或晚約 14 小時。換算成當地日期
   就可能整整差一天——2026-07-29 22:35（台灣時間）的滿月，舊演算法會標成 7/30。
   改用 Meeus《Astronomical Algorithms》第 49 章的真實朔望時刻，誤差在數分鐘內，
   而且一律用「使用者裝置的當地時區」換算日期，台灣看到的就是台灣的日期。 */
const SYNODIC = 29.530588853;
const MOON_PHASES = [
  { e: "🌑", n: "新月" }, { e: "🌒", n: "眉月" }, { e: "🌓", n: "上弦月" }, { e: "🌔", n: "盈凸月" },
  { e: "🌕", n: "滿月" }, { e: "🌖", n: "虧凸月" }, { e: "🌗", n: "下弦月" }, { e: "🌘", n: "殘月" },
];
const D2R = Math.PI / 180;
/* Meeus 49.a 的行星攝動修正項：[振幅, 角度常數, k 係數, T² 係數]，合計影響約 1～2 分鐘，
   但朔望剛好落在午夜前後時，這一兩分鐘就是「今天」與「明天」的差別，所以照收 */
const PHASE_PERTURB = [
  [0.000325, 299.77, 0.107408, -0.009173], [0.000165, 251.88, 0.016321, 0],
  [0.000164, 251.83, 26.651886, 0], [0.000126, 349.42, 36.412478, 0],
  [0.000110, 84.66, 18.206239, 0], [0.000062, 141.74, 53.303771, 0],
  [0.000060, 207.14, 2.453732, 0], [0.000056, 154.84, 7.306860, 0],
  [0.000047, 34.52, 27.261239, 0], [0.000042, 207.19, 0.121824, 0],
  [0.000040, 291.34, 1.844379, 0], [0.000037, 161.72, 24.198154, 0],
  [0.000035, 239.56, 25.513099, 0], [0.000023, 331.55, 3.592518, 0],
];
/* 第 k 個朔望月的朔（phase 0）或望（phase 0.5）時刻，回傳力學時 JDE */
function truePhaseJDE(kk, phase) {
  const k = kk + phase, T = k / 1236.85, isNew = phase === 0, sin = Math.sin;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;                 // 地球軌道離心率修正
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3) * D2R;                                    // 太陽平近點角
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * D2R;         // 月球平近點角
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * D2R;          // 月球升交點角距
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3) * D2R;                                   // 升交點黃經
  jde += (isNew ? -0.40720 : -0.40614) * sin(Mp)
    + (isNew ? 0.17241 : 0.17302) * E * sin(M)
    + (isNew ? 0.01608 : 0.01614) * sin(2 * Mp)
    + (isNew ? 0.01039 : 0.01043) * sin(2 * F)
    + (isNew ? 0.00739 : 0.00734) * E * sin(Mp - M)
    - (isNew ? 0.00514 : 0.00515) * E * sin(Mp + M)
    + (isNew ? 0.00208 : 0.00209) * E * E * sin(2 * M)
    - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F)
    + 0.00056 * E * sin(2 * Mp + M) - 0.00042 * sin(3 * Mp)
    + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F)
    - 0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M);
  for (const [amp, base, rate, t2] of PHASE_PERTURB) jde += amp * sin((base + rate * k + t2 * T ** 2) * D2R);
  return jde;
}
const DELTA_T_DAYS = 70 / 86400;                       // 力學時 → 世界時，2020 年代約差 70 秒
const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);
const phaseDate = (k, phase) => jdToDate(truePhaseJDE(k, phase) - DELTA_T_DAYS);
/* 某個時刻大約落在第幾個朔望月（Meeus 的 k 估算式，誤差不超過 ±1） */
const kNear = d => Math.floor(((d.getFullYear() + (d.getMonth() + d.getDate() / 30.4) / 12) - 2000) * 12.3685);

/* 此刻落在哪一輪朔望月：回傳這輪的朔、望，以及下一輪的朔（世界時 JD） */
function lunation(jd, hint) {
  let k = kNear(hint) + 1;
  // kNear 最多差 1，往回找到第一個不晚於此刻的朔即可；上限純粹防呆
  for (let i = 0; i < 4 && truePhaseJDE(k, 0) - DELTA_T_DAYS > jd; i++) k--;
  return {
    newMoon: truePhaseJDE(k, 0) - DELTA_T_DAYS,
    full: truePhaseJDE(k, 0.5) - DELTA_T_DAYS,
    nextNew: truePhaseJDE(k + 1, 0) - DELTA_T_DAYS,
  };
}
/* 月齡＝距離「最近一次真實朔」幾天 */
function moonAge(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return jd - lunation(jd, date).newMoon;
}
/* 月相角（0°＝朔、180°＝望）用「這一輪真實的朔→望→朔」內插，不用平均月長換算。
   月球走得忽快忽慢，這一輪從朔到望要 15.2 天，用平均值算會讓 7/28 的照度
   直接顯示 100%——那正是專欄文章說「還沒到全面發光」的那一天。 */
function moonInfo(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const { newMoon, full, nextNew } = lunation(jd, date);
  const age = jd - newMoon;
  const elong = jd < full ? 180 * age / (full - newMoon) : 180 + 180 * (jd - full) / (nextNew - full);
  const idx = Math.round(elong / 45) % 8;
  const illum = Math.round((1 - Math.cos(elong * D2R)) / 2 * 100);
  return { age, elong, ...MOON_PHASES[idx], illum };
}
const MOON_EVENT_META = [
  [0, { type: "newmoon", title: "新月 🌑", note: "設定意念與許願的起點" }],
  [0.5, { type: "fullmoon", title: "滿月 🌕", note: "感恩、釋放與回顧的節點" }],
];
/* 未來 N 天內的新月/滿月日期（以真實朔望時刻換算成當地日期） */
function upcomingMoonEvents(days = 90) {
  const today = todayStr();
  const lim = new Date(); lim.setDate(lim.getDate() + days);
  const limStr = dstr(lim);
  const k0 = kNear(new Date()) - 1;
  const out = [];
  for (let k = k0; k <= k0 + Math.ceil(days / SYNODIC) + 2; k++) {
    for (const [phase, meta] of MOON_EVENT_META) {
      const date = dstr(phaseDate(k, phase));
      if (date >= today && date <= limStr) out.push({ date, ...meta });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- 宇宙天象事件（資料整理自 Sea&Sky / Star Walk / Space.com，並由Blue親自編修；可見性視地區與天候而定） ---------- */
const ASTRO_EVENTS = [
  { date: "2026-07-04", type: "conjunction", title: "火星合天王星", note: "僅相距 6 角分（約滿月直徑 1/5），金牛座黎明前東方低空" },
  { date: "2026-07-30", type: "meteor", title: "寶瓶座δ流星雨極大期", note: "南半球條件較佳，午夜後觀察" },
  { date: "2026-08-02", type: "conjunction", title: "水星合金星", note: "黎明前東方低空，兩顆內行星相會於巨蟹座" },
  { date: "2026-08-10", type: "conjunction", title: "金星合木星", note: "「宇宙之吻」全年最亮的兩顆行星靠近至約 1 度，黎明東方最為壯觀" },
  { date: "2026-08-13", type: "eclipse", title: "日全蝕", note: "食甚為台灣時間 8/13 凌晨 01:46（國際慣稱 8/12 日蝕）；全蝕帶經格陵蘭、冰島、西班牙北部，台灣不可見，可線上觀看" },
  { date: "2026-08-12", type: "conjunction", title: "六星晨聚（六星連珠）", note: "木星・水星・火星・天王星・土星・海王星日出前齊聚東方天空；連續數日的黎明都看得到" },
  { date: "2026-08-13", type: "meteor", title: "英仙座流星雨極大期", note: "年度三大流星雨之一，適逢新月無光害，後半夜條件極佳" },
  { date: "2026-08-15", type: "conjunction", title: "水星合木星", note: "日出前一小時東方低空，兩顆亮星靠近" },
  { date: "2026-08-19", type: "conjunction", title: "月合金星", note: "眉月與金星在黎明東方低空相會，非常美麗好拍" },
  { date: "2026-08-28", type: "eclipse", title: "月偏蝕", note: "美洲、歐洲、非洲可見；台灣不可見" },
  { date: "2026-09-09", type: "conjunction", title: "土星合海王星", note: "兩顆遠行星相距僅約 1 度，雙魚座整夜可見（需望遠鏡辨認海王星）" },
  { date: "2026-09-14", type: "conjunction", title: "月掩土星", note: "月亮從土星前方掠過並短暫遮蔽，北半球部分地區可見" },
  { date: "2026-09-23", type: "seasonal", title: "秋分・晝夜等長", note: "太陽直射赤道，全球白晝與黑夜幾乎等長；秋日的能量轉折點" },
  { date: "2026-09-25", type: "opposition", title: "海王星衝", note: "海王星整夜可見、最亮，仍需望遠鏡（雙魚座）" },
  { date: "2026-10-08", type: "meteor", title: "天龍座流星雨極大期", note: "傍晚後觀察，時有火流星，數量不多但明亮" },
  { date: "2026-10-14", type: "conjunction", title: "金星合火星", note: "黎明前東方，紅色與白色行星並肩，室女座" },
  { date: "2026-10-21", type: "meteor", title: "獵戶座流星雨極大期", note: "哈雷彗星的碎屑，午夜後東方天空" },
  { date: "2026-11-05", type: "conjunction", title: "五星連珠（水金火木土）", note: "日落後西方低空與凌晨東方，五顆行星串連於黃道，肉眼即可全數看見" },
  { date: "2026-11-05", type: "meteor", title: "南金牛座流星雨極大期", note: "數量少但明亮，時有火流星劃過" },
  { date: "2026-11-15", type: "conjunction", title: "火星合木星", note: "兩星相距約 1 度，黎明前天空最接近，全年最佳行星相合之一" },
  { date: "2026-11-17", type: "meteor", title: "獅子座流星雨極大期", note: "後半夜觀察" },
  { date: "2026-11-20", type: "conjunction", title: "水星合金星（上合）", note: "水星內合於太陽前方，日落後西方低空短暫可見" },
  { date: "2026-11-24", type: "supermoon", title: "超級月亮", note: "年度三次超級月亮之一，月亮比平均更大更亮" },
  { date: "2026-11-25", type: "opposition", title: "天王星衝", note: "天王星整夜可見、最亮，暗空下勉強肉眼可見（金牛座）" },
  { date: "2026-12-04", type: "conjunction", title: "月合木星", note: "盈凸月與木星靠近，入夜東方天空的醒目組合" },
  { date: "2026-12-14", type: "meteor", title: "雙子座流星雨極大期", note: "年度最穩定的大流星雨，入夜即可觀察，每小時可達百顆" },
  { date: "2026-12-21", type: "seasonal", title: "冬至・北半球夜最長", note: "太陽直射南回歸線，一年中最長的夜，適合安靜內省的儀式" },
  { date: "2026-12-22", type: "meteor", title: "小熊座流星雨極大期", note: "數量少但流量穩定，適合寒冷冬夜靜心觀察" },
  { date: "2026-12-24", type: "supermoon", title: "超級滿月（近八年最大）", note: "2019 年以來最接近地球的滿月，全年最大最亮；台灣時間 12/24 09:28 最圓（歐美時區為 12/23）" },
  { date: "2027-01-03", type: "meteor", title: "象限儀座流星雨極大期", note: "極大期短暫，凌晨觀察，每小時可達 40 顆" },
  { date: "2027-01-24", type: "conjunction", title: "金星合土星", note: "日落後西南方低空，兩顆行星相距約 3 度" },
  { date: "2027-02-06", type: "eclipse", title: "日環蝕", note: "環蝕帶經南美洲與大西洋；台灣不可見" },
  { date: "2027-03-20", type: "seasonal", title: "春分・晝夜等長", note: "太陽再度直射赤道，白晝日漸增長，適合新起點的意念設定" },
  { date: "2027-04-22", type: "meteor", title: "天琴座流星雨極大期", note: "年度四月的可靠流星雨，午夜後觀察" },
  { date: "2027-05-06", type: "meteor", title: "寶瓶座η流星雨極大期", note: "哈雷彗星另一次碎屑，南半球條件較佳" },
  { date: "2027-06-11", type: "opposition", title: "土星衝", note: "土星整夜可見、最亮，小望遠鏡就能看到光環" },
  { date: "2027-07-01", type: "conjunction", title: "金星合水星（三合之一）", note: "金水三次相合的第一次（另在 8/11、10/10）" },
  { date: "2027-08-02", type: "eclipse", title: "日全蝕", note: "本世紀最長時間的日全蝕之一（ 6 分 23 秒），全蝕帶經北非、中東" },
  { date: "2027-09-14", type: "opposition", title: "木星衝", note: "整夜可見的木星最亮時刻，小望遠鏡可見四大衛星與雲帶" },
];
const SUPERMOON_ANNOT = { "2026-01-03": "超級滿月", "2026-11-24": "超級滿月", "2026-12-24": "超級滿月（近八年最大）" };
const RITUALS = {
  newmoon: { name: "新月許願儀式", steps: ["今晚預留 10 分鐘給自己，點燃一根蠟燭", "寫下 1 至 10 個願望，用現在式、肯定句（「我正在、我已經...」）", "字句寫下後，逐條唸出，閉上眼去想像，當這些願望實現時，喜悅佈滿內心的情緒，在腦海中預先體會這份幸福", "存進本日日記，於滿月時再回顧乙次"] },
  fullmoon: { name: "滿月感恩與釋放", steps: ["回顧這半個月的自己：寫下 3 件感謝的事", "也寫下 1 件想放下的念頭或習慣", "深呼吸三次，想像問題都隨月光釋放、隨潮汐流走", "可回顧上個新月的願望清單是否已實現，即便還沒也沒關係，可趁著本輪滿月再次寫下心願"] },
  meteor: { name: "流星雨觀星儀式", steps: ["遠離光害，讓眼睛適應黑暗 15 分鐘", "對流星許願前，先在心中定好一個核心意念", "仰望星空，感受宇宙的壯闊與深度", "回家後用語音記下此刻的感受"] },
  eclipse: { name: "蝕相轉化書寫", steps: ["蝕相是週期的轉折點：寫下「正在結束的」與「正在開始的」", "問自己：我想讓什麼問題或負面情緒，隨著星體移轉而離開？", "寫一句給下個週期的自己", "存為時空膠囊，下次蝕相時重新開啟"] },
  conjunction: { name: "星體相合・合力顯化", steps: ["兩顆行星相會，正是兩股宇宙能量交融之時：想一件需要「合力」完成之事（如事業＋關係、行動＋耐心）", "抬頭找到相合的兩顆星（黎明或黃昏低空），凝視一分鐘", "寫下你想融合的兩個面向，各一句話", "許一個需要這兩股力量一起推動的願望，存進本日日記"] },
  opposition: { name: "行星衝・照見與整合", steps: ["行星衝＝整夜可見、最明亮的時刻，象徵某件事來到滿盈與清晰階段", "趁著這時機問自己：現在什麼事已經「看得很清楚」了？該做出行動或完全放下了。", "寫下這份能量所帶來的每個決定", "若有望遠鏡，親眼看看這顆最亮的行星"] },
  supermoon: { name: "超級月亮・盈滿感恩", steps: ["超級月亮是最大最亮的滿月，能量格外飽滿", "到戶外或窗邊，讓月光照在身上一分鐘", "寫下 3 件此刻豐盛、感謝的事", "寫下 1 件想在柔和月光中放下的重擔，深呼吸、吐氣、釋放"] },
  seasonal: { name: "節氣・晝夜轉折儀式", steps: ["節氣是宇宙尺度的呼吸，站在轉折點上感受自己的位置", "寫下這一季走過的路，有捨有得：3 個正面收穫、1 個負面情緒釋放", "以現在式寫下下一季想成為的樣子", "點一根蠟燭或倒一杯水，給過去的自己與正在誕生的自己"] },
  custom: { name: "自訂顯化儀式", steps: ["閉上眼，靜下心，進行三個深呼吸循環", "寫下此刻的意圖，用現在式", "想像心願實現的畫面、感受心中喜悅的情緒 1 分鐘", "以一句感謝作結，可以是感謝宇宙，也可以感謝自己"] },
};

/* ---------- 天文知識文章（中英雙語） ---------- */
const KNOWLEDGE = [
  {
    id: "moon-phases", icon: "🌓", cat: "月亮", zhTitle: "月相是怎麼來的", enTitle: "Why the Moon Has Phases",
    zhBody: [
      "月亮本身並不發光，我們看到的是它反射的太陽光。月相的變化，來自太陽、地球、月球三者相對位置的改變；被照亮的半球，決定我們能看到什麼模樣的月亮。",
      "月亮繞地球一圈約 29.5 天（朔望月），當月亮位於地球與太陽之間，被照亮的一面背對我們，就是「新月」；當地球位於中間，我們看到整個被照亮的半球，就是「滿月」。",
      "新月到滿月之間月亮逐漸變亮，稱為「盈」（waxing）；滿月到新月逐漸變暗，稱為「虧」（waning）。上弦月傍晚可見，下弦月則在後半夜到清晨。",
    ],
    enBody: [
      "The Moon produces no light of its own — we see sunlight reflected off its surface. Its phases come from the changing positions of the Sun, Earth, and Moon, which determine how much of the lit half we can see.",
      "The Moon orbits Earth roughly every 29.5 days (a synodic month). When it sits between Earth and the Sun, its lit side faces away from us — a New Moon. When Earth is in the middle, we see the whole lit hemisphere — a Full Moon.",
      "From new to full the Moon grows brighter (waxing); from full back to new it dims (waning). A first-quarter Moon is visible in the evening, a last-quarter Moon after midnight into dawn.",
    ],
  },
  {
    id: "new-moon", icon: "🌑", cat: "月亮", zhTitle: "新月：黑暗中的起點", enTitle: "New Moon: A Dark Beginning",
    zhBody: [
      "新月時月亮幾乎不可見，因為它與太陽同方向升落，被照亮的一面完全背對地球，這也是每個農曆月的開始（初一）。",
      "沒有月光的夜晚並不全然黑暗，是觀測流星雨、銀河與深空天體的最佳時機——2026 年 8 月的英仙座流星雨正好遇上新月，觀星條件極佳。",
      "在許多文化與神祕學傳統中，新月象徵「播種」：一個週期的開端，適合設定信念、寫下願望，這也是本 App 新月圖樣魔法儀式的由來。",
    ],
    enBody: [
      "At New Moon the Moon is nearly invisible: it rises and sets with the Sun, and its lit face points entirely away from Earth. This marks the start of each lunar month.",
      "A moonless sky is the darkest, making New Moon the best time to watch meteor showers, the Milky Way, and faint deep-sky objects — the August 2026 Perseids fall on a New Moon, ideal conditions.",
      "Across many cultures and mystical traditions the New Moon symbolizes planting seeds: the opening of a cycle, a time to set intentions and write wishes — the basis of this app's New Moon ritual.",
    ],
  },
  {
    id: "full-moon", icon: "🌕", cat: "月亮", zhTitle: "滿月與它的名字", enTitle: "The Full Moon and Its Names",
    zhBody: [
      "滿月時，地球位於太陽與月亮之間，朝向我們的半球被照亮；滿月從日落時東昇、日出時西沉，徹夜可見。",
      "北美傳統為每個月的滿月取名，反映節令：如「狼月」（1 月）、「雪月」（2 月）、「豐收月」（秋分前後），這些名字近年被廣泛使用。",
      "假如一個月出現兩次滿月，第二次俗稱「藍月」（Blue Moon），約每 2–3 年一次，是「千載難逢」一詞的由來之一。",
    ],
    enBody: [
      "At Full Moon, Earth lies between the Sun and Moon, and the entire near-side hemisphere is lit. A Full Moon rises at sunset, sets at sunrise, and is visible all night.",
      "North American tradition names each month's Full Moon after seasonal cues — Wolf Moon (January), Snow Moon (February), Harvest Moon (near the autumn equinox). These names are now widely used.",
      "Occasionally a month holds two Full Moons; the second is nicknamed a Blue Moon, occurring every 2–3 years — one origin of the phrase 'once in a blue moon.'",
    ],
  },
  {
    id: "supermoon", icon: "🌝", cat: "月亮", zhTitle: "超級月亮為何更大？", enTitle: "Why a Supermoon Looks Bigger",
    zhBody: [
      "月亮繞行地球的軌道是橢圓的，最近點稱「近地點」、最遠點稱「遠地點」。當滿月剛好發生在近地點附近，就是「超級月亮」。",
      "超級月亮比一般滿月大約 7%、亮度提升約 15%，肉眼不一定分辨得出，但在地平線附近升起時，因「月亮錯覺」會顯得格外巨大。",
      "2026 年 12 月 23 日的滿月是自 2019 年以來最接近地球的滿月（約 35.6 萬公里），是近八年最大最亮的一次，值得特別留意。",
    ],
    enBody: [
      "The Moon's orbit around Earth is an ellipse: its closest point is perigee, its farthest apogee. When a Full Moon happens near perigee, we call it a Supermoon.",
      "A Supermoon appears about 7% larger and 15% brighter than an average Full Moon — hard to notice by eye, but striking as it rises near the horizon thanks to the 'Moon illusion.'",
      "The Full Moon of 23 December 2026 will be the closest to Earth since 2019 (about 356,700 km) — the biggest, brightest Moon in nearly eight years, well worth watching for.",
    ],
  },
  {
    id: "conjunction", icon: "🪐", cat: "行星", zhTitle: "行星合相：天空中的相會", enTitle: "Conjunctions: Meetings in the Sky",
    zhBody: [
      "當兩顆行星（或行星與月亮）在天空中看起來非常接近，就稱為「合相」（conjunction），但它們其實相距數億公里，只是對於地球視角來說恰好在同一個方向。",
      "合相是最容易觀察的天象之一，不需要專業器材，只要在正確的方向與時間抬起頭，例如金星與木星，是天空最亮的兩顆行星，星體合相俗稱「宇宙之吻」，格外醒目。",
      "2026 年 11 月 15 日火星與木星相距僅約 1 度，是全年最精采的行星相合之一；7 月 4 日火星與天王星更近到只有 6 角分，這些星體運行軌跡，不僅會牽動宇宙能量、造成個人影響，在西洋占星學上也有特殊的解讀意義。",
    ],
    enBody: [
      "When two planets (or a planet and the Moon) appear very close together in the sky, that's a conjunction. They're actually hundreds of millions of kilometers apart — just aligned along our line of sight.",
      "Conjunctions are among the easiest events to watch: no equipment needed, just look in the right direction at the right time. Venus and Jupiter, the two brightest planets, make an especially vivid pairing nicknamed the 'cosmic kiss.'",
      "On 15 November 2026 Mars and Jupiter close to about 1° apart — one of the year's finest conjunctions; on 4 July 2026 Mars and Uranus came within just 6 arcminutes.",
    ],
  },
  {
    id: "opposition", icon: "🔭", cat: "行星", zhTitle: "行星衝：最亮的一夜", enTitle: "Opposition: A Planet at Its Brightest",
    zhBody: [
      "星體「衝」（opposition）指外行星與太陽分別位於地球兩側，此時行星在日落時東昇、整夜可見，也離地球最近，因此看起來最大也最亮。",
      "行星衝是觀測木星、土星、天王星、海王星的最佳時機；木星衝時，用望遠鏡就能看到四大衛星與雲帶，而土星衝時，其光環更顯清晰和迷人。",
      "值得期待的天文現象有：2026 年 9 月 25 日海王星衝、11 月 25 日天王星衝，但這兩顆遠行星即使在衝位時也偏暗，天王星需處於極暗黑夜、海王星還需搭配望遠鏡，因為他們離地球的距離實在太遙遠了。",
    ],
    enBody: [
      "Opposition is when an outer planet and the Sun sit on opposite sides of Earth. The planet then rises at sunset, is visible all night, and lies closest to Earth — appearing biggest and brightest.",
      "Opposition is the best time to observe Jupiter, Saturn, Uranus, and Neptune. At Jupiter's opposition a small telescope shows its four large moons and cloud belts; at Saturn's, the rings are stunning.",
      "Neptune reaches opposition on 25 September 2026 and Uranus on 25 November 2026. Both remain faint even then — Uranus needs very dark skies, Neptune a telescope.",
    ],
  },
  {
    id: "eclipse", icon: "🌘", cat: "天象", zhTitle: "日蝕與月蝕", enTitle: "Solar and Lunar Eclipses",
    zhBody: [
      "日蝕發生在新月，是月球恰好擋在太陽與地球之間；月蝕發生在滿月，則是地球的影子落在月亮上；因月球軌道傾斜，並非每個朔望都有會產生此現象。",
      "日全蝕時月球完全遮住太陽，白晝短暫變暗、可見日冕，是最壯觀的天象之一，但全蝕帶很窄，月全蝕時月亮轉為暗紅色，俗稱「血月」，範圍廣、肉眼即可安全觀看。",
      "接下來在2026 年 8 月 12 日有一次日全蝕（帶經格陵蘭、冰島、西班牙北部）；8 月 28 日有月偏蝕，可惜兩者在台灣皆不可見，可透過線上直播觀看。⚠️ 觀測日蝕務必使用專用濾鏡，切勿直視太陽。",
    ],
    enBody: [
      "A solar eclipse happens at New Moon, when the Moon passes between Sun and Earth; a lunar eclipse at Full Moon, when Earth's shadow falls on the Moon. Because the Moon's orbit is tilted, not every month brings an eclipse.",
      "In a total solar eclipse the Moon fully covers the Sun — daylight briefly dims and the corona appears — but the path of totality is narrow. In a total lunar eclipse the Moon turns deep red ('blood Moon'), visible safely by eye over a wide area.",
      "On 12 August 2026 a total solar eclipse crosses Greenland, Iceland, and northern Spain; a partial lunar eclipse follows on 28 August. Neither is visible from Taiwan — watch via livestream. ⚠️ Always use certified solar filters; never look directly at the Sun.",
    ],
  },
  {
    id: "meteor", icon: "☄️", cat: "天象", zhTitle: "流星雨從哪裡來", enTitle: "Where Meteor Showers Come From",
    zhBody: [
      "流星雨來自彗星（偶爾出現的小行星）沿軌道遺留的塵埃碎屑，當地球每年穿過這些碎屑帶，微粒以高速衝入大氣層燃燒發光，就是流星。",
      "流星看似從天空某一點放射而出，那起點所在的星座位置，就是那場流星雨之名，如「英仙座」「雙子座」流星雨，觀測不需器材，尋找無光害的暗處、仰望星空或躺下，耐心等待即可。",
      "本年度三大流星雨為：象限儀座（1 月）、英仙座（8 月）、雙子座（12 月），2026 年英仙座恰逢新月、雙子座每小時可達百顆，是觀賞流星的絕佳機會。",
    ],
    enBody: [
      "Meteor showers come from dust and debris left along the orbit of a comet (occasionally an asteroid). Each year Earth passes through these streams; the particles slam into the atmosphere at high speed and burn up as meteors.",
      "Meteors seem to radiate from one point in the sky; the constellation there gives the shower its name — Perseids, Geminids, and so on. No equipment is needed: find a dark spot, lie back, and be patient.",
      "The year's big three are the Quadrantids (January), Perseids (August), and Geminids (December). In 2026 the Perseids coincide with a New Moon and the Geminids can reach 100+ per hour — excellent opportunities.",
    ],
  },
  {
    id: "planet-parade", icon: "✨", cat: "行星", zhTitle: "行星連珠是什麼？", enTitle: "What Is a Planet Parade",
    zhBody: [
      "「行星連珠」（planet parade）是指多顆行星同時出現在天空同一側，排成一列的景象，它們並非真的排成直線，而是因為太陽系行星都大致在同一平面（黃道）上運行。",
      "連珠有大有小：三四顆亮行星同框已很難得，五六顆同時可見則較罕見、更為壯觀；2026 年 8 月 12 日黎明前，木星、水星、火星、天王星、土星、海王星，六星將齊聚東方天空。",
      "人類的肉眼，通常只能看到水星、金星、火星、木星、土星，而天王星與海王星需望遠鏡，使用本 App 的日期提醒，就不會錯過下一次星體連珠。",
    ],
    enBody: [
      "A planet parade is when several planets appear on the same side of the sky at once, strung out in a line. They aren't truly in a straight line — it's because all the Solar System's planets orbit roughly in the same plane (the ecliptic).",
      "Parades range from modest to grand: three or four bright planets together is already a treat; five or six at once is rarer and more spectacular. Before dawn on 12 August 2026, six — Jupiter, Mercury, Mars, Uranus, Saturn, and Neptune — gather in the eastern sky.",
      "By eye you can usually catch Mercury, Venus, Mars, Jupiter, and Saturn; Uranus and Neptune need a telescope. Use this app's reminders so you don't miss the next parade.",
    ],
  },
  {
    id: "retrograde", icon: "↩️", cat: "行星", zhTitle: "行星逆行的真相", enTitle: "The Truth About Retrograde",
    zhBody: [
      "行星「逆行」是指從地球看，某顆行星在星空背景中暫時由東向西倒退移動，這是一種視覺錯覺，行星並沒有真的倒退。",
      "以水星為例：地球與水星繞太陽的速度不同，當地球「超車」內側或外側的行星時，就會看到它相對背景星空短暫逆行，如同高速公路上超車時，旁邊的車輛彷彿後退一樣。",
      "西洋占星學賦予逆行（尤其水星逆行）象徵意義，如溝通不良、回顧過去、重整關係或科技儀器故障，在天文學上這只是軌道幾何的自然結果；但無論是科學或占星學，這兩種視角都可以成為自我覺察的提醒契機。",
    ],
    enBody: [
      "A planet in 'retrograde' appears, from Earth, to move backward — east to west — against the background stars for a while. It's an optical illusion; the planet isn't truly reversing.",
      "Take Mercury: Earth and Mercury orbit the Sun at different speeds. As Earth overtakes a planet (inside or outside its orbit), that planet seems to slip backward against the stars — like a car you pass on the highway appearing to move back.",
      "Astrology gives retrogrades (especially Mercury) meanings like communication, review, and realignment. Astronomically it's just orbital geometry — but either lens can serve as a prompt for self-reflection.",
    ],
  },
  {
    id: "zodiac", icon: "♈", cat: "文化", zhTitle: "黃道、星座與星象", enTitle: "The Zodiac, Constellations, and the Sky",
    zhBody: [
      "「黃道」是太陽一年中在星空上走過的路徑，古人把這條路徑附近的星群劃成十二個星座，就是黃道十二宮的由來，這十二宮的概念，同時存在於東方命理學：「紫微斗數」。",
      "太陽、月球與行星，大致皆沿黃道運行，因此它們總是出現在這十二個星座之間，這也是為什麼日蝕、行星合相往往發生在特定星座裡的原因。",
      "值得注意：因地球自轉軸的「歲差」，兩千多年來，星座相對時令已漂移約一個宮位，天文星座與西洋占星星座並不完全對應，這正是東西方星象系統與命理學各自演化的特殊之處。",
    ],
    enBody: [
      "The ecliptic is the path the Sun traces against the background stars over a year. Ancient peoples divided the star groups along it into twelve constellations — the origin of the zodiac.",
      "The Sun, Moon, and planets all move roughly along the ecliptic, so they always appear among these twelve constellations. That's why eclipses and conjunctions occur within particular signs.",
      "Note: due to the precession of Earth's axis, over two millennia the constellations have drifted about one sign relative to the seasons, so astronomical and astrological signs no longer align exactly — part of what makes Eastern and Western sky traditions so fascinating.",
    ],
  },
  {
    id: "kabbalah", icon: "🔯", cat: "文化", zhTitle: "卡巴拉生命之樹與七曜", enTitle: "Kabbalah's Tree of Life & the Seven Planets",
    zhBody: [
      "卡巴拉（Kabbalah）是猶太神祕學傳統，核心圖像是「生命之樹」（Etz Chaim）- 由十個「質點」（Sephirot）與連接它們的路徑所組成，象徵創造與意識的多維層次。",
      "文藝復興時期的西方神祕學，把古典七星曜（日、月、水、金、火、木、土）對應到生命之樹的七個質點：如太陽對應中央的 Tiphereth（美）、月球對應 Yesod（基）、土星對應 Binah（理解）。",
      "這套秘術系統對應宇宙的行星、內在的心理原型與靈性的路徑，編織交纏在一起，與心理學家卡爾榮格的學說：「行星即心靈原型」的觀點相呼應，本 App 的魔法陣圖樣，正取材自這些符號傳統，作為個人正念與想像的媒介，而非單純星象或占卜學。",
    ],
    enBody: [
      "Kabbalah is a Jewish mystical tradition whose central image is the Tree of Life (Etz Chaim) — ten 'emanations' (Sephirot) linked by paths, representing levels of creation and consciousness.",
      "Renaissance Western esotericism mapped the seven classical planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) onto the Sephirot: the Sun to central Tiphereth (Beauty), the Moon to Yesod (Foundation), Saturn to Binah (Understanding).",
      "This weaves together the planets in the sky, inner psychological archetypes, and a spiritual path — echoing Jung's view of planets as archetypes of the psyche. This app's magic-circle effects draw on these symbolic traditions as a medium for personal mindfulness and imagination — not divination or medicine.",
    ],
  },
];

/* ---------- 宇宙新聞（內容取自 NASA，美國政府資訊屬公共領域；預設英文＋中譯） ---------- */
const NEWS = [
  {
    id: "webb-methane", date: "2026-06-01", icon: "☄️",
    enTitle: "Webb Detects Methane on Interstellar Comet 3I/ATLAS",
    zhTitle: "韋伯望遠鏡在星際彗星 3I/ATLAS 上偵測到甲烷",
    enBody: [
      "NASA's James Webb Space Telescope captured its first mid-infrared chemical fingerprint of an interstellar object during a revisit to comet 3I/ATLAS, using its MIRI instrument to map the gases around the comet's nucleus.",
      "Water vapor spreads far beyond the nucleus, released from icy grains in the coma, while carbon dioxide and methane stay concentrated near the nucleus. Webb's NIRSpec also found surprisingly high ratios of heavy hydrogen and heavy carbon — signs that 3I/ATLAS formed in a place very different from our solar system.",
      "Only the third comet ever confirmed to come from outside the solar system, 3I/ATLAS was discovered on July 1, 2025 by the NASA-funded ATLAS survey in Chile.",
    ],
    zhBody: [
      "NASA 的詹姆斯・韋伯太空望遠鏡在重新觀測彗星 3I/ATLAS 時，首次取得星際天體的中紅外線化學指紋，並以 MIRI 儀器繪出彗核周圍的氣體分布。",
      "水蒸氣從彗髮中的冰粒釋放，擴散到遠離彗核之處；二氧化碳與甲烷則集中在彗核附近。韋伯的 NIRSpec 還發現異常高比例的重氫與重碳，顯示 3I/ATLAS 形成於與太陽系截然不同的環境。",
      "3I/ATLAS 是史上第三顆確認來自太陽系外的彗星，於 2025 年 7 月 1 日由 NASA 資助的智利 ATLAS 巡天計畫發現。",
    ],
    source: "NASA Science — Webb 3I/ATLAS Blog", url: "https://science.nasa.gov/blogs/3iatlas/2026/06/01/nasas-webb-detects-methane-on-interstellar-comet-3i-atlas/",
  },
  {
    id: "europa-clipper", date: "2026-01-01", icon: "🛰️",
    enTitle: "Europa Clipper Heads for a December 2026 Earth Flyby",
    zhTitle: "歐羅巴快船將於 2026 年 12 月飛掠地球借力",
    enBody: [
      "NASA's Europa Clipper — the largest spacecraft NASA has ever built for a planetary mission — is set for a close Earth encounter in December 2026 that will act as a gravitational slingshot, boosting its speed toward Jupiter.",
      "The probe already tested its ice-penetrating radar during a 2025 Mars flyby, returning a detailed image that bodes well for its true target: Jupiter's moon Europa, which hides a global ocean beneath its icy crust.",
      "Europa Clipper is scheduled to arrive in Jupiter's orbit in April 2030, where it will study whether Europa's ocean could support life.",
    ],
    zhBody: [
      "NASA 的歐羅巴快船（Europa Clipper）是 NASA 為行星任務建造過最大的太空船，預計於 2026 年 12 月近距離飛掠地球，藉重力彈弓效應加速前往木星。",
      "這艘探測器已在 2025 年飛掠火星時測試了穿冰雷達，回傳的細緻影像為它真正的目標：木星的衛星「歐羅巴」——帶來好兆頭；歐羅巴的冰殼之下藏著一片全球性海洋。",
      "歐羅巴快船預計 2030 年 4 月進入木星軌道，目標為研究歐羅巴的海洋是否可能孕育生命。",
    ],
    source: "NASA — Europa Clipper Mission", url: "https://science.nasa.gov/mission/europa-clipper/",
  },
  {
    id: "artemis-ii", date: "2026-01-17", icon: "🚀",
    enTitle: "Artemis II Rocket Rolls to the Launch Pad",
    zhTitle: "阿提米絲二號火箭移至發射台",
    enBody: [
      "NASA's Space Launch System (SLS) rocket and Orion spacecraft rolled out to Launch Pad 39B at Kennedy Space Center in Florida on January 17, 2026, a major milestone toward the Artemis II mission.",
      "Artemis II will carry a crew of four on a journey around the Moon and back — the first crewed flight of the Artemis program and a key step toward returning humans to the lunar surface.",
    ],
    zhBody: [
      "NASA 的太空發射系統（SLS）火箭與獵戶座太空船於 2026 年 1 月 17 日移至佛羅里達甘迺迪太空中心的 39B 發射台，是邁向阿提米絲二號任務的重大里程碑。",
      "阿提米絲二號將搭載四名太空人繞月飛行後返回，這是阿提米絲計畫首次載人飛行，也是人類重返月球表面的關鍵一步。",
    ],
    source: "NASA — Artemis", url: "https://www.nasa.gov/humans-in-space/artemis/",
  },
  {
    id: "webb-origin", date: "2025-12-15", icon: "🔭",
    enTitle: "Webb Finds Clues to the Ancient, Distant Origin of 3I/ATLAS",
    zhTitle: "韋伯望遠鏡找到 3I/ATLAS 古老而遙遠來源的線索",
    enBody: [
      "Follow-up observations of interstellar comet 3I/ATLAS suggest it may be older than our own solar system, carrying chemistry forged around a distant, ancient star before being flung into interstellar space.",
      "Studying visitors like 3I/ATLAS lets astronomers sample material from other planetary systems directly — a rare chance to compare the building blocks of worlds far beyond our own.",
    ],
    zhBody: [
      "對特殊星體／彗星 3I/ATLAS 的後續觀測顯示，它可能比我們的太陽系更古老，帶著在一顆遙遠古老恆星周圍形成的化學物質，之後才被拋入宇宙當中。",
      "研究像 3I/ATLAS 這樣的星際訪客，讓天文學家得以直接取樣其他行星系統的物質，這是讓我們能從太陽系以外，得到「宇宙的原料」，進而進行比對的難得機會。",
    ],
    source: "NASA Science — Webb Mission", url: "https://science.nasa.gov/missions/webb/nasas-webb-finds-clues-to-ancient-distant-origin-of-comet-3i-atlas/",
  },
];

/* ---------- 宇宙知識問答題庫 ----------
   每題都對應一篇 App 內既有的天文知識文章（ref），答錯時可以直接跳去讀那篇。
   a 是 opts 裡正確答案的索引；實際出題時選項會洗牌，背位置沒有用。
   出題原則：只寫查得到、站得住腳的天文事實，寧可少也不要寫錯。 */
const QUIZ_BANK = [
  { id: "q-moonlight", cat: "月亮", ref: "moon-phases",
    q: "月亮本身會發光嗎？",
    opts: ["會，它是一顆很暗的恆星", "不會，月光是太陽光反射而來", "會，但只有滿月那幾天", "不會，月光是地球反射的光"],
    a: 1, why: "月球本身不發光。我們看到的月光，是太陽照在月面之後反射回來的。" },
  { id: "q-phase-cause", cat: "月亮", ref: "moon-phases",
    q: "月亮會有盈虧變化，是因為什麼？",
    opts: ["地球的影子遮住月亮", "月球被雲層遮擋的程度不同", "我們看到月球「被太陽照亮那一面」的角度改變", "月球本身的亮度會週期性變化"],
    a: 2, why: "月球永遠有一半被太陽照亮。隨著它繞地球公轉，我們從地球看過去的角度改變，看到的亮面比例就跟著變。被地球影子遮住的那個叫月蝕，是另一回事。" },
  { id: "q-synodic", cat: "月亮", ref: "moon-phases",
    q: "從一次「朔」到下一次「朔」，平均要多久？",
    opts: ["約 27.32 天", "約 29.53 天", "約 30.44 天", "剛好 30 天"],
    a: 1, why: "這叫朔望月，平均 29.53 天。27.32 天是恆星月，指月球公轉一圈回到同一顆背景恆星的時間，兩者不一樣。" },
  { id: "q-shuo", cat: "月亮", ref: "new-moon",
    q: "天文學上的「朔」，指的是什麼時刻？",
    opts: ["太陽與月球的黃道經度相差 0°", "月球離地球最近的時刻", "月亮完全看不見的整個晚上", "農曆每個月的初一凌晨"],
    a: 0, why: "「朔」是太陽與月球黃經相差 0° 的那個瞬間，也就是新月。農曆把朔所在的那一天定為初一。" },
  { id: "q-wang", cat: "月亮", ref: "full-moon",
    q: "天文學上的「望」（滿月）是指？",
    opts: ["月亮升起最早的那一天", "太陽與月球黃經相差 180°", "月球正好通過近地點", "農曆十五的整個晚上"],
    a: 1, why: "「望」是太陽與月球黃經相差 180° 的瞬間，此時從地球看月面幾乎全被照亮。" },
  { id: "q-15th", cat: "月亮", ref: "moon-phases",
    q: "為什麼農曆十五不一定是滿月？",
    opts: ["農曆的算法有誤差需要修正", "月球公轉速度不均，從朔走到望要 13.9 至 15.7 天不等", "滿月固定比農曆晚一天出現", "因為各地時區不同"],
    a: 1, why: "月球軌道是橢圓的，近地點快、遠地點慢，所以每一輪從朔走到望所需時間都不一樣。若朔發生在初一稍晚的時刻，滿月就會落到十六甚至十七。" },
  { id: "q-kepler2", cat: "月亮", ref: "supermoon",
    q: "克卜勒第二定律描述的是什麼？",
    opts: ["行星軌道是橢圓，太陽位於其中一個焦點", "行星與太陽的連線在相同時間掃過相同面積", "公轉週期平方正比於軌道半長軸立方", "所有行星都在同一個平面上運行"],
    a: 1, why: "第二定律說的是「等時間掃過等面積」，結果就是近日點跑得快、遠日點跑得慢。第一定律講橢圓軌道，第三定律講週期與半長軸的關係。" },
  { id: "q-supermoon", cat: "月亮", ref: "supermoon",
    q: "超級月亮看起來比較大，是因為？",
    opts: ["地球大氣把月亮放大了", "滿月剛好發生在月球接近近地點時", "月球那幾天真的膨脹了", "太陽照射角度讓它顯得更大"],
    a: 1, why: "月球軌道是橢圓的，近地點比遠地點近了四萬多公里。滿月剛好碰上近地點附近，看起來就更大更亮。" },
  { id: "q-tide", cat: "月亮", ref: "full-moon",
    q: "海洋潮汐主要是什麼造成的？",
    opts: ["地球自轉產生的離心力", "月球的引力，太陽也有較小的貢獻", "季風與洋流", "海水溫度的日夜變化"],
    a: 1, why: "潮汐主要來自月球引力造成的潮汐力，太陽也有影響但大約只有月球的一半。日月連成一線時就是大潮。" },
  { id: "q-solar-eclipse", cat: "天象", ref: "eclipse",
    q: "日蝕只會發生在哪個月相？",
    opts: ["新月", "上弦月", "滿月", "下弦月"],
    a: 0, why: "日蝕是月球跑到太陽與地球之間、擋住太陽，這只有在新月時才可能發生。" },
  { id: "q-lunar-eclipse", cat: "天象", ref: "eclipse",
    q: "月蝕只會發生在哪個月相？",
    opts: ["新月", "滿月", "上弦月", "任何月相都可能"],
    a: 1, why: "月蝕是地球的影子落在月球上，必須地球位於太陽與月球之間，也就是滿月的時候。" },
  { id: "q-why-not-monthly", cat: "天象", ref: "eclipse",
    q: "既然每個月都有新月和滿月，為什麼不是每個月都有日蝕和月蝕？",
    opts: ["因為地球大氣會擋住", "因為月球軌道面與黃道面有約 5 度夾角", "因為月球的距離每個月都不同", "因為需要地球自轉配合"],
    a: 1, why: "月球軌道面與地球繞日的黃道面傾斜約 5 度，多數月份新月或滿月時月球會偏在黃道上方或下方，三者沒有排成一直線。" },
  { id: "q-meteor-source", cat: "天象", ref: "meteor",
    q: "流星雨的碎屑主要來自哪裡？",
    opts: ["小行星帶的碰撞", "彗星（少數為小行星）沿軌道留下的塵埃帶", "月球表面被撞擊噴出的物質", "太陽風帶來的粒子"],
    a: 1, why: "彗星接近太陽時會噴發物質，在軌道上留下一條塵埃帶。地球每年固定時間穿過它，就形成週期性的流星雨。" },
  { id: "q-perseid", cat: "天象", ref: "meteor",
    q: "英仙座流星雨的母彗星是哪一顆？",
    opts: ["哈雷彗星", "斯威夫特－塔特爾彗星（109P）", "恩克彗星", "海爾－博普彗星"],
    a: 1, why: "英仙座流星雨來自 109P/Swift–Tuttle 留下的塵埃帶，每年八月中旬達到極大。" },
  { id: "q-halley-showers", cat: "天象", ref: "meteor",
    q: "獵戶座流星雨與寶瓶座 η 流星雨，都是哪顆彗星的碎屑？",
    opts: ["哈雷彗星", "斯威夫特－塔特爾彗星", "坦普爾－塔特爾彗星", "3I/ATLAS"],
    a: 0, why: "地球一年會兩次穿過哈雷彗星的軌道塵埃帶，五月產生寶瓶座 η 流星雨，十月產生獵戶座流星雨。" },
  { id: "q-radiant", cat: "天象", ref: "meteor",
    q: "流星雨的「輻射點」是什麼意思？",
    opts: ["流星真的從那一點噴出來", "碎屑平行進入大氣，透視效果讓流星看起來像從同一點射出", "那是母彗星此刻所在的位置", "那是流星燃燒最亮的高度"],
    a: 1, why: "碎屑其實是平行前進的。就像筆直的鐵軌在遠方看起來會交會於一點，流星軌跡反向延長也會交於天球上的輻射點。" },
  { id: "q-opposition", cat: "行星", ref: "opposition",
    q: "「行星衝」指的是什麼狀態？",
    opts: ["行星與太陽在天空中同一個方向", "地球位於太陽與該行星之間，行星整夜可見且最亮", "行星運行到軌道最遠處", "兩顆行星在天空中靠得很近"],
    a: 1, why: "衝的時候地球夾在太陽與外行星之間，該行星日落時升起、日出時落下，整夜可見，而且距離最近、最亮。" },
  { id: "q-no-opposition", cat: "行星", ref: "opposition",
    q: "下列哪兩顆行星永遠不會發生「衝」？",
    opts: ["火星與木星", "水星與金星", "土星與天王星", "天王星與海王星"],
    a: 1, why: "水星和金星的軌道在地球內側，地球永遠不可能跑到它們與太陽之間，所以只有內行星特有的「合」，沒有衝。" },
  { id: "q-venus-visibility", cat: "行星", ref: "conjunction",
    q: "為什麼金星只會出現在黎明或黃昏，不會在半夜高掛？",
    opts: ["它太暗了，半夜看不見", "它的軌道在地球內側，離太陽的角距有上限", "它自轉太慢", "它半夜會被地球擋住"],
    a: 1, why: "金星軌道在地球內側，從地球看它與太陽的角距最多約 47 度，所以只能在日出前或日落後的低空出現，因此有「晨星／昏星」之稱。" },
  { id: "q-conjunction", cat: "行星", ref: "conjunction",
    q: "天文上的「合相」是指？",
    opts: ["兩顆天體真的撞在一起", "兩顆天體在天空中看起來靠得很近", "行星運行到軌道最近點", "行星突然變亮"],
    a: 1, why: "合相只是視線方向上的接近。兩顆天體實際距離仍然非常遙遠，只是剛好在我們的視線上排在一起。" },
  { id: "q-retrograde", cat: "行星", ref: "retrograde",
    q: "行星逆行時，它真的在軌道上倒退嗎？",
    opts: ["是，它會短暫反向公轉", "不是，那是地球與該行星相對運動造成的視覺效果", "是，受到太陽磁場影響", "不是，那是望遠鏡的成像誤差"],
    a: 1, why: "行星始終朝同一個方向公轉。當地球在內側超車外行星時，從地球看過去它就像在背景恆星之間短暫向後移動，這是相對運動的視覺效果。" },
  { id: "q-parade", cat: "行星", ref: "planet-parade",
    q: "所謂「行星連珠」，實際上是什麼情況？",
    opts: ["行星在太空中排成一條直線", "數顆行星同時出現在天空同一側、看起來大致排成一線", "行星彼此的引力互相鎖定", "行星軌道暫時重疊"],
    a: 1, why: "行星並沒有真的排成一直線。它們本來就都在接近黃道的平面上運行，只是剛好同一段時間都出現在天空同一側，看起來連成一串。" },
  { id: "q-zodiac", cat: "文化", ref: "zodiac",
    q: "占星使用的黃道十二星座，和天文學上太陽實際經過的星座，關係是？",
    opts: ["完全一致", "因為歲差，兩者已經有明顯偏移", "占星多了一個星座", "天文學不承認星座的存在"],
    a: 1, why: "地球自轉軸會緩慢繞行（歲差），兩千年下來，太陽在某個日期實際所在的星座已經和傳統占星差了大約一個。天文學上太陽實際還會經過蛇夫座。" },
  { id: "q-3iatlas", cat: "天象", ref: "meteor",
    q: "彗星 3I/ATLAS 之所以特別，是因為？",
    opts: ["它是史上最亮的彗星", "它是第三顆確認來自太陽系之外的星際天體", "它即將撞上地球", "它是月球碎裂後形成的"],
    a: 1, why: "3I/ATLAS 於 2025 年 7 月由 NASA 資助的智利 ATLAS 巡天計畫發現，是人類確認的第三顆星際彗星，帶著在別的恆星系統形成的化學成分。" },
  { id: "q-overview", cat: "文化", ref: "zodiac",
    q: "太空人常提到的「綜觀效應」（Overview Effect）是指？",
    opts: ["在無重力環境下產生的暈眩", "從太空看見地球全貌後，對生命與國界產生的認知轉變", "一種望遠鏡的廣角成像技術", "同時觀測多顆行星的方法"],
    a: 1, why: "綜觀效應是許多太空人描述過的心理經驗：從軌道上看見沒有國界、只被一層薄薄大氣包裹的地球之後，對人類處境產生的深刻視角轉變。" },
  { id: "q-kerr", cat: "文化", ref: "zodiac",
    q: "「克爾黑洞」與「史瓦西黑洞」最主要的差別是什麼？",
    opts: ["克爾黑洞會旋轉，史瓦西黑洞不旋轉", "克爾黑洞比較大", "史瓦西黑洞不會吸收光", "克爾黑洞位於銀河系中心"],
    a: 0, why: "史瓦西解描述的是不旋轉、不帶電的黑洞；克爾解描述的是會旋轉的黑洞。現實中的黑洞由旋轉的恆星塌縮而成，因此幾乎都帶有自轉。" },
];

/* ---------- 星塵專欄（Blue 親筆原創，中英對照） ----------
   和 NASA 新聞分開放：api/space-news 回來會整批覆蓋 NEWS，專欄不能被洗掉。
   bodySep 這個字串單獨成段時，閱讀器會畫一條分隔線。
   英國文學式用語（-ise、per cent、full stop 用法），Blue 會同步發到 SNS。 */
const COLUMN_SEP = "———";
const COLUMN = [
  {
    id: "blue-2026-07-fullmoon", date: "2026-07-28", icon: "🌕", author: "Blue", bilingual: true,
    zhTitle: "為何農曆十五卻不是滿月🤔",
    zhSub: "月相想告訴你的浪漫小秘密",
    enTitle: "Why the Fifteenth of the Lunar Month Isn't the Full Moon 🤔",
    enSub: "A romantic little secret the phases of the Moon have been trying to tell you",
    zhBody: [
      "今日為農曆六月十五，但以當代天文學角度，並不是真正的滿月，這種情況在古時更有「望日」之稱，Why？",
      "根據天體運行物理概念，能夠這麼解釋：",
      "一、🌏 地球與月球的軌道是橢圓的：",
      "月球公轉的 RUNWAY、我們所在的天體核心、那條舞台軌道，都不是正圓，because地球本人是橢圓形的；根據克卜勒第二定律（Kepler's second law of planetary motion），月球在繞行地球公轉時，其速度為「近地點快、遠地點慢」，白話文翻譯：月球走到離地球最近時，運行速度較快，而當月亮跟地球距離最遠時，運行速度較慢，這是第一個科學根據。",
      "二、朔望月出現的時機點，並不一致：",
      "「朔月」出現後，至下一輪「朔」的平均日期為 29.53 天，由於月球運行軌道導致公轉速度不一致，每一個「朔望月」的確切時間，大概間隔 29.27 天 ～ 29.83 天，這影響了月球從「朔、新」走到「望、滿」所需的時間；快的時候約為 13.9 天，最慢時可達 15.69 天，在數字上看似只差了一點點，但在陰曆、農曆和月曆上，累積起來會出現間歇性、明顯的差別。",
      "三、農曆/陰曆的初一是怎麼制定的？",
      "以古代人的角度 a.k.a 農曆的規則，當太陽與月球的黃道經度相差 0°，那天即為「初一」，是為朔月，這在許多古文明的曆法中都雷同。",
      "中國農曆規則：當「朔月」在初一子時正刻後、子正一刻時才出現（以目前的時間概念就是 00:01），月亮便具備充足的時間，能在十五日當天「走滿」月途，那本輪的十五就會是「滿月」（但以天體實際測量軌跡，大約是 14.8 天）。",
      "But，倘若「朔月」發生在初一的 23:59（子初四刻與子時正刻的交接點或之前），農曆的十五，月球本身實際上才走了約 13 天的行程，偏慢所以尚未走到與太陽相差 180° 的「望」點，還沒到全面發光，滿月就會延後到農曆十六，甚至是十七日的凌晨，類似本月、此時的情況。",
      "苗栗♡格蘭傑舉手提問：",
      "為什麼人類要硬把「月曆」設定為我們的日期界定？然後現在又換成「日曆」？",
      "為什麼古代人明明知道 23:59 這確切時間，但時刻還是制定成子時（23 點～01 點），再細分也只有八刻鐘（一刻為 15 分鐘）？",
      "辣妹請搶答，老師先不答。",
      COLUMN_SEP,
      "🌊 潮汐是大海受月球引力而產生的現象，人類已視為自然日常，而我們體內有近七成是由水分所組成，你覺得我們不會受到月亮陰晴圓缺的影響嗎？",
      "月球本身沒有亮度，月光是由太陽反射而來，仔細觀察月相盈缺，其實也同時可探索或正視自我陰暗之面。",
      "我們每個人皆自帶光芒，但會反射、折射或吸收的能量強度，其實是你自己可以決定的，因我們的軌道都不相同。",
      COLUMN_SEP,
      "編按：本輪「望、滿月」的精確時刻為台灣時間 2026 年 7 月 29 日 22:35，也就是農曆六月十六。文中所說的「滿月延後到十六」，這一輪就是今天晚上。App 內「宇宙」分頁的新月／滿月節點已全面改以真實朔望時刻計算，並依你裝置所在時區顯示日期。",
    ],
    enBody: [
      "Today is the fifteenth day of the sixth lunar month. By the reckoning of modern astronomy, though, it is not the true full moon — the moment the ancients called wàng (望), the day of gazing. W H Y?",
      "The physics of how bodies move through space explains it like this:",
      "One. 🌏 The Earth's orbit, and the Moon's, are ellipses:",
      "The Moon's orbital RUNWAY — the celestial core we happen to stand on, the stage it circles — is not a perfect circle. By Kepler's second law of planetary motion, the Moon does not travel at a constant speed as it goes round us: it is quick at perigee and slow at apogee. In plain language, when the Moon swings closest to the Earth it moves faster, and when it is furthest away it slows down. That is the first piece of science.",
      "Two. Lunations do not arrive on a fixed timetable:",
      "From one new moon (朔) to the next averages 29.53 days. Because the shape of the orbit makes the Moon's speed uneven, each actual lunation runs somewhere between roughly 29.27 and 29.83 days — and that changes how long the Moon needs to travel from 'new' (朔／新) to 'full' (望／滿). At its quickest, about 13.9 days; at its slowest, as much as 15.69 days. On paper the gap looks like nothing much, but stacked up across a lunar calendar it produces intermittent, unmistakable differences.",
      "Three. How is the first day of the lunar month decided?",
      "From the ancients' point of view — a.k.a. the rule of the lunar calendar — the day on which the ecliptic longitudes of the Sun and the Moon differ by 0° is the first of the month, the day of the new moon. The calendars of many ancient civilisations work in much the same way.",
      "The Chinese lunar rule: if the new moon arrives after the exact centre of the hour of Zi on the first day, in the quarter known as Zi-zheng (00:01, in the way we now tell the time), the Moon has time enough to walk its full path by the fifteenth — and the fifteenth of that cycle will be a full moon (although, measured against the real orbit, that walk takes around 14.8 days).",
      "But: if the new moon falls at 23:59 on the first — at or before the seam between the fourth quarter of Zi-chu and the exact centre of the hour of Zi — then by the fifteenth the Moon has in truth travelled only about 13 days. Running behind, it has not yet reached wàng, the point 180° from the Sun, and is not yet fully alight. The full moon slips to the sixteenth of the lunar month, or even to the small hours of the seventeenth. Rather like this month. Rather like right now.",
      "Miaoli ♡ Granger puts her hand up:",
      "Why did human beings insist on making the lunar calendar the thing that defines our dates? And why have we now swapped it for the solar one?",
      "And why, when the ancients clearly knew a moment as exact as 23:59, did they still set the hours as Zi (23:00–01:00), subdivided no further than eight quarters of fifteen minutes each?",
      "Buzz in, ladies. Teacher isn't answering this one first.",
      COLUMN_SEP,
      "🌊 The tides are what happens when the sea answers the Moon's gravity — something humanity long ago filed away as ordinary nature. Close to seventy per cent of what we are made of is water. Do you really think the Moon's waxing and waning leaves us untouched?",
      "The Moon has no brightness of its own; moonlight is sunlight, returned. Watch the phases closely enough and you are also exploring — and squarely facing — the darker side of yourself.",
      "Every one of us carries our own light. How much of that energy we reflect, refract or absorb, though, is yours to decide. None of us travels the same orbit.",
      COLUMN_SEP,
      "Editor's note: this cycle's true wàng falls at 22:35 Taiwan time on 29 July 2026 — the sixteenth day of the sixth lunar month. The 'full moon slipping to the sixteenth' described above is, this time round, tomorrow night. The new-moon and full-moon markers in the app's Cosmos tab are now calculated from true syzygy times and shown in your own device's time zone.",
    ],
  },
];
const columnById = id => COLUMN.find(c => c.id === id);

/* ---------- 站內通報（新文章／公告推播） ----------
   本 App 沒有推播伺服器，也沒有向使用者收集 push subscription，所以走兩條路：
   1) 已把 App 安裝在 Android 桌面、且允許通知的人 → sw.js 的 periodicsync
      會在背景跳系統通知（和天象提醒同一條管線）。
   2) 其他所有人（含 iOS）→ 下次打開 App 時，這裡跳出通報卡片。
   兩條路都導向同一個領取動作，領過就寫進 settings.broadcasts，不會再跳。 */
const BROADCASTS = [
  {
    id: "2026-07-28-column-01", date: "2026-07-28", icon: "🌕",
    title: "星塵專欄創刊號上線",
    body: "「為何農曆十五卻不是滿月🤔」—Blue自己撰寫的第一篇天文知識文章，就在「宇宙」分頁。",
    reward: "🪐 量子糾纏神奇海螺 ×1",
    rewardNote: "創刊號限定，感謝辣妹，你是第一批走進星塵的人。",
    articleId: "blue-2026-07-fullmoon",
  },
];

function allUpcomingEvents(days = 120) {
  const t = todayStr();
  const limit = new Date(); limit.setDate(limit.getDate() + days);
  const supermoonDates = new Set(ASTRO_EVENTS.filter(e => e.type === "supermoon").map(e => e.date));
  const list = [
    ...ASTRO_EVENTS.map(e => ({ ...e, builtin: true })),
    ...store.data.customEvents,
    // 超級月亮已是更完整的滿月條目，同日的演算法滿月不重複列出
    ...upcomingMoonEvents(days).filter(e => !(e.type === "fullmoon" && supermoonDates.has(e.date))),
  ].filter(e => e.date >= t && fromDstr(e.date) <= limit);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- 語音辨識 ----------
   為什麼之前會一直重複同一句：
   1) Android Chrome 每次 onresult 都會把「已經定案的段落」連同新段落一起重送。
      舊寫法每次從頭累加字串，同一段就被貼上好幾次。
      → 改成以「結果索引 i」為 key 寫進 finals[i]，同一段重送只會覆蓋、永遠不會變兩份。
   2) Android Chrome 其實不支援 continuous：講完一句就會 onend。
      舊寫法整個停掉；使用者再按一次錄音，索引從 0 重來，接著又把同樣的內容寫回去。
      → 改成 onend 時先把這一輪的文字「封存」進 base，再自動開下一輪，
        索引歸零也蓋不掉先前的內容，講多久都不會重複。 */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function attachMic(btn, textarea, { onFinal } = {}) {
  if (!SR) {
    btn.addEventListener("click", () => toast("此瀏覽器不支援即時語音辨識，請點擊輸入框後，用鍵盤上的 🎤 語言輸入鍵"));
    return;
  }
  let rec = null, listening = false, stopping = false;
  let base = "";        // 已封存的文字（先前輪次＋使用者原本打的字）
  let finals = [];      // 這一輪各索引的定案文字，索引即 key
  let emptyRounds = 0;  // 連續空轉次數，用來擋住麥克風權限被拒時的無限重開

  const finish = () => {
    listening = false; stopping = false;
    btn.classList.remove("rec"); btn.dataset.rec = "";
    textarea.value = base;
    if (onFinal) onFinal(textarea.value);
  };

  const startRound = () => {
    rec = new SR();
    rec.lang = "zh-TW"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    finals = [];
    rec.onresult = ev => {
      emptyRounds = 0;
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finals[i] = r[0].transcript;   // 覆蓋而非累加：重送同一段也只留一份
        else interim += r[0].transcript;
      }
      textarea.value = base + finals.join("") + interim;
    };
    rec.onerror = e => {
      // no-speech／aborted 是正常結束；權限被拒才要真的停下來
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopping = true;
        toast("需要麥克風權限才能語音輸入，請在瀏覽器設定中允許");
      }
    };
    rec.onend = () => {
      base += finals.join("");        // 封存這一輪，下一輪索引歸零也不會覆蓋
      finals = [];
      if (!stopping && ++emptyRounds < 8) {
        try { startRound(); return; } catch { /* 開不起來就收工 */ }
      }
      finish();
    };
    rec.start();
  };

  btn.addEventListener("click", () => {
    if (listening) { stopping = true; try { rec.stop(); } catch {} return; }
    base = textarea.value ? textarea.value.replace(/\s+$/, "") + " " : "";
    stopping = false; listening = true; emptyRounds = 0;
    btn.classList.add("rec");
    try { startRound(); } catch { listening = false; btn.classList.remove("rec"); }
  });
}

/* ---------- 關鍵字自動判別（本機啟發式；未來可換 LLM API） ---------- */
const EMOTION_LEX = {
  "恐懼": ["恐怖", "害怕", "可怕", "嚇"], "焦慮": ["焦慮", "緊張", "不安", "擔心"],
  "快樂": ["開心", "快樂", "高興", "興奮", "爽"], "悲傷": ["難過", "悲傷", "哭", "傷心"],
  "困惑": ["奇怪", "困惑", "搞不懂", "莫名"], "平靜": ["平靜", "安心", "放鬆"],
  "憤怒": ["生氣", "憤怒", "火大"],
};
function autoTagText(text) {
  const emotions = Object.keys(EMOTION_LEX).filter(k => EMOTION_LEX[k].some(w => text.includes(w)) || text.includes(k));
  const symbols = store.data.settings.symbols.filter(s => text.includes(s));
  return { emotions, symbols };
}

/* ---------- UI 基礎 ---------- */
function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface-2);border:1px solid var(--line);color:var(--ink);padding:10px 18px;border-radius:12px;z-index:200;font-size:.85rem;max-width:86%;text-align:center";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function modal(html) {
  const mask = document.createElement("div");
  mask.className = "modal-mask";
  mask.innerHTML = `<div class="modal">${html}</div>`;
  mask.addEventListener("click", e => { if (e.target === mask) mask.remove(); });
  $("#modal-root").appendChild(mask);
  return mask;
}
function chipGroup(container, options, selected = [], { multi = true } = {}) {
  container.innerHTML = options.map(o => `<button type="button" class="chip ${selected.includes(o) ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("");
  // onclick（非 addEventListener）：語音辨識結束後會重繪 chips，監聽器不可疊加
  container.onclick = e => {
    const c = e.target.closest(".chip"); if (!c) return;
    if (!multi) $$(".chip", container).forEach(x => x !== c && x.classList.remove("on"));
    c.classList.toggle("on");
  };
}
const chipValues = container => $$(".chip.on", container).map(c => c.dataset.v);

// 每個選到的情緒各自跳出一條 0–100 強度滑桿；分數寫回 scores 物件
function emoScoreRows(container, names, scores, dflt = 60) {
  container.innerHTML = names.map(name => {
    const val = scores[name] ?? dflt;
    return `<div class="slider-row emo-score" data-emo="${esc(name)}">
      <span class="emo-name">${esc(name)}</span>
      <input type="range" min="0" max="100" value="${val}">
      <output>${val}</output></div>`;
  }).join("");
  $$(".emo-score", container).forEach(row => {
    const key = row.dataset.emo, rng = row.querySelector("input"), out = row.querySelector("output");
    scores[key] ??= dflt; // 一被選到就先記下預設分數
    rng.addEventListener("input", () => { out.value = rng.value; scores[key] = +rng.value; });
  });
}

async function photoToDataURL(file, maxDim = 1024) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  URL.revokeObjectURL(url);
  return cv.toDataURL("image/jpeg", 0.82);
}
async function renderPhoto(imgEl, photoId) {
  const data = await idb.get(photoId);
  if (data) imgEl.src = data; else imgEl.remove();
}

/* ---------- 主題（星塵之夜＝預設；暮色微光／綻藍晨霧＝New Version ） ---------- */
const THEMES = {
  night: { name: "星塵之夜", dots: ["#0d0d14", "#8b7ff0", "#e8c874"], meta: "#0d0d14" },
  dusk: { name: "暮色微光", dots: ["#292643", "#e99e75", "#776483"], meta: "#1e1b36" },
  mist: { name: "綻藍晨霧", dots: ["#beceda", "#2b4c59", "#fcdcdc"], meta: "#eef3f7" },
};
function applyTheme(key) {
  const t = THEMES[key] ? key : "night";
  if (t === "night") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]')?.setAttribute("content", THEMES[t].meta);
  return t;
}

/* ---------- 魔法過場特效（純視覺；資料在動畫前就已寫入，點擊可跳過） ---------- */
const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SIGIL_GLYPHS = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "א", "ב", "ג", "ה", "ש"];
/* 顏色主題：金色（顯化）／紫色（Dr Strange Style・開書儀式） */
const SIGIL_THEMES = {
  gold: { ink: "232,200,116", glow: "255,186,64", accent: "196,164,255", spark: "255,214,140", paper: "232,217,176", inkDark: "90,60,20" },
  purple: { ink: "196,164,255", glow: "180,130,255", accent: "245,205,120", spark: "220,190,255", paper: "48,26,84", inkDark: "230,210,255" },
  silver: { ink: "226,236,250", glow: "170,205,240", accent: "255,255,255", spark: "205,228,255", paper: "24,30,44", inkDark: "226,236,250" },
};
function magicFX(mode, caption, done, { finale = "✦", color = "gold", dur } = {}) {
  if (REDUCED_MOTION) { done?.(); return; }
  const DUR = dur || (mode === "pensieve" ? 1900 : 3000);
  const ov = document.createElement("div");
  ov.className = "fx-overlay";
  ov.innerHTML = `<canvas></canvas><p class="fx-caption">${esc(caption)}</p><p class="fx-skip">輕觸跳過</p>`;
  document.body.appendChild(ov);
  const cv = $("canvas", ov), cap = $(".fx-caption", ov);
  if (color === "purple") {
    cap.style.color = "#dcc4ff";
    cap.style.textShadow = "0 0 14px rgba(180,130,255,.7)";
  } else if (color === "silver") {
    cap.style.color = "#e6eefc";
    cap.style.textShadow = "0 0 14px rgba(170,205,240,.8)";
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2 - 30;
  const R = Math.min(W, H) * 0.30;
  let raf, ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf);
    ov.style.opacity = "0";
    setTimeout(() => { ov.remove(); done?.(); }, 240);
  };
  ov.addEventListener("click", finish);
  const t0 = performance.now();

  /* 儲思盆：銀藍絲線螺旋沉入盆心 */
  const threads = Array.from({ length: 70 }, () => ({
    a: Math.random() * Math.PI * 2, r: R * (0.4 + Math.random() * 0.9),
    sp: 0.02 + Math.random() * 0.03, w: 0.6 + Math.random() * 1.4, hue: 215 + Math.random() * 40,
  }));
  function drawPensieve(p) {
    ctx.fillStyle = "rgba(8,8,18,0.28)"; ctx.fillRect(0, 0, W, H);
    const pull = 0.9985 - p * 0.004;
    for (const th of threads) {
      const x1 = cx + Math.cos(th.a) * th.r, y1 = cy + Math.sin(th.a) * th.r * 0.55;
      th.a += th.sp * (1.4 + (1 - th.r / R));
      th.r *= pull;
      if (th.r < 6) th.r = R * (0.6 + Math.random() * 0.7);
      const x2 = cx + Math.cos(th.a) * th.r, y2 = cy + Math.sin(th.a) * th.r * 0.55;
      ctx.strokeStyle = `hsla(${th.hue},80%,80%,${0.25 + 0.5 * (1 - th.r / R)})`;
      ctx.lineWidth = th.w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    g.addColorStop(0, `rgba(183,200,255,${0.18 + 0.25 * Math.sin(p * Math.PI)})`);
    g.addColorStop(1, "rgba(183,200,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.55, R * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* 魔法陣：Dr Strange Style・紫金交織的動態曼陀羅
     多層同心環反向旋轉 → 星形幾何與符文漸次浮現 → 靈光火花四射 → 金／紫光烙印 */
  const theme = SIGIL_THEMES[color] || SIGIL_THEMES.gold;
  const rgba = (c, a) => `rgba(${c},${a})`;
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ph = (p, a, b) => clamp01((p - a) / (b - a)); // 把整體進度映射到 [a,b] 段
  const sparks = [];
  let ignited = false;

  const spawnSpark = (ang, rad, spd, col, grav = -0.006) => {
    if (sparks.length > 150) return;
    sparks.push({
      x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad,
      vx: Math.cos(ang) * spd + (Math.random() - 0.5) * 0.7,
      vy: Math.sin(ang) * spd + (Math.random() - 0.5) * 0.7,
      life: 1, decay: 0.008 + Math.random() * 0.02,
      size: 0.6 + Math.random() * 1.8, col, grav,
    });
  };
  const drawSparks = () => {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += s.grav;
      s.vx *= 0.99; s.vy *= 0.99; s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const rr = s.size * 3, a = s.life * 0.9;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
      g.addColorStop(0, rgba(s.col, a));
      g.addColorStop(0.4, rgba(s.col, a * 0.5));
      g.addColorStop(1, rgba(s.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2); ctx.fill();
    }
  };

  // 漸進圓環
  const ring = (r, lw, col, prog, glow, from = -Math.PI / 2) => {
    if (prog <= 0) return;
    ctx.lineWidth = lw; ctx.strokeStyle = col;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(cx, cy, r, from, from + prog * Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  };
  // 環上放射刻度（細密曼陀羅感；每三格一長刻）
  const ticks = (r, n, len, col, prog) => {
    if (prog <= 0) return;
    ctx.lineWidth = 1; ctx.strokeStyle = col;
    const show = Math.floor(prog * n);
    for (let i = 0; i < show; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a);
      const l = (i % 3 === 0) ? len * 1.9 : len;
      ctx.beginPath();
      ctx.moveTo(cx + c * r, cy + s * r); ctx.lineTo(cx + c * (r + l), cy + s * (r + l)); ctx.stroke();
    }
  };
  // 漸進星形多邊形 {n/step}（依跳點順序連線）
  const starPoly = (r, n, step, rot, col, prog, glow) => {
    if (prog <= 0) return;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + ((i * step) % n) * 2 * Math.PI / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    ctx.lineWidth = 1.3; ctx.strokeStyle = col;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 9; }
    const drawn = prog * n;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const q = clamp01(drawn - i); if (q <= 0) break;
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      ctx.lineTo(p0[0] + (p1[0] - p0[0]) * q, p0[1] + (p1[1] - p0[1]) * q);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
  };
  // 漸進三角（六芒星用兩個）
  const triAt = (r, rot, col, prog, glow) => {
    if (prog <= 0) return;
    const pts = [0, 1, 2].map(i => [cx + r * Math.cos(rot + i * 2 * Math.PI / 3), cy + r * Math.sin(rot + i * 2 * Math.PI / 3)]);
    ctx.lineWidth = 1.3; ctx.strokeStyle = col;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 8; }
    const drawn = prog * 3;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < 3; i++) {
      const q = clamp01(drawn - i); if (q <= 0) break;
      const p0 = pts[i], p1 = pts[(i + 1) % 3];
      ctx.lineTo(p0[0] + (p1[0] - p0[0]) * q, p0[1] + (p1[1] - p0[1]) * q);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
  };
  // 蓮花瓣環
  const petals = (r, n, col, prog) => {
    if (prog <= 0) return;
    ctx.lineWidth = 1; ctx.strokeStyle = col;
    const show = prog * n;
    for (let i = 0; i < n; i++) {
      if (show - i <= 0) break;
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.52, r * 0.2, a, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  function drawSigil(p) {
    const burning = p > 0.8;
    // 背景：暗色拖影（煙霧與能量殘影）／烙印時的羊皮紙浮現
    if (burning) {
      const a = ph(p, 0.8, 1);
      ctx.fillStyle = rgba(theme.paper, a * 0.94); ctx.fillRect(0, 0, W, H);
      cap.textContent = `${finale} 烙印完成`;
    } else {
      ctx.fillStyle = "rgba(8,6,16,0.34)"; ctx.fillRect(0, 0, W, H);
    }

    const mainC = burning ? theme.inkDark : theme.ink;
    const accC = burning ? theme.inkDark : theme.accent;
    const glowMain = burning ? rgba(theme.glow, 0.9) : rgba(theme.ink, 0.85);
    const glowAcc = rgba(theme.accent, 0.7);

    // 中央能量核心光暈（呼吸脈動）
    const pulse = 0.5 + 0.5 * Math.sin(p * Math.PI * 7);
    const coreA = burning ? ph(1 - p, 0, 0.2) * 0.35 : 0.1 + 0.15 * pulse;
    if (coreA > 0.002) {
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.7 + 0.3 * pulse));
      cg.addColorStop(0, rgba(theme.glow, coreA));
      cg.addColorStop(0.45, rgba(theme.accent, coreA * 0.45));
      cg.addColorStop(1, rgba(theme.glow, 0));
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    }

    const spin = p * 1.1;

    // === 外層（順時針）：外環＋刻度＋十二芒星＋符文 ===
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(spin); ctx.translate(-cx, -cy);
    ring(R, 2, rgba(mainC, 0.95), ph(p, 0, 0.22), glowMain);
    ring(R * 0.94, 1, rgba(accC, 0.75), ph(p, 0.06, 0.28), glowAcc);
    ticks(R * 0.94, 60, R * 0.03, rgba(accC, 0.8), ph(p, 0.1, 0.34));
    starPoly(R * 0.86, 12, 5, 0, rgba(mainC, 0.9), ph(p, 0.24, 0.5), glowMain);
    const gp = ph(p, 0.3, 0.56); // 符文環（行星＋希伯來字）隨曼陀羅旋轉
    ctx.font = `${Math.round(R * 0.11)}px system-ui`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = glowMain; ctx.shadowBlur = burning ? 14 : 6;
    SIGIL_GLYPHS.forEach((g, i) => {
      const alpha = clamp01(gp * SIGIL_GLYPHS.length - i); if (!alpha) return;
      const ang = -Math.PI / 2 + i * 2 * Math.PI / SIGIL_GLYPHS.length;
      ctx.fillStyle = rgba(mainC, alpha * 0.95);
      ctx.fillText(g, cx + R * 0.9 * Math.cos(ang), cy + R * 0.9 * Math.sin(ang));
    });
    ctx.shadowBlur = 0;
    ctx.restore();

    // === 內層（逆時針）：內環＋六芒星＋蓮花瓣 ===
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-spin * 1.5); ctx.translate(-cx, -cy);
    ring(R * 0.66, 1.4, rgba(mainC, 0.85), ph(p, 0.14, 0.34), glowMain);
    ticks(R * 0.66, 36, R * 0.022, rgba(accC, 0.7), ph(p, 0.2, 0.4));
    const hx = ph(p, 0.36, 0.6); // 六芒星：金／紫兩個三角交疊
    triAt(R * 0.55, -Math.PI / 2, rgba(accC, 0.9), hx, glowAcc);
    triAt(R * 0.55, Math.PI / 2, rgba(mainC, 0.9), hx, glowMain);
    petals(R * 0.32, 8, rgba(accC, 0.55), ph(p, 0.5, 0.74));
    ring(R * 0.2, 1, rgba(mainC, 0.7), ph(p, 0.4, 0.6), glowMain);
    ctx.restore();

    // === 中央符印 ===
    const cf = ph(p, 0.6, 0.8);
    if (cf > 0) {
      ctx.save();
      ctx.font = `${Math.round(R * 0.26)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = rgba(theme.glow, 1); ctx.shadowBlur = 20 * cf;
      ctx.fillStyle = rgba(burning ? theme.inkDark : theme.glow, cf);
      ctx.fillText(finale, cx, cy);
      ctx.restore();
    }

    // === 火花／餘燼 ===
    if (!burning) {
      if (p > 0.05) {
        const em = 1 + Math.floor(pulse * 2);
        for (let k = 0; k < em; k++) {
          const a = Math.random() * Math.PI * 2;
          spawnSpark(a, R * (0.55 + Math.random() * 0.42), 0.6 + Math.random() * 1.2,
            Math.random() > 0.5 ? theme.spark : theme.accent);
        }
      }
    } else if (!ignited) {
      ignited = true; // 點燃瞬間向外爆發
      for (let k = 0; k < 80; k++) {
        const a = Math.random() * Math.PI * 2;
        spawnSpark(a, R * 0.5, 2 + Math.random() * 4,
          Math.random() > 0.4 ? theme.spark : theme.glow, 0.02);
      }
    }
    if (burning) { // 點燃衝擊波
      const sw = ph(p, 0.8, 0.96);
      ring(R * (0.9 + sw * 1.4), 2.5, rgba(theme.glow, (1 - sw) * 0.8), 1, rgba(theme.glow, 0.8));
    }
    drawSparks();
  }

  /* 召喚陣：與開書的紫金曼陀羅不同構造—方中有圓、八芒星、四方節點與外圈符文弧，
     以銀白色線條由外而內收攏，最後在中心凝聚成一點光。 */
  const SUMMON_NODES = 8;
  function drawSummonSigil(p) {
    ctx.fillStyle = "rgba(6,9,16,0.30)"; ctx.fillRect(0, 0, W, H);
    const mainC = theme.ink, accC = theme.accent;
    const glowMain = rgba(theme.glow, 0.9);
    const pulse = 0.5 + 0.5 * Math.sin(p * Math.PI * 8);

    // 中心冷光核心
    const coreA = 0.08 + 0.16 * pulse + ph(p, 0.75, 1) * 0.5;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.5 + 0.5 * pulse));
    cg.addColorStop(0, rgba(theme.glow, coreA));
    cg.addColorStop(1, rgba(theme.glow, 0));
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

    // 外圈：兩道反向旋轉的斷弧（不是完整圓，和開書的實心雙環明顯不同）
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(p * 0.9); ctx.translate(-cx, -cy);
    const arcQ = ph(p, 0, 0.3);
    ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(mainC, 0.9);
    ctx.shadowColor = glowMain; ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i++) {
      const a0 = i * Math.PI / 2 + 0.18;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + (Math.PI / 2 - 0.36) * arcQ); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 內圈：反向旋轉的細弧
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-p * 1.4); ctx.translate(-cx, -cy);
    const arcQ2 = ph(p, 0.1, 0.4);
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(accC, 0.6);
    for (let i = 0; i < 6; i++) {
      const a0 = i * Math.PI / 3 + 0.1;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.88, a0, a0 + (Math.PI / 3 - 0.2) * arcQ2); ctx.stroke();
    }
    ctx.restore();

    // 方中有圓：兩個相疊的正方形（旋轉 45°）
    const sq = ph(p, 0.18, 0.48);
    if (sq > 0) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(p * 0.5); ctx.translate(-cx, -cy);
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(mainC, 0.85);
      ctx.shadowColor = glowMain; ctx.shadowBlur = 8;
      for (const rot of [0, Math.PI / 4]) {
        const r = R * 0.7;
        const pts = [0, 1, 2, 3].map(i => [cx + r * Math.cos(rot + i * Math.PI / 2), cy + r * Math.sin(rot + i * Math.PI / 2)]);
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < 4; i++) {
          const q = clamp01(sq * 4 - i); if (q <= 0) break;
          const a = pts[i], b = pts[(i + 1) % 4];
          ctx.lineTo(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 八芒星 {8/3}
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-p * 0.7); ctx.translate(-cx, -cy);
    starPoly(R * 0.6, 8, 3, 0, rgba(accC, 0.85), ph(p, 0.34, 0.66), rgba(theme.glow, 0.8));
    ctx.restore();

    // 四方／八方節點：向內收攏的光點與連心細線
    const nq = ph(p, 0.45, 0.8);
    if (nq > 0) {
      for (let i = 0; i < SUMMON_NODES; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / SUMMON_NODES + p * 0.6;
        const rr = R * (1 - 0.45 * ph(p, 0.6, 1)); // 隨進度往中心收
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        const alpha = clamp01(nq * SUMMON_NODES - i);
        if (alpha <= 0) continue;
        ctx.strokeStyle = rgba(accC, alpha * 0.35); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        const ng = ctx.createRadialGradient(x, y, 0, x, y, R * 0.07);
        ng.addColorStop(0, rgba(theme.accent, alpha));
        ng.addColorStop(1, rgba(theme.accent, 0));
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x, y, R * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 外圈符文
    const gq = ph(p, 0.5, 0.8);
    if (gq > 0) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(p * 0.9); ctx.translate(-cx, -cy);
      ctx.font = `${Math.round(R * 0.1)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = glowMain; ctx.shadowBlur = 6;
      SIGIL_GLYPHS.forEach((g, i) => {
        const alpha = clamp01(gq * SIGIL_GLYPHS.length - i); if (!alpha) return;
        const ang = -Math.PI / 2 + i * 2 * Math.PI / SIGIL_GLYPHS.length;
        ctx.fillStyle = rgba(mainC, alpha * 0.8);
        ctx.fillText(g, cx + R * 1.08 * Math.cos(ang), cy + R * 1.08 * Math.sin(ang));
      });
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 中央海螺符號浮現
    const cf = ph(p, 0.62, 0.88);
    if (cf > 0) {
      ctx.save();
      ctx.font = `${Math.round(R * 0.3)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = rgba(theme.glow, 1); ctx.shadowBlur = 26 * cf;
      ctx.fillStyle = rgba(theme.accent, cf);
      ctx.fillText(finale, cx, cy);
      ctx.restore();
    }

    // 銀色火花與收束衝擊波
    if (p > 0.08 && p < 0.9) {
      const a = Math.random() * Math.PI * 2;
      spawnSpark(a, R * (0.7 + Math.random() * 0.35), -0.4 - Math.random() * 0.8, theme.spark);
    }
    if (p > 0.88 && !ignited) {
      ignited = true;
      for (let k = 0; k < 60; k++) {
        const a = Math.random() * Math.PI * 2;
        spawnSpark(a, R * 0.25, 1.6 + Math.random() * 3.2, Math.random() > 0.5 ? theme.spark : theme.accent, 0.01);
      }
    }
    if (p > 0.88) {
      const sw = ph(p, 0.88, 1);
      ring(R * (0.3 + sw * 1.3), 2, rgba(theme.glow, (1 - sw) * 0.85), 1, rgba(theme.glow, 0.9));
    }
    drawSparks();
  }

  const DRAW = { pensieve: drawPensieve, summon: drawSummonSigil };
  (function frame(now) {
    const p = Math.min((now - t0) / DUR, 1);
    (DRAW[mode] || drawSigil)(p);
    if (p >= 1) return finish();
    raf = requestAnimationFrame(frame);
  })(t0);
}

/* ---------- 動態宇宙星空（Book of Shadows 背景：不同亮度的星光閃爍＋星雲＋流星＋互動漩渦） ----------
   把原本 8 顆固定 CSS 星點換成 canvas 星海：每顆星有不同亮度、色溫與呼吸閃爍，
   亮星附帶繞射星芒；緩慢漂移的星雲與偶發流星讓宇宙「活」起來。
   觸控／滑鼠移動時，鄰近星星會被磁力吸引並產生漩渦擾動，隨距離越近而摩擦生光、越亮。
   回傳 stop() 供離開時停止動畫與移除監聽。 */
function startCosmos(cv) {
  if (!cv || !cv.getContext) return null;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  // 星色盤：白、暖金、淡紫、冷藍、琥珀
  const PALETTE = ["255,255,255", "255,242,214", "214,196,255", "188,210,255", "255,220,180"];
  // 互動漩渦參數（座標系與星星一致，皆已乘上 dpr）
  const MAGNETIC_RADIUS = 260 * dpr, PULL_STRENGTH = 0.1 * dpr, VORTEX_STRENGTH = 0.5 * dpr;
  let W, H, stars = [], nebulae = [], shooters = [], raf = null, t = 0;
  const pointer = { x: -9999, y: -9999, active: false };

  const build = () => {
    const count = Math.min(440, Math.round((innerWidth * innerHeight) / 3600));
    stars = Array.from({ length: Math.max(80, count) }, () => {
      const b = Math.pow(Math.random(), 2.2); // 亮度分布：暗星多、亮星稀
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: (0.35 + b * 2.1) * dpr, base: 0.2 + b * 0.8,
        tw: Math.random() * Math.PI * 2, tws: 0.006 + Math.random() * 0.035,
        col: PALETTE[Math.random() < 0.55 ? 0 : 1 + Math.floor(Math.random() * (PALETTE.length - 1))],
        dx: (Math.random() - 0.5) * 0.03 * dpr, dy: (0.01 + Math.random() * 0.03) * dpr,
        vx: 0, vy: 0, glow: 0,
        spike: b > 0.82,
      };
    });
    nebulae = [
      { x: W * 0.28, y: H * 0.32, r: Math.max(W, H) * 0.55, col: "92,52,150", a: 0.1, ph: 0 },
      { x: W * 0.75, y: H * 0.68, r: Math.max(W, H) * 0.5, col: "40,60,140", a: 0.08, ph: 2 },
      { x: W * 0.6, y: H * 0.14, r: Math.max(W, H) * 0.42, col: "150,80,170", a: 0.06, ph: 4 },
    ];
  };
  const resize = () => {
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    build();
  };
  const drawNebula = (n) => {
    const a = n.a * (0.7 + 0.3 * Math.sin(t * 0.0006 + n.ph));
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, `rgba(${n.col},${a})`); g.addColorStop(1, `rgba(${n.col},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const drawStar = (s) => {
    // 磁力漩渦：靠近指標時吸引＋切線方向擾動，並隨接近程度累積「摩擦光暈」
    const mx = pointer.x - s.x, my = pointer.y - s.y;
    const mdist = Math.hypot(mx, my);
    if (pointer.active && mdist < MAGNETIC_RADIUS && mdist > 0.01) {
      const force = (MAGNETIC_RADIUS - mdist) / MAGNETIC_RADIUS;
      s.vx += (mx / mdist) * force * PULL_STRENGTH;
      s.vy += (my / mdist) * force * PULL_STRENGTH;
      s.vx += (my / mdist) * force * VORTEX_STRENGTH;
      s.vy -= (mx / mdist) * force * VORTEX_STRENGTH;
      s.glow = Math.min(1, s.glow + force * 0.25);
    } else {
      s.glow *= 0.93;
    }
    s.vx *= 0.94; s.vy *= 0.94;

    const tw = s.base * (0.55 + 0.45 * Math.sin(s.tw));
    const boosted = Math.min(1, tw + s.glow * 0.85);
    const rr = s.r * (2.4 + 1.2 * Math.sin(s.tw)) * (1 + s.glow * 0.9);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
    g.addColorStop(0, `rgba(${s.col},${boosted})`);
    g.addColorStop(0.5, `rgba(${s.col},${boosted * 0.25})`);
    g.addColorStop(1, `rgba(${s.col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2); ctx.fill();
    if (s.glow > 0.06) { // 摩擦生光：漩渦中額外的冷光暈
      const gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr * 2.4);
      gg.addColorStop(0, `rgba(190,225,255,${s.glow * 0.5})`);
      gg.addColorStop(1, "rgba(190,225,255,0)");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(s.x, s.y, rr * 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = `rgba(${s.col},${Math.min(1, boosted + 0.2)})`; // 星芯
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2); ctx.fill();
    if (s.spike && boosted > 0.5) { // 亮星繞射星芒
      const L = s.r * (6 + s.glow * 5) * boosted;
      ctx.strokeStyle = `rgba(${s.col},${(boosted - 0.5) * 0.7})`; ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
      ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L); ctx.stroke();
    }
    s.tw += s.tws;
    s.x += s.dx + s.vx; s.y += s.dy + s.vy;
    if (s.y - rr > H) { s.y = -rr; s.x = Math.random() * W; }
    if (s.y + rr < 0) s.y = H + rr;
    if (s.x - rr > W) s.x = -rr; else if (s.x + rr < 0) s.x = W + rr;
  };
  const drawShooter = (m) => {
    m.x += m.vx; m.y += m.vy; m.life -= 0.012;
    const inv = 1 / Math.hypot(m.vx, m.vy), tail = 80 * dpr;
    const ex = m.x - m.vx * inv * tail, ey = m.y - m.vy * inv * tail;
    const g = ctx.createLinearGradient(m.x, m.y, ex, ey);
    g.addColorStop(0, `rgba(255,248,224,${m.life})`); g.addColorStop(1, "rgba(255,248,224,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(ex, ey); ctx.stroke();
  };
  const paint = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter"; // 疊加光暈更有宇宙感
    nebulae.forEach(drawNebula);
    stars.forEach(drawStar);
    if (Math.random() < 0.004) {
      shooters.push({ x: Math.random() * W, y: -20, vx: (2 + Math.random() * 3) * dpr * (Math.random() < 0.5 ? 1 : -1), vy: (5 + Math.random() * 4) * dpr, life: 1 });
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      drawShooter(shooters[i]);
      if (shooters[i].life <= 0 || shooters[i].y > H + 40) shooters.splice(i, 1);
    }
    ctx.globalCompositeOperation = "source-over";
  };
  const frame = () => { t += 16; paint(); raf = requestAnimationFrame(frame); };

  const onPointerMove = e => { pointer.x = e.clientX * dpr; pointer.y = e.clientY * dpr; pointer.active = true; };
  const onTouchMove = e => {
    if (e.touches[0]) { pointer.x = e.touches[0].clientX * dpr; pointer.y = e.touches[0].clientY * dpr; pointer.active = true; }
  };
  const onPointerLeave = () => { pointer.active = false; };

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onPointerLeave);
  window.addEventListener("mouseleave", onPointerLeave);
  if (REDUCED_MOTION) { paint(); } // 靜態一幀即可（不啟用互動漩渦）
  else frame();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onPointerLeave);
    window.removeEventListener("mouseleave", onPointerLeave);
  };
}

/* ---------- 分頁切換 ---------- */
const VIEWS = {
  today: renderToday, dream: renderDream, cbt: renderCBT, moon: renderMoon,
  crystal: () => renderCrystal(), cosmos: renderCosmos, summon: renderSummon,
  more: renderMore, settings: renderSettings,
};
let currentTab = "today";
function switchTab(tab) {
  if (!VIEWS[tab]) tab = "today";
  const changed = tab !== currentTab;
  currentTab = tab;
  $$(".tabbar button").forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    if (on && changed) b.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  });
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${tab}`).classList.add("active");
  if (tab !== "summon") stopAltar(); // 離開召喚頁就停掉雲層動畫
  VIEWS[tab]();
  window.scrollTo({ top: 0 });
  if (changed && !REDUCED_MOTION && Math.random() < METEOR_SHOWER_CHANCE) meteorShowerFX();
}

/* ---------- 🌠 流星雨彩蛋 ----------
   切換分頁時 METEOR_SHOWER_CHANCE 機率觸發：整個畫面被流星雨蓋版 METEOR_DURATION_MS，
   讓使用者真的放下手機許願；期間持續有流星劃過。
   出現後再以 METEOR_FRAGMENT_CHANCE 的機率掉落一片隨機碎片（機率不寫在公開文案裡）。 */
const METEOR_DURATION_MS = 10000;
const METEOR_SKIP_AFTER_MS = 3000;
function meteorShowerFX() {
  if (document.querySelector(".meteor-fx")) return; // 避免重疊觸發
  const ov = document.createElement("div");
  ov.className = "meteor-fx";
  ov.innerHTML = `
    <canvas></canvas>
    <div class="meteor-copy">
      <p class="mc-1">🌠 流星雨出現了！</p>
      <p class="mc-2">趕快放下手機🙏雙手合十</p>
      <p class="mc-3">快速許下一個心願。</p>
    </div>
    <div class="meteor-foot">
      <div class="meteor-ring"><svg viewBox="0 0 44 44"><circle class="mr-bg" cx="22" cy="22" r="19"/><circle class="mr-fg" cx="22" cy="22" r="19"/></svg><b id="mtr-n">${Math.ceil(METEOR_DURATION_MS / 1000)}</b></div>
      <button type="button" class="meteor-skip hidden" id="mtr-skip">先跳過</button>
    </div>`;
  document.body.appendChild(ov);
  document.documentElement.classList.add("meteor-open");

  const cv = $("canvas", ov);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = innerWidth, H = innerHeight;
  const ctx = cv.getContext("2d");
  const sizeCanvas = () => {
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  sizeCanvas();
  addEventListener("resize", sizeCanvas);

  const ANG = () => (58 + Math.random() * 22) * Math.PI / 180; // 右上往左下的斜角軌跡
  const spawn = (stagger = 0) => ({
    sx: Math.random() * W * 1.45 - W * 0.2, sy: -40 - Math.random() * H * 0.5,
    ang: ANG(),
    speed: (0.5 + Math.random() * 0.5) * (Math.max(W, H) / 900),
    born: performance.now() + stagger,
    life: 1200 + Math.random() * 900,
    trail: 70 + Math.random() * 120,
    w: 1.4 + Math.random() * 1.6,
  });
  let meteors = Array.from({ length: 18 }, (_, i) => spawn(i * 90 + Math.random() * 200));
  // 背景星點，讓蓋版畫面不至於空洞
  const bgStars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.5 + 0.15,
    tw: Math.random() * Math.PI * 2, tws: 0.01 + Math.random() * 0.03,
  }));

  const t0 = performance.now();
  let raf, ended = false;
  const nEl = $("#mtr-n", ov), ringFg = $(".mr-fg", ov);
  const CIRC = 2 * Math.PI * 19;
  ringFg.style.strokeDasharray = CIRC;

  // 掉落碎片（機率刻意不寫在公開文案）：先結算，等蓋版收掉才報喜，
  // 否則 toast（z-index 200）會被流星雨蓋版（z-index 480）壓在底下看不到。
  let announceReward = null;
  if (Math.random() < METEOR_FRAGMENT_CHANCE) {
    const { key, merged } = awardShellFragment();
    store.save();
    const info = SHELL_BY_KEY[key];
    announceReward = () => {
      toast(`🐚 願望被聽見了！獲得「${info.emoji}${info.name}神奇海螺碎片」×1`);
      if (merged) setTimeout(() => toast(`✨ 碎片集滿，合成一顆完整的${info.emoji}${info.name}神奇海螺！`), 1800);
    };
  }

  const finish = () => {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", sizeCanvas);
    ov.style.opacity = "0";
    document.documentElement.classList.remove("meteor-open");
    setTimeout(() => ov.remove(), 400);
    if (announceReward) setTimeout(announceReward, 500);
  };

  const frame = now => {
    const t = now - t0;
    const p = Math.min(t / METEOR_DURATION_MS, 1);
    const fadeIn = Math.min(t / 500, 1);
    const fadeOut = Math.min((METEOR_DURATION_MS - t) / 700, 1);
    const veil = fadeIn * Math.max(fadeOut, 0);

    // 全面蓋版的夜空
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgba(6,7,20,${veil})`);
    bg.addColorStop(0.55, `rgba(9,8,26,${veil})`);
    bg.addColorStop(1, `rgba(4,4,12,${veil})`);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    for (const s of bgStars) {
      s.tw += s.tws;
      const a = s.a * (0.55 + 0.45 * Math.sin(s.tw)) * veil;
      ctx.fillStyle = `rgba(255,255,245,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < meteors.length; i++) {
      const m = meteors[i];
      const lt = now - m.born;
      if (lt < 0) continue;
      if (lt > m.life) { // 回收再利用，維持整段時間都有流星
        if (t < METEOR_DURATION_MS - 1500) meteors[i] = spawn(Math.random() * 500);
        continue;
      }
      const fade = (1 - lt / m.life) * veil;
      const dist = lt * m.speed;
      const x = m.sx - Math.cos(m.ang) * dist, y = m.sy + Math.sin(m.ang) * dist;
      const tx = x + Math.cos(m.ang) * m.trail, ty = y - Math.sin(m.ang) * m.trail;
      const g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, `rgba(255,250,230,${fade})`);
      g.addColorStop(1, "rgba(255,250,230,0)");
      ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      const hg = ctx.createRadialGradient(x, y, 0, x, y, 7);
      hg.addColorStop(0, `rgba(255,255,250,${fade})`);
      hg.addColorStop(1, "rgba(255,255,250,0)");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }

    const left = Math.ceil((METEOR_DURATION_MS - t) / 1000);
    if (nEl.textContent !== String(Math.max(left, 0))) nEl.textContent = String(Math.max(left, 0));
    ringFg.style.strokeDashoffset = String(CIRC * p);

    if (t >= METEOR_DURATION_MS) return finish();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  // METEOR_SKIP_AFTER_MS 之後才給跳過，讓許願的儀式感有機會發生
  const skipBtn = $("#mtr-skip", ov);
  setTimeout(() => skipBtn.classList.remove("hidden"), METEOR_SKIP_AFTER_MS);
  skipBtn.addEventListener("click", finish);
}

/* ================= 今天 ================= */
/* 時段問候語（台灣繁中；英文每次開啟輪替，順便學片語） */
const GREETINGS = [
  // [起始小時, 中, [英文選項…], icon]
  [0,  "夜已深，早點睡", [
    "Sweet dreams",
    "Off to dreamland",
    "The night is quiet",
    "May the stars watch over you",
  ], "🌌"],
  [5,  "早安", [
    "Good morning",
    "Rise and shine",
    "Top of the morning",
    "A new day begins",
    "Wake up and greet the sun",
  ], "🌅"],
  [12, "午安", [
    "Good afternoon",
    "Hope your day's going well",
    "Halfway through the day",
    "Keep going, you're doing great",
  ], "☀️"],
  [17, "今天過得還好嗎？", [
    "Good evening",
    "How was your day",
    "The stars are coming out",
    "Time to slow down",
  ], "🌇"],
  [20, "晚安", [
    "Good night",
    "Rest well tonight",
    "Time to wind down",
    "Sleep tight",
    "Under the same sky",
  ], "🌙"],
];
function currentGreeting() {
  const h = new Date().getHours();
  let slot = GREETINGS[0];
  for (let i = GREETINGS.length - 1; i >= 0; i--) if (h >= GREETINGS[i][0]) { slot = GREETINGS[i]; break; }
  const [, zh, enList, icon] = slot;
  const en = enList[Math.floor(Math.random() * enList.length)];
  return [slot[0], zh, en, icon];
}

function openNicknameForm() {
  const cur = store.data.settings.nickname || "";
  const m = modal(`
    <h3>✨ 你希望宇宙怎麼稱呼你？</h3>
    <p class="muted small">這個名字只存在這裡，是你與星塵夢汐之間的秘密，留白也沒關係。</p>
    <label class="field">暱稱</label>
    <input type="text" id="nk-input" maxlength="20" placeholder="南港Lisa、中和李孝利" value="${esc(cur)}">
    <div class="btn-row">
      <button class="btn" id="nk-save">存起來</button>
      ${cur ? `<button class="btn secondary" id="nk-clear">不設定</button>` : `<button class="btn secondary" id="nk-cancel">先跳過</button>`}
    </div>`);
  const input = $("#nk-input", m);
  setTimeout(() => input.focus(), 60);
  $("#nk-save", m).addEventListener("click", () => {
    store.data.settings.nickname = input.value.trim();
    store.save(); m.remove(); if (currentTab === "today") renderToday();
  });
  $("#nk-clear", m)?.addEventListener("click", () => {
    store.data.settings.nickname = ""; store.save(); m.remove(); if (currentTab === "today") renderToday();
  });
  $("#nk-cancel", m)?.addEventListener("click", () => m.remove());
}

/* ================= Book of Shadows 首頁：個人專屬魔法書 =================
   每次進 App 都會出現這頁，像翻開自己的魔法書；輸入暱稱後以紫色魔法陣過場。
   點右上「跳過」可略過整個儀式（設定會記住，之後直接進本文）。 */
function openBookLanding({ force = false } = {}) {
  const el = document.getElementById("book-landing");
  if (!el) return;
  const nickname = store.data.settings.nickname || "";
  el.classList.remove("hidden");
  el.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("book-open");
  el.innerHTML = `
    <canvas class="book-stars" aria-hidden="true"></canvas>
    <button type="button" class="book-skip" id="book-skip" aria-label="跳過">跳過 ›</button>
    <div class="book-cover">
      <div class="book-runes">✧ ⋆ ˚ ⋆ ✦ ⋆ ˚ ✧</div>
      <div class="book-crest">
        <svg viewBox="0 0 120 120" role="img" aria-label="魔法書封印解除" style="width:118px;height:118px">
          <defs>
            <radialGradient id="bc-g" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stop-color="#f6ecff" stop-opacity=".95"/>
              <stop offset="65%" stop-color="#c4a4ff" stop-opacity=".7"/>
              <stop offset="100%" stop-color="#5b3aa0" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#c4a4ff" stroke-width="1.5" opacity=".85"/>
          <circle cx="60" cy="60" r="42" fill="none" stroke="#e9d9ff" stroke-width="1" opacity=".7"/>
          <path d="M60 20 L96 74 L24 74 Z" fill="none" stroke="#f2e6ff" stroke-width="1.3" opacity=".85"/>
          <path d="M60 100 L24 46 L96 46 Z" fill="none" stroke="#f2e6ff" stroke-width="1.3" opacity=".85"/>
          <circle cx="60" cy="60" r="10" fill="url(#bc-g)"/>
          <text x="60" y="63" text-anchor="middle" font-size="12" fill="#f6ecff" font-family="serif">✦</text>
        </svg>
      </div>
      <h1 class="book-title">Book of Shadows</h1>
      <p class="book-sub">星塵夢汐，你的專屬魔法書</p>
      ${nickname
        ? `<p class="book-hi">歡迎回來，<b>${esc(nickname)}</b></p>
           <div class="book-actions">
             <button class="btn book-open-btn" id="book-open">✨ 打開魔法書</button>
             <button class="btn secondary" id="book-editname">✎ 改個名字</button>
           </div>`
        : `<label class="field book-label">你希望宇宙怎麼稱呼你？</label>
           <input type="text" id="book-nick" maxlength="20" placeholder="南港Lisa、中和李孝利" autocomplete="off">
           <div class="book-actions">
             <button class="btn book-open-btn" id="book-open">✨寫上姓名，締結契約，解除封印。<br>開啟魔法書</button>
           </div>`}
      <p class="book-foot">此書只專屬於你．紀錄僅存於此裝置帳號</p>
    </div>`;

  const stopCosmos = startCosmos(el.querySelector(".book-stars")); // 啟動動態宇宙背景

  const closeBook = () => {
    stopCosmos?.();
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("book-open");
    el.innerHTML = "";
  };
  const enterApp = () => {
    magicFX("sigil", "🔮 開啟你的個人魔法書⋯", () => {
      closeBook();
      switchTab("today");
      settleReferral(); // 若是透過好友邀請連結進來的，啟動後雙方各得一片碎片
    }, { color: "purple", finale: "🔮", dur: 2900 });
  };

  $("#book-skip").addEventListener("click", () => {
    store.data.settings.skipBook = true;
    store.save();
    closeBook();
    switchTab(currentTab || "today");
  });
  $("#book-open").addEventListener("click", () => {
    const nkInput = $("#book-nick");
    if (nkInput) {
      const v = nkInput.value.trim();
      if (v) store.data.settings.nickname = v;
      store.save();
    }
    enterApp();
  });
  $("#book-editname")?.addEventListener("click", () => {
    closeBook();
    openNicknameForm();
    // 修改完再啟動一次魔法書
    const check = setInterval(() => {
      if (!document.querySelector(".modal-mask")) {
        clearInterval(check);
        openBookLanding({ force: true });
      }
    }, 300);
  });

  const inp = $("#book-nick");
  if (inp) {
    setTimeout(() => inp.focus(), 200);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#book-open").click(); } });
  }
}

/* ---------- 📲 安裝 App（PWA）----------
   Chrome／Edge 會在「它覺得該出現的時候」才丟安裝提示，實務上常常等不到，
   所以首頁固定放一顆按鈕：抓得到 beforeinstallprompt 就直接叫出原生安裝視窗，
   抓不到（iOS Safari、或提示還沒被觸發）就顯示各平台的手動步驟。 */
let _installPrompt = null;
function appIsInstalled() {
  return matchMedia("(display-mode: standalone)").matches
    || matchMedia("(display-mode: window-controls-overlay)").matches
    || navigator.standalone === true;
}
function installPlatform() {
  const ua = navigator.userAgent || "";
  // LINE／FB／IG 的內建瀏覽器不能安裝 PWA，得先用系統瀏覽器打開
  if (/\bLine\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua)) return "inapp";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
function installBlockHTML() {
  if (appIsInstalled()) return "";
  return `
    <div class="card install-card">
      <h2>📲 把星塵夢汐直接召喚進辣妹手機 <span class="sub">${_installPrompt ? "可直接安裝" : "無需App Store"}</span></h2>
      <p class="muted small">安裝後就不用找網址，光速開啟、離線也能紀錄，還可收到許願提醒＆天象通知。</p>
      <div class="btn-row"><button class="btn" id="home-install">📲 安裝 App</button></div>
    </div>`;
}
async function doInstallApp() {
  if (appIsInstalled()) { toast("這台裝置已經裝好了 ✨"); return; }
  if (_installPrompt) {
    try {
      _installPrompt.prompt();
      const { outcome } = await _installPrompt.userChoice;
      _installPrompt = null;                       // 原生提示用過就失效，必須重新等事件
      if (outcome === "accepted") toast("安裝中⋯完成後在桌面就能看到 🌙");
      else { toast("先不裝也沒關係，之後隨時可以回來按"); renderToday(); }
      return;
    } catch { /* 提示過期 → 落到下面的手動說明 */ _installPrompt = null; }
  }
  openInstallGuide();
}
function openInstallGuide() {
  const p = installPlatform();
  const STEPS = {
    inapp: {
      title: "先用系統瀏覽器打開",
      body: `<p class="muted small">你現在是在 IG／LINE／FB 這類 App 內建的瀏覽器對不對，它不支援安裝 App。</p>
        <ol class="install-steps">
          <li>點右上角的 <b>⋯</b>（或右下角選單）</li>
          <li>選「<b>用預設瀏覽器開啟</b>」／「<b>在 Safari 中開啟</b>」</li>
          <li>在 Safari／Chrome 裡再按一次首頁的「安裝 App」</li>
        </ol>`,
    },
    ios: {
      title: "iPhone／iPad（Safari）",
      body: `<ol class="install-steps">
          <li>點畫面下方（或右上角）的<b>分享</b>圖示 <b>􀈂</b></li>
          <li>往下捲，選「<b>加入主畫面</b>」</li>
          <li>右上角按「<b>加入</b>」，桌面就會出現星塵夢汐 🌙</li>
        </ol>
        <p class="muted small">iOS 只有 Safari 能加到主畫面；用 Chrome 開的話請先切到 Safari。</p>`,
    },
    android: {
      title: "Android（Chrome）",
      body: `<ol class="install-steps">
          <li>點右上角的 <b>⋮</b></li>
          <li>選「<b>安裝應用程式</b>」或「<b>加到主畫面</b>」</li>
          <li>確認後桌面就會出現星塵夢汐🌙</li>
        </ol>`,
    },
    desktop: {
      title: "電腦（Chrome／Edge）",
      body: `<ol class="install-steps">
          <li>看網址列右側的<b>安裝圖示</b>（⊕ 或螢幕圖示）</li>
          <li>沒看到的話，點右上角 <b>⋮</b> →「<b>投放、儲存及分享</b>」→「<b>安裝頁面即應用程式</b>」</li>
        </ol>`,
    },
  }[p];
  const m = modal(`
    <h3>📲 安裝星塵夢汐</h3>
    <p class="muted small">${esc(STEPS.title)}</p>
    ${STEPS.body}
    <div class="btn-row"><button class="btn" id="ig-close">知道了</button></div>`);
  $("#ig-close", m).addEventListener("click", () => m.remove());
}

/* 首頁可自訂區塊：使用者可決定哪些區塊出現在預設開啟的首頁，並自由上下排序。
   def:false 代表預設不顯示（仍可在「自訂首頁」開啟）。 */
const HOME_BLOCKS = [
  { key: "moonToday",  name: "今日月相與快速記錄", from: "月曆", def: true },
  { key: "mood",       name: "今日心情打卡",       from: "月曆", def: true },
  { key: "manifest",   name: "今日顯化",           from: "首頁", def: true },
  { key: "gratitude",  name: "三件感謝",           from: "首頁", def: true },
  { key: "summon",     name: "召喚機會",           from: "召喚", def: true },
  { key: "upcoming",   name: "即將到來的宇宙星象", from: "宇宙", def: true },
  { key: "resurface",  name: "時空膠囊",           from: "首頁", def: true },
  { key: "entries",    name: "今日紀錄",           from: "首頁", def: true },
  { key: "todo",       name: "待辦事項",           from: "思考", def: false },
  { key: "notes",      name: "隨身小本本",         from: "思考", def: false },
  { key: "wins",       name: "小勝利聖杯",           from: "寶庫", def: false },
  { key: "compassion", name: "今日自我慈悲",       from: "首頁", def: false },
];
const HOME_BY_KEY = Object.fromEntries(HOME_BLOCKS.map(b => [b.key, b]));
function homeLayout() {
  const st = store.data.settings;
  const known = HOME_BLOCKS.map(b => b.key);
  const order = (Array.isArray(st.homeOrder) ? st.homeOrder : []).filter(k => known.includes(k));
  for (const k of known) if (!order.includes(k)) order.push(k); // 之後新增的區塊自動補在最後
  st.homeOrder = order;
  if (!st.homeOff) { // 首次初始化：把預設關閉的區塊記下來
    st.homeOff = {};
    for (const b of HOME_BLOCKS) if (!b.def) st.homeOff[b.key] = true;
  }
  return order;
}
function homeOn(key) { return !store.data.settings.homeOff?.[key]; }

function renderToday() {
  const el = $("#view-today");
  const now = new Date();
  const mi = moonInfo(now);
  const t = todayStr();
  const intro = !store.data.settings.seenIntro;
  const nickname = store.data.settings.nickname || "";
  refreshAffirmation(); // 每次重新載入首頁 → 換一句
  const [, zh, en, gicon] = currentGreeting();
  const streak = calcStreak();
  const manifestDone = store.data.settings.lastManifest === t;
  const order = homeLayout();

  const todayDiary = store.data.diary.filter(d => d.date === t);
  const todayDreams = store.data.dreams.filter(d => d.date === t);
  const upcoming = allUpcomingEvents(30).slice(0, 3);
  const resurface = findResurfacing();
  const todayMood = moodOf(t);
  const grat = gratitudeOf(t);
  const undone = store.data.todos.filter(x => !x.done).slice(0, 5);
  const recentNotes = [...store.data.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const recentWins = [...store.data.wins].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 3);
  const charges = shellState().charges || 0;

  /* 每個區塊回傳一段 HTML；回傳空字串代表這次沒有內容可顯示 */
  const BLOCK_HTML = {
    moonToday: () => `
      <div class="card">
        <h2>${mi.e} ${esc(mi.n)} <span class="sub">${now.getMonth() + 1}/${now.getDate()}（${WEEKDAYS[now.getDay()]}）月齡 ${mi.age.toFixed(1)} 天・照度 ${mi.illum}%</span></h2>
        ${sleepBadge(t) ? `<p class="muted small">${esc(sleepBadge(t))}</p>` : ""}
        <div class="btn-row">
          <button class="btn" id="quick-dream">🌙 記錄夢境</button>
          <button class="btn secondary" id="quick-diary">✍️ 寫下日記</button>
        </div>
      </div>`,
    mood: () => `
      <div class="card">
        <h2>${todayMood ? moodIcon(todayMood.level) : "🌤"} 今天的心情 <span class="sub">${todayMood ? esc(moodLabel(todayMood.level)) : "點一下就記錄"}</span></h2>
        ${moodPickerHTML(todayMood?.level, "home")}
        <p class="muted small">每天一個圖示，久了就能看出心情和月相的共時性。</p>
      </div>`,
    manifest: () => `
      <div class="card">
        <h2>🌠 今日顯化 <span class="sub">${manifestDone ? "今日已完成 ✓" : "每天一句，宇宙一直在等待接收"}</span></h2>
        <p class="affirmation">「${esc(todayAffirmation())}」</p>
        <div class="btn-row">
          <button class="btn ${manifestDone ? "secondary" : ""}" id="manifest-start">🕯 顯化儀式</button>
          <button class="btn secondary" id="sleep-ritual">🌜 睡前引導</button>
        </div>
      </div>`,
    gratitude: () => `
      <div class="card">
        <h2>🙏 三件感謝 <span class="sub">${grat ? "今天已寫 ✓" : "睡前的小練習"}</span></h2>
        <p class="muted small">寫下今天三件值得感謝的小事，再小都算數，這是挖掘生命快樂泉源的最佳管道。</p>
        ${[0, 1, 2].map(i => `<input type="text" class="grat-in" data-i="${i}" maxlength="60" placeholder="${i + 1}. ${["有人對我說了一句什麼話，讓我很開心", "今天吃到了什麼讓你感到很幸福？", "今天忍下來，撐過去的那件事也寫下來"][i]}" value="${esc(grat?.items?.[i] || "")}">`).join("")}
        <div class="btn-row"><button class="btn" id="grat-save">存下今天的小感謝</button></div>
      </div>`,
    summon: () => `
      <div class="card">
        <h2>🔮 召喚機會 <span class="sub">${charges ? `${charges} 次可用` : "尚未累積"}</span></h2>
        <p class="muted small">${charges
          ? "祭壇上的魔法能量已經滿盈，快去召喚神奇海螺。"
          : `連續紀錄滿 ${SUMMON_PER_STREAK_DAYS} 天、或完成 ${SUMMON_PER_TODOS} 件待辦，就能開啟一次召喚儀式。`}</p>
        <div class="btn-row"><button class="btn ${charges ? "" : "secondary"}" id="home-summon">${charges ? "🔮 前往召喚祭壇" : "看看召喚祭壇"}</button></div>
      </div>`,
    upcoming: () => upcoming.length
      ? `<div class="card"><h2>✨ 即將到來的宇宙星象 <span class="sub">點擊查看儀式</span></h2>${upcoming.map(eventRowHTML).join("")}</div>` : "",
    resurface: () => resurface.length
      ? `<div class="card"><h2>⏳ 時空回聲 <span class="sub">來自過去的你</span></h2>${resurface.map(r => `
        <div class="entry"><div class="meta">${esc(r.when)}・${esc(r.kind)}</div><div class="body">${esc(r.text.slice(0, 120))}${r.text.length > 120 ? "…" : ""}</div></div>`).join("")}
        <p class="muted small" style="margin-top:8px">對那時的自己說聲謝謝 🖤</p></div>` : "",
    entries: () => `
      <div class="card">
        <h2>今日紀錄 <span class="sub">${todayDreams.length + todayDiary.length} 則</span></h2>
        ${todayDreams.length + todayDiary.length === 0 ? `<p class="muted">還沒有紀錄。起床第一件事：按下「記錄夢境」，閉著眼睛說也可以。</p>` : ""}
        <div id="today-entries"></div>
      </div>`,
    todo: () => `
      <div class="card">
        <h2>✅ 待辦事項 <span class="sub">${undone.length ? `${undone.length} 件待完成` : "都完成了 🎉"}</span></h2>
        <div id="home-td-list">${undone.length
          ? undone.map(x => `<label class="td-item"><input type="checkbox" data-id="${esc(x.id)}"><span class="td-text">${esc(x.text)}</span></label>`).join("")
          : `<p class="muted small">目前沒有未完成的事，為自己拍拍手五十八下。</p>`}</div>
      </div>`,
    notes: () => `
      <div class="card">
        <h2>📓 隨身小本本 <span class="sub">最近 ${recentNotes.length} 則</span></h2>
        <div class="add-emo">
          <input type="text" id="home-nb-input" placeholder="想到什麼就寫下來⋯按 Enter">
          <button type="button" class="btn small" id="home-nb-add">＋</button>
        </div>
        ${recentNotes.map(n => `<div class="nb-item"><div class="nb-body">${esc(n.text)}</div></div>`).join("")
          || `<p class="muted small">小本本還是空白的，要不要寫下第一句。</p>`}
      </div>`,
    wins: () => `
      <div class="card">
        <h2>🏆 小勝利聖杯 <span class="sub">${store.data.wins.length} 件</span></h2>
        <p class="muted small">今天有什麼「其實我做到了」的小事？丟進聖杯裡，沮喪時再拿出來看。</p>
        <div class="add-emo">
          <input type="text" id="home-win-input" placeholder="例：今天準時起床了⋯按 Enter">
          <button type="button" class="btn small" id="home-win-add">＋</button>
        </div>
        ${recentWins.map(w => `<div class="nb-item"><div class="nb-body">🏆 ${esc(w.text)}</div><div class="nb-meta">${esc(fmtMD(w.date))}</div></div>`).join("")}
      </div>`,
    compassion: () => `
      <div class="card">
        <h2>💗 本日份自我鼓勵</h2>
        <p class="affirmation">「${esc(todaySelfCompassion())}」</p>
      </div>`,
  };

  el.innerHTML = `
    ${intro ? `<div class="banner">🖤 歡迎使用星塵夢汐。此為<b>自我紀錄回顧工具</b>，不具醫療用途；統合內在後可做為心理諮商或專業醫療參考。所有資料僅儲存在這支手機和你的帳號裡。<div class="btn-row"><button class="btn small" id="intro-ok">我瞭解了</button></div></div>` : ""}
    <div class="card greet-card">
      <div class="greet-row">
        <span class="greet-ico">${gicon}</span>
        <div>
          <div class="greet-en">${esc(en)}${nickname ? `, <b>${esc(nickname)}</b>` : ""}</div>
          <div class="greet-zh">${esc(zh)}${nickname ? `，${esc(nickname)}` : ""}</div>
          ${streak >= 2 ? `<div class="streak-line">🔥 連續紀錄 ${streak} 天</div>` : ""}
        </div>
        <button class="greet-edit" id="edit-nickname" title="編輯暱稱">✎</button>
      </div>
    </div>
    ${installBlockHTML()}
    ${order.filter(homeOn).map(k => BLOCK_HTML[k]?.() || "").join("")}
    <div class="btn-row" style="margin:4px 5px 0">
      <button class="btn ghost" id="home-customize">🧩 自訂首頁區塊與排序</button>
    </div>`;

  if (intro) $("#intro-ok").addEventListener("click", () => {
    store.data.settings.seenIntro = true; store.save();
    renderToday();
  });
  $("#edit-nickname").addEventListener("click", openNicknameForm);
  $("#home-customize").addEventListener("click", openHomeCustomizer);
  $("#home-install")?.addEventListener("click", doInstallApp);
  $("#quick-dream")?.addEventListener("click", () => openDreamForm());
  $("#quick-diary")?.addEventListener("click", () => openDiaryForm());
  $("#manifest-start")?.addEventListener("click", openManifestRitual);
  $("#sleep-ritual")?.addEventListener("click", openSleepRitual);
  $("#home-summon")?.addEventListener("click", () => switchTab("summon"));
  bindMoodPicker(el, "home", () => renderToday());
  $("#grat-save")?.addEventListener("click", () => {
    saveGratitude(t, $$(".grat-in", el).map(i => i.value));
    checkSummonCharges();
    toast("感謝已收下 🙏");
    renderToday();
  });
  $$("#home-td-list input[type=checkbox]", el).forEach(cb => cb.addEventListener("change", () => {
    const x = store.data.todos.find(y => y.id === cb.dataset.id);
    if (!x) return;
    x.done = cb.checked; if (x.done) x.doneAt = new Date().toISOString();
    store.save();
    if (x.done) toast("又完成了一項，記得謝謝自己 ❤️");
    checkSummonCharges();
    renderToday();
  }));
  const addHomeNote = () => {
    const v = ($("#home-nb-input", el)?.value || "").trim();
    if (!v) return;
    store.data.notes.push({ id: uid(), text: v, createdAt: new Date().toISOString() });
    store.save(); checkSummonCharges(); renderToday();
  };
  $("#home-nb-add")?.addEventListener("click", addHomeNote);
  $("#home-nb-input")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addHomeNote(); } });
  const addHomeWin = () => {
    const v = ($("#home-win-input", el)?.value || "").trim();
    if (!v) return;
    store.data.wins.push({ id: uid(), text: v, date: t, createdAt: new Date().toISOString() });
    store.save(); checkSummonCharges(); toast("記下來了，這都是你的功勞 🏆"); renderToday();
  };
  $("#home-win-add")?.addEventListener("click", addHomeWin);
  $("#home-win-input")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addHomeWin(); } });
  bindEventRows(el);
  const box = $("#today-entries");
  if (box) {
    todayDreams.forEach(d => box.appendChild(dreamEntryEl(d)));
    todayDiary.forEach(d => box.appendChild(diaryEntryEl(d)));
  }
}

/* 心情 5 Level 選擇列（scope 用來避免多個分頁的 id 衝突） */
function moodPickerHTML(current, scope) {
  return `<div class="mood-picker" data-scope="${scope}">
    ${[1, 2, 3, 4, 5].map(l => `
      <button type="button" class="mood-opt ${current === l ? "on" : ""}" data-level="${l}" title="${esc(moodLabel(l))}">
        <span class="mood-ico">${moodIcon(l)}</span><span class="mood-lbl">${esc(moodLabel(l))}</span>
      </button>`).join("")}
  </div>`;
}
function bindMoodPicker(root, scope, after, ds) {
  const wrap = root.querySelector(`.mood-picker[data-scope="${scope}"]`);
  if (!wrap) return;
  $$(".mood-opt", wrap).forEach(b => b.addEventListener("click", () => {
    const date = ds || todayStr();
    const lv = +b.dataset.level;
    const cur = moodOf(date);
    if (cur && cur.level === lv) { // 再點一次同一個 → 取消
      store.data.moods = store.data.moods.filter(x => x.date !== date);
      store.save();
    } else {
      setMood(date, lv);
      toast(`${moodIcon(lv)} 已記下「${moodLabel(lv)}」`);
    }
    checkSummonCharges();
    after?.();
  }));
}

/* 🧩 自訂首頁：開關顯示與上下排序 */
function openHomeCustomizer() {
  const st = store.data.settings;
  const m = modal(`<h3>🧩 自訂首頁區塊</h3>
    <p class="muted small">勾選要出現在首頁的區塊，用 ▲▼ 調整順序。問候區塊固定在最上方。</p>
    <div id="hc-list" class="hc-list"></div>
    <div class="btn-row">
      <button class="btn" id="hc-done">完成</button>
      <button class="btn secondary" id="hc-reset">回到預設</button>
    </div>`);
  const draw = () => {
    const order = homeLayout();
    $("#hc-list", m).innerHTML = order.map((k, i) => {
      const b = HOME_BY_KEY[k];
      return `<div class="hc-row">
        <label class="hc-main">
          <input type="checkbox" data-k="${k}" ${homeOn(k) ? "checked" : ""}>
          <span><b>${esc(b.name)}</b><i>來自 ${esc(b.from)}</i></span>
        </label>
        <span class="hc-move">
          <button type="button" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="上移">▲</button>
          <button type="button" data-down="${i}" ${i === order.length - 1 ? "disabled" : ""} aria-label="下移">▼</button>
        </span>
      </div>`;
    }).join("");
    $$("#hc-list input[type=checkbox]", m).forEach(cb => cb.addEventListener("change", () => {
      st.homeOff ||= {};
      if (cb.checked) delete st.homeOff[cb.dataset.k]; else st.homeOff[cb.dataset.k] = true;
      store.save();
    }));
    const swap = (i, j) => {
      const o = st.homeOrder;
      [o[i], o[j]] = [o[j], o[i]];
      store.save(); draw();
    };
    $$("#hc-list [data-up]", m).forEach(b => b.addEventListener("click", () => swap(+b.dataset.up, +b.dataset.up - 1)));
    $$("#hc-list [data-down]", m).forEach(b => b.addEventListener("click", () => swap(+b.dataset.down, +b.dataset.down + 1)));
  };
  draw();
  $("#hc-reset", m).addEventListener("click", () => {
    delete st.homeOrder; delete st.homeOff;
    store.save(); homeLayout(); draw(); toast("已回到預設排列");
  });
  $("#hc-done", m).addEventListener("click", () => { m.remove(); renderToday(); });
}
$("#header-moon").textContent = "";

function findResurfacing() {
  const out = [];
  const t = todayStr();
  const pools = [
    ["夢境", store.data.dreams, d => d.text], ["日記", store.data.diary, d => d.text || ""],
  ];
  for (const [kind, arr, getText] of pools) {
    for (const item of arr) {
      const diff = daysBetween(item.date, t);
      if (diff >= 362 && diff <= 368) out.push({ kind, when: "一年前的今天", text: getText(item), date: item.date });
      else if (diff >= 29 && diff <= 31) out.push({ kind, when: "一個月前", text: getText(item), date: item.date });
    }
  }
  return out.filter(r => r.text).slice(0, 3);
}

/* ================= 夢境 ================= */
function renderDream() {
  const el = $("#view-dream");
  const dreams = [...store.data.dreams].sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
  el.innerHTML = `
    <div class="card center">
      <h2 style="justify-content:center">黃金 90 秒 — 醒來立刻紀錄</h2>
      <button class="mic-big" id="dream-mic">🎙️<small>開始紀錄夢境</small></button>
      <p class="muted small">直接說出：畫面、人物、事件、地點、情緒、顏色。<br>任何記得的情節，自動幫你標記欄位。<br>可以一直瘋狂講，講完再按一次麥克風停止，<br>先快速說完再打字編輯也可以💙</p>
    </div>
    <div class="card locked-card">
      <h2>🌌 星塵樹洞 <span class="sub">傾聽你的秘密</span></h2>
      <p class="locked-msg">🔒 您尚未獲得技能可啟動此功能</p>
      <p class="muted small">星塵樹洞AI「🧝‍♂️Lucian」能靜靜聆聽你不想告訴別人的話，陪伴你分享心情或聊天。</p>
    </div>
    <div class="card locked-card">
      <h2>🖼 夢境圖鑑 <span class="sub">共 ${dreams.length} 則</span></h2>
      <p class="locked-msg">🔒 您尚未獲得技能可啟動此功能</p>
      <p class="muted small">🧝‍♂️Lucian之後能幫你畫出夢境，展現出內心魔幻的世界；技能解鎖後，這裡會成為你的夢境美術館 🎨</p>
    </div>
    <div class="card locked-card">
      <h2>🪬 心願購物車 <span class="sub">許願清單</span></h2>
      <p class="locked-msg">🔒 您尚未獲得技能可啟動此功能</p>
      <p class="muted small">儲存自己的購物清單，成為每天努力工作的原動力 😍</p>
    </div>
    <div class="card">
      <h2>夢境記錄 <span class="sub">共 ${dreams.length} 則</span></h2>
      ${dreams.length === 0 ? `<p class="muted">尚無夢境紀錄。</p>` : ""}
      <div id="dream-list"></div>
    </div>`;
  $("#dream-mic").addEventListener("click", () => openDreamForm({ autostart: true }));
  const list = $("#dream-list");
  dreams.slice(0, 30).forEach(d => list.appendChild(dreamEntryEl(d)));
}

function dreamEntryEl(d) {
  const div = document.createElement("div");
  div.className = "entry";
  const tags = [...(d.emotionsInDream || []), ...(d.symbols || []), ...(d.archetypes || [])];
  const rep = countPastOccurrences(d);
  div.innerHTML = `
    <div class="meta">🌙 ${esc(fmtMD(d.date))} ${esc(d.time || "")} ・清醒度 ${d.lucidity ?? 0}/5 ${d.recurring ? "・🔁 重複夢" : ""} ${rep > 1 ? `・第 ${rep} 次相似主題` : ""}</div>
    ${sleepBadge(d.date) ? `<div class="meta">${esc(sleepBadge(d.date))}</div>` : ""}
    <div class="body">${esc(d.text)}</div>
    ${tags.length ? `<div class="tags">${tags.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    ${d.sync ? `<div class="muted small" style="margin-top:4px">🔗 共時性：${esc(d.sync)}</div>` : ""}
    ${d.aiNote ? `<div class="muted small" style="margin-top:4px">🧝‍♂️ AI 參考：${esc(d.aiNote)}</div>` : ""}
    <div class="entry-actions">
      <button data-act="ai">🧝‍♂️ AI 解夢參考</button>
      <button data-act="sync">建立共時性事件</button>
      <button data-act="edit">補充/編輯</button>
      <button data-act="del">刪除</button>
    </div>`;
  div.querySelector('[data-act="del"]').addEventListener("click", () => {
    if (!confirm("刪除這則夢境？")) return;
    store.data.dreams = store.data.dreams.filter(x => x.id !== d.id);
    store.save(); VIEWS[currentTab]();
  });
  div.querySelector('[data-act="edit"]').addEventListener("click", () => openDreamForm({ existing: d }));
  div.querySelector('[data-act="sync"]').addEventListener("click", () => openSyncPicker(d));
  div.querySelector('[data-act="ai"]').addEventListener("click", () => openDreamAI(d));
  return div;
}
function countPastOccurrences(d) {
  if (!d.symbols?.length) return 1;
  return store.data.dreams.filter(x => x.date <= d.date && x.symbols?.some(s => d.symbols.includes(s))).length;
}

/* 共時性釘選：從最近的日記／思考紀錄挑對應事件，或自由輸入 */
function openSyncPicker(d) {
  const recent = [
    ...store.data.diary.map(x => ({ date: x.date, text: x.text || "" })),
    ...store.data.cbt.map(x => ({ date: x.date, text: x.situation || x.dump || "" })),
  ].filter(x => x.text && Math.abs(daysBetween(x.date, d.date)) <= 14)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const m = modal(`
    <h3>🔗 建立共時性事件</h3>
    <p class="muted small">這個夢對應到什麼日常事件？可以點擊下方最近的紀錄帶入，或直接描述，能累積成你的共時性事件庫。</p>
    ${recent.length ? `<label class="field">最近的紀錄（點擊帶入）</label>${recent.map((r, i) => `
      <button type="button" class="entry sync-pick" data-i="${i}" style="width:100%;text-align:left">
        <span class="meta">${esc(fmtMD(r.date))}</span><span class="small" style="display:block">${esc(r.text.slice(0, 60))}${r.text.length > 60 ? "…" : ""}</span>
      </button>`).join("")}` : `<p class="muted small">±14 天內還沒有日記／思考紀錄可以配對，先寫下日記，之後這裡就有東西可選擇。</p>`}
    <label class="field">共時性描述</label>
    <textarea id="sp-text" style="min-height:64px">${esc(d.sync || "")}</textarea>
    <div class="btn-row"><button class="btn" id="sp-save">釘選</button><button class="btn secondary" id="sp-cancel">取消</button></div>`);
  $$(".sync-pick", m).forEach(b => b.addEventListener("click", () => {
    const r = recent[+b.dataset.i];
    $("#sp-text", m).value = `${fmtMD(r.date)} ${r.text.slice(0, 60)}`;
  }));
  $("#sp-cancel", m).addEventListener("click", () => m.remove());
  $("#sp-save", m).addEventListener("click", () => {
    d.sync = $("#sp-text", m).value.trim();
    store.save(); m.remove(); VIEWS[currentTab]();
    if (d.sync) toast("已釘選 🔗 共時性事件庫 +1");
  });
}

function openDreamForm({ existing = null, autostart = false } = {}) {
  const d = existing || { id: uid(), date: todayStr(), time: tstr(new Date()), text: "", emotionsInDream: [], wakeEmotion: "", lucidity: 0, symbols: [], archetypes: [], recurring: false };
  const m = modal(`
    <h3>🌙 ${existing ? "補充夢境" : "記錄夢境"}</h3>
    <div class="center"><button class="mic-big" id="f-mic" style="width:84px;height:84px;font-size:1.5rem">🎙️<small>語音</small></button></div>
    <textarea id="f-text" placeholder="我夢到……（語言系統測試中，亦可直接打字）">${esc(d.text)}</textarea>
    <label class="field">夢中情緒（說完自動偵測，可調整）</label><div class="chips" id="f-emo"></div>
    <label class="field">醒來時的感覺</label><div class="chips" id="f-wake"></div>
    <label class="field">清醒度（知道自己在做夢嗎？）</label>
    <div class="slider-row"><input type="range" id="f-lucid" min="0" max="5" value="${d.lucidity}"><output id="f-lucid-out">${d.lucidity}</output></div>
    <label class="field">符號（你的個人符號辭典會隨著使用成長）</label><div class="chips" id="f-sym"></div>
    <input type="text" id="f-newsym" placeholder="＋新增自訂符號，按 Enter">
    <label class="field">榮格原型（選填）</label><div class="chips" id="f-arch"></div>
    <label class="field"><input type="checkbox" id="f-rec" ${d.recurring ? "checked" : ""}> 這是重複出現的夢</label>
    <div class="btn-row"><button class="btn" id="f-save">儲存</button><button class="btn secondary" id="f-cancel">取消</button></div>`);
  chipGroup($("#f-emo", m), Object.keys(EMOTION_LEX).concat(["興奮"]), d.emotionsInDream);
  chipGroup($("#f-wake", m), ["平靜", "餘悸", "悵然", "愉悅", "疲憊", "好奇"], d.wakeEmotion ? [d.wakeEmotion] : [], { multi: false });
  chipGroup($("#f-sym", m), store.data.settings.symbols, d.symbols);
  chipGroup($("#f-arch", m), ["陰影", "阿尼瑪", "阿尼姆斯", "童年", "原生家庭", "母親", "父親", "伴侶", "小孩", "EX", "夢想", "英雄", "偶像", "未來", "過去", "智者", "騙徒", "惡夢"], d.archetypes);
  $("#f-lucid", m).addEventListener("input", e => $("#f-lucid-out", m).value = e.target.value);
  $("#f-newsym", m).addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = e.target.value.trim();
    if (v && !store.data.settings.symbols.includes(v)) {
      store.data.settings.symbols.push(v); store.save();
      chipGroup($("#f-sym", m), store.data.settings.symbols, [...chipValues($("#f-sym", m)), v]);
    }
    e.target.value = "";
  });
  const micBtn = $("#f-mic", m), ta = $("#f-text", m);
  attachMic(micBtn, ta, {
    onFinal: text => { // 自動判別 → 預選 chips
      const tags = autoTagText(text);
      chipGroup($("#f-emo", m), Object.keys(EMOTION_LEX).concat(["興奮"]), [...new Set([...chipValues($("#f-emo", m)), ...tags.emotions])]);
      chipGroup($("#f-sym", m), store.data.settings.symbols, [...new Set([...chipValues($("#f-sym", m)), ...tags.symbols])]);
    },
  });
  if (autostart && SR) micBtn.click();
  $("#f-cancel", m).addEventListener("click", () => m.remove());
  $("#f-save", m).addEventListener("click", () => {
    d.text = ta.value.trim();
    if (!d.text) return toast("先說（或寫下）一點內容吧");
    d.emotionsInDream = chipValues($("#f-emo", m));
    d.wakeEmotion = chipValues($("#f-wake", m))[0] || "";
    d.lucidity = +$("#f-lucid", m).value;
    d.symbols = chipValues($("#f-sym", m));
    d.archetypes = chipValues($("#f-arch", m));
    d.recurring = $("#f-rec", m).checked;
    if (!existing) store.data.dreams.push(d);
    store.save(); m.remove();
    const after = () => { switchTab(currentTab); toast("夢境已存檔 🌙 起床 10 分鐘後記得回來補充細節"); };
    existing ? after() : magicFX("pensieve", "正在寫入你的夢境⋯", after);
  });
}

/* ================= 日記 ================= */
function openDiaryForm({ existing = null } = {}) {
  const d = existing || { id: uid(), date: todayStr(), time: tstr(new Date()), mood: 6, emotions: [], habits: [], text: "", three: "", incubation: "", photoId: "" };
  const m = modal(`
    <h3>✍️ 日記・每日Check-in</h3>
    <label class="field">今天的天氣心情（也會同步到心情日曆）</label>
    ${moodPickerHTML(moodOf(d.date)?.level, "diary")}
    <label class="field">今天的心情（1–10）</label>
    <div class="slider-row"><input type="range" id="dy-mood" min="1" max="10" value="${d.mood}"><output id="dy-mood-out">${d.mood}</output></div>
    <label class="field">情緒關鍵字（越具體越好）</label><div class="chips" id="dy-emo"></div>
    <label class="field">今天有…</label><div class="chips" id="dy-hab"></div>
    <div class="center" style="margin:6px 0"><button class="mic-big" id="dy-mic" style="width:72px;height:72px;font-size:1.3rem">🎙️<small>語音</small></button></div>
    <textarea id="dy-text" placeholder="今天發生了什麼？感覺如何？（說或寫都可以）">${esc(d.text)}</textarea>
    <label class="field">📷 附上一張今天的照片（選填）</label>
    <input type="file" id="dy-photo" accept="image/*">
    <details ${d.three || d.incubation ? "open" : ""}><summary class="muted small" style="margin:8px 0">🌜 晚間收心儀式（睡前 3 分鐘）</summary>
      <label class="field">明天最重要的三件事</label><textarea id="dy-three" style="min-height:56px">${esc(d.three)}</textarea>
      <label class="field">今晚想在夢裡釐清之事（築夢提示）</label>
      <input type="text" id="dy-incu" value="${esc(d.incubation)}">
    </details>
    <div class="btn-row"><button class="btn" id="dy-save">儲存</button><button class="btn secondary" id="dy-cancel">取消</button></div>`);
  chipGroup($("#dy-emo", m), ["平穩", "焦慮", "低落", "煩躁", "期待", "感恩", "疲憊", "專注", "委屈", "興奮"], d.emotions);
  chipGroup($("#dy-hab", m), ["咖啡因", "酒精", "運動", "冥想", "許願", "按時吃藥", "宵夜"], d.habits);
  bindMoodPicker(m, "diary", () => {
    const cur = moodOf(d.date);
    $$(".mood-opt", m).forEach(b => b.classList.toggle("on", cur && +b.dataset.level === cur.level));
  }, d.date);
  $("#dy-mood", m).addEventListener("input", e => $("#dy-mood-out", m).value = e.target.value);
  attachMic($("#dy-mic", m), $("#dy-text", m));
  $("#dy-cancel", m).addEventListener("click", () => m.remove());
  $("#dy-save", m).addEventListener("click", async () => {
    d.mood = +$("#dy-mood", m).value;
    d.emotions = chipValues($("#dy-emo", m));
    d.habits = chipValues($("#dy-hab", m));
    d.text = $("#dy-text", m).value.trim();
    d.three = $("#dy-three", m).value.trim();
    d.incubation = $("#dy-incu", m).value.trim();
    const file = $("#dy-photo", m).files[0];
    if (file) {
      d.photoId = d.photoId || "ph_" + d.id;
      await idb.put(d.photoId, await photoToDataURL(file));
    }
    if (!existing) store.data.diary.push(d);
    store.save(); m.remove(); switchTab(currentTab); toast("已書寫紀錄 ✍️");
  });
}
function diaryEntryEl(d) {
  const div = document.createElement("div");
  div.className = "entry";
  div.innerHTML = `
    <div class="meta">✍️ ${esc(fmtMD(d.date))} ${esc(d.time || "")}・心情 ${d.mood}/10</div>
    ${d.text ? `<div class="body">${esc(d.text)}</div>` : ""}
    ${(d.emotions?.length || d.habits?.length) ? `<div class="tags">${[...(d.emotions || []), ...(d.habits || [])].map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    ${d.three ? `<div class="muted small" style="margin-top:4px">📌 明日三件事：${esc(d.three)}</div>` : ""}
    ${d.incubation ? `<div class="muted small">🌜 築夢／孵夢：${esc(d.incubation)}</div>` : ""}
    ${d.photoId ? `<img alt="日記照片">` : ""}
    <div class="entry-actions"><button data-act="edit">編輯</button><button data-act="del">刪除</button></div>`;
  if (d.photoId) renderPhoto(div.querySelector("img"), d.photoId);
  div.querySelector('[data-act="del"]').addEventListener("click", async () => {
    if (!confirm("刪除這則日記？")) return;
    if (d.photoId) await idb.del(d.photoId);
    store.data.diary = store.data.diary.filter(x => x.id !== d.id);
    store.save(); VIEWS[currentTab]();
  });
  div.querySelector('[data-act="edit"]').addEventListener("click", () => openDiaryForm({ existing: d }));
  return div;
}

/* ================= CBT 七步驟 ================= */
const CBT_STEPS = [
  { key: "situation", q: "發生了什麼事？只描述客觀事實：時間、地點、對象、說了什麼？先不必詮釋。", label: "① 情境", type: "text" },
  { key: "emotions", q: "當下你感覺到哪些情緒？從喜怒哀樂選單中挑選，或自行輸入。每一種有多強（0–100）？", label: "② 初始情緒與強度", type: "emotions" },
  { key: "thoughts", q: "那一刻，你腦中閃過什麼想法或反應？一條一條說出來。", label: "③ 自動化思考", type: "text" },
  { key: "belief", q: "你有多相信這個想法？0 = 完全不信，100 = 完全確信。", label: "④ 相信程度", type: "slider" },
  { key: "evFor", q: "有哪些「事實」支持這個想法？只算事實，不算感覺。", label: "⑤ 支持證據", type: "text" },
  { key: "evAgainst", q: "有哪些事實和它矛盾？如果是好朋友遇到同樣的事，你會提醒他注意什麼？", label: "⑥ 反對證據", type: "text" },
  { key: "alt", q: "看完兩邊證據，有沒有一個更平衡的說法？用你自己的話說，不需要完美。", label: "⑦ 替代思考", type: "text" },
  { key: "rerate", q: "現在重新評分：那個想法你還相信多少？情緒等級還有多強？", label: "⑦ 重新評分", type: "rerate" },
];
const DISTORTIONS = ["災難化", "讀心術", "非黑即白", "過度類化", "應該的模糊地帶", "個人化", "情緒推理", "貼標籤", "放大縮小", "心理過濾"];

function renderCBT() {
  const el = $("#view-cbt");
  const recs = [...store.data.cbt].sort((a, b) => b.date.localeCompare(a.date));
  const notes = [...store.data.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const todos = [...store.data.todos].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  el.innerHTML = `
    <div class="card">
      <h2>🧠 思考紀錄（CBT 7-Step）</h2>
      <p class="muted small">情緒上來的時候，先倒出來再整理；宇宙只提問、不下結論，替代思考來自於自我潛意識；試一次看看會有新發現。</p>
      <div class="btn-row">
        <button class="btn" id="cbt-start">開始 7 步驟引導</button>
        <button class="btn secondary" id="cbt-dump">30 秒快速傾訴</button>
      </div>
    </div>
    <div class="card">
      <h2>🍆 茄子鐘 <span class="sub">專注一段時間，就是給自己的儀式</span></h2>
      <div id="focus-box"></div>
    </div>
    <div class="card">
      <h2>📓 隨身小本本 <span class="sub">記錄你的靈感與情緒</span></h2>
      <p class="muted small">來不及分類的一句話、一段畫面、一種情緒；先寫下再說。</p>
      <div class="add-emo">
        <input type="text" id="nb-input" placeholder="想到什麼就寫下來⋯按 Enter">
        <button type="button" class="btn small" id="nb-add">＋</button>
      </div>
      <div id="nb-list">${notes.length === 0 ? `<p class="muted small">小本本還是空白的，寫第一句吧。</p>` : ""}</div>
    </div>
    <div class="card">
      <h2>✅ 代辦事項 <span class="sub" id="td-sub">${todos.filter(t => !t.done).length} 未完成 / ${todos.length} 總數</span></h2>
      <p class="muted small">完成後打勾，讓宇宙記得，你也記得為自己拍手三十六下（太多）。</p>
      <div class="add-emo">
        <input type="text" id="td-input" placeholder="今天想完成的一件事⋯按 Enter">
        <button type="button" class="btn small" id="td-add">＋</button>
      </div>
      <div id="td-list">${todos.length === 0 ? `<p class="muted small">尚無代辦事項。</p>` : ""}</div>
    </div>
    <div class="card">
      <h2>紀錄 <span class="sub">${recs.length} 則</span></h2>
      ${recs.length === 0 ? `<p class="muted">尚無紀錄。</p>` : ""}
      <div id="cbt-list"></div>
    </div>`;
  $("#cbt-start").addEventListener("click", () => openCbtWizard());
  $("#cbt-dump").addEventListener("click", () => openCbtDump());
  const list = $("#cbt-list");
  recs.slice(0, 20).forEach(r => list.appendChild(cbtEntryEl(r)));
  renderFocusBox();
  renderNotebookList();
  renderTodoList();
  bindNotebookAdders();
}

/* --- 隨身小本本 --- */
function renderNotebookList() {
  const box = $("#nb-list");
  if (!box) return;
  const notes = [...store.data.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!notes.length) { box.innerHTML = `<p class="muted small">小本本還是空白的，趕快寫下第一句吧。</p>`; return; }
  box.innerHTML = notes.slice(0, 40).map(n => `
    <div class="nb-item" data-id="${esc(n.id)}">
      <div class="nb-body">${esc(n.text)}</div>
      <div class="nb-meta">${esc(n.createdAt.slice(0, 16).replace("T", " "))}</div>
      <button class="nb-del" data-id="${esc(n.id)}" aria-label="刪除">✕</button>
    </div>`).join("");
  $$(".nb-del", box).forEach(b => b.addEventListener("click", () => {
    store.data.notes = store.data.notes.filter(x => x.id !== b.dataset.id);
    store.save(); renderNotebookList();
  }));
}
/* --- 代辦事項 --- */
function renderTodoList() {
  const box = $("#td-list");
  if (!box) return;
  const todos = [...store.data.todos].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  if (!todos.length) { box.innerHTML = `<p class="muted small">尚無代辦事項。</p>`; return; }
  box.innerHTML = todos.map(t => `
    <label class="td-item ${t.done ? "done" : ""}">
      <input type="checkbox" data-id="${esc(t.id)}" ${t.done ? "checked" : ""}>
      <span class="td-text">${esc(t.text)}</span>
      <button type="button" class="td-del" data-id="${esc(t.id)}" aria-label="刪除">✕</button>
    </label>`).join("");
  $$('input[type="checkbox"]', box).forEach(cb => cb.addEventListener("change", () => {
    const t = store.data.todos.find(x => x.id === cb.dataset.id);
    if (!t) return;
    const wasDone = t.done;
    t.done = cb.checked;
    if (t.done) t.doneAt = new Date().toISOString();
    store.save();
    if (!wasDone && t.done) toast("又完成了一項，記得謝謝自己好不好 ❤️");
    checkSummonCharges(); // 每完成 3 件待辦換一次召喚機會
    renderTodoList();
    const todos2 = store.data.todos;
    const undoneEl = document.getElementById("td-sub");
    if (undoneEl) undoneEl.textContent = `${todos2.filter(x => !x.done).length} 未完成 / ${todos2.length} 總數`;
  }));
  $$(".td-del", box).forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    store.data.todos = store.data.todos.filter(x => x.id !== b.dataset.id);
    store.save(); renderTodoList();
  }));
}
function bindNotebookAdders() {
  const nbIn = $("#nb-input"), nbBtn = $("#nb-add");
  const tdIn = $("#td-input"), tdBtn = $("#td-add");
  const addNote = () => {
    const v = (nbIn?.value || "").trim();
    if (!v) return;
    store.data.notes.push({ id: uid(), text: v, createdAt: new Date().toISOString() });
    store.save(); nbIn.value = ""; renderNotebookList();
  };
  const addTodo = () => {
    const v = (tdIn?.value || "").trim();
    if (!v) return;
    store.data.todos.push({ id: uid(), text: v, done: false, createdAt: new Date().toISOString() });
    store.save(); tdIn.value = ""; renderTodoList();
  };
  nbBtn?.addEventListener("click", addNote);
  nbIn?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addNote(); } });
  tdBtn?.addEventListener("click", addTodo);
  tdIn?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } });
}
function cbtEntryEl(r) {
  const div = document.createElement("div");
  div.className = "entry";
  const drop = (r.belief != null && r.rerateBelief != null) ? (r.belief - r.rerateBelief) : null;
  div.innerHTML = `
    <div class="meta">🧠 ${esc(fmtMD(r.date))} ${esc(r.time || "")}・${r.status === "done" ? "已完成" : "⏳ 未完成"} ${drop != null ? `・相信度 ${r.belief}→${r.rerateBelief}（−${drop}）` : ""}</div>
    <div class="body">${esc(r.situation || r.dump || "")}</div>
    ${r.alt ? `<div class="muted small" style="margin-top:4px">💡 替代思考：${esc(r.alt)}</div>` : ""}
    ${r.distortions?.length ? `<div class="tags">${r.distortions.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    <div class="entry-actions">
      ${r.status !== "done" ? `<button data-act="cont">繼續完成</button>` : ""}
      <button data-act="del">刪除</button>
    </div>`;
  div.querySelector('[data-act="del"]').addEventListener("click", () => {
    if (!confirm("刪除這則紀錄？")) return;
    store.data.cbt = store.data.cbt.filter(x => x.id !== r.id);
    store.save(); VIEWS[currentTab]();
  });
  div.querySelector('[data-act="cont"]')?.addEventListener("click", () => openCbtWizard(r));
  return div;
}
function openCbtDump() {
  const m = modal(`
    <h3>30 秒快速傾訴</h3>
    <p class="muted small">沒力氣做完整步驟也沒關係，先把思緒放到儲思盆，晚點再回來整理。</p>
    <div class="center"><button class="mic-big" id="cd-mic" style="width:84px;height:84px;font-size:1.5rem">🎙️<small>允許自己傾訴</small></button></div>
    <textarea id="cd-text" placeholder="現在心裡最大聲的那句話是……"></textarea>
    <div class="btn-row"><button class="btn" id="cd-save">先存起來</button><button class="btn secondary" id="cd-cancel">取消</button></div>`);
  attachMic($("#cd-mic", m), $("#cd-text", m));
  $("#cd-cancel", m).addEventListener("click", () => m.remove());
  $("#cd-save", m).addEventListener("click", () => {
    const text = $("#cd-text", m).value.trim();
    if (!text) return toast("說一句也好");
    store.data.cbt.push({ id: uid(), date: todayStr(), time: tstr(new Date()), status: "draft", dump: text, situation: "", thoughts: text });
    store.save(); m.remove(); switchTab("cbt"); toast("儲存完畢。晚點回來，我們再慢慢整理 🩵");
  });
}
function openCbtWizard(existing = null) {
  const r = existing || { id: uid(), date: todayStr(), time: tstr(new Date()), status: "draft", emotions: [], distortions: [] };
  let step = 0;
  if (existing) { // 從第一個空欄位接續
    const order = ["situation", "emotions", "thoughts", "belief", "evFor", "evAgainst", "alt", "rerateBelief"];
    step = order.findIndex(k => r[k] == null || r[k] === "" || (Array.isArray(r[k]) && !r[k].length));
    if (step < 0) step = 0;
  }
  const m = modal(`<div id="cbt-wiz"></div>`);
  const draw = () => {
    const s = CBT_STEPS[step];
    const wiz = $("#cbt-wiz", m);
    let body = "";
    if (s.type === "text") body = `
      <div class="center"><button class="mic-big" id="cw-mic" style="width:72px;height:72px;font-size:1.3rem">🎙️<small>用說的</small></button></div>
      <textarea id="cw-text">${esc(r[s.key] || "")}</textarea>`;
    else if (s.type === "emotions") body = `
      <div class="emo-cats" id="cw-emocats">
        ${Object.entries(EMOTION_CATEGORIES).map(([cat, list]) => `
          <select data-cat="${esc(cat)}" aria-label="${esc(cat)}類情緒">
            <option value="">${esc(cat)} ▾</option>
            ${list.map(e2 => `<option value="${esc(e2)}">${esc(e2)}</option>`).join("")}
          </select>`).join("")}
      </div>
      <div class="chips" id="cw-emo"></div>
      <div class="add-emo">
        <input type="text" id="cw-emo-new" placeholder="其他情緒？自己填，按 Enter 或 ＋ 新增">
        <button type="button" class="btn small secondary" id="cw-emo-add">＋</button>
      </div>
      <label class="field" id="cw-emoscore-label" style="display:none">各情緒強度（0–100，選到哪個就出現哪條）</label>
      <div id="cw-emoscore"></div>`;
    else if (s.type === "slider") body = `
      <div class="slider-row"><input type="range" id="cw-belief" min="0" max="100" value="${r.belief ?? 80}"><output id="cw-belief-out">${r.belief ?? 80}</output></div>`;
    else if (s.type === "rerate") body = `
      <label class="field">現在對「${esc((r.thoughts || "").slice(0, 40))}…」的相信程度</label>
      <div class="slider-row"><input type="range" id="cw-rb" min="0" max="100" value="${r.rerateBelief ?? r.belief ?? 50}"><output id="cw-rb-out">${r.rerateBelief ?? r.belief ?? 50}</output></div>
      <label class="field">情緒現在各剩多強？（0–100）</label>
      <div id="cw-rescore"></div>
      ${(r.emotions || []).length ? "" : `<input type="text" id="cw-re" value="${esc(r.rerateEmotions || "")}" placeholder="焦慮 40、羞愧 20">`}
      <label class="field">這個想法可能屬於哪些心理慣性？（選填，供長期統計）</label>
      <div class="chips" id="cw-dist"></div>`;
    wiz.innerHTML = `
      <div class="wizard-progress">${CBT_STEPS.map((_, i) => `<i class="${i <= step ? "done" : ""}"></i>`).join("")}</div>
      <h3>${esc(s.label)}</h3>
      <div class="socratic">${esc(s.q)}</div>
      ${body}
      <div class="btn-row">
        ${step > 0 ? `<button class="btn secondary" id="cw-back">上一步</button>` : ""}
        <button class="btn" id="cw-next">${step === CBT_STEPS.length - 1 ? "完成" : "下一步"}</button>
      </div>
      <div class="center" style="margin-top:8px"><button class="small muted" id="cw-savequit" style="text-decoration:underline">先存草稿暫時離開</button></div>`;
    if (s.type === "text") attachMic($("#cw-mic", m), $("#cw-text", m));
    if (s.type === "emotions") {
      r.emoScores = r.emoScores || {};
      // 舊資料相容：把 "焦慮 85、羞愧 60" 文字轉成每個情緒的分數
      if (!Object.keys(r.emoScores).length && r.emoIntensity) {
        r.emoIntensity.split(/[、,，;；]/).forEach(pair => {
          const mm = pair.trim().match(/^(.+?)\s*(\d{1,3})\s*%?$/);
          if (mm) r.emoScores[mm[1].trim()] = Math.min(100, +mm[2]);
        });
      }
      const custom = store.data.settings.customEmotions;
      const scoreBox = $("#cw-emoscore", m), scoreLabel = $("#cw-emoscore-label", m);
      const renderScores = () => {
        const sel = chipValues($("#cw-emo", m));
        scoreLabel.style.display = sel.length ? "block" : "none";
        emoScoreRows(scoreBox, sel, r.emoScores);
      };
      // chips 顯示「已選情緒＋自訂過的情緒」；點 chip 可取消／重新選取
      const chipOpts = new Set([...(r.emotions || []), ...custom]);
      const renderChips = sel => {
        sel.forEach(x => chipOpts.add(x));
        const box = $("#cw-emo", m);
        chipGroup(box, [...chipOpts], sel);
        // 包住 chipGroup 的點擊處理：chip 切換後即時增減對應的強度滑桿
        const toggle = box.onclick;
        box.onclick = e => { toggle(e); if (e.target.closest(".chip")) renderScores(); };
        renderScores();
      };
      const currentSel = () => chipValues($("#cw-emo", m));
      // 喜怒哀樂下拉選單：選一項就加入 chips，選單自動跳回分類名稱可再選
      $("#cw-emocats", m).addEventListener("change", e => {
        const v = e.target.value;
        if (v) renderChips([...new Set([...currentSel(), v])]);
        e.target.selectedIndex = 0;
      });
      const addEmo = () => {
        const inp = $("#cw-emo-new", m), v = inp.value.trim();
        const preset = Object.values(EMOTION_CATEGORIES).flat();
        if (v && !preset.includes(v) && !custom.includes(v)) { custom.push(v); store.save(); } // 自訂情緒即時存檔
        renderChips(v ? [...new Set([...currentSel(), v])] : currentSel());
        inp.value = ""; inp.focus(); // 清空後即為下一個可新增的空欄位
      };
      $("#cw-emo-add", m).addEventListener("click", addEmo);
      $("#cw-emo-new", m).addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addEmo(); } });
      renderChips(r.emotions || []);
    }
    if (s.type === "slider") $("#cw-belief", m).addEventListener("input", e => $("#cw-belief-out", m).value = e.target.value);
    if (s.type === "rerate") {
      $("#cw-rb", m).addEventListener("input", e => $("#cw-rb-out", m).value = e.target.value);
      const reBox = $("#cw-rescore", m);
      if ((r.emotions || []).length) {
        r.rerateScores = r.rerateScores || {};
        r.emotions.forEach(n => { r.rerateScores[n] ??= r.emoScores?.[n] ?? 40; }); // 預設帶入初始分數
        emoScoreRows(reBox, r.emotions, r.rerateScores, 40);
      }
      chipGroup($("#cw-dist", m), DISTORTIONS, r.distortions || []);
    }
    const collect = () => {
      if (s.type === "text") r[s.key] = $("#cw-text", m).value.trim();
      if (s.type === "emotions") {
        r.emotions = chipValues($("#cw-emo", m));
        const scores = {};
        r.emotions.forEach(n => { scores[n] = r.emoScores?.[n] ?? 60; });
        r.emoScores = scores; // 只留下目前有選的情緒
        r.emoIntensity = r.emotions.map(n => `${n} ${scores[n]}`).join("、"); // 匯出用字串同步
      }
      if (s.type === "slider") r.belief = +$("#cw-belief", m).value;
      if (s.type === "rerate") {
        r.rerateBelief = +$("#cw-rb", m).value;
        if ((r.emotions || []).length && r.rerateScores) {
          r.rerateEmotions = r.emotions.map(n => `${n} ${r.rerateScores[n] ?? 40}`).join("、");
        } else {
          r.rerateEmotions = $("#cw-re", m)?.value.trim() || "";
        }
        r.distortions = chipValues($("#cw-dist", m));
      }
    };
    $("#cw-back", m)?.addEventListener("click", () => { collect(); step--; draw(); });
    $("#cw-savequit", m).addEventListener("click", () => { collect(); persist("draft"); m.remove(); toast("草稿已存檔，隨時都可回來繼續"); });
    $("#cw-next", m).addEventListener("click", () => {
      collect();
      if (step === CBT_STEPS.length - 1) {
        persist("done"); m.remove();
        const drop = (r.belief ?? 0) - (r.rerateBelief ?? 0);
        toast(drop > 0 ? `完成 🖤 相信程度下降了 ${drop} 分；每個微小紀錄都是有用的` : "完成 🖤 有整理，就有進步");
      } else { step++; draw(); }
    });
  };
  const persist = status => {
    r.status = status;
    if (!store.data.cbt.find(x => x.id === r.id)) store.data.cbt.push(r);
    store.save(); if (currentTab === "cbt") renderCBT();
  };
  draw();
}

/* ================= 顯化儀式・睡前引導 ================= */
/* 每次呼叫都隨機挑一句；同一次 render 內共用同一句（避免卡片與儀式對不上） */
let _sessionAffirmation = null;
function todayAffirmation() {
  if (_sessionAffirmation) return _sessionAffirmation;
  _sessionAffirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
  return _sessionAffirmation;
}
function refreshAffirmation() { _sessionAffirmation = null; return todayAffirmation(); }

function openManifestRitual() {
  const aff = todayAffirmation();
  const markDone = () => {
    store.data.settings.lastManifest = todayStr();
    store.save(); if (currentTab === "today") renderToday();
  };
  const m = modal(`
    <h3>🌠 顯化儀式</h3>
    <div class="breath-wrap"><div class="breath-circle"></div></div>
    <p class="muted small center">先跟著圓圈呼吸三次：吸氣 4 秒・停留 7 秒・吐氣 8 秒</p>
    <div class="socratic">今天的顯化語：「${esc(aff)}」<br>閉上眼、輕聲唸出它，想像實現時的畫面，預先感受那份喜悅在心中。</div>
    ${typeof crystalRitualHintHTML === "function" ? crystalRitualHintHTML() : ""}
    <label class="field">今天我想顯化的意圖（用現在式、肯定句）</label>
    <textarea id="mf-intent" style="min-height:56px" placeholder="我正在……我已經……"></textarea>
    <label class="field">感謝一件此刻已擁有的事</label>
    <input type="text" id="mf-thanks" placeholder="謝謝……">
    <div class="btn-row">
      <button class="btn" id="mf-save">存進今天的日記 ✨</button>
      <button class="btn secondary" id="mf-close">在心裡完成就好</button>
    </div>`);
  $("#mf-close", m).addEventListener("click", () => { markDone(); m.remove(); toast("儀式完成 ✨ 宇宙都聽見了"); });
  $("#mf-save", m).addEventListener("click", () => {
    const intent = $("#mf-intent", m).value.trim();
    const thanks = $("#mf-thanks", m).value.trim();
    const text = [`🌠 顯化儀式`, `顯化語：${aff}`, intent && `意圖：${intent}`, thanks && `感恩：${thanks}`].filter(Boolean).join("\n");
    store.data.diary.push({ id: uid(), date: todayStr(), time: tstr(new Date()), mood: 7, emotions: ["感恩"], habits: ["許願"], text, three: "", incubation: "" });
    markDone(); m.remove();
    magicFX("sigil", "把心願傳送進宇宙通訊管線⋯", () => { if (currentTab === "today") renderToday(); toast("顯化儀式完成 ✨"); });
  });
}

function openSleepRitual() {
  const m = modal(`<div id="sr-box"></div>`);
  let step = 0;
  const data = { mood: 6, thanks: "", three: "", incu: "" };
  const draw = () => {
    const box = $("#sr-box", m);
    if (step === 0) box.innerHTML = `
      <h3>🌜 睡前引導・呼吸</h3>
      <div class="breath-wrap"><div class="breath-circle"></div></div>
      <p class="muted small center">跟著圓圈：吸氣 4 秒・停留 7 秒・吐氣 8 秒，重複三次<br>讓今天慢慢沉澱下來</p>
      <div class="btn-row"><button class="btn" id="sr-next">我準備好了</button></div>`;
    else if (step === 1) box.innerHTML = `
      <h3>🌜 睡前引導・感恩</h3>
      <label class="field">今晚的心情（1–10）</label>
      <div class="slider-row"><input type="range" id="sr-mood" min="1" max="10" value="${data.mood}"><output id="sr-mood-out">${data.mood}</output></div>
      <label class="field">今天想感謝的三件事（再小的事也算數）</label>
      <textarea id="sr-thanks" style="min-height:88px" placeholder="1. \n2. \n3. ">${esc(data.thanks)}</textarea>
      <div class="btn-row"><button class="btn" id="sr-next">下一步</button></div>`;
    else box.innerHTML = `
      <h3>🌜 睡前引導・交給明天</h3>
      <label class="field">明天最重要的三件事（寫下來，今晚就不用再想了，讓焦慮留在這邊就好）</label>
      <textarea id="sr-three" style="min-height:72px">${esc(data.three)}</textarea>
      <label class="field">今晚想在夢裡釐清之事（孵夢意圖，選填）</label>
      <input type="text" id="sr-incu" value="${esc(data.incu)}">
      <div class="btn-row"><button class="btn" id="sr-save">存檔，晚安 🌙</button></div>`;
    $("#sr-mood", m)?.addEventListener("input", e => $("#sr-mood-out", m).value = e.target.value);
    $("#sr-next", m)?.addEventListener("click", () => {
      if (step === 1) { data.mood = +$("#sr-mood", m).value; data.thanks = $("#sr-thanks", m).value.trim(); }
      step++; draw();
    });
    $("#sr-save", m)?.addEventListener("click", () => {
      data.three = $("#sr-three", m).value.trim();
      data.incu = $("#sr-incu", m).value.trim();
      store.data.diary.push({
        id: uid(), date: todayStr(), time: tstr(new Date()), mood: data.mood,
        emotions: ["感恩"], habits: [],
        text: data.thanks ? `🌜 睡前儀式\n感恩：${data.thanks}` : "🌜 睡前儀式",
        three: data.three, incubation: data.incu,
      });
      store.save(); m.remove();
      magicFX("pensieve", "讓今天隨潮汐沉澱⋯", () => { if (currentTab === "today") renderToday(); toast("晚安 🌙 明早記得回來記錄夢境"); });
    });
  };
  draw();
}

/* ================= AI 陪伴・解夢參考（雲端 AI，需在 Vercel 設定 ANTHROPIC_API_KEY） ================= */
async function aiCall(mode, messages) {
  const r = await fetch("api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages }),
  });
  if (r.status === 503) throw new Error("AI 功能尚未啟用：請在 Vercel 專案設定環境變數 ANTHROPIC_API_KEY");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "夢汐暫時無法回應，請稍後再試");
  return (j.text || "").trim();
}

function openAiChat() {
  const m = modal(`
    <h3>讓夢汐 AI 引路者：🧝‍♂️Lucian 陪伴你</h3>
    <p class="muted small">🧝‍♂️ Lucian 是 AI 陪伴者，不能替代專業醫療與心理諮商；串聯API後訊息會傳送至你的 Anthropic 帳號進行深度溝通。</p>
    <div class="chat-log" id="ai-log"></div>
    <div class="add-emo">
      <input type="text" id="ai-input" placeholder="想說什麼都可以……">
      <button type="button" class="btn small" id="ai-send">傳送</button>
    </div>
    <div class="center"><button class="small muted" id="ai-clear" style="text-decoration:underline">清空對話</button></div>`);
  const log = $("#ai-log", m), input = $("#ai-input", m);
  const draw = (typing = false) => {
    log.innerHTML = store.data.aiChat.map(x => `<div class="chat-msg ${x.role === "user" ? "user" : "assistant"}">${esc(x.content)}</div>`).join("")
      + (typing ? `<div class="chat-msg assistant muted">Lucian 正在輸入⋯</div>` : "")
      + (!store.data.aiChat.length && !typing ? `<p class="muted small center">今天過得怎麼樣？🧝‍♂️Lucian在等著你分享。</p>` : "");
    log.scrollTop = log.scrollHeight;
  };
  const send = async () => {
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    store.data.aiChat.push({ role: "user", content: v });
    store.data.aiChat = store.data.aiChat.slice(-40); // 只留最近 40 則，控制流量
    store.save(); draw(true);
    try {
      const text = await aiCall("chat", store.data.aiChat);
      store.data.aiChat.push({ role: "assistant", content: text });
      store.save(); draw();
    } catch (e) { draw(); toast(e.message); }
  };
  $("#ai-send", m).addEventListener("click", send);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); send(); } });
  $("#ai-clear", m).addEventListener("click", () => {
    if (!confirm("清空與🧝‍♂️Lucian的對話？")) return;
    store.data.aiChat = []; store.save(); draw();
  });
  draw();
  setTimeout(() => input.focus(), 60);
}

function openDreamAI(d) {
  const m = modal(`
    <h3>🧝‍♂️ AI 解夢參考</h3>
    <p class="muted small">榮格／佛洛伊德取向的參考視角夢的意義，最終由你自己的聯想決定。</p>
    <div class="body" id="da-out" style="white-space:pre-wrap;min-height:80px">夢汐正在凝視你的夢境⋯</div>
    <div class="btn-row">
      <button class="btn" id="da-save" disabled>存進這則夢境</button>
      <button class="btn secondary" id="da-close">關閉</button>
    </div>`);
  $("#da-close", m).addEventListener("click", () => m.remove());
  const prompt = `夢境：${d.text}\n夢中情緒：${(d.emotionsInDream || []).join("、") || "—"}\n符號：${(d.symbols || []).join("、") || "—"}\n原型：${(d.archetypes || []).join("、") || "—"}${d.recurring ? "\n（這是重複出現的夢）" : ""}`;
  aiCall("dream", [{ role: "user", content: prompt }]).then(text => {
    $("#da-out", m).textContent = text;
    const btn = $("#da-save", m);
    btn.disabled = false;
    btn.addEventListener("click", () => {
      d.aiNote = text; store.save(); m.remove();
      VIEWS[currentTab](); toast("已存為這則夢境的 AI 參考筆記 🧝‍♂️");
    });
  }).catch(e => { $("#da-out", m).textContent = e.message; });
}

/* ================= 內在報告（週／月／年回顧） ================= */
function emoCategoryOf(name) {
  for (const [cat, list] of Object.entries(EMOTION_CATEGORIES)) if (cat === name || list.includes(name)) return cat;
  return "其他";
}
function openReport(days, label) {
  const start = new Date(); start.setDate(start.getDate() - (days - 1));
  const from = dstr(start), to = todayStr();
  const inRange = arr => arr.filter(x => x.date >= from && x.date <= to);
  const dreams = inRange(store.data.dreams), diary = inRange(store.data.diary);
  const cbt = inRange(store.data.cbt), focus = inRange(store.data.focus);
  const emoNames = [...cbt.flatMap(r => r.emotions || []), ...diary.flatMap(d => d.emotions || [])];
  const catCount = countBy(emoNames.map(emoCategoryOf));
  const catOrdered = {};
  [...Object.keys(EMOTION_CATEGORIES), "其他"].forEach(c => { if (catCount[c]) catOrdered[c] = catCount[c]; });
  const emoCount = countBy(emoNames);
  const symCount = countBy(dreams.flatMap(d => d.symbols || []));
  const moods = diary.map(d => d.mood).filter(v => v != null);
  const moodAvg = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : null;
  const drops = cbt.filter(r => r.belief != null && r.rerateBelief != null).map(r => r.belief - r.rerateBelief);
  const dropAvg = drops.length ? Math.round(drops.reduce((a, b) => a + b, 0) / drops.length) : null;
  const focusMin = focus.reduce((s, f) => s + (f.mins || 0), 0);
  const total = dreams.length + diary.length + cbt.length + focus.length;
  const m = modal(`
    <h3>📈 內在${esc(label)} <span class="sub">${esc(fmtMD(from))} – ${esc(fmtMD(to))}</span></h3>
    ${total === 0 ? `<p class="muted">這段期間還沒有紀錄，先從一則夢境或日記開始吧。</p>` : `
    <div class="stat-row">
      <div class="stat-tile"><b>${dreams.length}</b><span>夢境</span></div>
      <div class="stat-tile"><b>${diary.length}</b><span>日記</span></div>
      <div class="stat-tile"><b>${cbt.length}</b><span>思考紀錄</span></div>
      <div class="stat-tile"><b>${moodAvg ?? "—"}</b><span>平均心情</span></div>
    </div>
    ${Object.keys(catOrdered).length ? `<label class="field">喜怒哀樂占比（情緒被記錄的次數）</label>${barRows(catOrdered)}` : ""}
    ${Object.keys(emoCount).length ? `<label class="field">最常出現的情緒</label>${barRows(emoCount)}` : ""}
    ${Object.keys(symCount).length ? `<label class="field">最常出現的夢境符號</label>${barRows(symCount)}` : ""}
    ${dropAvg != null ? `<p class="muted small">🧠 完成重新評估的思考紀錄 ${drops.length} 則，相信度平均下降 <b>${dropAvg}</b> 分</p>` : ""}
    ${focusMin ? `<p class="muted small">🍆 專注共 ${esc(fmtH(focusMin))}（${focus.length} 回合）</p>` : ""}
    <p class="muted small">🔥 目前連續紀錄 ${calcStreak()} 天</p>`}
    <div class="btn-row">
      ${total ? `<button class="btn secondary" id="rp-md">匯出 Markdown</button>` : ""}
      <button class="btn" id="rp-close">關閉</button>
    </div>`);
  $("#rp-close", m).addEventListener("click", () => m.remove());
  $("#rp-md", m)?.addEventListener("click", () => {
    const top5 = counts => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}×${v}`).join("、");
    const lines = [
      `# 星塵夢汐・內在${label}（${from} ~ ${to}）`, "",
      `- 夢境 ${dreams.length} 則、日記 ${diary.length} 則、思考紀錄 ${cbt.length} 則、專注 ${focus.length} 回合`,
      moodAvg ? `- 平均心情 ${moodAvg}/10` : "",
      Object.keys(catOrdered).length ? `- 喜怒哀樂：${Object.entries(catOrdered).map(([k, v]) => `${k} ${v} 次`).join("、")}` : "",
      Object.keys(emoCount).length ? `- 常見情緒：${top5(emoCount)}` : "",
      Object.keys(symCount).length ? `- 常見夢境符號：${top5(symCount)}` : "",
      dropAvg != null ? `- 思考紀錄相信度平均下降 ${dropAvg} 分（${drops.length} 則）` : "",
      focusMin ? `- 專注 ${fmtH(focusMin)}` : "",
      `- 連續紀錄 ${calcStreak()} 天`,
    ].filter(Boolean);
    download(`dreamtide-${label}-${to}.md`, lines.join("\n"), "text/markdown");
    toast("報告已匯出 📈 適合帶去回診或諮商時參考");
  });
}

/* ================= 月相＋天象 ================= */
let calCursor = new Date();
function renderMoon() {
  const el = $("#view-moon");
  const y = calCursor.getFullYear(), mo = calCursor.getMonth();
  const first = new Date(y, mo, 1);
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const entryDates = {
    dream: new Set(store.data.dreams.map(d => d.date)),
    diary: new Set(store.data.diary.map(d => d.date)),
    cbt: new Set(store.data.cbt.map(d => d.date)),
  };
  /* 新月／滿月用外框高亮：從「真正發生的那一天」起算 3 天（含當天，不往回追溯）。
     以真實朔望時刻反推日期，否則朔望落在當天下午時，高亮會整組晚一天。 */
  const phaseWindow = { newmoon: new Set(), fullmoon: new Set() };
  const k0 = kNear(first) - 1;
  for (let k = k0; k <= k0 + 3; k++) {
    for (const [phase, type] of [[0, "newmoon"], [0.5, "fullmoon"]]) {
      const d0 = phaseDate(k, phase);
      for (let i = 0; i < 3; i++) phaseWindow[type].add(dstr(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i)));
    }
  }
  let cells = "";
  for (let i = 0; i < calOffset(first); i++) cells += `<div class="cal-cell blank"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(y, mo, day);
    const ds = dstr(dt);
    const mi = moonInfo(new Date(y, mo, day, 12));
    const dots = [
      entryDates.dream.has(ds) ? `<i class="dot-dream"></i>` : "",
      entryDates.diary.has(ds) ? `<i class="dot-diary"></i>` : "",
      entryDates.cbt.has(ds) ? `<i class="dot-cbt"></i>` : "",
    ].join("");
    const phaseClass = phaseWindow.newmoon.has(ds) ? "newmoon" : phaseWindow.fullmoon.has(ds) ? "fullmoon" : "";
    const isToday = ds === todayStr();
    cells += `<div class="cal-cell ${isToday ? "today" : ""} ${phaseClass}" data-date="${ds}">
      <span>${day}</span><span class="moon">${mi.e}</span><span class="dots">${dots}</span></div>`;
  }
  /* 心情日曆：格式與上方月相相同，格子中只顯示心情圖示，方便對照心情與月相的關聯 */
  const mm = moodMap();
  let moodCells = "";
  for (let i = 0; i < calOffset(first); i++) moodCells += `<div class="cal-cell blank"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = dstr(new Date(y, mo, day));
    const rec = mm.get(ds);
    const isToday = ds === todayStr();
    const future = ds > todayStr();
    moodCells += `<div class="cal-cell mood-cell ${isToday ? "today" : ""} ${future ? "future" : ""}" data-mood-date="${ds}" title="${esc(fmtMD(ds))}${rec ? "・" + esc(moodLabel(rec.level)) : ""}">
      <span class="mc-day">${day}</span>
      <span class="mc-ico">${rec ? moodIcon(rec.level) : ""}</span>
    </div>`;
  }
  const monthMoods = store.data.moods.filter(x => x.date.startsWith(`${y}-${String(mo + 1).padStart(2, "0")}`));
  const diaries = [...store.data.diary].sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
  const todayMood = moodOf(todayStr());

  el.innerHTML = `
    <div class="card">
      <div class="cal-head">
        <button class="btn secondary small" id="cal-prev">‹</button>
        <b>${y} 年 ${mo + 1} 月</b>
        <button class="btn secondary small" id="cal-next">›</button>
      </div>
      <div class="cal-grid">
        ${WEEKDAYS_CAL.map(w => `<div class="dow">${w}</div>`).join("")}
        ${cells}
      </div>
      <div class="cal-legend">
        <span><i class="dot-dream"></i>夢境</span><span><i class="dot-diary"></i>日記</span><span><i class="dot-cbt"></i>思考紀錄</span>
        <span><i class="dot-newmoon"></i>新月</span><span><i class="dot-fullmoon"></i>滿月</span>
      </div>
      <div id="cal-detail"></div>
    </div>

    <div class="card">
      <h2>${todayMood ? moodIcon(todayMood.level) : "🌤"} 心情日曆 <span class="sub">${y} 年 ${mo + 1} 月・${monthMoods.length} 天已記錄</span></h2>
      <p class="muted small">先選今天的心情，日曆上就會留下一個圖示；和上方月相同格式排列，方便你比對心情與月相的關聯＆共時性。</p>
      ${moodPickerHTML(todayMood?.level, "moon")}
      <div class="cal-grid mood-grid">
        ${WEEKDAYS_CAL.map(w => `<div class="dow">${w}</div>`).join("")}
        ${moodCells}
      </div>
      <div class="cal-legend mood-legend">
        ${[1, 2, 3, 4, 5].map(l => `<span>${moodIcon(l)} ${esc(moodLabel(l))}</span>`).join("")}
      </div>
      ${monthMoods.length ? `<div class="mood-bars">${[1, 2, 3, 4, 5].map(l => {
        const n = monthMoods.filter(x => x.level === l).length;
        const pct = Math.round(n / monthMoods.length * 100);
        return `<div class="bar-row"><span class="lbl">${moodIcon(l)} ${esc(moodLabel(l))}</span>
          <span class="bar"><i style="width:${pct}%"></i></span><span class="val">${n}</span></div>`;
      }).join("")}</div>` : ""}
      <div class="btn-row">
        <button class="btn secondary" id="mood-style">🎨 更換心情圖示</button>
        <button class="btn secondary" id="mood-clear-month">清除本月心情</button>
      </div>
    </div>

    <div class="card">
      <h2>📔 日記本 <span class="sub">共 ${diaries.length} 篇</span></h2>
      <p class="muted small">想好好寫的時候就寫長一點；只想按一下心情，用上面的圖樣紀錄也可以。</p>
      <div class="btn-row">
        <button class="btn" id="diary-new">✍️ 寫今天的日記</button>
        <button class="btn secondary" id="diary-gratitude">🙏 三件感謝</button>
      </div>
      <div id="diary-list"></div>
    </div>`;
  $("#cal-prev").addEventListener("click", () => { calCursor = new Date(y, mo - 1, 1); renderMoon(); });
  $("#cal-next").addEventListener("click", () => { calCursor = new Date(y, mo + 1, 1); renderMoon(); });
  $$(".cal-cell[data-date]", el).forEach(c => c.addEventListener("click", () => showDayDetail(c.dataset.date)));
  bindMoodPicker(el, "moon", () => renderMoon());
  $$(".mood-cell[data-mood-date]", el).forEach(c => c.addEventListener("click", () => {
    if (c.classList.contains("future")) return toast("還沒到那一天呢 🌙");
    openMoodDayForm(c.dataset.moodDate);
  }));
  $("#mood-style").addEventListener("click", openMoodStyleForm);
  $("#mood-clear-month").addEventListener("click", () => {
    if (!monthMoods.length) return toast("本月還沒有心情紀錄");
    if (!confirm(`清除 ${y} 年 ${mo + 1} 月的 ${monthMoods.length} 筆心情紀錄？`)) return;
    const pre = `${y}-${String(mo + 1).padStart(2, "0")}`;
    store.data.moods = store.data.moods.filter(x => !x.date.startsWith(pre));
    store.save(); renderMoon(); toast("已清除本月心情紀錄");
  });
  $("#diary-new").addEventListener("click", () => openDiaryForm());
  $("#diary-gratitude").addEventListener("click", () => openGratitudeForm());
  const dl = $("#diary-list");
  if (!diaries.length) dl.innerHTML = `<p class="muted small">還沒有日記，今天想跟自己說什麼？</p>`;
  else diaries.slice(0, 20).forEach(d => dl.appendChild(diaryEntryEl(d)));
}

/* 單日心情：可補充過去某天的心情，也能直接接著寫日記 */
function openMoodDayForm(ds) {
  const rec = moodOf(ds);
  const m = modal(`
    <h3>${rec ? moodIcon(rec.level) : "🌤"} ${esc(fmtMD(ds))} 的心情</h3>
    <p class="muted small">選一個最接近的天氣；再點一次同一個可以取消。</p>
    ${moodPickerHTML(rec?.level, "day")}
    <label class="field">想多寫一句嗎（選填）</label>
    <input type="text" id="md-note" maxlength="80" placeholder="今天發生了什麼事？" value="${esc(rec?.note || "")}">
    <div class="btn-row">
      <button class="btn" id="md-save">儲存</button>
      <button class="btn secondary" id="md-diary">✍️ 寫成完整日記</button>
    </div>`);
  bindMoodPicker(m, "day", () => {
    const cur = moodOf(ds);
    $$(".mood-opt", m).forEach(b => b.classList.toggle("on", cur && +b.dataset.level === cur.level));
  }, ds);
  $("#md-save", m).addEventListener("click", () => {
    const cur = moodOf(ds);
    if (cur) { cur.note = $("#md-note", m).value.trim(); store.save(); }
    m.remove(); renderMoon();
  });
  $("#md-diary", m).addEventListener("click", () => { m.remove(); openDiaryForm(); });
}

/* 🎨 心情圖示樣式：內建幾組，也可以自己輸入 5 個字元 */
function openMoodStyleForm() {
  const cur = moodSetKey();
  const custom = store.data.settings.moodCustomIcons || ["", "", "", "", ""];
  const m = modal(`
    <h3>🎨 心情圖示樣式</h3>
    <p class="muted small">五個等級由好到壞：${MOOD_LABELS.join("、")}。選一組內建樣式，或自訂成你喜歡的圖示／顏色。</p>
    <div id="ms-list">
      ${Object.entries(MOOD_SETS).map(([k, v]) => `
        <button type="button" class="ms-row ${cur === k ? "on" : ""}" data-k="${k}">
          <span class="ms-name">${esc(v.name)}</span>
          <span class="ms-icons">${v.icons.join(" ")}</span>
        </button>`).join("")}
      <button type="button" class="ms-row ${cur === "custom" ? "on" : ""}" data-k="custom">
        <span class="ms-name">自訂</span><span class="ms-icons">${custom.join(" ") || "自己輸入"}</span>
      </button>
    </div>
    <label class="field">自訂五個圖示（由好到壞，用空白分隔）</label>
    <input type="text" id="ms-custom" placeholder="例：🟩 🟦 🟨 🟧 🟥" value="${esc(custom.filter(Boolean).join(" "))}">
    <div class="btn-row"><button class="btn" id="ms-save">套用</button><button class="btn secondary" id="ms-cancel">取消</button></div>`);
  let pick = cur;
  $$(".ms-row", m).forEach(b => b.addEventListener("click", () => {
    pick = b.dataset.k;
    $$(".ms-row", m).forEach(x => x.classList.toggle("on", x === b));
  }));
  $("#ms-cancel", m).addEventListener("click", () => m.remove());
  $("#ms-save", m).addEventListener("click", () => {
    const parts = $("#ms-custom", m).value.trim().split(/\s+/).filter(Boolean);
    if (pick === "custom") {
      if (parts.length !== 5) return toast("自訂樣式需要剛好 5 個圖示");
      store.data.settings.moodCustomIcons = parts;
    } else if (parts.length === 5) {
      store.data.settings.moodCustomIcons = parts; // 先存著，之後切到「自訂」還在
    }
    store.data.settings.moodSet = pick;
    store.save(); m.remove();
    if (currentTab === "moon") renderMoon(); else renderToday();
    toast("心情圖示已更換 🎨");
  });
}

/* 🙏 三件感謝事物（獨立入口，首頁區塊之外也能寫） */
function openGratitudeForm(ds = todayStr()) {
  const g = gratitudeOf(ds);
  const m = modal(`
    <h3>🙏 ${esc(fmtMD(ds))} 的三件感謝</h3>
    <p class="muted small">再小的事都算數。持續寫下去，大腦會學會先看見正向的部分。</p>
    ${[0, 1, 2].map(i => `<input type="text" class="gf-in" maxlength="60" placeholder="${i + 1}." value="${esc(g?.items?.[i] || "")}">`).join("")}
    <div class="btn-row"><button class="btn" id="gf-save">儲存</button><button class="btn secondary" id="gf-cancel">取消</button></div>`);
  $("#gf-cancel", m).addEventListener("click", () => m.remove());
  $("#gf-save", m).addEventListener("click", () => {
    saveGratitude(ds, $$(".gf-in", m).map(i => i.value));
    checkSummonCharges();
    m.remove(); toast("已儲存 🙏");
    VIEWS[currentTab]();
  });
}

/* ================= 🔮 召喚祭壇 =================
   以祭壇圖為底，上層 canvas 疊一層飄動的雲霧與月暈讓背景「活」起來；
   按下召喚後播放銀色魔法陣（與開書的紫金陣不同構造），再揭曉抽到的碎片。 */
let _altarStop = null;
function stopAltar() { _altarStop?.(); _altarStop = null; }

/* ---------- 🌙 祭壇背景輪播 ----------
   原圖在 repo 根目錄的 Moon_altar/（PNG，每張 1.6MB 以上，太重不適合直接餵給手機），
   assets/altar/ 放的是同一批圖壓成 1280px WebP 的版本（每張約 50–110 KB）。
   想新增背景：把新圖丟進 Moon_altar/，壓成 WebP 放進 assets/altar/，再把檔名加進下面陣列即可。

   目前是「每次進召喚頁就隨機換一張」（reload、切分頁都會換，且不會連續重複同一張）。
   測試階段刻意不對齊當下月相；之後要對齊時，用 altarPhaseOf() 依 moonInfo() 篩選同相位的圖即可。 */
const ALTAR_BACKDROPS = [
  "altar_combo",
  "blood_darkmoon", "blood_fullmoon", "blood_halffullmoon", "blood_lunar_eclipse", "blood_newmoon",
  "blue_fullmoon", "blue_fullmoon_conch", "blue_halfmoon", "blue_lunar_eclipse", "blue_newmoon",
  "blue_summer_newmoon", "blue_summer_sink_fullmoon", "blue_summer_supermoon",
  "gold_lunar_eclipse",
  "green_fullmoon", "green_halfmoon", "green_newmoon",
  "orange_fullmoon", "orange_halfmoon", "orange_newmoon",
  "purple_fullmoon", "purple_lunar_eclipse", "purple_newmoon_crystal",
  "white_fullmoon_crystal", "white_lunar_eclipse", "white_newmoon", "white_supermoon",
  "yellow_halfmoon_conch", "yellow_newmoon_conch",
];
/* 由檔名推月相標籤，之後要「背景跟著今天的月相走」就靠這個分類 */
function altarPhaseOf(name) {
  if (/eclipse/.test(name)) return "eclipse";
  if (/newmoon|darkmoon/.test(name)) return "new";
  if (/halfmoon|halffullmoon/.test(name)) return "quarter";
  if (/fullmoon|supermoon/.test(name)) return "full";
  return "any";
}
const ALTAR_BG_DIR = "assets/altar/";
let _lastAltarBg = null;
function pickAltarBackdrop() {
  const pool = ALTAR_BACKDROPS.length > 1
    ? ALTAR_BACKDROPS.filter(n => n !== _lastAltarBg)   // 避免連續兩次同一張
    : ALTAR_BACKDROPS;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  _lastAltarBg = pick;
  return pick;
}
/* 先把圖預載好再換上去，避免祭壇閃一下黑底 */
function applyAltarBackdrop(el) {
  if (!el) return;
  const name = pickAltarBackdrop();
  const url = `${ALTAR_BG_DIR}${name}.webp`;
  el.dataset.bg = name;
  const swap = () => { el.style.setProperty("--altar-bg", `url("${url}")`); };
  const img = new Image();
  img.onload = swap;
  img.onerror = () => { /* 圖缺了就留在 CSS 的預設底圖，不要弄壞整頁 */ };
  img.src = url;
  if (img.complete) swap(); // 已在快取裡就直接換，不等 onload
}

function startAltarClouds(cv) {
  if (!cv || !cv.getContext) return null;
  const ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W, H, raf = null, t = 0, puffs = [];
  const build = () => {
    // 雲層集中在畫面上半（月亮附近），低層再加一點地面霧氣
    puffs = Array.from({ length: 26 }, (_, i) => {
      const low = i >= 18;
      return {
        x: Math.random() * W, y: (low ? 0.62 + Math.random() * 0.3 : 0.05 + Math.random() * 0.42) * H,
        r: (low ? 90 : 60 + Math.random() * 110) * dpr * (low ? 1.5 : 1),
        sp: (0.06 + Math.random() * 0.22) * dpr * (Math.random() < 0.5 ? -1 : 1),
        a: low ? 0.05 + Math.random() * 0.05 : 0.05 + Math.random() * 0.09,
        ph: Math.random() * Math.PI * 2,
        tint: low ? "150,165,190" : (Math.random() < 0.35 ? "236,170,190" : "180,190,215"),
      };
    });
  };
  const resize = () => {
    const r = cv.getBoundingClientRect();
    W = cv.width = Math.max(1, Math.round(r.width * dpr));
    H = cv.height = Math.max(1, Math.round(r.height * dpr));
    build();
  };
  const paint = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const p of puffs) {
      p.x += p.sp;
      if (p.x - p.r > W) p.x = -p.r; else if (p.x + p.r < 0) p.x = W + p.r;
      const a = p.a * (0.65 + 0.35 * Math.sin(t * 0.0008 + p.ph)); // 緩慢明滅，像雲在呼吸
      const y = p.y + Math.sin(t * 0.0004 + p.ph) * 8 * dpr;
      const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r);
      g.addColorStop(0, `rgba(${p.tint},${a})`);
      g.addColorStop(1, `rgba(${p.tint},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    // 月暈脈動（對齊圖中月亮的大致位置：水平置中、偏上）
    const mx = W * 0.5, my = H * 0.19, mr = Math.min(W, H) * (0.3 + 0.02 * Math.sin(t * 0.0012));
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0, `rgba(255,190,205,${0.07 + 0.03 * Math.sin(t * 0.0012)})`);
    mg.addColorStop(1, "rgba(255,190,205,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };
  const frame = () => { t += 16; paint(); raf = requestAnimationFrame(frame); };
  resize();
  window.addEventListener("resize", resize);
  if (REDUCED_MOTION) paint(); else frame();
  return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
}

function renderSummon() {
  const el = $("#view-summon");
  const s = shellState();
  const charges = s.charges || 0;
  const streak = calcStreak();
  const rem = streak % SUMMON_PER_STREAK_DAYS;
  const daysToNext = rem === 0 ? SUMMON_PER_STREAK_DAYS : SUMMON_PER_STREAK_DAYS - rem;
  const doneRem = countDoneTodos() % SUMMON_PER_TODOS;
  const todosToNext = doneRem === 0 ? SUMMON_PER_TODOS : SUMMON_PER_TODOS - doneRem;
  const totalFrag = Object.values(s.frag || {}).reduce((a, b) => a + b, 0);

  el.innerHTML = `
    <div class="altar">
      <canvas class="altar-clouds" aria-hidden="true"></canvas>
      <div class="altar-inner">
        <p class="altar-kicker">✦ 月光祭壇 ✦</p>
        <h2 class="altar-title">神奇海螺召喚儀式</h2>
        <p class="altar-sub">${charges
          ? `魔法陣已經亮起，你有 <b>${charges}</b> 次召喚機會`
          : "魔法陣還未能啟動，先去累積你的紀錄吧"}</p>
        <button class="altar-btn ${charges ? "" : "off"}" id="summon-go" ${charges ? "" : "disabled"}>
          ${charges ? "🔮 召喚神奇海螺" : "🔒 尚無召喚機會"}
        </button>
        <p class="altar-hint">
          ${charges
            ? "深呼吸，把手放在螢幕上。"
            : `再連續紀錄 <b>${daysToNext}</b> 天，或再完成 <b>${todosToNext}</b> 件待辦，就能開啟一次。`}
        </p>
      </div>
    </div>
    <div class="card">
      <h2>🔮 召喚能量如何累積 <span class="sub beta-tag">測試中</span></h2>
      <ul class="summon-rules">
        <li><b>連續紀錄 ${SUMMON_PER_STREAK_DAYS} 天</b>：夢境、思考紀錄、快速心情、日記、小本本、三件感謝、小勝利聖杯、顯化儀式⋯任何一種都算數（目前連續 ${streak} 天）</li>
        <li><b>完成 ${SUMMON_PER_TODOS} 件待辦</b>：在「思考」分頁的待辦事項打勾（已完成 ${countDoneTodos()} 件）</li>
        <li><b>流星雨</b>：切換分頁時偶爾會出現，記得趕快許願，有機會拿到神奇海螺碎片</li>
      </ul>
      <p class="muted small">碎片屬性隨機出現，也有可能神奇海螺本身偏忙碌，下次才會來。</p>
    </div>
    <div class="card">
      <h2>🐚 目前的收藏 <span class="sub">${s.complete || 0} 顆完整・${totalFrag} 片碎片</span></h2>
      <div class="shell-grid">
        ${SHELL_COLORS.map(c => `
          <div class="shell-item shell-${c.key}${c.rare ? " shell-rare" : ""}">
            <span class="shell-emoji">${c.emoji}</span>
            <span class="shell-name">${esc(c.name)}${c.rare ? `<i>${esc(c.rarity)}</i>` : ""}</span>
            <span class="shell-count">${s.frag[c.key] || 0}/${SHELL_FRAGMENTS_PER_SHELL}</span>
          </div>`).join("")}
      </div>
    </div>`;

  stopAltar();
  applyAltarBackdrop($(".altar", el));
  _altarStop = startAltarClouds($(".altar-clouds", el));
  $("#summon-go")?.addEventListener("click", doSummon);
}

/* 扭蛋：10% 摃龜，其餘依權重抽一種元素（星際版極罕見） */
function doSummon() {
  const s = shellState();
  if ((s.charges || 0) <= 0) return toast("目前沒有召喚機會");
  s.charges -= 1;
  s.summons = (s.summons || 0) + 1;
  const miss = Math.random() < SUMMON_MISS_CHANCE;
  let result = null;
  if (!miss) result = awardShellFragment();
  store.save();

  const finale = miss ? "🌫" : SHELL_BY_KEY[result.key].emoji;
  magicFX("summon", "召喚魔法陣繪製中⋯", () => showSummonResult(miss, result),
    { color: "silver", finale, dur: 3200 });
}

function showSummonResult(miss, result) {
  if (miss) {
    const m = modal(`
      <div class="summon-res">
        <div class="sr-emoji">🌫</div>
        <h3>神奇海螺偏忙碌</h3>
        <p class="muted">下次一定會更讚 ✨</p>
        <p class="muted small">辣妹不氣餒，繼續紀錄，祭壇一直在這裡等著你。</p>
      </div>
      <div class="btn-row"><button class="btn" id="sr-close">好的</button></div>`);
    $("#sr-close", m).addEventListener("click", () => { m.remove(); renderSummon(); });
    return;
  }
  const info = SHELL_BY_KEY[result.key];
  const s = shellState();
  const m = modal(`
    <div class="summon-res ${info.rare ? "rare" : ""} ${info.key === "kerr" ? "kerr" : ""}">
      <div class="sr-emoji">${info.emoji}</div>
      ${info.rare ? `<p class="sr-rare">✦ ${esc(info.rarity)} ✦</p>` : ""}
      <h3>${esc(info.name)}神奇海螺碎片 ×1</h3>
      ${result.merged
        ? `<p class="sr-merged">🎉 碎片集滿 ${SHELL_FRAGMENTS_PER_SHELL} 片，合成一顆完整的${info.emoji}${esc(info.name)}神奇海螺！</p>`
        : `<p class="muted">目前 ${s.frag[result.key] || 0}/${SHELL_FRAGMENTS_PER_SHELL} 片，集滿即可合成一顆完整神奇海螺。</p>`}
      <p class="muted small">剩餘召喚機會：${s.charges || 0} 次</p>
    </div>
    <div class="btn-row">
      <button class="btn" id="sr-close">收下</button>
      ${(s.charges || 0) > 0 ? `<button class="btn secondary" id="sr-again">🔮 再召喚一次</button>` : ""}
    </div>`);
  $("#sr-close", m).addEventListener("click", () => { m.remove(); renderSummon(); });
  $("#sr-again", m)?.addEventListener("click", () => { m.remove(); doSummon(); });
}

/* ================= 宇宙（天象・專欄・新聞・知識・測驗） =================
   五個區塊改用子分頁呈現，而不是四張卡片一路往下疊。
   理由：底部分頁列已經有九顆按鈕，手機上再加一顆會擠到很難點；
   而專欄文章之後會越來越多，擺在最下面等於沒人看得到。
   選了哪個子分頁記在 settings.cosmosSub，下次回來還在同一頁。 */
const COSMOS_SUBS = [
  { key: "sky",    icon: "✨", label: "天象" },
  { key: "column", icon: "🖋", label: "專欄" },
  { key: "news",   icon: "📰", label: "新聞" },
  { key: "know",   icon: "📖", label: "知識" },
  { key: "quiz",   icon: "🧪", label: "測驗" },
];
const cosmosSub = () => {
  const k = store.data.settings.cosmosSub;
  return COSMOS_SUBS.some(s => s.key === k) ? k : "sky";
};

function renderCosmos() {
  const el = $("#view-cosmos");
  const sub = cosmosSub();
  el.innerHTML = `
    <div class="subtabs" role="tablist">${COSMOS_SUBS.map(s => `
      <button type="button" class="subtab ${s.key === sub ? "on" : ""}" role="tab"
        aria-selected="${s.key === sub}" data-sub="${s.key}"><span>${s.icon}</span>${s.label}</button>`).join("")}</div>
    <div id="cosmos-body"></div>`;
  /* 切換子分頁時「不要」動垂直捲動位置。
     之前這裡會 scrollIntoView 把整個宇宙分頁捲到最上面，結果子分頁列被推到
     標題列底下，看起來像自動隱藏。現在那一列是 sticky 的，本來就一直看得到。 */
  $$(".subtab", el).forEach(b => b.addEventListener("click", () => {
    store.data.settings.cosmosSub = b.dataset.sub;
    store.save();
    renderCosmos();
  }));
  /* 子分頁列可橫向捲動，選到最右邊的「測驗」時它會被切一半。
     只捲那一列本身，不要連帶動到頁面的垂直位置。 */
  const on = $(".subtab.on", el);
  if (on) {
    const bar = on.parentElement;
    bar.scrollLeft = on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2;
  }
  ({ sky: renderCosmosSky, column: renderCosmosColumn, news: renderCosmosNews,
     know: renderCosmosKnow, quiz: renderCosmosQuiz }[sub])();
}

function renderCosmosSky() {
  const events = allUpcomingEvents(120);
  $("#cosmos-body").innerHTML = `
    <div class="card">
      <h2>✨ 天象與月相節點 <span class="sub">未來 120 天</span></h2>
      <p class="muted small">日蝕／流星雨等可見性視地區與天候而定。新月・滿月依真實朔望時刻計算，並以你裝置所在時區顯示。</p>
      ${events.map(eventRowHTML).join("") || `<p class="muted">近期無事件</p>`}
      <div class="btn-row"><button class="btn ghost" id="ev-add">＋ 自訂天象／儀式提醒（例：行星連珠）</button></div>
      <div class="btn-row"><button class="btn secondary" id="ev-ics">📆 匯出天象行事曆（.ics，含手機原生提醒）</button></div>
    </div>`;
  const el = $("#view-cosmos");
  bindEventRows(el);
  $("#ev-add").addEventListener("click", openCustomEventForm);
  $("#ev-ics").addEventListener("click", exportICS);
}

function renderCosmosColumn() {
  $("#cosmos-body").innerHTML = `
    <div class="card">
      <h2>🖋 星塵專欄 <span class="sub">Blue・中英對照</span></h2>
      <p class="muted small">星塵夢汐的原創天象雙語文章。累積知識的同時還能一起學英文。</p>
      <div id="col-list">${COLUMN.map(columnRowHTML).join("")}</div>
    </div>`;
  $$("#col-list .art-row").forEach(r =>
    r.addEventListener("click", () => openArticle(columnById(r.dataset.id), "zh")));
}

function renderCosmosNews() {
  $("#cosmos-body").innerHTML = `
    <div class="card">
      <h2>📰 宇宙新聞 <span class="sub">NASA・每週更新</span></h2>
      <p class="muted small" id="news-note">內容取自 NASA。點文章可切換中／英。</p>
      <div id="news-list">${liveNews().map(newsRowHTML).join("")}</div>
    </div>`;
  bindNewsRows($("#view-cosmos"));
  refreshSpaceNews();   // 背景抓當週最新，回來再換掉清單
}

function renderCosmosKnow() {
  $("#cosmos-body").innerHTML = `
    <div class="card">
      <h2>📖 天文知識 <span class="sub">中英雙語</span></h2>
      <p class="muted small">Star Walk 風格的天文入門文章，點開可切換中／英。讀完可以到「測驗」考自己。</p>
      <div id="know-list">${KNOWLEDGE.map(knowRowHTML).join("")}</div>
    </div>`;
  $$("#know-list .art-row").forEach(r =>
    r.addEventListener("click", () => openArticle(KNOWLEDGE.find(k => k.id === r.dataset.id), "zh")));
}

/* ---------- 宇宙知識問答 ----------
   每輪從題庫隨機抽 QUIZ_PER_ROUND 題，選項也洗牌。
   獎勵刻意設得很克制：每天「第一次」全對才給一片碎片，其餘純練習。
   這樣一天最多多出一片，不會把召喚祭壇的經濟弄壞，但仍有回來玩的理由。 */
const QUIZ_PER_ROUND = 5;
let _quiz = null;   // 進行中的這一輪；null = 還沒開始

const QUIZ_STREAK_GOAL = 7;   // 連續參加幾天換一次召喚機會

function quizState() {
  const st = store.data.settings;
  st.quiz ||= {};
  const q = st.quiz;
  q.plays ||= 0; q.best ||= 0; q.totalCorrect ||= 0; q.totalAnswered ||= 0;
  q.lastRewardDate ||= "";
  q.streak ||= 0;          // 目前連續參加天數
  q.lastPlayDate ||= "";   // 上次「完成一輪」的日期
  q.playDates ||= [];      // 有參加過的日期，只留最近 40 筆（畫連續紀錄用）
  q.streakRewards ||= 0;   // 已經換過幾次召喚機會
  return q;
}
const yesterdayStr = () => {
  // 用日期元件往回推一天，不要用「現在減 86400000 毫秒」：
  // 有日光節約時間的地區減 24 小時可能還停在同一天，連續天數就會斷掉。
  const d = fromDstr(todayStr());
  d.setDate(d.getDate() - 1);
  return dstr(d);
};
/* 完成一輪就算「今天有參加」，答對與否不影響。
   回傳這一輪是不是當天第一次、以及有沒有剛好滿七天換到召喚機會。 */
function bumpQuizStreak(q) {
  const t = todayStr();
  if (q.lastPlayDate === t) return { newDay: false, charge: false };
  q.streak = q.lastPlayDate === yesterdayStr() ? q.streak + 1 : 1;
  q.lastPlayDate = t;
  q.playDates = [...new Set([...q.playDates, t])].sort().slice(-40);
  let charge = false;
  if (q.streak % QUIZ_STREAK_GOAL === 0) {
    const s = shellState();
    s.charges = (s.charges || 0) + 1;
    q.streakRewards++;
    charge = true;
  }
  return { newDay: true, charge };
}
/* 最近 N 天的參加紀錄，今天排在最右邊 */
function quizStreakDays(n = QUIZ_STREAK_GOAL) {
  const played = new Set(quizState().playDates);
  const out = [];
  const d = fromDstr(todayStr());
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const ds = dstr(d);
    out.push({ date: ds, md: `${d.getMonth() + 1}/${d.getDate()}`, done: played.has(ds), today: ds === todayStr() });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function quizStreakHTML() {
  const q = quizState();
  const days = quizStreakDays();
  const toGo = QUIZ_STREAK_GOAL - (q.streak % QUIZ_STREAK_GOAL || QUIZ_STREAK_GOAL);
  return `
    <div class="quiz-streak">
      <div class="qs-head">
        <b>🔥 連續參加 ${q.streak} 天</b>
        <span>${q.streak === 0
          ? `連續 ${QUIZ_STREAK_GOAL} 天換一次召喚機會`
          : toGo === 0 ? "今天達標，明天開始新一輪 ✨" : `再 ${toGo} 天換一次召喚機會`}</span>
      </div>
      <div class="qs-days">${days.map(d => `
        <div class="qs-day ${d.done ? "done" : ""} ${d.today ? "now" : ""}">
          <i>${d.done ? "✓" : ""}</i><span>${d.md}</span>
        </div>`).join("")}</div>
      ${q.streakRewards ? `<p class="muted small">已經換到 ${q.streakRewards} 次召喚機會 🔮</p>` : ""}
    </div>`;
}
/* Fisher-Yates，就地洗牌 */
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderCosmosQuiz() {
  if (_quiz) return drawQuiz();
  const q = quizState();
  const gotToday = q.lastRewardDate === todayStr();
  const acc = q.totalAnswered ? Math.round(q.totalCorrect / q.totalAnswered * 100) : null;
  $("#cosmos-body").innerHTML = `
    <div class="card">
      <h2>🧪 宇宙知識問答 <span class="sub beta-tag">測試中</span></h2>
      <p class="muted small">
        每輪 ${QUIZ_PER_ROUND} 題，從 ${QUIZ_BANK.length} 題裡隨機抽，選項順序也會打亂。
        答完每題都會告訴你為什麼，還能直接跳去讀對應的那篇天文知識。
      </p>
      <div class="quiz-stats">
        <div><b>${q.plays}</b><span>已完成</span></div>
        <div><b>${q.best}/${QUIZ_PER_ROUND}</b><span>最佳</span></div>
        <div><b>${acc === null ? "—" : acc + "%"}</b><span>正確率</span></div>
      </div>
      ${quizStreakHTML()}
      <p class="muted small">${gotToday
        ? "🐚 今天的碎片已經領過了。現在是純練習，不會再掉碎片，但成績照樣記錄。"
        : `🐚 今天第一次答對全部 ${QUIZ_PER_ROUND} 題，可以獲得一片隨機神奇海螺碎片。`}</p>
      <p class="muted small">🔮 答對與否不影響連續天數，只要完成一輪就算今天有來。</p>
      <div class="btn-row"><button class="btn" id="quiz-start">🚀 開始測驗</button></div>
    </div>`;
  $("#quiz-start").addEventListener("click", () => {
    _quiz = {
      qs: shuffled(QUIZ_BANK).slice(0, QUIZ_PER_ROUND).map(item => ({
        ...item,
        // 選項連同「是不是正解」一起洗，之後就不必再對照索引
        shuffled: shuffled(item.opts.map((text, i) => ({ text, correct: i === item.a }))),
      })),
      i: 0, picked: null, score: 0, wrong: [],
    };
    drawQuiz();
  });
}

function drawQuiz() {
  const st = _quiz;
  if (st.i >= st.qs.length) return drawQuizResult();
  const item = st.qs[st.i];
  const answered = st.picked !== null;
  $("#cosmos-body").innerHTML = `
    <div class="card quiz-card">
      <div class="quiz-top">
        <span class="quiz-progress">第 ${st.i + 1} / ${st.qs.length} 題</span>
        <span class="quiz-cat">${esc(item.cat)}</span>
      </div>
      <div class="quiz-bar"><i style="width:${st.i / st.qs.length * 100}%"></i></div>
      <h3 class="quiz-q">${esc(item.q)}</h3>
      <div class="quiz-opts">
        ${item.shuffled.map((o, i) => {
          let cls = "";
          if (answered) {
            if (o.correct) cls = "right";
            else if (i === st.picked) cls = "wrong";
            else cls = "dim";
          }
          return `<button type="button" class="quiz-opt ${cls}" data-i="${i}" ${answered ? "disabled" : ""}>
            ${esc(o.text)}${answered && o.correct ? " ✓" : ""}${answered && i === st.picked && !o.correct ? " ✗" : ""}
          </button>`;
        }).join("")}
      </div>
      ${answered ? `
        <div class="quiz-why">
          <b>${item.shuffled[st.picked].correct ? "答對了 ✨" : "再看一次 👀"}</b>
          <p>${esc(item.why)}</p>
          ${KNOWLEDGE.find(k => k.id === item.ref)
            ? `<button type="button" class="btn small secondary" id="quiz-read">📖 讀這篇：${esc(KNOWLEDGE.find(k => k.id === item.ref).zhTitle)}</button>`
            : ""}
        </div>
        <div class="btn-row">
          <button class="btn" id="quiz-next">${st.i + 1 >= st.qs.length ? "看結果" : "下一題"}</button>
        </div>` : ""}
      <div class="btn-row"><button class="btn ghost small" id="quiz-quit">結束這一輪</button></div>
    </div>`;

  $$(".quiz-opt").forEach(b => b.addEventListener("click", () => {
    if (st.picked !== null) return;
    st.picked = +b.dataset.i;
    const ok = item.shuffled[st.picked].correct;
    if (ok) st.score++; else st.wrong.push(item);
    const qs = quizState();
    qs.totalAnswered++; if (ok) qs.totalCorrect++;
    store.save();
    drawQuiz();
  }));
  $("#quiz-read")?.addEventListener("click", () => openArticle(KNOWLEDGE.find(k => k.id === item.ref), "zh"));
  $("#quiz-next")?.addEventListener("click", () => { st.i++; st.picked = null; drawQuiz(); });
  $("#quiz-quit").addEventListener("click", () => { _quiz = null; renderCosmosQuiz(); });
}

function drawQuizResult() {
  const st = _quiz;
  const q = quizState();
  q.plays++;
  if (st.score > q.best) q.best = st.score;

  // 每天第一次全對才給碎片，避免一直重刷把海螺經濟灌爆
  let reward = null;
  if (st.score === st.qs.length && q.lastRewardDate !== todayStr()) {
    q.lastRewardDate = todayStr();
    reward = awardShellFragment();
  }
  // 連續參加：完成一輪就算，答對與否不影響；滿七天換一次召喚機會
  const streak = bumpQuizStreak(q);
  store.save();

  const perfect = st.score === st.qs.length;
  $("#cosmos-body").innerHTML = `
    <div class="card quiz-card">
      <div class="quiz-result">
        <div class="qr-emoji">${perfect ? "🌟" : st.score >= 3 ? "✨" : "🌙"}</div>
        <h3>${st.score} / ${st.qs.length} 題答對</h3>
        <p class="muted">${perfect ? "全對，辣妹是天文系的吧。"
          : st.score >= 3 ? "不錯，錯的那幾題點下去讀一下就記起來了。"
          : "沒關係，這一輪就當導覽，把解析讀完就賺到了。"}</p>
        ${reward ? `<p class="quiz-reward">🐚 獲得「${SHELL_BY_KEY[reward.key].emoji}${esc(SHELL_BY_KEY[reward.key].name)}碎片」×1${
          reward.merged ? `<br>✨ 碎片集滿，合成一顆完整的神奇海螺！` : ""}</p>` : ""}
        ${!reward && perfect ? `<p class="muted small">今天的碎片已經領過了，成績仍然記錄。</p>` : ""}
        ${streak.charge ? `<p class="quiz-reward">🔮 連續參加滿 ${QUIZ_STREAK_GOAL} 天，獲得一次神奇海螺召喚機會！</p>` : ""}
      </div>
      ${quizStreakHTML()}
      ${st.wrong.length ? `
        <div class="quiz-review">
          <b class="quiz-review-h">答錯的題目</b>
          ${st.wrong.map(w => `
            <div class="quiz-review-item">
              <p class="qri-q">${esc(w.q)}</p>
              <p class="qri-a">正解：${esc(w.opts[w.a])}</p>
              <p class="qri-why">${esc(w.why)}</p>
            </div>`).join("")}
        </div>` : ""}
      <div class="btn-row">
        <button class="btn" id="quiz-again">🔁 再來一輪</button>
        <button class="btn secondary" id="quiz-done">回到測驗首頁</button>
      </div>
    </div>`;
  $("#quiz-again").addEventListener("click", () => { _quiz = null; renderCosmosQuiz(); $("#quiz-start")?.click(); });
  $("#quiz-done").addEventListener("click", () => { _quiz = null; renderCosmosQuiz(); });
}

/* ---------- 每週更新的宇宙新聞 ----------
   api/space-news 從 NASA RSS 抓當週最新（CDN 一週只回源一次）。
   抓失敗或還沒回來時，一律顯示 App 內建的 NEWS，畫面不會開天窗。 */
let _liveNews = null;      // 後端回來的當週新聞；null = 還沒拿到
let _newsFetched = false;
const liveNews = () => (_liveNews?.length ? _liveNews : NEWS);
const newsById = id => liveNews().find(n => n.id === id) || NEWS.find(n => n.id === id);

function bindNewsRows(el) {
  $$("#news-list .art-row", el).forEach(r =>
    r.addEventListener("click", () => openArticle(newsById(r.dataset.id), "en")));
}

async function refreshSpaceNews() {
  if (_newsFetched) return;              // 一次 session 抓一次就夠，其餘交給 CDN
  _newsFetched = true;
  try {
    const r = await fetch("api/space-news", { cache: "no-store" });
    const j = await r.json();
    if (!j.ok || !j.items?.length) return;
    _liveNews = j.items;
  } catch { return; }
  if (currentTab !== "cosmos") return;   // 使用者已經切走就不動畫面
  const list = $("#news-list");
  if (!list) return;
  list.innerHTML = _liveNews.map(newsRowHTML).join("");
  bindNewsRows($("#view-cosmos"));
  // 後端沒設 ANTHROPIC_API_KEY 時抓回來的是純英文，別再寫「可切換中／英」誤導user
  const note = $("#news-note");
  if (note) {
    note.textContent = _liveNews.some(n => n.zhTitle)
      ? "內容取自 NASA，每週更新。點文章可切換中／英。"
      : "內容取自 NASA，每週更新（原文英文）。點文章可閱讀全文。";
  }
}
function newsRowHTML(n) {
  return `<button type="button" class="entry art-row" data-id="${esc(n.id)}" style="width:100%;text-align:left">
    <div class="meta">${n.icon || "🛰️"} ${esc(n.date)}・${esc(n.source || "NASA")}</div>
    <div class="body" style="font-weight:600">${esc(n.enTitle)}</div>
    ${n.zhTitle ? `<div class="muted small">${esc(n.zhTitle)}</div>` : ""}
  </button>`;
}
function columnRowHTML(c) {
  return `<button type="button" class="entry art-row" data-id="${esc(c.id)}" style="width:100%;text-align:left">
    <div class="meta">${c.icon || "🖋"} ${esc(fmtMD(c.date))}・${esc(c.author || "Blue")}</div>
    <div class="body" style="font-weight:600">${esc(c.zhTitle)}</div>
    ${c.zhSub ? `<div class="muted small">${esc(c.zhSub)}</div>` : ""}
    <div class="muted small">${esc(c.enTitle)}</div>
  </button>`;
}
function knowRowHTML(k) {
  return `<button type="button" class="entry art-row" data-id="${esc(k.id)}" style="width:100%;text-align:left">
    <div class="meta">${k.icon} ${esc(k.cat)}</div>
    <div class="body" style="font-weight:600">${esc(k.zhTitle)}</div>
    <div class="muted small">${esc(k.enTitle)}</div>
  </button>`;
}
/* 通用文章閱讀器：預設語言 defLang（"en"／"zh"），可切換 */
function openArticle(item, defLang) {
  if (!item) return;
  if (item.bilingual) return openBilingualArticle(item);
  let lang = defLang;
  const m = modal(`<div id="art-body"></div>`);
  const draw = () => {
    const title = lang === "en" ? (item.enTitle || item.zhTitle) : (item.zhTitle || item.enTitle);
    const paras = lang === "en" ? (item.enBody || item.zhBody) : (item.zhBody || item.enBody);
    $("#art-body", m).innerHTML = `
      <div class="btn-row" style="margin-bottom:8px">
        <button class="btn small ${lang === "zh" ? "" : "secondary"}" id="art-zh" style="flex:1">中文</button>
        <button class="btn small ${lang === "en" ? "" : "secondary"}" id="art-en" style="flex:1">English</button>
      </div>
      <h3 style="text-wrap:balance">${item.icon || ""} ${esc(title)}</h3>
      ${item.date ? `<p class="muted small">${esc(item.date)}</p>` : ""}
      <div style="margin:10px 0;line-height:1.75">${paras.map(p => `<p style="margin:8px 0">${esc(p)}</p>`).join("")}</div>
      ${item.source ? `<p class="muted small">來源 Source：<a href="${esc(item.url)}" target="_blank" rel="noopener" style="color:var(--accent)">${esc(item.source)}</a></p>` : ""}
      <div class="btn-row"><button class="btn secondary" id="art-close">關閉</button></div>`;
    $("#art-zh", m).addEventListener("click", () => { lang = "zh"; draw(); });
    $("#art-en", m).addEventListener("click", () => { lang = "en"; draw(); });
    $("#art-close", m).addEventListener("click", () => m.remove());
  };
  draw();
}
/* 中英對照閱讀器（星塵專欄用）：不切換語言，中文全文讀完直接接續英文全文 */
function openBilingualArticle(item) {
  const paras = arr => arr.map(p =>
    p === COLUMN_SEP ? `<hr class="art-sep">` : `<p style="margin:10px 0">${esc(p)}</p>`).join("");
  const m = modal(`
    <article class="art-bi">
      <h3 style="text-wrap:balance">${item.icon || ""} ${esc(item.zhTitle)}</h3>
      ${item.zhSub ? `<p class="art-sub">${esc(item.zhSub)}</p>` : ""}
      <p class="muted small">${esc(item.date)}・作者 ${esc(item.author || "Blue")}</p>
      <div class="art-text">${paras(item.zhBody)}</div>
      <div class="art-lang">English</div>
      <h3 style="text-wrap:balance">${item.icon || ""} ${esc(item.enTitle)}</h3>
      ${item.enSub ? `<p class="art-sub">${esc(item.enSub)}</p>` : ""}
      <p class="muted small">${esc(item.date)}・by ${esc(item.author || "Blue")}</p>
      <div class="art-text">${paras(item.enBody)}</div>
    </article>
    <div class="btn-row"><button class="btn secondary" id="art-close">關閉</button></div>`);
  $("#art-close", m).addEventListener("click", () => m.remove());
  return m;
}

function showDayDetail(ds) {
  $$(".cal-cell").forEach(c => c.classList.toggle("sel", c.dataset.date === ds));
  const mi = moonInfo(new Date(fromDstr(ds).getTime() + 12 * 3600e3));
  const items = [
    ...store.data.dreams.filter(d => d.date === ds).map(d => `🌙 ${esc(d.text.slice(0, 60))}`),
    ...store.data.diary.filter(d => d.date === ds).map(d => `✍️ 心情 ${d.mood}/10 ${esc((d.text || "").slice(0, 50))}`),
    ...store.data.cbt.filter(d => d.date === ds).map(d => `🧠 ${esc((d.situation || d.dump || "").slice(0, 50))}`),
  ];
  $("#cal-detail").innerHTML = `
    <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">
      <b>${esc(fmtMD(ds))}</b> ${mi.e} ${esc(mi.n)}・月齡 ${mi.age.toFixed(1)} 天
      ${items.length ? items.map(i => `<div class="small" style="margin-top:6px">${i}</div>`).join("") : `<p class="muted small" style="margin-top:6px">這天沒有紀錄</p>`}
    </div>`;
}
function eventRowHTML(e) {
  const dd = daysBetween(todayStr(), e.date);
  // 就是今天的那一列多一個 today class，外框會慢慢發光又變暗（見 style.css 的 ev-breathe）
  return `<div class="event-row${dd === 0 ? " today" : ""}" data-ev-date="${esc(e.date)}" data-ev-type="${esc(e.type)}" data-ev-title="${esc(e.title)}">
    <div class="d"><b>${esc(fmtMD(e.date))}</b><span>${fromDstr(e.date).getFullYear()}</span></div>
    <div class="t"><b>${esc(e.title)}</b><p>${esc(e.note || "")}</p></div>
    <div class="cd">${dd === 0 ? "今天！" : `${dd} 天後`}</div>
  </div>`;
}
function bindEventRows(root) {
  $$(".event-row", root).forEach(row => row.addEventListener("click", () => {
    const { evType, evTitle, evDate } = row.dataset;
    const rit = RITUALS[evType] || RITUALS.custom;
    magicFX("sigil", `繪製魔法陣⋯${rit.name}`, () => openRitualModal(evType, evTitle, evDate, rit));
  }));
}
function openRitualModal(evType, evTitle, evDate, rit) {
  const isCustom = store.data.customEvents.some(e => e.date === evDate && e.title === evTitle);
    const m = modal(`
      <h3>${esc(evTitle)}・${esc(fmtMD(evDate))}</h3>
      <div class="socratic">${esc(rit.name)}</div>
      <ol style="padding-left:20px;font-size:.9rem">${rit.steps.map(s => `<li style="margin:6px 0">${esc(s)}</li>`).join("")}</ol>
      <div class="btn-row">
        <button class="btn" id="ev-journal">當天寫進日記</button>
        ${isCustom ? `<button class="btn secondary" id="ev-del">刪除此提醒</button>` : ""}
      </div>
      <p class="muted small center" style="margin-top:10px">儀式是給自己的正念時間，安全第一，觀星請注意環境狀況。</p>`);
    $("#ev-journal", m).addEventListener("click", () => { m.remove(); openDiaryForm(); });
    $("#ev-del", m)?.addEventListener("click", () => {
      store.data.customEvents = store.data.customEvents.filter(e => !(e.date === evDate && e.title === evTitle));
      store.save(); m.remove(); VIEWS[currentTab]();
    });
}
function openCustomEventForm() {
  const m = modal(`
    <h3>＋ 自訂天象／儀式提醒</h3>
    <p class="muted small">看到「六星連珠」「超級月亮」這類新聞？想把日期記進來，App 會倒數提醒你。</p>
    <label class="field">名稱</label><input type="text" id="ce-title" placeholder="例：行星連珠">
    <label class="field">日期</label><input type="date" id="ce-date" value="${todayStr()}">
    <label class="field">備註（選填）</label><input type="text" id="ce-note" placeholder="例：日出前東方低空">
    <div class="btn-row"><button class="btn" id="ce-save">加入</button><button class="btn secondary" id="ce-cancel">取消</button></div>`);
  $("#ce-cancel", m).addEventListener("click", () => m.remove());
  $("#ce-save", m).addEventListener("click", () => {
    const title = $("#ce-title", m).value.trim();
    const date = $("#ce-date", m).value;
    if (!title || !date) return toast("名稱和日期都要填");
    store.data.customEvents.push({ date, title, note: $("#ce-note", m).value.trim(), type: "custom" });
    store.save(); m.remove(); VIEWS[currentTab](); toast("已加入，會在到期前倒數提醒你 ✨");
  });
}

/* ================= 🗝 寶庫（膠囊・海螺・小勝利・洞察・報告・睡眠） ================= */
function renderMore() {
  const el = $("#view-more");
  const caps = [...store.data.capsules].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  const t = todayStr();
  const wins = [...store.data.wins].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  el.innerHTML = `
    <div class="card">${shellVaultHTML()}</div>
    <div class="card">
      <h2>⏳ 時空膠囊 ☄️<span class="sub">${caps.length} 顆</span></h2>
      <p class="muted small">拍下現在、寫給未來的自己，過去的你，也能提醒當下、未來的你，到期之前將完全封存。</p>
      <div id="cap-list">${caps.map(c => capsuleHTML(c, t)).join("") || ""}</div>
      <div class="btn-row"><button class="btn" id="cap-new">✉️ 封印一顆新的時空膠囊 🐚</button></div>
    </div>
    <div class="card">
      <h2>🏆 小勝利聖杯 <span class="sub">${wins.length} 件</span></h2>
      <p class="muted small">「我做到了」的任何小事都值得被記住。難過的時候打開這個罐子，看看自己一路累積了什麼。</p>
      <div class="add-emo">
        <input type="text" id="win-input" placeholder="例：今天主動說出了自己的想法⋯按 Enter">
        <button type="button" class="btn small" id="win-add">＋</button>
      </div>
      <div id="win-list"></div>
      ${wins.length >= 3 ? `<div class="btn-row"><button class="btn secondary" id="win-random">🎲 隨機翻一件事來回顧</button></div>` : ""}
    </div>
    <div class="card"><h2>📊 洞察</h2><div id="insights"></div></div>
    <div class="card">
      <h2>📈 內在報告</h2>
      <p class="muted small">回顧一段時間的自己：情緒的喜怒哀樂、夢的符號、思緒的變化，可匯出帶去諮商、回診參考或自我紀錄。</p>
      <div class="btn-row">
        <button class="btn secondary" data-report="7">週報</button>
        <button class="btn secondary" data-report="30">月報</button>
        <button class="btn secondary" data-report="365">年報</button>
      </div>
    </div>
    <div class="card">
      <h2>⌚ 睡眠 <span class="sub">Apple Watch／Sleep Cycle 走「健康」＋捷徑</span></h2>
      <div id="sleep-box"></div>
      <div class="btn-row">
        <button class="btn secondary" id="sl-manual">✍️ 手動記錄</button>
        <button class="btn secondary" id="sl-help">📲 iPhone 自動匯入教學</button>
      </div>
    </div>
    <div class="card">
      <h2>🔮 命理顧問服務</h2>
      <p class="muted small">想更深入了解自己的命盤，也可以跟 Blue 分享好笑的事。</p>
      <div class="btn-row">
        <a class="btn secondary" href="${MAIL_TO_BLUE}">💌 寫信告訴我，今天海是什麼顏色 🌊</a>
      </div>
      <div class="btn-row"><a class="btn" href="https://lin.ee/NhElh5L" target="_blank" rel="noopener">💬 加入 LINE 官方帳號</a></div>
    </div>
    <p class="disclaimer">星塵夢汐僅供自我紀錄，非供替代專業醫療，無分析治療功能。</p>`;
  $$("[data-report]", el).forEach(b => b.addEventListener("click", () => openReport(+b.dataset.report, b.textContent.trim())));
  renderSleepBox();
  renderInsights();
  renderWinList();
  $("#vault-summon")?.addEventListener("click", () => switchTab("summon"));
  $("#sl-manual").addEventListener("click", openSleepManual);
  $("#sl-help").addEventListener("click", openSleepImportHelp);
  $("#cap-new").addEventListener("click", openCapsuleForm);
  $$("#cap-list .cap-open").forEach(b => b.addEventListener("click", () => openCapsule(b.dataset.id)));
  $$("#cap-list .cap-del").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("刪除膠囊？")) return;
    const c = store.data.capsules.find(x => x.id === b.dataset.id);
    if (c?.photoId) await idb.del(c.photoId);
    store.data.capsules = store.data.capsules.filter(x => x.id !== b.dataset.id);
    store.save(); renderMore();
  }));
  const addWin = () => {
    const v = ($("#win-input", el)?.value || "").trim();
    if (!v) return;
    store.data.wins.push({ id: uid(), text: v, date: todayStr(), createdAt: new Date().toISOString() });
    store.save(); checkSummonCharges(); toast("記下來了，這都是你的功勞 🏆"); renderMore();
  };
  $("#win-add").addEventListener("click", addWin);
  $("#win-input").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addWin(); } });
  $("#win-random")?.addEventListener("click", () => {
    const w = wins[Math.floor(Math.random() * wins.length)];
    modal(`<div class="summon-res"><div class="sr-emoji">🏆</div>
      <h3>${esc(w.text)}</h3><p class="muted small">${esc(fmtMD(w.date))}・讚ㄙˇ，你做到了</p></div>
      <div class="btn-row"><button class="btn" onclick="this.closest('.modal-mask').remove()">收下這份肯定</button></div>`);
  });
}
function renderWinList() {
  const box = $("#win-list");
  if (!box) return;
  const wins = [...store.data.wins].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (!wins.length) { box.innerHTML = `<p class="muted small">聖杯還空著，今天有什麼小小成就嗎？</p>`; return; }
  box.innerHTML = wins.slice(0, 30).map(w => `
    <div class="nb-item">
      <div class="nb-body">🏆 ${esc(w.text)}</div>
      <div class="nb-meta">${esc(fmtMD(w.date))}</div>
      <button class="nb-del" data-id="${esc(w.id)}" aria-label="刪除">✕</button>
    </div>`).join("");
  $$(".nb-del", box).forEach(b => b.addEventListener("click", () => {
    store.data.wins = store.data.wins.filter(x => x.id !== b.dataset.id);
    store.save(); renderMore();
  }));
}

/* ================= ⚙️ 設定（主題・帳號・串聯・備份・本機儲存・建議） ================= */
function renderSettings() {
  const el = $("#view-settings");
  const curTheme = store.data.settings.theme || "night";
  const msName = moodSetKey() === "custom" ? "自訂" : (MOOD_SETS[moodSetKey()]?.name || "天氣");
  el.innerHTML = `
    <div class="card">
      <h2>🎨 主題</h2>
      <div class="theme-row">${Object.entries(THEMES).map(([k, t]) => `
        <button type="button" class="theme-swatch ${k === curTheme ? "on" : ""}" data-theme-key="${k}">
          <span class="dots">${t.dots.map(c => `<i style="background:${c}"></i>`).join("")}</span>${esc(t.name)}
        </button>`).join("")}</div>
    </div>
    <div class="card">
      <h2>✏️ 首頁與顯示</h2>
      <p class="muted small">決定「首頁」要放哪些區塊、以及它們的順序；心情日曆的圖示也可以換一組。</p>
      <div class="btn-row">
        <button class="btn secondary" id="set-home">✏️ 自訂首頁區塊與排序</button>
        <button class="btn secondary" id="set-mood">🎨 心情圖示（目前：${esc(msName)}）</button>
      </div>
    </div>
    <div class="card">
      <h2>📖 魔法書首頁</h2>
      <p class="muted small">是否於每次開啟 App 時，先呈現你的 Book of Shadows。</p>
      <div class="btn-row">
        <button class="btn secondary" id="book-toggle">${store.data.settings.skipBook ? "還想看見魔法書 📖" : "下次直接進首頁🆗️"}</button>
        <button class="btn ghost" id="book-preview">✡️再看乙次魔法書</button>
      </div>
    </div>
    <div class="card">
      <h2>🐰 星塵夢汐帳號 <span class="sub beta-tag">測試中</span></h2>
      <p class="muted small">用 email＋密碼建立帳號，紀錄會<b>加密</b>後存進雲端；換手機、清掉瀏覽器資料、重新安裝New Version，登入後回復紀錄。</p>
      <div class="warn-box">⚠️ <b>帳號同步仍在測試中</b>，請務必定期用下方「🔐 資料（本機儲存）」的<b>  匯出 JSON</b> 自己留一份備份。
<br>只依賴雲端偏危險，因金鑰只存在你的手機裡，<b>宇宙不曉得、也找不回你的密碼</b>，如果不小心忘記了，花時間寫下的資料都會掉進黑洞（但手機已匯出紀錄仍在）。</div>
      <div id="account-box"><p class="muted small">載入中⋯</p></div>
    </div>
    <div class="card">
      <h2>☁ 雲端備份（Google Drive） <span class="sub beta-tag">測試中</span></h2>
      <div class="warn-box">⚠️ <b>此區塊仍在測試中</b>，最保險的做法還是先用下方的「匯出 JSON」把資料存一份到自己手機裡。</div>
      <div id="cloud-box"><p class="muted small">載入中⋯</p></div>
    </div>
    <div class="card">
      <h2>🔗 串聯</h2>
      <div class="btn-row">
        <button class="btn secondary" id="sync-notion">🧱 同步到 Notion</button>
        <button class="btn secondary" id="exp-obsidian">💎 匯出 Obsidian Vault</button>
      </div>
      <div class="btn-row"><button class="btn ghost" id="notion-help">Notion 同步設定說明</button></div>
      <p class="muted small" style="margin-top:8px">Notion：一次將未同步的紀錄寫進你的四個資料庫（需一次性設定）。Obsidian：匯出 .zip，解壓到 Vault 即成一則一檔的筆記庫。</p>
    </div>
    <div class="card">
      <h2>🔐 資料（本機儲存）</h2>
      <div class="btn-row">
        <button class="btn secondary" id="exp-json">匯出 JSON</button>
        <button class="btn secondary" id="exp-md">匯出 Markdown</button>
      </div>
      <div class="btn-row">
        <button class="btn ghost" id="imp-json">匯入 JSON</button>
        <button class="btn ghost" id="notif-btn">🔔 開啟通知</button>
      </div>
      <input type="file" id="imp-file" accept=".json" class="hidden">
      <p class="muted small" style="margin-top:8px">Markdown 適合當諮商、回診回顧筆記；JSON 是完整備份。天象提醒最可靠的方式是「宇宙」分頁的「匯出天象行事曆」。</p>
    </div>
    <div class="card">
      <h2>💄 請辣妹給建議</h2>
      <p class="muted small">分享你對星塵夢汐的想法，讓 Blue 知道哪裡可優化。</p>
      <div class="btn-row"><button class="btn" id="feedback-btn">✨ 分享你的靈感</button></div>
    </div>
    <div class="card">
      <h2>🔥 辣妹留言板 <span class="sub" id="board-sub">載入中⋯</span></h2>
      <p class="muted small">留下你的暱稱和一句話，分享彼此的星塵日常。</p>
      <input type="text" id="bd-nick" maxlength="20" placeholder="暱稱（例：南港Lisa）" value="${esc(store.data.settings.nickname || "")}">
      <textarea id="bd-text" maxlength="300" rows="3" placeholder="想說的話⋯（最多 300 字）"></textarea>
      <div class="btn-row"><button class="btn" id="bd-send">💌 送出留言</button></div>
      <div class="board-list" id="bd-list"><p class="muted small">載入中⋯</p></div>
      <p class="muted small board-note">送出即表示同意記錄暱稱、留言內容，連線位置不會公開。</p>
    </div>
    <div class="card">
      <h2>🎁 分享給好友</h2>
      <p class="muted small">好友開啟魔法書後，雙方都能獲得一個隨機神奇海螺碎片。</p>
      <div class="btn-row"><button class="btn" id="share-btn">🔗 邀請朋友進入星塵</button></div>
      <p class="muted small">你的邀請碼：<b>${esc(myReferralCode())}</b></p>
    </div>
    <div class="card">
      <h2>📕 封印魔法書</h2>
      <p class="muted small">結束今天的紀錄時，把魔法書闔上重新封印，下次再由你親自開啟。</p>
      <div class="btn-row"><button class="btn secondary" id="seal-btn">🔒 封印魔法書 ✡️</button></div>
    </div>
    <div class="card">
      <h2>ℹ️ 版本 <span class="sub">${esc(APP_VERSION)}</span></h2>
      <p class="muted small">
        回報問題時，把這個版本號一起告訴 Blue，能夠快速判斷你手上是不是最新版。
        星塵夢汐更新後不需要重新安裝，下次打開會自動抓新版；若一直沒變，這顆給他按下去。
      </p>
      <div class="btn-row"><button class="btn secondary" id="ver-check">🔄 立即檢查更新</button></div>
    </div>
    <p class="disclaimer">星塵夢汐僅供自我紀錄，非供替代專業醫療，不提供分析治療。</p>`;
  renderBoard();
  $("#ver-check").addEventListener("click", forceUpdateCheck);
  $("#bd-send").addEventListener("click", sendBoardMessage);
  $("#share-btn").addEventListener("click", openShareForm);
  $("#seal-btn").addEventListener("click", () => sealBookFX());
  $$(".theme-swatch", el).forEach(b => b.addEventListener("click", () => {
    store.data.settings.theme = applyTheme(b.dataset.themeKey);
    store.save(); renderSettings();
    toast(`主題已切換：${THEMES[store.data.settings.theme].name} 🎨`);
  }));
  if (typeof refreshAccountUI === "function") refreshAccountUI();
  if (typeof refreshCloudUI === "function") refreshCloudUI();
  $("#set-home").addEventListener("click", openHomeCustomizer);
  $("#set-mood").addEventListener("click", openMoodStyleForm);
  $("#book-toggle").addEventListener("click", () => {
    store.data.settings.skipBook = !store.data.settings.skipBook;
    store.save(); renderSettings();
    toast(store.data.settings.skipBook ? "進直接進首頁✨" : "想親自開啟魔法書📖");
  });
  $("#book-preview").addEventListener("click", () => openBookLanding({ force: true }));
  $("#sync-notion").addEventListener("click", notionSync);
  $("#exp-obsidian").addEventListener("click", exportObsidianZip);
  $("#notion-help").addEventListener("click", openNotionHelp);
  $("#exp-json").addEventListener("click", exportJSON);
  $("#exp-md").addEventListener("click", exportMarkdown);
  $("#imp-json").addEventListener("click", () => $("#imp-file").click());
  $("#imp-file").addEventListener("change", importJSON);
  $("#notif-btn").addEventListener("click", async () => {
    if (!("Notification" in window)) return toast("此裝置不支援網頁通知");
    const p = await Notification.requestPermission();
    toast(p === "granted" ? "通知已開啟 🔔（App 開啟時會提醒天象和許願提醒）" : "沒有取得通知權限");
  });
  $("#feedback-btn").addEventListener("click", openFeedbackForm);
}

/* ---------- 🔥 辣妹留言板 ---------- */
let _boardCache = null;
async function renderBoard() {
  const box = $("#bd-list"), sub = $("#board-sub");
  if (!box) return;
  try {
    const r = await fetch("api/board", { cache: "no-store" });
    const j = await r.json();
    _boardCache = j;
    if (!j.enabled && !(j.messages || []).length) {
      if (sub) sub.textContent = "測試中";
      box.innerHTML = `<p class="muted small">留言板測試中，但仍會送達後台Blue看得到。</p>`;
      return;
    }
    drawBoard(j.messages || []);
  } catch {
    if (sub) sub.textContent = "連線失敗";
    box.innerHTML = `<p class="muted small">留言板暫時連不上，稍後再試。</p>`;
  }
}
function drawBoard(msgs) {
  const box = $("#bd-list"), sub = $("#board-sub");
  if (!box) return;
  if (sub) sub.textContent = `${msgs.length} 則`;
  if (!msgs.length) { box.innerHTML = `<p class="muted small">還沒有愣留言，你來當第一個 💋</p>`; return; }
  box.innerHTML = msgs.map(m => `
    <div class="bd-item">
      <div class="bd-head"><b>${esc(m.nickname || "訪客")}</b><span>${esc(fmtBoardTime(m.at))}</span></div>
      <div class="bd-body">${esc(m.content || "")}</div>
    </div>`).join("");
}
function fmtBoardTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
async function sendBoardMessage() {
  const nick = $("#bd-nick")?.value.trim().slice(0, 20) || "";
  const text = $("#bd-text")?.value.trim().slice(0, 300) || "";
  if (!text) return toast("留言內容不能空白");
  const btn = $("#bd-send");
  btn.disabled = true; btn.textContent = "送出中⋯";
  try {
    const r = await fetch("api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nick, content: text }),
    });
    if (r.status === 429) { toast("留言太頻繁，休息一下再送 💓"); return; }
    const j = await r.json();
    if (!r.ok || j.error) { toast("送出失敗，稍後再試"); return; }
    $("#bd-text").value = "";
    if (nick && !store.data.settings.nickname) { store.data.settings.nickname = nick; store.save(); }
    toast(j.enabled ? "留言已送出 ⚡️" : "留言已送達後台 💌");
    renderBoard();
  } catch {
    toast("網路連線失敗，稍後再試");
  } finally {
    btn.disabled = false; btn.textContent = "💌 送出留言";
  }
}

/* ---------- 🎁 分享給好友（邀請碼） ----------
   邀請連結帶上個人邀請碼，好友開啟魔法書後雙方各得一片碎片。
   受邀方在自己的裝置上立刻入帳；邀請方那一片需要後端幫忙歸戶
   （兩台手機的 localStorage 看不到彼此），由 api/referral 記帳，
   邀請方下次打開 App 時自動領回。後端沒設定時只有受邀方拿得到，功能不會壞。 */
let _refEnabled = null;         // null = 還沒問過後端
async function referralEnabled() {
  if (_refEnabled !== null) return _refEnabled;
  try {
    const r = await fetch("api/referral?action=status", { cache: "no-store" });
    _refEnabled = !!(await r.json()).enabled;
  } catch { _refEnabled = false; }
  return _refEnabled;
}
async function refApi(payload) {
  try {
    const r = await fetch("api/referral", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch { return { ok: false }; }
}
/* 打開 App 時把別人用我的邀請碼換來的碎片領回來（後端用 GETDEL，不會重複領） */
async function collectReferralRewards() {
  if (!await referralEnabled()) return;
  const st = store.data.settings;
  if (!st.refCode) return;                    // 還沒產生過邀請碼＝從沒分享過
  const { ok, count } = await refApi({ action: "collect", code: st.refCode });
  if (!ok || !count) return;
  let lastKey = null, mergedAny = false;
  for (let i = 0; i < count; i++) {
    const { key, merged } = awardShellFragment();
    lastKey = key; mergedAny ||= merged;
  }
  store.save();
  const info = SHELL_BY_KEY[lastKey];
  toast(`🎁 有 ${count} 位好友用了你的邀請碼！獲得神奇海螺碎片 ×${count}`);
  if (mergedAny) setTimeout(() => toast(`✨ 碎片集滿，合成一顆完整的${info.emoji}${info.name}神奇海螺！`), 1800);
}
function myReferralCode() {
  const st = store.data.settings;
  if (!st.refCode) {
    st.refCode = (Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)).toUpperCase();
    store.save();
  }
  return st.refCode;
}
function shareUrl() {
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  return `${base}#ref=${myReferralCode()}`;
}
function openShareForm() {
  const url = shareUrl();
  const text = `分享乙個有趣的東西「星塵夢汐」可記錄夢境和心情、跟宇宙連線 ✨ 用這個連結打開你的個人魔法書，我們都會拿到一片神奇海螺碎片 🐚`;
  const m = modal(`
    <h3>🎁 分享給好友</h3>
    <p class="muted small">好友開啟個人魔法書後，雙方都能獲得一個隨機神奇海螺碎片。</p>
    <label class="field">你的邀請連結</label>
    <input type="text" id="sh-url" readonly value="${esc(url)}">
    <div class="btn-row">
      ${navigator.share ? `<button class="btn" id="sh-native">📤 分享連結</button>` : ""}
      <button class="btn ${navigator.share ? "secondary" : ""}" id="sh-copy">📋 複製連結</button>
    </div>
    <p class="muted small">邀請碼 <b>${esc(myReferralCode())}</b></p>
    <p class="muted small" id="sh-status">確認回饋狀態⋯</p>`);
  referralEnabled().then(on => {
    const s = $("#sh-status", m);
    if (!s) return;
    s.innerHTML = on
      ? "好友那一片會立刻入帳；你的那一片下次打開 App 時自動送達 ✨"
      : `目前只有好友那一端拿得到碎片。要讓你自己的那一片也發得出來，
         需要在 Vercel 設定 <code>BOARD_KV_URL</code> 與 <code>BOARD_KV_TOKEN</code>（或 <code>REFERRAL_KV_*</code>）。`;
  });
  $("#sh-copy", m).addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); toast("連結已複製 📋"); }
    catch { $("#sh-url", m).select(); toast("請長按選取複製"); }
  });
  $("#sh-native", m)?.addEventListener("click", async () => {
    try { await navigator.share({ title: "星塵夢汐", text, url }); } catch { /* 使用者取消 */ }
  });
}
/* 被邀請方開啟連結：記下邀請碼，對方真的開啟魔法書時才發碎片 */
function handleReferralHash() {
  const m = location.hash.match(/[#&]ref=([A-Z0-9]{4,16})/i);
  if (!m) return;
  const code = m[1].toUpperCase();
  history.replaceState(null, "", location.pathname + location.search);
  const st = store.data.settings;
  if (st.refCode === code) return;              // 不能自己邀自己鵝
  if (st.invitedBy) return;                     // 已經被邀請過就不重複
  st.pendingRef = code; store.save();
}
/* 開啟魔法書時結算邀請獎勵。
   受邀方這一片立刻在本機入帳；同時向後端回報「我是被誰邀來的」，
   邀請方那一片就會記在他的帳上，等他下次打開 App 由 collectReferralRewards 領走。 */
function settleReferral() {
  const st = store.data.settings;
  if (!st.pendingRef) return;
  const code = st.pendingRef;
  delete st.pendingRef;
  st.invitedBy = code;
  const { key, merged } = awardShellFragment();
  store.save();
  // 回報給後端做歸戶（帶上自己的邀請碼當識別，同一支只會被算一次）
  refApi({ action: "claim", code, self: myReferralCode() });
  const info = SHELL_BY_KEY[key];
  setTimeout(() => {
    toast(`🎁 來自好友的邀請！獲得「${info.emoji}${info.name}神奇海螺碎片」×1`);
    if (merged) setTimeout(() => toast(`✨ 碎片集滿，合成一顆完整的${info.emoji}${info.name}神奇海螺！`), 1800);
  }, 700);
}

/* ---------- 📕 封印魔法書 ----------
   闔書：頁面收攏 → 封印圈收緊 → 落鎖，結束後回到 Book of Shadows 封面。 */
function sealBookFX(done) {
  if (REDUCED_MOTION) { done ? done() : openBookLanding({ force: true }); return; }
  const ov = document.createElement("div");
  ov.className = "fx-overlay seal-fx";
  ov.innerHTML = `<canvas></canvas><p class="fx-caption">封印魔法書⋯</p><p class="fx-skip">輕觸跳過</p>`;
  document.body.appendChild(ov);
  const cv = $("canvas", ov), cap = $(".fx-caption", ov);
  cap.style.color = "#dcc4ff";
  cap.style.textShadow = "0 0 14px rgba(180,130,255,.7)";
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2 - 20;
  const R = Math.min(W, H) * 0.3;
  const DUR = 1900;
  let raf, ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf);
    ov.style.opacity = "0";
    setTimeout(() => {
      ov.remove();
      if (done) done(); else openBookLanding({ force: true });
    }, 240);
  };
  ov.addEventListener("click", finish);
  const t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - x, 3);
  (function frame(now) {
    const p = Math.min((now - t0) / DUR, 1);
    const e = ease(p);
    ctx.fillStyle = "rgba(10,8,20,0.34)"; ctx.fillRect(0, 0, W, H);

    // 書頁由兩側往中間闔上
    const half = R * 1.15 * (1 - e);
    ctx.fillStyle = `rgba(46,26,86,${0.5 + 0.4 * e})`;
    ctx.strokeStyle = `rgba(196,164,255,${0.5 + 0.4 * e})`;
    ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - R * 0.9);
      ctx.lineTo(cx + s * half, cy - R * 0.72);
      ctx.lineTo(cx + s * half, cy + R * 0.72);
      ctx.lineTo(cx, cy + R * 0.9);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // 封印圈：由外往內收緊
    const rings = 3;
    for (let i = 0; i < rings; i++) {
      const rr = R * (1.5 - i * 0.18) * (1 - 0.55 * e);
      const a = (0.25 + 0.6 * e) * (1 - i * 0.22);
      ctx.strokeStyle = `rgba(196,164,255,${a})`;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = "rgba(170,120,255,0.8)"; ctx.shadowBlur = 12 * e;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, i * 0.7 - p * 2.4, i * 0.7 - p * 2.4 + Math.PI * 1.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 中央落鎖
    if (p > 0.55) {
      const lp = (p - 0.55) / 0.45;
      ctx.save();
      ctx.globalAlpha = Math.min(lp * 1.6, 1);
      ctx.font = `${Math.round(R * 0.36)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(220,196,255,1)"; ctx.shadowBlur = 26 * lp;
      ctx.fillText("🔒", cx, cy);
      ctx.restore();
      if (lp > 0.5) cap.textContent = "已重新封印 🔒";
    }
    if (p >= 1) return finish();
    raf = requestAnimationFrame(frame);
  })(t0);
}

/* 離開後自動重新封印。
   瀏覽器在關閉分頁時會直接凍結頁面，沒有辦法在「退出當下」播完一段動畫，
   所以改成：離開超過 RESEAL_AFTER_MS 再回來時，魔法書已經自己重新封印回封面。 */
const RESEAL_AFTER_MS = 30 * 60 * 1000;
function bindAutoReseal() {
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (away < RESEAL_AFTER_MS) return;
    if (store.data.settings.skipBook) return;                  // 使用者選過「直接進本文」就尊重他
    const el = document.getElementById("book-landing");
    if (el && el.classList.contains("hidden")) openBookLanding({ force: true });
  });
}

/* --- 🍆 茄子鐘（原🍅鐘，移到「思考」分頁） --- */
const focusState = { timer: null, endAt: 0, intent: "", mins: 25, distractions: [], running: false };
function renderFocusBox() {
  const box = $("#focus-box");
  if (!box) return;
  if (!focusState.running) {
    box.innerHTML = `
      <label class="field">這一輪要做什麼？（儀式宣告：踏向完成的第一步）</label>
      <input type="text" id="fo-intent" value="${esc(focusState.intent)}" placeholder="例：專心讀書、撰寫論文第二節">
      <div class="chips" id="fo-mins"></div>
      <div class="btn-row"><button class="btn" id="fo-start">▶ 開始</button></div>
      <p class="muted small">今天已完成 ${store.data.focus.filter(f => f.date === todayStr()).reduce((s, f) => s + (f.rounds || 1), 0)} 回合</p>`;
    chipGroup($("#fo-mins"), ["15", "25", "45"], [String(focusState.mins)], { multi: false });
    $("#fo-start").addEventListener("click", () => {
      focusState.intent = $("#fo-intent").value.trim() || "專注";
      focusState.mins = +(chipValues($("#fo-mins"))[0] || 25);
      focusState.endAt = Date.now() + focusState.mins * 60000;
      focusState.distractions = [];
      focusState.running = true;
      if (navigator.wakeLock?.request) navigator.wakeLock.request("screen").catch(() => {});
      focusState.timer = setInterval(tickFocus, 500);
      renderFocusBox();
    });
  } else {
    box.innerHTML = `
      <div class="timer-intent">🎯 ${esc(focusState.intent)}</div>
      <div class="timer-display" id="fo-time">--:--</div>
      <label class="field">💭 分心了？沒關係，先丟進收件匣，之後再處理</label>
      <input type="text" id="fo-dis" placeholder="輸入後按 Enter">
      <div class="tags" id="fo-dislist">${focusState.distractions.map(d => `<span>${esc(d)}</span>`).join("")}</div>
      <div class="btn-row">
        <button class="btn" id="fo-done">提早完成</button>
        <button class="btn secondary" id="fo-abort">想先放棄本輪？也沒關係，我們盡力就很好</button>
      </div>`;
    tickFocus();
    $("#fo-dis").addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const v = e.target.value.trim();
      if (v) { focusState.distractions.push(v); $("#fo-dislist").innerHTML = focusState.distractions.map(d => `<span>${esc(d)}</span>`).join(""); }
      e.target.value = "";
    });
    $("#fo-done").addEventListener("click", () => finishFocus(true));
    $("#fo-abort").addEventListener("click", () => finishFocus(false));
  }
}
function tickFocus() {
  const left = focusState.endAt - Date.now();
  if (left <= 0) return finishFocus(true);
  const elT = $("#fo-time");
  if (elT) elT.textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor(left % 60000 / 1000))}`;
}
function finishFocus(completed) {
  clearInterval(focusState.timer);
  focusState.running = false;
  if (!completed && !focusState.distractions.length) { renderFocusBox(); return; }
  const m = modal(`
    <h3>回合結束・10 秒小簽到</h3>
    <div class="timer-intent">🎯 ${esc(focusState.intent)}</div>
    <label class="field">這一輪的專注度</label>
    <div class="slider-row"><input type="range" id="ff-rate" min="1" max="5" value="4"><output id="ff-out">4</output></div>
    <label class="field">現在的感覺</label><div class="chips" id="ff-emo"></div>
    ${focusState.distractions.length ? `<label class="field">分心收件匣（會存起來，可轉to do list）</label><div class="tags">${focusState.distractions.map(d => `<span>${esc(d)}</span>`).join("")}</div>` : ""}
    <div class="btn-row"><button class="btn" id="ff-save">存檔</button></div>`);
  $("#ff-rate", m).addEventListener("input", e => $("#ff-out", m).value = e.target.value);
  chipGroup($("#ff-emo", m), ["滿足", "平靜", "煩躁", "疲憊", "亢奮"], ["滿足"], { multi: false });
  $("#ff-save", m).addEventListener("click", () => {
    const h = new Date().getHours();
    store.data.focus.push({
      id: uid(), date: todayStr(), time: tstr(new Date()), intent: focusState.intent,
      mins: focusState.mins, rounds: 1, completed,
      rating: +$("#ff-rate", m).value, emotion: chipValues($("#ff-emo", m))[0] || "",
      distractions: focusState.distractions,
      slot: h < 7 ? "清晨" : h < 12 ? "上午" : h < 17 ? "下午" : h < 20 ? "傍晚" : h < 24 ? "夜間" : "深夜",
    });
    store.save(); m.remove(); renderCBT(); toast("回合已記錄 🍆");
  });
}

/* ---🪽 時空膠囊 🐚 --- */
function capsuleHTML(c, t) {
  const unlocked = c.unlockDate <= t;
  if (!unlocked) {
    const dd = daysBetween(t, c.unlockDate);
    return `<div class="entry capsule-sealed"><div class="lock">🔒</div>
      <b>封存中</b><p class="muted small">將於 ${esc(c.unlockDate)} 開啟（還有 ${dd} 天）</p>
      <p class="muted small">封存於 ${esc(c.created)}</p>
      <div class="entry-actions" style="justify-content:center"><button class="cap-del" data-id="${esc(c.id)}">刪除</button></div></div>`;
  }
  return `<div class="entry center" style="padding:14px 6px">
    <div style="font-size:1.6rem">${c.opened ? "💌" : "🎁"}</div>
    <b>${c.opened ? "已開啟的膠囊" : "可以打開了"}</b>
    <p class="muted small">封於 ${esc(c.created)}・開啟日 ${esc(c.unlockDate)}</p>
    <div class="btn-row"><button class="btn small cap-open" data-id="${esc(c.id)}">${c.opened ? "再次重溫" : "開啟膠囊"}</button></div>
    <div class="entry-actions" style="justify-content:center"><button class="cap-del" data-id="${esc(c.id)}">刪除</button></div></div>`;
}
function openCapsuleForm() {
  const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
  const m = modal(`
    <h3>✉️ 封存一顆時空膠囊</h3>
    <p class="muted small">寫給未來的自己：現在的你在哪裡、在乎什麼、許什麼願？當你開啟那天，會連同今天的照片一起傳送回來。</p>
    <div class="center"><button class="mic-big" id="cp-mic" style="width:72px;height:72px;font-size:1.3rem">🎙️<small>用說的</small></button></div>
    <textarea id="cp-text" placeholder="親愛的未來的我……"></textarea>
    <label class="field">📷 拍下此刻的瞬間（選填）</label>
    <input type="file" id="cp-photo" accept="image/*" capture="environment">
    <label class="field">設定膠囊開啟日期</label>
    <input type="date" id="cp-date" value="${dstr(nextYear)}" min="${todayStr()}">
    <div class="btn-row"><button class="btn" id="cp-save">封存 🔒</button><button class="btn secondary" id="cp-cancel">取消</button></div>`);
  attachMic($("#cp-mic", m), $("#cp-text", m));
  $("#cp-cancel", m).addEventListener("click", () => m.remove());
  $("#cp-save", m).addEventListener("click", async () => {
    const text = $("#cp-text", m).value.trim();
    if (!text) return toast("寫點字、留句話，給未來的自己");
    const c = { id: uid(), created: todayStr(), unlockDate: $("#cp-date", m).value, text, opened: false };
    const file = $("#cp-photo", m).files[0];
    if (file) { c.photoId = "cap_" + c.id; await idb.put(c.photoId, await photoToDataURL(file)); }
    store.data.capsules.push(c);
    store.save(); m.remove();
    magicFX("sigil", "封印時空膠囊⋯", () => { renderMore(); toast("已封存 🔒 時間會將它送回你的身邊"); }, { finale: "🔒" });
  });
}
async function openCapsule(id) {
  const c = store.data.capsules.find(x => x.id === id);
  if (!c) return;
  c.opened = true; store.save();
  const m = modal(`
    <h3>💌 來自 ${esc(c.created)} 的你</h3>
    <div class="body" style="white-space:pre-wrap;margin:10px 0">${esc(c.text)}</div>
    ${c.photoId ? `<img class="photo-thumb" alt="膠囊照片">` : ""}
    <div class="socratic">讀完之後，那時的自己做對了什麼？對什麼盡心努力了？對自己說一句感謝的話。</div>
    <textarea id="cap-thanks" placeholder="謝謝那時候的自己…"></textarea>
    <div class="btn-row"><button class="btn" id="cap-thanks-save">存成今天的日記</button><button class="btn secondary" id="cap-close">關閉</button></div>`);
  if (c.photoId) renderPhoto($("img", m), c.photoId);
  $("#cap-close", m).addEventListener("click", () => { m.remove(); renderMore(); });
  $("#cap-thanks-save", m).addEventListener("click", () => {
    const txt = $("#cap-thanks", m).value.trim();
    if (txt) {
      store.data.diary.push({ id: uid(), date: todayStr(), time: tstr(new Date()), mood: 7, emotions: ["感恩"], habits: [], text: `（開啟 ${c.created} 的時空膠囊）${txt}`, three: "", incubation: "" });
      store.save();
    }
    m.remove(); renderMore(); toast("自我感恩已儲存進日記 🖤");
  });
}

/* --- 洞察（單一系列圖表：#3987e5，直接標籤，無圖例） --- */
function renderInsights() {
  const box = $("#insights");
  if (!box) return;
  const D = store.data;
  const streak = calcStreak();
  const moods = last14Moods();
  const symCount = countBy(D.dreams.flatMap(d => d.symbols || []));
  const distCount = countBy(D.cbt.flatMap(c => c.distortions || []));
  box.innerHTML = `
    <div class="stat-row">
      <div class="stat-tile"><b>${D.dreams.length}</b><span>夢境</span></div>
      <div class="stat-tile"><b>${D.diary.length}</b><span>日記</span></div>
      <div class="stat-tile"><b>${D.cbt.length}</b><span>思考紀錄</span></div>
      <div class="stat-tile"><b>${streak}</b><span>連續天數</span></div>
    </div>
    ${(() => {
      const earned = STREAK_BADGES.filter(([d2]) => streak >= d2);
      const next = STREAK_BADGES.find(([d2]) => streak < d2);
      if (!earned.length && !next) return "";
      return `<label class="field">連續紀錄徽章</label>
        <div class="tags">${earned.map(([d2, n]) => `<span>${esc(n)}（${d2} 天）</span>`).join("") || `<span>尚未點亮，今天記一則就開始 🔥</span>`}</div>
        ${next ? `<p class="muted small">再連續 ${next[0] - streak} 天，點亮「${esc(next[1])}」</p>` : `<p class="muted small">全部徽章都點亮了，你就是星系本人 💫</p>`}`;
    })()}
    ${moods.some(v => v != null) ? `<label class="field">心情走勢（近 14 天）</label><div class="spark">${sparklineSVG(moods)}</div>` : ""}
    ${sleepRowsHTML()}
    ${Object.keys(symCount).length ? `<label class="field">最常出現的夢境符號</label>${barRows(symCount)}` : ""}
    ${Object.keys(distCount).length ? `<label class="field">最常出現的思考慣性</label>${barRows(distCount)}` : ""}
    ${!D.dreams.length && !D.diary.length ? `<p class="muted small">開始記錄後，這裡會顯現出你的個人專屬潛意識圖鑑 🗂。</p>` : ""}`;
}
/* 連續紀錄：任何一種個人紀錄都算數（夢境、日記、思考、茄子鐘、快速心情、小本本、感謝、小勝利聖杯、顯化儀式） */
function calcStreak() {
  const dates = new Set([
    ...store.data.dreams, ...store.data.diary, ...store.data.cbt, ...store.data.focus,
    ...store.data.moods, ...store.data.gratitude,
  ].map(x => x.date));
  // 小本本與小勝利只有 createdAt（ISO 字串），取前 10 碼即為日期
  for (const n of store.data.notes) if (n.createdAt) dates.add(n.createdAt.slice(0, 10));
  for (const w of store.data.wins) dates.add(w.date || (w.createdAt || "").slice(0, 10));
  if (store.data.settings.lastManifest) dates.add(store.data.settings.lastManifest);
  let s = 0; const d = new Date();
  while (dates.has(dstr(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
function last14Moods() {
  const byDate = {};
  for (const e of store.data.diary) (byDate[e.date] ||= []).push(e.mood);
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const arr = byDate[dstr(d)];
    out.push(arr ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  }
  return out;
}
function sparklineSVG(vals) {
  const W = 320, H = 68, P = 8;
  const pts = vals.map((v, i) => v == null ? null : [P + i * (W - 2 * P) / 13, H - P - (v - 1) / 9 * (H - 2 * P)]);
  const seg = pts.filter(Boolean);
  if (!seg.length) return "";
  const path = pts.map((p, i) => p ? `${(i === 0 || !pts[i - 1]) ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}` : "").join(" ");
  const last = [...pts].reverse().find(Boolean);
  const lastVal = [...vals].reverse().find(v => v != null);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="近 14 天心情走勢，最後一筆 ${lastVal?.toFixed(1)} 分">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="var(--line)" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--chart-1)"/>
    <text x="${Math.min(last[0] + 6, W - 24)}" y="${Math.max(last[1] - 6, 12)}" fill="var(--ink-2)" font-size="11">${lastVal?.toFixed(1)}</text>
  </svg>`;
}
function countBy(arr) {
  const o = {};
  for (const x of arr) o[x] = (o[x] || 0) + 1;
  return o;
}
function barRows(counts) {
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] || 1;
  return top.map(([k, v]) => `
    <div class="bar-row"><div class="lbl">${esc(k)}</div>
      <div class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></div>
      <div class="val">${v}</div></div>`).join("");
}

/* --- 睡眠（Apple 健康 → 捷徑 → URL 匯入；或手動） --- */
function renderSleepBox() {
  const box = $("#sleep-box");
  if (!box) return;
  const recent = [...store.data.sleep].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  box.innerHTML = recent.length
    ? recent.map(s => `<div class="entry"><div class="meta">${esc(fmtMD(s.date))}・${esc(s.source || "手動")}</div>
        <div class="small">${esc(sleepBadge(s.date))}${s.quality ? `・主觀品質 ${s.quality}/5` : ""}</div></div>`).join("")
    : `<p class="muted small">尚無睡眠資料。戴著 Apple Watch 睡覺的話，按「自動匯入教學」設定完一次，之後每天早上起床，資料自動匯入。</p>`;
}
function saveSleep(rec) {
  const i = store.data.sleep.findIndex(s => s.date === rec.date);
  if (i >= 0) store.data.sleep[i] = { ...store.data.sleep[i], ...rec };
  else store.data.sleep.push(rec);
  store.save();
}
function openSleepManual() {
  const m = modal(`
    <h3>✍️ 手動記錄睡眠</h3>
    <label class="field">哪一天醒來</label><input type="date" id="sl-date" value="${todayStr()}">
    <label class="field">就寢時間</label><input type="time" id="sl-bed" value="23:30">
    <label class="field">起床時間</label><input type="time" id="sl-wake" value="07:30">
    <label class="field">夜間醒來次數</label><input type="number" id="sl-wakes" value="0" min="0">
    <label class="field">主觀睡眠品質（1–5）</label>
    <div class="slider-row"><input type="range" id="sl-q" min="1" max="5" value="3"><output id="sl-q-out">3</output></div>
    <div class="btn-row"><button class="btn" id="sl-save">儲存</button><button class="btn secondary" id="sl-cancel">取消</button></div>`);
  $("#sl-q", m).addEventListener("input", e => $("#sl-q-out", m).value = e.target.value);
  $("#sl-cancel", m).addEventListener("click", () => m.remove());
  $("#sl-save", m).addEventListener("click", () => {
    const [bh, bm] = $("#sl-bed", m).value.split(":").map(Number);
    const [wh, wm] = $("#sl-wake", m).value.split(":").map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins <= 0) mins += 1440; // 跨午夜
    saveSleep({ id: uid(), date: $("#sl-date", m).value, asleepMin: mins, inBedMin: mins, wakes: +$("#sl-wakes", m).value, quality: +$("#sl-q", m).value, source: "手動" });
    m.remove(); renderMore(); toast("睡眠已記錄 ⌚");
  });
}
function openSleepImportHelp() {
  const origin = location.origin + location.pathname;
  modal(`
    <h3>📲 睡眠自動匯入（設定一次）</h3>
    <p class="muted small"><b>🍎 iPhone＋Apple Watch（全自動）</b>：Watch 睡出來的資料在「健康」App；Sleep Cycle 開啟「Apple 健康」同步也用同一種方式。</p>
    <ol style="padding-left:20px;font-size:.88rem;line-height:1.7">
      <li>先建捷徑本體：「捷徑」→ ＋ → 搜尋動作時輸入「<b>取樣</b>」（iOS 16 的用詞；找不到就試「健康」或英文 health）→ 選「<b>尋找健康取樣</b>」</li>
      <li>把「所有健康取樣」點開改成「<b>睡眠</b>」，加條件：<b>開始日期</b>＝過去 18 小時</li>
      <li>加動作「<b>計算統計資料</b>」（搜「統計」）：總和 → <b>持續時間</b>，單位分鐘</li>
      <li>加「<b>文字</b>」填：<br><code>${esc(origin)}#sleepq=[目前日期],[統計結果]</code><br>（日期變數點開選自訂格式 yyyy-MM-dd）→ 加「<b>開啟 URL</b>」→ 存檔命名「睡眠匯入」</li>
      <li>再到「自動化」→ ＋ → <b>特定時間</b> 每天 08:00 → 動作選「<b>執行捷徑</b>」→ 睡眠匯入 → <b>關閉「執行前先詢問」</b>（iOS 16 沒有「立即執行」選項，關掉詢問就是自動跑）</li>
      <li>第一次執行會跳「允許讀取健康資料」，按允許</li>
    </ol>
    <p class="muted small" style="margin-top:10px"><b>🤖 Android＋Galaxy Watch（半自動）</b>：Samsung Health 沒有開放個人資料 API，目前做不到全自動讀取，改用「每天早上一鍵快記」：</p>
    <ol style="padding-left:20px;font-size:.88rem;line-height:1.7">
      <li>裝 <b>MacroDroid</b>（免費）→ 新增巨集：觸發＝每天 08:00，動作＝<b>開啟網址</b>：<br><code>${esc(origin)}#sleeplog</code></li>
      <li>每天早上手機會自動打開<b>已就位的睡眠表單</b>；Samsung Health 通知欄／小工具就有昨晚數據，照著填 10 秒完成</li>
      <li>不想裝 App 的話，把 <code>#sleeplog</code> 網址加到主畫面當第二顆圖示，醒來點一下即可</li>
    </ol>
    <p class="muted small">匯入後睡眠會自動掛在當天的夢境上，並進入洞察的睡眠圖表。Galaxy Watch 全自動讀取需要原生小程式（Health Connect），列入之後的版本。</p>
    <div class="btn-row"><button class="btn" onclick="this.closest('.modal-mask').remove()">知道了</button></div>`);
}
/* URL 匯入：#sleepq=YYYY-MM-DD,asleepMin[,inBedMin,remMin,deepMin,wakes]　或　#sleep=<base64 JSON> */
function handleHashImport() {
  const h = location.hash;
  if (!h) return;
  if (h === "#sleeplog") { // Android 例程用深連結：直接打開手動睡眠表單
    history.replaceState(null, "", location.pathname + location.search);
    openSleepManual();
    return;
  }
  try {
    if (h.startsWith("#sleepq=")) {
      const parts = decodeURIComponent(h.slice(8)).split(",").map(s => s.trim());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts[0] : todayStr();
      const nums = parts.slice(1).map(Number);
      if (!nums.length || !isFinite(nums[0])) throw new Error();
      saveSleep({ id: uid(), date, asleepMin: Math.round(nums[0]), inBedMin: nums[1] || null, remMin: nums[2] || null, deepMin: nums[3] || null, wakes: isFinite(nums[4]) ? nums[4] : null, source: "健康資料" });
      toast(`⌚ 已匯入 ${date} 睡眠 ${fmtH(Math.round(nums[0]))}`);
    } else if (h.startsWith("#sleep=")) {
      const j = JSON.parse(atob(decodeURIComponent(h.slice(7))));
      for (const r of Array.isArray(j) ? j : [j]) {
        if (!r.asleepMin) continue;
        saveSleep({ id: uid(), source: "健康資料", ...r, date: r.date || todayStr() });
      }
      toast("⌚ 睡眠資料已匯入");
    } else return;
    history.replaceState(null, "", location.pathname + location.search);
    if (currentTab) VIEWS[currentTab]();
  } catch { toast("睡眠資料格式不對，請檢查捷徑設定"); }
}
function sleepRowsHTML() {
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const s = sleepForDate(dstr(d));
    rows.push([fmtMD(dstr(d)), s ? s.asleepMin : null]);
  }
  if (!rows.some(r => r[1] != null)) return "";
  const max = Math.max(600, ...rows.map(r => r[1] || 0));
  return `<label class="field">睡眠時數（近 7 天）</label>` + rows.map(([k, v]) => `
    <div class="bar-row"><div class="lbl">${esc(k)}</div>
      <div class="bar"><i style="width:${v ? Math.round(v / max * 100) : 0}%"></i></div>
      <div class="val">${v ? (v / 60).toFixed(1) : "—"}</div></div>`).join("");
}

/* --- 宇宙星象行事曆匯出（.ics，跨 iPhone／Samsung／Watch 的原生提醒） --- */
function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function exportICS() {
  const events = allUpcomingEvents(400);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Stardust DreamTide//ZH-TW", "CALSCALE:GREGORIAN", "X-WR-CALNAME:星塵夢汐星象"];
  for (const e of events) {
    const d = e.date.replace(/-/g, "");
    const rit = (RITUALS[e.type] || RITUALS.custom).name;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.date}-${encodeURIComponent(e.title).replace(/%/g, "")}@dreamtide`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `DESCRIPTION:${icsEscape((e.note || "") + "／儀式：" + rit + "（打開星塵夢汐查看步驟）")}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape("明天：" + e.title)}`, "TRIGGER:-PT4H", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape("今晚：" + e.title)}`, "TRIGGER:PT19H", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  download(`dreamtide-astro-${todayStr()}.ics`, lines.join("\r\n"), "text/calendar");
  toast("已匯出 📆 開啟檔案即可加入手機行事曆（Watch 會同步提醒）");
}

/* --- Obsidian Vault 匯出（.zip，無壓縮 stored 格式，一則一檔） --- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function buildZip(files) { // files: [name, textContent]
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  const u16 = v => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = v => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255]);
  for (const [name, content] of files) {
    const nameB = enc.encode(name), data = enc.encode(content), crc = crc32(data);
    const head = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0)];
    chunks.push(...head, nameB, data);
    central.push([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameB]);
    offset += head.reduce((s, a) => s + a.length, 0) + nameB.length + data.length;
  }
  let cdSize = 0;
  for (const rec of central) { chunks.push(...rec); cdSize += rec.reduce((s, a) => s + a.length, 0); }
  chunks.push(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0));
  return new Blob(chunks, { type: "application/zip" });
}
const fnameSafe = s => s.replace(/[\\/:*?"<>|#^[\]]/g, "").slice(0, 40).trim() || "未命名";
function exportObsidianZip() {
  const D = store.data, files = [];
  const fm = obj => "---\n" + Object.entries(obj).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => Array.isArray(v) ? `${k}:\n${v.map(x => `  - ${x}`).join("\n")}` : `${k}: ${v}`).join("\n") + "\n---\n\n";
  for (const d of D.dreams)
    files.push([`星塵夢汐/夢境/${d.date} ${fnameSafe(d.text)}.md`,
      fm({ date: d.date, 清醒度: d.lucidity ?? 0, 重複夢: d.recurring || undefined, tags: ["夢境", ...(d.symbols || []), ...(d.archetypes || [])] })
      + d.text + "\n\n" + [(d.emotionsInDream || []).length ? `夢中情緒：${d.emotionsInDream.join("、")}` : "", d.wakeEmotion ? `醒來：${d.wakeEmotion}` : "", d.sync ? `共時性：${d.sync}` : "", sleepBadge(d.date)].filter(Boolean).join("\n")]);
  for (const d of D.diary)
    files.push([`星塵夢汐/日記/${d.date} ${d.time ? d.time.replace(":", "") : ""}.md`,
      fm({ date: d.date, 心情: d.mood, tags: ["日記", ...(d.emotions || [])], 習慣: d.habits }) + (d.text || "")
      + (d.three ? `\n\n**明日三件事**：${d.three}` : "") + (d.incubation ? `\n**孵夢**：${d.incubation}` : "")]);
  for (const r of D.cbt)
    files.push([`星塵夢汐/思考紀錄/${r.date} ${fnameSafe(r.situation || r.dump || "")}.md`,
      fm({ date: r.date, 狀態: r.status === "done" ? "已完成" : "未完成", 相信程度: r.belief, 重評: r.rerateBelief, tags: ["CBT", ...(r.distortions || [])] })
      + `## 情境\n${r.situation || r.dump || ""}\n\n## 初始情緒\n${(r.emotions || []).join("、")}（${r.emoIntensity || ""}）\n\n## 自動化思考\n${r.thoughts || ""}\n\n## 支持證據\n${r.evFor || ""}\n\n## 反對證據\n${r.evAgainst || ""}\n\n## 替代思考\n${r.alt || ""}\n\n## 重評\n相信 ${r.rerateBelief ?? "—"}／${r.rerateEmotions || ""}`]);
  for (const s of D.sleep)
    files.push([`星塵夢汐/睡眠/${s.date}.md`, fm({ date: s.date, tags: ["睡眠"], 來源: s.source }) + sleepBadge(s.date)]);
  if (!files.length) return toast("還沒有可匯出的紀錄");
  const blob = buildZip(files);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dreamtide-obsidian-${todayStr()}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast(`已匯出 ${files.length} 則筆記 💎 解壓到 Obsidian Vault 即可`);
}

/* --- Notion 同步（經同網域 serverless proxy，token 存在 Vercel 環境變數） --- */
async function notionSync() {
  const D = store.data;
  const payload = {
    dreams: D.dreams.filter(x => !x.notion).slice(0, 15),
    diary: D.diary.filter(x => !x.notion).slice(0, 15),
    cbt: D.cbt.filter(x => !x.notion).slice(0, 15),
    focus: D.focus.filter(x => !x.notion).slice(0, 15),
  };
  const total = Object.values(payload).reduce((s, a) => s + a.length, 0);
  if (!total) return toast("沒有待同步的紀錄 🧱");
  toast(`同步 ${total} 則中…`);
  try {
    const res = await fetch("api/notion-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || res.status);
    let n = 0;
    for (const k of Object.keys(j.synced || {})) {
      for (const id of j.synced[k]) {
        const item = D[k].find(x => x.id === id);
        if (item) { item.notion = true; n++; }
      }
    }
    store.save();
    toast(`已同步 ${n} 則到 Notion 🧱${j.failed ? `（${j.failed} 則失敗，稍後再試）` : ""}`);
  } catch (e) {
    toast(`同步失敗：${e.message}。請先完成「Notion 同步設定說明」`);
  }
}
function openNotionHelp() {
  modal(`
    <h3>🧱 Notion 同步設定（一次性）</h3>
    <ol style="padding-left:20px;font-size:.88rem;line-height:1.7">
      <li>電腦開 <b>notion.so/my-integrations</b> → New integration → 名稱填 DreamTide → 建立後複製 <b>Internal Integration Secret</b>（token）</li>
      <li>到 Notion 打開「<b>夢境日記 App — 資料庫原型</b>」頁 → 右上 ⋯ → <b>連接</b>（Connections）→ 加入 DreamTide</li>
      <li>開 <b>Vercel</b> → blue-essay-jung 專案 → Settings → <b>Environment Variables</b> → 新增 <code>NOTION_TOKEN</code> ＝ 你的 token → 存檔後 <b>Redeploy</b></li>
    </ol>
    <p class="muted small">完成後回來按「同步到 Notion」，未同步的紀錄會寫進四個資料庫（夢境庫／日記庫／CBT／專注）。token 只存在 Vercel 伺服器端，不會出現在手機或程式碼裡。</p>
    <div class="btn-row"><button class="btn" onclick="this.closest('.modal-mask').remove()">知道了</button></div>`);
}

/* --- Email名單（選填的優惠碼／新功能通知） ---
   真正的帳號、登入與同步在 account.js（星塵帳號）；這裡只負責把 email 送進名單。
   舊版的 Apple／Email「註冊」只是把 email 寫進 localStorage，換裝置就消失，已由星塵帳號取代。 */
async function registerMarketingEmail(email, provider = "email", nickname = "") {
  try {
    await fetch("api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, provider, nickname }),
    });
  } catch { /* offline / 後端未啟用時靜默忽略；帳號仍存在本機 */ }
}

function openFeedbackForm() {
  const m = modal(`
    <h3>✨ 分享你的靈感</h3>
    <p class="muted small">你的建議會讓星塵夢汐變得更好玩。</p>
    <label class="field">辣妹的建議</label>
    <textarea id="fb-content" placeholder="分享你對功能、設計、體驗的任何想法..." rows="6"></textarea>
    <label class="field">聯絡方式（選填）</label>
    <input type="email" id="fb-email" placeholder="email@example.com（若想收取回覆）">
    <div class="btn-row">
      <button class="btn" id="fb-save">提交建議</button>
      <button class="btn ghost" id="fb-cancel">取消</button>
    </div>
  `);
  $("#fb-cancel", m).addEventListener("click", () => m.remove());
  $("#fb-save", m).addEventListener("click", () => {
    const content = $("#fb-content", m).value.trim();
    const email = $("#fb-email", m).value.trim();
    if (!content) return toast("請分享你的想法");
    const feedback = {
      id: uid(),
      content,
      email,
      date: todayStr(),
      time: tstr(new Date()),
    };
    store.data.feedback ||= [];
    store.data.feedback.push(feedback);
    store.save();
    m.remove();
    submitFeedback(feedback);
    toast("感謝你的寶貴建議🙏Blue在此雙手合十");
  });
}

async function submitFeedback(feedback) {
  try {
    await fetch("api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback),
    });
  } catch { /* offline / 後端未啟用時靜默忽略；建議仍存在本機 */ }
}

/* --- 匯出／匯入 --- */
function download(name, text, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportJSON() {
  // iOS/Android 走 Web Share API 讓使用者選 iCloud/Drive/檔案 App；桌機直接下載
  if (typeof shareBackup === "function") { shareBackup(); return; }
  download(`stardust-backup-${todayStr()}.json`, JSON.stringify(store.data, null, 2));
  toast("已匯出—可放進 Google Drive 或 iCloud");
}
function exportMarkdown() {
  const D = store.data;
  let md = `# 星塵夢汐紀錄匯出（${todayStr()}）\n\n> 僅供個人自我紀錄，非醫療諮商文件。\n`;
  if (D.dreams.length) {
    md += `\n## 🌙 夢境（${D.dreams.length}）\n`;
    for (const d of [...D.dreams].sort((a, b) => a.date.localeCompare(b.date)))
      md += `\n### ${d.date} ${d.time || ""}\n${d.text}\n- 夢中情緒：${(d.emotionsInDream || []).join("、") || "—"}｜醒來：${d.wakeEmotion || "—"}｜清醒度 ${d.lucidity ?? 0}/5\n- 符號：${(d.symbols || []).join("、") || "—"}｜原型：${(d.archetypes || []).join("、") || "—"}${d.recurring ? "｜🔁 重複夢" : ""}\n${d.sync ? `- 共時性：${d.sync}\n` : ""}`;
  }
  if (D.diary.length) {
    md += `\n## ✍️ 日記（${D.diary.length}）\n`;
    for (const d of [...D.diary].sort((a, b) => a.date.localeCompare(b.date)))
      md += `\n### ${d.date} ${d.time || ""}（心情 ${d.mood}/10）\n${d.text || ""}\n${d.three ? `- 明日三件事：${d.three}\n` : ""}${d.incubation ? `- 孵夢：${d.incubation}\n` : ""}`;
  }
  if (D.cbt.length) {
    md += `\n## 🧠 思考紀錄（${D.cbt.length}）\n`;
    for (const r of [...D.cbt].sort((a, b) => a.date.localeCompare(b.date)))
      md += `\n### ${r.date} ${r.time || ""}${r.status !== "done" ? "（未完成）" : ""}\n| 步驟 | 內容 |\n|---|---|\n| ① 情境 | ${r.situation || r.dump || ""} |\n| ② 初始情緒 | ${(r.emotions || []).join("、")}（${r.emoIntensity || ""}） |\n| ③ 自動化思考 | ${r.thoughts || ""} |\n| ④ 相信程度 | ${r.belief ?? ""} |\n| ⑤ 支持證據 | ${r.evFor || ""} |\n| ⑥ 反對證據 | ${r.evAgainst || ""} |\n| ⑦ 替代思考 | ${r.alt || ""} |\n| 重評 | 相信 ${r.rerateBelief ?? ""}／${r.rerateEmotions || ""} |\n| 思考慣性 | ${(r.distortions || []).join("、")} |\n`;
  }
  if (D.focus.length) md += `\n## 🍆 專注（${D.focus.length} 回合）\n` + D.focus.map(f => `- ${f.date} ${f.time} ${f.slot}｜${f.intent}｜${f.mins} 分｜專注 ${f.rating}/5${f.distractions?.length ? `｜分心：${f.distractions.join("、")}` : ""}`).join("\n") + "\n";
  download(`dreamtide-export-${todayStr()}.md`, md, "text/markdown");
  toast("Markdown 已匯出—回診準備包的雛形");
}
function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const incoming = JSON.parse(rd.result);
      if (!incoming || typeof incoming !== "object") throw new Error();
      if (!confirm("匯入會與現有資料合併（同 ID 以匯入版為準）。繼續？")) return;
      for (const k of ["dreams", "diary", "cbt", "focus", "capsules", "customEvents", "sleep"]) {
        const map = new Map((store.data[k] || []).map(x => [x.id || JSON.stringify(x), x]));
        for (const item of incoming[k] || []) map.set(item.id || JSON.stringify(item), item);
        store.data[k] = [...map.values()];
      }
      if (incoming.settings?.symbols) store.data.settings.symbols = [...new Set([...store.data.settings.symbols, ...incoming.settings.symbols])];
      if (incoming.settings?.emotions) store.data.settings.emotions = [...new Set([...store.data.settings.emotions, ...incoming.settings.emotions])];
      store.save(); VIEWS[currentTab](); toast("匯入完成");
    } catch { toast("檔案格式不正確"); }
  };
  rd.readAsText(file);
}

/* ---------- 天象通知（App 開啟時檢查 48 小時內事件） ---------- */
function checkEventNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  for (const e of allUpcomingEvents(3)) {
    const key = `${e.date}|${e.title}`;
    const dd = daysBetween(todayStr(), e.date);
    if (dd <= 1 && !store.data.settings.notified[key]) {
      new Notification(`✨ ${e.title}`, { body: `${dd === 0 ? "就是今天" : "明天"}（${e.date}）。點開夢汐查看儀式建議。` });
      store.data.settings.notified[key] = true;
    }
  }
  store.save();
}

/* 量出標題列的實際高度寫進 --header-h，給 sticky 的子分頁列當定位基準。
   字級、主題、瀏海高度都會影響它，寫死數字就會露出一條縫或蓋住東西。 */
function syncHeaderHeight() {
  const h = $("header.app-header")?.offsetHeight;
  if (h) document.documentElement.style.setProperty("--header-h", `${h}px`);
}

/* ---------- 站內通報（開 App 時送達，領了就給禮物） ---------- */
function pendingBroadcast() {
  const seen = store.data.settings.broadcasts || {};
  return BROADCASTS.find(b => b.date <= todayStr() && !seen[b.id]) || null;
}
function checkBroadcasts() {
  const b = pendingBroadcast();
  if (!b) return;
  // 已允許通知的人，順手也跳一則系統通知，讓「有收到東西」這件事更明確
  if ("Notification" in window && Notification.permission === "granted" && !store.data.settings.notified[`bc|${b.id}`]) {
    try { new Notification(`${b.icon} ${b.title}`, { body: b.body }); } catch { /* 部分瀏覽器只允許 SW 發通知 */ }
    store.data.settings.notified[`bc|${b.id}`] = true;
    store.save();
  }
  /* 開場的魔法書（#book-landing）蓋在最上層且會吃掉點擊，其他 modal 也一樣，
     所以先等畫面淨空再跳通報，最多等兩分鐘就放棄（下次開 App 還會再送一次）。 */
  const busy = () => {
    const bk = document.getElementById("book-landing");
    return !!$(".modal-mask") || !!(bk && !bk.classList.contains("hidden"));
  };
  const tryShow = (tries = 0) => {
    if (busy() && tries < 150) return setTimeout(() => tryShow(tries + 1), 800);
    if (busy()) return;
    showBroadcast(b);
  };
  setTimeout(tryShow, 1200);
}
function showBroadcast(b) {
  const m = modal(`
    <div class="broadcast">
      <p class="bc-tag">✦ 星塵通報 ✦</p>
      <div class="bc-icon">${b.icon}</div>
      <h3>${esc(b.title)}</h3>
      <p class="muted">${esc(b.body)}</p>
      <p class="bc-reward">${esc(b.reward)}</p>
      ${b.rewardNote ? `<p class="muted small">${esc(b.rewardNote)}</p>` : ""}
    </div>
    <div class="btn-row">
      <button class="btn" id="bc-claim">領取並閱讀</button>
      <button class="btn secondary" id="bc-later">只領取</button>
    </div>`);
  const claim = () => {
    store.data.settings.broadcasts[b.id] = new Date().toISOString();
    const total = awardCompleteShell();
    m.remove();
    toast(`🐚 收到 ${b.reward}！目前擁有 ${total} 顆完整神奇海螺`);
  };
  $("#bc-later", m).addEventListener("click", claim);
  $("#bc-claim", m).addEventListener("click", () => {
    claim();
    const art = columnById(b.articleId);
    if (!art) return;
    // 先把宇宙分頁切到「專欄」子分頁，關掉文章之後才找得回它
    store.data.settings.cosmosSub = "column";
    store.save();
    switchTab("cosmos");
    setTimeout(() => openBilingualArticle(art), 260);
  });
}

/* ---------- Service Worker 與版本更新 ----------
   要解決的問題：改版推上線之後，已經把 App 裝到桌面的人可能好幾天還停在舊版，
   而且「清除資料、移除重裝」也不一定有用——因為舊的 Service Worker 還在服役，
   使用者根本不知道自己看到的是哪一版。

   三道保險：
   1. 每次啟動、以及每次從背景切回前景時，主動叫 reg.update() 去問伺服器有沒有新版。
   2. 新版 SW 接手（controllerchange）時跳一條橫幅，讓使用者自己按下重新載入。
      不自動 reload：使用者可能正在打日記打到一半，畫面被刷掉等於資料沒了。
   3. 設定分頁顯示版本號 ＋ 一顆「立即檢查更新」，回報問題時能立刻確認版本。 */
let _swReg = null;
let _updateShown = false;
let _lastUpdateCheck = 0;

function initServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;

  /* 這一次載入時，頁面本來就已經被某個 SW 接管嗎？
     首次安裝時是 null，SW 裝好 claim 之後 controllerchange 一樣會觸發，
     若在事件裡才去讀 controller 就永遠是「有」，會對第一次來的人誤報有新版。 */
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return;   // 首次安裝，不是更新
    showUpdateBanner();
  });

  /* 觸發註冊，但「不等」它回傳的 promise。
     實測（Chromium）：使用者回訪、頁面已被 SW 接管時，register() 的 promise
     會被排到很後面甚至遲遲不 resolve；舊寫法把整套更新偵測都掛在那個 .then()
     裡面，於是永遠拿不到 registration，更新提示形同不存在。
     改成用 navigator.serviceWorker.ready 拿 registration，它每次都會即時回應。 */
  navigator.serviceWorker.register("sw.js").catch(() => {});

  navigator.serviceWorker.ready.then(async reg => {
    _swReg = reg;
    // 已在服役中又出現待命的新版本（例如另一個分頁先抓到了）
    if (reg.waiting && hadController) showUpdateBanner();
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && hadController) showUpdateBanner();
      });
    });
    checkForUpdate();
    // Android Chrome：App 沒開也能背景檢查天象（best-effort，隨使用頻率調度）
    try {
      if ("periodicSync" in reg) {
        const st = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (st.state === "granted") await reg.periodicSync.register("astro-check", { minInterval: 12 * 60 * 60 * 1000 });
      }
    } catch { /* iOS 或未安裝：改用 .ics 行事曆提醒 */ }
  }).catch(() => {});

  // 從背景切回前景時再問一次（裝成 App 的人往往好幾天不會真的「重新開啟」）
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
}

/* 節流過的更新檢查：最快 5 分鐘問一次，避免頻繁切換分頁一直打伺服器 */
function checkForUpdate({ force = false } = {}) {
  if (!_swReg) return Promise.resolve(false);
  const now = Date.now();
  if (!force && now - _lastUpdateCheck < 5 * 60 * 1000) return Promise.resolve(false);
  _lastUpdateCheck = now;
  return _swReg.update().then(() => true).catch(() => false);
}

async function forceUpdateCheck() {
  if (!("serviceWorker" in navigator) || location.protocol !== "https:") {
    return toast("這個環境不支援自動更新，請重新整理頁面");
  }
  if (!_swReg) return toast("更新服務尚未就緒，請稍後再試");
  toast("正在向伺服器確認版本⋯");
  await checkForUpdate({ force: true });
  // update() 回來時若真有新版，controllerchange／updatefound 會接手跳橫幅
  setTimeout(() => { if (!_updateShown) toast(`目前已是最新版 ${APP_VERSION} ✨`); }, 2500);
}

function showUpdateBanner() {
  if (_updateShown) return;
  _updateShown = true;
  const bar = document.createElement("div");
  bar.className = "update-bar";
  bar.innerHTML = `
    <span>✨ 星塵夢汐有新版本了</span>
    <button type="button" class="btn small" id="upd-reload">立即更新</button>
    <button type="button" class="upd-x" id="upd-later" aria-label="稍後再說">✕</button>`;
  document.body.appendChild(bar);
  $("#upd-reload", bar).addEventListener("click", () => {
    // 先把手上的資料落地，再重新載入，避免使用者剛打的東西沒存到
    try { store.save(); } catch { /* 存不了也還是要讓他更新 */ }
    location.reload();
  });
  $("#upd-later", bar).addEventListener("click", () => {
    bar.remove();
    _updateShown = false;   // 讓下次啟動還會再提醒一次
  });
}

/* ---------- 啟動 ---------- */
/* 安裝提示要在 init 之前就掛上：beforeinstallprompt 有可能在 App 還在初始化時就送達 */
addEventListener("beforeinstallprompt", e => {
  e.preventDefault();              // 擋掉瀏覽器自己的小橫幅，改由首頁那顆按鈕觸發
  _installPrompt = e;
  if (currentTab === "today") renderToday(); // 讓按鈕的副標即時變成「可直接安裝」
});
addEventListener("appinstalled", () => {
  _installPrompt = null;
  toast("已安裝到裝置上 🌙 下次直接從桌面打開");
  if (currentTab === "today") renderToday();
});

(async function init() {
  store.load();
  applyTheme(store.data.settings.theme || "night");
  try { await idb.open(); } catch { /* 無 IndexedDB 時照片功能停用 */ }
  const mi = moonInfo(new Date());
  $("#header-moon").textContent = `${mi.e} ${mi.n}・${mi.illum}%`;
  $$(".tabbar button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  handleReferralHash();
  handleHashImport();
  window.addEventListener("hashchange", handleHashImport);
  switchTab("today");
  // 每次進入 App 都打開個人魔法書；user 若曾按過「跳過」則直接進本文
  if (!store.data.settings.skipBook) setTimeout(() => openBookLanding(), 60);
  syncHeaderHeight();
  addEventListener("resize", syncHeaderHeight);
  checkEventNotifications();
  checkBroadcasts();
  checkSummonCharges({ silent: true });
  bindAutoReseal();
  // 星塵帳號：有 token 就標成「待解鎖」，並問後端這功能有沒有啟用
  if (typeof initAccount === "function") initAccount().catch(() => {});
  // 有好友用了我的邀請碼 → 把累積的碎片領回來（延後一點，不跟開場動畫搶）
  setTimeout(() => { collectReferralRewards().catch(() => {}); }, 4000);
  initServiceWorker();
})();
