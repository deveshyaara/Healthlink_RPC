# Supabase Integration Guide - HealthLink Pro

**Version**: 2.0  
**Date**: December 5, 2025  
**Architecture**: Node.js + Hyperledger Fabric + Supabase (PostgreSQL)

---

## 🎯 Architecture Overview

### Data Separation Strategy

| Data Type | Storage Layer | Purpose |
|-----------|--------------|---------|
| **User Credentials** | Supabase (PostgreSQL) | Email, password hashes, profiles |
| **Medical Records** | Hyperledger Fabric | Patient records, prescriptions, consents |
| **Blockchain Identity** | Fabric CA | Enrollment IDs, certificates |
| **File Storage** | Content-Addressable Storage | Encrypted medical documents |

**Critical Rule**: ⚠️ **Medical data NEVER goes to Supabase** - only authentication metadata

---

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: v18+ (already installed)
3. **PostgreSQL Client**: psql or Supabase SQL Editor

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in details:
   - **Name**: `healthlink-pro`
   - **Database Password**: [Choose strong password]
   - **Region**: Select closest to your users
4. Wait 2 minutes for project creation

---

### Step 2: Get Supabase Credentials

1. In Supabase Dashboard → **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Service Role Key** (secret): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Important**: Use **Service Role Key**, NOT the `anon` public key

---

### Step 3: Run Database Schema

1. In Supabase Dashboard → **SQL Editor**
2. Copy contents of `middleware-api/supabase-schema.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Verify success message: "HealthLink Pro user schema created successfully!"

**Expected output**:
- `users` table created (15 columns)
- `user_audit_log` table created
- `users_safe` view created (excludes password_hash)
- Default admin user inserted

---

### Step 4: Configure Environment Variables

1. Open `.env` file in `middleware-api/` directory
2. Add these lines:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration (keep existing or update)
JWT_SECRET=healthlink-secret-key-change-in-production
JWT_EXPIRY=24h
```

3. **For production**: Generate secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Step 5: Install Dependencies

```bash
cd /workspaces/Healthlink_RPC/middleware-api
npm install @supabase/supabase-js bcryptjs
```

**Already done!** ✅

---

### Step 6: Test Connection

1. Start the middleware API:
```bash
cd /workspaces/Healthlink_RPC
./start.sh
```

2. Check logs for:
```
✅ Supabase database connected successfully
✅ Auth service using Supabase database
```

3. If you see this instead:
```
⚠️  Supabase credentials not configured - running in legacy mode
```
**Action**: Double-check `.env` file and restart server

---

## 🧪 Testing the Integration

### Test 1: Register New User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Doctor",
    "email": "testdoctor@healthlink.com",
    "password": "SecurePass123",
    "role": "doctor"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "testdoctorhealthlinkcom",
      "name": "Test Doctor",
      "email": "testdoctor@healthlink.com",
      "role": "doctor"
    }
  }
}
```

---

### Test 2: Login with New User

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testdoctor@healthlink.com",
    "password": "SecurePass123"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "testdoctorhealthlinkcom",
      "name": "Test Doctor",
      "email": "testdoctor@healthlink.com",
      "role": "doctor"
    }
  }
}
```

---

### Test 3: Get User Profile

```bash
TOKEN="your-jwt-token-from-login"

curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "testdoctorhealthlinkcom",
      "name": "Test Doctor",
      "email": "testdoctor@healthlink.com",
      "role": "doctor"
    }
  }
}
```

---

### Test 4: Verify Database Record

1. Go to Supabase Dashboard → **Table Editor** → `users`
2. Find the row for `testdoctor@healthlink.com`
3. Verify columns:
   - ✅ `email`: testdoctor@healthlink.com
   - ✅ `role`: doctor
   - ✅ `fabric_enrollment_id`: testdoctorhealthlinkcom
   - ✅ `password_hash`: starts with `$2a$10$` (bcrypt format)
   - ✅ `is_active`: true
   - ✅ `created_at`: timestamp

---

## 🔐 Security Best Practices

### 1. Environment Variables

**Never commit to Git**:
```bash
# Add to .gitignore
.env
.env.local
.env.production
```

**For production deployment**:
- Use secure environment variable injection (Docker secrets, Kubernetes secrets)
- Rotate `SUPABASE_SERVICE_KEY` periodically
- Use different JWT secrets per environment

---

### 2. Password Requirements

**Current**: Minimum 6 characters (adjust in `auth.controller.js`)

**Recommended for production**:
```javascript
// Strong password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  throw new Error('Password must be 8+ chars with uppercase, lowercase, number, and special char');
}
```

---

### 3. Row Level Security (RLS)

**Already configured in schema** ✅:
- Users can only read their own data
- Service role (backend) bypasses RLS
- Admins need separate policy (add if needed)

**To add admin policy**:
```sql
CREATE POLICY users_admin_access
  ON users
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );
```

---

### 4. Audit Logging

