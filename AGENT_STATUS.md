# AGENT_STATUS.md — ÆTHNOUS Project Network

**Compiled:** 2026-07-23 · **Last updated:** 2026-07-30 · **Compiled by:** Claude (session `project-status-compilation`) · **For:** any AI agent (Claude, Gemini, ChatGPT, or other) picking up work in this repo or a sibling repo

This file is a handoff briefing so any AI agent landing in *any* of Blue's repos with no other context can quickly understand who they're working for, what the whole project network looks like, which rules hold everywhere, and exactly where this repo stands right now. **This repo has no `CLAUDE.md` yet** (see the note at the end of section 4) — until one exists, this file is the only written orientation document here. Update it whenever this repo's status changes materially.

## 1. Who you're working for

**Blue Chiou** (bluechiou@gmail.com, commits as "Blue.X") is the founder and sole owner-operator of **ÆTHNOUS**, a Zi Wei Dou Shu (紫微斗數 / Purple Star Astrology) chart-reading brand that blends the 占驗派 tradition with Jungian depth psychology, plus a small portfolio of side products (of which this repo is one). Blue builds everything through AI-assisted development (primarily Claude Code) and does not have a formal software-engineering background — explain tradeoffs plainly, don't assume prior engineering context, and default to asking rather than guessing on anything ambiguous or high-stakes.

Blue runs work through named AI agent personas, each with its own skill file:
- **Raziel (密典)** — Chief Technical Executor: engineering, deploys, API/security architecture. Loaded via the `raziel` skill / `RAZIEL_SKILL.md` (canonical copy lives in Google Drive, not git — see IP rules below).
- **Cassian (紫曜)** — Head Analyst: ZWDS chart reading, synastry, flow-year/decade prediction, four-transformations analysis. Runs the 汎天派 (Fan Tian Pai) school in its v3-Ultra form.
- Other named collaborators referenced in skill/commit history: **Gabriel**, **Uriel**, **Vergil**, **Thoth**, **Raphael**.

If you're an agent on another platform (Gemini, ChatGPT, etc.) without access to these skill files, ask Blue for the relevant one rather than improvising the persona.

## 2. The ÆTHNOUS project network (7 repos)

| Repo | What it is | Production | Snapshot |
|---|---|---|---|
| **Blue_Astral_Nexus_Engine** | Core ZWDS calculation engine + API (`chart-api.js`), extends `iztro` with Blue's corrected 四化/亮度/宮名 rules | engine.aethnous.co (API), chart.aethnous.co (UI) | Active — formation catalog + monetization infra + EN-market prep |
| **Blue_ANE_Owner_Ext** | Private owner-only extension: proprietary reading-lens + Tier-2 judgment-rule bundle, pulled into the Engine at build time | (bundled into engine.aethnous.co for Blue only) | Active — category/filter UI hardened, Tier-2 daily-fortune generator mid-calibration |
| **Blue-Booking** | Booking + member portal + CRM for the consultation service (Cloudflare Workers + D1 + R2), vendors a copy of the Engine | booking.bluechiou.com | Active — just shipped a large `/gate` 3D landing experience |
| **Blue-OS** | Claude Code dashboard/control panel, runs on Blue's Mac, phone-reachable PWA | localhost:4173 (Blue's Mac) | Stable/idle — booking subsystem just split out to its own repo |
| **aethnous-landing** | Public ÆTHNOUS marketing/landing site, Next.js (customized build) + Three.js solar-system hero | (Vercel, ÆTHNOUS domain) | Active — building EN-market acquisition funnel (`/start`, `/quiz`) |
| **stardust** (this repo) | 星塵夢汐 Stardust DreamTide — separate wellness/journaling PWA (mood tracking, AI companion, crystal encyclopedia) | stardust.bluechiou.com | Active, brand-new — v1 just shipped, v1.5+ roadmapped |
| **Blue-Bubble-Buddy** | Portable Claude Code skill library (17 skills) teaching engineering discipline to other AI agents/smaller models | (skill library, no deployment) | Active — STATE.md current (2026-07-27); newest skill `bbb-knowledge-graph` wraps the third-party graphify CLI as an optional onboarding accelerator |

