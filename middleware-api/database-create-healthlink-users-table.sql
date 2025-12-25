-- ============================================================================
-- Alternative Solution: Create healthlink_users Table (if views don't work)
-- Purpose: Create actual table with name backend code expects
-- Use this if views don't work for INSERT/UPDATE/DELETE operations
-- ============================================================================

-- Option 1: Create healthlink_users as actual table (duplicate of users)
-- This ensures all operations work, but requires data sync

-- Create healthlink_users table matching users structure
CREATE TABLE IF NOT EXISTS "healthlink_users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin', 'government')),
    "fabric_enrollment_id" VARCHAR(255) UNIQUE NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "avatar_url" TEXT,
    "doctor_license_number" VARCHAR(100),
    "doctor_specialization" VARCHAR(100),
    "doctor_hospital_affiliation" VARCHAR(255),
    "doctor_verification_status" VARCHAR(50),
    "patient_date_of_birth" DATE,
    "patient_blood_group" VARCHAR(10),
    "patient_emergency_contact" VARCHAR(20),
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "email_verified" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_login_at" TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_healthlink_users_email" ON "healthlink_users"("email");
CREATE INDEX IF NOT EXISTS "idx_healthlink_users_role" ON "healthlink_users"("role");
CREATE INDEX IF NOT EXISTS "idx_healthlink_users_fabric_enrollment_id" ON "healthlink_users"("fabric_enrollment_id");

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_healthlink_users_updated_at ON "healthlink_users";
CREATE TRIGGER update_healthlink_users_updated_at
    BEFORE UPDATE ON "healthlink_users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Copy data from users to healthlink_users (if users table exists and has data)
INSERT INTO "healthlink_users" (
    id, email, password_hash, role, fabric_enrollment_id, full_name,
    phone_number, avatar_url, doctor_license_number, doctor_specialization,
    doctor_hospital_affiliation, doctor_verification_status,
    patient_date_of_birth, patient_blood_group, patient_emergency_contact,
    is_active, email_verified, created_at, updated_at, last_login_at
)
SELECT 
    id, email, password_hash, 
    CASE 
        WHEN role::text = 'PATIENT' THEN 'patient'
        WHEN role::text = 'DOCTOR' THEN 'doctor'
        WHEN role::text = 'ADMIN' THEN 'admin'
        WHEN role::text = 'GOVERNMENT' THEN 'government'
        ELSE LOWER(role::text)
    END as role,
    fabric_enrollment_id, full_name, phone_number, avatar_url,
    doctor_license_number, doctor_specialization, doctor_hospital_affiliation,
    CASE 
        WHEN doctor_verification_status::text = 'PENDING' THEN 'pending'
        WHEN doctor_verification_status::text = 'VERIFIED' THEN 'verified'
        WHEN doctor_verification_status::text = 'SUSPENDED' THEN 'suspended'
        ELSE NULL
    END as doctor_verification_status,
    patient_date_of_birth, patient_blood_group, patient_emergency_contact,
    is_active, email_verified, created_at, updated_at, last_login_at
FROM "users"
ON CONFLICT (id) DO NOTHING;

-- Create healthlink_user_audit_log table
CREATE TABLE IF NOT EXISTS "healthlink_user_audit_log" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "healthlink_users"("id") ON DELETE CASCADE,
    "action" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_healthlink_audit_user_id" ON "healthlink_user_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_healthlink_audit_created_at" ON "healthlink_user_audit_log"("created_at" DESC);

-- Copy audit log data
INSERT INTO "healthlink_user_audit_log" (user_id, action, ip_address, user_agent, created_at)
SELECT user_id, action, ip_address, user_agent, created_at
FROM "user_audit_log"
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Created healthlink_users table and copied data from users table';
RAISE NOTICE '⚠️  Note: You may need to sync data between users and healthlink_users tables';

