# RBAC Fix - Testing Guide

## 🎯 What Was Fixed

### 1. **Created Role Helper Utilities** (`frontend/src/lib/roleHelpers.ts`)
   - Centralized role hash management
   - Converts bytes32 hashes to human-readable strings
   - Provides helper functions for role checking
   - **Usage:**
     ```ts
     import { ROLE_HASHES, decodeRoleHash, checkUserRole } from '@/lib/roleHelpers';
     
     // Check if user has a role
     const hasRole = await checkUserRole(contract, address, 'DOCTOR');
     
     // Decode a role hash
     const roleName = decodeRoleHash(hash); // Returns 'DOCTOR', 'ADMIN', or 'PATIENT'
     ```

### 2. **Created RoleDebugger Component** (`frontend/src/components/debug/RoleDebugger.tsx`)
   - Displays connected wallet address
   - Shows raw bytes32 role hashes from contract
   - Decodes and displays human-readable role names
   - Checks all three roles (ADMIN, DOCTOR, PATIENT)
   - Provides detailed console logging
   - **Usage:** Add to any page for debugging:
     ```tsx
     import { RoleDebugger } from '@/components/debug/RoleDebugger';
     
     function MyPage() {
       return (
         <>
           {process.env.NODE_ENV === 'development' && <RoleDebugger />}
           {/* rest of page */}
         </>
       );
     }
     ```

### 3. **Created Fixed Doctor Actions** (`frontend/src/components/doctor/DoctorActions.tsx`)
   - `AddPatientDialog`: Fixed "Add Patient" with proper error handling
   - `ScheduleAppointmentDialog`: Fixed "Schedule Appointment" with proper error handling
   - **Features:**
     - ✅ Proper signer initialization
     - ✅ Argument logging before transaction
     - ✅ Role permission checking
     - ✅ Comprehensive error handling
     - ✅ User-friendly error messages
     - ✅ Loading states
     - ✅ Success notifications
   
   - **Usage:**
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

### 4. **Created Grant Roles Script** (`ethereum-contracts/scripts/grant-roles.ts`)
   - Grants DOCTOR_ROLE and PATIENT_ROLE to any address
   - Accepts address as command line argument
   - Verifies roles were granted successfully
   - **Usage:**
     ```bash
     cd ethereum-contracts
     npx hardhat run scripts/grant-roles.ts --network sepolia 0xYourWalletAddress
     ```

### 5. **Updated useUserRole Hook** (`frontend/src/hooks/useUserRole.ts`)
   - Now uses centralized ROLE_HASHES from roleHelpers
   - Ensures consistency across the app
   - No functional changes, just better organization

---

## 🧪 Testing Steps (DO NOT SKIP)

### Step 1: Grant Roles to Your Test Wallet

1. **Get your MetaMask wallet address:**
   ```
   Open MetaMask → Copy your address
   Example: 0x7C5c39F96aC2ae2DAE9e6aB5d47dA3f1e234D742
   ```

2. **Run the grant-roles script:**
   ```bash
   cd ethereum-contracts
   npx hardhat run scripts/grant-roles.ts --network sepolia 0xYOUR_ADDRESS_HERE
   ```

3. **Expected output:**
   ```
   ╔════════════════════════════════════════════════════════════════════╗
   ║                    GRANT DOCTOR ROLE SCRIPT                        ║
   ╚════════════════════════════════════════════════════════════════════╝

   🎯 Target Address: 0x7C5c39F96aC2ae2DAE9e6aB5d47dA3f1e234D742

   👤 Deployer Address: 0x...
   💰 Deployer Balance: 0.5 ETH

   📄 HealthLink Contract: 0xA94AFCbFF804527315391EA52890c826f897A757

   🔍 Checking existing roles...
      DOCTOR_ROLE:  ❌ Does not have
      PATIENT_ROLE: ❌ Does not have

   ⏳ Granting DOCTOR_ROLE...
      📤 Transaction Hash: 0x...
      ✅ DOCTOR_ROLE granted successfully!
      🧱 Block Number: 7890123

   ⏳ Granting PATIENT_ROLE...
      📤 Transaction Hash: 0x...
      ✅ PATIENT_ROLE granted successfully!

   ╔════════════════════════════════════════════════════════════════════╗
   ║                            SUCCESS                                 ║
   ╠════════════════════════════════════════════════════════════════════╣
   ║ Address 0x7C5c...2742 now has:                                    ║
   ║ ✅ DOCTOR_ROLE                                                     ║
   ║ ✅ PATIENT_ROLE                                                    ║
   ╚════════════════════════════════════════════════════════════════════╝
   ```

---

### Step 2: Add RoleDebugger to Doctor Dashboard

1. **Open** `frontend/src/app/dashboard/doctor/page.tsx`

2. **Add import:**
   ```tsx
   import { RoleDebugger } from '@/components/debug/RoleDebugger';
   ```

3. **Add component at the top of the page:**
   ```tsx
   export default function DoctorDashboard() {
     return (
       <div className="space-y-6">
         {/* Add this line */}
         {process.env.NODE_ENV === 'development' && <RoleDebugger />}
         
         {/* Rest of dashboard */}
       </div>
     );
   }
   ```

