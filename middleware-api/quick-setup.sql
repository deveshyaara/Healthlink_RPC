-- HealthLink Quick Setup SQL
-- Run this entire file in Supabase SQL Editor to set up database and create test users
-- URL: https://supabase.com/dashboard/project/wpmgqueyuwuvdcavzthg/sql/new

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS healthlink_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin', 'government')),
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
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_healthlink_users_email ON healthlink_users(email);
CREATE INDEX IF NOT EXISTS idx_healthlink_users_role ON healthlink_users(role);
CREATE INDEX IF NOT EXISTS idx_healthlink_users_fabric_enrollment_id ON healthlink_users(fabric_enrollment_id);

-- Step 3: Insert test users
-- All passwords are: Password@123

-- Admin User
INSERT INTO healthlink_users (
  email, password_hash, role, fabric_enrollment_id, full_name, is_active, email_verified
) VALUES (
  'admin@healthlink.com',
  '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
  'admin',
  'admin-' || extract(epoch from now())::text,
  'Admin User',
  true,
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = CURRENT_TIMESTAMP;

-- Doctor User  
INSERT INTO healthlink_users (
  email, password_hash, role, fabric_enrollment_id, full_name,
  doctor_license_number, doctor_specialization, doctor_hospital_affiliation,
  is_active, email_verified
) VALUES (
  'doctor@healthlink.com',
  '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
  'doctor',
  'doctor-' || extract(epoch from now())::text,
  'Dr. John Smith',
  'MED-12345',
  'Cardiology',
  'General Hospital',
  true,
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = CURRENT_TIMESTAMP;

-- Patient User
INSERT INTO healthlink_users (
  email, password_hash, role, fabric_enrollment_id, full_name,
  patient_blood_group, patient_date_of_birth,
  is_active, email_verified
) VALUES (
  'patient@healthlink.com',
  '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
  'patient',
  'patient-' || extract(epoch from now())::text,
  'Jane Doe',
  'O+',
  '1990-01-01',
  true,
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = CURRENT_TIMESTAMP;

-- Verify users were created
SELECT 
  email, 
  role, 
  full_name, 
  is_active,
  email_verified,
  created_at
FROM healthlink_users
ORDER BY created_at DESC;

-- SUCCESS! You can now login with:
-- Email: admin@healthlink.com  | Password: Password@123
-- Email: doctor@healthlink.com | Password: Password@123  
-- Email: patient@healthlink.com | Password: Password@123
