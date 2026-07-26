/* 星塵夢汐 Stardust DreamTide service worker — 快取＋背景天象檢查 */
const CACHE = "dreamtide-v13";
const ASSETS = ["./", "index.html", "style.css", "app.js", "crystals.js", "cloud.js", "manifest.webmanifest", "assets/altar.jpg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).pathname.includes("/api/")) return; // API 不進快取
  // 網路優先：每次都先抓最新版（GitHub 上改完即生效），離線時才退回快取
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("index.html")))
  );
});

/* ---- 背景天象檢查（Android Chrome Periodic Background Sync）----
   月相演算法與內建事件表與 app.js 同步維護。 */
const SYNODIC = 29.530588853, EPOCH_JD = 2451550.26;
const moonAge = d => (((d.getTime() / 86400000 + 2440587.5) - EPOCH_JD) % SYNODIC + SYNODIC) % SYNODIC;
const ASTRO = [
  ["2026-07-30", "寶瓶座δ流星雨極大期"], ["2026-08-12", "日全食"], ["2026-08-12", "六星晨會（行星連珠）"],
  ["2026-08-13", "英仙座流星雨極大期"], ["2026-08-15", "水星合木星"], ["2026-08-28", "月偏食"],
  ["2026-09-25", "海王星衝"], ["2026-10-21", "獵戶座流星雨極大期"], ["2026-11-15", "火星合木星"],
  ["2026-11-17", "獅子座流星雨極大期"], ["2026-11-24", "超級月亮"], ["2026-11-25", "天王星衝"],
  ["2026-12-14", "雙子座流星雨極大期"], ["2026-12-23", "超級滿月（近八年最大）"],
  ["2027-01-03", "象限儀座流星雨極大期"], ["2027-02-06", "日環食"], ["2027-08-02", "日全食"],
];
function upcomingWithin(days) {
  const out = [], now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let prev = moonAge(now);
  for (let i = 1; i <= days; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); d.setHours(12, 0, 0, 0);
    const age = moonAge(d);
    if (age < prev) out.push([ds(d), "新月 🌑 許願之夜"]);
    if (prev < SYNODIC / 2 && age >= SYNODIC / 2) out.push([ds(d), "滿月 🌕 感恩與釋放"]);
    prev = age;
  }
  const today = ds(now);
  const limit = new Date(); limit.setDate(limit.getDate() + days);
  for (const [date, title] of ASTRO) if (date >= today && new Date(date) <= limit) out.push([date, title]);
  return out;
}
self.addEventListener("periodicsync", e => {
  if (e.tag !== "astro-check") return;
  e.waitUntil((async () => {
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
