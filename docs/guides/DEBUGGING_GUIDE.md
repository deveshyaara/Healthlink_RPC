# 🔍 HealthLink Registration Debugging Guide

## Problem: Frontend Sign Up Returns 500 Error

**Symptom**: Generic "500: HTTP 500" error when users try to sign up via Next.js frontend  
**Likely Cause**: Backend cannot find Admin Identity or fabric-config.js misconfiguration  
**Status**: Admin exists in wallet (verified) - likely CA connection or validation issue

---

## 📊 Task 1: Expose the Real Error

### Method 1: Real-Time Middleware Logs

The middleware server is running as process IDs: **74391, 74397, 84977**

```bash
# Watch the middleware log file in real-time
tail -f /workspaces/Healthlink_RPC/middleware-api/server.log

# Or watch with color highlighting
tail -f /workspaces/Healthlink_RPC/middleware-api/server.log | grep --color=always -E "error|Error|ERROR|failed|Failed|FAILED|exception|Exception"
```

### Method 2: Watch All Logs

```bash
# Watch all log files
tail -f /workspaces/Healthlink_RPC/middleware-api/logs/combined.log

# Watch only errors
tail -f /workspaces/Healthlink_RPC/middleware-api/logs/error.log
```

### Method 3: Direct Process Output (if started with nohup)

```bash
# If server was started with nohup
tail -f nohup.out

# Or check the server.log
cat /workspaces/Healthlink_RPC/middleware-api/server.log | tail -100
```

### 🔎 What to Look For in Logs

When you trigger the Sign Up request, look for these error patterns:

#### Identity Errors:
- ❌ `"Identity not found"` → Admin missing from wallet
- ❌ `"Identity for user admin not found"` → Admin enrollment needed
- ❌ `"Admin identity not found. Please enroll admin first"` → Run bootstrap_admin.js

#### CA (Certificate Authority) Errors:
- ❌ `"ECONNREFUSED"` → CA not running or wrong URL
- ❌ `"certificate verify failed"` → TLS certificate mismatch
- ❌ `"enrollment failed"` → Wrong admin credentials
- ❌ `"Calling register endpoint failed with error"` → CA registration issue

#### Validation Errors:
- ❌ `"Validation failed"` → Missing required fields in request body
- ❌ `"userId" is required` → Frontend not sending userId
- ❌ `"role" is required` → Missing role field

#### Configuration Errors:
- ❌ `"Cannot read property"` → fabric-config.js not loaded properly
- ❌ `"ENOENT: no such file or directory"` → Wallet or connection profile path wrong
- ❌ `"Failed to initialize wallet service"` → Wallet initialization failed

#### Discovery Errors:
- ❌ `"DiscoveryService: mychannel error: access denied"` → Discovery service issue
- ❌ `"Failed to initialize Fabric Gateway"` → Gateway connection issue

---

## 🧪 Task 2: Debug Registration Logic

### Run the Standalone Debug Script

```bash
cd /workspaces/Healthlink_RPC/middleware-api
node debug_register.js
```

### What the Script Does

1. ✅ Loads environment variables from `.env`
2. ✅ Resolves absolute paths for wallet and connection profile
3. ✅ Lists all identities in the wallet
4. ✅ Verifies admin identity exists
5. ✅ Tests CA client initialization
6. ✅ Attempts to register a test user
7. ✅ Prints full stack traces (bypasses global error handler)

### Expected Output (Success):

```
=============================================================
🔍 DEBUG: User Registration Flow
=============================================================

[1/7] Loading Environment Variables...
   WALLET_PATH: /workspaces/Healthlink_RPC/middleware-api/wallet
   CONNECTION_PROFILE: /workspaces/Healthlink_RPC/middleware-api/config/connection-profile.json
   ADMIN_USER_ID: admin
   MSP_ID: Org1MSP

[2/7] Checking Wallet Directory...
   Wallet exists: ✅ YES
   Wallet contains 3 identities:
      - admin.id
      - doctor1.id
      - nurse1.id

[3/7] Initializing Wallet...
   ✅ Wallet initialized

[4/7] Checking Admin Identity...
   ✅ Admin identity found: admin
      MSP ID: Org1MSP
      Type: X.509

[5/7] Loading Connection Profile...
   ✅ Connection profile loaded
   CA Name: ca-org1
   CA URL: https://localhost:7054

[6/7] Initializing CA Client...
   ✅ CA client initialized

[7/7] Testing User Registration...
   Test User ID: debug_user_1733056789123
   Building admin user context...
   ✅ Admin context created
   Registering user with CA...
   ✅ User registered, secret: aK9mX7...
   Enrolling user...
   ✅ User enrolled successfully
   Storing identity in wallet...
   ✅ Identity stored in wallet
   Location: /workspaces/Healthlink_RPC/middleware-api/wallet/debug_user_1733056789123.id

✅ SUCCESS: User registration completed!
   User ID: debug_user_1733056789123
   MSP ID: Org1MSP
   Type: X.509

=============================================================
✅ All Checks Passed - Registration Working!
=============================================================
```

