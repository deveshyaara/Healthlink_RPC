# 🚀 Vercel Frontend Deployment Guide

Complete guide to deploy HealthLink Next.js frontend to Vercel.

---

## 📋 Prerequisites

- [x] GitHub account
- [x] Vercel account (sign up at https://vercel.com)
- [x] Smart contracts deployed to Sepolia
- [x] Backend deployed on Render

---

## 🎯 Step 1: Prepare GitHub Repository

### Push to GitHub:

```bash
cd c:\Users\deves\Desktop\HealthLink\Healthlink_RPC

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/healthlink.git

# Push
git push -u origin main
```

---

## 🚀 Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import Repository**
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables**
   
   Click "Environment Variables" and add:

   ```env
   NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/wtVyTBINEO9Eoc4Dai8Mg
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_BACKEND_URL=https://YOUR_BACKEND.onrender.com
   NEXT_PUBLIC_CONTRACT_HEALTHLINK=YOUR_DEPLOYED_ADDRESS
   NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS=YOUR_DEPLOYED_ADDRESS
   NEXT_PUBLIC_CONTRACT_APPOINTMENTS=YOUR_DEPLOYED_ADDRESS
   NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS=YOUR_DEPLOYED_ADDRESS
   NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS=YOUR_DEPLOYED_ADDRESS
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Get your live URL: `https://your-project.vercel.app`

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? healthlink-frontend
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

---

## 🔧 Step 3: Configure Environment Variables

### After First Deployment:

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add all environment variables from `.env.production`
4. Click "Redeploy" to apply changes

### Update Contract Addresses:

After deploying contracts to Sepolia, update these in Vercel:

```env
NEXT_PUBLIC_CONTRACT_HEALTHLINK=0xYourDeployedAddress
NEXT_PUBLIC_CONTRACT_PATIENT_RECORDS=0xYourDeployedAddress
NEXT_PUBLIC_CONTRACT_APPOINTMENTS=0xYourDeployedAddress
NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS=0xYourDeployedAddress
NEXT_PUBLIC_CONTRACT_DOCTOR_CREDENTIALS=0xYourDeployedAddress
```

---

## 🔗 Step 4: Update Backend CORS

Update your backend `.env` on Render:

```env
CORS_ORIGIN=https://your-project.vercel.app,http://localhost:3000
```

Then restart the backend service on Render.

---

## ✅ Step 5: Verify Deployment

1. **Visit Your Site**
   - Open: `https://your-project.vercel.app`

2. **Check MetaMask Connection**
   - Connect wallet
   - Verify Sepolia network

3. **Test API Connection**
   - Check browser console for errors
   - Verify backend API calls work

4. **Test Smart Contract Interaction**
   - Try connecting MetaMask
   - Check role-based features

---

## 🔄 Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys in ~2 minutes
```

**Preview Deployments:**
- Every branch/PR gets a unique preview URL
- Main branch deploys to production

---

## 📊 Monitoring

### View Logs:
1. Go to Vercel Dashboard
2. Click your project
3. Click "Deployments"
4. Click any deployment
5. View "Build Logs" or "Function Logs"

### Performance:
- Vercel Analytics (free): Settings → Analytics
- Web Vitals tracking included

---

## 🎯 Custom Domain (Optional)

1. Go to project settings
2. Click "Domains"
3. Add your domain: `healthlink.com`
4. Follow DNS setup instructions
5. SSL certificate auto-generated

---

## 🐛 Troubleshooting

### Build Fails:

```bash
# Check build locally first
cd frontend
npm run build

# Fix errors, then push
git add .
git commit -m "Fix build"
git push
```

### Environment Variables Not Working:

- Ensure all vars start with `NEXT_PUBLIC_`
- Redeploy after adding env vars
- Check "Build Logs" for errors

### MetaMask Connection Issues:

- Verify `NEXT_PUBLIC_CHAIN_ID=11155111`
- Check contract addresses are correct
- Ensure user is on Sepolia network

### Backend API Errors:

- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check backend CORS settings include Vercel URL
- Test backend health: `https://your-backend.onrender.com/health`

---

## 💰 Pricing

**Vercel Free Tier (Hobby):**
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ✅ Analytics
- ❌ Team features

**Upgrade to Pro ($20/month):**
- Increased limits
- Team collaboration
- Advanced analytics
- Priority support

---

## 🔐 Security Checklist

- [x] All contract addresses in environment variables
- [x] No private keys in frontend code
- [x] CORS properly configured
- [x] HTTPS enabled (automatic)
- [x] Rate limiting on backend

---

## 📝 Quick Commands

```bash
# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm deployment-url

# Open project in browser
vercel open
```

---

## 🎉 Success!

Your frontend should now be live at:
- **Production**: `https://your-project.vercel.app`
- **Preview**: Unique URL for each branch

Next: Update contract addresses and test thoroughly!

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Discord**: https://vercel.com/discord

**Version**: 1.0.0  
**Last Updated**: December 14, 2025
