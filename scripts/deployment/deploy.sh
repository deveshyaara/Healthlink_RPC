#!/bin/bash

##############################################
# HealthLink Pro - Production Deployment
# Automated startup script
# Date: December 5, 2025
##############################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
ROOT_DIR="/workspaces/Healthlink_RPC"
BACKEND_DIR="$ROOT_DIR/middleware-api"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT=4000
FRONTEND_PORT=9002

##############################################
# Functions
##############################################

print_header() {
    echo -e "\n${CYAN}${BOLD}========================================${NC}"
    echo -e "${CYAN}${BOLD}$1${NC}"
    echo -e "${CYAN}${BOLD}========================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}[STEP $1/$2]${NC} ${BOLD}$3${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if Fabric network is running
check_fabric_network() {
    local container_count=$(docker ps | grep hyperledger | wc -l)
    if [ $container_count -ge 5 ]; then
        return 0  # Network is running
    else
        return 1  # Network is not running
    fi
}

##############################################
# Main Deployment
##############################################

print_header "HEALTHLINK PRO - PRODUCTION DEPLOYMENT"

echo -e "${CYAN}Deployment Method:${NC} Background Processes (nohup)"
echo -e "${CYAN}Backend Port:${NC} $BACKEND_PORT"
echo -e "${CYAN}Frontend Port:${NC} $FRONTEND_PORT\n"

# STEP 1: Pre-flight checks
print_step 1 6 "Pre-flight Checks"

# Check if we're in the right directory
if [ ! -d "$ROOT_DIR" ]; then
    print_error "Root directory not found: $ROOT_DIR"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

print_success "All directories found"

# Check if ports are already in use
if check_port $BACKEND_PORT; then
    print_warning "Backend port $BACKEND_PORT is already in use"
    echo -e "  ${YELLOW}Run: lsof -ti:$BACKEND_PORT | xargs kill -9${NC}"
    echo -e "  ${YELLOW}Or use a different port${NC}\n"
fi

if check_port $FRONTEND_PORT; then
    print_warning "Frontend port $FRONTEND_PORT is already in use"
    echo -e "  ${YELLOW}Run: lsof -ti:$FRONTEND_PORT | xargs kill -9${NC}"
    echo -e "  ${YELLOW}Or use a different port${NC}\n"
fi

# STEP 2: Start Fabric Network
print_step 2 6 "Starting Fabric Network"

if check_fabric_network; then
    print_success "Fabric network already running"
else
    echo -e "  ${CYAN}Starting Hyperledger Fabric...${NC}"
    cd "$ROOT_DIR"
    ./start.sh > /dev/null 2>&1 &
    
    echo -e "  ${YELLOW}Waiting for network initialization (30 seconds)...${NC}"
    for i in {1..30}; do
        echo -n "."
        sleep 1
    done
    echo ""
    
    if check_fabric_network; then
        print_success "Fabric network started successfully"
    else
        print_error "Failed to start Fabric network"
        echo -e "  ${YELLOW}Try manually: cd $ROOT_DIR && ./start.sh${NC}"
        exit 1
    fi
fi

# STEP 3: Create log directories
print_step 3 6 "Creating Log Directories"

mkdir -p "$BACKEND_DIR/logs"
mkdir -p "$FRONTEND_DIR/logs"
print_success "Log directories created"

# STEP 4: Start Backend API
print_step 4 6 "Starting Backend API"

cd "$BACKEND_DIR"

# Check if backend is already running
if [ -f "backend.pid" ]; then
    OLD_PID=$(cat backend.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        print_warning "Backend already running (PID: $OLD_PID)"
        echo -e "  ${YELLOW}Killing old process...${NC}"
        kill $OLD_PID 2>/dev/null || true
        sleep 2
    fi
fi

# Start backend
echo -e "  ${CYAN}Starting backend on port $BACKEND_PORT...${NC}"
nohup npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid

# Wait for backend to start
sleep 5

# Verify backend is running
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    print_success "Backend started (PID: $BACKEND_PID)"
    echo -e "  ${CYAN}Logs: tail -f $BACKEND_DIR/logs/backend.log${NC}"
else
    print_error "Backend failed to start"
    echo -e "  ${YELLOW}Check logs: cat $BACKEND_DIR/logs/backend.log${NC}"
    exit 1
fi

# STEP 5: Start Frontend
print_step 5 6 "Starting Frontend"

cd "$FRONTEND_DIR"

# Check if frontend is already running
if [ -f "frontend.pid" ]; then
    OLD_PID=$(cat frontend.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        print_warning "Frontend already running (PID: $OLD_PID)"
        echo -e "  ${YELLOW}Killing old process...${NC}"
        kill $OLD_PID 2>/dev/null || true
        sleep 2
    fi
fi

# Start frontend
echo -e "  ${CYAN}Starting frontend on port $FRONTEND_PORT...${NC}"
nohup npm run start > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid

# Wait for frontend to start
sleep 5

# Verify frontend is running
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
    echo -e "  ${CYAN}Logs: tail -f $FRONTEND_DIR/logs/frontend.log${NC}"
else
    print_error "Frontend failed to start"
    echo -e "  ${YELLOW}Check logs: cat $FRONTEND_DIR/logs/frontend.log${NC}"
    exit 1
fi

# STEP 6: Verify Deployment
print_step 6 6 "Verifying Deployment"

echo -e "  ${CYAN}Running Trident Test (Database + Blockchain + API)...${NC}\n"
sleep 5  # Give services more time to initialize

cd "$BACKEND_DIR"
node verify_full_stack.js

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}========================================${NC}"
    echo -e "${GREEN}${BOLD}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo -e "${GREEN}${BOLD}========================================${NC}\n"
else
    echo -e "\n${YELLOW}${BOLD}========================================${NC}"
    echo -e "${YELLOW}${BOLD}⚠️  DEPLOYMENT COMPLETE WITH WARNINGS${NC}"
    echo -e "${YELLOW}${BOLD}========================================${NC}\n"
    echo -e "${YELLOW}Some services may need manual startup.${NC}"
    echo -e "${YELLOW}Check logs and run verify_full_stack.js again.${NC}\n"
fi

# Print deployment summary
echo -e "${CYAN}${BOLD}DEPLOYMENT SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Frontend:${NC}  http://localhost:$FRONTEND_PORT ${GREEN}(PID: $FRONTEND_PID)${NC}"
echo -e "${BOLD}Backend:${NC}   http://localhost:$BACKEND_PORT ${GREEN}(PID: $BACKEND_PID)${NC}"
echo -e "${BOLD}API Health:${NC} http://localhost:$BACKEND_PORT/health"
echo -e ""
echo -e "${CYAN}${BOLD}MONITORING COMMANDS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Backend logs:${NC}  tail -f $BACKEND_DIR/logs/backend.log"
echo -e "${BOLD}Frontend logs:${NC} tail -f $FRONTEND_DIR/logs/frontend.log"
echo -e "${BOLD}Verify status:${NC} cd $BACKEND_DIR && node verify_full_stack.js"
echo -e "${BOLD}Process status:${NC} ps aux | grep node"
echo -e ""
echo -e "${CYAN}${BOLD}STOP SERVICES${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Stop all:${NC} killall node"
echo -e "${BOLD}Stop backend:${NC}  kill $BACKEND_PID"
echo -e "${BOLD}Stop frontend:${NC} kill $FRONTEND_PID"
echo -e ""
echo -e "${CYAN}${BOLD}NEXT STEPS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "1. Open browser: ${BOLD}http://localhost:$FRONTEND_PORT${NC}"
echo -e "2. Test backend: ${BOLD}curl http://localhost:$BACKEND_PORT/health${NC}"
echo -e "3. Monitor logs for errors"
echo -e "4. Test user login and features"
echo -e ""
echo -e "${GREEN}🚀 HealthLink Pro is now live!${NC}\n"
