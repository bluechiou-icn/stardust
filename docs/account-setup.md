# 星塵帳號 — 設定與運作方式

> 給 Blue 的白話版：這份說明是「怎麼把帳號功能打開」＋「它到底怎麼保護使用者的紀錄」。
> 設定只需要在 Vercel 貼兩個環境變數，不用寫任何程式。

## 為什麼要重做

舊版設定頁的「✉️ 用 Email 註冊新帳號」其實**不是帳號**：它只是把 email 寫進這台裝置的
`localStorage`（`settings.account`），再送一份 email 到行銷名單。所以：

- 清掉瀏覽器資料 → 帳號和紀錄一起消失
- 換手機 → 沒有任何東西能拿回來
- 「登入」根本不存在，因為後端從來沒有存過這個人的資料

新的 **星塵帳號** 是真的帳號：email + 密碼存在後端，紀錄也存在後端（加密過），
清 cookie、換手機、重灌，只要登入就拿得回來。

## 一、打開功能（Vercel 環境變數）

1. 到 [Upstash](https://upstash.com/) 開一個免費的 Redis database（跟辣妹留言板同一套服務，
   已經有的話可以直接共用同一個 database，key 不會撞到）。
2. 在 database 頁面找到 **REST API** 區塊，複製 `UPSTASH_REDIS_REST_URL` 與
   `UPSTASH_REDIS_REST_TOKEN`。
3. 到 Vercel → 專案 → Settings → Environment Variables，新增：

   | 變數名 | 值 |
   |---|---|
   | `ACCOUNT_KV_URL` | Upstash 的 REST URL（例：`https://xxx.upstash.io`） |
   | `ACCOUNT_KV_TOKEN` | Upstash 的 REST token |

4. 重新 deploy。

沒設定也不會壞：`/api/account?action=status` 會回 `enabled:false`，設定頁的帳號區塊會顯示
「星塵帳號尚未啟用」，其他功能照常運作。
（如果已經設過 `BOARD_KV_URL` / `BOARD_KV_TOKEN`，沒設 `ACCOUNT_*` 時會自動沿用那一組。）

## 二、它怎麼保護使用者的紀錄（端對端加密）

**後端看不到任何人的夢境、心情或日記。** 加密是在使用者的手機上完成的：

```
金鑰    = PBKDF2-SHA256(密碼, salt = SHA-256("stardust-v1|" + email), 200,000 次)  → AES-GCM 256
verifier = SHA-256(金鑰 + "stardust-auth-v1")                                      → 送給後端驗身份用
```

- 上傳前，整包紀錄先用**金鑰**加密成一團密文，後端只存那團密文。
- 送給後端的是 **verifier**，不是密碼、也不是金鑰。verifier 是金鑰的單向衍生值，
  從它推不回金鑰，所以後端拿到 verifier 也解不開資料。
- 後端再把 verifier 用隨機 salt 做一次 scrypt 才存起來，資料庫外流也不能直接拿來登入。
- 金鑰只存在瀏覽器記憶體，**絕不寫進 localStorage**。所以每次重新打開 App，
  會請使用者輸入一次密碼「解鎖」——這是刻意的，不是 bug。

### ⚠️ 代價：密碼忘了就解不開

因為連我們都沒有金鑰，所以**沒有「忘記密碼」可以救**。忘記密碼時：

- 雲端那份密文永遠解不開（可以刪掉帳號重新註冊）
- 這台手機上的本機紀錄還在
- 之前「匯出 JSON」的備份檔還在

前端在註冊表單、設定頁都已經明講這件事，並提醒使用者定期匯出備份。

## 三、後端存了什麼

Upstash Redis 裡只有這些 key（`<email>` 是小寫後的 email）：

| Key | 內容 |
|---|---|
| `stardust:acct:u:<email>` | email、暱稱、salt、verifier 的 scrypt hash、建立時間 |
| `stardust:acct:d:<email>` | `{ v, iv, ct, updatedAt }` — `ct` 是那團誰都解不開的密文 |
| `stardust:acct:s:<token>` | session token → email，180 天到期，有在用就自動續期 |
| `stardust:acct:rl:*` | 防暴力破解的計數器 |

沒有明文的夢境、心情、日記，也沒有密碼。

## 四、同步規則

- **本機是主資料庫**，雲端是鏡像：每次 `store.save()` 之後 3 秒（debounce）推一份加密備份上去。
- **登入時是「合併」不是「覆蓋」**：雲端有、本機沒有的紀錄會補進來（用 `id` 比對），
  本機既有的紀錄一律保留。神奇海螺碎片取兩邊較多的那個，避免換手機後變少。
- **夢境照片不同步**：照片存在 IndexedDB，體積太大，只留在原本那台裝置。
- 單次上傳的密文上限 700 KB（約 500 KB 的原始 JSON）。超過會提示先匯出備份再清一些舊紀錄。

## 五、API 一覽（`/api/account`）

| 動作 | 送出 | 回傳 |
|---|---|---|
| `GET ?action=status` | — | `{ enabled }` |
| `signup` | `email, verifier, nickname` | `{ token, nickname }` |
| `login` | `email, verifier` | `{ token, nickname, blob }` |
| `pull` | `token` | `{ blob }` |
| `push` | `token, blob` | `{ ok, updatedAt }` |
| `logout` | `token` | `{ ok }` |
| `passwd` | `token, verifier, newVerifier, blob` | `{ ok, token }` |
| `destroy` | `token, verifier` | `{ ok }` |

防護：同一 IP 十分鐘內最多 30 次帳密操作、同一帳號十五分鐘內最多 10 次密碼錯誤；
登入失敗一律回同一個 `bad-credentials`，不區分「查無此帳號」與「密碼錯」，避免被拿來探測誰註冊過。

## 六、和 Google Drive 同步的關係

兩者獨立、可以同時用：

- **星塵帳號**：email + 密碼，紀錄加密存在我們的後端 → 換手機主力方案
- **Google Drive 備份**（`cloud.js`）：存在使用者自己的 Drive → 使用者完全自己掌控

兩個都在測試中，設定頁已加上「測試中」標籤，並提醒使用者定期用「匯出 JSON」自留備份。