**Already implemented** ✅:
- All logins logged to `user_audit_log` table
- Tracks IP address and user agent (if provided)
- Password changes logged

**View audit logs in Supabase**:
```sql
SELECT 
  u.email,
  ual.action,
  ual.created_at
FROM user_audit_log ual
JOIN users u ON ual.user_id = u.id
ORDER BY ual.created_at DESC
LIMIT 20;
```

---

## 🔄 Migration from Legacy File Storage

### Current Behavior

**Automatic fallback** ✅:
- If Supabase credentials missing → uses `data/users.json` (legacy mode)
- If Supabase configured → uses PostgreSQL
- No data loss during transition

---

### Migrate Existing Users

If you have users in `data/users.json`:

```javascript
// Run this script once: middleware-api/scripts/migrate-users.js
import fs from 'fs/promises';
import dbService from '../src/services/db.service.js';

const migrateUsers = async () => {
  await dbService.initialize();
  
  const data = await fs.readFile('./data/users.json', 'utf-8');
  const { users } = JSON.parse(data);
  
  for (const user of users) {
    try {
      await dbService.supabase.from('users').insert({
        email: user.email,
        password_hash: user.passwordHash, // Already hashed
        role: user.role,
        fabric_enrollment_id: user.userId,
        full_name: user.name,
        is_active: user.isActive,
      });
      console.log(`✅ Migrated: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed: ${user.email}`, error.message);
    }
  }
};

migrateUsers();
```

---

## 🐛 Troubleshooting

### Issue 1: "Database not connected"

**Symptom**: API returns "Database not connected" error

**Solution**:
1. Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Restart middleware API: `./stop.sh && ./start.sh`
3. Check logs for connection errors

---

### Issue 2: "User with this email already exists"

**Symptom**: Registration fails with 409 error

**Solution**:
1. Email already registered - try login instead
2. Check Supabase Dashboard → Table Editor → `users`
3. Delete duplicate if needed (use Supabase UI)

---

### Issue 3: "Invalid or expired token"

**Symptom**: `/api/auth/me` returns 401 error

**Solution**:
1. Token expired (default: 24 hours)
2. JWT secret changed (invalidates all tokens)
3. Get new token via `/api/auth/login`

---

### Issue 4: Schema Creation Failed

**Symptom**: SQL script errors in Supabase SQL Editor

**Solution**:
1. Drop existing tables: `DROP TABLE users CASCADE;`
2. Re-run schema from `supabase-schema.sql`
3. Check for syntax errors (copy-paste issues)

---

## 📊 Database Schema Reference

### `users` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | VARCHAR(255) | Unique email address |
| `password_hash` | TEXT | Bcrypt hashed password |
| `role` | VARCHAR(50) | patient, doctor, admin, government |
| `fabric_enrollment_id` | VARCHAR(255) | Hyperledger Fabric user ID |
| `full_name` | VARCHAR(255) | User's full name |
| `phone_number` | VARCHAR(20) | Contact number (optional) |
| `avatar_url` | TEXT | Profile picture URL (optional) |
| `doctor_*` | Various | Doctor-specific fields (NULL for non-doctors) |
| `patient_*` | Various | Patient-specific fields (NULL for non-patients) |
| `is_active` | BOOLEAN | Account status |
| `email_verified` | BOOLEAN | Email verification status |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last profile update |
| `last_login_at` | TIMESTAMP | Last successful login |

---

### `user_audit_log` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `user_id` | UUID | Foreign key to users.id |
| `action` | VARCHAR(50) | login, logout, password_changed, etc. |
| `ip_address` | INET | Client IP address |
| `user_agent` | TEXT | Browser user agent |
| `created_at` | TIMESTAMP | Event timestamp |

---

## 🎓 Best Practices Summary

✅ **DO**:
- Use Supabase for user authentication only
- Store medical records on Hyperledger Fabric
- Use strong JWT secrets (64+ characters)
- Enable RLS policies in production
- Log authentication events for compliance
- Rotate credentials regularly

❌ **DON'T**:
- Store medical records in Supabase
- Commit `.env` files to Git
- Use default JWT secret in production
- Share `SUPABASE_SERVICE_KEY` publicly
- Disable RLS without proper authorization

---

## 📞 Support & Next Steps

**Documentation**:
- Supabase Docs: https://supabase.com/docs
- Bcrypt Docs: https://www.npmjs.com/package/bcryptjs
- JWT Docs: https://jwt.io

**Next Features** (Future):
- Email verification flow
- Password reset via email
- OAuth integration (Google, Microsoft)
- Multi-factor authentication (MFA)
- Session management dashboard

---

**Integration Complete!** 🎉

Your HealthLink Pro now has:
- ✅ Persistent user storage (Supabase PostgreSQL)
- ✅ Secure password hashing (bcrypt)
- ✅ JWT-based authentication
- ✅ Audit logging
- ✅ Fallback to file storage if Supabase unavailable
- ✅ Strict separation: Users in Supabase, Medical data on Fabric

**Status**: Production-Ready
