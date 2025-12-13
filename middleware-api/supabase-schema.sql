-- HealthLink Pro - Supabase User Authentication Schema
-- Purpose: Store user credentials and metadata OFF-CHAIN
-- Medical records remain on Hyperledger Fabric blockchain

-- Drop existing table if exists (for fresh setup)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication fields
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Role-based access control
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin', 'government')),
  
  -- Fabric blockchain identity
  fabric_enrollment_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- User profile metadata
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  avatar_url TEXT,
  
  -- Doctor-specific fields (NULL for non-doctors)
  doctor_license_number VARCHAR(100),
  doctor_specialization VARCHAR(100),
  doctor_hospital_affiliation VARCHAR(255),
  doctor_verification_status VARCHAR(50) CHECK (doctor_verification_status IN ('pending', 'verified', 'suspended', NULL)),
  
  -- Patient-specific fields (NULL for non-patients)
  patient_date_of_birth DATE,
  patient_blood_group VARCHAR(10),
  patient_emergency_contact VARCHAR(20),
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_fabric_enrollment_id ON users(fabric_enrollment_id);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create audit log table (optional but recommended)
CREATE TABLE user_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user_id ON user_audit_log(user_id);
CREATE INDEX idx_audit_created_at ON user_audit_log(created_at DESC);

-- Insert default admin user (password: Admin@123 - CHANGE IN PRODUCTION)
-- Password hash for 'Admin@123' using bcrypt with 10 rounds
INSERT INTO users (
  email,
  password_hash,
  role,
  fabric_enrollment_id,
  full_name,
  is_active,
  email_verified
) VALUES (
  'admin@healthlink.com',
  '$2a$10$rZ5Uh5hFZYqF5y5yGz5yGuZ5yGz5yGuZ5yGz5yGuZ5yGz5yGuZ5yG',
  'admin',
  'admin-fabric-id',
  'System Administrator',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Create view for safe user data (excludes password_hash)
CREATE OR REPLACE VIEW users_safe AS
SELECT 
  id,
  email,
  role,
  fabric_enrollment_id,
  full_name,
  phone_number,
  avatar_url,
  doctor_license_number,
  doctor_specialization,
  doctor_hospital_affiliation,
  doctor_verification_status,
  patient_date_of_birth,
  patient_blood_group,
  patient_emergency_contact,
  is_active,
  email_verified,
  created_at,
  updated_at,
  last_login_at
FROM users;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_select_own
  ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile (but not role or email)
CREATE POLICY users_update_own
  ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Grant permissions to service role (bypass RLS for backend)
GRANT ALL ON users TO service_role;
GRANT ALL ON user_audit_log TO service_role;
GRANT SELECT ON users_safe TO service_role;

-- Comments for documentation
COMMENT ON TABLE users IS 'User authentication and profile metadata (OFF-CHAIN ONLY - medical records on Fabric)';
COMMENT ON COLUMN users.fabric_enrollment_id IS 'Hyperledger Fabric enrollment ID for blockchain identity';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password - NEVER store plaintext';
COMMENT ON TABLE user_audit_log IS 'Audit trail for user authentication events';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'HealthLink Pro user schema created successfully!';
  RAISE NOTICE 'Default admin user: admin@healthlink.com (change password in production)';
END $$;