This repo split out of a `Blue-essay-Jung` repo's `app/` directory on 2026-07-16 (that repo reverted to being a psychology-research-paper project and is out of scope for this compilation). It's the one repo in the network **not** branded ÆTHNOUS — it's a separate wellness product under the same owner.

## 3. Rules that hold across the network

Compiled from the other six repos' `CLAUDE.md` files — this repo doesn't have one yet, so nothing here is locally authoritative until one is written (see §4). Treat these as strong defaults given how consistently they recur elsewhere in the network.

- **Personal data never enters git.** Real birth data never enters git in the astrology repos (placeholder: `2000-01-01 06:00`). **The same principle applies here with extra force**: this app collects real user mood/journaling/dream content, which is at least as sensitive — real user emotional data must never be committed, logged in a way that lands in git, or pasted into docs/PRs.
- **Secrets never hardcoded.** Use Vercel environment variables (this repo already uses `api/config.js` + serverless functions on Vercel, consistent with that pattern) — never hardcode the Anthropic API key or Notion sync credentials.
- **Blue's Version is the single authority for ZWDS logic** in the astrology repos — relevant here only if/when the roadmapped "destiny crystal report" (v2.5, see below) integrates with the Engine.
- **IP boundaries are release blockers** elsewhere in the network (agent skill files, Owner-Ext proprietary content) — apply the same caution if this repo ever imports ÆTHNOUS chart logic for the v2.5 integration.
- **Surgical changes only, everywhere.** State a verifiable success criterion before coding starts.
- **Self-scheduled check-ins may only be armed when they'll deliver genuinely new value** (network-wide convention, stated explicitly in the Engine repo's CLAUDE.md).

## 4. This repo: stardust

### Purpose
**星塵夢汐 Stardust DreamTide** (`stardust.bluechiou.com`) — a wellness/journaling PWA: CBT mood tracking (emotion + intensity), an "inner report," manifestation rituals, bedtime guidance, streak badges, an AI companion "夢汐" for chat and dream interpretation (via the Anthropic API), Notion sync, and a crystal encyclopedia (52 crystals with procedurally generated vintage-museum-style SVG illustrations) plus a virtual crystal shelf paired with moon-phase wishing rituals. Carries an explicit disclaimer that crystal effects are folk/energy tradition, not scientific or medical claims. Technically: a vanilla-JS static PWA (no build framework), Vercel serverless functions under `api/`. `package.json`: `stardust-dreamtide`, no version field, `private: true`, single dependency `@anthropic-ai/sdk`.

### Current status: active, brand-new
The app was migrated verbatim out of `Blue-essay-Jung`'s `app/` directory, then a large feature (crystal encyclopedia, virtual shelf, moon-phase pairing, 4 wish rituals — `crystals.js`, ~1,100 lines) shipped via PR #1 along with a planning doc, `docs/crystal-vision.md`.

**2026-07-27 — real accounts landed.** The former "Email 註冊" was a placeholder: it wrote the
email to `localStorage.settings.account` and posted it to a marketing list, so clearing browser
data destroyed the account and there was no way to sign back in or recover anything. It has been
replaced by **星塵帳號** (`account.js` + `api/account.js`): email + password, end-to-end encrypted
sync backed by Upstash Redis. The client derives an AES-GCM key from the password
(PBKDF2-SHA256, 200k) and uploads only ciphertext; the server receives a one-way `verifier`, never
the password or the key, so **the backend cannot read anyone's dreams or moods** — which keeps the
network-wide "personal data stays private" rule intact even though journals now leave the device.
The key is never persisted, so reopening the app asks for the password once to unlock.
Setup is two Vercel env vars (`ACCOUNT_KV_URL` / `ACCOUNT_KV_TOKEN`); unset → the feature reports
`enabled:false` and the UI degrades to local + export. Full write-up: `docs/account-setup.md`.
Trade-off to know about: no password reset is possible by design — forgetting the password means
the cloud copy is unrecoverable (local data and JSON exports survive). Both sync blocks are
labelled 測試中 and tell users to keep their own JSON exports.