---

### Step 3: Test Role Debugging

1. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open http://localhost:3000**

3. **Sign in with your wallet**

4. **Navigate to Doctor Dashboard**

5. **You should see the RoleDebugger component showing:**
   - ✅ Your wallet address
   - ✅ Contract address
   - ✅ DOCTOR_ROLE: HAS ROLE ✅
   - ✅ PATIENT_ROLE: HAS ROLE ✅
   - ✅ ADMIN_ROLE: NO ROLE ❌ (unless you're the deployer)

6. **Check browser console for detailed logs:**
   ```
   🔍 Step 1: MetaMask detected ✅
   🔍 Checking DOCTOR_ROLE...
      Hash: 0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f
      Address: 0x7C5c39F96aC2ae2DAE9e6aB5d47dA3f1e234D742
      Result: ✅ HAS ROLE

   ╔════════════════════════════════════════════════════════════════════╗
   ║                      ROLE CHECK SUMMARY                            ║
   ╠════════════════════════════════════════════════════════════════════╣
   ║ ADMIN      ❌ NO                                                   ║
   ║ DOCTOR     ✅ YES                                                  ║
   ║ PATIENT    ✅ YES                                                  ║
   ╚════════════════════════════════════════════════════════════════════╝
   ```

**🚨 If you see all "NO ROLE" - go back to Step 1 and grant roles!**

---

### Step 4: Test "Add Patient" Functionality

1. **Replace the existing "Add Patient" button with the new component:**

   Open `frontend/src/app/dashboard/doctor/patients/page.tsx` (or wherever you have the button)

   **Add import:**
   ```tsx
   import { AddPatientDialog } from '@/components/doctor/DoctorActions';
   ```

   **Replace button:**
   ```tsx
   // Old (if you have something like this):
   <Button onClick={handleAddPatient}>Add Patient</Button>

   // New:
   <AddPatientDialog />
   ```

2. **Test the functionality:**
   - Click "Add Patient" button
   - Fill in the form:
     - Patient ID: `TEST_PATIENT_001`
     - Name: `John Doe`
     - Age: `35`
     - Blood Type: `A+`
     - Allergies: `None`
   - Click "Create Patient"

3. **Expected behavior:**
   - ✅ Button shows "Creating..." with spinner
   - ✅ MetaMask popup appears
   - ✅ Approve transaction
   - ✅ Success notification appears
   - ✅ Dialog closes
   - ✅ Console shows detailed logs:
     ```
     🔍 Step 1: MetaMask detected ✅
     🔍 Step 2: Signer initialized ✅
        Doctor Address: 0x7C5c39F96aC2ae2DAE9e6aB5d47dA3f1e234D742
     🔍 Step 3: Contract ABI loaded ✅
     🔍 Step 4: Contract address obtained ✅
        Address: 0xA94AFCbFF804527315391EA52890c826f897A757
     🔍 Step 5: Contract initialized ✅
     🔍 Step 6: Arguments validated ✅

     📤 Transaction Arguments:
        patientId: "TEST_PATIENT_001" (string)
        name: "John Doe" (string)
        age: 35 (number)
        bloodType: "A+" (string)
        allergies: "None" (string)

     🔍 Step 7: Checking DOCTOR_ROLE...
        Role Hash: 0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f
        Has Role: ✅ YES

     ⏳ Step 8: Sending transaction...
        📤 Transaction Hash: 0x...
        ⏳ Waiting for confirmation...
        ✅ Transaction confirmed!
        🧱 Block Number: 7890125
        ⛽ Gas Used: 123456
     ```

4. **If transaction fails:**
   - Check console for error message
   - Common errors:
     - **"Does not have DOCTOR_ROLE"** → Run grant-roles script again
     - **"User rejected transaction"** → You clicked "Reject" in MetaMask
     - **"Insufficient funds"** → Get more Sepolia ETH from faucet
     - **"Transaction reverted"** → Contract might not be deployed correctly

---

### Step 5: Test "Schedule Appointment" Functionality

1. **Add the Schedule Appointment component:**

   Open appointments page: `frontend/src/app/dashboard/appointments/page.tsx`

   **Add import:**
   ```tsx
   import { ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
   ```

   **Replace button:**
   ```tsx
   // Old:
   <Button>Schedule Appointment</Button>

   // New:
   <ScheduleAppointmentDialog />
   ```

2. **Test the functionality:**
   - Click "Schedule Appointment"
   - Fill in the form:
     - Appointment ID: `APT_001`
     - Patient ID: `TEST_PATIENT_001` (use the patient you just created)
     - Date: Tomorrow's date
     - Time: `10:00`
     - Type: `Checkup`
     - Notes: `Initial consultation`
   - Click "Schedule"

3. **Expected behavior:**
   - ✅ MetaMask popup
   - ✅ Transaction confirmed
   - ✅ Success notification
   - ✅ Console logs similar to Add Patient

---

### Step 6: Test Admin Dashboard (Optional)

1. **If you're the deployer, you have ADMIN_ROLE automatically**

2. **Navigate to** `/dashboard/admin`

3. **You should have access**

4. **If you see "Access Denied":**
   - Check RoleDebugger - do you have ADMIN_ROLE?
   - If not, you need to use the deployer wallet
   - Or grant yourself ADMIN_ROLE (not recommended unless you're the deployer)

---

## 🐛 Troubleshooting

### Problem: "All roles show NO ROLE"

**Solution:**
```bash
# Grant roles to your wallet
cd ethereum-contracts
npx hardhat run scripts/grant-roles.ts --network sepolia 0xYOUR_ADDRESS
```

---

### Problem: "Contract address not configured"

**Solution:**
```bash
# Check environment variables
cd frontend
cat .env.local

# Make sure these are set:
NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS=0xA94AFCbFF804527315391EA52890c826f897A757
NEXT_PUBLIC_CONTRACT_APPOINTMENTS=0x1A3F11F1735bB703587274478EEc323dC180304a

# If missing, create .env.local with these values
```

---

### Problem: "Failed to load contract ABI"

**Solution:**
```bash
# Copy contract artifacts to frontend
cd ethereum-contracts
mkdir -p ../frontend/public/contracts
cp artifacts/contracts/HealthLink.sol/HealthLink.json ../frontend/public/contracts/
cp artifacts/contracts/Appointments.sol/Appointments.json ../frontend/public/contracts/
cp contracts/deployment-addresses.json ../frontend/public/contracts/

# Restart frontend
cd ../frontend
npm run dev
```

---

### Problem: "Transaction reverted"

**Causes:**
1. **You don't have DOCTOR_ROLE** → Run grant-roles script
2. **Patient ID already exists** → Use a different ID
3. **Contract not deployed** → Redeploy contracts
4. **Wrong network** → Make sure you're on Sepolia

**Debug steps:**
```bash
# 1. Check your role on blockchain
npx hardhat console --network sepolia

const HealthLink = await ethers.getContractFactory('HealthLink');
const healthlink = HealthLink.attach('0xA94AFCbFF804527315391EA52890c826f897A757');
const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'));
await healthlink.hasRole(DOCTOR_ROLE, '0xYOUR_ADDRESS');
// Should return: true

# 2. Check if patient already exists
await healthlink.getPatient('TEST_PATIENT_001');
// If exists property is true, patient already exists
```

---

## 📚 Additional Resources

### Role Hashes Reference
```
ADMIN_ROLE:   0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775
DOCTOR_ROLE:  0x71f3d55856e4058ed06ee057d79ada615f65cdf5f9ee88181b914225088f834f
PATIENT_ROLE: 0x8d7cac9e45347f4645dedc4ae8e18e63cbd1ecbca0f4d865d40a419dd41c5e16
```

### Useful Commands
```bash
# Check Sepolia balance
npx hardhat run scripts/check-balance.js --network sepolia

# List all contracts
ls ethereum-contracts/artifacts/contracts/

# View transaction on Etherscan
https://sepolia.etherscan.io/tx/0xYOUR_TX_HASH

# Get Sepolia ETH
https://sepoliafaucet.com/
```

---

## ✅ Success Checklist

Before considering testing complete, ensure:

- [ ] Grant-roles script runs successfully
- [ ] RoleDebugger shows your roles correctly
- [ ] Add Patient works without errors
- [ ] Schedule Appointment works without errors
- [ ] Console logs show detailed transaction info
- [ ] No "reverted" errors
- [ ] MetaMask prompts appear
- [ ] Success notifications appear
- [ ] All transactions confirmed on Sepolia

---

## 🚀 When All Tests Pass

**Only after all tests pass locally**, you can:

1. **Remove RoleDebugger from production:**
   ```tsx
   // Keep it only for development
   {process.env.NODE_ENV === 'development' && <RoleDebugger />}
   ```

2. **Commit changes:**
   ```bash
   git add .
   git commit -m "fix: RBAC issues - Add proper role checking and error handling"
   ```

3. **Push to repository:**
   ```bash
   git push origin main
   ```

4. **Deploy to production** (Vercel/Render will auto-deploy)

---

## 📝 Files Created/Modified

### Created:
- `frontend/src/lib/roleHelpers.ts` - Role utility functions
- `frontend/src/components/debug/RoleDebugger.tsx` - Debug component
- `frontend/src/components/doctor/DoctorActions.tsx` - Fixed doctor actions
- `ethereum-contracts/scripts/grant-roles.ts` - Role granting script
- `RBAC_TESTING_GUIDE.md` - This file

### Modified:
- `frontend/src/hooks/useUserRole.ts` - Now uses roleHelpers

---

## 🎯 Next Steps

After testing locally:

1. Integrate `AddPatientDialog` and `ScheduleAppointmentDialog` into your existing pages
2. Remove or comment out the RoleDebugger (or keep it behind NODE_ENV check)
3. Test one more time end-to-end
4. Commit and push
5. Verify on production deployment

**DO NOT deploy until all tests pass locally!** ✋
