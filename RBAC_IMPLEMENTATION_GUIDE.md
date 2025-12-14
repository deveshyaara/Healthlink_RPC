# RBAC Implementation Guide

## 🎯 Overview

Your Healthcare DApp now has **complete RBAC debugging and protection** with three powerful components:

1. **RoleDebugger** - Visual debugging component
2. **RequireRole** - Route guard wrapper
3. **grant-roles.ts** - CLI tool for granting permissions

---

## ✅ Task 1: RoleDebugger Component

**Location:** `frontend/src/components/debug/RoleDebugger.tsx`

### Features
- ✅ Connects to wallet and gets current address
- ✅ Calls `hasRole()` for ADMIN, DOCTOR, and PATIENT roles
- ✅ Displays raw Boolean results on screen
- ✅ Logs keccak256 hashes to console for verification
- ✅ Shows contract address being checked
- ✅ Copy-to-clipboard functionality
- ✅ Real-time role refresh

### Usage

```tsx
import { RoleDebugger } from '@/components/debug/RoleDebugger';

// In any page or component
export default function DoctorDashboard() {
  return (
    <div>
      {/* Only show in development */}
      {process.env.NODE_ENV === 'development' && <RoleDebugger />}
      
      {/* Your dashboard content */}
    </div>
  );
}
```

### What It Shows
```
Connected Wallet Address: 0x1234...5678
HealthLink Contract: 0xA94A...A757

Role Checks:
✅ ADMIN - HAS ROLE
   Hash: 0xa498...3894

❌ DOCTOR - NO ROLE
   Hash: 0x71f3...f834f

✅ PATIENT - HAS ROLE
   Hash: 0x8d7c...a012
```

---

## ✅ Task 2: RequireRole Wrapper

**Location:** `frontend/src/components/auth/RequireRole.tsx`

### Features
- ✅ Accepts `requiredRole` prop ("ADMIN", "DOCTOR", or "PATIENT")
- ✅ Converts string to keccak256 hash using `ROLE_HASHES`
- ✅ Checks contract state before rendering children
- ✅ Shows loading state while checking
- ✅ Redirects to access denied if no permission
- ✅ Optional custom fallback component
- ✅ Console logging for debugging

### Usage

#### Protect Admin Routes
```tsx
import { RequireRole, RequireAdmin } from '@/components/auth/RequireRole';

// Option 1: Using RequireRole
export default function AdminDashboard() {
  return (
    <RequireRole requiredRole="ADMIN">
      <div>
        <h1>Admin Dashboard</h1>
        {/* Only admins can see this */}
      </div>
    </RequireRole>
  );
}

// Option 2: Using shorthand (recommended)
export default function AdminDashboard() {
  return (
    <RequireAdmin>
      <div>
        <h1>Admin Dashboard</h1>
      </div>
    </RequireAdmin>
  );
}
```

#### Protect Doctor Routes
```tsx
import { RequireDoctor } from '@/components/auth/RequireRole';

export default function DoctorDashboard() {
  return (
    <RequireDoctor>
      <div>
        <h1>Doctor Dashboard</h1>
        <AddPatientDialog />
        <ScheduleAppointmentDialog />
      </div>
    </RequireDoctor>
  );
}
```

#### Protect Patient Routes
```tsx
import { RequirePatient } from '@/components/auth/RequireRole';

export default function PatientRecords() {
  return (
    <RequirePatient>
      <div>
        <h1>My Medical Records</h1>
      </div>
    </RequirePatient>
  );
}
```

#### Custom Redirect
```tsx
<RequireRole 
  requiredRole="DOCTOR" 
  redirectTo="/doctor/login"
>
  {children}
</RequireRole>
```

#### Custom Fallback (No Redirect)
```tsx
<RequireRole 
  requiredRole="ADMIN"
  fallback={<div>You need admin permissions</div>}
>
  {children}
</RequireRole>
```

### Route Protection in Next.js

#### App Router (app/ directory)
```tsx
// app/admin/page.tsx
import { RequireAdmin } from '@/components/auth/RequireRole';

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}
```

#### Pages Router (pages/ directory)
```tsx
// pages/admin/index.tsx
import { RequireAdmin } from '@/components/auth/RequireRole';

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}
```

---

## ✅ Task 3: Grant Roles Script

**Location:** `ethereum-contracts/scripts/grant-roles.ts`

### Features
- ✅ Grants DOCTOR_ROLE to specified address
- ✅ Grants PATIENT_ROLE to specified address
- ✅ Validates address format
- ✅ Checks if roles already granted (prevents duplicate transactions)
- ✅ Waits for transaction confirmation
- ✅ Verifies roles were granted successfully
- ✅ Detailed logging with status indicators

### Usage

```bash
cd ethereum-contracts

# Grant roles to a specific address
npx hardhat run scripts/grant-roles.ts --network sepolia 0xYourAddressHere
```

