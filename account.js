/* 星塵夢汐 · 星塵帳號（前端）
   ─────────────────────────────────────────
   舊版「Email 註冊」只是把 email 寫進 localStorage，清掉瀏覽器資料就全沒了。
   這一版是真的帳號：email + 密碼 → 後端（api/account）存一份加密過的紀錄，
   換手機、清 cookie、重灌，只要登入回來就把紀錄拉回本機。

   🔐 端對端加密：後端看不到你的夢境與心情
     金鑰 = PBKDF2-SHA256(密碼, salt=SHA-256("stardust-v1|"+email), 200,000 次) → AES-GCM 256
     送到後端的 verifier = SHA-256(金鑰 + "stardust-auth-v1")，是金鑰的單向衍生值，
     從 verifier 推不回金鑰，所以後端拿到的永遠只是一團密文。
     ⚠️ 代價：密碼忘了，雲端那份就永遠解不開（本機那份和匯出檔還在）。UI 有明講。

   金鑰只留在記憶體（跟 cloud.js 的 token 一樣，絕不寫進 localStorage）；
   localStorage 只存 session token 與 email，重開 App 時會請使用者輸入一次密碼解鎖。 */
"use strict";

const AcctCfg = {
  api: "api/account",
  tokenKey: "stardust_acct_token",
  emailKey: "stardust_acct_email",
  nickKey: "stardust_acct_nick",
  pbkdf2Iterations: 200000,
  pushDebounceMs: 3000,
};

const Account = {
  enabled: null,   // null = 還沒問過後端
  token: null,
  email: null,
  nickname: "",
  key: null,       // CryptoKey，記憶體 only
  locked: false,   // 有 token 但還沒用密碼解鎖 → 只能讀本機，不能同步
  lastSync: null,
  busy: false,
};

/* ---------- 小工具 ---------- */
const _enc = new TextEncoder();
const _dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch {} }

/* ---------- 金鑰推導 ---------- */
async function deriveKey(email, password) {
  const salt = await crypto.subtle.digest("SHA-256", _enc.encode("stardust-v1|" + email.toLowerCase()));
  const base = await crypto.subtle.importKey("raw", _enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: AcctCfg.pbkdf2Iterations, hash: "SHA-256" }, base, 256);
  const key = await crypto.subtle.importKey("raw", bits, "AES-GCM", false, ["encrypt", "decrypt"]);
  // verifier 是金鑰的單向衍生值：後端能拿它驗身份，但推不回金鑰
  const vBits = await crypto.subtle.digest("SHA-256",
    concatBytes(new Uint8Array(bits), _enc.encode("stardust-auth-v1")));
  return { key, verifier: hex(vBits) };
}
function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0); out.set(b, a.length);
  return out;
}
async function encryptBlob(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, _enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}
async function decryptBlob(key, blob) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ct));
  return JSON.parse(_dec.decode(plain));
}

/* ---------- 後端呼叫 ---------- */
async function acctApi(payload) {
  const r = await fetch(AcctCfg.api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) {
    const err = new Error(j.error || `http-${r.status}`);
    err.code = j.error || `http-${r.status}`;
    throw err;
  }
  return j;
}
const ERR_ZH = {
  "email-taken": "這個 email 已經註冊過了，直接登入就好",
  "bad-credentials": "email 或密碼不對耶，再試一次",
  "session-expired": "登入已過期，請重新輸入密碼",
  "too-many-requests": "嘗試太頻繁，休息十分鐘再來",
  "too-many-attempts": "密碼錯太多次，十五分鐘後再試",
  "blob-too-large": "紀錄太大包，超過雲端單次上限；先匯出 JSON 備份，再刪掉一些舊照片或紀錄",
  "not-configured": "帳號系統尚未啟用（後端還沒設定）",
  "invalid-email": "email 格式看起來不對耶",
};
const errZh = e => ERR_ZH[e?.code] || "連線不順，請稍後再試";

/* ---------- 啟用狀態 ---------- */
async function accountCheckEnabled() {
  if (Account.enabled !== null) return Account.enabled;
  try {
    const r = await fetch(`${AcctCfg.api}?action=status`, { cache: "no-store" });
    const j = await r.json();
    Account.enabled = !!j.enabled;
  } catch { Account.enabled = false; }
  return Account.enabled;
}

/* ---------- 合併：本機為主，雲端只補上本機沒有的 ---------- */
const SYNC_LISTS = ["dreams", "diary", "cbt", "focus", "capsules", "customEvents", "sleep",
  "crystals", "notes", "todos", "moods", "gratitude", "wins", "aiChat", "feedback"];
