# Phase 1 Manual API Testing Guide

## Prerequisites
- Server running on http://localhost:4000
- Admin account created (or use existing credentials)

---

## Step 1: Health Check

```bash
curl http://localhost:4000/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "UP",
  "timestamp": "2025-12-27T...",
  "service": "healthlink-middleware-api"
}
```

---

## Step 2: Login as Admin

**Replace with your actual admin credentials:**

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@healthlink.com\",\"password\":\"YOUR_PASSWORD\"}"
```

**Save the `token` from the response.**

---

## Step 3: Test Pharmacy Registration

**Replace `YOUR_JWT_TOKEN` with the token from Step 2:**

```bash
curl -X POST http://localhost:4000/api/v1/pharmacy/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"HealthPlus Pharmacy\",\"licenseNumber\":\"PH-001\",\"address\":\"123 Main St\",\"phone\":\"555-0001\",\"email\":\"contact@healthplus.com\"}"
```

**Expected Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "HealthPlus Pharmacy",
    "licenseNumber": "PH-001",
    ...
  }
}
```

---

## Step 4: List Pharmacies

```bash
curl http://localhost:4000/api/v1/pharmacy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:** Array of pharmacies

---

## Step 5: Test Hospital Registration

```bash
curl -X POST http://localhost:4000/api/v1/hospital/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"City General Hospital\",\"registrationNumber\":\"HOS-001\",\"type\":\"Government\",\"address\":\"456 Hospital Rd\",\"phone\":\"555-0002\"}"
```

**Expected Response:** `201 Created`

---

## Step 6: Add Department to Hospital

**Replace `HOSPITAL_ID` with the ID from Step 5:**

```bash
curl -X POST http://localhost:4000/api/v1/hospital/HOSPITAL_ID/departments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Cardiology\",\"description\":\"Heart care department\"}"
```

---

## Step 7: Test Insurance Provider Registration

```bash
curl -X POST http://localhost:4000/api/v1/insurance/providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"HealthShield Insurance\",\"registrationNumber\":\"INS-001\",\"contactEmail\":\"claims@healthshield.com\",\"contactPhone\":\"555-0003\"}"
```

**Expected Response:** `201 Created`

---

## Step 8: List Insurance Providers

```bash
curl http://localhost:4000/api/v1/insurance/providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:** Array of insurance providers

---

## ✅ Success Criteria

All endpoints should return:
- ✅ `200 OK` or `201 Created` status codes
- ✅ Valid JSON responses
- ✅ No authentication errors

---

## 🔧 Troubleshooting

**401 Unauthorized:**
- Check JWT token is valid
- Verify token in Authorization header: `Bearer YOUR_TOKEN`

**403 Forbidden:**
- User doesn't have required role (admin)
- Check user role in database

**404 Not Found:**
- Feature flags not enabled
- Routes not mounted (check server logs)

**500 Internal Server Error:**
- Check server logs for details
- Verify database connection
- Ensure Prisma client is generated

---

## 📊 Verify in Database

```sql
-- Check created pharmacies
SELECT * FROM pharmacies;

-- Check created hospitals
SELECT * FROM hospitals;

-- Check departments
SELECT * FROM departments;

-- Check insurance providers
SELECT * FROM insurance_providers;
```

---

*Use these curl commands to manually test all Phase 1 APIs*
