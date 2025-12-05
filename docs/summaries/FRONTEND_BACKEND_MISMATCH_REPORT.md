# Frontend-Backend API Endpoint Mismatch Report
**Date**: December 1, 2025  
**Status**: 🔴 CRITICAL - Production-Blocking Issues

## Executive Summary

The frontend expects a fully-featured REST API with 60+ healthcare-specific endpoints, but the backend only implements 2 route modules with generic Fabric transaction/query capabilities and wallet management.

**Impact**: ~95% of frontend features will fail with 404 or 500 errors.

---

## Backend Reality Check

### What Actually Exists on Backend

#### 1. Wallet Routes (`/api/v1/wallet/*`)
✅ **Working Routes**:
- `POST /api/v1/wallet/register` - Register blockchain identity
- `POST /api/v1/wallet/enroll-admin` - Enroll admin
- `GET /api/v1/wallet/identity/:userId` - Get identity
- `GET /api/v1/wallet/identities` - List all identities
- `DELETE /api/v1/wallet/identity/:userId` - Remove identity

#### 2. Transaction Routes (`/api/v1/*`)
✅ **Working Routes**:
- `POST /api/v1/transactions` - Submit transaction
- `POST /api/v1/transactions/private` - Submit private transaction
- `POST /api/v1/query` - Query ledger (read-only)
- `GET /api/v1/history/:assetId` - Get asset history
- `GET /api/v1/assets` - Get all assets (paginated)
- `POST /api/v1/assets/query` - Rich query assets
- `POST /api/v1/assets` - Create asset
- `PUT /api/v1/assets/:assetId` - Update asset
- `DELETE /api/v1/assets/:assetId` - Delete asset

**Total Backend Routes**: ~14 generic endpoints

---

## Frontend Expectations vs Reality

### 1. Authentication API ❌
**Frontend Calls**: `/api/auth/*`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
authApi.login()           // /api/auth/login ❌
authApi.logout()          // /api/auth/logout ❌
authApi.getMe()           // /api/auth/me ❌
authApi.refreshToken()    // /api/auth/refresh ❌
```
**Status**: Register partially fixed (now calls `/api/v1/wallet/register`), but login/logout/auth still broken

---

### 2. Doctors API ❌
**Frontend Calls**: `/api/doctors/*`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
doctorsApi.registerDoctor()              // POST /api/doctors ❌
doctorsApi.getDoctor(id)                 // GET /api/doctors/:id ❌
doctorsApi.verifyDoctor()                // POST /api/doctors/:id/verify ❌
doctorsApi.suspendDoctor()               // POST /api/doctors/:id/suspend ❌
doctorsApi.updateDoctorProfile()         // PUT /api/doctors/:id/profile ❌
doctorsApi.getDoctorsBySpecialization()  // GET /api/doctors/specialization/:spec ❌
doctorsApi.getDoctorsByHospital()        // GET /api/doctors/hospital/:hospital ❌
doctorsApi.rateDoctorAsync()             // POST /api/doctors/:id/rate ❌
doctorsApi.getDoctorReviews()            // GET /api/doctors/:id/reviews ❌
```
**Status**: 9 endpoints completely missing

---

### 3. Medical Records API ❌
**Frontend Calls**: `/api/medical-records/*`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
medicalRecordsApi.getAllRecords()       // GET /api/medical-records/paginated ❌
medicalRecordsApi.createRecord()        // POST /api/medical-records ❌
medicalRecordsApi.getRecord()           // GET /api/medical-records/:id ❌
medicalRecordsApi.updateRecord()        // PUT /api/medical-records/:id ❌
medicalRecordsApi.getRecordsByPatient() // GET /api/medical-records/patient/:id ❌
medicalRecordsApi.getRecordsByDoctor()  // GET /api/medical-records/doctor/:id ❌
medicalRecordsApi.searchRecords()       // POST /api/medical-records/search ❌
medicalRecordsApi.archiveRecord()       // DELETE /api/medical-records/:id/archive ❌
medicalRecordsApi.getRecordAccessLog()  // GET /api/medical-records/:id/access-log ❌
medicalRecordsApi.getRecordHistory()    // GET /api/medical-records/:id/history ❌
```
**Status**: 10 endpoints completely missing

---

### 4. Consents API ❌
**Frontend Calls**: `/api/consents/*`, `/api/patient/*/consents`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
consentsApi.getAllConsents()       // GET /api/consents ❌
consentsApi.createConsent()        // POST /api/consents ❌
consentsApi.getConsent()           // GET /api/consents/:id ❌
consentsApi.getPatientConsents()   // GET /api/patient/:id/consents ❌
consentsApi.revokeConsent()        // PATCH /api/consents/:id/revoke ❌
```
**Status**: 5 endpoints completely missing

