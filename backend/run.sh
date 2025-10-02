#!/bin/bash

# Run database migrations
echo "Running database migrations..."
uv run alembic upgrade head

# Start the FastAPI server
echo "Starting FastAPI server..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 6005