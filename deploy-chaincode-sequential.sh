#!/bin/bash

# HealthLink Pro - Sequential Chaincode Deployment
# Deploys one chaincode at a time with resource management
# Permanent fix for low-resource systems - no patch work

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NETWORK_DIR="${SCRIPT_DIR}/fabric-samples/test-network"
LOG_FILE="${SCRIPT_DIR}/deployment-sequential.log"

# Tracking
DEPLOYED_COUNT=0
FAILED_COUNT=0

# Initialize log
echo "==================================================" > "$LOG_FILE"
echo "Sequential Chaincode Deployment" >> "$LOG_FILE"
echo "Started at: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo "" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    echo "[SUCCESS] $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
    echo "[INFO] $1" >> "$LOG_FILE"
}

# Check if network is running
check_network() {
    print_header "Checking Fabric Network"
    
    if ! docker ps | grep -q "peer0.org1.example.com"; then
        print_error "Fabric network is not running!"
        print_warning "Please start the network first:"
        echo "  cd $TEST_NETWORK_DIR"
        echo "  ./network.sh down"
        echo "  ./network.sh up createChannel"
        exit 1
    fi
    
    print_success "Fabric network is running"
    
    # Check peer status
    if docker ps | grep -q "peer0.org1.example.com.*Up"; then
        print_success "Peer0.Org1 is healthy"
    else
        print_warning "Peer0.Org1 may have issues"
    fi
    
    if docker ps | grep -q "peer0.org2.example.com.*Up"; then
        print_success "Peer0.Org2 is healthy"
    else
        print_warning "Peer0.Org2 may have issues"
    fi
}

# Cleanup resources before deployment
cleanup_resources() {
    print_info "Cleaning up Docker resources..."
    
    # Remove old chaincode containers
    docker ps -aq --filter "name=dev-peer" | xargs -r docker rm -f 2>/dev/null || true
    
    # Prune system
    docker system prune -f > /dev/null 2>&1
    
    print_success "Cleanup completed"
}

# Deploy single chaincode with resource management
deploy_chaincode() {
    local chaincode_name=$1
    local chaincode_path=$2
    local version=$3
    local sequence=$4
    
    print_header "Deploying ${chaincode_name} v${version}"
    
    cd "$TEST_NETWORK_DIR"
    
    # Check if already deployed
    if docker ps | grep -q "dev-peer.*${chaincode_name}"; then
        print_warning "${chaincode_name} container already exists"
        read -p "Remove and redeploy? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Removing existing container..."
            docker ps -aq --filter "name=${chaincode_name}" | xargs -r docker rm -f 2>/dev/null || true
            sleep 2
        else
            print_info "Skipping ${chaincode_name}"
            cd "$SCRIPT_DIR"
            return 0
        fi
    fi
    
    print_info "Starting deployment process..."
    print_info "Chaincode: $chaincode_name"
    print_info "Path: $chaincode_path"
    print_info "Version: $version"
    print_info "Sequence: $sequence"
    echo ""
    
    # Deploy
    if ./network.sh deployCC \
        -ccn "${chaincode_name}" \
        -ccp "${chaincode_path}" \
        -ccl javascript \
        -ccv "${version}" \
        -ccs "${sequence}" \
        -ccep "OR('Org1MSP.member','Org2MSP.member')" 2>&1 | tee -a "$LOG_FILE"; then
        
        print_success "${chaincode_name} deployed successfully!"
        ((DEPLOYED_COUNT++))
        
        # Wait for container to stabilize
        print_info "Waiting for chaincode container to stabilize..."
        sleep 5
        
        # Verify container is running
        if docker ps | grep -q "dev-peer.*${chaincode_name}"; then
            print_success "Chaincode container is running"
        else
            print_warning "Chaincode container not found (will start on first invocation)"
        fi
        
    else
        print_error "Failed to deploy ${chaincode_name}"
        ((FAILED_COUNT++))
        cd "$SCRIPT_DIR"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
    
    # Cleanup after deployment
    print_info "Cleaning up resources..."
    docker system prune -f > /dev/null 2>&1
    
    print_success "Deployment cycle completed for ${chaincode_name}"
    
    # Wait before next deployment
    print_info "Waiting 8 seconds before next deployment..."
    sleep 8
    
    return 0
}

