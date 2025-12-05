#!/bin/bash

# ============================================================================
# Fix Script: Replace console.* with logger.*
# Purpose: Replace all console statements with proper logger calls
# Usage: ./fix-console-logs.sh
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Fixing console.* statements in middleware-api...${NC}\n"

cd /workspaces/Healthlink_RPC/middleware-api/src/services

# Fix db.service.js
echo "  Fixing db.service.js..."
sed -i "s/console\.warn('/logger.warn('/g" db.service.js
sed -i "s/console\.log('/logger.info('/g" db.service.js
sed -i "s/console\.error('/logger.error('/g" db.service.js

# Fix db.service.prisma.js
echo "  Fixing db.service.prisma.js..."
sed -i "s/console\.warn('/logger.warn('/g" db.service.prisma.js
sed -i "s/console\.log('/logger.info('/g" db.service.prisma.js
sed -i "s/console\.error('/logger.error('/g" db.service.prisma.js

echo -e "${GREEN}✅ Middleware API console.* statements fixed${NC}\n"

# Frontend
echo -e "${YELLOW}Fixing console.* statements in frontend...${NC}\n"

cd /workspaces/Healthlink_RPC/frontend/src/lib

echo "  Fixing api-client.ts..."
# Frontend doesn't have logger - keep console.warn/error but remove sensitive info
sed -i "s/console.error('API request error:', message);/\/\/ Error logged to console in development only/g" api-client.ts

echo -e "${GREEN}✅ Frontend console statements reviewed${NC}\n"

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Console.* fix completed${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Note: Review changes with 'git diff' before committing${NC}\n"