function mergeCloudData(cloudData) {
  if (!cloudData || typeof cloudData !== "object") return 0;
  let added = 0;
  for (const k of SYNC_LISTS) {
    const local = new Map((store.data[k] || []).map(x => [x?.id || JSON.stringify(x), x]));
    for (const item of cloudData[k] || []) {
      const key = item?.id || JSON.stringify(item);
      if (!local.has(key)) { local.set(key, item); added++; }
    }
    store.data[k] = [...local.values()];
  }
  // 設定類只補「本機還沒有的欄位」，不覆蓋這台裝置上的偏好
  const cs = cloudData.settings || {};
  const ls = store.data.settings;
  if (cs.symbols) ls.symbols = [...new Set([...(ls.symbols || []), ...cs.symbols])];
  if (cs.customEmotions) ls.customEmotions = [...new Set([...(ls.customEmotions || []), ...cs.customEmotions])];
  // 神奇海螺：兩邊取多的那個，避免換手機後碎片變少
  if (cs.shells) {
    const a = ls.shells || (ls.shells = { frag: {}, complete: 0, charges: 0 });
    const b = cs.shells;
    a.frag ||= {};
    for (const [k, v] of Object.entries(b.frag || {})) a.frag[k] = Math.max(a.frag[k] || 0, v || 0);
    a.complete = Math.max(a.complete || 0, b.complete || 0);
    a.charges = Math.max(a.charges || 0, b.charges || 0);
    a.summons = Math.max(a.summons || 0, b.summons || 0);
  }
  if (!ls.nickname && cs.nickname) ls.nickname = cs.nickname;
  store.save();
  return added;
}

/* ---------- 同步 ---------- */
function accountSignedIn() { return !!(Account.token && Account.key); }

let _pushTimer = null;
function accountSyncPushSoon() {
  if (!accountSignedIn()) return;
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => { accountSyncPush().catch(() => {}); }, AcctCfg.pushDebounceMs);
}
async function accountSyncPush() {
  if (!accountSignedIn()) return;
  const blob = await encryptBlob(Account.key, store.data);
  await acctApi({ action: "push", token: Account.token, blob });
  Account.lastSync = new Date();
  refreshAccountUI();
}
async function accountSyncPull({ quiet = false } = {}) {
  if (!accountSignedIn()) return { merged: 0 };
  const { blob } = await acctApi({ action: "pull", token: Account.token });
  if (!blob?.ct) { await accountSyncPush(); return { merged: 0 }; }
  let cloudData;
  try { cloudData = await decryptBlob(Account.key, blob); }
  catch { if (!quiet) toast("雲端那份解不開，可能是密碼換過了"); return { merged: 0, failed: true }; }
  const merged = mergeCloudData(cloudData);
  await accountSyncPush();
  Account.lastSync = new Date();
  return { merged };
}

/* ---------- 登入／註冊／登出 ---------- */
async function accountSignup(email, password, nickname) {
  const { key, verifier } = await deriveKey(email, password);
  const r = await acctApi({ action: "signup", email, verifier, nickname });
  Account.token = r.token; Account.email = email.toLowerCase();
  Account.nickname = nickname || ""; Account.key = key; Account.locked = false;
  lsSet(AcctCfg.tokenKey, r.token); lsSet(AcctCfg.emailKey, Account.email);
  if (nickname) lsSet(AcctCfg.nickKey, nickname);
  await accountSyncPush();               // 註冊當下就把這台裝置的紀錄放上雲端
  return r;
}
async function accountLogin(email, password) {
  const { key, verifier } = await deriveKey(email, password);
  const r = await acctApi({ action: "login", email, verifier });
  Account.token = r.token; Account.email = email.toLowerCase();
  Account.nickname = r.nickname || ""; Account.key = key; Account.locked = false;
  lsSet(AcctCfg.tokenKey, r.token); lsSet(AcctCfg.emailKey, Account.email);
  if (r.nickname) lsSet(AcctCfg.nickKey, r.nickname);

  let merged = 0;
  if (r.blob?.ct) {
    try {
      merged = mergeCloudData(await decryptBlob(key, r.blob));
    } catch {
      // 密碼對得上帳號卻解不開資料 → 幾乎只可能是換過密碼後舊裝置還留著舊密文
      toast("雲端資料解不開，先保留本機紀錄");
    }
  }
  await accountSyncPush();
  Account.lastSync = new Date();
  return { merged };
}
/* 重開 App：token 還在但金鑰不在（金鑰從不落地）→ 請使用者輸入一次密碼解鎖 */
async function accountUnlock(password) {
  const email = Account.email || lsGet(AcctCfg.emailKey);
  if (!email) throw new Error("no-account");
  return await accountLogin(email, password); // 重新登入最單純，也順便換一組新 token
}
async function accountLogout({ silent = false } = {}) {
  const token = Account.token;
  Account.token = null; Account.key = null; Account.email = null;
  Account.nickname = ""; Account.locked = false; Account.lastSync = null;
  lsDel(AcctCfg.tokenKey); lsDel(AcctCfg.emailKey); lsDel(AcctCfg.nickKey);
  if (token) { try { await acctApi({ action: "logout", token }); } catch {} }
  if (!silent) toast("已登出星塵帳號（本機紀錄不會被刪除）");
  refreshAccountUI();
}

