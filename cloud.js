/* 星塵夢汐 · 雲端備份（Google Drive / iCloud 檔案 App）
   ─────────────────────────────────────────
   模式沿用 Blue Astral Nexus Engine 的 cloud.js：
   - Google Identity Services（GIS）取 OAuth access token
   - Token 只留在記憶體，永不寫入 localStorage / cookie
   - drive.appdata 存主資料檔（隱藏，只有本 App 看得到；App 移除即消失）
   - drive.file 額外備份到主 Drive 的可見資料夾「Stardust Backups」
   - iCloud / Apple 檔案 App 走 Web Share API — 把匯出檔交給系統
     分享單，user 選「儲存到檔案」→ iCloud Drive 或本機 → 完整免後端

   前提：window.STARDUST_GOOGLE_CLIENT_ID 由 index.html 提供（公開值可入前端）。
   為空 → 雲端按鈕自動隱藏，僅保留本機匯出／匯入。
*/
"use strict";

const CloudCfg = {
  clientId: (typeof window !== "undefined" && window.STARDUST_GOOGLE_CLIENT_ID) || "",
  scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
  mainFile: "stardust-data.json",
  backupFolder: "Stardust Backups",
  hintKey: "stardust_signin_hint",
  emailKey: "stardust_signin_email",
};

const Cloud = {
  token: null,          // 記憶體 only
  email: null,          // 顯示登入身份（帳號名，不是機密）
  tokenClient: null,
  fileId: null,         // appDataFolder 內主檔 id
  backupFolderId: null, // 主 Drive 內備份 folder id
  signedIn: false,
};

/* ---------- GIS 初始化 ---------- */
function initCloud() {
  if (Cloud.tokenClient) return;
  if (!CloudCfg.clientId) return;
  if (typeof google === "undefined" || !google.accounts?.oauth2) return;
  Cloud.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CloudCfg.clientId,
    scope: CloudCfg.scope,
    callback: onCloudToken,
    error_callback: () => { /* silent fail → 保持未登入 UX，不彈錯 */ },
  });
  refreshCloudUI();
  trySilentReauth();
}

function trySilentReauth() {
  if (Cloud.signedIn || !Cloud.tokenClient) return;
  let hint = null;
  try { hint = localStorage.getItem(CloudCfg.hintKey); } catch {}
  if (hint !== "1") return;
  let email = null;
  try { email = localStorage.getItem(CloudCfg.emailKey); } catch {}
  try { Cloud.tokenClient.requestAccessToken(email ? { prompt: "", hint: email } : { prompt: "" }); }
  catch {}
}

function cloudSignIn() {
  if (!CloudCfg.clientId) { toast("尚未設定 Google 用戶端 ID"); return; }
  if (!Cloud.tokenClient) initCloud();
  if (Cloud.tokenClient) Cloud.tokenClient.requestAccessToken();
  else toast("Google 登入未就緒，請稍候再試");
}

async function onCloudToken(resp) {
  if (!resp?.access_token) return;
  Cloud.token = resp.access_token;
  Cloud.signedIn = true;
  try { localStorage.setItem(CloudCfg.hintKey, "1"); } catch {}
  // 取 email 純為顯示與 silent re-auth hint（scope 已含 userinfo.email）
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${Cloud.token}` } });
    if (ui.ok) {
      const info = await ui.json();
      if (info?.email) { Cloud.email = info.email; try { localStorage.setItem(CloudCfg.emailKey, info.email); } catch {} }
    }
  } catch {}
  toast(`☁ 已登入 Google Drive${Cloud.email ? "（" + Cloud.email + "）" : ""}`);
  refreshCloudUI();
  // 首次登入 → 拉雲端合併回本機（有其他手機上的紀錄就會補進來）
  try {
    const res = await cloudSyncPullMerge();
    if (res?.merged) toast(`☁ 從雲端補回 ${res.merged} 筆紀錄`);
    if (typeof VIEWS !== "undefined" && currentTab && VIEWS[currentTab]) VIEWS[currentTab]();
  } catch (e) { console.warn("cloud pull merge failed:", e); }
}

function cloudSignOut() {
  if (Cloud.token && typeof google !== "undefined" && google.accounts?.oauth2?.revoke) {
    try { google.accounts.oauth2.revoke(Cloud.token, () => {}); } catch {}
  }
  Cloud.token = null; Cloud.signedIn = false; Cloud.fileId = null;
  Cloud.backupFolderId = null; Cloud.email = null;
  try { localStorage.removeItem(CloudCfg.hintKey); } catch {}
  try { localStorage.removeItem(CloudCfg.emailKey); } catch {}
  refreshCloudUI();
  toast("已登出 Google Drive");
}

/* ---------- Drive REST 呼叫（token 過期時降級） ---------- */
async function driveFetch(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${Cloud.token}`, ...(opts.headers || {}) },
  });
  if (r.status === 401) {
    Cloud.token = null; Cloud.signedIn = false; refreshCloudUI();
    throw new Error("Google 授權已到期，請重新登入");
  }
  if (!r.ok) throw new Error("Drive HTTP " + r.status);
  return r;
}

