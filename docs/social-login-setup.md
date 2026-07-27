# 用 Google／Apple 帳號登入 — 你要做的步驟

> 給 Blue 的白話版。看完你會知道：Google 只差一個設定就能開（程式已經寫好了），
> Apple 則需要付費開發者帳號＋一段新的後端程式。

---

## 先講最重要的取捨

「找不回密碼」和「後端看不到你的資料」是**同一件事的兩面**，不可能兩個都要：

| 做法 | 忘記密碼怎麼辦 | 後端看得到夢境心情嗎 | 費用 |
|---|---|---|---|
| **A. 星塵帳號**（現在這個） | 找不回，宇宙也不曉得 | ❌ 看不到 | 免費 |
| **B. Google Drive 同步**（程式已寫好，差設定） | 不會有這問題，重新登入就好 | ❌ 看不到（存在 user 自己的 Drive） | 免費 |
| **C. Google／Apple 登入 ＋ 存我們後端** | 不會有這問題 | ✅ **看得到** | 免費／Apple 需 $99 美元一年 |

**我的建議：先做 B。** 它同時解決「真的 Google 登入」和「找不回密碼」兩件事，
而且資料是存進使用者自己的 Google Drive，你完全不用碰到任何人的日記——
對一個記錄心情與夢境的 App 來說，這是最乾淨的位置。程式（`cloud.js`）早就寫好了，
只差一個設定值。

C 之所以要特別想清楚，是因為一旦資料以明文存在你的後端，你就變成那些日記的保管人了：
資料庫外流、員工好奇、被要求交出資料，責任都在你身上。真的要做也可以，
但那是一個產品與法律決定，不只是技術決定。

---

# 一、Google 登入（推薦先做，約 20 分鐘）

程式已經在 `cloud.js` 裡寫好了：Google 登入 → 存進使用者自己 Google Drive 的隱藏資料夾
（`appDataFolder`，只有這個 App 看得到、使用者移除 App 就消失），換手機登入同一個 Google
帳號就自動把紀錄拉回來。**現在唯一缺的是 `STARDUST_GOOGLE_CLIENT_ID` 這個設定值**
（我剛查過線上是空的，所以那顆按鈕一直是灰的）。

### 步驟

1. **開一個 Google Cloud 專案**
   - 到 <https://console.cloud.google.com/>，用你的 Google 帳號登入
   - 左上角專案選單 →「新增專案」→ 名字打 `Stardust DreamTide` → 建立

2. **打開 Google Drive API**
   - 左邊選單「API 和服務」→「已啟用的 API 和服務」→「+ 啟用 API 和服務」
   - 搜尋 `Google Drive API` → 點進去 → 「啟用」

3. **設定 OAuth 同意畫面**（使用者按下登入時看到的那個授權視窗）
   - 左邊選單「API 和服務」→「OAuth 同意畫面」
   - User Type 選 **外部（External）** → 建立
   - 應用程式名稱：`星塵夢汐 Stardust DreamTide`
   - 使用者支援電子郵件、開發人員聯絡資訊：填你的 email
   - 應用程式首頁：`https://stardust.bluechiou.com`
   - 隱私權政策連結：**這個必填**，如果還沒有，先做一頁簡單的隱私權說明頁
   - 「範圍（Scopes）」這一步先跳過，程式會在登入時自己要求
   - 「測試使用者」加上你自己的 email

4. **建立憑證，拿到 Client ID**
   - 左邊選單「API 和服務」→「憑證」→「+ 建立憑證」→ **OAuth 用戶端 ID**
   - 應用程式類型：**網頁應用程式**
   - 名稱：`Stardust Web`
   - **已授權的 JavaScript 來源**（很重要，兩個都要加）：
     ```
     https://stardust.bluechiou.com
     https://stardust.vercel.app
     ```
     （之後如果要在 Vercel preview 網址測試，那個網址也要加進來）
   - 「已授權的重新導向 URI」不用填（這套用的是彈出式授權，不走 redirect）
   - 建立 → 會跳出一組 **用戶端 ID**，長得像
     `123456789-abcdefg.apps.googleusercontent.com` → 複製起來

5. **貼進 Vercel**
   - Vercel → stardust 專案 → Settings → Environment Variables
   - 新增 `STARDUST_GOOGLE_CLIENT_ID` = 剛剛複製的那串
   - 重新 deploy

6. **測試**
   - 進設定頁 →「☁ 雲端備份」→ 應該會出現「🔐 用 Google 登入」
   - 登入後換另一台裝置登入同一個 Google 帳號，紀錄應該會自動補回來

> ⚠️ Client ID 是**公開值**，放在前端是 Google 官方接受的做法（靠「已授權的 JavaScript 來源」
> 限制誰能用）。但**用戶端密鑰（Client Secret）絕對不要放進前端，也不要進 git**。
> 這套流程根本用不到 Secret。

### 上線前還有一關：Google 驗證

`drive.appdata` 和 `drive.file` 這兩個權限被 Google 歸類為**敏感範圍（Sensitive Scope）**。
在通過 Google 驗證之前：

- 你的 App 會停在「測試中」狀態，**最多 100 個測試使用者**，而且要一個一個把
  email 加進「測試使用者」清單
- 使用者會看到「這個應用程式未經 Google 驗證」的警告畫面

要拿掉這些限制，需要在 OAuth 同意畫面按「發布應用程式」並送出驗證，Google 會要求：
隱私權政策頁、一支說明這個 App 怎麼使用 Drive 權限的 YouTube 示範影片、驗證網域擁有權。
審核大概 **2～6 週**。

