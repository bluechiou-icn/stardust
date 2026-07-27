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

## 部署（Vercel）

- Root Directory：`/`（repo 根目錄，遷移前是 `app/`）
- 環境變數（只設在 Vercel，絕不進 git）：`ANTHROPIC_API_KEY`、
  `NOTION_TOKEN`、`STARDUST_AI_MODEL`、`STARDUST_GOOGLE_CLIENT_ID`、
  `ACCOUNT_KV_URL`／`ACCOUNT_KV_TOKEN`（星塵帳號，見 `docs/account-setup.md`）、
  `BOARD_KV_URL`／`BOARD_KV_TOKEN`（辣妹留言板）
- 自訂網域：`stardust.bluechiou.com`
