#!/bin/bash

##############################################################################
# HealthLink Pro v1.0 - Release Verification Script
# Ensures codebase is production-ready with zero mock data
##############################################################################

set -e

echo "=========================================="
echo "HealthLink Pro v1.0 Release Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

FAILED_CHECKS=0

# Check 1: No mock data in codebase
echo -e "${BLUE}[1/5] Checking for mock data...${NC}"
if grep -r "mockUsers\|mockData\|mockRecords\|mockAppointments\|mockPrescriptions" frontend/src --exclude-dir=node_modules --exclude-dir=.next 2>/dev/null; then
  echo -e "${RED}✗ FAILED: Mock data found in codebase${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
  echo -e "${GREEN}✓ PASSED: No mock data found${NC}"
fi
echo ""

# Check 2: Root directory is clean (less than 15 files)
echo -e "${BLUE}[2/5] Checking root directory cleanliness...${NC}"
ROOT_FILE_COUNT=$(find . -maxdepth 1 -type f | wc -l)
echo "  Root directory files: $ROOT_FILE_COUNT"

if [ "$ROOT_FILE_COUNT" -gt 15 ]; then
  echo -e "${YELLOW}⚠ WARNING: Root directory has $ROOT_FILE_COUNT files (recommended: <15)${NC}"
  echo "  Consider moving additional docs to /docs folder"
else
  echo -e "${GREEN}✓ PASSED: Root directory is clean ($ROOT_FILE_COUNT files)${NC}"
fi
echo ""

# Check 3: Documentation is organized
echo -e "${BLUE}[3/5] Checking documentation organization...${NC}"
if [ -d "docs" ]; then
  DOC_COUNT=$(find docs -name "*.md" | wc -l)
  echo -e "${GREEN}✓ PASSED: Documentation organized in /docs ($DOC_COUNT files)${NC}"
else
  echo -e "${RED}✗ FAILED: /docs directory not found${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Check 4: Test pages removed
echo -e "${BLUE}[4/5] Checking for test pages...${NC}"
TEST_PAGES_FOUND=0

if [ -d "frontend/src/app/debug" ]; then
  echo -e "${RED}✗ FAILED: frontend/src/app/debug still exists${NC}"
  TEST_PAGES_FOUND=1
fi

if [ -d "frontend/src/app/blockchain-test" ]; then
  echo -e "${RED}✗ FAILED: frontend/src/app/blockchain-test still exists${NC}"
  TEST_PAGES_FOUND=1
fi

if [ -d "frontend/src/app/dashboard/users" ]; then
  echo -e "${RED}✗ FAILED: frontend/src/app/dashboard/users still exists (should be removed)${NC}"
  TEST_PAGES_FOUND=1
fi

if [ $TEST_PAGES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✓ PASSED: All test pages removed${NC}"
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# Check 5: Frontend builds successfully
echo -e "${BLUE}[5/5] Testing frontend build...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠ Installing dependencies first...${NC}"
  npm install --quiet > /dev/null 2>&1
fi

echo "  Building frontend (this may take 30-60 seconds)..."
if npm run build > /tmp/build.log 2>&1; then
  echo -e "${GREEN}✓ PASSED: Frontend builds successfully${NC}"
  
  # Show build stats
  if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "  Build size: $BUILD_SIZE"
  fi
else
  echo -e "${RED}✗ FAILED: Frontend build failed${NC}"
  echo ""
  echo "Build errors:"
  tail -20 /tmp/build.log
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

cd ..
echo ""

# Final Summary
echo "=========================================="
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
  echo "=========================================="
  echo ""
  echo -e "${GREEN}🎉 HealthLink Pro v1.0 is PRODUCTION-READY!${NC}"
  echo ""
  echo "Release checklist:"
  echo "  ✓ No mock data in codebase"
  echo "  ✓ Root directory is clean"
  echo "  ✓ Documentation organized"
  echo "  ✓ Test pages removed"
  echo "  ✓ Frontend builds successfully"
  echo ""
  echo "Next steps:"
  echo "  1. Review docs/summaries/FRONTEND_QA_EXECUTIVE_SUMMARY.md"
  echo "  2. Run: npm run dev (test locally)"
  echo "  3. Deploy to production: ./deploy-low-spec.sh or ./setup-vps.sh"
  echo "  4. Record demo video using: DEMO_VIDEO_SCRIPT.md"
  echo ""
  exit 0
else
  echo -e "${RED}✗ $FAILED_CHECKS CHECK(S) FAILED${NC}"
  echo "=========================================="
  echo ""
  echo -e "${RED}❌ HealthLink Pro v1.0 is NOT ready for production${NC}"
  echo ""
  echo "Please fix the issues above and run this script again."
  echo ""
  exit 1
fi