Also shipped that day: summon-altar backgrounds now rotate randomly through 30 moon-altar
illustrations (`Moon_altar/` originals → `assets/altar/*.webp`, 1.6 MB PNG → ~75 KB each);
meteor-shower easter egg retuned (3.3% appearance, 10s, skippable after 3s, 8% fragment drop);
and the home tab gained an explicit "安裝 App" button because Chrome's automatic install prompt
was not firing for users.

### 2026-07-28 — 星塵專欄創刊 + 真實朔望演算法 + 站內通報
Three connected changes, all on `claude/stardust-fullmoon-article-translation-311edj`:

1. **星塵專欄 (Stardust Column)** — a new card on the 宇宙 tab holding Blue's own original
   astronomy writing, kept in the `COLUMN` array and deliberately separate from `NEWS`
   (the NASA feed in `api/space-news` overwrites `NEWS` wholesale, so a column entry placed
   there would be washed away on the next fetch). Column entries set `bilingual: true` and
   render through `openBilingualArticle()`: full Chinese first, then the full English
   underneath in one scroll, no language toggle. First entry is Blue's 7/28 full-moon piece,
   translated into British English for Blue to cross-post to social.
2. **Moon phases now use true syzygy times** (Meeus, *Astronomical Algorithms* ch. 49) instead
   of a fixed 29.53-day mean. The mean model put the July 2026 full moon on 7/30 for a Taipei
   device; the true instant is 2026-07-29 22:35 Taiwan time. Dates are always derived in the
   device's own time zone. Same code is mirrored in `sw.js` (kept in sync by hand, as before).
   Knock-on fixes: illumination percentage is interpolated across the real 朔→望→朔 of the
   current lunation (7/28 now reads 99%, not 100%); the calendar's new/full-moon outline
   highlight starts on the day the phase actually occurs rather than the day after; and
   `ASTRO_EVENTS`' December supermoon moved 12/23 → 12/24, which is the Taiwan date (the
   Western-sourced 12/23 would otherwise have rendered as a second, contradictory full-moon row).
3. **站內通報 (in-app broadcast)** — `BROADCASTS` in `app.js` + a matching `BROADCAST` constant
   in `sw.js`. There is no Web Push server here and no push subscriptions are collected, so
   delivery is two-track: installed Android PWAs that granted notifications get a background
   system notification through the existing `periodicsync` pipeline; everyone else (including
   all of iOS) sees a card the next time they open the app. Both routes end at the same claim
   action, which grants one complete 神奇海螺 via `awardCompleteShell()` and writes the
   broadcast id into `settings.broadcasts` so it never fires twice. The card waits for
   `#book-landing` and any open modal to clear before showing — the 魔法書 opener is not a
   `.modal-mask` and will otherwise swallow the taps.

**If you want real server-sent push later**, that is a genuine build: VAPID keypair (private key
as a Vercel env var, never in git), a subscription store in Upstash Redis alongside the existing
account/board KV, an authenticated broadcast endpoint, `push`/`pushsubscriptionchange` handlers
in `sw.js`, and a permission-request flow. Note iOS only delivers Web Push to PWAs installed to
the home screen.

### 2026-07-29 — 版本更新機制、SW fetch 修正、兩種新海螺

**先記一件不是程式問題的事故。** 2026-07-28 兩個 PR（#15 #16）都正常合併並部署到
production 之後，Blue 在 Vercel 後台對一個**舊的 deployment**按了 Redeploy（連按三次，
16:33 / 16:37 / 16:43 UTC），把 production 別名指回 commit `19003c9`，於是線上跑的是
專欄上線前的版本。表現出來就是「清除資料、移除重裝都還是舊的、沒有文章、沒有通知」。
排查方式：抓 production 的 `app.js` 和每個 commit 逐一 diff，就能指認線上到底是哪一版。
**要回到最新版，正確操作是對 main 最新的那個 deployment 按 Promote to Production，
或直接讓 main 產生一個新 commit（合併任何 PR 都可以）；對舊 deployment 按 Redeploy
等於回滾。**

三項程式改動：

