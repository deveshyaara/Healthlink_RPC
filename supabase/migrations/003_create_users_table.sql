-- ===========================================
-- Create `users` and `user_audit_log` tables
-- Adds the tables required by Prisma/Authentication layer
-- ===========================================

-- Ensure UUID support exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (matches Prisma schema 'User' model)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'PATIENT',
  fabric_enrollment_id VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  avatar_url TEXT,
  doctor_license_number VARCHAR(100),
  doctor_specialization VARCHAR(100),
  doctor_hospital_affiliation VARCHAR(255),
  doctor_verification_status VARCHAR(50),
  patient_date_of_birth DATE,
  patient_blood_group VARCHAR(10),
  patient_emergency_contact VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_fabric_enrollment_id ON users(fabric_enrollment_id);

-- Create user_audit_log table (matches Prisma UserAuditLog model)
CREATE TABLE IF NOT EXISTS user_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON user_audit_log(created_at DESC);

-- Trigger function to update "updated_at" columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add triggers to update the "updated_at" on users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS: enable row level security on users and user_audit_log
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy examples (service role & user access)
-- Service role can perform all operations
DROP POLICY IF EXISTS "service_role_users_all" ON users;
CREATE POLICY "service_role_users_all" ON users
FOR ALL USING (auth.role() = 'service_role');

-- Users can SELECT their own row
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
FOR SELECT USING (auth.uid()::text = id::text);

-- Admins can manage users
DROP POLICY IF EXISTS "admins_manage_users" ON users;
CREATE POLICY "admins_manage_users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Allow service role to insert audit logs
DROP POLICY IF EXISTS "service_role_insert_user_audit" ON user_audit_log;
CREATE POLICY "service_role_insert_user_audit" ON user_audit_log
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow admins to read audit logs
DROP POLICY IF EXISTS "admins_read_user_audit" ON user_audit_log;
CREATE POLICY "admins_read_user_audit" ON user_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);
