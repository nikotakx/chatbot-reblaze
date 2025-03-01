CREATE TABLE IF NOT EXISTS "documentation_files" (
    "id" SERIAL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "has_images" BOOLEAN DEFAULT false,
    "github_url" TEXT
);

CREATE TABLE IF NOT EXISTS "documentation_images" (
    "id" SERIAL PRIMARY KEY,
    "file_id" INTEGER REFERENCES "documentation_files"("id"),
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "documentation_chunks" (
    "id" SERIAL PRIMARY KEY,
    "file_id" INTEGER REFERENCES "documentation_files"("id"),
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" TEXT,
    "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "repository_config" (
    "id" SERIAL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "last_synced" TIMESTAMP WITH TIME ZONE,
    "is_active" BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" SERIAL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);