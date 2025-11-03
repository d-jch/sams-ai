-- SAMS AI Authentication System Database Schema
-- Based on Lucia Auth best practices with dual-token session security

-- Users table with flexible identity storage
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,            -- Argon2id hash
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table with dual-token security (ID + Secret Hash)
-- Prevents timing attacks through secret verification
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                    -- Public session identifier
    secret_hash BYTEA NOT NULL,             -- SHA-256 hash of session secret
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Session metadata for inactivity timeout pattern
    fresh BOOLEAN NOT NULL DEFAULT TRUE,   -- Tracks if session was just created
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- For inactivity timeout
    metadata JSONB DEFAULT '{}'            -- Additional session data
);

-- Performance and security indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_verified_at ON sessions(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_lastverified ON sessions(user_id, last_verified_at);

-- Note: Automatic session cleanup is handled by the application code
-- See lib/auth.ts for periodic cleanup during session validation

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Security: Ensure proper permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO your_app_user;