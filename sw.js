/* 星塵夢汐 Stardust DreamTide service worker — 快取＋背景天象檢查 */
/* 版本號要和 app.js 的 APP_VERSION 一起往上加。
   改了這個字串，瀏覽器就會判定 sw.js 有變、安裝新的 SW，
   前端的 controllerchange 才會跳出「有新版本」橫幅。 */
const CACHE = "dreamtide-v24-2026.08.06";
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
