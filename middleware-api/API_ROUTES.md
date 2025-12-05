# HealthLink Backend API Routes - Complete Structure

## 🔐 Authentication Endpoints (PRIORITY - NEEDED FOR FRONTEND)

**Base Path:** `/api/auth`

| Method | Endpoint | Description | Auth Required | Status |
|--------|----------|-------------|---------------|--------|
| POST | `/api/auth/register` | Register new user + blockchain identity | ❌ Public | ✅ Active |
| POST | `/api/auth/login` | Login with email/password, returns JWT | ❌ Public | ✅ Active |
| POST | `/api/auth/logout` | Logout (client-side token removal) | ✅ Private | ✅ Active |
| GET | `/api/auth/me` | Get current user profile | ✅ Private | ✅ Active |
| POST | `/api/auth/refresh` | Refresh JWT token | ✅ Private | ✅ Active |
| POST | `/api/auth/change-password` | Change user password | ✅ Private | ✅ Active |

### Frontend Integration

**Frontend Login Call:**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

**Frontend Register Call:**
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password, role })
});
```

**Proxy Flow:**
```
Browser → http://localhost:9002/api/auth/login
         ↓ (Next.js rewrites)
Backend → http://localhost:3000/api/auth/login
```

---

## 💾 Storage Endpoints (Content-Addressable Storage)

**Base Path:** `/api/storage`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/storage/upload` | Upload file, returns SHA-256 hash | ✅ Private |
| GET | `/api/storage/:hash` | Download file by hash | ✅ Private |
| GET | `/api/storage/:hash/metadata` | Get file metadata only | ✅ Private |
| GET | `/api/storage/admin/stats` | Storage statistics | ✅ Admin |
| DELETE | `/api/storage/:hash` | Delete file | ✅ Admin |

---

## 🏥 Healthcare Endpoints (Blockchain Transactions)

**Base Path:** `/api/v1` (versioned)

### Wallet Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/wallet/register` | Register new blockchain user |
| GET | `/api/v1/wallet/verify/:userId` | Verify user identity exists |

### Network Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/network/status` | Check Fabric network connectivity |
| GET | `/api/v1/network/health` | Detailed health metrics |

### Transaction Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/transaction/invoke` | Submit blockchain transaction |
| POST | `/api/v1/transaction/query` | Query blockchain data |

---

## 📊 System Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | System health check | ❌ Public |
| GET | `/api/v1` | API documentation/welcome | ❌ Public |

---

## 🔍 Request/Response Format

### Success Response (Standard Format)
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response (Standard Format)
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error message"
  }
}
```

---

## 🔐 Authentication Flow

1. **User Registers** → POST `/api/auth/register`
   - Creates user in `data/users.json`
   - Generates blockchain identity
   - Returns JWT token

2. **User Logs In** → POST `/api/auth/login`
   - Validates credentials
   - Returns JWT token

3. **Authenticated Requests** → Add header:
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```

4. **Token Verification** → Middleware `authenticateJWT`
   - Validates JWT signature
   - Checks expiration
   - Attaches user to `req.user`

---

## 🚨 Common Issues & Solutions

### Issue: `ECONNREFUSED` on `/api/auth/login`
**Cause:** Backend not running on port 3000  
**Solution:** Run `./start-backend.sh`

### Issue: `404 Not Found` on auth endpoints
**Cause:** Routes not registered in `server.js`  
**Solution:** Verify `app.use('/api/auth', authRoutes)` exists

### Issue: `401 Unauthorized` on protected routes
**Cause:** Missing or invalid JWT token  
**Solution:** Include `Authorization: Bearer <token>` header

### Issue: Proxy not forwarding requests
**Cause:** `next.config.ts` missing rewrites  
**Solution:** Verify `rewrites()` function returns proper mappings

---

## 📝 Environment Variables

```env
# Backend (.env in middleware-api/)
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FABRIC_NETWORK_NAME=test-network
CHANNEL_NAME=mychannel

# Frontend (.env.local in frontend/)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## ✅ Verification Commands

```bash
# 1. Check if backend is running
lsof -i :3000

# 2. Test health endpoint
curl http://localhost:3000/health

# 3. Test login endpoint (expect 401 for invalid credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# 4. Test register endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"newuser@test.com","password":"test123","role":"patient"}'

# 5. Run comprehensive health check
cd /workspaces/Healthlink_RPC/middleware-api
./test-backend.sh
```

---

## 🎯 Frontend API Client Usage

The frontend uses `/frontend/src/lib/api-client.ts` which automatically:
- Injects JWT tokens from localStorage
- Handles 401 errors (session expiry vs login failures)
- Proxies through Next.js rewrites

**Example usage in frontend components:**
```typescript
import { authApi } from '@/lib/api-client';

// Login
const { token, user } = await authApi.login({ email, password });

// Register
const { token, user } = await authApi.register({ name, email, password, role });
```

---

## 📍 File Locations

- **Backend Server:** `/workspaces/Healthlink_RPC/middleware-api/src/server.js`
- **Auth Routes:** `/workspaces/Healthlink_RPC/middleware-api/src/routes/auth.routes.js`
- **Auth Controller:** `/workspaces/Healthlink_RPC/middleware-api/src/controllers/auth.controller.js`
- **Frontend Config:** `/workspaces/Healthlink_RPC/frontend/next.config.ts`
- **API Client:** `/workspaces/Healthlink_RPC/frontend/src/lib/api-client.ts`

---

**Last Updated:** December 5, 2025
