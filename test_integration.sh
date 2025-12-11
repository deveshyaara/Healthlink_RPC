#!/bin/bash

# Frontend-Backend Integration Test Script
# Tests the complete authentication flow

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   HealthLink Pro - Frontend-Backend Integration Test      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:9002"
TEST_EMAIL="integrationtest$(date +%s)@example.com"
TEST_PASSWORD="Test@12345"
TEST_NAME="Integration Test User"
TEST_ROLE="patient"

echo -e "${BLUE}[1] Checking Backend API...${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | jq -e '.status == "UP"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is UP${NC}"
    echo "$HEALTH_RESPONSE" | jq -r '"   Service: \(.service) v\(.version)"'
else
    echo -e "${RED}❌ Backend API is DOWN${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[2] Checking Frontend...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Frontend is UP (HTTP $FRONTEND_STATUS)${NC}"
    echo "   URL: $FRONTEND_URL"
else
    echo -e "${RED}❌ Frontend is DOWN (HTTP $FRONTEND_STATUS)${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[3] Testing Registration Flow...${NC}"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"
echo "   Role: $TEST_ROLE"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"role\":\"$TEST_ROLE\"}")

if echo "$REGISTER_RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    
    # Extract token and user
    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
    USER_NAME=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.name')
    USER_ROLE=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.role')
    
    echo "   User: $USER_NAME"
    echo "   Role: $USER_ROLE"
    echo "   Token: ${TOKEN:0:50}..."
    
    # Test what api-client.ts does
    echo ""
    echo "   🔄 Testing API Client extraction:"
    HAS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r 'if .data.token then "YES" else "NO" end')
    HAS_USER=$(echo "$REGISTER_RESPONSE" | jq -r 'if .data.user then "YES" else "NO" end')
    echo "      - data.token exists: $HAS_TOKEN"
    echo "      - data.user exists: $HAS_USER"
    
    if [ "$HAS_TOKEN" = "YES" ] && [ "$HAS_USER" = "YES" ]; then
        echo -e "   ${GREEN}✅ API Client will extract token and user correctly${NC}"
    else
        echo -e "   ${RED}❌ API Client extraction will fail${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "$REGISTER_RESPONSE" | jq .
    exit 1
fi

echo ""
echo -e "${BLUE}[4] Testing Token Validation...${NC}"
ME_RESPONSE=$(curl -s "$API_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Token validation successful${NC}"
    VALIDATED_USER=$(echo "$ME_RESPONSE" | jq -r '.data.user.name')
    echo "   User: $VALIDATED_USER"
else
    echo -e "${RED}❌ Token validation failed${NC}"
    echo "$ME_RESPONSE" | jq .
    exit 1
fi

echo ""
echo -e "${BLUE}[5] Testing Login Flow...${NC}"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Login successful${NC}"
    
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    LOGIN_USER=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name')
    
    echo "   User: $LOGIN_USER"
    echo "   Token: ${LOGIN_TOKEN:0:50}..."
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ${GREEN}✅ ALL TESTS PASSED${NC}                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo "   • Backend API: Working correctly"
echo "   • Frontend: Running and accessible"
echo "   • Registration: ✅ Returns token and user"
echo "   • Token Validation: ✅ Working"
echo "   • Login: ✅ Returns token and user"
echo "   • API Response Format: ✅ Compatible with frontend"
echo ""
echo "🌐 Access the application:"
echo "   • Frontend: $FRONTEND_URL"
echo "   • Login Page: $FRONTEND_URL/login"
echo "   • Signup Page: $FRONTEND_URL/signup"
echo ""
echo "🔑 Test with these credentials:"
echo "   Email: doctor1@healthlink.com"
echo "   Password: Doctor@123"
echo ""
echo "📊 Console Logging:"
echo "   Open browser DevTools (F12) → Console tab"
echo "   Look for logs with prefixes:"
echo "   • [API Client] - Request/response details"
echo "   • [Auth Context] - Authentication flow"
echo ""