### Expected Output (Failure - Admin Missing):

```
[4/7] Checking Admin Identity...
   ❌ CRITICAL: Admin identity "admin" NOT FOUND in wallet!
   Location checked: /workspaces/Healthlink_RPC/middleware-api/wallet/admin.id

   🔧 Fix: Run bootstrap_admin.js to enroll admin
```

### Expected Output (Failure - CA Connection):

```
❌ ERROR DETECTED
Error Type: Error
Error Message: Calling enroll endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054]

Full Stack Trace:
Error: Calling enroll endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054]
    at FabricCAClient.enroll (/workspaces/Healthlink_RPC/middleware-api/node_modules/fabric-ca-client/lib/FabricCAClient.js:315:11)
    ...

🔧 Common Fixes:
   1. Run: node bootstrap_admin.js (if admin missing)
   2. Check WALLET_PATH in .env matches actual wallet location
   3. Verify CONNECTION_PROFILE_PATH points to valid JSON
   4. Ensure Fabric CA is running: docker ps | grep ca
   5. Check middleware-api/logs/ for detailed errors
```

---

## 🔧 Task 3: Bootstrap Admin (If Missing)

### When to Use This

Run `bootstrap_admin.js` if:
- ✅ Admin identity is missing from wallet
- ✅ You changed the `WALLET_PATH` and need to re-enroll
- ✅ Admin identity is corrupted
- ✅ You get "Admin identity not found" errors

### Run Bootstrap Script

```bash
cd /workspaces/Healthlink_RPC/middleware-api
node bootstrap_admin.js
```

### What the Script Does

1. ✅ Checks if admin already exists (prevents accidental overwrite)
2. ✅ Creates wallet directory if missing
3. ✅ Connects to Fabric CA using connection profile
4. ✅ Enrolls admin with credentials (admin/adminpw)
5. ✅ Stores admin identity in wallet
6. ✅ Verifies the identity was stored correctly

### Expected Output (Success):

```
=============================================================
🔧 Bootstrap Admin Identity
=============================================================

📋 Configuration:
   Wallet Path: /workspaces/Healthlink_RPC/middleware-api/wallet
   Connection Profile: /workspaces/Healthlink_RPC/middleware-api/config/connection-profile.json
   Admin User ID: admin
   Admin Password: adm***
   MSP ID: Org1MSP

[1/5] Ensuring Wallet Directory Exists...
   ✅ Already exists: /workspaces/Healthlink_RPC/middleware-api/wallet

[2/5] Initializing Wallet...
   ✅ Wallet initialized

[3/5] Checking Existing Admin Identity...
   ✅ No existing admin found, proceeding with enrollment

[4/5] Initializing Certificate Authority Client...
   CA Name: ca-org1
   CA URL: https://localhost:7054
   ✅ CA client initialized

[5/5] Enrolling Admin User...
   Enrollment ID: admin
   Enrollment Secret: adminpw
   ✅ Enrollment successful
   Certificate length: 1024 chars
   Private key length: 1704 chars
   ✅ Identity stored in wallet
   Location: /workspaces/Healthlink_RPC/middleware-api/wallet/admin.id

=============================================================
✅ SUCCESS: Admin Bootstrap Complete!
=============================================================

   Admin User ID: admin
   MSP ID: Org1MSP
   Type: X.509
   Wallet Location: /workspaces/Healthlink_RPC/middleware-api/wallet

📝 Next Steps:
   1. Restart your middleware server
   2. Test registration: node debug_register.js
   3. Try signing up via frontend
```

### Expected Output (Admin Already Exists):

```
[3/5] Checking Existing Admin Identity...
   ⚠️  Admin identity already exists in wallet
   MSP ID: Org1MSP
   Type: X.509

   ❓ Do you want to re-enroll? This will replace the existing identity.
   If you want to continue, delete the existing admin.id file and re-run:
   rm /workspaces/Healthlink_RPC/middleware-api/wallet/admin.id
```

---

## 🚨 Common Scenarios & Solutions

### Scenario 1: Admin Exists but Registration Still Fails

**Symptoms**:
- ✅ Admin found in wallet
- ❌ Registration returns 500 error

**Debug Steps**:
```bash
# 1. Check CA is running
docker ps | grep ca-org1

# 2. Test CA connectivity
curl -k https://localhost:7054/cainfo

# 3. Run debug script to see exact error
node debug_register.js

# 4. Check validation schema in middleware
grep -r "userId.*required" src/middleware/validator.js
```

**Likely Causes**:
- Frontend not sending required fields (`userId`, `role`)
- CA connection timeout
- Wrong MSP ID in fabric-config.js
- Connection profile has wrong CA URL

### Scenario 2: Wallet Path Changed, Admin Missing

**Symptoms**:
- ❌ `"Admin identity not found"`
- You recently changed `WALLET_PATH` in `.env`

