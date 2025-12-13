# HealthLink Ethereum - Quick Start Scripts

## 🚀 Getting Started

This directory contains all the scripts you need to work with HealthLink Ethereum contracts.

## Available Scripts

### 1. Start Local Blockchain
```bash
npm run node
```
Starts a local Hardhat blockchain node on `http://127.0.0.1:8545`

### 2. Compile Contracts
```bash
npm run compile
```
Compiles all Solidity contracts

### 3. Run Tests
```bash
npm test
```
Runs the complete test suite (28 tests)

### 4. Deploy Contracts
```bash
# Deploy to localhost (make sure node is running first)
npm run deploy:localhost

# Or use the deploy script directly
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Interact with Contracts
```bash
npx hardhat run scripts/interact.js --network localhost
```
Runs example interactions:
- Creates a patient
- Creates a medical record
- Creates consent
- Fetches audit records

## 📁 Script Files

- **deploy.js** - Deploys all 5 contracts and sets up roles
- **interact.js** - Example interactions with deployed contracts

## 🔑 Test Accounts

When you run `npm run node`, you get 20 pre-funded accounts:

- Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (10000 ETH) - Owner/Admin
- Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (10000 ETH) - Admin
- Account #2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (10000 ETH) - Doctor
- Account #3: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (10000 ETH) - Patient

⚠️ **WARNING**: These accounts are publicly known. Never use them on mainnet!

## 📊 Deployment Info

After deploying, contract addresses are saved to `deployment-addresses.json`:

```json
{
  "network": "localhost",
  "chainId": 1337,
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "contracts": {
    "HealthLink": "0x...",
    "PatientRecords": "0x...",
    "Appointments": "0x...",
    "Prescriptions": "0x...",
    "DoctorCredentials": "0x..."
  }
}
```

## 🎯 Quick Demo

```bash
# Terminal 1: Start blockchain
npm run node

# Terminal 2: Deploy and interact
npm run deploy:localhost
npx hardhat run scripts/interact.js --network localhost
```

## 🧪 Development Workflow

1. Make changes to contracts in `/contracts`
2. Compile: `npm run compile`
3. Test: `npm test`
4. Deploy locally: `npm run deploy:localhost`
5. Interact: `npx hardhat run scripts/interact.js --network localhost`

## 📝 Creating Custom Scripts

Create a new JavaScript file in this directory:

```javascript
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  // Your code here
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it:
```bash
npx hardhat run scripts/your-script.js --network localhost
```

## 🔗 Useful Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org)
- [Parent README](../README.md)
