#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}$1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# Configuration
PROJECT_ROOT="/workspaces/Healthlink_RPC"
FABRIC_NETWORK="$PROJECT_ROOT/fabric-samples/test-network"
MIDDLEWARE_DIR="$PROJECT_ROOT/middleware-api"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
CHAINCODE_DIR="$PROJECT_ROOT/fabric-samples/chaincode"

MIDDLEWARE_PORT=3000
FRONTEND_PORT=9002
MAX_WAIT=60

cat <<'EOF'

╔═══════════════════════════════════════════════════════════════════╗
║              HEALTHLINK PRO - MASTER LAUNCH SCRIPT                ║
║                    Full Stack Startup Automation                  ║
╚═══════════════════════════════════════════════════════════════════╝

EOF

# Function to check if port is in use
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=$3
    local attempt=0
    
    log_info "Waiting for $name to be ready..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$name is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    log_error "$name failed to start after $max_attempts attempts"
    return 1
}

# Function to check Fabric network
check_fabric_network() {
    docker ps | grep -E "peer0.org1|orderer.example.com" >/dev/null 2>&1
}

# Step 1: Check and Start Fabric Network
log_step "STEP 1: Hyperledger Fabric Network"

if check_fabric_network; then
    log_success "Fabric network is already running"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|couchdb"
else
    log_info "Fabric network not running. Starting..."
    cd "$FABRIC_NETWORK"
    
    # Check if network.sh exists
    if [ ! -f "network.sh" ]; then
        log_error "network.sh not found! Run: ./fabric_fresh_install.sh"
        exit 1
    fi
    
    log_info "Starting Fabric network with CouchDB..."
    ./network.sh up createChannel -s couchdb
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start Fabric network"
        exit 1
    fi
    
    log_success "Fabric network started successfully"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|couchdb"
fi

# Step 2: Deploy Chaincode
log_step "STEP 2: Chaincode Deployment"

cd "$FABRIC_NETWORK"

# List of chaincodes to deploy
CHAINCODES=(
    "healthlink-contract:healthlink"
    "patient-records-contract:patientrecords"
    "prescription-contract:prescription"
    "appointment-contract:appointment"
    "lab-test-contract:labtest"
    "insurance-claims-contract:insurance"
    "doctor-credentials-contract:doctor"
)

for CHAINCODE_INFO in "${CHAINCODES[@]}"; do
    IFS=':' read -r CHAINCODE_DIR_NAME CHAINCODE_NAME <<< "$CHAINCODE_INFO"
    
    log_info "Checking chaincode: $CHAINCODE_NAME"
    
    # Check if chaincode is already deployed
    if docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel -n "$CHAINCODE_NAME" 2>/dev/null | grep -q "Version:"; then
        log_success "Chaincode $CHAINCODE_NAME already deployed"
    else
        log_info "Deploying chaincode: $CHAINCODE_NAME"
        
        # Deploy chaincode
        ./network.sh deployCC -ccn "$CHAINCODE_NAME" -ccp "../chaincode/$CHAINCODE_DIR_NAME" -ccl javascript
        
        if [ $? -eq 0 ]; then
            log_success "Chaincode $CHAINCODE_NAME deployed successfully"
        else
            log_warn "Failed to deploy $CHAINCODE_NAME (may need manual intervention)"
        fi
    fi
done

# Step 3: Start Middleware API
log_step "STEP 3: Middleware API (Node.js + Express)"

cd "$MIDDLEWARE_DIR"

# Check if already running
if check_port $MIDDLEWARE_PORT; then
    log_warn "Port $MIDDLEWARE_PORT already in use"
    read -p "Kill existing process? (y/n): " kill_choice
    if [ "$kill_choice" = "y" ]; then
        lsof -ti:$MIDDLEWARE_PORT | xargs kill -9 2>/dev/null
        log_success "Killed process on port $MIDDLEWARE_PORT"
        sleep 2
    else
        log_info "Skipping middleware startup"
    fi
