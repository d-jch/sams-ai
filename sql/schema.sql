-- SAMS AI - Sequencing Application Management System
-- Complete database schema for genomics lab management
-- Based on Lucia Auth best practices with dual-token session security

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- User role types
CREATE TYPE user_role AS ENUM ('researcher', 'technician', 'lab_manager', 'admin');

-- Sequencing types
CREATE TYPE sequencing_type AS ENUM ('WGS', 'WES', 'RNA-seq', 'amplicon', 'ChIP-seq');

-- Request status types
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

-- Sample types
CREATE TYPE sample_type AS ENUM ('DNA', 'RNA', 'Protein', 'Cell');

-- QC status types
CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'retest');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,            -- Argon2id hash
    role user_role NOT NULL DEFAULT 'researcher',
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_verified_at ON sessions(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_lastverified ON sessions(user_id, last_verified_at);

-- Note: Automatic session cleanup is handled by the application code
-- See lib/auth.ts for periodic cleanup during session validation

-- =============================================================================
-- BUSINESS TABLES
-- =============================================================================

-- Sequencing requests table
CREATE TABLE IF NOT EXISTS sequencing_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(200) NOT NULL,
    sequencing_type sequencing_type NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    priority priority_level NOT NULL DEFAULT 'normal',
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Samples table
CREATE TABLE IF NOT EXISTS samples (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id TEXT NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type sample_type NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    concentration DECIMAL(8,2),
    volume DECIMAL(8,2),
    qc_status qc_status NOT NULL DEFAULT 'pending',
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Request status history table (audit trail)
CREATE TABLE IF NOT EXISTS request_status_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id TEXT NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
    old_status request_status,
    new_status request_status NOT NULL,
    changed_by TEXT NOT NULL REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR BUSINESS TABLES
-- =============================================================================

-- Sequencing requests indexes
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON sequencing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON sequencing_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON sequencing_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_user_status ON sequencing_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_date_range ON sequencing_requests(created_at, status);

-- Samples indexes
CREATE INDEX IF NOT EXISTS idx_samples_request_id ON samples(request_id);
CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(barcode);
CREATE INDEX IF NOT EXISTS idx_samples_qc_status ON samples(qc_status);
CREATE INDEX IF NOT EXISTS idx_samples_request_qc ON samples(request_id, qc_status);

-- Status history indexes
CREATE INDEX IF NOT EXISTS idx_status_history_request_id ON request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON request_status_history(created_at);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
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

CREATE OR REPLACE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON sequencing_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_samples_updated_at 
    BEFORE UPDATE ON samples 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PERMISSIONS (adjust as needed for your setup)
-- =============================================================================

-- Security: Ensure proper permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sequencing_requests TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON samples TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON request_status_history TO your_app_user;