#!/bin/bash

# STOP LOW-SPEC DEPLOYMENT SCRIPT
# Gracefully stops all HealthLink Pro services

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stopping HealthLink Pro (Low-Spec)           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Step 1: Stop frontend
echo -e "${YELLOW}[1/4] Stopping frontend...${NC}"
pkill -f "next" 2>/dev/null || echo "Frontend not running"
echo -e "${GREEN}✓ Frontend stopped${NC}"

# Step 2: Stop middleware
echo -e "${YELLOW}[2/4] Stopping middleware...${NC}"
pkill -f "node.*server.js" 2>/dev/null || echo "Middleware not running"
echo -e "${GREEN}✓ Middleware stopped${NC}"

# Step 3: Stop Fabric network
echo -e "${YELLOW}[3/4] Stopping Fabric network...${NC}"

# Stop containers
docker stop $(docker ps -q --filter "name=peer*" --filter "name=orderer*" --filter "name=ca*") 2>/dev/null || echo "No containers to stop"

# Remove containers
docker rm $(docker ps -aq --filter "name=peer*" --filter "name=orderer*" --filter "name=ca*") 2>/dev/null || echo "No containers to remove"

echo -e "${GREEN}✓ Fabric network stopped${NC}"

# Step 4: Cleanup (optional)
echo -e "${YELLOW}[4/4] Cleaning up...${NC}"
read -p "Remove Docker volumes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
    echo -e "${GREEN}✓ Volumes cleaned${NC}"
else
    echo -e "${YELLOW}Volumes preserved${NC}"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All services stopped                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