# Show system status
show_status() {
    print_header "System Status"
    
    # Show running containers
    echo -e "${CYAN}Fabric Network Containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" --filter "name=peer0"
    echo ""
    
    # Show chaincode containers
    echo -e "${CYAN}Deployed Chaincodes:${NC}"
    if docker ps --filter "name=dev-peer" --format "{{.Names}}" | grep -q "dev-peer"; then
        docker ps --filter "name=dev-peer" --format "table {{.Names}}\t{{.Status}}" | \
            sed 's/dev-peer[0-9].org[0-9].example.com-/  ✓ /g'
    else
        echo "  No chaincode containers running yet"
    fi
    echo ""
    
    # Memory usage
    if command -v free &> /dev/null; then
        echo -e "${CYAN}Memory Status:${NC}"
        free -h | grep "Mem:"
        echo ""
    fi
}

# Main deployment
main() {
    print_header "HealthLink Pro - Sequential Chaincode Deployment"
    echo -e "${YELLOW}Deployment Strategy: One chaincode at a time${NC}"
    echo -e "${YELLOW}Optimized for low-resource systems${NC}"
    echo ""
    
    check_network
    cleanup_resources
    show_status
    
    # Define chaincodes to deploy
    # Format: name:path:version:sequence
    declare -a chaincodes=(
        "healthlink-contract:../chaincode/healthlink-contract:1.0:1"
        "patient-records:../chaincode/patient-records-contract:1.0:1"
        "doctor-credentials:../chaincode/doctor-credentials-contract:1.1:1"
        "appointment-contract:../chaincode/appointment-contract:1.0:1"
        "prescription-contract:../chaincode/prescription-contract:1.0:1"
    )
    
    total=${#chaincodes[@]}
    current=1
    
    echo -e "${CYAN}Deploying $total chaincodes sequentially...${NC}"
    echo ""
    
    for chaincode_info in "${chaincodes[@]}"; do
        IFS=':' read -r name path version sequence <<< "$chaincode_info"
        
        echo -e "${BLUE}═══ [$current/$total] $name ═══${NC}"
        
        deploy_chaincode "$name" "$path" "$version" "$sequence"
        
        print_info "Progress: $current/$total chaincodes processed"
        ((current++))
        echo ""
    done
    
    # Final summary
    print_header "DEPLOYMENT SUMMARY"
    
    show_status
    
    echo -e "${CYAN}Deployment Statistics:${NC}"
    echo -e "  Total Chaincodes:     $total"
    echo -e "  ${GREEN}Successfully Deployed: $DEPLOYED_COUNT${NC}"
    echo -e "  ${RED}Failed:                $FAILED_COUNT${NC}"
    echo ""
    
    if [ $FAILED_COUNT -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   ✓ ALL CHAINCODES DEPLOYED SUCCESSFULLY!                ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Start RPC server: cd my-project/rpc-server"
        echo "  2. Setup wallet: rm -rf wallet && node addToWallet.js"
        echo "  3. Start server: npm start &"
        echo "  4. Run tests: ./test-chaincode-sequential.sh"
        echo ""
        
        echo "" >> "$LOG_FILE"
        echo "ALL CHAINCODES DEPLOYED SUCCESSFULLY" >> "$LOG_FILE"
        echo "Completed at: $(date)" >> "$LOG_FILE"
        
        exit 0
    else
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║   ⚠ DEPLOYMENT COMPLETED WITH SOME FAILURES              ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Check the logs for details:"
        echo "  cat $LOG_FILE"
        echo ""
        
        echo "" >> "$LOG_FILE"
        echo "DEPLOYMENT COMPLETED WITH FAILURES: $FAILED_COUNT/$total" >> "$LOG_FILE"
        echo "Completed at: $(date)" >> "$LOG_FILE"
        
        exit 1
    fi
}

# Run main
main
