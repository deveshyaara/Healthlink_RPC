#!/bin/bash

# ============================================================================
# HealthLink Pro - Clean Install Script
# Purpose: Remove all dependencies and reinstall from scratch
# Usage: ./clean-install.sh
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  HealthLink Pro - Clean Installation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# Step 1: Clean Middleware API
echo -e "${YELLOW}[1/6] Cleaning middleware-api...${NC}"
cd /workspaces/Healthlink_RPC/middleware-api

if [ -d "node_modules" ]; then
  echo "  Removing node_modules..."
  rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
  echo "  Removing package-lock.json..."
  rm -f package-lock.json
fi

if [ -d ".prisma" ]; then
  echo "  Removing .prisma cache..."
  rm -rf .prisma
fi

echo -e "${GREEN}  ✅ Middleware API cleaned${NC}\n"

# Step 2: Clean Frontend
echo -e "${YELLOW}[2/6] Cleaning frontend...${NC}"
cd /workspaces/Healthlink_RPC/frontend

if [ -d "node_modules" ]; then
  echo "  Removing node_modules..."
  rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
  echo "  Removing package-lock.json..."
  rm -f package-lock.json
fi

if [ -d ".next" ]; then
  echo "  Removing .next build cache..."
  rm -rf .next
fi

echo -e "${GREEN}  ✅ Frontend cleaned${NC}\n"

# Step 3: Clean npm cache globally
echo -e "${YELLOW}[3/6] Cleaning npm cache...${NC}"
npm cache clean --force
echo -e "${GREEN}  ✅ NPM cache cleaned${NC}\n"

# Step 4: Install Middleware API dependencies
echo -e "${YELLOW}[4/6] Installing middleware-api dependencies...${NC}"
cd /workspaces/Healthlink_RPC/middleware-api
npm install

echo -e "${GREEN}  ✅ Middleware API dependencies installed${NC}\n"

# Step 5: Generate Prisma Client
echo -e "${YELLOW}[5/6] Generating Prisma Client...${NC}"
cd /workspaces/Healthlink_RPC/middleware-api

if [ -f "prisma/schema.prisma" ]; then
  npx prisma generate
  echo -e "${GREEN}  ✅ Prisma Client generated${NC}\n"
else
  echo -e "${YELLOW}  ⚠️  Prisma schema not found - skipping${NC}\n"
fi

# Step 6: Install Frontend dependencies
echo -e "${YELLOW}[6/6] Installing frontend dependencies...${NC}"
cd /workspaces/Healthlink_RPC/frontend
npm install

echo -e "${GREEN}  ✅ Frontend dependencies installed${NC}\n"

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Clean installation completed successfully!${NC}\n"
echo -e "${BLUE}Verification:${NC}"

cd /workspaces/Healthlink_RPC/middleware-api
MIDDLEWARE_COUNT=$(find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
echo -e "  Middleware packages: ${GREEN}${MIDDLEWARE_COUNT}${NC}"

cd /workspaces/Healthlink_RPC/frontend
FRONTEND_COUNT=$(find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
echo -e "  Frontend packages: ${GREEN}${FRONTEND_COUNT}${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Start middleware: ${YELLOW}cd middleware-api && npm start${NC}"
echo -e "  2. Start frontend:   ${YELLOW}cd frontend && npm run dev${NC}"
echo -e "  3. Run health check: ${YELLOW}curl http://localhost:4000/health${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
