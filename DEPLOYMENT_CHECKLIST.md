# ✅ Complete Deployment Checklist

Step-by-step checklist for deploying HealthLink to production.

---

## 🎯 Phase 1: Get Test ETH (IN PROGRESS)

- [ ] **Visit Sepolia Faucet**: https://sepoliafaucet.com/
- [ ] **Enter Wallet Address**: `0x7C5c1D2A8ED6d47Bb3334AF5ac61558Dc1342742`
- [ ] **Wait for ETH**: ~1-2 minutes
- [ ] **Verify Balance**: Should have at least 0.1 ETH

**Alternative Faucets if needed:**
- [ ] Google Cloud Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- [ ] Chainlink Faucet: https://faucets.chain.link/sepolia
- [ ] Alchemy Discord: Use `/faucet` command

---

## 🚀 Phase 2: Deploy Smart Contracts

- [ ] **Deploy Contracts to Sepolia**
  ```bash
  cd ethereum-contracts
  npx hardhat run scripts/deploy.js --network sepolia
  ```

- [ ] **Save Contract Addresses**
  - HealthLink: `_________________`
  - PatientRecords: `_________________`
  - Appointments: `_________________`
  - Prescriptions: `_________________`
  - DoctorCredentials: `_________________`

- [ ] **Verify Deployment**
  - Check Etherscan Sepolia: https://sepolia.etherscan.io/
  - Search for your contract addresses

- [ ] **Assign Roles** (Optional for testing)
  ```bash
  node scripts/assign-role.js
  ```

---

## 🔧 Phase 3: Deploy Backend (Render)

- [ ] **Push Code to GitHub**
  ```bash
  git add .
  git commit -m "Ready for production"
  git push origin main
  ```

- [ ] **Create Render Account**
  - Visit: https://render.com
  - Sign up with GitHub

- [ ] **Create New Web Service**
  - Click "New +" → "Web Service"
  - Connect your GitHub repository
  - Select your repo

- [ ] **Configure Service**
  - Name: `healthlink-backend`
  - Region: `Oregon (US West)`
  - Branch: `main`
  - Root Directory: `middleware-api`
  - Runtime: `Node`
  - Build Command: `npm install`
  - Start Command: `node src/server.js`
  - Instance Type: `Free` (or `Starter $7/mo` for no sleep)

- [ ] **Add Environment Variables** in Render:
  ```env
  PORT=3001
  NODE_ENV=production
  ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
  CHAIN_ID=11155111
  PRIVATE_KEY=0x0ce524e7a89d96497a0d2ab561be6eca00d0f8a4514d2cf0d33b7907dde4f935
  CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000
  SUPABASE_URL=https://wpmgqueyuwuvdcavzthg.supabase.co
  SUPABASE_SERVICE_KEY=sb_secret_kJXx6swRb4HjzmuVVxg_NQ_VyBiARK4
  CONTRACT_HEALTHLINK=<from_phase_2>
  CONTRACT_PATIENT_RECORDS=<from_phase_2>
  CONTRACT_APPOINTMENTS=<from_phase_2>
  CONTRACT_PRESCRIPTIONS=<from_phase_2>
  CONTRACT_DOCTOR_CREDENTIALS=<from_phase_2>
  ```

- [ ] **Deploy**
  - Click "Create Web Service"
  - Wait 5-10 minutes for deployment

- [ ] **Save Backend URL**: `https://healthlink-backend.onrender.com`

- [ ] **Test Backend**
  ```bash
  curl https://healthlink-backend.onrender.com/health
  ```

---

## 🎨 Phase 4: Deploy Frontend (Vercel)

- [ ] **Create Vercel Account**
  - Visit: https://vercel.com
  - Sign up with GitHub

- [ ] **Import Project**
  - Click "Add New Project"
  - Select your GitHub repository
  - Click "Import"

- [ ] **Configure Project**
  - Framework: `Next.js` (auto-detected)
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

- [ ] **Add Environment Variables** in Vercel:
  ```env
  NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
  NEXT_PUBLIC_CHAIN_ID=11155111
  NEXT_PUBLIC_BACKEND_URL=https://healthlink-backend.onrender.com
  NEXT_PUBLIC_CONTRACT_HEALTHLINK=<from_phase_2>
  NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS=<from_phase_2>
  NEXT_PUBLIC_CONTRACT_APPOINTMENTS=<from_phase_2>
  NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS=<from_phase_2>
  NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS=<from_phase_2>
  ```

