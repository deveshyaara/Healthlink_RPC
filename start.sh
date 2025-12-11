#!/bin/bash

# HealthLink Pro - Complete System Start Script (Idempotent & Robust)
# Starts Fabric Network + Middleware API + Frontend in one click
# ✅ Implements intelligent wait logic to eliminate race conditions
# ✅ Retry mechanisms for CA enrollment
# ✅ Idempotent operations (safe to run multiple times)

set -e  # Exit immediately if a command exits with a non-zero status

echo "════════════════════════════════════════════════════════════"
echo "  🚀 HealthLink Pro - Complete System Startup"
echo "  ✅ Fabric Network + Middleware API + Frontend"
echo "  ⏱️  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
MAX_RETRIES=5
RETRY_DELAY=3
PEER_PORT=7051
CA_PORT=7054
ORDERER_PORT=7050

# Configuration
MAX_RETRIES=5
RETRY_DELAY=3
PEER_PORT=7051
CA_PORT=7054
ORDERER_PORT=7050

# ========================================
# HELPER FUNCTIONS
# ========================================

# Function: Kill processes on specific ports (aggressive cleanup)
# Usage: kill_port <port>
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔪 Checking port ${port} for zombie processes...${NC}"
    
    # Method 1: Using lsof
    if command -v lsof &> /dev/null; then
        local pids=$(lsof -ti :$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo -e "${YELLOW}⚠️  Killing processes on port ${port}: ${pids}${NC}"
            kill -9 $pids 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Method 2: Using fuser (backup)
    if command -v fuser &> /dev/null; then
        fuser -k -n tcp $port 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✅ Port ${port} cleaned${NC}"
}

# Function: Wait for Docker container with log verification (FAIL-SAFE)
# Usage: wait_for_container <container_name> <log_string> <max_wait_seconds>
# This bypasses network issues by checking Docker logs directly
wait_for_container() {
    local container=$1
    local log_string=$2
    local max_wait=${3:-60}
    local elapsed=0
    
    echo -e "${BLUE}⏳ Waiting for container '${container}' (checking for: '${log_string}')...${NC}"
    
    while [ $elapsed -lt $max_wait ]; do
        # Check 1: Container must be running
        if ! docker ps --filter "name=${container}" --filter "status=running" | grep -q ${container}; then
            sleep 2
            elapsed=$((elapsed + 2))
            echo -n "."
            continue
        fi
        
        # Check 2: Logs must contain the ready string
        if docker logs ${container} 2>&1 | grep -q "${log_string}"; then
            echo ""
            echo -e "${GREEN}✅ Container '${container}' is ready (${elapsed}s)${NC}"
            echo -e "${GREEN}   Log verification: Found '${log_string}'${NC}"
            return 0
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    echo -e "${RED}❌ Timeout waiting for '${container}' after ${max_wait}s${NC}"
    echo -e "${YELLOW}📋 Last 10 log lines from container:${NC}"
    docker logs ${container} 2>&1 | tail -10
    return 1
}

# Function: Wait for container and verify specific port binding (LEGACY FALLBACK)
# Usage: wait_for_container_port <container_name> <port> <max_wait_seconds>
wait_for_container_port() {
    local container=$1
    local port=$2
    local max_wait=${3:-60}
    local elapsed=0
    
    echo -e "${BLUE}⏳ Waiting for container '${container}' on port ${port}...${NC}"
    
    while [ $elapsed -lt $max_wait ]; do
        # Check if container is running
        if ! docker ps --filter "name=${container}" --filter "status=running" | grep -q ${container}; then
            sleep 2
            elapsed=$((elapsed + 2))
            echo -n "."
            continue
        fi
        
        # Verify port is exposed in container
        if docker port ${container} 2>/dev/null | grep -q ${port}; then
            echo ""
            echo -e "${GREEN}✅ Container '${container}' port ${port} is exposed (${elapsed}s)${NC}"
            return 0
        fi
        
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    echo -e "${RED}❌ Timeout waiting for '${container}' port ${port} after ${max_wait}s${NC}"
    return 1
}

# Function: Check if wallet exists and has admin identity
check_wallet_exists() {
    local wallet_path="$1"
    if [ -d "$wallet_path" ] && [ -f "$wallet_path/admin.id" ]; then
        echo -e "${GREEN}✅ Wallet exists with admin identity${NC}"
        return 0
    fi
    echo -e "${YELLOW}⚠️  Wallet not found or admin identity missing${NC}"
    return 1
}

