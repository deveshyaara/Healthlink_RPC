#!/bin/bash

# HealthLink Pro - Status Check Script
# Displays comprehensive system status

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "════════════════════════════════════════════════════════════"
echo "  📊 HealthLink Pro - System Status"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1. Network Containers
echo -e "${BLUE}━━━ Network Containers ━━━${NC}"
PEER_COUNT=$(docker ps | grep "peer0" | wc -l)
ORDERER_COUNT=$(docker ps | grep "orderer.example.com" | wc -l)
CA_COUNT=$(docker ps | grep "ca_" | wc -l)
COUCH_COUNT=$(docker ps | grep "couchdb" | wc -l)

if [ $PEER_COUNT -eq 2 ]; then
    echo -e "  Peers:     ${GREEN}✅ ${PEER_COUNT}/2 running${NC}"
else
    echo -e "  Peers:     ${RED}❌ ${PEER_COUNT}/2 running${NC}"
fi

if [ $ORDERER_COUNT -eq 1 ]; then
    echo -e "  Orderer:   ${GREEN}✅ ${ORDERER_COUNT}/1 running${NC}"
else
    echo -e "  Orderer:   ${RED}❌ ${ORDERER_COUNT}/1 running${NC}"
fi

if [ $CA_COUNT -eq 3 ]; then
    echo -e "  CAs:       ${GREEN}✅ ${CA_COUNT}/3 running${NC}"
else
    echo -e "  CAs:       ${YELLOW}⚠️  ${CA_COUNT}/3 running${NC}"
fi

if [ $COUCH_COUNT -eq 2 ]; then
    echo -e "  CouchDB:   ${GREEN}✅ ${COUCH_COUNT}/2 running${NC}"
else
    echo -e "  CouchDB:   ${RED}❌ ${COUCH_COUNT}/2 running${NC}"
fi
echo ""

# 2. Chaincode Containers
echo -e "${BLUE}━━━ Chaincode Containers (with Permanent Fixes) ━━━${NC}"
CHAINCODE_COUNT=$(docker ps | grep "dev-peer" | wc -l)

# Check each chaincode
docker ps --format "table {{.Names}}" | grep "dev-peer" | while read container; do
    if echo "$container" | grep -q "appointment_1.9"; then
        echo -e "  ${GREEN}✅ appointment v1.9${NC} (deterministic timestamp)"
    elif echo "$container" | grep -q "appointment"; then
        echo -e "  ${YELLOW}⚠️  appointment$(echo $container | grep -oP '_\K[0-9.]+')${NC} (OLD VERSION - should be 1.9)"
    elif echo "$container" | grep -q "prescription_1.6"; then
        echo -e "  ${GREEN}✅ prescription v1.6${NC} (deterministic expiry)"
    elif echo "$container" | grep -q "prescription"; then
        echo -e "  ${YELLOW}⚠️  prescription$(echo $container | grep -oP '_\K[0-9.]+')${NC} (OLD VERSION - should be 1.6)"
    elif echo "$container" | grep -q "doctor-credentials_1.8"; then
        echo -e "  ${GREEN}✅ doctor-credentials v1.8${NC} (CouchDB sorting)"
    elif echo "$container" | grep -q "doctor-credentials"; then
        echo -e "  ${YELLOW}⚠️  doctor-credentials$(echo $container | grep -oP '_\K[0-9.]+')${NC} (OLD VERSION - should be 1.8)"
    elif echo "$container" | grep -q "patient-records"; then
        echo -e "  ${GREEN}✅ patient-records v1.1${NC}"
    elif echo "$container" | grep -q "healthlink"; then
        echo -e "  ${GREEN}✅ healthlink v1.0${NC}"
    fi
done

echo ""
echo -e "  Total: ${CHAINCODE_COUNT}/10 chaincode containers"
echo ""

