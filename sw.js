/* 星塵夢汐 Stardust DreamTide service worker — 快取＋背景天象檢查 */
/* 版本號要和 app.js 的 APP_VERSION 一起往上加。
   改了這個字串，瀏覽器就會判定 sw.js 有變、安裝新的 SW，
   前端的 controllerchange 才會跳出「有新版本」橫幅。 */
const CACHE = "dreamtide-v20-2026.07.29b";
/* 核心殼層：一定要進快取才算安裝成功 */
const CORE = ["./", "index.html", "style.css", "app.js", "crystals.js", "cloud.js", "account.js", "manifest.webmanifest"];
/* 加分資產：抓不到也不該讓整個 SW 安裝失敗（失敗 → 沒有 SW → PWA 就不能安裝了）。
   祭壇背景（assets/altar/*.webp）刻意不預快取——30 張一次抓太重，交給 fetch 事件用到才存。 */
const EXTRA = ["assets/altar.jpg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 逐一快取並容許個別失敗：addAll 是全有全無，只要一支 404 就會讓安裝整個失敗
    await Promise.allSettled(CORE.map(u => c.add(u)));
    await Promise.allSettled(EXTRA.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.includes("/api/")) return;          // API 不進快取
  /* 只接管自己網域的請求。第三方腳本（Google 登入的 accounts.google.com 等）
     交給瀏覽器自己處理：以前一律攔下來，它們只要載入失敗就會拿到下面那份
     index.html，於是 <script> 收到一坨 HTML，變成 "Unexpected token '<'"，
     嚴重時還會把 navigator.serviceWorker.register() 卡住不回應，
     整個版本更新機制就跟著失效。 */
  if (url.origin !== self.location.origin) return;
  // 網路優先：每次都先抓最新版（GitHub 上改完即生效），離線時才退回快取
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(async () => {
      const hit = await caches.match(e.request);
      if (hit) return hit;
      /* 只有「開啟頁面」這種導覽請求才退回 index.html。
         其他資源抓不到就讓它照實失敗，硬塞一份 HTML 只會製造更難查的錯誤。 */
      if (e.request.mode === "navigate") return caches.match("index.html");
      return Response.error();
    })
  );
});

/* ---- 背景天象檢查（Android Chrome Periodic Background Sync）----
   月相演算法與內建事件表與 app.js 同步維護。
   朔望改用 Meeus 第 49 章的真實時刻（見 app.js 的說明）：平均值會讓
   2026-07-29 22:35（台灣時間）的滿月被標成 7/30，整整差一天。 */
const SYNODIC = 29.530588853, D2R = Math.PI / 180;
const PHASE_PERTURB = [
  [0.000325, 299.77, 0.107408, -0.009173], [0.000165, 251.88, 0.016321, 0],
  [0.000164, 251.83, 26.651886, 0], [0.000126, 349.42, 36.412478, 0],
  [0.000110, 84.66, 18.206239, 0], [0.000062, 141.74, 53.303771, 0],
  [0.000060, 207.14, 2.453732, 0], [0.000056, 154.84, 7.306860, 0],
  [0.000047, 34.52, 27.261239, 0], [0.000042, 207.19, 0.121824, 0],
  [0.000040, 291.34, 1.844379, 0], [0.000037, 161.72, 24.198154, 0],
  [0.000035, 239.56, 25.513099, 0], [0.000023, 331.55, 3.592518, 0],
];
function truePhaseJDE(kk, phase) {
  const k = kk + phase, T = k / 1236.85, isNew = phase === 0, sin = Math.sin;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3) * D2R;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * D2R;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * D2R;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3) * D2R;
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
const DELTA_T_DAYS = 70 / 86400;
const phaseDate = (k, phase) => new Date((truePhaseJDE(k, phase) - DELTA_T_DAYS - 2440587.5) * 86400000);
const kNear = d => Math.floor(((d.getFullYear() + (d.getMonth() + d.getDate() / 30.4) / 12) - 2000) * 12.3685);
const ASTRO = [
  ["2026-07-30", "寶瓶座δ流星雨極大期"], ["2026-08-13", "日全食"], ["2026-08-12", "六星晨會（行星連珠）"],
  ["2026-08-13", "英仙座流星雨極大期"], ["2026-08-15", "水星合木星"], ["2026-08-28", "月偏食"],
  ["2026-09-25", "海王星衝"], ["2026-10-21", "獵戶座流星雨極大期"], ["2026-11-15", "火星合木星"],
  ["2026-11-17", "獅子座流星雨極大期"], ["2026-11-24", "超級月亮"], ["2026-11-25", "天王星衝"],
  ["2026-12-14", "雙子座流星雨極大期"], ["2026-12-24", "超級滿月（近八年最大）"],
  ["2027-01-03", "象限儀座流星雨極大期"], ["2027-02-06", "日環食"], ["2027-08-02", "日全食"],
];
/* 站內通報：和 app.js 的 BROADCASTS 同步維護。
   這是唯一能在「App 沒打開」時送到使用者眼前的管道（Android 已安裝的 PWA）。 */
const BROADCAST = {
  id: "2026-07-28-column-01", from: "2026-07-28", until: "2026-08-11",
  title: "🌕 星塵專欄創刊號上線",
  body: "為何農曆十五卻不是滿月？Blue在Stardust寫的第一篇文章，閱讀獎品： 🪐 量子糾纏神奇海螺 ×1。",
};
function upcomingWithin(days) {
  const out = [], now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = ds(now);
  const limit = new Date(); limit.setDate(limit.getDate() + days);
  const limitStr = ds(limit);
  const k0 = kNear(now) - 1;
  for (let k = k0; k <= k0 + Math.ceil(days / SYNODIC) + 2; k++) {
    for (const [phase, title] of [[0, "新月 🌑 許願之夜"], [0.5, "滿月 🌕 感恩與釋放"]]) {
      const date = ds(phaseDate(k, phase));
      if (date >= today && date <= limitStr) out.push([date, title]);
    }
  }
  for (const [date, title] of ASTRO) if (date >= today && date <= limitStr) out.push([date, title]);
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}
self.addEventListener("periodicsync", e => {
  if (e.tag !== "astro-check") return;
  e.waitUntil((async () => {
    const pad = n => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    // 通報排在天象前面：這是要請使用者打開 App 的那一則
    if (today >= BROADCAST.from && today <= BROADCAST.until) {
      await self.registration.showNotification(BROADCAST.title, {
        body: BROADCAST.body,
        icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "bc-" + BROADCAST.id,
      });
    }
    for (const [date, title] of upcomingWithin(2)) {
      await self.registration.showNotification("✨ " + title, {
        body: `${date}（未來兩天內）。點開星塵夢汐查看儀式建議。`,
        icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "astro-" + date + title,
      });
    }
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(ws => ws.length ? ws[0].focus() : self.clients.openWindow("./")));
});
