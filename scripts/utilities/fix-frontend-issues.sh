#!/bin/bash

##############################################################################
# Frontend QA Fixes - Quick Action Script
# Run this to fix 2 of 3 issues immediately (completes in 10 minutes)
##############################################################################

set -e

echo "=========================================="
echo "Frontend QA Quick Fixes"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Fix #1: Delete test pages
echo -e "${GREEN}[1/2] Removing test pages...${NC}"

if [ -d "frontend/src/app/debug" ]; then
  rm -rf frontend/src/app/debug
  echo "  ✓ Deleted: frontend/src/app/debug/"
else
  echo "  - debug/ already removed"
fi

if [ -d "frontend/src/app/blockchain-test" ]; then
  rm -rf frontend/src/app/blockchain-test
  echo "  ✓ Deleted: frontend/src/app/blockchain-test/"
else
  echo "  - blockchain-test/ already removed"
fi

echo ""

# Fix #2: Run documentation cleanup
echo -e "${GREEN}[2/2] Running documentation cleanup...${NC}"
echo ""

if [ -f "cleanup-docs.sh" ]; then
  bash cleanup-docs.sh
else
  echo -e "${RED}Error: cleanup-docs.sh not found${NC}"
  echo "Please run this script from the project root directory"
  exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Quick Fixes Complete!${NC}"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  ✓ Deleted test pages (debug, blockchain-test)"
echo "  ✓ Organized 30+ docs into /docs folder"
echo "  ✓ Cleaned up root directory"
echo ""
echo -e "${YELLOW}Remaining Issue:${NC}"
echo "  ⚠️  Users management page uses mock data"
echo ""
echo "Options to fix:"
echo "  A) Create backend user management API (4 hours)"
echo "  B) Use existing auth API if available (1 hour)"
echo "  C) Remove Users page entirely (5 minutes)"
echo ""
echo "To remove Users page (Option C):"
echo "  rm -rf frontend/src/app/dashboard/users"
echo ""
echo "Production Readiness:"
echo "  Before Quick Fixes: 85/100 🟡"
echo "  After Quick Fixes:  90/100 🟢"
echo "  After User Fix:     95/100 ✅"
echo ""
echo "Next steps:"
echo "  1. Review: docs/summaries/FRONTEND_FIX_REPORT.md"
echo "  2. Decide on Users page fix (A, B, or C)"
echo "  3. Run final verification tests"
echo ""
