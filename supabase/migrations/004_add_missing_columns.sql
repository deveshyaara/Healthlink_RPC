-- Add all missing columns to users table for complete schema alignment
-- Run this in Supabase SQL Editor

-- Doctor-specific columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS doctor_hospital_affiliation VARCHAR(255);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS doctor_verification_status VARCHAR(50);

-- Patient-specific columns  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS patient_date_of_birth DATE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS patient_blood_group VARCHAR(10);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS patient_emergency_contact VARCHAR(20);

-- Common fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Update any NULL values for boolean fields
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL;
