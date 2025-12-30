-- Migration: Add Flagged Users Feature
-- Purpose: Allow administrators to flag suspicious user accounts for security
-- Date: 2025-12-30

-- Add flagged columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS flagged_by UUID;

-- Add index for querying flagged users
CREATE INDEX IF NOT EXISTS idx_users_flagged ON users(flagged) WHERE flagged = true;

-- Add foreign key constraint for flagged_by (references admin who flagged the user)
-- Note: This creates a self-referential foreign key
ALTER TABLE users 
ADD CONSTRAINT fk_users_flagged_by 
FOREIGN KEY (flagged_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

COMMENT ON COLUMN users.flagged IS 'Whether this account has been flagged by an administrator';
COMMENT ON COLUMN users.flagged_reason IS 'Reason why the account was flagged';
COMMENT ON COLUMN users.flagged_at IS 'Timestamp when the account was flagged';
COMMENT ON COLUMN users.flagged_by IS 'ID of the admin who flagged this account';
