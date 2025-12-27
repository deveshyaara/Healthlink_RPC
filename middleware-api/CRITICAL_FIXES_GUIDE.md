# Critical Fixes - Quick Start Guide

**Status**: 🔴 **URGENT - Run Immediately**  
**Estimated Time**: 5 minutes  
**Impact**: Unblocks Phase 1 user creation

---

## 🚨 Step 1: Apply Database Fixes (2 minutes)

### Option A: Using psql (Recommended)
```bash
# Navigate to middleware-api directory
cd c:\Users\deves\OneDrive\Desktop\HealthLink\Healthlink_RPC\middleware-api

# Connect to your database and run the migration
psql -U your_username -d your_database -f critical_fixes.sql
```

### Option B: Using Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `critical_fixes.sql`
3. Click "Run"
4. Verify success messages

### Option C: Using Database GUI
1. Open your PostgreSQL client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute `critical_fixes.sql`
4. Check for success messages

---

## 📝 Step 2: Update Prisma Schema (1 minute)

```bash
# Navigate to middleware-api directory
cd middleware-api

# Pull latest schema from database
npx prisma db pull

# Generate Prisma client with new schema
npx prisma generate
```

**Expected Output**:
```
✔ Introspected 16 models and wrote them into prisma/schema.prisma
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

---

## 🔧 Step 3: Update .env File (30 seconds)

Add the following to your `.env` file:

```env
# Phase 1: Smart Contract Addresses
INSURANCE_CLAIMS_CONTRACT_ADDRESS=0x1fC58daaA71ebaBE83784859FC9375FbF1d1137F

# Security: CORS Whitelist (update with your frontend URL)
ALLOWED_ORIGINS=http://localhost:9002,https://your-production-domain.com

# Rate Limiting
ENABLE_RATE_LIMITING=true
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

---

## 🔄 Step 4: Restart Backend Server (10 seconds)

### Stop the current server:
- Press `Ctrl+C` in the terminal running `npm run dev`

### Start with updated schema:
```bash
npm run dev
```

**Expected Output**:
```
✅ Database connected
✅ Prisma client initialized
📋 Feature Flags Status:
   PHARMACY: enabled
   HOSPITAL: enabled
   INSURANCE: enabled
🚀 Server running on port 4000
```

---

## ✅ Step 5: Verify Fixes (1 minute)

### Test 1: Create Pharmacist User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacist@test.com",
    "password": "Test123!@#",
    "fullName": "Test Pharmacist",
    "role": "pharmacist"
  }'
```

**Expected**: ✅ Success (200 OK)

### Test 2: Check New Indexes

```sql
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
```

**Expected**: ✅ 30+ indexes

### Test 3: Verify Dispensing Table

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'prescription_dispensing';
```

**Expected**: ✅ Table exists

---

## 📊 What Was Fixed

### 1. ✅ User Roles Constraint
**Before**: Only `patient`, `doctor`, `admin` allowed  
**After**: Added `pharmacist`, `hospital_admin`, `insurance`, `lab`, `government`  
**Impact**: Can now create users with Phase 1 roles

### 2. ✅ Performance Indexes (30 indexes added)
**Tables optimized**:
- users (4 indexes)
- appointments (4 indexes)
- prescriptions (4 indexes)
- insurance_claims (4 indexes)
- insurance_policies (3 indexes)
- drug_inventory (4 indexes)
- departments (1 index)
- audit logs (6 indexes)

**Impact**: 10-100x faster queries on large datasets

### 3. ✅ Prescription Dispensing Table
**Purpose**: Track pharmacy dispensing activity  
**Fields**: prescription_id, pharmacy_id, dispensed_by, quantity, notes  
**Impact**: Complete audit trail for prescription fulfillment

---

## 🎯 Next Steps After Fixes

### Immediate (Today)
1. **Create test users** for all roles
2. **Test all Phase 1 features**:
   - Pharmacy QR scanning
   - Hospital department management
   - Insurance claim submission
3. **Monitor logs** for errors

### This Week
4. Implement 2FA (see `production_roadmap.md` Phase 2A)
5. Add rate limiting to auth endpoints
6. Set up error tracking (Sentry)

### Next Week
7. Write API tests (Jest + Supertest)
8. Add input validation (express-validator)
9. Configure monitoring

---

## ⚠️ Troubleshooting

### Issue: "Permission denied for schema public"
**Solution**: Run as database owner or superuser

### Issue: "Relation already exists"
**Solution**: Indexes use `IF NOT EXISTS` - safe to re-run

### Issue: "Prisma generate fails"
**Solution**: 
```bash
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Issue: "Server won't start after fixes"
**Solution**: Check logs for specific error
```bash
npm run dev 2>&1 | tee server.log
```

---

## 📞 Need Help?

Check these files for details:
- `production_roadmap.md` - Complete feature roadmap
- `phase1_migration.sql` - Original Phase 1 migration
- `PHASE1_SUCCESS.md` - Phase 1 completion guide

---

## ✅ Success Checklist

- [ ] SQL migration executed successfully
- [ ] Prisma schema pulled and generated
- [ ] .env file updated
- [ ] Server restarted
- [ ] Pharmacist user created successfully
- [ ] Indexes verified (30+ total)
- [ ] Dispensing table exists
- [ ] No errors in server logs

**Once all checked**: ✅ Ready to proceed with Phase 2!

---

*Critical Fixes Guide | December 27, 2025*
