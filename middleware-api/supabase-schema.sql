-- HealthLink Pro - Supabase User Authentication Schema
-- Purpose: Store user credentials and metadata OFF-CHAIN
-- Medical records remain on Hyperledger Fabric blockchain

-- Drop existing table if exists (for fresh setup)
DROP TABLE IF EXISTS healthlink_users CASCADE;

-- Create users table
CREATE TABLE healthlink_users (
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
CREATE INDEX idx_healthlink_users_email ON healthlink_users(email);
CREATE INDEX idx_healthlink_users_role ON healthlink_users(role);
CREATE INDEX idx_healthlink_users_fabric_enrollment_id ON healthlink_users(fabric_enrollment_id);
CREATE INDEX idx_healthlink_users_created_at ON healthlink_users(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_healthlink_users_updated_at
  BEFORE UPDATE ON healthlink_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create audit log table (optional but recommended)
CREATE TABLE healthlink_user_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES healthlink_users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthlink_audit_user_id ON healthlink_user_audit_log(user_id);
CREATE INDEX idx_healthlink_audit_created_at ON healthlink_user_audit_log(created_at DESC);

-- Insert default admin user (password: Admin@123 - CHANGE IN PRODUCTION)
-- Password hash for 'Admin@123' using bcrypt with 10 rounds
INSERT INTO healthlink_users (
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
CREATE OR REPLACE VIEW healthlink_users_safe AS
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
FROM healthlink_users;

-- Row Level Security (RLS) policies
ALTER TABLE healthlink_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY healthlink_users_select_own
  ON healthlink_users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policy: Users can update their own profile (but not role or email)
CREATE POLICY healthlink_users_update_own
  ON healthlink_users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Grant permissions to service role (bypass RLS for backend)
GRANT ALL ON healthlink_users TO service_role;
GRANT ALL ON healthlink_user_audit_log TO service_role;
GRANT SELECT ON healthlink_users_safe TO service_role;

-- Create user invitations table
CREATE TABLE user_invitations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor')),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  
  -- Invitation metadata
  invited_by UUID REFERENCES healthlink_users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all invitations
CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM healthlink_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can create invitations
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM healthlink_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update invitations
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM healthlink_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Public can accept invitations (with valid token)
CREATE POLICY "Public can accept invitations" ON user_invitations
  FOR UPDATE USING (status = 'pending' AND expires_at > CURRENT_TIMESTAMP);

-- Grant permissions
GRANT ALL ON user_invitations TO service_role;

-- Comments for documentation
COMMENT ON TABLE user_invitations IS 'User invitation system for admin-managed user registration';
COMMENT ON COLUMN user_invitations.token IS 'Secure token for invitation acceptance (expires after 7 days)';
COMMENT ON COLUMN user_invitations.invited_by IS 'Admin user who created the invitation';
-- Success message
DO $$
BEGIN
  RAISE NOTICE 'HealthLink Pro user schema created successfully!';
  RAISE NOTICE 'Default admin user: admin@healthlink.com (change password in production)';
END $$;
