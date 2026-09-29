# Development & Feature Guide

Working notes for building on the semantic-bookmarks product. Read alongside
`CLAUDE.md` (which has the cross-surface rule and command list). This file is the
"where does X live / how do I add Y" reference.

## Surfaces (one backend, three clients)

| Surface | Path | Stack |
| --- | --- | --- |
| Backend (shared) | `backend/` | FastAPI, SQLAlchemy, Alembic, Postgres/pgvector, OpenAI/LangChain |
| Webapp | `frontend/` | Next.js (app router), React, Tailwind v4, shadcn/Radix |
| Mobile | `mobile/` | Expo / React Native |
| Chrome extension | `chrome-extension/` | Vanilla JS (manifest v3) — changes rarely |

**Rule:** a user-facing change usually touches BOTH `frontend/` and `mobile/`
(shared backend). Keep them in sync.

## Local dev

- Backend: `cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6005`
- Webapp: `cd frontend && npm run dev` (port 3000)
- Mobile: `cd mobile && npm start` (Expo); Android release builds need **JDK 17**.
- CORS is configured for `localhost:3000` / `localhost:3002` (`backend/.env`).

### Google OAuth (local) gotchas
Web login uses NextAuth (`frontend/lib/auth.ts`) → Google → posts to backend
`POST /api/v1/auth/login` (`backend/app/api/auth.py`), which enforces
`WHITELISTED_EMAILS`. Common local failures:
- **`redirect_uri_mismatch`** — add `http://localhost:3000/api/auth/callback/google`
  to the Google Cloud OAuth client.
- **`state mismatch` / OAUTH_CALLBACK_ERROR** — stale/duplicate `next-auth.state`
  cookie or origin mismatch. Fix: browse at `localhost:3000` (not `127.0.0.1`),
  use one tab, clear cookies / use incognito.
- **403 after Google succeeds** — email not in `WHITELISTED_EMAILS`.

## Feature map & how-tos

### Explore topics & sources
- **Source of truth:** `backend/app/core/topic_sources.py` — `TOPIC_SOURCES` maps
  each topic to `rss` feed URLs + `hn_keywords` (Hacker News Algolia search).
- `AVAILABLE_TOPICS` (`backend/app/schemas/user_preference.py`) is **derived** from
  `TOPIC_SOURCES.keys()` — add a topic in ONE place (`topic_sources.py`).
- Clients fetch the list via `GET /preferences/topics`, so frontend/mobile pick up
  new topics automatically (no client change needed).
- **Add a topic:** add a key to `TOPIC_SOURCES` with `rss` + `hn_keywords`. HN
  keywords guarantee content even if an RSS feed is dead.
- Selector UI: `frontend/components/explore/TopicSelector.tsx` +
  `mobile/src/components/TopicSelector.tsx` (flat pill cloud, scales to ~20-30).

### Feed refresh cadence
- **Scheduled:** APScheduler runs `refresh_all_user_feeds()` every
  `FEED_REFRESH_INTERVAL_HOURS` (default **24h**) — `backend/app/core/scheduler.py`,
  started in `backend/app/main.py`.
- **Manual:** `POST /feed/refresh` (background job, client polls status).
- `GET /feed` only returns stored items; page visits do NOT refresh.
- `refresh_user_feed()` has **no staleness guard** — every call re-fetches all feeds.
- Items older than `FEED_ARTICLE_MAX_AGE_DAYS` (7) are purged unless saved.

### Theming (dark / AMOLED)
- **Default theme is Light** (the original look). System/Dark/AMOLED are opt-in and
  persisted. Toggle lives on the Profile screen of each client.
- **Web:** CSS variables in `frontend/app/globals.css` — `:root` (light), `.dark`,
  `.amoled` (true black). `next-themes` mounted in `frontend/app/layout.tsx`
  (`themes: ['light','dark','amoled']`, `defaultTheme: 'light'`). Switcher:
  `frontend/components/theme-switcher.tsx`. The `dark` custom-variant matches both
  `.dark` and `.amoled`.
- **Mobile:** colors in `mobile/src/theme/colors.ts` (`lightColors`, `darkColors`,
  `amoledColors`); `mobile/src/theme/ThemeContext.tsx` resolves + persists the mode
  (AsyncStorage via `mobile/src/lib/storage.ts`). Uses `useColorScheme` for System.
- **Add a theme variant:** add a colors object (mobile) / a `.classname` var block
  (web), then add it to the switcher options and, on web, the `themes` array.
- Caveat: mobile `app.json` has `"userInterfaceStyle": "light"`, so `useColorScheme`
  always returns light → "System" never resolves to dark on device. Set
  `"automatic"` if System-follows-device is wanted.

### Design system / shared UI primitives
Reuse these instead of native defaults or one-off markup (enforced by the
`ship-feature` skill):
- **Mobile:** `BottomModal` (all dialogs/sheets — never `Alert.alert` for user-facing
  prompts), `TopicSelector`, and the title + description + outline-`Later`/primary-
  action button layout used by ProfileScreen's modals. Colors via `useTheme()`.
- **Web:** shadcn/Radix components in `frontend/components/ui` (`Dialog`,
  `AlertDialog`, `Button`, `Switch`, `Sonner`/`toast`, …) — never `window.alert`/
  `confirm`. Colors via Tailwind token classes.
