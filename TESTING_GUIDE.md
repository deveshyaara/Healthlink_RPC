# 🧪 Application Testing Guide

## Quick Test Commands

### 1. Test Backend

```powershell
cd middleware-api
npm start
```

**Expected Output:**
- ✅ Prisma Client connected
- ✅ Database connected
- ✅ Ethereum service initialized
- ✅ Server started on port 4000

**If errors occur:**
- Check DATABASE_URL is set correctly
- Verify tables exist (run verification script)
- Check backend logs for specific errors

### 2. Test Frontend

```powershell
cd frontend
npm run dev
```

**Expected:**
- Frontend loads at http://localhost:3000
- No console errors
- Can access login page

### 3. Test Database Connection

```powershell
cd middleware-api
$env:DATABASE_URL = (Get-Content ".env" | Select-String "^DATABASE_URL=" | Select-Object -First 1).ToString().Split('=', 2)[1]
node scripts/verify-database-tables.mjs
```

---

## Role-Based Testing

### Patient Role Test

1. **Login:**
   - Use patient credentials
   - Should redirect to patient dashboard

2. **Dashboard:**
   - Should show appointments (if any)
   - Should show medical records (if any)
   - Should show prescriptions (if any)

3. **View Records:**
   - Navigate to Records page
   - Should list patient's medical records
   - Should show record details

4. **View Appointments:**
   - Navigate to Appointments
   - Should show patient's appointments

### Doctor Role Test

1. **Login:**
   - Use doctor credentials
   - Should redirect to doctor dashboard

2. **View Patients:**
   - Navigate to Patients page
   - Should show list of patients created by doctor
   - Should allow creating new patient

3. **Create Patient:**
   - Click "Create Patient"
   - Fill in patient details
   - Submit
   - Should create entry in `patient_wallet_mappings`
   - Should create patient on blockchain

4. **Create Appointment:**
   - Select a patient
   - Create appointment
   - Should save to `appointments` table

5. **Create Medical Record:**
   - Select a patient
   - Upload/create record
   - Should save to `medical_records` table
   - Should store on blockchain (IPFS)

### Admin Role Test

1. **Login:**
   - Use admin credentials
   - Should redirect to admin dashboard

2. **View Users:**
   - Navigate to Users page
   - Should show all users from `users` table

3. **Create Invitation:**
   - Navigate to Invitations
   - Create new invitation
   - Should save to `user_invitations` table

4. **View Audit Logs:**
   - Should show audit logs from `user_audit_log` table

---

## Database-Chain Integration Test

### Test Patient Creation Flow

1. **Doctor creates patient:**
   - Doctor logs in
   - Creates new patient with email and name
   - **Expected:**
     - Entry created in `patient_wallet_mappings` table
     - Patient created on blockchain
     - Wallet address generated/linked

2. **Verify in database:**
   ```sql
   SELECT * FROM patient_wallet_mappings WHERE email = 'patient@example.com';
   ```
   Should return:
   - email
   - wallet_address
   - name
   - created_by (doctor's user ID)

3. **Verify blockchain:**
   - Check blockchain for patient record
   - Verify wallet address matches database

### Test Medical Record Creation Flow

1. **Doctor creates medical record:**
   - Select patient
   - Upload/create record
   - **Expected:**
     - Entry in `medical_records` table
     - Record stored on blockchain (IPFS hash)
     - Link between database and blockchain

2. **Patient views record:**
   - Patient logs in
   - Views medical records
   - **Expected:**
     - Record appears in list
     - Can view details
     - IPFS hash retrieves blockchain data

---

## Common Issues & Fixes

### Issue: "No patients showing"

**Check:**
1. Verify `patient_wallet_mappings` table has data
2. Check `created_by` matches doctor's user ID
3. Verify API endpoint returns data
4. Check browser console for errors

**Fix:**
- Create a test patient via doctor dashboard
- Verify entry appears in database

### Issue: "Cannot create patient"

**Check:**
1. Verify `patient_wallet_mappings` table exists
2. Verify `users` table exists (for foreign key)
3. Check backend logs for errors
4. Verify blockchain connection

**Fix:**
- Run database migration if tables missing
- Check DATABASE_URL is correct
- Verify blockchain RPC URL is accessible

### Issue: "Appointments not showing"

**Check:**
1. Verify `appointments` table has data
2. Check `patient_id` matches patient's ID in `patient_wallet_mappings`
3. Verify API filters by current user
4. Check browser console for API errors

### Issue: "Medical records not showing"

**Check:**
1. Verify `medical_records` table has data
2. Check `patient_id` matches patient's ID
3. Verify IPFS hash is valid
4. Check blockchain connection

---

## Verification Queries

### Check Database Has Data

```sql
-- Check users
SELECT COUNT(*) FROM users;

-- Check patient wallet mappings
SELECT COUNT(*) FROM patient_wallet_mappings;

-- Check appointments
SELECT COUNT(*) FROM appointments;

-- Check medical records
SELECT COUNT(*) FROM medical_records;
```

### Check Patient-Doctor Link

```sql
-- Get patients created by a doctor
SELECT pwm.*, u.email as doctor_email, u.full_name as doctor_name
FROM patient_wallet_mappings pwm
JOIN users u ON pwm.created_by = u.id
WHERE u.email = 'doctor@example.com';
```

### Check Appointments Link

```sql
-- Get appointments for a patient
SELECT a.*, pwm.email as patient_email, u.email as doctor_email
FROM appointments a
JOIN patient_wallet_mappings pwm ON a.patient_id = pwm.id
JOIN users u ON a.doctor_id = u.id
WHERE pwm.email = 'patient@example.com';
```

---

## Success Criteria

### ✅ Application is Working If:

1. **Backend starts without errors**
2. **Frontend loads without errors**
3. **Can login with each role**
4. **Patient dashboard shows data (or empty state if no data)**
5. **Doctor can create patient**
6. **Doctor can create appointment**
7. **Doctor can create medical record**
8. **Patient can view their records**
9. **Admin can view users**
10. **No database errors in logs**

---

**Status:** Ready for testing!

**Last Updated:** 2025-01-XX

