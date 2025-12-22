# 🚀 HealthLink Production Deployment Guide

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

### ✅ 1. Supabase Project
```bash
# Create a new Supabase project at https://supabase.com
# Note your project URL and service role key
```

### ✅ 2. Pinata IPFS Account
```bash
# Create account at https://pinata.cloud
# Generate API key and secret
```

### ✅ 3. Google Gemini API Key
```bash
# Get API key from https://makersuite.google.com/app/apikey
```

### ✅ 4. Ethereum RPC Access
```bash
# Use Alchemy, Infura, or similar
# Get your API key for Sepolia testnet
```

### ✅ 5. Supabase CLI (for local development)
```bash
# Install using one of these methods:

# Option A: Using Scoop (Windows)
scoop install supabase

# Option B: Using Chocolatey (Windows)
choco install supabase-cli

# Option C: Using npm (not recommended for global install)
# Follow: https://supabase.com/docs/guides/cli/getting-started
```

## 🔧 Step-by-Step Setup

### Step 1: Environment Variables

Edit `frontend/.env.local` with your real values:

```env
# Replace these with your actual values:

# Supabase (get from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinata IPFS (get from https://pinata.cloud)
PINATA_API_KEY=your-actual-pinata-api-key
PINATA_SECRET_API_KEY=your-actual-pinata-secret-key

# Google Gemini (get from https://makersuite.google.com)
GEMINI_API_KEY=your-actual-gemini-api-key

# Ethereum RPC (get from Alchemy/Infura)
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-actual-key
```

### Step 2: Database Setup

#### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI first (see prerequisites)

# Initialize Supabase in your project
cd supabase
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Generate types (optional)
supabase gen types typescript --local > ../types/supabase.ts
```

#### Option B: Manual Setup via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and run the contents of:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

### Step 3: Validation

```bash
# Run validation to check everything
npm run validate
```

You should see:
```
✅ Environment
✅ Supabase
✅ Pinata
✅ Gemini
✅ Database
✅ Files
```

### Step 4: Local Testing

```bash
# Test frontend
cd frontend
npm run dev

# Test middleware API (in another terminal)
cd middleware-api
npm run dev

# Test patient creation API
curl -X POST http://localhost:3000/api/patients/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Patient",
    "age": 30,
    "gender": "Male",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

## 🚀 Production Deployment

### Deploy Middleware API to Render

1. **Connect Repository**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Select "Web Service"

2. **Configure Build**:
   ```
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Environment Variables** (add these in Render dashboard):
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PINATA_API_KEY=your-pinata-key
   PINATA_SECRET_API_KEY=your-pinata-secret
   GEMINI_API_KEY=your-gemini-key
   ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
   PRIVATE_KEY=your-deployer-private-key
   JWT_SECRET=your-jwt-secret
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```

4. **Deploy**: Click "Create Web Service"

### Deploy Frontend to Vercel

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` directory

2. **Environment Variables** (add in Vercel dashboard):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   PINATA_API_KEY=your-pinata-key
   PINATA_SECRET_API_KEY=your-pinata-secret
   GEMINI_API_KEY=your-gemini-key
   NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
   NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
   ```

3. **Deploy**: Vercel will automatically deploy

## 🧪 Production Testing

### Test Patient Creation
```bash
# Replace with your actual domains
curl -X POST https://your-frontend.vercel.app/api/patients/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "name": "John Doe",
    "age": 35,
    "gender": "Male",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "email": "patient@example.com",
      "name": "John Doe",
      "age": 35,
      "gender": "Male",
      "walletAddress": "0x742d...",
      "ipfsHash": "Qm...",
      "createdAt": "2025-12-22T..."
    },
    "ipfsHash": "Qm..."
  },
  "message": "Patient created successfully"
}
```

### Test Chat Functionality
```bash
curl -X POST https://your-render-service.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"message": "Hello, I need help with HealthLink"}'
```

### Health Checks
```bash
# API Health
curl https://your-render-service.onrender.com/health

# Frontend Health
curl https://your-frontend.vercel.app/api/health
```

## 🔍 Troubleshooting

### Common Issues

#### "Supabase CLI not found"
```bash
# Install using Scoop (Windows)
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

#### "Environment variables not set"
- Check both local `.env.local` and deployment platform env vars
- Ensure variable names match exactly
- Restart development servers after changes

#### "Database connection failed"
```bash
# Check Supabase project is active
# Verify service role key permissions
# Ensure RLS policies are applied
```

#### "IPFS upload failed"
```bash
# Check Pinata API keys
# Verify account has upload permissions
# Check quota limits
```

#### "CORS errors"
- Update `CORS_ORIGIN` in middleware API env vars
- Include your Vercel domain

### Logs Location

- **Render (API)**: Dashboard → Logs
- **Vercel (Frontend)**: Dashboard → Functions → Logs
- **Supabase**: Dashboard → Logs
- **Local Development**: Terminal output

## 📊 Monitoring

### Key Metrics to Monitor

1. **API Response Times**: Render dashboard
2. **Error Rates**: Vercel function logs
3. **Database Performance**: Supabase dashboard
4. **IPFS Usage**: Pinata dashboard
5. **User Activity**: Custom analytics

### Alerts to Set Up

1. **API Downtime**: Render status alerts
2. **High Error Rates**: Vercel function errors
3. **Database Issues**: Supabase alerts
4. **IPFS Quota**: Pinata usage alerts

## 🎉 Success Checklist

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] API deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Patient creation works
- [ ] Chat functionality works
- [ ] Health checks pass
- [ ] No console errors
- [ ] RLS policies working
- [ ] IPFS uploads successful

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review deployment logs
3. Verify all prerequisites are met
4. Test locally before deploying
5. Check API key permissions and quotas

**Need help?** Refer to the main README.md and DEPLOYMENT_GUIDE.md for detailed documentation.