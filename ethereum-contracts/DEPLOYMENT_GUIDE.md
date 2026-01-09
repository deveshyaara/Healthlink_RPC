# HealthLink Contract Deployment Guide

## Current Status
- **New Wallet Address**: Will be detected from your `.env` file
- **Network**: Sepolia Testnet
- **Previous Deployment**: Older deployment detected from Dec 14, 2025

## Prerequisites

### 1. Ensure Your `.env` File is Correct

Your `.env` file should have:
```env
# Sepolia RPC URL - You can use one of these:
# Option 1: Alchemy (recommended)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Option 2: Infura
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY

# Option 3: Public RPC (not recommended for production)
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Your private key (64 hex characters, with or without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: Etherscan API for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Fund Your Wallet

Get Sepolia testnet ETH from one of these faucets:
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **Quicknode Faucet**: https://faucet.quicknode.com/ethereum/sepolia

You'll need approximately **0.05-0.1 ETH** for deploying all contracts.

## Deployment Steps

### Option 1: Deploy to Sepolia (Recommended)

```bash
# 1. Clean previous builds
npx hardhat clean

# 2. Compile contracts
npx hardhat compile

# 3. Deploy to Sepolia
npx hardhat run scripts/deploy-with-retry.js --network sepolia
```

### Option 2: Deploy Using Original Script

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Option 3: Test Locally First

```bash
# Start local Hardhat node in one terminal
npx hardhat node

# In another terminal, deploy to local node
npx hardhat run scripts/deploy.js --network localhost
```

## Troubleshooting

### Issue: RPC 522 Error or Timeout
**Solution**: Your RPC provider might be having issues. Try:
1. Use a different RPC provider (Alchemy or Infura)
2. Get a free API key from:
   - Alchemy: https://www.alchemy.com/
   - Infura: https://www.infura.io/

### Issue: "insufficient funds for gas"
**Solution**: Fund your wallet from a Sepolia faucet

### Issue: "nonce has already been used"
**Solution**: This happens with the old wallet. Your new wallet should not have this issue.

### Issue: "replacement transaction underpriced"
**Solution**: This is why you're using a new wallet! The new wallet has a clean nonce.

## After Deployment

Once deployment is successful, you need to:

1. **Update Backend `.env`**: Copy the contract addresses to your backend's `.env` file
2. **Update Frontend Config**: Update frontend configuration with new contract addresses
3. **Grant Roles**: You may need to grant roles to your backend wallet for contract interaction

### Grant Roles Script

After deployment, run:
```bash
node scripts/grant-role-simple.cjs
```

## Verification

Verify your contracts on Etherscan:
```bash
npx hardhat run scripts/verify-contracts.js --network sepolia
```

## Contract Addresses

After deployment, addresses will be saved to:
- `deployment-addresses.json` - Full deployment info
- `.env` - Contract addresses added automatically

## Testing Deployment

Test if contracts work:
```bash
# Test basic contract interaction
node scripts/test-healthlink.js

# Or run full test suite
npx hardhat test --network sepolia
```
