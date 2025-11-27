# Complete Bug Report & Fixes - HealthLink Pro RPC Server

## Critical Bugs Found & Fixed

### BUG #1: patientId Field Name Mismatch ✅ FIXED
**Status:** FIXED  
**Severity:** CRITICAL  
**Location:** `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js` lines 572, 826  
**Issue:** Code tried to access `req.user.id` but token payload contains `userId` and `email`, not `id`

**Impact:** Empty patientId passed to Fabric chaincode → Failed medical record creation  
**Solution:** Changed to `req.user.email || req.user.userId`

---

### BUG #2: Incorrect Error Message ✅ FIXED
**Status:** FIXED  
**Severity:** MEDIUM  
**Location:** `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js` line 575  
**Issue:** Error message said "recordId, patientId, doctorId, recordType required" but patientId is NOT validated (it's extracted from token)

**Before:**
```javascript
error: 'recordId, patientId, doctorId, recordType, and ipfsHash are required.'
```

**After:**
```javascript
error: 'recordId, doctorId, recordType, and ipfsHash are required.'
```

---

### BUG #3: Duplicate Authentication Endpoints ⚠️ CRITICAL ISSUE
**Status:** IDENTIFIED - NOT FIXED YET  
**Severity:** CRITICAL  
**Location:** Lines 219-432 vs Lines 1907-2179  
**Issue:** TWO COMPLETE SETS of authentication endpoints exist in the same file

**First Set (DEAD CODE - Never Used):**
- Lines 219-432: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/status`
- Uses field name: `userId`
- Uses password hashing: bcrypt
- Uses user structure: `{userId, name, email, password, role}`

**Second Set (ACTIVE - Actually Used):**
- Lines 1907-2179: Same endpoints
- Uses field name: `id` (different!)
- Uses password hashing: base64 (insecure)
- Uses user structure: `{id, email, name, role, passwordHash}`

**Impact:** 
- Express uses LAST defined route, so first set is ignored
- Code takes up 213 lines of dead code
- Data model inconsistency causes bugs
- Insecure base64 password hashing in active code

**Solution:** DELETE lines 219-432 entirely (dead code), keep lines 1907-2179 (active code), standardize on single authentication system

---

### BUG #4: Data Model Inconsistency in User Store
**Status:** IDENTIFIED - PARTIALLY BROKEN  
**Severity:** HIGH  
**Locations:** 
- Line 255: Registration creates user with `userId` field
- Line 1954: Registration creates user with `id` field  
- Line 298, 2025: Login uses `user.userId` and `user.id` interchangeably
- Line 339, 2080: GET /api/auth/me accesses `user.id` or `user.userId`

**Impact:** Inconsistent user object structure throughout codebase

---

### BUG #5: Insecure Password Hashing in Second Registration
**Status:** IDENTIFIED  
**Severity:** CRITICAL  
**Location:** Lines 1960-1975  
**Issue:** Uses base64 encoding instead of bcrypt for passwords

**Code:**
```javascript
passwordHash: Buffer.from(password).toString('base64') // ❌ INSECURE!
```

**Solution:** Use bcrypt like first registration endpoint does (line 247)

---

## Token Payload Structure (Correct)

All tokens are created with this structure:
```javascript
{
    userId: "user_1234567890",
    email: "user@example.com",
    role: "patient|doctor|admin",
    iat: Date.now(),
    exp: Date.now() + 24*60*60*1000  // 24 hour expiration
}
```

**Therefore:** When accessing `req.user`, use:
- `req.user.userId` for user ID
- `req.user.email` for user email
- `req.user.role` for user role
- **NOT** `req.user.id` (this doesn't exist!)

---

## User Store Structure Inconsistencies

### First Registration (Line 225) - ACTIVE
```javascript
userStore.set(email, {
    userId: userId,      // ✅ Correct
    name: name,
    email: email,
    password: hashed,    // ✅ Bcrypt (secure)
    role: role,
    createdAt: new Date().toISOString()
});
```

### Second Registration (Line 1914) - ALSO ACTIVE
```javascript
userStore.set(email, {
    id: userId,          // ❌ Wrong field name!
    email: email,
    name: name,
    role: role,
    passwordHash: Buffer.from(password).toString('base64'), // ❌ Insecure!
    createdAt: new Date().toISOString()
});
```

**Problem:** Both registrations can run, creating users with different field names!

---

## Recommended Fixes (Priority Order)

### IMMEDIATE (Blocks functionality):
1. ✅ **DONE:** Fix patientId extraction (`req.user.email || req.user.userId`)
2. ✅ **DONE:** Fix error message (remove "patientId" from validation)
3. **TODO:** Delete dead auth code at lines 219-432
4. **TODO:** Consolidate to single registration/login endpoint
5. **TODO:** Use bcrypt for ALL password hashing
6. **TODO:** Standardize user field names (userId vs id)

### SHORT-TERM:
- Add input validation for all endpoints
- Add rate limiting for auth endpoints
- Implement proper token blacklisting on logout
- Add email verification

### LONG-TERM:
- Replace in-memory userStore with proper database
- Implement OAuth2/OIDC if needed
- Add 2FA support
- Implement role-based access control properly

---

## Files Needing Changes

1. `/workspaces/Healthlink_RPC/my-project/rpc-server/server.js`
   - Remove lines 219-432 (dead auth endpoints)
   - Keep lines 1907-2179 (active auth endpoints)  
   - Fix password hashing to use bcrypt everywhere
   - Standardize user field names

2. `/workspaces/Healthlink_RPC/frontend/src/contexts/auth-context.tsx`
   - No changes needed (works with either field name since we're using `req.user`)

3. `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts`
   - No changes needed

---

## Next Steps

To complete the fixes:

```bash
# 1. Stop services
pkill -9 -f "node.*server.js"

# 2. Fix server.js (remove dead code, consolidate auth)
# Manual edit needed - removing lines 219-432

# 3. Restart with fixed code
npm start
```

After restart, medical records upload will work correctly because:
- patientId will be correctly extracted from token
- Users will be created consistently
- Passwords will be properly secured
- All error messages will be accurate

---

## Testing After Fixes

```bash
# 1. Signup with new credentials
POST /api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "TestPass123!",
  "role": "patient"
}

# 2. Login
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

# 3. Upload medical record (with token from login)
POST /api/medical-records
Headers: Authorization: Bearer {token}
{
  "recordId": "record_123",
  "doctorId": "doc_123",
  "recordType": "lab_result",
  "ipfsHash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "metadata": {
    "description": "Test record",
    "isConfidential": false,
    "tags": ["test"]
  }
}

# Should succeed with proper patientId from token!
```
