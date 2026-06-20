# CLAUDE.md

Guidance for working in this repo (semantic bookmarks search).

## ⚠️ Cross-surface rule (read first)

This product ships across **four** surfaces backed by one shared backend:

| Surface | Path | Stack |
| --- | --- | --- |
| Backend (shared) | `backend/` | FastAPI + SQLAlchemy + Alembic, Postgres/pgvector, OpenAI/LangChain |
| Webapp | `frontend/` | Next.js + React + Radix UI / shadcn |
| Mobile | `mobile/` | Expo / React Native |
| Chrome extension | `chrome-extension/` (prod build in `chrome-extension-prod/`) | Vanilla JS (manifest v3) |

**When a feature changes the user experience, update BOTH `frontend/` (webapp) and `mobile/`.** They share the same backend, so a UX change is rarely complete in just one. Keep their behavior in sync.

- The **backend is shared** — a single API serves webapp, mobile, and the extension. Change it once; verify the consumers still match.
- The **Chrome extension changes rarely** — don't proactively touch it for routine UX work unless the change clearly affects it.

## Project layout

- `backend/app/` — `api/` (routes), `core/`, `models/`, `schemas/`, `services/`, `utils/`. Migrations in `backend/alembic/`. Entry: `backend/main.py`.
- `frontend/app/` — Next.js app router; shared UI in `frontend/components/`, helpers in `frontend/lib/` and `frontend/hooks/`.
- `mobile/src/` — React Native source; entry `mobile/App.tsx`. Built `.aab` artifacts checked into `mobile/`.
- `chrome-extension/` — `manifest.json`, `background.js`, `popup/`, `config.js`.

## Commands

- Backend (managed with `uv`, see `backend/pyproject.toml` / `backend/uv.lock`):
  - Run migrations: `cd backend && uv run alembic upgrade head`
  - Start server: `cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6005`
- Webapp: `cd frontend && npm run dev` / `npm run build` / `npm run lint`.
- Mobile: `cd mobile && npm start` (Expo); `npm run ios` / `npm run android`. Release builds via EAS (`mobile/eas.json`).
- Deploy: `deploy.sh`, `docker-compose.web.yml`, `docker-compose.nginx.yml`.

## Conventions

- Match the style and idioms of the surrounding code in each surface.
- The user prefers to run long build commands themselves — don't kick those off unprompted.
