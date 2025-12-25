-- ============================================================================
-- HealthLink Pro - Idempotent Database Migration
-- Purpose: Safe migration that can be run multiple times without errors
-- Database: Supabase PostgreSQL
-- 
-- This version handles all edge cases:
-- - Existing tables
-- - Existing columns (with wrong names)
-- - Existing indexes
-- - Existing triggers
-- - Existing constraints
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Step 1: Create Enums (Type-Safe Status and Type Values)
-- ============================================================================

-- Role enum
DO $$ BEGIN
    CREATE TYPE "role" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN', 'GOVERNMENT', 'LAB');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Doctor verification status enum
DO $$ BEGIN
    CREATE TYPE "doctor_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invitation status enum
DO $$ BEGIN
    CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Appointment status enum
DO $$ BEGIN
    CREATE TYPE "appointment_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Prescription status enum
DO $$ BEGIN
    CREATE TYPE "prescription_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Record type enum
DO $$ BEGIN
    CREATE TYPE "record_type" AS ENUM ('DIAGNOSIS', 'TREATMENT', 'PRESCRIPTION', 'LAB_RESULT', 'IMAGING', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Consent status enum
DO $$ BEGIN
    CREATE TYPE "consent_status" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lab test status enum
DO $$ BEGIN
    CREATE TYPE "lab_test_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Step 2: Create Users Table (Authentication and Profile Metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" DEFAULT 'PATIENT' NOT NULL,
    "fabric_enrollment_id" VARCHAR(255) UNIQUE NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "avatar_url" TEXT,
    "doctor_license_number" VARCHAR(100),
    "doctor_specialization" VARCHAR(100),
    "doctor_hospital_affiliation" VARCHAR(255),
    "doctor_verification_status" "doctor_verification_status",
    "patient_date_of_birth" DATE,
    "patient_blood_group" VARCHAR(10),
    "patient_emergency_contact" VARCHAR(20),
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "email_verified" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_login_at" TIMESTAMPTZ
);

-- Create indexes for users table (drop first if exists)
DROP INDEX IF EXISTS "idx_users_email";
DROP INDEX IF EXISTS "idx_users_role";
DROP INDEX IF EXISTS "idx_users_fabric_enrollment_id";
DROP INDEX IF EXISTS "idx_users_created_at";
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_fabric_enrollment_id" ON "users"("fabric_enrollment_id");
CREATE INDEX "idx_users_created_at" ON "users"("created_at" DESC);

-- ============================================================================
-- Step 3: Create User Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user_audit_log" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "action" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_audit_user_id";
DROP INDEX IF EXISTS "idx_audit_created_at";
CREATE INDEX "idx_audit_user_id" ON "user_audit_log"("user_id");
CREATE INDEX "idx_audit_created_at" ON "user_audit_log"("created_at" DESC);

-- ============================================================================
-- Step 4: Create User Invitations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user_invitations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "role" "role" NOT NULL,
    "token" VARCHAR(255) UNIQUE NOT NULL,
    "status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
    "invited_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_user_invitations_email";
DROP INDEX IF EXISTS "idx_user_invitations_token";
DROP INDEX IF EXISTS "idx_user_invitations_status";
DROP INDEX IF EXISTS "idx_user_invitations_expires_at";
CREATE INDEX "idx_user_invitations_email" ON "user_invitations"("email");
CREATE INDEX "idx_user_invitations_token" ON "user_invitations"("token");
CREATE INDEX "idx_user_invitations_status" ON "user_invitations"("status");
CREATE INDEX "idx_user_invitations_expires_at" ON "user_invitations"("expires_at");

-- ============================================================================
-- Step 5: Create Patient Wallet Mappings Table (Critical for Blockchain)
-- ============================================================================

-- Handle existing table with wrong column names
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patient_wallet_mappings'
    ) THEN
        -- Rename walletAddress to wallet_address if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'walletAddress'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'wallet_address'
        ) THEN
            ALTER TABLE "patient_wallet_mappings" RENAME COLUMN "walletAddress" TO "wallet_address";
            RAISE NOTICE 'Renamed walletAddress to wallet_address';
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "patient_wallet_mappings" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "wallet_address" VARCHAR(42) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add missing columns if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patient_wallet_mappings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'wallet_address'
        ) THEN
            ALTER TABLE "patient_wallet_mappings" ADD COLUMN "wallet_address" VARCHAR(42);
            ALTER TABLE "patient_wallet_mappings" ADD CONSTRAINT "patient_wallet_mappings_wallet_address_key" 
                UNIQUE ("wallet_address");
            RAISE NOTICE 'Added wallet_address column';
        END IF;
    END IF;
END $$;

DROP INDEX IF EXISTS "idx_patient_wallet_email";
DROP INDEX IF EXISTS "idx_patient_wallet_address";
DROP INDEX IF EXISTS "idx_patient_wallet_created_by";
CREATE INDEX "idx_patient_wallet_email" ON "patient_wallet_mappings"("email");
CREATE INDEX "idx_patient_wallet_address" ON "patient_wallet_mappings"("wallet_address");
CREATE INDEX "idx_patient_wallet_created_by" ON "patient_wallet_mappings"("created_by");

-- ============================================================================
-- Step 6: Create Appointments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "appointments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "appointment_id" VARCHAR(255) UNIQUE NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "status" "appointment_status" DEFAULT 'SCHEDULED' NOT NULL,
    "patient_id" UUID NOT NULL REFERENCES "patient_wallet_mappings"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "notes" TEXT,
    "location" VARCHAR(255),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_appointments_appointment_id";
