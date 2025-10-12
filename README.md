\# 📚 Semantic Bookmark Search

An AI-powered bookmark manager that uses semantic search to find relevant bookmarks using natural language queries.

## Video

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/b753352e9d1b4196ba43600803f16809?sid=efef877b-2bd1-42bc-a67e-5223e0219792" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

## Features

- **🔗 URL Ingestion**: Add any URL to automatically extract and index content
- **🧠 Semantic Search**: Find bookmarks using natural language (e.g., "articles about machine learning")
- **📄 Content Extraction**: Automatically extracts title, description, and main content
- **💾 Raw HTML Storage**: Preserves original HTML for future analysis
- **🎯 Similarity Scoring**: Shows relevance scores for search results
- **🗂️ Browse All**: View and manage all your bookmarks
- **🗑️ Easy Management**: Delete unwanted bookmarks with confirmation

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL with pgvector extension
- OpenAI API key

### Backend Setup

1. **Install pgvector** (if not already installed):
   ```bash
   # macOS
   brew install pgvector
   
   # Ubuntu/Debian
   sudo apt install postgresql-16-pgvector
   ```

2. **Setup backend**:
   ```bash
   cd backend
   
   # Copy environment file and edit with your credentials
   cp .env.example .env
   
   # Install dependencies with uv
   uv sync
   
   # Run database migrations
   uv run alembic upgrade head
   
   # Start the backend server
   ./run.sh
   ```
   Backend will be available at http://localhost:6005

3. **Environment Variables** (`.env`):
   ```env
   DATABASE_URL=postgresql://user:password@localhost/bookmark_db
   OPENAI_API_KEY=your-openai-api-key
   SECRET_KEY=your-secret-key
   ENVIRONMENT=development
   CORS_ORIGINS=http://localhost:3000
   ```

### Frontend Setup

1. **Setup frontend**:
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```
   Frontend will be available at http://localhost:3000

## Usage

1. **Add Bookmarks**: Paste any URL and click "Add Bookmark"
2. **Search**: Use natural language to find relevant bookmarks
3. **Browse**: View all your bookmarks in the "All Bookmarks" tab
4. **Manage**: Delete unwanted bookmarks or open them in new tabs

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:6005/docs
- **ReDoc**: http://localhost:6005/redoc

## API Endpoints

- `POST /api/v1/bookmarks/` - Add new bookmark
- `GET /api/v1/bookmarks/` - List all bookmarks
- `GET /api/v1/bookmarks/{id}` - Get specific bookmark
- `PUT /api/v1/bookmarks/{id}` - Update bookmark
- `DELETE /api/v1/bookmarks/{id}` - Delete bookmark
- `POST /api/v1/bookmarks/search` - Semantic search

## Example Searches

- "articles about machine learning"
- "tutorials for React hooks"
- "productivity tips and tools"
- "database optimization techniques"
- "API design best practices"

## Architecture

```
Frontend (Next.js) → Backend API (FastAPI) → PostgreSQL + pgvector
                                    ↓
                           Web Scraper + OpenAI Embeddings
```

The system works by:
1. Extracting content from URLs using web scraping
2. Generating embeddings using OpenAI's text-embedding-3-small model
3. Storing embeddings in PostgreSQL with pgvector for similarity search
4. Using cosine similarity to find relevant bookmarks for search queries

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License