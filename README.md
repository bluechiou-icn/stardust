# 星塵夢汐 Stardust DreamTide

stardust.bluechiou.com — 靜態 PWA ＋ Vercel serverless functions。

功能：CBT 情緒紀錄（喜怒哀樂下拉＋強度滑桿）、內在報告、顯化儀式、
睡前引導、連續徽章、夢汐 AI 陪伴與解夢（Anthropic API）、Notion 同步。

2026-07-16 自 `Blue-essay-Jung` repo 的 `app/` 目錄遷出獨立（該 repo 回歸
心理學論文研究用途）。

## 結構

```
index.html            單頁 App
app.js / style.css    前端邏輯與樣式
cloud.js              雲端同步
sw.js                 Service Worker（網路優先）
manifest.webmanifest  PWA 安裝設定
api/ai-chat.js        夢汐 AI（Anthropic）
api/notion-sync.js    Notion 同步
api/config.js         前端組態
icons/                App 圖示
```

## 部署（Vercel）

- Root Directory：`/`（repo 根目錄，遷移前是 `app/`）
- 環境變數（只設在 Vercel，絕不進 git）：`ANTHROPIC_API_KEY`、
  `NOTION_TOKEN`、`STARDUST_AI_MODEL`、`STARDUST_GOOGLE_CLIENT_ID`
- 自訂網域：`stardust.bluechiou.com`
