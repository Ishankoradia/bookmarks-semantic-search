# Docker Setup for Bookmark Semantic Search

## Prerequisites
- Docker and Docker Compose installed
- External PostgreSQL database with pgvector extension
- OpenAI API key

## Setup Instructions

### 1. Environment Configuration

Make sure you have the following `.env` files configured:

**backend/.env:**
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://postgres:password@host.docker.internal/bookmark_semantic_search
SECRET_KEY=your_secret_key_here
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3002
```

**frontend/.env:**
```env
NEXT_PUBLIC_API_URL=http://localhost:6005/api/v1
```

**Note:** For Docker on Mac/Windows, use `host.docker.internal` to connect to your local PostgreSQL database.
For Linux, you might need to use the actual host IP or `172.17.0.1`.

### 2. Build and Run

```bash
# Build and start both services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Run Database Migrations

Before first use, run the database migrations:

```bash
# Execute migrations inside the backend container
docker-compose exec backend uv run alembic upgrade head
```

### 4. Access the Application

- Frontend: http://localhost:3002
- Backend API: http://localhost:6005
- API Documentation: http://localhost:6005/docs

## Useful Commands

```bash
# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes (dev mode has hot reload)
docker-compose up --build

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Clean up everything (including volumes)
docker-compose down -v
```

## Development Mode Features

Both services run in development mode with:
- **Backend**: Hot reload on code changes (uvicorn --reload)
- **Frontend**: Next.js dev server with fast refresh
- **Volume mounting**: Your local code is mounted into containers

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running on your host machine
- Check that pgvector extension is installed
- Verify DATABASE_URL in backend/.env uses correct host address

### CORS Issues
- Make sure CORS_ORIGINS in backend/.env includes `http://localhost:3002`
- Frontend API URL should be `http://localhost:6005/api/v1`

### Port Conflicts
- Backend runs on port 6005
- Frontend runs on port 3002
- Change ports in docker-compose.yml if needed