#!/bin/bash

# HealthLink System Demo Script
# Demonstrates the complete blockchain integration

echo "======================================"
echo "HealthLink Blockchain System Demo"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check system status
echo -e "${BLUE}📊 Checking System Status...${NC}"
echo ""

echo -e "${YELLOW}1. Blockchain Network:${NC}"
PEERS=$(docker ps --format "{{.Names}}" | grep -E "peer|orderer" | wc -l)
echo "   ✅ $PEERS containers running"

echo -e "${YELLOW}2. Middleware API:${NC}"
API_STATUS=$(curl -s http://localhost:3000/health | jq -r .status 2>/dev/null)
if [ "$API_STATUS" == "UP" ]; then
    echo "   ✅ API Server: UP (http://localhost:3000)"
else
    echo "   ❌ API Server: DOWN"
    exit 1
fi

echo -e "${YELLOW}3. Frontend:${NC}"
if curl -s http://localhost:9002 | grep -q "HealthLink"; then
    echo "   ✅ Next.js: RUNNING (http://localhost:9002)"
else
    echo "   ❌ Frontend: NOT RUNNING"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All systems operational!${NC}"
echo ""

# List registered identities
echo -e "${BLUE}👤 Registered Identities:${NC}"
curl -s http://localhost:3000/api/v1/wallet/identities | jq -r '.data[]' 2>/dev/null | while read -r id; do
    echo "   • $id"
done

echo ""
echo -e "${BLUE}🎯 Available Endpoints:${NC}"
echo "   • Web UI: http://localhost:9002/blockchain-test"
echo "   • API Docs: http://localhost:3000/api/v1"
echo "   • Health Check: http://localhost:3000/health"
echo "   • WebSocket: ws://localhost:4001/ws"

echo ""
echo -e "${BLUE}🧪 Try These Actions:${NC}"
echo ""

# Demo 1: Register a new user
echo -e "${YELLOW}Demo 1: Register a new user${NC}"
NEW_USER="nurse_$(date +%s)"
echo "curl -X POST http://localhost:3000/api/v1/wallet/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"userId\": \"$NEW_USER\", \"role\": \"client\", \"affiliation\": \"org1.department1\"}'"
echo ""

# Demo 2: Create patient record
echo -e "${YELLOW}Demo 2: Create a patient record${NC}"
echo "curl -X POST http://localhost:3000/api/v1/transactions/private \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"contractName\": \"healthlink\","
echo "    \"functionName\": \"CreatePatient\","
echo "    \"transientData\": {"
echo "      \"patientDetails\": \"{\\\"name\\\":\\\"John Doe\\\",\\\"age\\\":30,\\\"gender\\\":\\\"Male\\\",\\\"ipfsHash\\\":\\\"QmTestHash123\\\"}\""
echo "    },"
echo "    \"args\": [\"0x742d35Cc6634C0532925a3b844Bc454e4438f44e\"],"
echo "    \"userId\": \"doctor1\""
echo "  }'"
echo ""

# Demo 3: Create consent
echo -e "${YELLOW}Demo 3: Create a consent record${NC}"
echo "curl -X POST http://localhost:3000/api/v1/transactions \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"contractName\": \"healthlink\","
echo "    \"functionName\": \"CreateConsent\","
echo "    \"args\": [\"consent_$(date +%s)\", \"patient001\", \"doctor1\", \"read\", \"treatment\", \"2025-12-31\"],"
echo "    \"userId\": \"doctor1\","
echo "    \"async\": false"
echo "  }'"
echo ""

echo "======================================"
echo -e "${GREEN}🚀 System Ready for Testing!${NC}"
echo "======================================"
echo ""
echo "Open the test interface:"
echo "→ http://localhost:9002/blockchain-test"
echo ""