/* ---------- appDataFolder 主檔（雲端同步） ---------- */
async function findAppDataFile() {
  const q = encodeURIComponent(`name='${CloudCfg.mainFile}'`);
  const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`);
  const j = await r.json();
  return j.files?.[0] || null;
}
async function loadCloudData() {
  const f = await findAppDataFile();
  if (!f) return null;
  Cloud.fileId = f.id;
  const r = await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`);
  return await r.json();
}
async function uploadAppData(data) {
  const body = JSON.stringify(data);
  if (Cloud.fileId) {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${Cloud.fileId}?uploadType=media`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    return;
  }
  const boundary = "stardust" + Date.now();
  const meta = { name: CloudCfg.mainFile, parents: ["appDataFolder"] };
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart });
  Cloud.fileId = (await r.json()).id;
}

/* 雲端同步：本機為主資料庫，寫入時同步上雲；登入時先拉雲端合併 */
async function cloudSyncPush() {
  if (!Cloud.signedIn) return;
  const payload = { version: 1, updatedAt: new Date().toISOString(), data: store.data };
  await uploadAppData(payload);
}
async function cloudSyncPullMerge() {
  if (!Cloud.signedIn) return { merged: 0 };
  const cloud = await loadCloudData();
  if (!cloud?.data) { await cloudSyncPush(); return { merged: 0, note: "首次上雲" }; }
  let added = 0;
  for (const k of ["dreams", "diary", "cbt", "focus", "capsules", "customEvents", "sleep", "crystals"]) {
    const local = new Map((store.data[k] || []).map(x => [x.id || JSON.stringify(x), x]));
    for (const item of cloud.data[k] || []) {
      const key = item.id || JSON.stringify(item);
      if (!local.has(key)) { local.set(key, item); added++; }
    }
    store.data[k] = [...local.values()];
  }
  if (cloud.data.settings?.symbols) {
    store.data.settings.symbols = [...new Set([...(store.data.settings.symbols || []), ...cloud.data.settings.symbols])];
  }
  store.save();
  await cloudSyncPush();
  return { merged: added };
}

/* ---------- Drive 可見資料夾（供 user 手動下載／整份還原） ---------- */
async function ensureBackupFolder() {
  if (Cloud.backupFolderId) return Cloud.backupFolderId;
  const q = encodeURIComponent(`name='${CloudCfg.backupFolder}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const j = await r.json();
  if (j.files?.[0]?.id) { Cloud.backupFolderId = j.files[0].id; return Cloud.backupFolderId; }
  const r2 = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: CloudCfg.backupFolder, mimeType: "application/vnd.google-apps.folder" }),
  });
  Cloud.backupFolderId = (await r2.json()).id;
  return Cloud.backupFolderId;
}
function backupFilename() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `stardust-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}
async function cloudBackupNow() {
  if (!Cloud.signedIn) { toast("請先登入 Google"); return; }
  try {
    const folderId = await ensureBackupFolder();
    const name = backupFilename();
    const body = JSON.stringify(store.data, null, 2);
    const boundary = "sdbk" + Date.now();
    const meta = { name, parents: [folderId], mimeType: "application/json" };
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart });
    toast(`☁ 已備份到 Drive／${CloudCfg.backupFolder}`);
  } catch (e) {
    console.error(e); toast("備份失敗，請稍後再試");
  }
}
async function cloudListBackups() {
  const folderId = await ensureBackupFolder();
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&pageSize=50`);
  return (await r.json()).files || [];
}
async function cloudRestoreOpen() {
  if (!Cloud.signedIn) { toast("請先登入 Google"); return; }
  let files;
  try { files = await cloudListBackups(); }
  catch (e) { console.error(e); toast("讀取備份清單失敗"); return; }
  if (!files.length) { toast("Drive 上還沒有備份"); return; }
  const rows = files.map(f => `<button type="button" class="entry restore-pick" data-id="${esc(f.id)}" style="width:100%;text-align:left">
    <span class="meta">${esc(new Date(f.createdTime).toLocaleString())}・${Math.round((f.size || 0) / 1024)} KB</span>
    <span class="small" style="display:block">${esc(f.name)}</span>
  </button>`).join("");
  const m = modal(`
    <h3>☁ 從 Drive 還原</h3>
    <p class="muted small">選一份備份，將取代目前這支手機上的所有紀錄（不會影響 Drive 上其他備份）。</p>
    ${rows}
    <div class="btn-row"><button class="btn secondary" id="rs-cancel">取消</button></div>`);
  $("#rs-cancel", m).addEventListener("click", () => m.remove());
  $$(".restore-pick", m).forEach(b => b.addEventListener("click", async () => {
    const id = b.dataset.id;
    if (!confirm("確定用此備份取代目前資料？此操作無法撤銷。")) return;
    try {
      const r = await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
      const j = await r.json();
      if (!j || typeof j !== "object") throw new Error();
      store.data = { ...store.data, ...j };
      for (const k of ["dreams", "diary", "cbt", "focus", "capsules", "customEvents", "sleep", "crystals"]) store.data[k] ||= [];
      store.save();
      m.remove();
      if (typeof renderMore === "function") renderMore();
      toast("還原完成 🖤");
    } catch (e) { console.error(e); toast("還原失敗，檔案可能已損毀"); }
  }));
}

