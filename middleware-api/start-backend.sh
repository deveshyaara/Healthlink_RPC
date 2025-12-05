#!/bin/bash

# HealthLink Middleware API - Robust Start Script (Idempotent & Production-Ready)
# Verifies prerequisites and starts the backend with proper logging
# ✅ Implements intelligent wait logic for Fabric network readiness
# ✅ Retry mechanisms for CA enrollment
# ✅ Idempotent operations (safe to run multiple times)

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Starting HealthLink Middleware API"
echo "  ⏱️  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=5
RETRY_DELAY=3
PEER_PORT=7051
CA_PORT=7054
API_PORT=3000

# Change to middleware directory
cd "$(dirname "$0")"
MIDDLEWARE_DIR=$(pwd)

echo "📂 Working directory: $MIDDLEWARE_DIR"
echo ""

# ========================================
# HELPER FUNCTIONS
# ========================================

# Function: Wait for a port to be listening
wait_for_port() {
    local host=$1
    local port=$2
    local service=$3
    local max_wait=${4:-60}
    local elapsed=0
    
    echo -e "${BLUE}⏳ Waiting for ${service} on ${host}:${port}...${NC}"
    
    while [ $elapsed -lt $max_wait ]; do
        if nc -z $host $port 2>/dev/null; then
            echo -e "${GREEN}✅ ${service} is ready (${elapsed}s)${NC}"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    echo -e "${RED}❌ Timeout waiting for ${service} after ${max_wait}s${NC}"
    return 1
}

# Function: Retry command with exponential backoff
retry_command() {
    local max_attempts=$1
    shift
    local attempt=1
    local delay=$RETRY_DELAY
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${BLUE}[Attempt $attempt/$max_attempts]${NC} Running command..."
        
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
# STEP 1: VERIFY FABRIC NETWORK IS RUNNING
# ========================================

echo -e "${BLUE}[1/5]${NC} Verifying Fabric network prerequisites..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Docker is not running${NC}"
    echo "   Solution: Start Docker daemon"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Fabric network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}❌ ERROR: Fabric network is not running${NC}"
    echo "   Solution: Start the network first:"
    echo "   cd ../fabric-samples/test-network"
    echo "   ./network.sh up createChannel -ca -s couchdb"
    echo ""
    echo "   Or use the complete startup script:"
    echo "   ./start.sh"
    exit 1
fi
echo -e "${GREEN}✅ Fabric network containers are running${NC}"

# Wait for Peer to be responsive (critical for Gateway connection)
wait_for_port localhost $PEER_PORT "Peer0.Org1" 90 || {
    echo -e "${RED}❌ Peer is not responding. Check Docker logs:${NC}"
    echo "   docker logs peer0.org1.example.com"
    exit 1
}

# Wait for CA to be responsive (critical for enrollment)
wait_for_port localhost $CA_PORT "Certificate Authority" 90 || {
    echo -e "${RED}❌ CA is not responding. Check Docker logs:${NC}"
    echo "   docker logs ca_org1"
    exit 1
}

echo -e "${GREEN}✅ All Fabric prerequisites verified${NC}"
echo ""

# ========================================
# STEP 2: VERIFY FILE SYSTEM PREREQUISITES
# ========================================

echo -e "${BLUE}[2/5]${NC} Checking file system prerequisites..."
echo ""

# Check connection profile
CONNECTION_PROFILE="$MIDDLEWARE_DIR/config/connection-profile.json"
if [ ! -f "$CONNECTION_PROFILE" ]; then
    # Try to find it in Fabric network directory
    FABRIC_PROFILE="../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
    
    if [ -f "$FABRIC_PROFILE" ]; then
        echo -e "${YELLOW}⚠️  Connection profile not found in config/. Copying from Fabric network...${NC}"
        mkdir -p "$MIDDLEWARE_DIR/config"
        cp "$FABRIC_PROFILE" "$CONNECTION_PROFILE"
        echo -e "${GREEN}✅ Connection profile copied${NC}"
    else
        echo -e "${RED}❌ ERROR: connection-profile.json not found${NC}"
        echo "   Expected: $CONNECTION_PROFILE"
        echo "   Solution: Copy from Fabric network or generate it"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Connection profile exists${NC}"
fi

