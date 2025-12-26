-- ===========================================
-- Link Patient Wallet Mappings to Users Table
-- Fixes patient data access by adding user_id foreign key
-- CORRECTED FOR ACTUAL DATABASE SCHEMA
-- ===========================================

-- Step 1: Add user_id column to patient_wallet_mappings table
ALTER TABLE patient_wallet_mappings 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 2: Add foreign key constraint to users table
ALTER TABLE patient_wallet_mappings
ADD CONSTRAINT fk_patient_wallet_mappings_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Backfill existing patient records by matching email
-- This links existing patients to their user accounts
UPDATE patient_wallet_mappings pwm
SET user_id = u.id
FROM users u
WHERE pwm.email = u.email
AND pwm.user_id IS NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_wallet_mappings_user_id ON patient_wallet_mappings(user_id);

-- Step 5: Add unique constraint to ensure one patient record per user (optional)
-- Uncomment if you want to enforce this:
-- ALTER TABLE patient_wallet_mappings ADD CONSTRAINT unique_patient_per_user UNIQUE (user_id);

-- Step 6: Create helper function to get patient_id from auth.uid()
CREATE OR REPLACE FUNCTION get_patient_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM patient_wallet_mappings WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_patient_id_from_auth() TO authenticated;

-- Verification query - run this after to check it worked:
-- SELECT pwm.id, pwm.email, pwm.user_id, u.email as user_email, u.role
-- FROM patient_wallet_mappings pwm
-- LEFT JOIN users u ON pwm.user_id = u.id
-- LIMIT 10;
