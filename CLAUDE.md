# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Semantic Bookmark Manager - an AI-powered bookmark management system that allows users to add URLs, automatically extract/index content, and search bookmarks using natural language queries via vector similarity search.

## Development Commands

### Backend (FastAPI + Python)
```bash
cd backend
./run.sh                              # Start server with migrations (localhost:6005)
uv sync                               # Install dependencies
uv run alembic upgrade head           # Run database migrations
uv run uvicorn app.main:app --reload  # Start dev server with hot reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install      # Install dependencies
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

### Docker
```bash
docker compose up              # Development setup (expects external PostgreSQL)
docker compose -f docker-compose.prod.yml up  # Production with Nginx
```

## Architecture

```
Frontend (Next.js 14 + TypeScript)
    ↓ NextAuth.js (Google OAuth) + JWT
Backend (FastAPI)
    ├── /api/v1/auth/* - User authentication
    ├── /api/v1/bookmarks/* - Bookmark CRUD + semantic search
    └── /api/v1/jobs/* - Background job tracking
    ↓
PostgreSQL + pgvector (1536-dim OpenAI embeddings)
```

### Key Backend Services (`backend/app/services/`)
- **scraper.py** - Async URL fetching, HTML parsing, content extraction
- **embedding.py** - OpenAI embeddings, GPT-based tag/category generation
- **bookmark_service.py** - Core bookmark operations, semantic search
- **job_service.py** - Background job management
- **category_refresh_service.py** - Batch category updates

### Frontend Structure (`frontend/`)
- **app/** - Next.js 14 app router pages
- **components/** - React components (uses Radix UI primitives)
- **lib/** - Utilities including auth API client (`auth-api.ts`)
- **hooks/** - Custom React hooks

### Database Models (`backend/app/models/`)
- **Users** - Google OAuth users with email whitelist support
- **Bookmarks** - URLs with content, embeddings (vector), tags (JSON), category
- **Jobs** - Background task tracking with progress

## Environment Setup

Backend requires: `DATABASE_URL`, `OPENAI_API_KEY`, `SECRET_KEY`, `JWT_SECRET_KEY`
Frontend requires: `NEXT_PUBLIC_API_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`

See `.env.template` files in backend/ and frontend/ for all options.

AI models are configurable via env vars: `EMBEDDING_MODEL`, `TAG_GENERATION_MODEL`, `CATEGORY_GENERATION_MODEL`, `QUERY_PARSING_MODEL`

## API Documentation

- Swagger UI: http://localhost:6005/docs
- ReDoc: http://localhost:6005/redoc
