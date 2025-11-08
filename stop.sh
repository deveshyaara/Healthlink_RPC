#!/bin/bash

# HealthLink Pro - Stop Script
# Gracefully stops the blockchain network and RPC server

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🛑 HealthLink Pro - Stopping System"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Stop RPC Server
echo -e "${BLUE}[1/3]${NC} Stopping RPC server..."
if pkill -f "node server.js" 2>/dev/null; then
    echo -e "${GREEN}✅ RPC server stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No RPC server running${NC}"
fi
echo ""

# Step 2: Stop Fabric Network
echo -e "${BLUE}[2/3]${NC} Stopping Hyperledger Fabric network..."
cd fabric-samples/test-network

if docker ps | grep -q "peer0.org1.example.com"; then
    ./network.sh down 2>&1 | grep -E "Stopping|Removing|Stopping network"
    echo -e "${GREEN}✅ Network stopped${NC}"
else
    echo -e "${YELLOW}⚠️  Network not running${NC}"
fi
echo ""

# Step 3: Clean up (optional)
echo -e "${BLUE}[3/3]${NC} Cleanup..."

# Show what would be cleaned
DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
STOPPED_CONTAINERS=$(docker ps -a -f "status=exited" -q | wc -l)

if [ "$1" == "--clean" ] || [ "$1" == "-c" ]; then
    echo "  Removing dangling images and stopped containers..."
    docker system prune -f > /dev/null 2>&1
    echo -e "${GREEN}✅ Cleanup completed${NC}"
else
    echo -e "  ${YELLOW}Dangling images: ${DANGLING_IMAGES}, Stopped containers: ${STOPPED_CONTAINERS}${NC}"
    echo "  Run './stop.sh --clean' to remove them"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ HealthLink Pro Stopped${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "💡 To restart the system, run: ./start.sh"
echo ""
