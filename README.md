\# 📚 Semantic Bookmark Search

An AI-powered bookmark manager that uses semantic search to find relevant bookmarks using natural language queries.

## Video

https://github.com/user-attachments/assets/9ecf1893-a1ba-46b9-b3d3-df2dc2a274ea

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
   
   # AI Model Configuration (optional)
   EMBEDDING_MODEL=text-embedding-3-small
   TAG_GENERATION_MODEL=gpt-4o-mini
   TAG_GENERATION_TEMPERATURE=0.3
   CATEGORY_GENERATION_MODEL=gpt-4o-mini
   CATEGORY_GENERATION_TEMPERATURE=0.1
   QUERY_PARSING_MODEL=gpt-4o-mini
   QUERY_PARSING_TEMPERATURE=0.2
   CONTENT_ANALYSIS_MODEL=gpt-4o-mini
   CONTENT_ANALYSIS_TEMPERATURE=0.5
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

## AI Model Configuration

The application uses different AI models for various tasks. All models are configurable via environment variables:

### Model Types
- **Embedding Model**: Generates vector embeddings for semantic search
  - Default: `text-embedding-3-small`
  - Used for: Content vectorization and search queries

- **Tag Generation Model**: Creates content tags for bookmarks
  - Default: `gpt-4o-mini`
  - Used for: Generating content format and domain tags
  - Temperature: `0.3` (low for consistency)

- **Category Generation Model**: Assigns categories to bookmarks
  - Default: `gpt-4o-mini`
  - Used for: Creating descriptive categories for content grouping
  - Temperature: `0.1` (very low for consistent categorization)

- **Query Parsing Model**: Parses search queries for metadata filters
  - Default: `gpt-4o-mini`
  - Used for: Understanding user intent in search queries
  - Temperature: `0.2` (low for accurate parsing)

- **Content Analysis Model**: For future advanced content analysis
  - Default: `gpt-4o-mini`
  - Temperature: `0.5` (moderate for balanced analysis)

### Customization
You can use different models by updating the environment variables:
```env
TAG_GENERATION_MODEL=gpt-4o
CATEGORY_GENERATION_MODEL=gpt-3.5-turbo
QUERY_PARSING_MODEL=gpt-4o-mini
```

Temperature values control randomness (0.0 = deterministic, 1.0 = highly random).

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