1. **版本更新機制**（`APP_VERSION` + `initServiceWorker()`）。以前使用者無從得知自己在
   哪一版，改版後也可能好幾天停在舊版。現在：設定分頁顯示版本號與一顆「立即檢查更新」；
   啟動時與每次從背景回前景時主動 `reg.update()`（5 分鐘節流）；偵測到新版跳橫幅，
   由使用者自己按下重載——不自動 reload，因為使用者可能正在打日記。
   `hadController` 在註冊前先取值，否則首次安裝也會誤報有新版。
   **關鍵實作細節：不要把邏輯掛在 `navigator.serviceWorker.register()` 的 promise 上。**
   實測 Chromium 在「使用者回訪、頁面已被 SW 接管」時，那個 promise 會遲遲不 resolve
   （5 秒仍 TIMEOUT），而 `navigator.serviceWorker.ready` 每次都即時回應。第一版就是踩到
   這個坑，整套更新偵測形同不存在。

2. **`sw.js` fetch handler 修正（真的 bug）**。舊版把**所有** GET 都攔下來，任何抓失敗的
   請求一律回傳 `index.html`。於是第三方腳本（`accounts.google.com/gsi/client`）只要載入
   失敗就會收到一坨 HTML，變成 `Uncaught SyntaxError: Unexpected token '<'`，而且會連帶
   把 `register()` 卡住。現在：跨網域請求直接不接管；同網域抓不到時先找快取，只有
   `request.mode === "navigate"` 才退回 `index.html`，其餘回 `Response.error()`。

3. **兩種新的神奇海螺**：🚀 綜觀效應（深空稀有，權重 2）與 ⚫️ 克爾黑旋（事件視界・最罕見，
   權重 1，全系列最罕見）。權重總和 106 → 五元素各 18.9%、量子糾纏 2.8%、綜觀效應 1.9%、
   克爾黑旋 0.9%。稀有度字串改成資料驅動的 `rarity` 欄位，寶庫與召喚結果共用。

驗證方式：本機起了一台 HTTPS 伺服器（service worker 只在安全環境運作），用 Chromium 跑
完整情境——首次安裝不誤報、回訪不誤報、模擬上線新版本後切回前景跳出橫幅、按下更新後
版本號確實變成新的、全程無 JS 錯誤。

### 2026-07-29（續）— 宇宙分頁子分頁化 ＋ 知識問答測驗

**宇宙分頁改成子分頁**：`天象｜專欄｜新聞｜知識｜測驗`，選擇記在
`settings.cosmosSub`。做這個決定的原因是底部分頁列已經有九顆按鈕，加第十顆在手機上
會擠到很難點；而專欄文章之後會越來越多，四張卡片一路往下疊等於把新聞和知識埋掉。
`renderCosmos()` 現在只畫子分頁列，內容交給 `renderCosmosSky/Column/News/Know/Quiz`
其中一個填進 `#cosmos-body`。站內通報的「領取並閱讀」會先把 `cosmosSub` 設成
`column`，否則使用者關掉文章之後會落在天象頁，找不到剛剛那篇。

**宇宙知識問答測驗**（`QUIZ_BANK`，26 題）：每輪隨機抽 5 題，選項連同「是不是正解」
一起洗牌，所以背選項位置沒有用。每題都帶 `ref` 指向一篇既有的天文知識文章，答完可以
直接跳去讀。獎勵刻意設得很克制——**每天「第一次」全對才給一片碎片**，其餘純練習；
這樣一天最多多出一片，不會把召喚祭壇的經濟灌爆，但仍有回來玩的理由。
統計存在 `settings.quiz`（plays / best / totalCorrect / totalAnswered / lastRewardDate）。

題庫寫作原則：只寫查得到、站得住腳的天文事實。有一支檢查腳本驗過全部 26 題的
id 唯一性、選項數、答案索引範圍、選項不重複、`ref` 都能對到真的文章、解析長度。
其中兩題刻意呼應新加的海螺（綜觀效應 Overview Effect、克爾／史瓦西黑洞的差別）。

### 2026-07-30 — 文案修訂、今日天象光暈、sticky 子分頁、IG、連續參加獎勵

Blue 指定的七項。值得記下來的三件：