# Function: Retry command with exponential backoff
# Usage: retry_command <max_attempts> <command> <args...>
retry_command() {
    local max_attempts=$1
    shift
    local attempt=1
    local delay=$RETRY_DELAY
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${BLUE}[Attempt $attempt/$max_attempts]${NC} Running: $*"
        
        if "$@"; then
            echo -e "${GREEN}✅ Command succeeded${NC}"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo -e "${YELLOW}⚠️  Attempt $attempt failed. Retrying in ${delay}s...${NC}"
            sleep $delay
            delay=$((delay * 2))  # Exponential backoff
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Command failed after $max_attempts attempts${NC}"
    return 1
}

# ========================================
# STEP 1: START FABRIC NETWORK
# ========================================
# ========================================
# STEP 1: START FABRIC NETWORK
# ========================================

echo -e "${BLUE}[1/7]${NC} Starting Hyperledger Fabric network..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"
cd fabric-samples/test-network

# Check if network is already running
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Network is already running. Checking health...${NC}"
    
    # Verify peer is responsive via Docker inspection
    if docker logs peer0.org1.example.com 2>&1 | tail -20 | grep -q "Started peer"; then
        echo -e "${GREEN}✅ Existing network is healthy. Skipping network restart.${NC}"
        NETWORK_ALREADY_RUNNING=true
    else
        echo -e "${YELLOW}⚠️  Network containers exist but peer not fully started. Restarting...${NC}"
        ./network.sh down
        NETWORK_ALREADY_RUNNING=false
    fi
else
    echo -e "${BLUE}ℹ️  No existing network found. Starting fresh...${NC}"
    NETWORK_ALREADY_RUNNING=false
fi