/* ---------- UI ---------- */
function syncAgo() {
  if (!Account.lastSync) return "尚未同步";
  const s = Math.round((Date.now() - Account.lastSync) / 1000);
  if (s < 60) return "剛剛同步";
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前同步`;
  return Account.lastSync.toLocaleString();
}

function refreshAccountUI() {
  const box = document.getElementById("account-box");
  if (!box) return;

  if (Account.enabled === null) {
    box.innerHTML = `<p class="muted small">載入中⋯</p>`;
    accountCheckEnabled().then(refreshAccountUI);
    return;
  }
  if (!Account.enabled) {
    box.innerHTML = `
      <p class="muted small">星塵帳號尚未啟用（需在 Vercel 設定 <code>ACCOUNT_KV_URL</code> 與
      <code>ACCOUNT_KV_TOKEN</code>）。在那之前，請用下面的「匯出 JSON」自己留一份備份。</p>`;
    return;
  }

  if (accountSignedIn()) {
    box.innerHTML = `
      <p class="small">✅ 已登入 <b>${esc(Account.email)}</b>${Account.nickname ? `・${esc(Account.nickname)}` : ""}</p>
      <p class="muted small">紀錄會自動加密上傳；換手機時用同一組 email＋密碼登入就會全部回來。<br>${esc(syncAgo())}</p>
      <div class="btn-row">
        <button class="btn secondary" id="ac-sync">🔄 立即同步</button>
        <button class="btn secondary" id="ac-restore">📥 從帳號取回紀錄</button>
      </div>
      <div class="btn-row">
        <button class="btn ghost" id="ac-passwd">🔑 更換密碼</button>
        <button class="btn ghost" id="ac-logout">登出</button>
      </div>
      <div class="btn-row"><button class="btn ghost danger" id="ac-destroy">🗑 刪除雲端帳號</button></div>`;
  } else if (Account.locked) {
    box.innerHTML = `
      <p class="small">🔒 <b>${esc(Account.email || "")}</b> 已登入這台裝置，但還沒解鎖</p>
      <p class="muted small">紀錄是用你的密碼加密的，金鑰不會存在裝置上；輸入一次密碼就能繼續同步。</p>
      <div class="btn-row">
        <button class="btn" id="ac-unlock">🔓 輸入密碼解鎖</button>
        <button class="btn ghost" id="ac-logout">改用其他帳號</button>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="btn-col">
        <button class="btn" id="ac-signup">✨ 建立星塵帳號</button>
        <button class="btn secondary" id="ac-login">🔑 我已經有帳號，登入</button>
      </div>
      <p class="muted small" style="margin-top:8px">同步的是夢境、日記、思考紀錄、心情、水晶收藏與神奇海螺；
      夢境照片因為體積太大，仍只留在這台裝置上。</p>`;
  }

  box.querySelector("#ac-signup")?.addEventListener("click", () => openAccountForm("signup"));
  box.querySelector("#ac-login")?.addEventListener("click", () => openAccountForm("login"));
  box.querySelector("#ac-unlock")?.addEventListener("click", () => openAccountForm("unlock"));
  box.querySelector("#ac-logout")?.addEventListener("click", () => {
    if (!confirm("登出星塵帳號？本機紀錄不會被刪除，雲端那份也還在。")) return;
    accountLogout();
  });
  box.querySelector("#ac-sync")?.addEventListener("click", async () => {
    try { await accountSyncPush(); toast("已同步到雲端 ☁"); }
    catch (e) { toast(errZh(e)); }
  });
  box.querySelector("#ac-restore")?.addEventListener("click", async () => {
    try {
      const { merged, failed } = await accountSyncPull();
      if (failed) return;
      toast(merged ? `☁ 從帳號補回 ${merged} 筆紀錄` : "雲端沒有本機還缺的紀錄");
      if (typeof VIEWS !== "undefined" && currentTab && VIEWS[currentTab]) VIEWS[currentTab]();
    } catch (e) { toast(errZh(e)); }
  });
  box.querySelector("#ac-passwd")?.addEventListener("click", openChangePasswordForm);
  box.querySelector("#ac-destroy")?.addEventListener("click", openDestroyAccountForm);
}

const PWD_MIN = 8;
function openAccountForm(mode) {
  const isSignup = mode === "signup";
  const isUnlock = mode === "unlock";
  const title = isSignup ? "✨ 建立星塵帳號" : isUnlock ? "🔓 解鎖星塵帳號" : "🔑 登入星塵帳號";
  const knownEmail = Account.email || lsGet(AcctCfg.emailKey) || "";
  const m = modal(`
    <h3>${title}</h3>
    <p class="muted small">${isSignup
      ? "email 和密碼是你之後換手機時唯一的鑰匙。紀錄會在離開這台裝置<b>之前</b>就先加密，後端看不到內容。"
      : isUnlock
        ? "為了不把金鑰留在裝置上，每次重新打開 App 都需要輸入一次密碼。"
        : "用註冊時的 email 和密碼登入，雲端的紀錄會合併回這台裝置。"}</p>
    ${isUnlock ? "" : `<label class="field">Email</label>
    <input type="email" id="ac-email" autocomplete="username" placeholder="you@example.com" value="${esc(knownEmail)}">`}
    <label class="field">密碼${isSignup ? `（至少 ${PWD_MIN} 個字）` : ""}</label>
    <input type="password" id="ac-pwd" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="••••••••">
    ${isSignup ? `
      <label class="field">再輸入一次密碼</label>
      <input type="password" id="ac-pwd2" autocomplete="new-password" placeholder="••••••••">
      <label class="field">暱稱（選填）</label>
      <input type="text" id="ac-nick" maxlength="20" placeholder="你希望宇宙怎麼稱呼你？" value="${esc(store.data.settings.nickname || "")}">
      <div class="warn-box">⚠️ 資料是用你的密碼加密的，<b>忘記密碼＝雲端那份永遠解不開</b>（本機紀錄和匯出檔還在）。
      請把密碼記在安全的地方，並定期用「匯出 JSON」留一份自己的備份。</div>
      <label class="field"><input type="checkbox" id="ac-optin" checked> 我想搶先體驗新功能，並接收神奇海螺專屬優惠碼</label>` : ""}
    <div class="btn-row">
      <button class="btn" id="ac-go">${isSignup ? "建立帳號" : isUnlock ? "解鎖" : "登入"}</button>
      <button class="btn secondary" id="ac-cancel">取消</button>
    </div>`);

  const cancel = () => m.remove();
  m.querySelector("#ac-cancel").addEventListener("click", cancel);
  const go = m.querySelector("#ac-go");
  go.addEventListener("click", async () => {
    const email = (m.querySelector("#ac-email")?.value || knownEmail).trim();
    const pwd = m.querySelector("#ac-pwd").value;
    if (!isUnlock && !/^\S+@\S+\.\S+$/.test(email)) return toast("email 格式看起來不對耶");
    if (!pwd) return toast("請輸入密碼");
    if (isSignup) {
      if (pwd.length < PWD_MIN) return toast(`密碼至少要 ${PWD_MIN} 個字`);
      if (pwd !== m.querySelector("#ac-pwd2").value) return toast("兩次輸入的密碼不一樣");
    }
    go.disabled = true;
    const label = go.textContent;
    go.textContent = "加密中⋯";                 // PBKDF2 20 萬次在手機上要一兩秒，先給個回饋
    try {
      if (isSignup) {
        const nickname = m.querySelector("#ac-nick").value.trim();
        await accountSignup(email, pwd, nickname);
        if (nickname) { store.data.settings.nickname = nickname; store.save(); }
        if (m.querySelector("#ac-optin").checked && typeof registerMarketingEmail === "function") {
          registerMarketingEmail(email, "stardust", nickname);
        }
        toast("星塵帳號建立完成 ✨ 紀錄已加密上雲");
      } else {
        const { merged } = isUnlock ? await accountUnlock(pwd) : await accountLogin(email, pwd);
        toast(merged ? `登入成功，從雲端補回 ${merged} 筆紀錄 ☁` : "登入成功 ✨");
      }
      m.remove();
      refreshAccountUI();
      if (typeof VIEWS !== "undefined" && currentTab && VIEWS[currentTab]) VIEWS[currentTab]();
    } catch (e) {
      toast(errZh(e));
      go.disabled = false; go.textContent = label;
    }
  });
}

function openChangePasswordForm() {
  const m = modal(`
    <h3>🔑 更換星塵帳號密碼</h3>
    <p class="muted small">金鑰是從密碼算出來的，所以換密碼時整包紀錄會用新金鑰重新加密後上傳，中途請不要關掉。</p>
    <label class="field">目前的密碼</label>
    <input type="password" id="cp-old" autocomplete="current-password" placeholder="••••••••">
    <label class="field">新密碼（至少 ${PWD_MIN} 個字）</label>
    <input type="password" id="cp-new" autocomplete="new-password" placeholder="••••••••">
    <label class="field">再輸入一次新密碼</label>
    <input type="password" id="cp-new2" autocomplete="new-password" placeholder="••••••••">
    <div class="warn-box">⚠️ 換完密碼後，其他裝置要用<b>新密碼</b>重新登入。</div>
    <div class="btn-row">
      <button class="btn" id="cp-go">更換密碼</button>
      <button class="btn secondary" id="cp-cancel">取消</button>
    </div>`);
  m.querySelector("#cp-cancel").addEventListener("click", () => m.remove());
  const go = m.querySelector("#cp-go");
  go.addEventListener("click", async () => {
    const oldPwd = m.querySelector("#cp-old").value;
    const newPwd = m.querySelector("#cp-new").value;
    if (newPwd.length < PWD_MIN) return toast(`新密碼至少要 ${PWD_MIN} 個字`);
    if (newPwd !== m.querySelector("#cp-new2").value) return toast("兩次輸入的新密碼不一樣");
    go.disabled = true; go.textContent = "重新加密中⋯";
    try {
      const oldD = await deriveKey(Account.email, oldPwd);
      const newD = await deriveKey(Account.email, newPwd);
      const blob = await encryptBlob(newD.key, store.data);
      const r = await acctApi({
        action: "passwd", token: Account.token,
        verifier: oldD.verifier, newVerifier: newD.verifier, blob,
      });
      Account.token = r.token; Account.key = newD.key;
      lsSet(AcctCfg.tokenKey, r.token);
      Account.lastSync = new Date();
      m.remove(); refreshAccountUI();
      toast("密碼已更換 🔑 其他裝置請用新密碼登入");
    } catch (e) {
      toast(errZh(e));
      go.disabled = false; go.textContent = "更換密碼";
    }
  });
}

function openDestroyAccountForm() {
  const m = modal(`
    <h3>🗑 刪除雲端帳號</h3>
    <p class="muted small">會把後端的帳號與那份加密紀錄整個刪掉，<b>無法復原</b>。
    這台手機上的紀錄不會被動到，但之後就沒有雲端備份了——建議先按「匯出 JSON」留一份。</p>
    <label class="field">輸入密碼確認</label>
    <input type="password" id="dz-pwd" autocomplete="current-password" placeholder="••••••••">
    <div class="btn-row">
      <button class="btn danger" id="dz-go">確定刪除</button>
      <button class="btn secondary" id="dz-cancel">取消</button>
    </div>`);
  m.querySelector("#dz-cancel").addEventListener("click", () => m.remove());
  m.querySelector("#dz-go").addEventListener("click", async () => {
    const pwd = m.querySelector("#dz-pwd").value;
    if (!pwd) return toast("請輸入密碼");
    if (!confirm("真的要刪除雲端帳號嗎？此操作無法撤銷。")) return;
    try {
      const { verifier } = await deriveKey(Account.email, pwd);
      await acctApi({ action: "destroy", token: Account.token, verifier });
      m.remove();
      await accountLogout({ silent: true });
      toast("雲端帳號已刪除，本機紀錄仍保留");
    } catch (e) { toast(errZh(e)); }
  });
}

/* ---------- 啟動：有 token 就標記成「已登入但待解鎖」 ---------- */
async function initAccount() {
  const token = lsGet(AcctCfg.tokenKey);
  const email = lsGet(AcctCfg.emailKey);
  if (token && email) {
    Account.token = token; Account.email = email;
    Account.nickname = lsGet(AcctCfg.nickKey) || "";
    Account.locked = true;   // 金鑰不落地，必須靠密碼重新推導
  }
  await accountCheckEnabled();
  refreshAccountUI();
}

if (typeof window !== "undefined") {
  window.Account = Account;
  window.initAccount = initAccount;
  window.refreshAccountUI = refreshAccountUI;
  window.accountSignedIn = accountSignedIn;
  window.accountSyncPushSoon = accountSyncPushSoon;
  window.accountSyncPush = accountSyncPush;
  window.accountSyncPull = accountSyncPull;
  window.accountLogout = accountLogout;
}