**Solution**:
```bash
# Option A: Copy old identities to new location
cp /old/wallet/path/*.id /workspaces/Healthlink_RPC/middleware-api/wallet/

# Option B: Re-enroll admin
node bootstrap_admin.js

# Option C: Update .env to point to old wallet
# Edit .env:
WALLET_PATH=/old/wallet/path
```

### Scenario 3: CA Connection Refused

**Symptoms**:
- ❌ `"ECONNREFUSED 127.0.0.1:7054"`
- ❌ `"connect ETIMEDOUT"`

**Debug Steps**:
```bash
# Check if CA container is running
docker ps | grep ca-org1

# Check CA logs
docker logs ca.org1.example.com

# Verify CA port
netstat -tuln | grep 7054

# Test CA endpoint
curl -k https://localhost:7054/cainfo
```

**Solutions**:
```bash
# If CA not running, restart network
cd /workspaces/Healthlink_RPC/fabric-samples/test-network
./network.sh up createChannel -ca

# If wrong port, update connection profile
# Edit config/connection-profile.json
{
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://localhost:7054"  # ← Verify this
    }
  }
}
```

### Scenario 4: Validation Error (Missing Fields)

**Symptoms**:
- ❌ `"Validation failed"`
- ❌ `"userId is required"`

**Solution**:
Check the registration validator schema:

```bash
# Find validator
cat src/middleware/validator.js | grep -A 10 "registerUser"

# Expected fields:
# - userId (string, required)
# - email (string, optional)
# - role (string, optional, default: 'client')
# - affiliation (string, optional)
```

Update frontend API call to include all required fields:

```typescript
// frontend/src/lib/api-client.ts
await apiClient.post('/wallet/register', {
  userId: email,  // ← Must be present
  email: email,
  role: 'client',
  affiliation: 'org1.department1'
});
```

---

## 📋 Quick Command Reference

### View Logs
```bash
# Real-time middleware logs
tail -f /workspaces/Healthlink_RPC/middleware-api/server.log

# Real-time error logs
tail -f /workspaces/Healthlink_RPC/middleware-api/logs/error.log

# Last 50 lines of combined logs
tail -50 /workspaces/Healthlink_RPC/middleware-api/logs/combined.log
```

### Debug Registration
```bash
# Run debug script
cd /workspaces/Healthlink_RPC/middleware-api
node debug_register.js

# Bootstrap admin if needed
node bootstrap_admin.js
```

### Check System State
```bash
# Check wallet contents
ls -la /workspaces/Healthlink_RPC/middleware-api/wallet/

# Check if middleware is running
ps aux | grep "[n]ode.*server.js"

# Check Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check CA specifically
docker ps | grep ca-org1

# Test CA connectivity
curl -k https://localhost:7054/cainfo
```

### Restart Middleware
```bash
# Kill existing processes
pkill -f "node.*server.js"

# Start fresh
cd /workspaces/Healthlink_RPC/middleware-api
nohup node src/server.js > server.log 2>&1 &

# Verify it started
tail -20 server.log
```

---

## 🎯 Troubleshooting Flowchart

```
Registration Fails (500 Error)
    │
    ├─→ Check Logs (tail -f server.log)
    │      │
    │      ├─→ "Admin identity not found"
    │      │      └─→ Run: node bootstrap_admin.js
    │      │
    │      ├─→ "ECONNREFUSED" or "CA connection failed"
    │      │      └─→ Check: docker ps | grep ca-org1
    │      │               └─→ Restart: cd test-network && ./network.sh up -ca
    │      │
    │      ├─→ "Validation failed" or "userId required"
    │      │      └─→ Check frontend payload includes userId
    │      │
    │      └─→ "Discovery error: access denied"
    │             └─→ Check connection profile paths
    │
    ├─→ Run Debug Script (node debug_register.js)
    │      │
    │      └─→ See detailed error with stack trace
    │
    └─→ Verify Configuration
           ├─→ .env has correct WALLET_PATH
           ├─→ CONNECTION_PROFILE_PATH points to valid JSON
           └─→ MSP_ID matches fabric network (Org1MSP)
```

---

## 📞 Support Commands

```bash
# Full system diagnostic
cd /workspaces/Healthlink_RPC
./status.sh

# Check all environment variables
cat middleware-api/.env

# Verify wallet exists and has identities
ls -lh middleware-api/wallet/

# Check connection profile
cat middleware-api/config/connection-profile.json | jq '.certificateAuthorities'

# Test admin enrollment manually
curl -X POST http://localhost:3000/api/v1/wallet/enroll-admin

# Test user registration via API
curl -X POST http://localhost:3000/api/v1/wallet/register \
  -H "Content-Type: application/json" \
  -d '{"userId":"testuser123","email":"test@example.com","role":"client"}'
```

---

**Created**: December 1, 2025  
**Purpose**: Debug frontend registration 500 errors after fabric-config.js refactoring  
**Status**: Admin verified present, likely CA connection or validation issue
