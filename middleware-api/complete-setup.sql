-- Complete HealthLink Database Setup
-- Run this ENTIRE file in Supabase SQL Editor

-- Step 1: Add missing columns to existing table
ALTER TABLE healthlink_users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Insert test users (password for all: Password@123)
-- Note: Using ON CONFLICT to avoid duplicate errors if users exist

INSERT INTO healthlink_users (
  email, password_hash, role, fabric_enrollment_id, full_name, 
  phone_number, email_verified, is_active
) VALUES 
  (
    'admin@healthlink.com',
    '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
    'admin',
    'admin-fabric-001',
    'System Administrator',
    '+1234567890',
    true,
    true
  ),
  (
    'doctor@healthlink.com',
    '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
    'doctor',
    'doctor-fabric-001',
    'Dr. John Smith',
    '+1234567891',
    true,
    true
  ),
  (
    'patient@healthlink.com',
    '$2b$10$99xbnfU2aQfv99XcIzD.3u8huM6euG6asCIxhjFbXwu7F1eExvxlG',
    'patient',
    'patient-fabric-001',
    'Jane Doe',
    '+1234567892',
    true,
    true
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  fabric_enrollment_id = EXCLUDED.fabric_enrollment_id,
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  email_verified = EXCLUDED.email_verified,
  is_active = EXCLUDED.is_active;

-- Step 3: Verify setup
SELECT 
  email, role, full_name, email_verified, is_active, created_at
FROM healthlink_users
ORDER BY created_at;