- Add a new shared widget once as a themed component; don't inline one-off styles.
- Only exception: system-owned surfaces you can't restyle (e.g. Google Play's
  in-app-update consent sheet).

## Releasing & CI

CI lives in `.github/workflows/`.

### Web — automatic (`deploy-web.yml`)
On push to `master` (paths: `frontend/**`, `backend/**`, `docker-compose.web.yml`):
1. Builds `backend` + `frontend` images, pushes to GHCR with a **single tag = the
   commit SHA** (`ghcr.io/ishankoradia/bookmarks-{backend,frontend}:<sha>`). No
   `latest`.
2. SSHes into the **EC2** host, `git pull`, writes `IMAGE_TAG=<sha>` to a root `.env`
   (Compose auto-reads it), then `docker compose -f docker-compose.web.yml pull && up
   -d`. `docker-compose.web.yml` requires `IMAGE_TAG` (no default) — the `.env` holds
   the currently-deployed SHA, so bare `docker compose` restarts keep working.

`docker-compose.web.yml` uses `image:` (not `build:`) — images come from GHCR.
Local rebuilds: `docker compose -f docker-compose.web.yml build` no longer applies;
build via the compose `image` refs or run the CI.

**Manual web release** (when you don't want to wait for / rely on push-to-master):
- Trigger the same Action on demand: `gh workflow run deploy-web.yml` (or the Actions
  tab — it has `workflow_dispatch`). Builds & deploys the current commit.
- GitHub-independent, from a laptop/server: `./deploy-web.sh [TAG]` — builds + pushes
  both images to GHCR and pulls/restarts on EC2. `SKIP_BUILD=1 ./deploy-web.sh`
  deploys images already in GHCR. Needs `EC2_HOST`/`EC2_USER`/`GHCR_PAT` env
  (optional `EC2_PATH`).

**Architecture:** the EC2 server is **arm64** (aarch64). Both the CI and
`deploy-web.sh` build `linux/arm64` images. CI runs natively on `ubuntu-24.04-arm`
(free arm runners for public repos); the script builds arm64 natively from Apple
Silicon. No QEMU emulation.

**Registry auth:** images live in GHCR (GitHub Container Registry) — no Docker Hub
account. Make the two packages **public** (GitHub → repo → Packages → each package →
Package settings → change visibility) so the server pulls with no login. Then:
- CI push uses the built-in `GITHUB_TOKEN` (no secret needed).
- Server pull needs no auth (packages public).
- `GHCR_PAT` is only needed locally, for `deploy-web.sh` to *push* from your laptop
  (a GitHub PAT with `write:packages`; `docker login ghcr.io -u <gh-user>`).

**Env handling (build vs runtime):** images are built **secret-free**.
- Build time: the frontend only needs the public `NEXT_PUBLIC_API_URL` — passed as a
  Docker `ARG` (default = prod URL) in `frontend/Dockerfile`, not from `.env.prod`.
  The backend needs no build-time env.
- Runtime: all real secrets (NextAuth, Google, DB, OpenAI, JWT) come from
  `backend/.env.prod` and `frontend/.env.prod` on the EC2 box via compose `env_file`.
  These files stay on the server (gitignored) — never in git, never baked into an
  image. So do NOT store `.env.prod` as a GitHub secret / COPY it into the image:
  images are public, and that would leak the secrets.

**Required GitHub secrets:**
- `EC2_HOST`, `EC2_USER` (e.g. `ubuntu`/`ec2-user`), `EC2_SSH_KEY` (the `.pem`
  private key contents). Optional: `EC2_PORT` (default 22), `EC2_PATH` (repo path on
  the host — defaults to `/home/ubuntu/bookmarks-semantic-search`).
- No `GHCR_PAT` needed in CI — push uses `GITHUB_TOKEN`, and the server pulls the
  public packages without auth. (`GHCR_PAT` is only a local env var for
  `deploy-web.sh`.)

### Mobile — manual (`mobile-release.yml`)
Trigger via GitHub Actions → "Mobile Release (draft)" → pick `bump`
(patch/minor/major) and `platform`:
1. Bumps `expo.version` in `mobile/app.json`, commits back to `master`.
2. `eas build --profile production --auto-submit` → builds on EAS and submits to the
   store as a **draft** (`releaseStatus: draft` in `mobile/eas.json`).
   Android `versionCode` auto-increments remotely (`appVersionSource: remote`).

**Required GitHub secrets:** `EXPO_TOKEN` (Expo access token) and
`GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON of a Google Play service account with release
permission — the workflow writes it to `mobile/google-service-account.json`, which
`eas.json` references as `serviceAccountKeyPath` for the auto-submit).

**Release notes:** EAS does not set store release notes. The build lands as a draft;
add "What's new" in the Play Console / App Store Connect before rolling out.

**In-app update prompt (Android):** `mobile/src/components/InAppUpdateGate.tsx`
(mounted in `App.tsx`) uses Google Play In-App Updates
(`sp-react-native-in-app-updates`) to prompt users on launch when a newer *published*
version is live — FLEXIBLE = soft, dismissible. Play owns the initial consent sheet;
the post-download "Update ready" prompt is a themed `BottomModal` (design-system
consistent). No backend involved; Google Play is the source of truth. Only works on
a Play-installed build (internal/closed/prod track) — no-op in Expo Go / dev clients
/ sideloaded APKs. iOS is skipped.
