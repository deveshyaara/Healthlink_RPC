-- ============================================================================
-- Phase 1 Manual Database Migration
-- HealthLink - PostgreSQL DDL
-- Run this script in your PostgreSQL database
-- ============================================================================

-- ============================================================================
-- Step 1: Add 2FA and Hospital fields to users table
-- ============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hospital_id UUID;

-- ============================================================================
-- Step 2: Create hospitals table
-- ============================================================================

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_registration ON hospitals(registration_number);

-- ============================================================================
-- Step 3: Create departments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_doctor_id UUID,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    CONSTRAINT fk_departments_hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);

-- ============================================================================
-- Step 4: Create pharmacies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_license ON pharmacies(license_number);

-- ============================================================================
-- Step 5: Create drug_inventory table
-- ============================================================================

CREATE TABLE IF NOT EXISTS drug_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL,
    drug_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    expiry_date DATE NOT NULL,
    manufacturer VARCHAR(255),
    price_per_unit DECIMAL(10, 2),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    CONSTRAINT fk_drug_inventory_pharmacy FOREIGN KEY (pharmacy_id) 
        REFERENCES pharmacies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drug_inventory_pharmacy_id ON drug_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_drug_inventory_expiry ON drug_inventory(expiry_date);

-- ============================================================================
-- Step 6: Create insurance_providers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_providers_registration ON insurance_providers(registration_number);

-- ============================================================================
-- Step 7: Create insurance_policies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    provider_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    coverage_amount DECIMAL(10, 2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    CONSTRAINT fk_insurance_policies_provider FOREIGN KEY (provider_id) 
        REFERENCES insurance_providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_insurance_policies_patient FOREIGN KEY (patient_id) 
        REFERENCES patient_wallet_mappings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_number ON insurance_policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_patient_id ON insurance_policies(patient_id);

-- ============================================================================
-- Step 8: Create insurance_claims table
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id VARCHAR(255) UNIQUE NOT NULL,
    blockchain_tx_hash VARCHAR(66),
    policy_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    claimed_amount DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    supporting_docs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    CONSTRAINT fk_insurance_claims_policy FOREIGN KEY (policy_id) 
        REFERENCES insurance_policies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_claim_id ON insurance_claims(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy_id ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

-- ============================================================================
-- Step 9: Create system_audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_user_id ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_action ON system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_audit_resource_type ON system_audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_logs(created_at DESC);

-- ============================================================================
-- Step 10: Add foreign key for hospital affiliation in users table
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_users_hospital'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_hospital 
            FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- Step 11: Create trigger to auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all new tables
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_inventory_updated_at BEFORE UPDATE ON drug_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_providers_updated_at BEFORE UPDATE ON insurance_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON insurance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verification Queries (run these to confirm migration success)
-- ============================================================================

-- Count tables created
SELECT COUNT(*) AS phase1_tables FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'hospitals', 'departments', 'pharmacies', 'drug_inventory',
    'insurance_providers', 'insurance_policies', 'insurance_claims', 'system_audit_logs'
);

-- Verify users table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_factor_secret', 'two_factor_enabled', 'backup_codes', 'hospital_id');

-- List all indexes created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%hospital%' 
OR indexname LIKE 'idx_%pharmacy%'
OR indexname LIKE 'idx_%insurance%'
OR indexname LIKE 'idx_%audit%';

-- ============================================================================
-- DONE! Migration Complete
-- Expected Results:
-- - 8 new tables created
-- - 4 new columns in users table
-- - 13+ indexes created
-- - 7 triggers created
-- ============================================================================
