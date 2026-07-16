/* 前端組態 endpoint：把非機密設定（如 Google OAuth Client ID）從
   Vercel 環境變數送到前端。Google OAuth Client ID 為公開值，
   放在前端 JS 是官方接受的做法（可透過已授權來源限制）。 */

export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    googleClientId: process.env.STARDUST_GOOGLE_CLIENT_ID || "",
  });
}