**所以實務上的節奏是**：先發布「測試中」狀態自己和朋友用（100 人其實夠測很久），
確定這個功能真的有人用，再送驗證。

---

# 二、Apple 登入（比較麻煩，需要付費帳號）

Apple 登入沒辦法像 Google 那樣純前端搞定，因為 Apple 要求用一把私鑰簽出的
JWT 去交換身份，**這件事一定要在後端做**（放前端就等於把私鑰公開）。

### 你要準備的

1. **Apple Developer Program 會員資格** — **每年 99 美元**，這是硬性門檻，
   沒有免費方案可以做 Sign in with Apple。<https://developer.apple.com/programs/>

2. **一個 App ID**
   - 到 <https://developer.apple.com/account> → Certificates, Identifiers & Profiles → Identifiers
   - 「+」→ App IDs → App → 描述打 `Stardust DreamTide`
   - Capabilities 勾選 **Sign In with Apple**

3. **一個 Service ID**（網頁版用的識別碼，這個會變成 `client_id`）
   - Identifiers →「+」→ **Services IDs**
   - Identifier 填類似 `com.bluechiou.stardust.web`
   - 建立後點進去 → 勾 Sign In with Apple → Configure：
     - Primary App ID：選剛剛建的 App ID
     - Domains：`stardust.bluechiou.com`
     - Return URLs：`https://stardust.bluechiou.com/api/apple-callback`

4. **一把私鑰（.p8 檔）**
   - Keys →「+」→ 名字打 `Stardust Sign In Key` → 勾 **Sign In with Apple** → Configure
     選 Primary App ID → 儲存
   - **下載那個 `.p8` 檔案 —— 只能下載這一次，弄丟要重開一把**
   - 記下 **Key ID**（10 碼）和你的 **Team ID**（右上角，也是 10 碼）
   - ⚠️ **`.p8` 絕對不要放進 git**，要整個檔案內容貼進 Vercel 環境變數

5. **貼進 Vercel 的環境變數**

   | 變數名 | 從哪來 |
   |---|---|
   | `APPLE_CLIENT_ID` | 步驟 3 的 Service ID（例：`com.bluechiou.stardust.web`） |
   | `APPLE_TEAM_ID` | Apple Developer 右上角的 Team ID |
   | `APPLE_KEY_ID` | 步驟 4 的 Key ID |
   | `APPLE_PRIVATE_KEY` | `.p8` 檔案的**完整內容**（含 `-----BEGIN PRIVATE KEY-----` 那幾行） |

6. **然後我要寫的程式**（你不用做，但要知道有這一段工）
   - `api/apple-callback.js`：接 Apple 轉回來的授權碼，用 `.p8` 簽一個 JWT
     當 client_secret，跟 Apple 換 id_token，驗簽後取出使用者的 email
   - 前端加一顆 Apple 登入按鈕，走 Apple 的 JS SDK
   - 帳號體系要決定怎麼跟現有的星塵帳號接上（見下面）

### Apple 的兩個坑要先知道

- **「隱藏我的電子郵件」**：使用者可以選擇不給真實 email，Apple 會發一個
  `xxxx@privaterelay.appleid.com` 的轉發地址給你。這完全正常，但代表你不能假設
  拿得到真實 email，也代表同一個人用 Google 和 Apple 登入會變成兩個不同帳號。
- **email 只給一次**：Apple 只在**第一次**授權時回傳 email，之後再登入就不給了。
  所以第一次拿到就一定要存起來。

---

# 三、Google／Apple 登入接上來之後，加密怎麼辦？

這是最需要你決定的一題。Google／Apple 登入**沒有密碼**，所以現在那把
「用密碼算出來的金鑰」就沒有來源了。三種走法：

**走法 1（推薦）：Google 登入只用來存進使用者自己的 Drive**
就是上面的方案 B，`cloud.js` 已經做好了。沒有金鑰問題，因為資料在使用者自己的 Google 帳號裡，
Google 本來就會幫他們管好。忘記密碼？不存在這個問題。

**走法 2：Google／Apple 登入 ＋ 資料明文存我們後端**
最順的使用者體驗——按一下就登入，換手機自動同步，永遠不會弄丟。
代價是**你的後端從此看得到所有人的夢境和心情**，前面說的責任就落到你身上了。
如果要走這條，隱私權政策必須改寫講清楚，而且我建議至少把資料在後端加密存放
（雖然那把鑰匙還是在你手上，防的是資料庫直接外流，防不了內部）。

**走法 3：Google／Apple 登入 ＋ 另外設一組「加密密碼」**
兩全其美聽起來很美，但實際上使用者還是要記一組密碼，忘了還是解不開——
只是把問題換個位置，體驗反而更複雜。**不建議。**

---

# 四、建議的順序

1. **先做 Google（方案 B）** — 20 分鐘設定，程式已經好了，先發「測試中」狀態自己用
2. **觀察一陣子** — 看看真的有多少人會用登入同步，再決定值不值得往下投資
3. **人數上來了再送 Google 驗證** — 拿掉 100 人上限和警告畫面
4. **Apple 最後再說** — 一年 99 美元加上一段後端工程，等使用者真的在問再做

星塵帳號（email + 密碼）就保持現在這樣當作不想綁 Google 的人的選項。
三種方式可以並存，使用者選自己習慣的就好。
