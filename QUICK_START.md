# HealthLink - Quick Start Guide

## Prerequisites
- Node.js v22+ installed
- MetaMask browser extension
- Git

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Blockchain
```powershell
# Terminal 1 - Start Hardhat node (keep running)
cd ethereum-contracts
npx hardhat node
```

### Step 2: Deploy & Start Backend
```powershell
# Terminal 2 - Deploy contracts and start backend
cd ethereum-contracts
npx hardhat run scripts/deploy.js --network localhost

# Copy deployment addresses to frontend
Copy-Item deployment-addresses.json ../frontend/public/contracts/deployment-addresses.json

# Start backend
cd ../middleware-api
npm start
```

### Step 3: Start Frontend
```powershell
# Terminal 3 - Start Next.js frontend
cd frontend
npm run dev
```

**🎉 Done!** Open http://localhost:3000

---

## 🦊 MetaMask Setup

### Add Local Network
1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add network manually"
3. Fill in:
   - **Network Name**: Localhost 8545
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
4. Click "Save"

### Import Test Account
1. Click account icon → "Import Account"
2. Paste private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
3. You now have 10000 ETH for testing!

---

## 🔗 Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Ethereum RPC**: http://127.0.0.1:8545
- **Supabase**: https://wpmgqueyuwuvdcavzthg.supabase.co

---

## 🧪 Testing

### Test Backend Integration
```powershell
cd middleware-api
node test-backend.js
```

### Test Smart Contracts
```powershell
cd ethereum-contracts
npx hardhat test
```

### Check Supabase Connection
```powershell
cd middleware-api
node test-supabase.js
```

---

## 🛠️ Common Issues

### Issue: "Contract not deployed"
**Solution**: Redeploy contracts
```powershell
cd ethereum-contracts
npx hardhat run scripts/deploy.js --network localhost
Copy-Item deployment-addresses.json ../frontend/public/contracts/deployment-addresses.json
```

### Issue: "Cannot connect to MetaMask"
**Solution**: 
1. Make sure MetaMask is installed
2. Switch to "Localhost 8545" network in MetaMask
3. Refresh the page

### Issue: "Network error" in frontend
**Solution**: 
1. Check Hardhat node is running (Terminal 1)
2. Check backend is running (Terminal 2)
3. Verify contract addresses are updated in frontend

### Issue: "Supabase connection failed"
**Solution**: Check `.env` file has correct credentials:
```env
SUPABASE_URL=https://wpmgqueyuwuvdcavzthg.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📱 Using the Application

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve MetaMask connection
- Your address will be displayed

### 2. Create Patient
```javascript
// Example API call
POST http://localhost:3001/api/v1/healthcare/patients
{
  "patientAddress": "0x1234567890abcdef...",
  "name": "John Doe",
  "age": 30,
  "gender": "Male",
  "ipfsHash": "QmTestHash123"
}
```

### 3. View Patient
```javascript
GET http://localhost:3001/api/v1/healthcare/patients/P001
```

### 4. Create Medical Record
```javascript
POST http://localhost:3001/api/v1/healthcare/records
{
  "recordId": "R001",
  "patientId": "P001",
  "doctorId": "D001",
  "recordType": "Consultation",
  "ipfsHash": "QmXXXXX...",
  "metadata": "Patient checkup"
}
```

---

## 🔑 Test Accounts (Hardhat)

| Account | Address | Private Key | Balance |
|---------|---------|-------------|---------|
| #0 (Deployer) | `0xf39Fd...92266` | `0xac097...2ff80` | 10000 ETH |
| #1 | `0x7099...c4cA6` | `0x5951...5d03d` | 10000 ETH |
| #2 | `0x3C44...f21cF` | `0x80ea...e15f2` | 10000 ETH |

Import any of these into MetaMask for testing.

---

## 📊 Current Contract Addresses

After running `npx hardhat run scripts/deploy.js --network localhost`:

- **HealthLink**: `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c`
- **PatientRecords**: `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d`
- **Appointments**: `0x59b670e9fA9D0A427751Af201D676719a970857b`
- **Prescriptions**: `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1`
- **DoctorCredentials**: `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44`

⚠️ **Note**: These change every time you restart Hardhat node!

---

## 🔄 Restart Everything

If things get messed up:

```powershell
# Kill all terminals (Ctrl+C on each)

# Terminal 1
cd ethereum-contracts
npx hardhat node

# Terminal 2 (wait 2 seconds)
cd ethereum-contracts
npx hardhat run scripts/deploy.js --network localhost
Copy-Item deployment-addresses.json ../frontend/public/contracts/deployment-addresses.json
cd ../middleware-api
npm start

# Terminal 3
cd frontend
npm run dev
```

---

## 💡 Pro Tips

1. **Keep Hardhat running**: Don't close Terminal 1 or you'll lose all blockchain data
2. **One deployment**: Only deploy contracts once per Hardhat restart
3. **Update addresses**: Always copy deployment addresses to frontend after deploying
4. **Reset MetaMask**: If transactions fail, reset MetaMask account (Settings → Advanced → Reset Account)
5. **Check console**: Both frontend and backend have helpful console logs

---

## 📞 Need Help?

1. Check [README.md](README.md) for detailed documentation
2. Review test files for usage examples:
   - `middleware-api/test-backend.js`
   - `ethereum-contracts/test/*.test.js`
3. Check logs in browser console and terminal

---

**Status**: ✅ All Systems Operational
**Version**: 1.0.0
**Last Updated**: December 13, 2024
