-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_embedding ON bookmarks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);