### Example Output
```
╔════════════════════════════════════════════════════════════════════╗
║                    GRANT DOCTOR ROLE SCRIPT                        ║
╚════════════════════════════════════════════════════════════════════╝

🎯 Target Address: 0x1234567890abcdef1234567890abcdef12345678

📄 Loading deployment addresses...
✅ Deployment file found

🔗 Connecting to HealthLink contract...
   Contract: 0xA94AFCbFF804527315391EA52890c826f897A757
✅ Contract connected

👤 Deployer: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

🔍 Checking current roles...
   DOCTOR_ROLE: ❌ Not granted
   PATIENT_ROLE: ❌ Not granted

⏳ Granting DOCTOR_ROLE...
   Transaction Hash: 0xabc123...
✅ Transaction confirmed! Block: 12345

⏳ Granting PATIENT_ROLE...
   Transaction Hash: 0xdef456...
✅ Transaction confirmed! Block: 12346

✅ SUCCESS! Roles granted successfully:
   ✅ DOCTOR_ROLE granted
   ✅ PATIENT_ROLE granted
```

---

## 🔧 Role Hash Reference

Your smart contracts use these **keccak256 hashes** for roles:

```typescript
ADMIN_ROLE:   0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775
DOCTOR_ROLE:  0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f
PATIENT_ROLE: 0x8d7cf690b1fe6858f9e996b4cc2aa276ea39279d6e17b641c8c0fe8ec15e8e6f
```

These hashes are computed as:
```typescript
ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'))
ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'))
ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE'))
```

---

## 🐛 Debugging Workflow

### Step 1: Add RoleDebugger to Your Page
```tsx
import { RoleDebugger } from '@/components/debug/RoleDebugger';

<RoleDebugger />
```

### Step 2: Connect Wallet & Check Roles
- Open your app in the browser
- Connect your MetaMask wallet
- Look at the RoleDebugger component
- Check which roles show ✅ or ❌

### Step 3: Grant Missing Roles
If you see `❌ NO ROLE`, run the grant script:
```bash
npx hardhat run scripts/grant-roles.ts --network sepolia YOUR_WALLET_ADDRESS
```

### Step 4: Refresh & Verify
- Click the "Refresh" button in RoleDebugger
- You should now see ✅ for the granted roles
- Check browser console for detailed logs

---

## 🚀 Implementation Checklist

### For Admin Routes
- [ ] Wrap admin pages with `<RequireAdmin>`
- [ ] Test access with admin wallet
- [ ] Test access denied with non-admin wallet
- [ ] Grant ADMIN_ROLE using script if needed

### For Doctor Routes
- [ ] Wrap doctor pages with `<RequireDoctor>`
- [ ] Add RoleDebugger to doctor dashboard (dev only)
- [ ] Test Add Patient feature
- [ ] Test Schedule Appointment feature
- [ ] Grant DOCTOR_ROLE using script if needed

### For Patient Routes
- [ ] Wrap patient pages with `<RequirePatient>`
- [ ] Test patient records access
- [ ] Grant PATIENT_ROLE using script if needed

---

## 🔍 Common Issues & Solutions

### Issue: "All roles show NO ROLE"
**Solution:** Grant roles using the script:
```bash
npx hardhat run scripts/grant-roles.ts --network sepolia YOUR_ADDRESS
```

### Issue: "Contract address not configured"
**Solution:** Check `.env.production` has:
```env
NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS=0xA94AFCbFF804527315391EA52890c826f897A757
```

### Issue: "MetaMask not found"
**Solution:** Install MetaMask browser extension and refresh page

### Issue: "Wrong network"
**Solution:** Switch MetaMask to Sepolia testnet (Chain ID: 11155111)

### Issue: "RequireRole always redirects"
**Solution:** 
1. Add `<RoleDebugger />` to check actual role status
2. Grant required roles using script
3. Check console logs for detailed error messages

---

## 📚 Related Files

- **Role Utilities:** `frontend/src/lib/roleHelpers.ts`
- **Debug Component:** `frontend/src/components/debug/RoleDebugger.tsx`
- **Route Guard:** `frontend/src/components/auth/RequireRole.tsx`
- **Grant Script:** `ethereum-contracts/scripts/grant-roles.ts`
- **Doctor Actions:** `frontend/src/components/doctor/DoctorActions.tsx`

---

## 🎓 Example: Full Admin Page

```tsx
// app/admin/page.tsx
'use client';

import { RequireAdmin } from '@/components/auth/RequireRole';
import { RoleDebugger } from '@/components/debug/RoleDebugger';

export default function AdminPage() {
  return (
    <RequireAdmin>
      <div className="p-6">
        {/* Debug component (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6">
            <RoleDebugger />
          </div>
        )}

        {/* Admin content */}
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid gap-6">
          <UserManagement />
          <SystemSettings />
          <AuditLogs />
        </div>
      </div>
    </RequireAdmin>
  );
}
```

---

✅ **All three tasks are complete and ready to use!**

Test them locally, grant roles as needed, and your RBAC issues should be resolved.
