# Quick Reference: Auth & Fabric Fixes

## 🔥 Critical Fixes Applied

### 1. Frontend: Automatic JWT Token Injection
**File**: `/frontend/src/lib/api-client.ts`

```typescript
// ✅ NOW: All API calls automatically include Bearer token
async function apiRequest(endpoint, options = {}) {
  const { requiresAuth = true } = options; // ← DEFAULT: TRUE
  
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`; // ← AUTO-INJECTED
    }
  }
}
```

**Impact**: Zero code changes needed in pages - tokens attach automatically!

---

### 2. Backend: Fabric Discovery for Docker
**File**: `/middleware-api/src/services/fabricGateway.service.js`

```javascript
// ✅ CRITICAL FIX for "DiscoveryService: access denied" error
connectionOptions.discovery = {
  enabled: true,
  asLocalhost: true  // ← Required for Docker networks
};
```

**Why**: Maps container hostnames (`peer0.org1.example.com`) to `localhost`

---

### 3. Medical Records: Correct Parameter Mapping
**File**: `/middleware-api/src/config/routes.config.js`

```javascript
paramMapping: {
  patientId: 'body.patientId',  // ✅ Doctor specifies patient
  doctorId: 'user.userId',      // ✅ Auto-inject from JWT
  // ...
}
```

**Security**: Prevents doctors from spoofing their ID

---

## 🚀 How to Use

### Making API Calls (Frontend)
```typescript
// ❌ OLD WAY (manual token):
const data = await medicalRecordsApi.getAllRecords({ requiresAuth: true });

// ✅ NEW WAY (automatic):
const data = await medicalRecordsApi.getAllRecords();
// Token automatically attached!
```

### Uploading Records (Frontend)
```typescript
const recordData = {
  recordId: `record_${Date.now()}`,
  patientId: 'PAT001',        // ✅ Specify which patient
  recordType: 'lab-result',
  ipfsHash: 'QmXXX...',
  metadata: { description: '...' }
};

await medicalRecordsApi.createRecord(recordData);
// doctorId automatically injected from JWT
```

### Debugging Fabric Issues (Backend)
```bash
# Check server logs for discovery settings
tail -f middleware-api/server.log | grep -i discovery

# Expected output:
# Gateway connection options: { discovery: { enabled: true, asLocalhost: true } }
# Connected to channel: mychannel
```

---

## 🧪 Testing Checklist

- [ ] Login as patient → Dashboard loads without 401 errors
- [ ] Navigate to Records → Data appears (if exists)
- [ ] Check Network tab → All requests include `Authorization: Bearer ...`
- [ ] Login as doctor → Upload record → Success toast
- [ ] Check blockchain → Record exists with correct patientId/doctorId

---

## 🔍 Troubleshooting

### Still Getting 401 Errors?
1. Check localStorage for `auth_token`: `localStorage.getItem('auth_token')`
2. Verify token is valid JWT: Decode at jwt.io
3. Check middleware logs: Does it show "JWT validation failed"?

### Fabric "Access Denied" Error?
1. Verify channel exists: `docker exec peer0.org1.example.com peer channel list`
2. Check discovery settings in logs: Should show `asLocalhost: true`
3. Restart middleware API: `pkill node; node src/server.js`

### Record Upload Fails?
1. Verify user role is "doctor" or "admin": Check JWT payload
2. Ensure patientId is provided: Not null/undefined
3. Check chaincode logs: `docker logs dev-peer0.org1.example.com-patient-records_*`

---

## 📝 Key Files Reference

| File | Purpose | Critical Settings |
|------|---------|-------------------|
| `frontend/src/lib/api-client.ts` | API request handler | `requiresAuth: true` (default) |
| `middleware-api/src/services/fabricGateway.service.js` | Fabric connection | `asLocalhost: true` |
| `middleware-api/src/config/routes.config.js` | Endpoint mappings | `patientId: 'body.patientId'` |
| `middleware-api/src/config/fabric-config.js` | Fabric constants | `CHANNEL_NAME: 'mychannel'` |

---

## 🎯 Success Indicators

✅ **Working**: 
- Dashboard pages load with data (or empty state)
- Network tab shows `Authorization: Bearer ...` on all API calls
- Record upload shows success toast
- Server logs show "Connected to channel: mychannel"

❌ **Broken**:
- 401 errors on page load
- "DiscoveryService: access denied" in logs
- Record upload returns 500 error
- Empty Bearer token header in Network tab

---

**Quick Test Command**:
```bash
# Test full auth flow
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@test.com","password":"test123456"}' | jq -r '.data.token'

# Use token to fetch records
TOKEN="<paste_token_here>"
curl http://localhost:3000/api/v1/medical-records \
  -H "Authorization: Bearer $TOKEN"
```

If both return valid JSON (not errors), you're good! 🎉