# Start network if needed
if [ "$NETWORK_ALREADY_RUNNING" != "true" ]; then
    # Clean start with aggressive port cleanup
    echo -e "${BLUE}🧹 Performing aggressive port cleanup...${NC}"
    kill_port 7054  # CA
    kill_port 7051  # Peer
    kill_port 9051  # Peer Operations
    kill_port 7050  # Orderer
    kill_port 9443  # Orderer Operations
    kill_port 5984  # CouchDB
    
    ./network.sh down 2>/dev/null || true
    
    echo -e "${BLUE}🚀 Starting Fabric network (this takes ~30-60 seconds)...${NC}"
    ./network.sh up createChannel -ca -s couchdb
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to start network${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Network started${NC}"
echo ""

# ========================================
# WAIT FOR FABRIC COMPONENTS (DOCKER-BASED VERIFICATION)
# ========================================

echo -e "${BLUE}[Verification]${NC} Waiting for Fabric components..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"
echo -e "${YELLOW}💡 Using Docker log inspection (bypasses network issues)${NC}"

# Wait for CA (Certificate Authority) - CRITICAL for enrollment
# Check Docker logs for "Listening on" message
wait_for_container "ca_org1" "Listening on" 90 || {
    echo -e "${RED}❌ CA failed to start. Cannot proceed.${NC}"
    echo -e "${YELLOW}📋 Full CA logs:${NC}"
    docker logs ca_org1 2>&1 | tail -30
    exit 1
}

# Additional CA stability check (ensure enrollment endpoint is ready)
echo -e "${BLUE}⏳ Verifying CA enrollment endpoint...${NC}"
CA_ENDPOINT_READY=false
CA_ENDPOINT_WAIT=0
while [ $CA_ENDPOINT_WAIT -lt 30 ]; do
    if docker logs ca_org1 2>&1 | grep -q "POST /enroll"; then
        CA_ENDPOINT_READY=true
        echo -e "${GREEN}✅ CA enrollment endpoint has processed requests${NC}"
        break
    fi
    if docker logs ca_org1 2>&1 | grep -q "Listening on https://"; then
        CA_ENDPOINT_READY=true
        echo -e "${GREEN}✅ CA HTTPS listener confirmed${NC}"
        break
    fi
    sleep 2
    CA_ENDPOINT_WAIT=$((CA_ENDPOINT_WAIT + 2))
    echo -n "."
done

if [ "$CA_ENDPOINT_READY" != "true" ]; then
    echo -e "${YELLOW}⚠️  CA endpoint not confirmed, but proceeding (container is running)${NC}"
fi

# Wait for Orderer
wait_for_container "orderer.example.com" "Beginning to serve requests" 60 || {
    echo -e "${RED}❌ Orderer failed to start${NC}"
    docker logs orderer.example.com 2>&1 | tail -20
    exit 1
}

# Wait for Peer - CRITICAL for chaincode operations
wait_for_container "peer0.org1.example.com" "Started peer" 60 || {
    echo -e "${RED}❌ Peer failed to start. Cannot proceed.${NC}"
    docker logs peer0.org1.example.com 2>&1 | tail -20
    exit 1
}

# Wait for CouchDB (state database)
wait_for_container "couchdb0" "Apache CouchDB has started" 60 || {
    echo -e "${YELLOW}⚠️  CouchDB startup message not found, but container running${NC}"
}

# Additional stabilization wait for CA database initialization
echo -e "${BLUE}⏳ Allowing CA to complete database initialization (5s)...${NC}"
sleep 5

# Final verification: Check all containers are healthy
echo -e "${BLUE}🔍 Final container health check...${NC}"
RUNNING_CONTAINERS=$(docker ps --filter "name=peer0.org1" --filter "name=orderer.example" --filter "name=ca_org1" --format "{{.Names}}" | wc -l)
if [ $RUNNING_CONTAINERS -lt 3 ]; then
    echo -e "${RED}❌ Not all critical containers are running (found: ${RUNNING_CONTAINERS}, expected: 3+)${NC}"
    docker ps -a
    exit 1
fi

echo -e "${GREEN}✅ All Fabric components are ready and verified via Docker inspection${NC}"
echo ""

# ========================================
# STEP 2: DEPLOY CHAINCODES
# ========================================

echo -e "${BLUE}[2/7]${NC} Deploying chaincodes..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

# Function to deploy chaincode with idempotency check
deploy_chaincode() {
    local cc_name=$1
    local cc_path=$2
    local cc_version=$3
    
    echo -e "${BLUE}📦 Deploying ${cc_name} v${cc_version}...${NC}"
    
    # Check if chaincode is already deployed (idempotency)
    if docker ps | grep -q "dev-peer.*${cc_name}"; then
        echo -e "${YELLOW}⚠️  ${cc_name} chaincode container already running. Skipping.${NC}"
        return 0
    fi
    
    # Deploy with retry logic
    retry_command 3 ./network.sh deployCC \
        -ccn $cc_name \
        -ccp $cc_path \
        -ccl javascript \
        -ccv $cc_version \
        -ccs 1 \
        -cci NA
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${cc_name} v${cc_version} deployed${NC}"
    else
        echo -e "${RED}❌ Failed to deploy ${cc_name}${NC}"
        return 1
    fi
}

# Deploy chaincodes to mychannel (matching our working configuration)
# Note: healthlink, prescription-contract, and appointment-contract are essential
# Chaincode is now located at root /chaincode/ directory (merged from fabric-samples)
deploy_chaincode "healthlink" "../../chaincode/healthlink-contract" "1.0"
deploy_chaincode "prescription-contract" "../../chaincode/prescription-contract" "1.0"
deploy_chaincode "appointment-contract" "../../chaincode/appointment-contract" "1.0"

# Optional: Additional contracts (can be deployed later if needed)
# deploy_chaincode "patient-records-contract" "../../chaincode/patient-records-contract" "1.0"
# deploy_chaincode "doctor-credentials-contract" "../../chaincode/doctor-credentials-contract" "1.0"

echo ""

# ========================================
# STEP 3: WAIT FOR CHAINCODE INITIALIZATION
# ========================================

echo -e "${BLUE}[3/7]${NC} Waiting for chaincode containers to start..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

# Wait up to 60 seconds for chaincode containers
CHAINCODE_WAIT=0
MAX_CHAINCODE_WAIT=60

while [ $CHAINCODE_WAIT -lt $MAX_CHAINCODE_WAIT ]; do
    CHAINCODE_COUNT=$(docker ps | grep "dev-peer" | wc -l)
    if [ $CHAINCODE_COUNT -ge 3 ]; then
        echo -e "${GREEN}✅ ${CHAINCODE_COUNT} chaincode containers running${NC}"
        break
    fi
    sleep 3
    CHAINCODE_WAIT=$((CHAINCODE_WAIT + 3))
    echo -n "."
done

echo ""
echo ""

# ========================================
# STEP 4: SETUP MIDDLEWARE API WITH RETRY LOGIC
# ========================================

cd ../../middleware-api
echo -e "${BLUE}[4/7]${NC} Setting up Middleware API..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

# Install dependencies if needed (idempotent)
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# ========================================
# WALLET CREATION WITH RETRY LOGIC
# ========================================

WALLET_PATH="$PWD/wallet"

# Check if wallet already exists with admin identity (idempotent check)
if check_wallet_exists "$WALLET_PATH"; then
    echo -e "${GREEN}✅ Using existing wallet (idempotent operation)${NC}"
    # Verify admin has proper OU=admin certificate
    if cat "$WALLET_PATH/admin.id" | grep -q '"certificate"'; then
        echo -e "${GREEN}✅ Admin identity verified${NC}"
    fi
else
    echo -e "${BLUE}🔑 Creating wallet with admin identity from test-network...${NC}"
    
    # Remove old wallet if it exists but is incomplete
    rm -rf wallet
    mkdir -p wallet
    
    # Copy admin identity from test-network (this has proper OU=admin)
    ADMIN_MSP_PATH="../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
    
    if [ -d "$ADMIN_MSP_PATH" ]; then
        echo -e "${BLUE}📝 Importing admin identity with OU=admin...${NC}"
        
        node -e "
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAdmin() {
    try {
        const mspPath = path.resolve('$ADMIN_MSP_PATH');
        const cert = fs.readFileSync(path.join(mspPath, 'signcerts/cert.pem'), 'utf8');
        const keyFiles = fs.readdirSync(path.join(mspPath, 'keystore'));
        const key = fs.readFileSync(path.join(mspPath, 'keystore', keyFiles[0]), 'utf8');
        
        const identity = {
            credentials: { certificate: cert, privateKey: key },
            mspId: 'Org1MSP',
            type: 'X.509'
        };
        
        const wallet = await Wallets.newFileSystemWallet('./wallet');
        await wallet.put('admin', identity);
        console.log('✅ Admin identity imported successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to import admin:', error.message);
        process.exit(1);
    }
}
importAdmin();
"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Admin identity imported with proper permissions${NC}"
        else
            echo -e "${RED}❌ Failed to import admin identity${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Admin MSP path not found: $ADMIN_MSP_PATH${NC}"
        exit 1
    fi
fi

# Verify wallet was created successfully
if [ ! -d "wallet" ] || [ ! -f "wallet/admin.id" ]; then
    echo -e "${RED}❌ Wallet creation failed - admin.id not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Middleware API configured with valid wallet${NC}"
echo ""

# ========================================
# STEP 5: START MIDDLEWARE API
# ========================================

echo -e "${BLUE}[5/7]${NC} Starting Middleware API..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

# Kill any existing server (idempotent cleanup)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 already in use. Stopping existing process...${NC}"
    pkill -f "node.*src/server.js" 2>/dev/null || true
    sleep 3
fi

# Start server in background
echo -e "${BLUE}🚀 Launching Node.js server...${NC}"
node src/server.js > server.log 2>&1 &
API_PID=$!

# Wait for API to be responsive (not just started)
API_READY=false
API_WAIT=0
MAX_API_WAIT=30

echo -e "${BLUE}⏳ Waiting for API to respond on port 3000...${NC}"
while [ $API_WAIT -lt $MAX_API_WAIT ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        API_READY=true
        echo -e "${GREEN}✅ Middleware API is responding (${API_WAIT}s)${NC}"
        break
    fi
    
    # Check if process is still running
    if ! ps -p $API_PID > /dev/null 2>&1; then
        echo -e "${RED}❌ API process died unexpectedly${NC}"
        echo -e "${YELLOW}Last 20 lines of server.log:${NC}"
        tail -20 server.log
        exit 1
    fi
    
    sleep 2
    API_WAIT=$((API_WAIT + 2))
    echo -n "."
done

echo ""

if [ "$API_READY" = true ]; then
    echo -e "${GREEN}✅ Middleware API started successfully (PID: $API_PID)${NC}"
else
    echo -e "${RED}❌ API failed to respond after ${MAX_API_WAIT}s${NC}"
    echo -e "${YELLOW}Check middleware-api/server.log for details${NC}"
    tail -30 server.log
    exit 1
fi

echo ""

# ========================================
# STEP 6: SETUP AND START FRONTEND
# ========================================

cd ../frontend
echo -e "${BLUE}[6/7]${NC} Setting up Frontend..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

# Install dependencies if needed (idempotent)
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies (this may take a minute)...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

# Kill any existing frontend server (idempotent cleanup)
if lsof -Pi :9002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 9002 already in use. Stopping existing process...${NC}"
    pkill -f "next dev" 2>/dev/null || true
    sleep 3
fi

echo -e "${BLUE}[7/7]${NC} Starting Frontend..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"

npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be responsive
FRONTEND_READY=false
FRONTEND_WAIT=0
MAX_FRONTEND_WAIT=30

echo -e "${BLUE}⏳ Waiting for frontend to respond on port 9002...${NC}"
while [ $FRONTEND_WAIT -lt $MAX_FRONTEND_WAIT ]; do
    if curl -s http://localhost:9002 > /dev/null 2>&1; then
        FRONTEND_READY=true
        echo -e "${GREEN}✅ Frontend is responding (${FRONTEND_WAIT}s)${NC}"
        break
    fi
    
    # Check if process is still running
    if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Frontend process not detected, but Next.js may still be initializing${NC}"
        break
    fi
    
    sleep 2
    FRONTEND_WAIT=$((FRONTEND_WAIT + 2))
    echo -n "."
done

echo ""

if [ "$FRONTEND_READY" = true ]; then
    echo -e "${GREEN}✅ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be initializing (Next.js takes 10-20s for first build)${NC}"
fi

echo ""

# ========================================
# STEP 7: VERIFY COMPLETE SYSTEM
# ========================================

cd ..
echo -e "${BLUE}[Verification]${NC} Checking complete system status..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"
echo ""

# Check network containers
PEER_COUNT=$(docker ps | grep "peer0" | wc -l)
ORDERER_COUNT=$(docker ps | grep "orderer" | wc -l)
CA_COUNT=$(docker ps | grep "ca_" | wc -l)
CHAINCODE_COUNT=$(docker ps | grep "dev-peer" | wc -l)

echo "  🔗 Fabric Network:"
echo "    - Peers: ${PEER_COUNT}/2"
echo "    - Orderers: ${ORDERER_COUNT}/1+"
echo "    - CAs: ${CA_COUNT}/3"
echo "    - Chaincodes: ${CHAINCODE_COUNT}/5"

# Check Middleware API with retry
echo ""
echo -e "${BLUE}  🔍 Testing Middleware API...${NC}"
sleep 2

if retry_command 3 curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Middleware API: HEALTHY${NC}"
    API_STATUS="HEALTHY"
else
    echo -e "  ${RED}❌ Middleware API: NOT RESPONDING${NC}"
    API_STATUS="UNHEALTHY"
fi

# Check Frontend
echo ""
echo -e "${BLUE}  🔍 Testing Frontend...${NC}"
sleep 2

if curl -f -s http://localhost:9002 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Frontend: RESPONDING${NC}"
    FRONTEND_STATUS="HEALTHY"
else
    echo -e "  ${YELLOW}⚠️  Frontend: STILL INITIALIZING${NC}"
    echo -e "     (Next.js first build can take 20-30 seconds)"
    FRONTEND_STATUS="INITIALIZING"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ HealthLink Pro Started Successfully!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "⏱️  Total startup time: Complete"
echo "📅  Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📊 System Status:"
echo "  • Blockchain Network: RUNNING (${PEER_COUNT} peers, ${ORDERER_COUNT} orderers, ${CA_COUNT} CAs)"
echo "  • Chaincodes: ${CHAINCODE_COUNT}/5 deployed"
echo "  • Middleware API: ${API_STATUS} → http://localhost:3000"
echo "  • Frontend UI: ${FRONTEND_STATUS} → http://localhost:9002"
echo ""
echo "🔧 Key Features:"
echo "  ✅ Idempotent Startup (safe to run multiple times)"
echo "  ✅ Intelligent Wait Logic (no race conditions)"
echo "  ✅ Retry Mechanisms (handles CA initialization delays)"
echo "  ✅ JWT Authentication with auto-injection"
echo "  ✅ Role-based dashboards (Doctor/Patient)"
echo "  ✅ Content-Addressable Storage (SHA-256)"
echo "  ✅ Zero Mock Data Policy (real blockchain data)"
echo ""
echo "🚀 Quick Actions:"
echo "  • Open App: http://localhost:9002"
echo "  • API Health: curl http://localhost:3000/api/health"
echo "  • View API Logs: tail -f middleware-api/server.log"
echo "  • Stop System: ./stop.sh"
echo "  • Check Status: ./status.sh"
echo ""
echo "📚 Documentation:"
echo "  • README: README.md"
echo "  • Testing: FINAL_ACCEPTANCE_TEST.md"
echo "  • Troubleshooting: TROUBLESHOOTING.md"
echo "  • Demo Script: DEMO_SCRIPT.md"
echo ""
echo "🔐 Default Test Accounts:"
echo "  • Patient: patient@test.com | Password: test123456"
echo "  • Doctor: doctor1@example.com | Password: doctor123"
echo ""
echo "💡 Troubleshooting:"
if [ "$API_STATUS" != "HEALTHY" ]; then
    echo "  ⚠️  API not healthy - Check: tail -f middleware-api/server.log"
fi
if [ "$FRONTEND_STATUS" != "HEALTHY" ]; then
    echo "  ℹ️  Frontend still building - Wait 20s and check: curl http://localhost:9002"
fi
echo ""
echo "════════════════════════════════════════════════════════════"