/* ---------- iCloud／檔案 App：Web Share API ----------
   iOS/iPadOS：分享單顯示「儲存到檔案」→ 使用者可選 iCloud Drive 或本機
   macOS Safari 17+：同上
   Android：分享單有 Google Drive、Files、Keep…
   桌機瀏覽器：多數會退回下載——沒關係，那也是備份 */
async function shareBackup() {
  const filename = backupFilename();
  const body = JSON.stringify(store.data, null, 2);
  const file = new File([body], filename, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "星塵夢汐備份", text: "存到 iCloud Drive／檔案 App／其他雲端" });
      return;
    } catch (e) {
      if (e?.name === "AbortError") return; // 使用者取消
      console.warn("share failed, falling back to download", e);
    }
  }
  // 降級：直接下載，讓使用者手動放到 iCloud Drive
  download(filename, body);
  toast("已下載—可自行放進 iCloud Drive／檔案 App");
}

/* ---------- 更新雲端卡片 UI（在 renderMore 內呼叫） ---------- */
function refreshCloudUI() {
  const box = document.getElementById("cloud-box");
  if (!box) return;
  const hasClient = !!CloudCfg.clientId;
  box.innerHTML = `
    ${hasClient ? (Cloud.signedIn
      ? `<p class="muted small">☁ 已登入 <b>${esc(Cloud.email || "Google")}</b>——所有變更會即時同步到 Drive</p>
         <div class="btn-row">
           <button class="btn secondary" id="cl-backup">📤 立即備份到 Drive</button>
           <button class="btn secondary" id="cl-restore">📥 從 Drive 還原</button>
         </div>
         <div class="btn-row"><button class="btn ghost" id="cl-signout">登出 Google</button></div>`
      : `<p class="muted small">連結 Google Drive：每支手機自動同步，備份存在你的雲端硬碟（App 移除也在）。</p>
         <div class="btn-row"><button class="btn" id="cl-signin">🔐 用 Google 登入</button></div>`)
      : `<p class="muted small">Google Drive 同步尚未啟用（請在 Vercel 設定 <code>STARDUST_GOOGLE_CLIENT_ID</code>）。</p>`}
    <div class="btn-row">
      <button class="btn secondary" id="cl-share">🍎 存到 iCloud／檔案 App</button>
    </div>
    <p class="muted small" style="margin-top:6px">iCloud 沒有公開 API，透過「分享 → 儲存到檔案」把備份放進 iCloud Drive 是 Apple 官方管道；一樣安全，只是每次要手動一下。</p>`;
  $("#cl-signin", box)?.addEventListener("click", cloudSignIn);
  $("#cl-signout", box)?.addEventListener("click", cloudSignOut);
  $("#cl-backup", box)?.addEventListener("click", cloudBackupNow);
  $("#cl-restore", box)?.addEventListener("click", cloudRestoreOpen);
  $("#cl-share", box)?.addEventListener("click", shareBackup);
}

/* ---------- 啟動 GIS（在 index.html 內 <script async src="…gsi/client">
   載入完成後由全域 onGoogleLibraryLoad 呼叫）---------- */
if (typeof window !== "undefined") {
  window.onGoogleLibraryLoad = initCloud;
  window.Cloud = Cloud;
  window.cloudSignIn = cloudSignIn;
  window.cloudSignOut = cloudSignOut;
  window.cloudBackupNow = cloudBackupNow;
  window.cloudRestoreOpen = cloudRestoreOpen;
  window.shareBackup = shareBackup;
  window.refreshCloudUI = refreshCloudUI;
  window.cloudSyncPush = cloudSyncPush;
  window.cloudSyncPullMerge = cloudSyncPullMerge;
}
