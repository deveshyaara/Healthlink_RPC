#!/bin/bash

# ============================================================================
# Run All Automated Fixes
# Purpose: Execute all automated code quality fixes
# Usage: ./run-all-fixes.sh
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  HealthLink Pro - Automated Code Quality Fixes${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# Step 1: Clean Install
echo -e "${YELLOW}[1/5] Running clean installation...${NC}"
if [ -f "./clean-install.sh" ]; then
  chmod +x ./clean-install.sh
  # ./clean-install.sh  # Commented out - takes 5+ minutes
  echo -e "${GREEN}  ℹ️  Skipped (uncomment if needed)${NC}\n"
else
  echo -e "${RED}  ❌ clean-install.sh not found${NC}\n"
fi

# Step 2: Fix Console Logs
echo -e "${YELLOW}[2/5] Fixing console.* statements...${NC}"
if [ -f "./fix-console-logs.sh" ]; then
  chmod +x ./fix-console-logs.sh
  ./fix-console-logs.sh
else
  echo -e "${RED}  ❌ fix-console-logs.sh not found${NC}\n"
fi

# Step 3: Run Prettier (Middleware)
echo -e "${YELLOW}[3/5] Formatting middleware-api code...${NC}"
cd /workspaces/Healthlink_RPC/middleware-api
if [ -d "node_modules" ]; then
  npx prettier --write "src/**/*.js" --log-level warn
  echo -e "${GREEN}  ✅ Middleware code formatted${NC}\n"
else
  echo -e "${YELLOW}  ⚠️  node_modules not found - run clean-install.sh first${NC}\n"
fi

# Step 4: Run Prettier (Frontend)
echo -e "${YELLOW}[4/5] Formatting frontend code...${NC}"
cd /workspaces/Healthlink_RPC/frontend
if [ -d "node_modules" ]; then
  npx prettier --write "src/**/*.{ts,tsx}" --log-level warn
  echo -e "${GREEN}  ✅ Frontend code formatted${NC}\n"
else
  echo -e "${YELLOW}  ⚠️  node_modules not found - run clean-install.sh first${NC}\n"
fi

# Step 5: Run ESLint (if installed)
echo -e "${YELLOW}[5/5] Running ESLint...${NC}"
cd /workspaces/Healthlink_RPC/middleware-api
if [ -f "node_modules/.bin/eslint" ]; then
  npm run lint --silent || echo -e "${YELLOW}  ⚠️  Some lint issues remain (review manually)${NC}"
  echo -e "${GREEN}  ✅ Linting completed${NC}\n"
else
  echo -e "${YELLOW}  ⚠️  ESLint not installed${NC}\n"
fi

# Summary
cd /workspaces/Healthlink_RPC
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Automated fixes completed!${NC}\n"
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Review changes: ${YELLOW}git diff${NC}"
echo -e "  2. Check TypeScript: ${YELLOW}cd frontend && npm run typecheck${NC}"
echo -e "  3. Test server: ${YELLOW}cd middleware-api && npm start${NC}"
echo -e "  4. Review audit report: ${YELLOW}cat CODE_QUALITY_AUDIT.md${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
