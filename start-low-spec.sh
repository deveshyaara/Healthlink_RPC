#!/bin/bash

# LOW-SPEC OPTIMIZED STARTUP SCRIPT FOR HEALTHLINK PRO MIDDLEWARE
# Target: 1-2 vCPUs, 2-4GB RAM
# Optimizations: Memory limits, garbage collection tuning, connection profile stripping

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  HealthLink Pro - Low-Spec Startup${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration
NODE_MEMORY_LIMIT=512      # 512MB heap limit
GC_INTERVAL=100            # Garbage collection interval
CONNECTION_PROFILE_SOURCE="../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
CONNECTION_PROFILE_MINIMAL="./connection-profile-minimal.json"

# Step 1: Check if middleware-api directory exists
if [ ! -d "middleware-api" ]; then
    echo -e "${RED}ERROR: middleware-api directory not found!${NC}"
    exit 1
fi

cd middleware-api

echo -e "${YELLOW}[1/5] Verifying Node.js version...${NC}"
node --version

echo -e "${YELLOW}[2/5] Creating minimal connection profile...${NC}"
# Strip connection profile to minimal peers (reduces memory usage)
if [ -f "$CONNECTION_PROFILE_SOURCE" ]; then
    # Create minimal connection profile with only essential endpoints
    cat > "$CONNECTION_PROFILE_MINIMAL" <<EOF
{
  "name": "test-network-org1-minimal",
  "version": "1.0.0",
  "client": {
    "organization": "Org1",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        },
        "orderer": "300"
      }
    }
  },
  "organizations": {
    "Org1": {
      "mspid": "Org1MSP",
      "peers": [
        "peer0.org1.example.com"
      ],
      "certificateAuthorities": [
        "ca.org1.example.com"
      ]
    }
  },
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "path": "../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com",
        "hostnameOverride": "peer0.org1.example.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://localhost:7054",
      "caName": "ca-org1",
      "tlsCACerts": {
        "path": "../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem"
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
EOF
    echo -e "${GREEN}✓ Minimal connection profile created${NC}"
else
    echo -e "${YELLOW}WARNING: Source connection profile not found. Using default.${NC}"
fi

echo -e "${YELLOW}[3/5] Checking environment variables...${NC}"
# Set production environment variables
export NODE_ENV=production
export FABRIC_LOGGING_SPEC=INFO
export GRPC_TRACE=none
export GRPC_VERBOSITY=ERROR

# Low-spec optimization flags
export UV_THREADPOOL_SIZE=4           # Reduce thread pool size
export NODE_OPTIONS="--max-old-space-size=$NODE_MEMORY_LIMIT"

echo -e "${GREEN}✓ Environment configured${NC}"
echo -e "  - NODE_ENV: $NODE_ENV"
echo -e "  - Memory limit: ${NODE_MEMORY_LIMIT}MB"
echo -e "  - UV_THREADPOOL_SIZE: $UV_THREADPOOL_SIZE"

echo -e "${YELLOW}[4/5] Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (production only)...${NC}"
    npm ci --omit=dev
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo -e "${YELLOW}[5/5] Starting Node.js server with memory optimization...${NC}"
echo -e "${GREEN}Node.js Optimization Flags:${NC}"
echo -e "  --max-old-space-size=${NODE_MEMORY_LIMIT}     # Hard heap limit"
echo -e "  --optimize_for_size                           # Reduce memory footprint"
echo -e "  --gc_interval=${GC_INTERVAL}                  # Aggressive GC"
echo -e "  --max_semi_space_size=2                       # Reduce young generation"

# Start Node.js with low-spec optimization flags
exec node \
  --max-old-space-size=$NODE_MEMORY_LIMIT \
  --optimize_for_size \
  --gc_interval=$GC_INTERVAL \
  --max_semi_space_size=2 \
  src/server.js

# Note: exec replaces the shell process, ensuring clean signal handling
