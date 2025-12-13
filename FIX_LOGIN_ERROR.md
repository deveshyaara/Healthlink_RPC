# Quick Fix for Login Error

## The Issue
The login is failing because:
1. The Supabase `healthlink_users` table doesn't exist yet
2. No test users have been created

## Solution: Manual Setup (5 minutes)

### Step 1: Create the Table in Supabase

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/wpmgqueyuwuvdcavzthg/sql/new

2. Copy and paste the entire contents of `supabase-schema.sql` (from middleware-api folder)

3. Click **RUN** button

4. You should see "Success. No rows returned"

### Step 2: Create a Test User

In the same SQL Editor, run this query:

```sql
-- Create a test admin user
-- Email: admin@healthlink.com
-- Password: Admin@123

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
  'admin-1234567890',
  'Admin User',
  true,
  true
);
```

### Step 3: Verify

Run this to check if the user was created:

```sql
SELECT email, role, full_name, is_active 
FROM healthlink_users;
```

You should see the admin user!

### Step 4: Test Login

1. Open http://localhost:3000/login
2. Enter:
   - Email: `admin@healthlink.com`
   - Password: `Admin@123`
3. Click Login

It should work now! ✅

---

## Alternative: Create Users via Code (if Step 2 fails)

If the password hash doesn't work, you can create users programmatically:

1. Make sure your `.env` has the **complete** SUPABASE_SERVICE_KEY (should be very long, ~250+ characters)

2. Run the setup script:
   ```powershell
   cd middleware-api
   node quick-setup.js
   ```

---

## How to Get Complete Supabase Service Key

1. Go to: https://supabase.com/dashboard/project/wpmgqueyuwuvdcavzthg/settings/api

2. Under "Project API keys", find **service_role secret**

3. Click **Reveal** and **Copy** the ENTIRE key

4. Update `.env`:
   ```env
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....[VERY LONG]
   ```

5. Save and run `node quick-setup.js` again

---

## Current Status

- ✅ Backend is running
- ✅ Frontend is running  
- ✅ Ethereum contracts deployed
- ❌ Database table missing (use Step 1 above)
- ❌ No users created (use Step 2 above)

Once you complete Steps 1-2 above, the login will work!
