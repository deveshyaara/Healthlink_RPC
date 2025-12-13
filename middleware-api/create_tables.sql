-- HealthLink Pro - User Authentication Schema
-- Purpose: Store user credentials and audit logs (OFF-CHAIN data only)

-- Create enum types
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN', 'GOVERNMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DoctorVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" DEFAULT 'PATIENT' NOT NULL,
    "fabric_enrollment_id" VARCHAR(255) UNIQUE NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "avatar_url" TEXT,
    
    -- Doctor-specific fields
    "doctor_license_number" VARCHAR(100),
    "doctor_specialization" VARCHAR(100),
    "doctor_hospital_affiliation" VARCHAR(255),
    "doctor_verification_status" "DoctorVerificationStatus",
    
    -- Patient-specific fields
    "patient_date_of_birth" DATE,
    "patient_blood_group" VARCHAR(10),
    "patient_emergency_contact" VARCHAR(20),
    
    -- Account status
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "email_verified" BOOLEAN DEFAULT false NOT NULL,
    
    -- Timestamps
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_login_at" TIMESTAMPTZ
);

-- User audit log table
CREATE TABLE IF NOT EXISTS "user_audit_log" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "action" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_fabric_enrollment_id" ON "users"("fabric_enrollment_id");
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_user_id" ON "user_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "user_audit_log"("created_at" DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