# 3. RPC Server
echo -e "${BLUE}━━━ RPC Server ━━━${NC}"
if ps aux | grep "node server.js" | grep -v grep > /dev/null; then
    PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
    UPTIME=$(ps -o etime= -p $PID | tr -d ' ')
    echo -e "  Status:    ${GREEN}✅ Running (PID: $PID, uptime: $UPTIME)${NC}"
    echo "  Port:      4000"
    
    # Test health endpoint
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:4000/api/health)
        echo -e "  Health:    ${GREEN}✅ $(echo $HEALTH | grep -oP '"status":"\K[^"]+')${NC}"
    else
        echo -e "  Health:    ${YELLOW}⚠️  No response${NC}"
    fi
else
    echo -e "  Status:    ${RED}❌ Not running${NC}"
    echo "  Run: ./start.sh to start the server"
fi
echo ""

# 4. Docker Resources
echo -e "${BLUE}━━━ Docker Resources ━━━${NC}"
TOTAL_CONTAINERS=$(docker ps -q | wc -l)
TOTAL_IMAGES=$(docker images -q | wc -l)
DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)

echo "  Containers:        ${TOTAL_CONTAINERS}"
echo "  Images:            ${TOTAL_IMAGES}"
if [ $DANGLING_IMAGES -gt 0 ]; then
    echo -e "  Dangling images:   ${YELLOW}${DANGLING_IMAGES} (run ./stop.sh --clean)${NC}"
fi
echo ""

# 5. Disk Usage
echo -e "${BLUE}━━━ Disk Usage ━━━${NC}"
DOCKER_SIZE=$(docker system df --format "table {{.Type}}\t{{.Size}}" | grep "Local Volumes" | awk '{print $3}')
echo "  Docker volumes:    ${DOCKER_SIZE:-N/A}"
echo ""

# 6. Quick Test
echo -e "${BLUE}━━━ Quick API Test ━━━${NC}"
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    # Test a simple endpoint
    TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/medical-records/TEST123)
    if [ "$TEST_RESPONSE" == "404" ] || [ "$TEST_RESPONSE" == "200" ]; then
        echo -e "  API:       ${GREEN}✅ Responding (HTTP $TEST_RESPONSE)${NC}"
        echo "  Run:       ./test.sh for full test suite"
    else
        echo -e "  API:       ${YELLOW}⚠️  Unexpected response (HTTP $TEST_RESPONSE)${NC}"
    fi
else
    echo -e "  API:       ${RED}❌ Not responding${NC}"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"

TOTAL_CHECKS=6
PASSED_CHECKS=0

[ $PEER_COUNT -eq 2 ] && ((PASSED_CHECKS++))
[ $ORDERER_COUNT -eq 1 ] && ((PASSED_CHECKS++))
[ $CHAINCODE_COUNT -ge 8 ] && ((PASSED_CHECKS++))
ps aux | grep "node server.js" | grep -v grep > /dev/null && ((PASSED_CHECKS++))
curl -s http://localhost:4000/api/health > /dev/null 2>&1 && ((PASSED_CHECKS++))
[ $CA_COUNT -eq 3 ] && ((PASSED_CHECKS++))

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "  ${GREEN}✅ System Status: HEALTHY (${PASSED_CHECKS}/${TOTAL_CHECKS} checks passed)${NC}"
elif [ $PASSED_CHECKS -ge 4 ]; then
    echo -e "  ${YELLOW}⚠️  System Status: PARTIAL (${PASSED_CHECKS}/${TOTAL_CHECKS} checks passed)${NC}"
else
    echo -e "  ${RED}❌ System Status: UNHEALTHY (${PASSED_CHECKS}/${TOTAL_CHECKS} checks passed)${NC}"
    echo -e "  ${YELLOW}💡 Run ./start.sh to start the system${NC}"
fi

echo "════════════════════════════════════════════════════════════"
echo ""
echo "💡 Useful Commands:"
echo "   • View logs:      tail -f my-project/rpc-server/server.log"
echo "   • Run tests:      ./test.sh"
echo "   • Docker stats:   docker stats"
echo "   • Stop system:    ./stop.sh"
echo ""
