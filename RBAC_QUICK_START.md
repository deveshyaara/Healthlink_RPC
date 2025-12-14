# 🚀 RBAC Fix - Quick Start Guide

## 📦 What You Got

| File | Purpose | Usage |
|------|---------|-------|
| `frontend/src/lib/roleHelpers.ts` | Role utilities | Import role hash constants and helper functions |
| `frontend/src/components/debug/RoleDebugger.tsx` | Debug roles visually | Add to any page to debug RBAC issues |
| `frontend/src/components/doctor/DoctorActions.tsx` | Fixed Add Patient & Schedule | Import and use these working components |
| `ethereum-contracts/scripts/grant-roles.ts` | Grant DOCTOR_ROLE via CLI | Run to give any wallet doctor permissions |

---

## ⚡ Quick Setup (3 Minutes)

### 1. Grant Yourself Doctor Role
```bash
cd ethereum-contracts
npx hardhat run scripts/grant-roles.ts --network sepolia 0xYourWalletAddress
```

### 2. Add RoleDebugger to Doctor Dashboard
```tsx
// frontend/src/app/dashboard/doctor/page.tsx
import { RoleDebugger } from '@/components/debug/RoleDebugger';

export default function DoctorDashboard() {
  return (
    <div>
      {process.env.NODE_ENV === 'development' && <RoleDebugger />}
      {/* rest of page */}
    </div>
  );
}
```

### 3. Replace Old Buttons with New Components
```tsx
// Any page with doctor actions
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';

function MyPage() {
  return (
    <div>
      <AddPatientDialog />
      <ScheduleAppointmentDialog />
    </div>
  );
}
```

### 4. Test Locally
```bash
cd frontend
npm run dev
# Open http://localhost:3000
# Sign in → Go to Doctor Dashboard
# Try "Add Patient" and "Schedule Appointment"
```

---

## 🔍 Expected Results

### RoleDebugger Should Show:
```
✅ Connected Wallet: 0x7C5c...2742
✅ Contract: 0xA94A...A757
✅ DOCTOR_ROLE: HAS ROLE ✅
✅ PATIENT_ROLE: HAS ROLE ✅
❌ ADMIN_ROLE: NO ROLE (unless you're deployer)
```

### Add Patient Should:
1. Show form dialog
2. Log transaction details to console
3. Check DOCTOR_ROLE before sending
4. Show MetaMask popup
5. Confirm transaction
6. Show success notification
7. Close dialog

### Console Should Show:
```
🔍 Step 1: MetaMask detected ✅
🔍 Step 2: Signer initialized ✅
   Doctor Address: 0x7C5c39F96aC2ae2DAE9e6aB5d47dA3f1e234D742
📤 Transaction Arguments:
   patientId: "TEST_PATIENT_001" (string)
   name: "John Doe" (string)
   age: 35 (number)
🔍 Step 7: Checking DOCTOR_ROLE...
   Has Role: ✅ YES
⏳ Step 8: Sending transaction...
   📤 Transaction Hash: 0x...
   ✅ Transaction confirmed!
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| All roles show "NO ROLE" | Run `grant-roles.ts` script with your address |
| "Contract address not configured" | Check `.env.local` has `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` |
| "Failed to load contract ABI" | Copy ABIs from `ethereum-contracts/artifacts` to `frontend/public/contracts` |
| "Transaction reverted" | You don't have DOCTOR_ROLE - run grant script again |
| "User rejected transaction" | You clicked "Reject" in MetaMask - try again |

---

## 📝 Role Hash Reference

Use these in your code:

```typescript
import { ROLE_HASHES, decodeRoleHash, checkUserRole } from '@/lib/roleHelpers';

// Check role
const hasRole = await checkUserRole(contract, address, 'DOCTOR');

// Decode hash
const roleName = decodeRoleHash('0x71f3d558...'); // Returns 'DOCTOR'

// Get role hash
const doctorHash = ROLE_HASHES.DOCTOR;
```

**Role Hashes:**
- `ADMIN`: `0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`
- `DOCTOR`: `0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f`
- `PATIENT`: `0x8d7cac9e45347f4645dedc4ae8e18e63cbd1ecbca0f4d865d40a419dd41c5e16`

---

## ✅ Ready to Deploy?

**Checklist before pushing:**
- [ ] Grant-roles script works
- [ ] RoleDebugger shows correct roles
- [ ] Add Patient works
- [ ] Schedule Appointment works
- [ ] No console errors
- [ ] Tested on Sepolia testnet

**Then:**
```bash
# Remove or hide RoleDebugger for production
# (Keep it behind NODE_ENV === 'development' check)

git add .
git commit -m "fix: RBAC - Add role debugging and fix doctor actions"
# DON'T PUSH YET - TEST FIRST!
```

---

## 📚 Full Documentation

See `RBAC_TESTING_GUIDE.md` for:
- Detailed testing steps
- Error troubleshooting
- Console debugging tips
- Hardhat scripts usage

---

## 🎯 Integration Example

Here's a complete example of integrating into an existing page:

```tsx
'use client';

import { RoleDebugger } from '@/components/debug/RoleDebugger';
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoctorDashboard() {
  return (
    <div className="space-y-6">
      {/* Debug component (dev only) */}
      {process.env.NODE_ENV === 'development' && <RoleDebugger />}
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <AddPatientDialog />
          <ScheduleAppointmentDialog />
        </CardContent>
      </Card>
      
      {/* Rest of your dashboard */}
    </div>
  );
}
```

---

**Remember: Test everything locally before deploying!** 🚀