1. **sticky 子分頁的定位基準**。子分頁列改成 `position: sticky`，`top` 用 `--header-h`，
   由 `syncHeaderHeight()` 量標題列實際高度寫進 `:root`（並掛 resize）。原本寫死 52px，
   實測標題列是 56px，會露出一條縫。字級、主題、瀏海都會改變那個高度，不要寫死。
   同時拿掉切換子分頁時的 `scrollIntoView`——那會把整頁捲到最上面，子分頁列被推到標題列
   底下，看起來像自動隱藏，正是 Blue 回報的問題。

2. **今日天象的呼吸光暈**。`eventRowHTML()` 在 `dd === 0` 時加 `.today`，CSS 用
   `ev-breathe` 3.4s 循環改變 border-color 與 box-shadow。`prefers-reduced-motion`
   下關掉動畫但保留金色外框，仍看得出是今天。

3. **連續參加獎勵**（Duolingo 式）。`bumpQuizStreak()`：完成一輪就算今天有參加，
   **答對與否不影響**；滿 7 天送一次召喚機會。連續天數比對用 `yesterdayStr()`，
   以日期元件往回推一天，不用毫秒相減——有日光節約時間的地區減 24 小時可能還停在同一天。
   同日重複玩不會重複計數也不會重複發獎。首頁的 7 格連續紀錄由 `quizStreakDays()` 產生。

另外新增 `docs/cycle-moon-vision.md`：生理期 × 月相共時性的設計規劃，**尚未實作**，
等 Blue 確認文件第七節那四個問題再開工。該文件第零節把健康資料的處理界線先釘死了
（預設關閉、只存本機、上雲一律 E2E 加密、絕不進任何 API、匯出預設排除、可整組刪除、
不做醫療宣稱、不做安全期與避孕推算）。

### Open / unfinished work
`docs/crystal-vision.md` is a de facto product roadmap, with v1 marked shipped:
- **v1.5 (next):** collection achievement badges, a shareable collection poster (canvas → PNG export), full-moon cleansing push notifications (reusing the existing `sw.js` notification pipeline).
- **v2:** AI crystal recognition (Anthropic vision), a first "crystal academy" course, intent-tracking.
- **v2.5:** a personalized "destiny crystal" report — **this is a cross-repo dependency on the ÆTHNOUS Engine** — plus a new/full-moon ritual-pack subscription and payments (LemonSqueezy or Stripe).
- **v3:** physical print-on-demand posters, a curated affiliate store, internationalization/English version.
- The doc also sketches a monetization tier table (Free / Stardust Plus ≈ NT$120–180/mo / one-off purchases NT$199–1,290) — not yet implemented.
- No `TODO`/`FIXME` code markers exist — all planned work lives in the vision doc, not inline.

### Gap to flag
**This repo has no `CLAUDE.md`.** Every sibling repo in the network has one codifying at minimum a secrets rule and a personal-data-never-in-git rule; given this app stores real user mood/journaling data, that gap is worth closing soon — recommend writing one that at least covers: secrets handling, the "no real user data in git" rule (adapted from the birth-data rule elsewhere), and this app's architecture map, mirroring the pattern used in the other six repos.

### Branches
`main`, `claude/moon-altar-account-system-op2yvx` (altar backgrounds, meteor tuning, 星塵帳號,
install button), and `claude/stardust-fullmoon-article-translation-311edj` (星塵專欄創刊, true
syzygy times, 站內通報 — see the 2026-07-28 entry above). The earliest branch,
`claude/crystal-knowledge-collection-jcgq14`, is already merged via PR #1.

---

## 5. If you're an agent picking this up cold

1. There's no `CLAUDE.md` here yet — this file and `docs/crystal-vision.md` are the closest things to ground rules and a roadmap until one exists.
2. Check section 4 above for open work (the v1.5 roadmap items) before starting something new.
3. If you materially change this repo's status (ship a v1.5 item, open a big feature branch, or — ideally — write the missing `CLAUDE.md`), update this file's section 4 and its "Compiled" date before you stop.
4. Be extra careful with real user mood/journaling/dream data — treat it with the same never-in-git discipline the rest of the network applies to birth data.