fi

if ! check_port $MIDDLEWARE_PORT; then
    log_info "Installing middleware dependencies..."
    npm install --silent
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warn ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env from template"
        else
            log_error ".env.example not found! Please create .env manually"
            exit 1
        fi
    fi
    
    log_info "Starting middleware API in background..."
    nohup npm start > "$PROJECT_ROOT/middleware.log" 2>&1 &
    MIDDLEWARE_PID=$!
    echo $MIDDLEWARE_PID > "$PROJECT_ROOT/middleware.pid"
    
    # Wait for middleware to be ready
    wait_for_service "http://localhost:$MIDDLEWARE_PORT/api/health" "Middleware API" 30
    
    if [ $? -eq 0 ]; then
        log_success "Middleware API is running (PID: $MIDDLEWARE_PID)"
    else
        log_error "Middleware API failed to start. Check logs: tail -f middleware.log"
        exit 1
    fi
fi

# Step 4: Start Frontend
log_step "STEP 4: Frontend (Next.js)"

cd "$FRONTEND_DIR"

# Check if already running
if check_port $FRONTEND_PORT; then
    log_warn "Port $FRONTEND_PORT already in use"
    read -p "Kill existing process? (y/n): " kill_choice
    if [ "$kill_choice" = "y" ]; then
        lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
        log_success "Killed process on port $FRONTEND_PORT"
        sleep 2
    else
        log_info "Skipping frontend startup"
    fi
fi

if ! check_port $FRONTEND_PORT; then
    log_info "Installing frontend dependencies..."
    npm install --silent
    
    log_info "Starting frontend in background..."
    nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$PROJECT_ROOT/frontend.pid"
    
    # Wait for frontend to be ready
    wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend" 45
    
    if [ $? -eq 0 ]; then
        log_success "Frontend is running (PID: $FRONTEND_PID)"
    else
        log_error "Frontend failed to start. Check logs: tail -f frontend.log"
        exit 1
    fi
fi

# Final Summary
log_step "✅ SYSTEM READY - Access Information"

cat <<EOF

╔═══════════════════════════════════════════════════════════════════╗
║                      🎉 HEALTHLINK PRO ONLINE                     ║
╚═══════════════════════════════════════════════════════════════════╝

🌐 ACCESS URLS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Frontend:         http://localhost:$FRONTEND_PORT
  API:              http://localhost:$MIDDLEWARE_PORT
  API Health:       http://localhost:$MIDDLEWARE_PORT/api/health
  API Docs:         http://localhost:$MIDDLEWARE_PORT/api-docs

🔐 DEFAULT CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Admin:
    Email:    admin@healthlink.gov.in
    Password: Admin@123

  Doctor:
    Email:    doctor@hospital.com
    Password: Doctor@123

  Patient:
    Email:    patient@email.com
    Password: Patient@123

📊 SYSTEM STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Fabric Network:  $(docker ps --filter "name=peer0.org1" --format "{{.Status}}" | head -1)
  ✅ Middleware:      Running (PID: $(cat $PROJECT_ROOT/middleware.pid 2>/dev/null || echo "N/A"))
  ✅ Frontend:        Running (PID: $(cat $PROJECT_ROOT/frontend.pid 2>/dev/null || echo "N/A"))

📁 LOG FILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Middleware:  tail -f $PROJECT_ROOT/middleware.log
  Frontend:    tail -f $PROJECT_ROOT/frontend.log
  Docker:      docker logs peer0.org1.example.com

🔧 MANAGEMENT COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Stop All:         ./stop.sh
  View Status:      ./status.sh
  Seed Data:        node seed_data.js
  Run Tests:        node test_features.js

🎯 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Open browser: http://localhost:$FRONTEND_PORT
  2. Seed demo data: node seed_data.js
  3. Run tests: node test_features.js
  4. Check QA_CHECKLIST.md for manual testing

═══════════════════════════════════════════════════════════════════

EOF

cd "$PROJECT_ROOT"
