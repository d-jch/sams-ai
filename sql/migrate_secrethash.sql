-- Migration: Add secretHash to sessions table
-- This migration adds Lucia-style dual-token security to existing sessions

-- Step 1: Add the secret_hash column (nullable initially)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS secret_hash BYTEA;

-- Step 2: Clean up existing sessions (they won't have secret hashes)
-- This is necessary because existing sessions can't be validated with the new security model
DELETE FROM sessions WHERE secret_hash IS NULL;

-- Step 3: Make secret_hash NOT NULL (all sessions now have it)
ALTER TABLE sessions ALTER COLUMN secret_hash SET NOT NULL;

-- Step 4: Add metadata column if it doesn't exist
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 5: Add last_verified_at column if it doesn't exist  
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update the fresh column default if needed
ALTER TABLE sessions ALTER COLUMN fresh SET DEFAULT TRUE;

-- Recreate indexes for optimal performance
DROP INDEX IF EXISTS idx_sessions_user_expires;
CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);

-- Add index for cleanup operations
DROP INDEX IF EXISTS idx_sessions_cleanup;
CREATE INDEX idx_sessions_cleanup ON sessions(expires_at) WHERE expires_at < NOW();