---

### 5. Appointments API ❌
**Frontend Calls**: `/api/appointments/*`, `/api/patients/*/appointments`, `/api/doctors/*/appointments`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
appointmentsApi.scheduleAppointment()       // POST /api/appointments ❌
appointmentsApi.getAllAppointments()        // GET /api/appointments ❌
appointmentsApi.getAppointment()            // GET /api/appointments/:id ❌
appointmentsApi.confirmAppointment()        // POST /api/appointments/:id/confirm ❌
appointmentsApi.completeAppointment()       // POST /api/appointments/:id/complete ❌
appointmentsApi.cancelAppointment()         // POST /api/appointments/:id/cancel ❌
appointmentsApi.rescheduleAppointment()     // POST /api/appointments/:id/reschedule ❌
appointmentsApi.markNoShow()                // POST /api/appointments/:id/no-show ❌
appointmentsApi.getPatientAppointments()    // GET /api/patients/:id/appointments ❌
appointmentsApi.getDoctorAppointments()     // GET /api/doctors/:id/appointments ❌
appointmentsApi.getAppointmentsByDateRange() // POST /api/appointments/date-range ❌
appointmentsApi.getDoctorSchedule()         // GET /api/doctors/:id/schedule/:date ❌
appointmentsApi.searchAppointments()        // POST /api/appointments/search ❌
appointmentsApi.addReminder()               // POST /api/appointments/:id/reminders ❌
appointmentsApi.getAppointmentHistory()     // GET /api/appointments/:id/history ❌
```
**Status**: 15 endpoints completely missing

---

### 6. Prescriptions API ❌
**Frontend Calls**: `/api/prescriptions/*`, `/api/patients/*/prescriptions`, `/api/doctors/*/prescriptions`, `/api/pharmacies/*/prescriptions`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
prescriptionsApi.getAllPrescriptions()      // GET /api/prescriptions ❌
prescriptionsApi.createPrescription()       // POST /api/prescriptions ❌
prescriptionsApi.getPrescription()          // GET /api/prescriptions/:id ❌
prescriptionsApi.dispensePrescription()     // POST /api/prescriptions/:id/dispense ❌
prescriptionsApi.refillPrescription()       // POST /api/prescriptions/:id/refill ❌
prescriptionsApi.cancelPrescription()       // POST /api/prescriptions/:id/cancel ❌
prescriptionsApi.getPatientPrescriptions()  // GET /api/patients/:id/prescriptions ❌
prescriptionsApi.getDoctorPrescriptions()   // GET /api/doctors/:id/prescriptions ❌
prescriptionsApi.getActivePrescriptions()   // GET /api/patients/:id/prescriptions/active ❌
prescriptionsApi.getPharmacyPrescriptions() // GET /api/pharmacies/:id/prescriptions ❌
prescriptionsApi.searchByMedication()       // GET /api/prescriptions/search/medication/:name ❌
prescriptionsApi.verifyPrescription()       // GET /api/prescriptions/:id/verify ❌
prescriptionsApi.addNotes()                 // POST /api/prescriptions/:id/notes ❌
prescriptionsApi.getPrescriptionHistory()   // GET /api/prescriptions/:id/history ❌
```
**Status**: 14 endpoints completely missing

