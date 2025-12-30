# Project Overview

This is a semantic bookmark search application that allows users to save and search for bookmarks using natural language queries. The application is composed of a Next.js frontend and a FastAPI backend. It uses a PostgreSQL database with the `pgvector` extension for similarity search and OpenAI's models for generating embeddings and tags.

**Frontend:**
- **Framework:** Next.js
- **Language:** TypeScript
- **UI:** shadcn/ui, Radix UI, Tailwind CSS
- **Authentication:** NextAuth.js

**Backend:**
- **Framework:** FastAPI
- **Language:** Python
- **Database:** PostgreSQL with `pgvector`
- **ORM:** SQLAlchemy
- **AI:** LangChain and OpenAI
- **API Documentation:** The backend provides automatic API documentation with Swagger UI and ReDoc.

**Containerization:**
- The application is containerized using Docker and can be orchestrated with `docker-compose`.

# Building and Running

## Using Docker (Recommended)

1.  **Create Environment Files:**
    *   Copy `.env.template` to `.env` in both the `backend` and `frontend` directories and fill in the required values (e.g., database credentials, OpenAI API key).

2.  **Build and Run:**
    ```bash
    docker-compose up --build
    ```

*   The frontend will be available at `http://localhost:3002`.
*   The backend will be available at `http://localhost:6005`.
*   The API documentation will be available at `http://localhost:6005/docs`.

## Local Development

### Backend

1.  **Install Dependencies:**
    ```bash
    cd backend
    uv sync
    ```

2.  **Run Migrations:**
    ```bash
    uv run alembic upgrade head
    ```

3.  **Run the Server:**
    ```bash
    ./run.sh
    ```

### Frontend

1.  **Install Dependencies:**
    ```bash
    cd frontend
    npm install
    ```

2.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

# Development Conventions

*   **Backend:** The backend follows a standard FastAPI project structure. It uses a service layer to separate business logic from the API endpoints. Database models are defined in `app/models` and Pydantic schemas in `app/schemas`.
*   **Frontend:** The frontend is a Next.js application with a focus on component-based architecture. It uses `shadcn/ui` and Radix UI for building the user interface. API interactions are handled through a dedicated `auth-api` module.
*   **Database Migrations:** Database schema changes are managed with Alembic. To create a new migration, you can run `uv run alembic revision --autogenerate -m "Your migration message"`.
