#!/bin/bash

# Phase 1 Deployment Verification Script
# Run this after completing database migration and contract deployment

echo "🔍 Phase 1 Deployment Verification"
echo "===================================="
echo ""

# Step 1: Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
cd middleware-api
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Prisma generation failed"
    exit 1
fi
echo ""

# Step 2: Check environment variables
echo "🔧 Step 2: Checking environment variables..."
if [ -f .env ]; then
    echo "✅ .env file exists"
    
    # Check for required Phase 1 variables
    if grep -q "ENABLE_PHARMACY=true" .env; then
        echo "   ✅ ENABLE_PHARMACY=true"
    else
        echo "   ⚠️  ENABLE_PHARMACY not set to true"
    fi
    
    if grep -q "ENABLE_HOSPITAL=true" .env; then
        echo "   ✅ ENABLE_HOSPITAL=true"
    else
        echo "   ⚠️  ENABLE_HOSPITAL not set to true"
    fi
    
    if grep -q "ENABLE_INSURANCE=true" .env; then
        echo "   ✅ ENABLE_INSURANCE=true"
    else
        echo "   ⚠️  ENABLE_INSURANCE not set to true"
    fi
    
    if grep -q "INSURANCE_CLAIMS_CONTRACT_ADDRESS" .env; then
        echo "   ✅ INSURANCE_CLAIMS_CONTRACT_ADDRESS set"
    else
        echo "   ⚠️  INSURANCE_CLAIMS_CONTRACT_ADDRESS not set"
    fi
else
    echo "❌ .env file not found"
    exit 1
fi
echo ""

# Step 3: Database verification
echo "🗄️  Step 3: Verifying database tables..."
echo "Run this SQL query in your database to verify:"
echo ""
echo "SELECT table_name FROM information_schema.tables"
echo "WHERE table_schema = 'public'"
echo "AND table_name IN ('hospitals', 'pharmacies', 'insurance_providers');"
echo ""

# Step 4: Start server test
echo "🚀 Step 4: Ready to start server!"
echo ""
echo "Run: npm run dev"
echo ""
echo "Expected output:"
echo "  📋 Feature Flags Status:"
echo "    - Pharmacy System: ✅ ENABLED"
echo "    - Hospital Management: ✅ ENABLED"
echo "    - Insurance Claims: ✅ ENABLED"
echo "  ✅ Pharmacy routes enabled"
echo "  ✅ Hospital routes enabled"
echo "  ✅ Insurance routes enabled"
echo ""

echo "✅ Verification complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start server: npm run dev"
echo "2. Get JWT token: curl -X POST http://localhost:4000/api/auth/login"
echo "3. Test pharmacy API: curl -X POST http://localhost:4000/api/v1/pharmacy/register"
echo "4. Check server logs for feature flags"
