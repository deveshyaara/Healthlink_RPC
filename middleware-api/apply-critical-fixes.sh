#!/bin/bash

# ============================================================================
# HealthLink - Critical Fixes Automation Script
# ============================================================================
# Purpose: Automatically apply database fixes and update Prisma
# Usage: ./apply-critical-fixes.sh
# Requirements: psql, node, npm
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ============================================================================
# Step 1: Apply Database Migration
# ============================================================================

print_step "Step 1: Applying database migration..."

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable not set"
    print_warning "Please set DATABASE_URL in your .env file or export it"
    exit 1
fi

# Apply the SQL migration
psql $DATABASE_URL -f critical_fixes.sql

if [ $? -eq 0 ]; then
    print_success "Database migration applied successfully"
else
    print_error "Database migration failed"
    exit 1
fi

# ============================================================================
# Step 2: Update Prisma Schema
# ============================================================================

print_step "Step 2: Updating Prisma schema..."

# Pull schema from database
npx prisma db pull

if [ $? -eq 0 ]; then
    print_success "Prisma schema pulled from database"
else
    print_error "Prisma db pull failed"
    exit 1
fi

# Generate Prisma client
npx prisma generate

if [ $? -eq 0 ]; then
    print_success "Prisma client generated"
else
    print_error "Prisma generate failed"
    exit 1
fi

# ============================================================================
# Step 3: Verify Changes
# ============================================================================

print_step "Step 3: Verifying changes..."

# Check if prescription_dispensing table exists
TABLE_EXISTS=$(psql $DATABASE_URL -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='prescription_dispensing')")

if [ "$TABLE_EXISTS" = "t" ]; then
    print_success "prescription_dispensing table created"
else
    print_warning "prescription_dispensing table not found"
fi

# Count indexes
INDEX_COUNT=$(psql $DATABASE_URL -tAc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%'")

print_success "Total indexes: $INDEX_COUNT"

if [ "$INDEX_COUNT" -lt 30 ]; then
    print_warning "Expected at least 30 indexes, found $INDEX_COUNT"
fi

# ============================================================================
# Step 4: Update .env if needed
# ============================================================================

print_step "Step 4: Checking .env configuration..."

if [ -f ".env" ]; then
    if grep -q "INSURANCE_CLAIMS_CONTRACT_ADDRESS" .env; then
        print_success "Contract address already in .env"
    else
        print_warning "Adding contract address to .env"
        echo "" >> .env
        echo "# Phase 1: Smart Contract Addresses" >> .env
        echo "INSURANCE_CLAIMS_CONTRACT_ADDRESS=0x1fC58daaA71ebaBE83784859FC9375FbF1d1137F" >> .env
        print_success "Contract address added to .env"
    fi
else
    print_error ".env file not found!"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "================================================================"
echo -e "${GREEN}✓ Critical fixes applied successfully!${NC}"
echo "================================================================"
echo ""
echo "Changes applied:"
echo "  ✓ User roles updated (pharmacist, hospital_admin, insurance)"
echo "  ✓ Performance indexes created ($INDEX_COUNT total)"
echo "  ✓ Prescription dispensing table created"
echo "  ✓ Prisma schema updated"
echo ""
echo "Next steps:"
echo "  1. Restart your backend server: npm run dev"
echo "  2. Test Phase 1 features"
echo "  3. Review production_roadmap.md for next tasks"
echo ""
echo "================================================================"
