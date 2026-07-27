# AGENT_STATUS.md — ÆTHNOUS Project Network

**Compiled:** 2026-07-23 · **Last updated:** 2026-07-27 · **Compiled by:** Claude (session `project-status-compilation`) · **For:** any AI agent (Claude, Gemini, ChatGPT, or other) picking up work in this repo or a sibling repo

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
`main` plus the current feature branch `claude/moon-altar-account-system-op2yvx` (altar backgrounds,
meteor tuning, 星塵帳號, install button). The earlier `claude/crystal-knowledge-collection-jcgq14`
is already merged via PR #1.

---

## 5. If you're an agent picking this up cold

1. There's no `CLAUDE.md` here yet — this file and `docs/crystal-vision.md` are the closest things to ground rules and a roadmap until one exists.
2. Check section 4 above for open work (the v1.5 roadmap items) before starting something new.
3. If you materially change this repo's status (ship a v1.5 item, open a big feature branch, or — ideally — write the missing `CLAUDE.md`), update this file's section 4 and its "Compiled" date before you stop.
4. Be extra careful with real user mood/journaling/dream data — treat it with the same never-in-git discipline the rest of the network applies to birth data.
