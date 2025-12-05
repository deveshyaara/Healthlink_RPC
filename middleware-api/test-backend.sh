#!/bin/bash

# HealthLink Backend - Health Check & Testing Script
# Tests all critical endpoints independently of the frontend

echo "════════════════════════════════════════════════════════════"
echo "  🏥 HealthLink Backend Health Check"
echo "════════════════════════════════════════════════════════════"
echo ""

BACKEND_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# Test 1: Basic Health Check
# ========================================

echo -e "${BLUE}[1/5]${NC} Testing Basic Health Endpoint..."
echo "Command: curl -s $BACKEND_URL/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $BACKEND_URL/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
echo ""

# ========================================
# Test 2: Auth Login Endpoint (Structure Test)
# ========================================

echo -e "${BLUE}[2/5]${NC} Testing Auth Login Endpoint..."
echo "Command: curl -s -X POST $BACKEND_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test\"}'"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BACKEND_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}' 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✅ Login endpoint is responding (Error expected for test credentials)${NC}"
    echo "Response:"
    echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE"
elif [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Login endpoint working (Credentials were valid!)${NC}"
    echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE"
else
    echo -e "${RED}❌ Login endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
echo ""

# ========================================
# Test 3: Auth Register Endpoint (Structure Test)
# ========================================

echo -e "${BLUE}[3/5]${NC} Testing Auth Register Endpoint..."
echo "Command: curl -s -X POST $BACKEND_URL/api/auth/register -H 'Content-Type: application/json' -d '{...}'"
echo ""

REGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST $BACKEND_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"testuser@test.com","password":"test123","role":"patient"}' 2>&1)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Register endpoint working (User created)${NC}"
    echo "$REGISTER_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE" | grep -v "HTTP_CODE"
elif [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "409" ]; then
    echo -e "${GREEN}✅ Register endpoint is responding (User may already exist)${NC}"
    echo "$REGISTER_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE" | grep -v "HTTP_CODE"
else
    echo -e "${RED}❌ Register endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "$REGISTER_RESPONSE" | grep -v "HTTP_CODE"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
echo ""

# ========================================
# Test 4: Network Status (Blockchain Connection)
# ========================================

echo -e "${BLUE}[4/5]${NC} Testing Blockchain Network Connection..."
echo "Command: curl -s $BACKEND_URL/api/v1/network/status"
echo ""

NETWORK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $BACKEND_URL/api/v1/network/status 2>&1)
HTTP_CODE=$(echo "$NETWORK_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Blockchain connection active${NC}"
    echo "$NETWORK_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$NETWORK_RESPONSE" | grep -v "HTTP_CODE"
else
    echo -e "${YELLOW}⚠️  Blockchain status check returned HTTP $HTTP_CODE${NC}"
    echo "$NETWORK_RESPONSE" | grep -v "HTTP_CODE"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
echo ""

# ========================================
# Test 5: Port Listening Check
# ========================================

echo -e "${BLUE}[5/5]${NC} Verifying Port 3000 is Listening..."

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    PROCESS=$(ps -p $PID -o comm=)
    echo -e "${GREEN}✅ Port 3000 is LISTENING${NC}"
    echo "   Process: $PROCESS (PID: $PID)"
else
    echo -e "${RED}❌ Port 3000 is NOT listening${NC}"
    echo "   The backend server is not running!"
    echo "   Solution: Run ./start-backend.sh"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Health Check Complete"
echo "════════════════════════════════════════════════════════════"
echo ""

# Final summary
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}Backend Status: RUNNING ✅${NC}"
    echo ""
    echo "You can now test the frontend login/register at:"
    echo "  http://localhost:9002/login"
    echo "  http://localhost:9002/signup"
else
    echo -e "${RED}Backend Status: NOT RUNNING ❌${NC}"
    echo ""
    echo "Start the backend with:"
    echo "  cd /workspaces/Healthlink_RPC/middleware-api"
    echo "  ./start-backend.sh"
fi
