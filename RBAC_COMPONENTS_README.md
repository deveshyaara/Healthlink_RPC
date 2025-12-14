# RBAC Components & Utilities

This directory contains all the fixes for Role-Based Access Control (RBAC) issues in the HealthLink DApp.

## 📦 What's Included

### 1. **Role Helpers** (`frontend/src/lib/roleHelpers.ts`)
Centralized role management utilities.

```typescript
import { ROLE_HASHES, decodeRoleHash, checkUserRole } from '@/lib/roleHelpers';

// Use consistent role hashes
const doctorHash = ROLE_HASHES.DOCTOR;

// Check if user has a role
const hasRole = await checkUserRole(contract, address, 'DOCTOR');

// Decode a role hash
const roleName = decodeRoleHash('0x71f3d558...'); // 'DOCTOR'
```

### 2. **RoleDebugger** (`frontend/src/components/debug/RoleDebugger.tsx`)
Visual debugging tool for RBAC issues.

```tsx
import { RoleDebugger } from '@/components/debug/RoleDebugger';

function MyPage() {
  return (
    <>
      {process.env.NODE_ENV === 'development' && <RoleDebugger />}
      {/* page content */}
    </>
  );
}
```

### 3. **Doctor Actions** (`frontend/src/components/doctor/DoctorActions.tsx`)
Fixed implementation of doctor functionalities.

```tsx
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';

function DoctorDashboard() {
  return (
    <div>
      <AddPatientDialog />
      <ScheduleAppointmentDialog />
    </div>
  );
}
```

### 4. **Grant Roles Script** (`ethereum-contracts/scripts/grant-roles.ts`)
CLI tool to grant roles to wallet addresses.

```bash
cd ethereum-contracts
npx hardhat run scripts/grant-roles.ts --network sepolia 0xWalletAddress
```

## 🚀 Quick Start

1. **Grant roles to your wallet:**
   ```bash
   cd ethereum-contracts
   npx hardhat run scripts/grant-roles.ts --network sepolia YOUR_ADDRESS
   ```

2. **Add RoleDebugger to verify:**
   ```tsx
   import { RoleDebugger } from '@/components/debug/RoleDebugger';
   {process.env.NODE_ENV === 'development' && <RoleDebugger />}
   ```

3. **Use fixed components:**
   ```tsx
   import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
   <AddPatientDialog />
   <ScheduleAppointmentDialog />
   ```

## 📖 Documentation

- **[RBAC_QUICK_START.md](./RBAC_QUICK_START.md)** - Get started in 3 minutes
- **[RBAC_TESTING_GUIDE.md](./RBAC_TESTING_GUIDE.md)** - Comprehensive testing guide
- **[RBAC_FIX_SUMMARY.md](./RBAC_FIX_SUMMARY.md)** - Technical overview of all fixes

## ✅ Features

- ✅ Proper signer initialization
- ✅ Pre-transaction role checking
- ✅ Comprehensive error handling
- ✅ Detailed console logging
- ✅ User-friendly error messages
- ✅ Visual role debugging
- ✅ CLI role management
- ✅ Centralized role constants

## 🐛 Troubleshooting

**All roles show "NO ROLE":**
```bash
npx hardhat run scripts/grant-roles.ts --network sepolia YOUR_ADDRESS
```

**Transaction reverted:**
- Check you have DOCTOR_ROLE using RoleDebugger
- Verify contract address is correct
- Ensure you're on Sepolia network

**Contract not found:**
- Check `.env.local` has `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS`
- Verify contract ABIs are in `frontend/public/contracts/`

## 📝 Example Integration

Complete example of a doctor dashboard with all fixes:

```tsx
'use client';

import { RoleDebugger } from '@/components/debug/RoleDebugger';
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRole } from '@/hooks/useUserRole';

export default function DoctorDashboard() {
  const { isDoctor, loading } = useUserRole();

  if (loading) return <div>Loading...</div>;
  if (!isDoctor) return <div>Access Denied</div>;

  return (
    <div className="space-y-6">
      {/* Debug panel (dev only) */}
      {process.env.NODE_ENV === 'development' && <RoleDebugger />}
      
      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <AddPatientDialog />
          <ScheduleAppointmentDialog />
        </CardContent>
      </Card>
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

## 🎯 Before vs After

| Issue | Before | After |
|-------|--------|-------|
| Add Patient | Button visible but doesn't work | ✅ Fully functional |
| Error Messages | Silent failures | ✅ Clear error messages |
| Debugging | Check blockchain manually | ✅ Visual RoleDebugger |
| Role Granting | Manual contract calls | ✅ Simple CLI script |
| Console Logs | None | ✅ Step-by-step logging |

## ⚠️ Important

**DO NOT deploy without testing locally first!**

1. Grant roles to your wallet
2. Add RoleDebugger to verify
3. Test Add Patient
4. Test Schedule Appointment
5. Check all console logs
6. Only then commit and deploy

---

For detailed instructions, see **[RBAC_TESTING_GUIDE.md](./RBAC_TESTING_GUIDE.md)**
