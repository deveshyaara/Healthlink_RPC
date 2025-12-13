-- Fix healthlink_users table schema
-- Run this in Supabase SQL Editor: https://wpmgqueyuwuvdcavzthg.supabase.co

-- Add missing columns
ALTER TABLE healthlink_users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'healthlink_users'
ORDER BY ordinal_position;
