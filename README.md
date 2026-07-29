# 星塵夢汐 Stardust DreamTide

stardust.bluechiou.com — 靜態 PWA ＋ Vercel serverless functions。

功能：CBT 情緒紀錄（喜怒哀樂下拉＋強度滑桿）、內在報告、顯化儀式、
睡前引導、連續徽章、夢汐 AI 陪伴與解夢（Anthropic API）、Notion 同步、
水晶圖鑑（52 種・復古博物插圖）與虛擬水晶收藏架（月相×許願搭配）。

2026-07-16 自 `Blue-essay-Jung` repo 的 `app/` 目錄遷出獨立（該 repo 回歸
心理學論文研究用途）。

## 結構

```
index.html            單頁 App
app.js / style.css    前端邏輯與樣式
crystals.js           水晶圖鑑・虛擬收藏架・月相×許願儀式（見 docs/crystal-vision.md）
cloud.js              Google Drive 備份
account.js            星塵帳號（email＋密碼・端對端加密同步，見 docs/account-setup.md）
sw.js                 Service Worker（網路優先）
manifest.webmanifest  PWA 安裝設定
api/ai-chat.js        夢汐 AI（Anthropic）
api/notion-sync.js    Notion 同步
api/account.js        星塵帳號後端（Upstash Redis）
api/config.js         前端組態
Moon_altar/           召喚祭壇背景原圖（PNG，來源檔）
assets/altar/         同一批圖壓成 1280px WebP，App 實際載入的版本
icons/                App 圖示
```

召喚祭壇背景每次進分頁隨機換一張。要新增背景：把原圖放進 `Moon_altar/`，
壓成 WebP 放進 `assets/altar/`，再把檔名加進 `app.js` 的 `ALTAR_BACKDROPS`。

## 發一篇新的星塵專欄

「宇宙」分頁的 🖋 星塵專欄放 Blue 親筆的原創文章，和 NASA 新聞分開（NASA 那批
每週會被 `api/space-news` 整批覆蓋，專欄放進去會被洗掉）。

1. 在 `app.js` 的 `COLUMN` 陣列加一筆：`id`／`date`／`icon`／`zhTitle`／`zhSub`／
   `enTitle`／`enSub`／`zhBody`／`enBody`，並保留 `bilingual: true`。
   `zhBody`／`enBody` 是段落陣列；單獨放一段 `COLUMN_SEP` 會畫一條分隔線。
   閱讀器會先完整呈現中文，再接續英文，不用切換語言。
2. 想同時發通報，就在 `BROADCASTS` 再加一筆（`articleId` 指向上面的 `id`），
   並把 `sw.js` 的 `BROADCAST` 常數改成同一則、同一個 `id`。

## 改版之後，怎麼讓使用者真的看到新版

`app.js` 的 `APP_VERSION` 和 `sw.js` 的 `CACHE` 要一起往上加。改了 `CACHE` 這個字串，
瀏覽器才會判定 `sw.js` 有變、去安裝新的 Service Worker，前端才跳得出「有新版本」橫幅。

使用者端會發生三件事：啟動時與每次從背景切回前景時主動向伺服器問有沒有新版（5 分鐘節流）；
偵測到新版就跳橫幅，由使用者自己按下重新載入（不自動 reload，免得他正在打日記被刷掉）；
設定分頁隨時看得到目前版本號，回報問題時報這個數字最快。

⚠️ **不要把更新邏輯掛在 `navigator.serviceWorker.register()` 回傳的 promise 上。**
實測 Chromium 在「使用者回訪、頁面已被 SW 接管」時，那個 promise 會遲遲不 resolve，
整套偵測會靜靜地失效。要拿 registration 請用 `navigator.serviceWorker.ready`。

⚠️ **Vercel 後台不要對舊的 deployment 按 Redeploy。** 那等於把 production 回滾到那個
commit（2026-07-28 就這樣把已上線的專欄整個滾掉，表現出來是「清除資料重裝都還是舊的」）。
要回到最新版：對 main 最新的 deployment 按 **Promote to Production**，或讓 main 產生一個
新 commit（合併任何 PR 都可以）。要確認線上到底是哪一版，抓 `stardust.bluechiou.com/app.js`
跟各 commit 的 `app.js` 逐一比對就知道。

## 站內通報怎麼送達

沒有推播伺服器，也沒有跟使用者收 push subscription，所以走兩條路：已把 App 裝在
Android 桌面且允許通知的人，由 `sw.js` 的 `periodicsync` 在背景跳系統通知；其他人
（含全部 iOS）下次打開 App 時跳出通報卡片。兩條路都導到同一個領取動作，領過的 id
會寫進 `settings.broadcasts`，不會重複發。

要做真正的伺服器推播是另一件工程：VAPID 金鑰（私鑰只放 Vercel 環境變數）、
訂閱清單存 Upstash Redis、一支需要驗證的廣播 API、`sw.js` 補 `push` 事件，
再加一段請求通知權限的流程；iOS 只有「加到主畫面」的 PWA 收得到。

## 部署（Vercel）

- Root Directory：`/`（repo 根目錄，遷移前是 `app/`）
- 環境變數（只設在 Vercel，絕不進 git）：`ANTHROPIC_API_KEY`、
  `NOTION_TOKEN`、`STARDUST_AI_MODEL`、`STARDUST_GOOGLE_CLIENT_ID`、
  `ACCOUNT_KV_URL`／`ACCOUNT_KV_TOKEN`（星塵帳號，見 `docs/account-setup.md`）、
  `BOARD_KV_URL`／`BOARD_KV_TOKEN`（辣妹留言板）
- 自訂網域：`stardust.bluechiou.com`
