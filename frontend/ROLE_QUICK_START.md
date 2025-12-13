# Quick Integration Guide

## Your Role Management System is Ready! 🎉

### What's Been Set Up

✅ **Custom Hook**: `useUserRole()` - Fetches roles from Ethereum smart contract  
✅ **Global Context**: `RoleProvider` - Added to your app layout  
✅ **Contract Address**: Configured in `.env.local`  
✅ **Example Components**: Ready-to-use role-based components  

### 3 Ways to Use Role Management

---

## Option 1: Wrap Your Existing Dashboard (Recommended)

**File**: `frontend/src/app/dashboard/page.tsx`

Simply wrap your existing dashboard content:

```tsx
'use client';

import { RoleDashboardWrapper } from '@/components/dashboard/role-dashboard-wrapper';
// ... your existing imports

export default function DashboardPage() {
  // ... your existing state and logic

  return (
    <RoleDashboardWrapper>
      {/* Your existing dashboard content goes here */}
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            // ... your existing stats cards
          ))}
        </div>
        
        {/* Rest of your dashboard */}
      </div>
    </RoleDashboardWrapper>
  );
}
```

**What this does:**
- Shows loading spinner while checking blockchain role
- Displays error message if MetaMask not connected
- Adds role badge header (Patient/Doctor/Admin)
- Wraps your existing content unchanged

---

## Option 2: Use the Hook Directly

**File**: Any component that needs role info

```tsx
'use client';

import { useUserRole } from '@/hooks/useUserRole';

export default function MyComponent() {
  const { isDoctor, isPatient, isAdmin, loading } = useUserRole();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isDoctor && <DoctorSpecificContent />}
      {isPatient && <PatientSpecificContent />}
      {isAdmin && <AdminControls />}
    </div>
  );
}
```

---

## Option 3: Use the Context (for nested components)

**File**: Any deeply nested component

```tsx
'use client';

import { useRole } from '@/contexts/role-context';

export function SomeNestedComponent() {
  const { isDoctor, loading } = useRole();

  if (loading) return null;

  return (
    <div>
      {isDoctor && <button>Doctor Action</button>}
    </div>
  );
}
```

---

## Quick Start: Update Your Dashboard Now

### Step 1: Add the wrapper to your dashboard

Open `frontend/src/app/dashboard/page.tsx` and add this import at the top:

```tsx
import { RoleDashboardWrapper } from '@/components/dashboard/role-dashboard-wrapper';
```

### Step 2: Wrap your return statement

Change your return from:
```tsx
return (
  <div className="space-y-8">
    {/* your content */}
  </div>
);
```

To:
```tsx
return (
  <RoleDashboardWrapper>
    <div className="space-y-8">
      {/* your content */}
    </div>
  </RoleDashboardWrapper>
);
```

That's it! Your dashboard now has role-based access control. ✅

---

## Testing Your Setup

### 1. Make sure Hardhat is running:
```bash
cd ethereum-contracts
npx hardhat node
```

### 2. Assign a test role to your MetaMask wallet:

```bash
cd ethereum-contracts
npx hardhat console --network localhost
```

Then in the console:
```javascript
const HealthLink = await ethers.getContractFactory("HealthLink");
const contract = HealthLink.attach("0x998abeb3E57409262aE5b751f60747921B33613E");

// Get your MetaMask address
const myAddress = "YOUR_METAMASK_ADDRESS_HERE";

// Grant patient role
const PATIENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PATIENT_ROLE"));
await contract.grantRole(PATIENT_ROLE, myAddress);
console.log("Patient role granted!");

// Or grant doctor role
const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DOCTOR_ROLE"));
await contract.grantRole(DOCTOR_ROLE, myAddress);
console.log("Doctor role granted!");
```

### 3. Connect MetaMask to localhost:8545

1. Open MetaMask
2. Switch to "Localhost 8545" network
3. Import the Hardhat test account or use your own
4. Make sure you're on chainId 1337

### 4. Visit your dashboard

Navigate to `http://localhost:3000/dashboard`

You should see:
- ✅ Loading spinner while checking role
- ✅ Role badge at the top (Patient/Doctor/Admin)
- ✅ Your dashboard content

---

## Troubleshooting

### Error: "MetaMask not found"
- Install MetaMask extension
- Unlock your wallet
- Switch to localhost:8545 network

### Error: "Contract address not configured"
- Check that `.env.local` has `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS`
- Restart your Next.js dev server after adding the env variable

### Error: "No role assigned"
- Your wallet doesn't have a role on the smart contract yet
- Follow the "Assign a test role" steps above

### Role not updating
- Refresh the page
- Or call `refetch()` from the hook:
  ```tsx
  const { refetch } = useUserRole();
  // Later...
  await refetch();
  ```

---

## Next Steps

1. **Add role-specific stats** - Show different metrics for doctors vs patients
2. **Create role-specific pages** - `/dashboard/doctor`, `/dashboard/patient`
3. **Add admin panel** - Manage user roles from the UI
4. **Protect routes** - Redirect users based on their role

See the full documentation at `ROLE_MANAGEMENT_SETUP.md` for more advanced patterns!
