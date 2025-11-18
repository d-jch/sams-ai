-- SAMS AI - Sequencing Application Management System
-- Complete database schema for genomics lab management
-- Based on Lucia Auth best practices with dual-token session security

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- User role types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('researcher', 'technician', 'lab_manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Sequencing types
DO $$ BEGIN
    CREATE TYPE sequencing_type AS ENUM ('sanger', 'WGS', 'WES', 'RNA-seq', 'amplicon', 'ChIP-seq');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Request status types
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Priority levels
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('normal', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Sample types
DO $$ BEGIN
    CREATE TYPE sample_type AS ENUM ('DNA', 'RNA', 'Cell', 'PCR产物(已纯化)', 'PCR产物(未纯化)', '菌株', '质粒');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- QC status types
DO $$ BEGIN
    CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'retest');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Well status types (for 96-well plates)
DO $$ BEGIN
    CREATE TYPE well_status AS ENUM ('pending', 'loaded', 'sequenced', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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
-- SANGER SEQUENCING TABLES
-- =============================================================================

-- Primers library table
CREATE TABLE IF NOT EXISTS primers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    sequence TEXT NOT NULL,
    description TEXT,
    tm DECIMAL(5,2),                        -- Melting temperature in °C
    gc_content DECIMAL(5,2),                -- GC content percentage
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Validation constraints
    CONSTRAINT chk_primer_sequence CHECK (sequence ~ '^[ATGCatgc]+$'),
    CONSTRAINT chk_primer_length CHECK (length(sequence) BETWEEN 18 AND 30),
    CONSTRAINT chk_gc_content CHECK (gc_content IS NULL OR (gc_content >= 0 AND gc_content <= 100)),
    CONSTRAINT chk_tm CHECK (tm IS NULL OR (tm >= 0 AND tm <= 100))
);

-- Sample-Primer association table (many-to-many)
CREATE TABLE IF NOT EXISTS sample_primers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sample_id TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    primer_id TEXT NOT NULL REFERENCES primers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate primer assignments
    CONSTRAINT unique_sample_primer UNIQUE (sample_id, primer_id)
);

-- 96-well plate layouts table
CREATE TABLE IF NOT EXISTS plate_layouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    request_id TEXT NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
    plate_name VARCHAR(100) NOT NULL,
    plate_type VARCHAR(50) NOT NULL DEFAULT '96-well',
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Well assignments table (tracks which sample goes in which well)
CREATE TABLE IF NOT EXISTS well_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    plate_layout_id TEXT NOT NULL REFERENCES plate_layouts(id) ON DELETE CASCADE,
    sample_id TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    well_position VARCHAR(10) NOT NULL,     -- e.g., "A01", "B02", etc.
    status well_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Validation constraints
    CONSTRAINT chk_well_position CHECK (well_position ~ '^[A-H](0[1-9]|1[0-2])$'),
    -- Ensure each well in a plate is unique
    CONSTRAINT unique_plate_well UNIQUE (plate_layout_id, well_position),
    -- Ensure each sample only appears once per plate
    CONSTRAINT unique_plate_sample UNIQUE (plate_layout_id, sample_id)
);

-- =============================================================================
-- NGS BARCODE MANAGEMENT TABLES
-- =============================================================================

-- Barcode kits table (e.g., Illumina TruSeq, Nextera)
CREATE TABLE IF NOT EXISTS barcode_kits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL UNIQUE,
    manufacturer VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,          -- e.g., "Illumina", "MGI"
    index_type VARCHAR(20) NOT NULL,        -- e.g., "single", "dual"
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_index_type CHECK (index_type IN ('single', 'dual'))
);

-- Barcode sequences table (individual barcodes within a kit)
CREATE TABLE IF NOT EXISTS barcode_sequences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kit_id TEXT NOT NULL REFERENCES barcode_kits(id) ON DELETE CASCADE,
    index_name VARCHAR(50) NOT NULL,        -- e.g., "i7_01", "i5_01"
    sequence TEXT NOT NULL,
    position INTEGER NOT NULL,              -- Position in the kit (for ordering)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Validation constraints
    CONSTRAINT chk_barcode_sequence CHECK (sequence ~ '^[ATGCatgc]+$'),
    CONSTRAINT chk_position CHECK (position > 0),
    -- Ensure unique index names within a kit
    CONSTRAINT unique_kit_index UNIQUE (kit_id, index_name),
    -- Ensure unique positions within a kit
    CONSTRAINT unique_kit_position UNIQUE (kit_id, position)
);

-- Barcode assignments table (which barcode is assigned to which sample)
-- Only technicians can assign barcodes (enforced in application layer)
CREATE TABLE IF NOT EXISTS barcode_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sample_id TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    kit_id TEXT NOT NULL REFERENCES barcode_kits(id) ON DELETE RESTRICT,
    i7_index_id TEXT REFERENCES barcode_sequences(id) ON DELETE RESTRICT,
    i5_index_id TEXT REFERENCES barcode_sequences(id) ON DELETE RESTRICT,
    assigned_by TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure at least one index is assigned
    CONSTRAINT chk_at_least_one_index CHECK (i7_index_id IS NOT NULL OR i5_index_id IS NOT NULL),
    -- One barcode assignment per sample
    CONSTRAINT unique_sample_barcode UNIQUE (sample_id)
);

-- =============================================================================
-- INDEXES FOR SANGER AND BARCODE TABLES
-- =============================================================================

-- Primers indexes
CREATE INDEX IF NOT EXISTS idx_primers_name ON primers(name);

-- Sample-Primers indexes
CREATE INDEX IF NOT EXISTS idx_sample_primers_sample_id ON sample_primers(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_primers_primer_id ON sample_primers(primer_id);

-- Plate layouts indexes
CREATE INDEX IF NOT EXISTS idx_plate_layouts_request_id ON plate_layouts(request_id);
CREATE INDEX IF NOT EXISTS idx_plate_layouts_created_by ON plate_layouts(created_by);

-- Well assignments indexes
CREATE INDEX IF NOT EXISTS idx_well_assignments_plate_id ON well_assignments(plate_layout_id);
CREATE INDEX IF NOT EXISTS idx_well_assignments_sample_id ON well_assignments(sample_id);
CREATE INDEX IF NOT EXISTS idx_well_assignments_status ON well_assignments(status);

-- Barcode kits indexes
CREATE INDEX IF NOT EXISTS idx_barcode_kits_platform ON barcode_kits(platform);
CREATE INDEX IF NOT EXISTS idx_barcode_kits_name ON barcode_kits(name);

-- Barcode sequences indexes
CREATE INDEX IF NOT EXISTS idx_barcode_sequences_kit_id ON barcode_sequences(kit_id);
CREATE INDEX IF NOT EXISTS idx_barcode_sequences_kit_position ON barcode_sequences(kit_id, position);

-- Barcode assignments indexes
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_sample_id ON barcode_assignments(sample_id);
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_kit_id ON barcode_assignments(kit_id);
CREATE INDEX IF NOT EXISTS idx_barcode_assignments_assigned_by ON barcode_assignments(assigned_by);

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

CREATE OR REPLACE TRIGGER update_primers_updated_at 
    BEFORE UPDATE ON primers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_plate_layouts_updated_at 
    BEFORE UPDATE ON plate_layouts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_well_assignments_updated_at 
    BEFORE UPDATE ON well_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_barcode_kits_updated_at 
    BEFORE UPDATE ON barcode_kits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_barcode_assignments_updated_at 
    BEFORE UPDATE ON barcode_assignments 
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