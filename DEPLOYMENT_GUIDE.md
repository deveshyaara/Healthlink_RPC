# HealthLink Production Deployment Guide

This guide covers the complete production deployment setup for HealthLink, addressing all root cause issues.

## 🎯 Issues Addressed

### ✅ 1. Chat API 500 Errors
- **Root Cause**: Python subprocess architecture in production
- **Solution**: Direct Node.js Google Gemini integration
- **Status**: ✅ Resolved

### ✅ 2. Patient Creation CORS/RLS Issues
- **Root Cause**: Frontend directly calling IPFS and database
- **Solution**: Next.js API route proxy with backend IPFS upload
- **Status**: ✅ Resolved

### ✅ 3. Static Asset 404 Errors
- **Root Cause**: Missing grid.svg file
- **Solution**: Created SVG grid pattern
- **Status**: ✅ Resolved

### ✅ 4. Middleware API Binding Errors
- **Root Cause**: Incorrect chat controller export
- **Solution**: Export singleton instance instead of class
- **Status**: ✅ Resolved

## 🚀 Deployment Checklist

### Phase 1: Environment Setup

#### 1.1 Supabase Configuration
```bash
# Create Supabase project
# Go to https://supabase.com and create a new project

# Set environment variables in Render
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 1.2 Pinata IPFS Setup
```bash
# Create Pinata account at https://pinata.cloud
# Generate API keys

# Set environment variables in Render
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
```

#### 1.3 Google Gemini Setup
```bash
# Get API key from Google AI Studio
# Set environment variable in Render
GEMINI_API_KEY=your-gemini-api-key
```

#### 1.4 Ethereum RPC Setup
```bash
# Use Alchemy or Infura for production RPC
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
PRIVATE_KEY=your-deployer-private-key
```

### Phase 2: Database Setup

#### 2.1 Apply Migrations
```bash
# From project root
cd supabase
./setup.sh
```

#### 2.2 Verify RLS Policies
```sql
-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('patients', 'medical_records', 'appointments', 'prescriptions');
```

### Phase 3: Application Deployment

#### 3.1 Middleware API (Render)
```yaml
# render.yaml is already configured correctly
# Just deploy to Render with the following env vars:
NODE_ENV=production
PORT=3001
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
GEMINI_API_KEY=...
ETHEREUM_RPC_URL=...
PRIVATE_KEY=...
```

#### 3.2 Frontend (Vercel)
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
NEXT_PUBLIC_ETHEREUM_RPC_URL=...
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
```

### Phase 4: Post-Deployment Verification

#### 4.1 Health Checks
```bash
# Middleware API health
curl https://your-render-app.onrender.com/health

# Frontend health
curl https://your-vercel-app.vercel.app/api/health
```

#### 4.2 Test Patient Creation
```bash
# Test the new API route
curl -X POST https://your-vercel-app.vercel.app/api/patients/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Patient",
    "age": 30,
    "gender": "Male",
    "walletAddress": "0x123..."
  }'
```

#### 4.3 Test Chat Functionality
```bash
# Test chat API
curl -X POST https://your-render-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"message": "Hello, I need health advice"}'
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Issue: "Cannot read properties of undefined (reading 'bind')"
**Solution**: ✅ Already fixed - chat controller now exports instance

#### Issue: "CORS error when creating patient"
**Solution**: ✅ Already fixed - moved to Next.js API route

#### Issue: "IPFS upload fails"
**Check**:
- Pinata API keys are correct
- Account has upload permissions
- Network connectivity

#### Issue: "Supabase RLS blocking operations"
**Check**:
- Service role key is being used in API routes
- RLS policies are correctly applied
- User authentication is working

#### Issue: "Grid.svg not loading"
**Solution**: ✅ Already fixed - SVG file created in public directory

### Environment Variable Validation

Create a validation script to check all required env vars:

```javascript
// scripts/validate-env.js
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PINATA_API_KEY',
  'PINATA_SECRET_API_KEY',
  'GEMINI_API_KEY',
  'ETHEREUM_RPC_URL',
  'PRIVATE_KEY'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

console.log('✅ All environment variables are set');
```

## 📊 Monitoring & Maintenance

### Health Endpoints
- Middleware: `GET /health`
- Frontend: `GET /api/health`
- Chat: `GET /api/chat/health`

### Logs to Monitor
- Supabase dashboard for database errors
- Render logs for API errors
- Vercel logs for frontend errors
- Pinata dashboard for IPFS issues

### Backup Strategy
- Database: Supabase automated backups
- IPFS: Content is immutable, no backup needed
- Code: Git version control

## 🔄 Update Process

When deploying updates:

1. **Test locally** with all services running
2. **Run database migrations** if schema changed
3. **Update environment variables** if new ones added
4. **Deploy middleware API first**
5. **Deploy frontend second**
6. **Run health checks**
7. **Test critical user flows**

## 🎉 Success Criteria

All of these should pass:

- ✅ Middleware API starts without binding errors
- ✅ Patient creation works through Next.js API route
- ✅ Chat functionality uses direct Gemini (no Python)
- ✅ Static assets load correctly
- ✅ Database operations work with RLS
- ✅ IPFS uploads succeed
- ✅ All health endpoints return 200

## 📞 Support

If issues persist:

1. Check Render/Vercel deployment logs
2. Verify all environment variables
3. Test individual services locally
4. Check Supabase/Pinata dashboards
5. Review this deployment guide

The root cause fixes ensure a stable, production-ready HealthLink deployment.