DROP INDEX IF EXISTS "idx_appointments_patient_id";
DROP INDEX IF EXISTS "idx_appointments_doctor_id";
DROP INDEX IF EXISTS "idx_appointments_scheduled_at";
CREATE INDEX "idx_appointments_appointment_id" ON "appointments"("appointment_id");
CREATE INDEX "idx_appointments_patient_id" ON "appointments"("patient_id");
CREATE INDEX "idx_appointments_doctor_id" ON "appointments"("doctor_id");
CREATE INDEX "idx_appointments_scheduled_at" ON "appointments"("scheduled_at");

-- ============================================================================
-- Step 7: Create Prescriptions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "prescriptions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "prescription_id" VARCHAR(255) UNIQUE NOT NULL,
    "medication" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(100) NOT NULL,
    "instructions" TEXT,
    "expiry_date" TIMESTAMPTZ,
    "status" "prescription_status" DEFAULT 'ACTIVE' NOT NULL,
    "patient_id" UUID NOT NULL REFERENCES "patient_wallet_mappings"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_prescriptions_prescription_id";
DROP INDEX IF EXISTS "idx_prescriptions_patient_id";
DROP INDEX IF EXISTS "idx_prescriptions_doctor_id";
CREATE INDEX "idx_prescriptions_prescription_id" ON "prescriptions"("prescription_id");
CREATE INDEX "idx_prescriptions_patient_id" ON "prescriptions"("patient_id");
CREATE INDEX "idx_prescriptions_doctor_id" ON "prescriptions"("doctor_id");

-- ============================================================================
-- Step 8: Create Medical Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "medical_records" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "record_id" VARCHAR(255) UNIQUE NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "record_type" "record_type" NOT NULL,
    "ipfs_hash" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255),
    "patient_id" UUID NOT NULL REFERENCES "patient_wallet_mappings"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_medical_records_record_id";
DROP INDEX IF EXISTS "idx_medical_records_patient_id";
DROP INDEX IF EXISTS "idx_medical_records_doctor_id";
CREATE INDEX "idx_medical_records_record_id" ON "medical_records"("record_id");
CREATE INDEX "idx_medical_records_patient_id" ON "medical_records"("patient_id");
CREATE INDEX "idx_medical_records_doctor_id" ON "medical_records"("doctor_id");

-- ============================================================================
-- Step 9: Create Consent Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "consent_requests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "consent_id" VARCHAR(255) UNIQUE NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "status" "consent_status" DEFAULT 'PENDING' NOT NULL,
    "valid_until" TIMESTAMPTZ NOT NULL,
    "patient_id" UUID NOT NULL REFERENCES "patient_wallet_mappings"("id") ON DELETE CASCADE,
    "requester_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_consent_requests_consent_id";
DROP INDEX IF EXISTS "idx_consent_requests_patient_id";
DROP INDEX IF EXISTS "idx_consent_requests_requester_id";
CREATE INDEX "idx_consent_requests_consent_id" ON "consent_requests"("consent_id");
CREATE INDEX "idx_consent_requests_patient_id" ON "consent_requests"("patient_id");
CREATE INDEX "idx_consent_requests_requester_id" ON "consent_requests"("requester_id");

-- ============================================================================
-- Step 10: Create Lab Tests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "lab_tests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "test_id" VARCHAR(255) UNIQUE NOT NULL,
    "test_name" VARCHAR(255) NOT NULL,
    "test_type" VARCHAR(100) NOT NULL,
    "results" TEXT,
    "status" "lab_test_status" DEFAULT 'PENDING' NOT NULL,
    "performed_at" TIMESTAMPTZ,
    "patient_id" UUID NOT NULL REFERENCES "patient_wallet_mappings"("id") ON DELETE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "lab_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DROP INDEX IF EXISTS "idx_lab_tests_test_id";
DROP INDEX IF EXISTS "idx_lab_tests_patient_id";
DROP INDEX IF EXISTS "idx_lab_tests_doctor_id";
CREATE INDEX "idx_lab_tests_test_id" ON "lab_tests"("test_id");
CREATE INDEX "idx_lab_tests_patient_id" ON "lab_tests"("patient_id");
CREATE INDEX "idx_lab_tests_doctor_id" ON "lab_tests"("doctor_id");

-- ============================================================================
-- Step 11: Create Updated At Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON "user_invitations";
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON "user_invitations"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_wallet_mappings_updated_at ON "patient_wallet_mappings";
CREATE TRIGGER update_patient_wallet_mappings_updated_at
    BEFORE UPDATE ON "patient_wallet_mappings"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON "appointments";
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON "appointments"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON "prescriptions";
CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON "prescriptions"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON "medical_records";
CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON "medical_records"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consent_requests_updated_at ON "consent_requests";
CREATE TRIGGER update_consent_requests_updated_at
    BEFORE UPDATE ON "consent_requests"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_tests_updated_at ON "lab_tests";
CREATE TRIGGER update_lab_tests_updated_at
    BEFORE UPDATE ON "lab_tests"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 12: Verification - Check All Tables Exist
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    required_tables TEXT[] := ARRAY[
        'users',
        'user_audit_log',
        'user_invitations',
        'patient_wallet_mappings',
        'appointments',
        'prescriptions',
        'medical_records',
        'consent_requests',
        'lab_tests'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY required_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = tbl;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All required tables created successfully!';
        RAISE NOTICE 'Tables: %', array_to_string(required_tables, ', ');
    END IF;
END $$;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'HealthLink Database Migration Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tables created successfully.';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: npx prisma generate';
    RAISE NOTICE '2. Run: npx prisma db push (optional)';
    RAISE NOTICE '3. Verify connection in your application';
END $$;

