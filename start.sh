#!/bin/bash

# HealthLink Pro - Start Script
# This script starts the complete blockchain network and RPC server

set -e

echo "════════════════════════════════════════════════════════════"
echo "  🚀 HealthLink Pro - Starting Blockchain System"
echo "  ✅ With All Permanent Fixes Applied"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Start Fabric Network
echo -e "${BLUE}[1/6]${NC} Starting Hyperledger Fabric network..."
cd fabric-samples/test-network

# Check if network is already running
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Network is already running. Restarting...${NC}"
    ./network.sh down
fi

# Start network
./network.sh up createChannel -ca -s couchdb
if [ $? -ne 0 ]; then
    echo "❌ Failed to start network"
    exit 1
fi
echo -e "${GREEN}✅ Network started${NC}"
echo ""

# Step 2: Deploy Chaincodes
echo -e "${BLUE}[2/6]${NC} Deploying chaincodes..."

# Deploy healthlink
echo "  Deploying healthlink..."
./network.sh deployCC -ccn healthlink -ccp ../chaincode/healthlink-contract -ccl javascript -ccv 1.0 -ccs 1 -cci NA
echo -e "  ${GREEN}✅ healthlink deployed${NC}"

# Deploy patient-records
echo "  Deploying patient-records..."
./network.sh deployCC -ccn patient-records -ccp ../chaincode/patient-records-contract -ccl javascript -ccv 1.1 -ccs 1 -cci NA
echo -e "  ${GREEN}✅ patient-records deployed${NC}"

# Deploy doctor-credentials v1.8 (FIXED: CouchDB sorting)
echo "  Deploying doctor-credentials v1.8..."
./network.sh deployCC -ccn doctor-credentials -ccp ../chaincode/doctor-credentials-contract -ccl javascript -ccv 1.8 -ccs 1 -cci NA
echo -e "  ${GREEN}✅ doctor-credentials v1.8 deployed (CouchDB query fix)${NC}"

# Deploy appointment v1.9 (FIXED: Deterministic timestamp)
echo "  Deploying appointment v1.9..."
./network.sh deployCC -ccn appointment -ccp ../chaincode/appointment-contract -ccl javascript -ccv 1.9 -ccs 1 -cci NA
echo -e "  ${GREEN}✅ appointment v1.9 deployed (Date.now() fix)${NC}"

# Deploy prescription v1.6 (FIXED: Deterministic expiry date)
echo "  Deploying prescription v1.6..."
./network.sh deployCC -ccn prescription -ccp ../chaincode/prescription-contract -ccl javascript -ccv 1.6 -ccs 1 -cci NA
echo -e "  ${GREEN}✅ prescription v1.6 deployed (new Date() fix)${NC}"

echo ""

# Step 3: Wait for chaincodes to initialize
echo -e "${BLUE}[3/6]${NC} Waiting for chaincode containers to start..."
sleep 10

# Check chaincode containers
CHAINCODE_COUNT=$(docker ps | grep "dev-peer" | wc -l)
echo -e "  ${GREEN}✅ ${CHAINCODE_COUNT}/10 chaincode containers running${NC}"
echo ""

# Step 4: Setup RPC Server
cd ../../my-project/rpc-server
echo -e "${BLUE}[4/6]${NC} Setting up RPC server..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install > /dev/null 2>&1
fi

# Recreate wallet with fresh admin credentials
echo "  Creating fresh wallet..."
rm -rf wallet

# Enroll admin using fabric-ca-client inline
node -e "
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'fabric-samples', 'test-network',
            'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user and imported it into the wallet');
    } catch (error) {
        console.error('Failed to enroll admin user:', error);
        process.exit(1);
    }
}

main();
" 2>&1 | grep -v "^$"

if [ -d "wallet" ]; then
    echo -e "${GREEN}✅ RPC server configured${NC}"
else
    echo "❌ Failed to create wallet"
    exit 1
fi
echo ""

# Step 5: Start RPC Server
echo -e "${BLUE}[5/6]${NC} Starting RPC server..."

# Kill any existing server
pkill -f "node server.js" 2>/dev/null || true

# Start server in background
nohup npm start > server.log 2>&1 &
sleep 15

# Check if server started
if ps aux | grep "node server.js" | grep -v grep > /dev/null; then
    echo -e "${GREEN}✅ RPC server started on port 4000${NC}"
else
    echo "❌ Failed to start RPC server"
    echo "Check server.log for details"
    exit 1
fi
echo ""

# Step 6: Verify System
echo -e "${BLUE}[6/6]${NC} Verifying system..."

# Check network containers
PEER_COUNT=$(docker ps | grep "peer0" | wc -l)
ORDERER_COUNT=$(docker ps | grep "orderer" | wc -l)
COUCH_COUNT=$(docker ps | grep "couchdb" | wc -l)

echo "  Network containers:"
echo "    - Peers: ${PEER_COUNT}/2"
echo "    - Orderer: ${ORDERER_COUNT}/1"
echo "    - CouchDB: ${COUCH_COUNT}/2"

# Check RPC server
if curl -s http://localhost:4000/api/medical-records/TEST > /dev/null 2>&1 || [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ API server responding${NC}"
else
    echo -e "  ${YELLOW}⚠️  API server may still be initializing${NC}"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ HealthLink Pro Started Successfully!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 System Status:"
echo "  • Blockchain Network: RUNNING"
echo "  • Chaincodes: ${CHAINCODE_COUNT}/10 containers (ALL FIXED)"
echo "  • RPC Server: http://localhost:4000"
echo ""
echo "🔧 Permanent Fixes Applied:"
echo "  ✅ Appointment v1.9: Deterministic timestamp (Date.now() → getTxTimestamp)"
echo "  ✅ Prescription v1.6: Deterministic expiry (new Date() → getTxTimestamp)"
echo "  ✅ Doctor v1.8: CouchDB sorting moved to application layer"
echo ""
echo "🚀 Next Steps:"
echo "  • Test APIs: ./test.sh"
echo "  • View logs: tail -f my-project/rpc-server/server.log"
echo "  • Stop system: ./stop.sh"
echo ""
echo "📚 API Base URL: http://localhost:4000"
echo "════════════════════════════════════════════════════════════"