---

### 7. Lab Tests API ❌
**Frontend Calls**: `/api/lab-tests/*`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
labTestsApi.orderLabTest()          // POST /api/lab-tests ❌
labTestsApi.getLabTest()            // GET /api/lab-tests/:id ❌
labTestsApi.getAllLabTests()        // GET /api/lab-tests ❌
labTestsApi.updateLabTestResult()   // PUT /api/lab-tests/:id/result ❌
```
**Status**: 4 endpoints completely missing

---

### 8. Audit API ❌
**Frontend Calls**: `/api/audit/*`  
**Backend Has**: Nothing  
**Affected Functions**:
```typescript
auditApi.getAuditRecord()   // GET /api/audit/:txId ❌
auditApi.getAllLogs()       // (hardcoded to return [])
```
**Status**: 1 endpoint missing, 1 stubbed

---

## Root Cause Analysis

### Architecture Mismatch

**Frontend Assumption**: REST API with domain-specific endpoints (doctors, appointments, prescriptions, etc.)

**Backend Reality**: Generic Fabric transaction gateway with:
- Wallet identity management
- Generic transaction submission
- Generic query capabilities

### Why This Happened

1. **Frontend built for production** - Full healthcare feature set
2. **Backend is a generic gateway** - Expects chaincode to handle business logic
3. **Missing middleware layer** - No REST-to-chaincode translation layer

---

## Resolution Strategies

### Option A: Implement REST Routes (Recommended for Production)
**Effort**: High (2-3 weeks)  
**Benefit**: Clean REST API, easier frontend development

**Tasks**:
1. Create route files for each domain:
   - `doctor.routes.js` - Map REST to chaincode functions
   - `appointment.routes.js`
   - `prescription.routes.js`
   - `medicalRecord.routes.js`
   - `consent.routes.js`
   - `labTest.routes.js`
   - `auth.routes.js` (with JWT)

2. Create controllers that call chaincode via `fabricGateway.service.js`
3. Add proper validation schemas
4. Implement JWT authentication middleware

**Example Implementation**:
```javascript
// doctor.routes.js
router.post('/doctors', async (req, res) => {
  const { doctorId, name, specialization, ... } = req.body;
  
  // Call chaincode function via generic transaction endpoint
  const result = await fabricGateway.submitTransaction(
    'doctor-credentials-contract',
    'RegisterDoctor',
    doctorId, name, specialization, ...
  );
  
  res.json(result);
});
```

---

### Option B: Modify Frontend to Use Generic Endpoints
**Effort**: Medium (1 week)  
**Benefit**: Works with existing backend immediately

**Tasks**:
1. Rewrite `api-client.ts` to call generic transaction endpoints:
   ```typescript
   doctorsApi.registerDoctor: async (data) => {
     return apiRequest('/api/v1/transactions', {
       method: 'POST',
       body: JSON.stringify({
         channelName: 'healthlink-channel',
         chaincodeName: 'doctor-credentials-contract',
         fcn: 'RegisterDoctor',
         args: [data.doctorId, data.name, data.specialization, ...]
       })
     });
   }
   ```

2. Map all 60+ frontend functions to generic transaction calls
3. Handle response format differences
4. Implement client-side auth with wallet identities

**Drawbacks**:
- Verbose transaction syntax exposed to frontend
- Less RESTful, harder to maintain
- No type safety from REST schemas

---

### Option C: Hybrid Approach (Quick Win)
**Effort**: Low (2-3 days)  
**Benefit**: Get critical features working fast

**Tasks**:
1. Keep generic transaction endpoint for complex operations
2. Create REST routes ONLY for frequently-used endpoints:
   - `POST /api/auth/login` - JWT authentication
   - `POST /api/auth/logout`
   - `GET /api/doctors` - List doctors
   - `GET /api/appointments` - List appointments
   - `POST /api/appointments` - Schedule appointment

3. Frontend uses REST where available, falls back to generic transactions

---

## Immediate Action Items

### Priority 1: Authentication (CRITICAL)
**Status**: BLOCKING - Users can't login after registration

**Required**:
1. Create `/api/auth/login` endpoint
   - Accept email/password
   - Verify against wallet identity
   - Return JWT token

2. Create `/api/auth/me` endpoint
   - Verify JWT token
   - Return user info from wallet

3. Update frontend `auth-context.tsx` (currently calls `/api/auth/me`)

**Implementation**:
```javascript
// auth.routes.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userId = email.replace(/[^a-zA-Z0-9]/g, '');
  
  // Check if identity exists in wallet
  const identity = await walletService.getIdentity(userId);
  if (!identity) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // TODO: Verify password (requires password storage)
  // For now, just check identity exists
  
  // Generate JWT
  const token = jwt.sign(
    { userId, role: identity.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: { id: userId, email, role: identity.role }
  });
});
```

---

### Priority 2: Dashboard Data (HIGH)
**Status**: Dashboard will show all zeros

**Required**:
1. Implement basic read endpoints:
   - `GET /api/medical-records` (for dashboard stats)
   - `GET /api/appointments` (for upcoming appointments)
   - `GET /api/consents` (for consent count)

---

### Priority 3: Doctor Features (MEDIUM)
**Status**: Doctor registration/management non-functional

**Required**:
1. `POST /api/doctors` - Register doctor
2. `GET /api/doctors/:id` - Get doctor details
3. `GET /api/doctors` - List doctors

---

## Testing Recommendations

### Before Implementing Routes

1. **Test chaincode functions directly**:
   ```bash
   # Verify doctor-credentials-contract works
   curl -X POST http://localhost:3000/api/v1/transactions \
     -d '{
       "channelName": "healthlink-channel",
       "chaincodeName": "doctor-credentials-contract",
       "fcn": "RegisterDoctor",
       "args": ["doctor1", "Dr. Smith", "Cardiology", ...]
     }'
   ```

2. **Document chaincode function signatures**:
   - List all functions in each contract
   - Document required parameters
   - Test with curl/Postman

3. **Map REST → Chaincode**:
   - Create mapping spreadsheet
   - `POST /api/doctors` → `RegisterDoctor(doctorId, name, ...)`
   - `GET /api/doctors/:id` → `GetDoctor(doctorId)`

---

## Summary

**Current State**: 🔴 ~60 frontend endpoints calling non-existent backend routes  
**Fixed**: ✅ 1 endpoint (registration now calls `/api/v1/wallet/register`)  
**Remaining**: ❌ 59+ endpoints still broken

**Recommended Path Forward**:
1. **Immediate** (Today): Implement auth endpoints (login, logout, me)
2. **This Week**: Implement Priority 2-3 endpoints (12-15 routes)
3. **Next Sprint**: Complete all domain routes (60+ routes)

**Alternative**: Modify frontend to use generic transaction endpoint (faster but less maintainable)

---

## Files to Update

### Backend (New Files Needed)
- `middleware-api/src/routes/auth.routes.js` ⚠️ Missing
- `middleware-api/src/routes/doctor.routes.js` ⚠️ Missing
- `middleware-api/src/routes/appointment.routes.js` ⚠️ Missing
- `middleware-api/src/routes/prescription.routes.js` ⚠️ Missing
- `middleware-api/src/routes/medicalRecord.routes.js` ⚠️ Missing
- `middleware-api/src/routes/consent.routes.js` ⚠️ Missing
- `middleware-api/src/routes/labTest.routes.js` ⚠️ Missing
- `middleware-api/src/controllers/auth.controller.js` ⚠️ Missing
- (+ 6 more controller files)

### Frontend (Needs Modification)
- `frontend/src/lib/api-client.ts` - ✅ Registration fixed, 59 more functions need updates
- `frontend/src/contexts/auth-context.tsx` - Calls `/api/auth/me` ❌

---

**Report Generated**: December 1, 2025  
**Next Review**: After auth endpoints implemented