# Check node_modules
if [ ! -d "$MIDDLEWARE_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies are installed${NC}"
fi

echo ""

# ========================================
# STEP 3: SETUP WALLET WITH RETRY LOGIC
# ========================================

echo -e "${BLUE}[3/5]${NC} Setting up wallet and admin identity..."
echo ""

WALLET_PATH="$MIDDLEWARE_DIR/wallet"

# Check if wallet already exists with admin identity (IDEMPOTENT)
if [ -d "$WALLET_PATH" ] && [ -f "$WALLET_PATH/admin.id" ]; then
    echo -e "${GREEN}✅ Wallet exists with admin identity (idempotent - skipping enrollment)${NC}"
else
    echo -e "${BLUE}🔑 Creating wallet and enrolling admin...${NC}"
    
    # Remove incomplete wallet if exists
    rm -rf "$WALLET_PATH"
    
    # Enroll admin with retry logic to handle CA initialization delays
    echo -e "${BLUE}📝 Enrolling admin identity (with retry logic for race condition)...${NC}"
    
    retry_command $MAX_RETRIES node -e "
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdmin() {
    try {
        // Load connection profile with absolute path
        const ccpPath = path.resolve(__dirname, 'config', 'connection-profile.json');
        
        if (!fs.existsSync(ccpPath)) {
            console.error('❌ Connection profile not found at:', ccpPath);
            process.exit(1);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Get CA info
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        if (!caInfo) {
            console.error('❌ CA configuration not found in connection profile');
            process.exit(1);
        }
        
        console.log('🔗 Connecting to CA at:', caInfo.url);
        
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(
            caInfo.url, 
            { trustedRoots: caTLSCACerts, verify: false }, 
            caInfo.caName
        );

        // Create wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Check if admin already exists (idempotent check)
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('✅ Admin identity already exists in wallet');
            process.exit(0);
        }

        // Enroll admin with CA
        console.log('🔐 Enrolling admin with CA (enrollmentID: admin)...');
        const enrollment = await ca.enroll({ 
            enrollmentID: 'admin', 
            enrollmentSecret: 'adminpw' 
        });
        
        if (!enrollment || !enrollment.certificate || !enrollment.key) {
            console.error('❌ Enrollment response is incomplete');
            process.exit(1);
        }
        
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        
        await wallet.put('admin', x509Identity);
        console.log('✅ Admin enrolled successfully and stored in wallet');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Enrollment error:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 CA is not accepting connections. Is the Fabric network fully started?');
        } else if (error.message.includes('Calling enroll endpoint failed')) {
            console.error('💡 CA endpoint rejected the request. Verify CA is initialized.');
        }
        
        process.exit(1);
    }
}

enrollAdmin();
"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to enroll admin after $MAX_RETRIES attempts${NC}"
        echo ""
        echo -e "${YELLOW}💡 Troubleshooting Steps:${NC}"
        echo "   1. Check CA logs: docker logs ca_org1 2>&1 | tail -30"
        echo "   2. Verify CA port: nc -z localhost 7054 && echo 'CA reachable'"
        echo "   3. Test CA manually:"
        echo "      docker exec ca_org1 fabric-ca-client enroll -u https://admin:adminpw@localhost:7054"
        echo "   4. Restart Fabric network: cd ../fabric-samples/test-network && ./network.sh down && ./network.sh up createChannel -ca"
        exit 1
    fi
fi

# Verify wallet was created successfully
if [ ! -d "$WALLET_PATH" ] || [ ! -f "$WALLET_PATH/admin.id" ]; then
    echo -e "${RED}❌ CRITICAL: Wallet creation failed - admin.id not found${NC}"
    ls -la "$WALLET_PATH" 2>/dev/null || echo "Wallet directory does not exist"
    exit 1
fi

echo -e "${GREEN}✅ Wallet configured with valid admin identity${NC}"
echo ""

# ========================================
# STEP 4: CHECK PORT AVAILABILITY
# ========================================

echo -e "${BLUE}[4/5]${NC} Checking port availability..."
echo ""

# Check if port 3000 is already in use
if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $API_PORT is already in use${NC}"
    
    EXISTING_PID=$(lsof -Pi :$API_PORT -sTCP:LISTEN -t)
    echo "   Existing process PID: $EXISTING_PID"
    
    # Check if it's our server
    if ps -p $EXISTING_PID -o command= | grep -q "node.*server.js"; then
        echo -e "${YELLOW}   This appears to be an existing Middleware API instance${NC}"
        read -p "   Kill existing server and restart? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "node.*src/server.js" || true
            sleep 3
            echo -e "${GREEN}✅ Existing server stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  Keeping existing server. Exiting.${NC}"
            exit 0
        fi
    else
        echo -e "${RED}❌ Port $API_PORT is in use by another application${NC}"
        echo "   Solution: Kill the process or use a different port"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Port $API_PORT is available${NC}"
fi

echo ""

# ========================================
# STEP 5: START BACKEND SERVER
# ========================================

echo -e "${BLUE}[5/5]${NC} Starting Node.js Middleware API..."
echo -e "  ⏱️  $(date '+%H:%M:%S')"
echo ""

echo -e "${GREEN}🚀 Launching server on port $API_PORT...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start server in foreground (use 'npm run dev' for nodemon auto-reload)
# For production, use: NODE_ENV=production node src/server.js
node src/server.js

# Note: The server will log "LISTENING ON PORT 3000" when ready
# The script will keep running until you press Ctrl+C
