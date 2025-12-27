-- ============================================================================
-- CRITICAL FIX: Update User Roles Constraint
-- ============================================================================
-- Purpose: Add new Phase 1 roles (pharmacist, hospital_admin, insurance)
-- Status: CRITICAL - Must run before creating users with new roles
-- Estimated Time: 30 seconds
-- ============================================================================

-- Step 1: Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add updated constraint with new roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('patient', 'doctor', 'admin', 'pharmacist', 'hospital_admin', 'insurance', 'lab', 'government'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- ============================================================================
-- PERFORMANCE: Add Critical Indexes
-- ============================================================================
-- Purpose: Improve query performance for common operations
-- Estimated Time: 2 minutes
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id) WHERE hospital_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);

-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_expiry_date ON prescriptions(expiry_date) WHERE expiry_date IS NOT NULL;

-- Insurance Claims indexes
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy_id ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_provider_id ON insurance_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_created_at ON insurance_claims(created_at);

-- Insurance Policies indexes
CREATE INDEX IF NOT EXISTS idx_insurance_policies_patient_id ON insurance_policies(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_provider_id ON insurance_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_is_active ON insurance_policies(is_active) WHERE is_active = true;

-- Drug Inventory indexes (CRITICAL for pharmacy operations)
CREATE INDEX IF NOT EXISTS idx_drug_inventory_pharmacy_id ON drug_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_drug_inventory_expiry_date ON drug_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_drug_inventory_quantity ON drug_inventory(quantity) WHERE quantity < 10;
CREATE INDEX IF NOT EXISTS idx_drug_inventory_drug_name ON drug_inventory(drug_name);

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_user_id ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at ON system_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);

-- Verify indexes created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- NEW TABLE: Prescription Dispensing Records
-- ============================================================================
-- Purpose: Track which pharmacy dispensed which prescription
-- Status: NEW FEATURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS prescription_dispensing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  dispensed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity_dispensed INTEGER NOT NULL,
  notes TEXT,
  dispensed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for dispensing records
CREATE INDEX IF NOT EXISTS idx_prescription_dispensing_prescription_id ON prescription_dispensing(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_dispensing_pharmacy_id ON prescription_dispensing(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_dispensing_dispensed_at ON prescription_dispensing(dispensed_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_prescription_dispensing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prescription_dispensing_updated_at
  BEFORE UPDATE ON prescription_dispensing
  FOR EACH ROW
  EXECUTE FUNCTION update_prescription_dispensing_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify role constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- 2. Count indexes
SELECT COUNT(*) as total_indexes 
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- 3. Verify new table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'prescription_dispensing';

-- 4. Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Critical fixes applied successfully!';
  RAISE NOTICE '✅ User roles updated: pharmacist, hospital_admin, insurance';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ Prescription dispensing table created';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Run: npx prisma db pull';
  RAISE NOTICE '2. Run: npx prisma generate';
  RAISE NOTICE '3. Restart backend server';
END $$;