- [ ] **Deploy**
  - Click "Deploy"
  - Wait 2-3 minutes

- [ ] **Save Frontend URL**: `https://your-project.vercel.app`

---

## 🔗 Phase 5: Connect Everything

- [ ] **Update Backend CORS**
  - Go to Render dashboard
  - Update `CORS_ORIGIN` environment variable
  - Add: `https://your-project.vercel.app`
  - Restart service

- [ ] **Update Frontend Backend URL** (if needed)
  - Verify `NEXT_PUBLIC_BACKEND_URL` in Vercel
  - Redeploy if changed

---

## ✅ Phase 6: Testing

- [ ] **Test Frontend**
  - Visit: `https://your-project.vercel.app`
  - Page loads without errors
  - No console errors

- [ ] **Test MetaMask Connection**
  - Click "Connect Wallet"
  - Approve connection
  - Verify Sepolia network (ChainID 11155111)
  - Should see wallet address

- [ ] **Test Backend API**
  - Open browser console
  - Check network tab
  - Verify API calls to backend work
  - No CORS errors

- [ ] **Test Smart Contract Interaction**
  - Try role-based features
  - Check transactions on Sepolia Etherscan
  - Verify contract calls work

- [ ] **Test User Flows**
  - Doctor registration
  - Patient registration
  - Create medical record
  - View records
  - Book appointment

---

## 📊 Phase 7: Monitoring Setup

- [ ] **Vercel Analytics**
  - Go to project settings
  - Enable Analytics
  - Monitor Web Vitals

- [ ] **Render Monitoring**
  - Check deployment logs
  - Monitor service health
  - Set up email alerts

- [ ] **Etherscan Verification**
  - Verify contract source code (optional)
  - Makes debugging easier

---

## 🔐 Phase 8: Security Review

- [ ] **Environment Variables**
  - All secrets in env vars (not code)
  - No private keys in frontend
  - Backend private key secured

- [ ] **CORS Configuration**
  - Only allowed origins listed
  - No wildcard (*) in production

- [ ] **Rate Limiting**
  - Backend has rate limiting enabled
  - Protects against abuse

- [ ] **HTTPS**
  - Frontend: ✅ (Vercel auto-enables)
  - Backend: ✅ (Render auto-enables)

- [ ] **Database Security**
  - Supabase RLS enabled
  - Service key secured in env vars

---

## 📝 Phase 9: Documentation

- [ ] **Update README.md**
  - Add production URLs
  - Update deployment status

- [ ] **Document Contract Addresses**
  - Save in secure location
  - Add to project docs

- [ ] **Create User Guide**
  - How to connect MetaMask
  - How to use the app

---

## 🎉 Final Checklist

- [ ] All services deployed and running
- [ ] Frontend accessible at Vercel URL
- [ ] Backend responding to health checks
- [ ] MetaMask connects successfully
- [ ] Smart contracts deployed and verified
- [ ] All environment variables configured
- [ ] CORS properly configured
- [ ] Test flows working end-to-end
- [ ] No console errors
- [ ] Documentation updated

---

## 📞 URLs Summary

Fill these in as you complete deployment:

- **Frontend (Vercel)**: `https://________________.vercel.app`
- **Backend (Render)**: `https://________________.onrender.com`
- **Smart Contracts (Sepolia)**:
  - HealthLink: `0x________________`
  - PatientRecords: `0x________________`
  - Appointments: `0x________________`
  - Prescriptions: `0x________________`
  - DoctorCredentials: `0x________________`

---

## 🆘 If Something Goes Wrong

### Contract Deployment Failed:
- Check wallet has enough ETH
- Verify RPC URL is correct
- Try again with `--network sepolia`

### Backend Won't Start:
- Check Render logs
- Verify all env vars are set
- Check Node.js version (should be 22+)

### Frontend Build Failed:
- Run `npm run build` locally first
- Fix any TypeScript/ESLint errors
- Check all env vars start with `NEXT_PUBLIC_`

### CORS Errors:
- Update backend `CORS_ORIGIN`
- Include full Vercel URL
- Restart backend service

### MetaMask Won't Connect:
- Check `NEXT_PUBLIC_CHAIN_ID=11155111`
- Verify user is on Sepolia network
- Check contract addresses are correct

---

**Current Status**: Phase 1 - Waiting for test ETH  
**Next Step**: Get test ETH from faucet, then deploy contracts

**Version**: 1.0.0  
**Date**: December 14, 2025
