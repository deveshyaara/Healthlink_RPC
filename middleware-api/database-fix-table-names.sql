-- ============================================================================
-- Quick Fix: Create Views for Backward Compatibility
-- Purpose: Map healthlink_users -> users (for existing code compatibility)
-- Run this if backend code references 'healthlink_users' but table is 'users'
-- ============================================================================

-- Create view for users table (healthlink_users -> users)
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        -- Drop existing view if it exists
        DROP VIEW IF EXISTS "healthlink_users";
        
        -- Create view mapping healthlink_users to users
        CREATE VIEW "healthlink_users" AS SELECT * FROM "users";
        
        -- Make view updatable (for INSERT, UPDATE, DELETE operations)
        -- Note: Views are read-only by default, but we can create INSTEAD OF triggers
        CREATE OR REPLACE FUNCTION healthlink_users_insert()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO "users" (
                id, email, password_hash, role, fabric_enrollment_id, full_name,
                phone_number, avatar_url, doctor_license_number, doctor_specialization,
                doctor_hospital_affiliation, doctor_verification_status,
                patient_date_of_birth, patient_blood_group, patient_emergency_contact,
                is_active, email_verified, created_at, updated_at, last_login_at
            ) VALUES (
                NEW.id, NEW.email, NEW.password_hash, NEW.role, NEW.fabric_enrollment_id,
                NEW.full_name, NEW.phone_number, NEW.avatar_url, NEW.doctor_license_number,
                NEW.doctor_specialization, NEW.doctor_hospital_affiliation,
                NEW.doctor_verification_status, NEW.patient_date_of_birth,
                NEW.patient_blood_group, NEW.patient_emergency_contact,
                NEW.is_active, NEW.email_verified, NEW.created_at, NEW.updated_at, NEW.last_login_at
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER healthlink_users_insert_trigger
            INSTEAD OF INSERT ON "healthlink_users"
            FOR EACH ROW
            EXECUTE FUNCTION healthlink_users_insert();
        
        CREATE OR REPLACE FUNCTION healthlink_users_update()
        RETURNS TRIGGER AS $$
        BEGIN
            UPDATE "users" SET
                email = NEW.email,
                password_hash = NEW.password_hash,
                role = NEW.role,
                fabric_enrollment_id = NEW.fabric_enrollment_id,
                full_name = NEW.full_name,
                phone_number = NEW.phone_number,
                avatar_url = NEW.avatar_url,
                doctor_license_number = NEW.doctor_license_number,
                doctor_specialization = NEW.doctor_specialization,
                doctor_hospital_affiliation = NEW.doctor_hospital_affiliation,
                doctor_verification_status = NEW.doctor_verification_status,
                patient_date_of_birth = NEW.patient_date_of_birth,
                patient_blood_group = NEW.patient_blood_group,
                patient_emergency_contact = NEW.patient_emergency_contact,
                is_active = NEW.is_active,
                email_verified = NEW.email_verified,
                updated_at = NEW.updated_at,
                last_login_at = NEW.last_login_at
            WHERE id = NEW.id;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER healthlink_users_update_trigger
            INSTEAD OF UPDATE ON "healthlink_users"
            FOR EACH ROW
            EXECUTE FUNCTION healthlink_users_update();
        
        CREATE OR REPLACE FUNCTION healthlink_users_delete()
        RETURNS TRIGGER AS $$
        BEGIN
            DELETE FROM "users" WHERE id = OLD.id;
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER healthlink_users_delete_trigger
            INSTEAD OF DELETE ON "healthlink_users"
            FOR EACH ROW
            EXECUTE FUNCTION healthlink_users_delete();
        
        RAISE NOTICE '✅ Created healthlink_users view pointing to users table';
    ELSE
        RAISE NOTICE '⚠️  users table does not exist. Run full migration first.';
    END IF;
END $$;

-- Create view for audit log (healthlink_user_audit_log -> user_audit_log)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_audit_log'
    ) THEN
        DROP VIEW IF EXISTS "healthlink_user_audit_log";
        CREATE VIEW "healthlink_user_audit_log" AS SELECT * FROM "user_audit_log";
        RAISE NOTICE '✅ Created healthlink_user_audit_log view pointing to user_audit_log table';
    END IF;
END $$;

-- Verify views were created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'healthlink_users'
    ) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Backward Compatibility Views Created!';
        RAISE NOTICE 'healthlink_users -> users';
        RAISE NOTICE 'healthlink_user_audit_log -> user_audit_log';
        RAISE NOTICE 'Existing code will now work correctly.';
        RAISE NOTICE '========================================';
    END IF;
END $$;

