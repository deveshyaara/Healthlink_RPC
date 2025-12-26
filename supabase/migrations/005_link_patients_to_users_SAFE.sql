-- ===========================================
-- Migration 005 - SAFE VERSION (Idempotent)
-- Completes the migration even if partially run
-- ===========================================

-- Step 1: Add user_id column (if not exists - already done!)
-- SKIP - Already completed

-- Step 2: Add foreign key constraint (already done!)
-- SKIP - Already completed (that's why you got the error)

-- Step 3: Backfill existing patient records by matching email
-- This is safe to run multiple times
UPDATE patient_wallet_mappings pwm
SET user_id = u.id
FROM users u
WHERE pwm.email = u.email
AND pwm.user_id IS NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_wallet_mappings_user_id ON patient_wallet_mappings(user_id);

-- Step 5: Create helper function to get patient_id from auth.uid()
CREATE OR REPLACE FUNCTION get_patient_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM patient_wallet_mappings WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_id_from_auth() TO authenticated;

-- Verification query
SELECT 
    COUNT(*) as total_patients,
    COUNT(user_id) as patients_with_user_id,
    COUNT(*) - COUNT(user_id) as patients_missing_user_id
FROM patient_wallet_mappings;
