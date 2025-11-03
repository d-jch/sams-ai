-- Migration: Remove fixed expiration and implement inactivity timeout
-- This migration updates the sessions table to use inactivity timeout instead of fixed expiration

-- Step 1: Make expires_at nullable (optional, for backward compatibility during transition)
ALTER TABLE sessions ALTER COLUMN expires_at DROP NOT NULL;

-- Step 2: Ensure last_verified_at exists and has proper default
-- (This column already exists in our schema, but ensure it's set up correctly)
UPDATE sessions SET last_verified_at = created_at WHERE last_verified_at IS NULL;
ALTER TABLE sessions ALTER COLUMN last_verified_at SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN last_verified_at SET DEFAULT NOW();

-- Step 3: Add index for performance on inactivity cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_last_verified_at ON sessions(last_verified_at);

-- Step 4: Clean up very old sessions during migration (older than 30 days)
DELETE FROM sessions WHERE last_verified_at < NOW() - INTERVAL '30 days';

-- Step 5: Optional - Drop expires_at column entirely (uncomment if you want to remove it completely)
-- ALTER TABLE sessions DROP COLUMN expires_at;

-- Note: The expires_at column is kept as nullable for backward compatibility
-- If you're sure no code depends on it, you can uncomment the DROP COLUMN line above