# Role Management System Setup Guide

## Overview
This guide shows how to integrate the Ethereum smart contract-based role management system into your HealthLink frontend.

## Architecture

The role system consists of:
1. **Custom Hook** (`useUserRole`) - Fetches roles from smart contract
2. **Context Provider** (`RoleProvider`) - Global state for roles
3. **Role Guards** - Components for conditional rendering

## Step 1: Add Contract Address to Environment

Add your deployed HealthLink contract address to `.env.local`:

```env
NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**To find your contract address:**
```bash
# Check your deployment scripts output or
cd ../middleware-api
node -e "console.log(require('./config/contract-config.json').healthlink.address)"
```

## Step 2: Add Contract ABI to Public Folder

Copy your contract ABI to the public folder:

```bash
# From the root of your project
cp artifacts/contracts/HealthLink.sol/HealthLink.json frontend/public/contracts/
```

Or manually create `frontend/public/contracts/HealthLink.json` with your contract ABI.

## Step 3: Wrap Your App with RoleProvider

Update `frontend/src/app/layout.tsx`:

```tsx
import { RoleProvider } from '@/contexts/role-context';
import { AuthProvider } from '@/contexts/auth-context'; // Your existing auth

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RoleProvider>
            {children}
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Important:** `RoleProvider` must be inside `AuthProvider` since it depends on authentication state.

## Step 4: Use Role-Based Rendering

### Method 1: Using the Hook Directly

```tsx
'use client';

import { useUserRole } from '@/hooks/useUserRole';

export default function DashboardPage() {
  const { isDoctor, isPatient, isAdmin, loading, error } = useUserRole();

  if (loading) return <div>Loading your role...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {isDoctor && <DoctorDashboard />}
      {isPatient && <PatientDashboard />}
      {isAdmin && <AdminDashboard />}
    </div>
  );
}
```

### Method 2: Using the Context

```tsx
'use client';

import { useRole } from '@/contexts/role-context';

export default function SomePage() {
  const { isDoctor, loading } = useRole();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isDoctor && <p>Welcome, Doctor!</p>}
    </div>
  );
}
```

### Method 3: Using Role Guard Component

```tsx
import { RoleGuard } from '@/components/examples/role-based-examples';

export default function ProtectedPage() {
  return (
    <div>
      {/* Only doctors can see this section */}
      <RoleGuard allowedRoles={['doctor']}>
        <DoctorOnlyContent />
      </RoleGuard>

      {/* Doctors and admins can see this */}
      <RoleGuard allowedRoles={['doctor', 'admin']}>
        <StaffContent />
      </RoleGuard>

      {/* Everyone sees this */}
      <PublicContent />
    </div>
  );
}
```

## Step 5: Update Your Dashboard

Replace your existing dashboard page with role-based routing:

**Option A: Single Dashboard with Conditional Content**

```tsx
// frontend/src/app/dashboard/page.tsx
'use client';

import { RoleBasedDashboard } from '@/components/examples/role-based-examples';

export default function DashboardPage() {
  return <RoleBasedDashboard />;
}
```

**Option B: Separate Dashboard Routes**

```tsx
// frontend/src/app/dashboard/page.tsx
'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { isDoctor, isPatient, isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (loading) return;

    if (isAdmin) {
      redirect('/dashboard/admin');
    } else if (isDoctor) {
      redirect('/dashboard/doctor');
    } else if (isPatient) {
      redirect('/dashboard/patient');
    } else {
      redirect('/no-role');
    }
  }, [isAdmin, isDoctor, isPatient, loading]);

  return <div>Redirecting...</div>;
}
```

## API Reference

### `useUserRole()` Hook

```tsx
const {
  // Role flags
  isDoctor: boolean;
  isPatient: boolean;
  isAdmin: boolean;

  // State
  loading: boolean;
  error: string | null;
  walletAddress: string | null;

  // Methods
  refetch: () => Promise<void>;
} = useUserRole(autoFetch?: boolean);
```

**Parameters:**
- `autoFetch` (optional): Whether to automatically fetch roles on mount. Default: `true`

**Returns:**
- `isDoctor`: True if user has DOCTOR_ROLE on smart contract
- `isPatient`: True if user has PATIENT_ROLE
- `isAdmin`: True if user has ADMIN_ROLE  
- `loading`: True while fetching roles from blockchain
- `error`: Error message if role check failed
- `walletAddress`: Connected wallet address
- `refetch`: Function to manually re-check roles

### Helper Hooks

#### `useRoleFlags()`
Returns only the role boolean flags:
```tsx
const { isDoctor, isPatient, isAdmin } = useRoleFlags();
```

#### `useHasRole()`
Check if user has any of the specified roles:
```tsx
const hasAccess = useHasRole('doctor', 'admin');
if (hasAccess) {
  // User is either a doctor or admin
}
```

## Smart Contract Role Hashes

The system uses these keccak256 role hashes:

```typescript
const ROLES = {
  ADMIN: ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE')),
  DOCTOR: ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE')),
  PATIENT: ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE')),
};
```

## Assigning Roles on Smart Contract

To assign roles to wallet addresses, call your smart contract's `grantRole` function:

```javascript
// Using ethers.js
const contract = new ethers.Contract(address, abi, signer);

// Grant doctor role
const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'));
await contract.grantRole(DOCTOR_ROLE, '0xDoctorWalletAddress');

// Grant patient role
const PATIENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE'));
await contract.grantRole(PATIENT_ROLE, '0xPatientWalletAddress');
```

**Note:** Only accounts with `ADMIN_ROLE` can grant roles.

## Troubleshooting

### "MetaMask not found"
- Ensure MetaMask is installed and unlocked
- Check that you're on the correct network (localhost:8545 for development)

### "Contract not found"
- Verify `NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS` is set
- Ensure the contract ABI exists at `/public/contracts/HealthLink.json`
- Check that Hardhat node is running

### "Execution reverted"
- Make sure your wallet is connected
- Verify the contract is deployed to the correct network
- Check Hardhat console for detailed error messages

### Roles not updating
- Call `refetch()` to manually refresh roles
- Roles auto-refresh when user changes (via AuthContext)
- Check browser console for errors

## Example: Complete Dashboard Integration

```tsx
// frontend/src/app/dashboard/page.tsx
'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { isDoctor, isPatient, isAdmin, loading, error, refetch } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {isAdmin && 'Admin Dashboard'}
        {isDoctor && 'Doctor Dashboard'}
        {isPatient && 'Patient Dashboard'}
      </h1>

      {isDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">24</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Appointments Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">8</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">5</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isPatient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View All Records</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Schedule</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

## Testing

1. **Start Hardhat Node:**
   ```bash
   npx hardhat node
   ```

2. **Deploy Contract:**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Assign Test Roles:**
   ```javascript
   // scripts/assign-roles.js
   const hre = require("hardhat");
   
   async function main() {
     const contract = await hre.ethers.getContractAt("HealthLink", "YOUR_CONTRACT_ADDRESS");
     const DOCTOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("DOCTOR_ROLE"));
     
     await contract.grantRole(DOCTOR_ROLE, "0xDoctorWalletAddress");
     console.log("Doctor role assigned");
   }
   
   main();
   ```

4. **Test in Browser:**
   - Connect MetaMask to localhost:8545
   - Import test account with assigned role
   - Navigate to dashboard
   - Verify correct role-based content displays

## Next Steps

- Implement role-specific pages under `/dashboard/[role]`
- Add role requirements to API routes
- Create admin panel for role management
- Add role change notifications
- Implement role caching for better performance
