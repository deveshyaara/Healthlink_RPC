#!/bin/bash

# HealthLink Middleware API - Simplified Docker Start Script
# Waits for dependencies and starts the application

set -e

echo "🚀 Starting HealthLink Middleware API"
echo "⏱️  $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
BLOCKCHAIN_HOST=${BLOCKCHAIN_HOST:-localhost}
PEER_PORT=${PEER_PORT:-7051}
CA_PORT=${CA_PORT:-7054}

# Function: Wait for service
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local timeout=${4:-60}
    local elapsed=0

    echo -e "${BLUE}⏳ Waiting for ${service} on ${host}:${port}...${NC}"

    while [ $elapsed -lt $timeout ]; do
        if nc -z $host $port 2>/dev/null; then
            echo -e "${GREEN}✅ ${service} is ready${NC}"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo -e "${RED}❌ Timeout waiting for ${service}${NC}"
    return 1
}

# Wait for database
wait_for_service $DB_HOST $DB_PORT "Database" 120 || exit 1

# Wait for Redis
wait_for_service $REDIS_HOST $REDIS_PORT "Redis" 60 || exit 1

# Optional: Wait for blockchain nodes if configured
if [ "$WAIT_FOR_BLOCKCHAIN" = "true" ]; then
    wait_for_service $BLOCKCHAIN_HOST $PEER_PORT "Blockchain Peer" 90 || exit 1
    wait_for_service $BLOCKCHAIN_HOST $CA_PORT "Certificate Authority" 90 || exit 1
fi

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
npm run migrate

# Start the application
echo -e "${GREEN}🚀 Starting application...${NC}"
npm run start:prod