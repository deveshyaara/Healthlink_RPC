#!/bin/bash

# COMPLETE LOW-SPEC DEPLOYMENT SCRIPT
# Deploys HealthLink Pro on resource-constrained environments (1-2 vCPUs, 2-4GB RAM)

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK_NAME="healthlink-low-spec"
CHANNEL_NAME="healthlink-channel"
CHAINCODE_NAME="healthlink-contract"
FABRIC_PATH="fabric-samples/test-network"

clear
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HealthLink Pro - Low-Spec Deployment         ║${NC}"
echo -e "${BLUE}║  Target: 1-2 vCPUs, 2-4GB RAM                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Step 1: Pre-flight checks
echo -e "${YELLOW}[1/10] Running pre-flight checks...${NC}"

# Check if running in low-spec environment
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
CPU_CORES=$(nproc)

echo -e "  System Resources:"
echo -e "    - RAM: ${TOTAL_RAM}MB"
echo -e "    - CPU Cores: ${CPU_CORES}"

if [ "$TOTAL_RAM" -lt 2000 ]; then
    echo -e "${RED}WARNING: Less than 2GB RAM detected. Deployment may fail.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"

# Step 2: Clean up existing resources
echo -e "${YELLOW}[2/10] Cleaning up existing resources...${NC}"

# Stop existing containers
docker ps -q --filter "name=peer*" --filter "name=orderer*" --filter "name=ca*" | xargs -r docker stop
docker ps -q --filter "name=peer*" --filter "name=orderer*" --filter "name=ca*" | xargs -r docker rm

# Clean up volumes
docker volume prune -f

# Remove old network
docker network rm $NETWORK_NAME 2>/dev/null || true

echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 3: Copy low-spec configuration files
echo -e "${YELLOW}[3/10] Setting up low-spec configuration...${NC}"

# Copy docker-compose file
if [ ! -f "docker-compose-low-spec.yaml" ]; then
    echo -e "${RED}ERROR: docker-compose-low-spec.yaml not found!${NC}"
    exit 1
fi

# Copy configtx file if it exists
if [ -f "$FABRIC_PATH/configtx/configtx-low-spec.yaml" ]; then
    cp "$FABRIC_PATH/configtx/configtx-low-spec.yaml" "$FABRIC_PATH/configtx/configtx.yaml"
    echo -e "${GREEN}✓ Using optimized configtx.yaml${NC}"
fi

# Copy .env file
if [ -f ".env.low-spec" ]; then
    cp .env.low-spec .env
    echo -e "${GREEN}✓ Environment variables configured${NC}"
fi

# Step 4: Generate crypto material
echo -e "${YELLOW}[4/10] Generating crypto material...${NC}"
cd "$FABRIC_PATH"

# Generate certificates
./network.sh down
./network.sh up createChannel -c $CHANNEL_NAME -ca

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to start Fabric network${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Crypto material generated${NC}"

# Step 5: Replace docker-compose with low-spec version
echo -e "${YELLOW}[5/10] Applying resource limits...${NC}"

# Stop the network
./network.sh down

# Replace docker-compose file
cp ../../docker-compose-low-spec.yaml compose/docker/docker-compose-test-net.yaml

# Restart with resource limits
docker-compose -f compose/docker/docker-compose-test-net.yaml up -d

# Wait for containers to stabilize
echo -e "Waiting for containers to start..."
sleep 10

# Verify containers are running
RUNNING_CONTAINERS=$(docker ps --filter "name=peer*" --filter "name=orderer*" | wc -l)
if [ "$RUNNING_CONTAINERS" -lt 2 ]; then
    echo -e "${RED}ERROR: Containers failed to start${NC}"
    docker ps -a
    exit 1
fi

echo -e "${GREEN}✓ Resource limits applied${NC}"

# Step 6: Create channel
echo -e "${YELLOW}[6/10] Creating channel...${NC}"
./network.sh createChannel -c $CHANNEL_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to create channel${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Channel created${NC}"

# Step 7: Package chaincode
echo -e "${YELLOW}[7/10] Packaging chaincode...${NC}"

cd ../../chaincode/$CHAINCODE_NAME

# Check if chaincode exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: Chaincode not found at chaincode/$CHAINCODE_NAME${NC}"
    exit 1
fi

# Install dependencies (production only)
npm ci --omit=dev

cd ../../$FABRIC_PATH

# Package chaincode
./network.sh deployCC -ccn $CHAINCODE_NAME -ccp ../../chaincode/$CHAINCODE_NAME -ccl javascript

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to deploy chaincode${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Chaincode deployed${NC}"

# Step 8: Start middleware with memory limits
echo -e "${YELLOW}[8/10] Starting middleware API...${NC}"
cd ../../

# Check if start-low-spec.sh exists
if [ ! -f "start-low-spec.sh" ]; then
    echo -e "${RED}ERROR: start-low-spec.sh not found!${NC}"
    exit 1
fi

# Make script executable
chmod +x start-low-spec.sh

# Start middleware in background
./start-low-spec.sh &
MIDDLEWARE_PID=$!

# Wait for middleware to start
echo -e "Waiting for middleware to start..."
sleep 5

# Check if middleware is running
if ! ps -p $MIDDLEWARE_PID > /dev/null; then
    echo -e "${RED}ERROR: Middleware failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Middleware API started (PID: $MIDDLEWARE_PID)${NC}"

# Step 9: Build and start frontend
echo -e "${YELLOW}[9/10] Building frontend...${NC}"
cd frontend

# Check if using low-spec config
if [ -f "next.config.low-spec.ts" ]; then
    cp next.config.low-spec.ts next.config.ts
    echo -e "${GREEN}✓ Using low-spec Next.js configuration${NC}"
fi

# Install dependencies (production only)
npm ci --omit=dev

# Build with standalone output
npm run build

# Start frontend in background
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${RED}ERROR: Frontend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Step 10: Verify deployment
echo -e "${YELLOW}[10/10] Verifying deployment...${NC}"

# Check container resource usage
echo -e "\n${BLUE}Container Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    $(docker ps --filter "name=peer*" --filter "name=orderer*" --format "{{.Names}}")

# Calculate total memory usage
TOTAL_MEMORY=$(docker stats --no-stream --format "{{.MemUsage}}" \
    $(docker ps --filter "name=peer*" --filter "name=orderer*" -q) | \
    awk '{sum += $1} END {print sum}')

echo -e "\n${BLUE}Deployment Summary:${NC}"
echo -e "  - Network: Running"
echo -e "  - Channel: $CHANNEL_NAME"
echo -e "  - Chaincode: $CHAINCODE_NAME"
echo -e "  - Middleware: http://localhost:3001 (PID: $MIDDLEWARE_PID)"
echo -e "  - Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo -e "  - Estimated Total Memory: ${TOTAL_MEMORY}MB"

echo -e "\n${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Deployment Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Access frontend at: ${BLUE}http://localhost:3000${NC}"
echo -e "  2. Monitor resources: ${BLUE}docker stats${NC}"
echo -e "  3. View logs: ${BLUE}docker logs peer0.org1.example.com${NC}"
echo -e "  4. Stop deployment: ${BLUE}./stop-low-spec.sh${NC}"

echo -e "\n${YELLOW}Performance Tips:${NC}"
echo -e "  - Monitor memory usage regularly"
echo -e "  - Expected response times: 1-2 seconds"
echo -e "  - Recommended max concurrent users: 20-30"
echo -e "  - Use external CDN for static assets"

cd ..
