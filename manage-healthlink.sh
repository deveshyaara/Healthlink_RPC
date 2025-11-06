#!/bin/bash

# HealthLink Pro - Resource-Optimized Operations Manager
# Master script for managing operations on low-resource systems
# Permanent implementation - no patch work

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_banner() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}║        ${MAGENTA}HealthLink Pro - Operations Manager${BLUE}              ║${NC}"
    echo -e "${BLUE}║        ${CYAN}Optimized for Low-Resource Systems${BLUE}             ║${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_header() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
    echo ""
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

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check system resources
check_system_resources() {
    print_header "System Resource Check"
    
    # Check memory
    if command -v free &> /dev/null; then
        total_mem=$(free -m | awk 'NR==2{print $2}')
        available_mem=$(free -m | awk 'NR==2{print $7}')
        used_percent=$(awk "BEGIN {printf \"%.0f\", (($total_mem-$available_mem)/$total_mem)*100}")
        
        echo -e "${CYAN}Memory:${NC}"
        echo -e "  Total: ${total_mem}MB"
        echo -e "  Available: ${available_mem}MB"
        echo -e "  Usage: ${used_percent}%"
        
        if [ "$used_percent" -gt 85 ]; then
            print_error "Memory usage is critically high!"
            print_warning "Recommended: Run cleanup before proceeding"
            return 1
        elif [ "$used_percent" -gt 70 ]; then
            print_warning "Memory usage is high"
            print_info "Consider running cleanup for better performance"
        else
            print_success "Memory levels are acceptable"
        fi
    fi
    
    # Check Docker
    echo ""
    echo -e "${CYAN}Docker:${NC}"
    container_count=$(docker ps -q | wc -l)
    echo -e "  Running containers: $container_count"
    
    if [ "$container_count" -gt 20 ]; then
        print_warning "Many containers running - may impact performance"
    else
        print_success "Container count is manageable"
    fi
    
    echo ""
    return 0
}

# Check network status
check_network_status() {
    print_header "Fabric Network Status"
    
    if docker ps | grep -q "peer0.org1.example.com"; then
        print_success "Fabric network is running"
        
        # Show network components
        echo ""
        echo -e "${CYAN}Network Components:${NC}"
        docker ps --filter "name=peer" --filter "name=orderer" --format "  ✓ {{.Names}}" | head -6
        
        # Show chaincodes
        chaincode_count=$(docker ps --filter "name=dev-peer" -q | wc -l)
        echo ""
        echo -e "${CYAN}Deployed Chaincodes: $chaincode_count${NC}"
        if [ "$chaincode_count" -gt 0 ]; then
            docker ps --filter "name=dev-peer" --format "  ✓ {{.Names}}" | \
                sed 's/dev-peer[0-9].org[0-9].example.com-//' | \
                sed 's/-[0-9a-f]*$//' | sort -u
        fi
        
        echo ""
        return 0
    else
        print_error "Fabric network is NOT running"
        print_info "Start it with option 2 below"
        echo ""
        return 1
    fi
}

# Start network
start_network() {
    print_header "Starting Fabric Network"
    
    cd "$SCRIPT_DIR/fabric-samples/test-network"
    
    print_info "Cleaning up any existing network..."
    ./network.sh down
    
    print_info "Starting network with channel..."
    ./network.sh up createChannel
    
    print_success "Network started successfully!"
    
    cd "$SCRIPT_DIR"
    
    echo ""
    read -p "Press Enter to continue..."
}

# Deploy chaincodes
deploy_chaincodes() {
    print_header "Deploy Chaincodes"
    
    echo "Choose deployment strategy:"
    echo ""
    echo "  1. Sequential Deployment (Recommended for low resources)"
    echo "     - Deploys one chaincode at a time"
    echo "     - Includes resource cleanup between deployments"
    echo "     - Prevents system crashes"
    echo ""
    echo "  2. All at Once (Requires more resources)"
    echo "     - Faster but resource-intensive"
    echo "     - May cause issues on low-memory systems"
    echo ""
    echo "  3. Back to Main Menu"
    echo ""
    
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1)
            print_info "Starting sequential deployment..."
            "$SCRIPT_DIR/deploy-chaincode-sequential.sh"
            ;;
        2)
            print_warning "This may cause system issues on low-resource systems!"
            read -p "Are you sure? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                "$SCRIPT_DIR/deploy-contracts-simple.sh"
            else
                print_info "Cancelled"
            fi
            ;;
        3)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
}

# Run tests
run_tests() {
    print_header "Run Tests"
    
    echo "Choose testing strategy:"
    echo ""
    echo "  1. Sequential Testing (Recommended for low resources)"
    echo "     - Tests one chaincode at a time"
    echo "     - Includes resource management"
    echo "     - Prevents system crashes"
    echo ""
    echo "  2. Phase 1 Tests (Consent, Records, Credentials)"
    echo "     - Tests all Phase 1 APIs at once"
    echo ""
    echo "  3. Phase 2 Tests (Appointments, Prescriptions)"
    echo "     - Tests all Phase 2 APIs at once"
    echo ""
    echo "  4. Back to Main Menu"
    echo ""
    
    read -p "Enter choice [1-4]: " choice
    
    case $choice in
        1)
            print_info "Starting sequential testing..."
            "$SCRIPT_DIR/test-chaincode-sequential.sh"
            ;;
        2)
            print_info "Starting Phase 1 tests..."
            "$SCRIPT_DIR/test-phase1-api.sh"
            ;;
        3)
            print_info "Starting Phase 2 tests..."
            "$SCRIPT_DIR/test-phase2-api.sh"
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
}

# Resource management
manage_resources() {
    print_header "Resource Management"
    
    echo "Choose operation:"
    echo ""
    echo "  1. Monitor Resources (Real-time)"
    echo "     - Live monitoring of CPU, memory, disk"
    echo "     - Docker container tracking"
    echo ""
    echo "  2. Cleanup Resources"
    echo "     - Interactive cleanup menu"
    echo "     - Free up system memory"
    echo ""
    echo "  3. Quick Cleanup"
    echo "     - Fast automated cleanup"
    echo "     - Safe for running network"
    echo ""
    echo "  4. Back to Main Menu"
    echo ""
    
    read -p "Enter choice [1-4]: " choice
    
    case $choice in
        1)
            print_info "Starting resource monitor..."
            echo "Press Ctrl+C to exit the monitor"
            sleep 2
            "$SCRIPT_DIR/monitor-resources.sh"
            ;;
        2)
            "$SCRIPT_DIR/cleanup-resources.sh"
            ;;
        3)
            print_info "Running quick cleanup..."
            
            # Stop RPC server
            pkill -f "node.*rpc-server" 2>/dev/null || true
            lsof -ti:4000 | xargs kill -9 2>/dev/null || true
            
            # Remove chaincode containers
            docker ps -aq --filter "name=dev-peer" | xargs -r docker rm -f 2>/dev/null || true
            
            # Prune system
            docker system prune -f
            
            print_success "Quick cleanup completed!"
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
}

# RPC server management
manage_rpc_server() {
    print_header "RPC Server Management"
    
    # Check if server is running
    if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}Status: RPC Server is RUNNING${NC}"
        echo ""
        echo "  1. Stop Server"
        echo "  2. Restart Server"
        echo "  3. View Logs"
        echo "  4. Back to Main Menu"
        echo ""
        
        read -p "Enter choice [1-4]: " choice
        
        case $choice in
            1)
                print_info "Stopping RPC server..."
                pkill -f "node.*rpc-server" 2>/dev/null || true
                lsof -ti:4000 | xargs kill -9 2>/dev/null || true
                print_success "Server stopped"
                ;;
            2)
                print_info "Restarting RPC server..."
                pkill -f "node.*rpc-server" 2>/dev/null || true
                lsof -ti:4000 | xargs kill -9 2>/dev/null || true
                sleep 2
                cd "$SCRIPT_DIR/my-project/rpc-server"
                rm -rf wallet
                node addToWallet.js
                nohup npm start > rpc-server.log 2>&1 &
                sleep 3
                if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
                    print_success "Server restarted successfully"
                else
                    print_error "Failed to restart server"
                fi
                cd "$SCRIPT_DIR"
                ;;
            3)
                less "$SCRIPT_DIR/my-project/rpc-server/rpc-server.log"
                ;;
            4)
                return
                ;;
        esac
    else
        echo -e "${YELLOW}Status: RPC Server is NOT running${NC}"
        echo ""
        echo "  1. Start Server"
        echo "  2. Back to Main Menu"
        echo ""
        
        read -p "Enter choice [1-2]: " choice
        
        case $choice in
            1)
                print_info "Starting RPC server..."
                cd "$SCRIPT_DIR/my-project/rpc-server"
                rm -rf wallet
                node addToWallet.js
                nohup npm start > rpc-server.log 2>&1 &
                sleep 3
                if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
                    print_success "Server started successfully"
                else
                    print_error "Failed to start server"
                fi
                cd "$SCRIPT_DIR"
                ;;
            2)
                return
                ;;
        esac
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# View documentation
view_docs() {
    print_header "Documentation"
    
    echo "Available Documentation:"
    echo ""
    echo "  1. Implementation Guide"
    echo "  2. Deployment Status"
    echo "  3. API Documentation (Phase 2)"
    echo "  4. Project Status"
    echo "  5. Back to Main Menu"
    echo ""
    
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1) less "$SCRIPT_DIR/IMPLEMENTATION_GUIDE.md" ;;
        2) less "$SCRIPT_DIR/DEPLOYMENT_SUCCESS.md" ;;
        3) less "$SCRIPT_DIR/PHASE2_API_DOCUMENTATION.md" ;;
        4) less "$SCRIPT_DIR/PROJECT_STATUS.md" ;;
        5) return ;;
        *) print_error "Invalid choice" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
}

# Main menu
main_menu() {
    while true; do
        print_banner
        
        # Show quick status
        check_system_resources
        check_network_status
        
        print_header "Main Menu"
        
        echo "  ${CYAN}Network Operations:${NC}"
        echo "    1. Start Fabric Network"
        echo "    2. Deploy Chaincodes"
        echo "    3. Run Tests"
        echo ""
        echo "  ${CYAN}Server Management:${NC}"
        echo "    4. Manage RPC Server"
        echo ""
        echo "  ${CYAN}Resource Management:${NC}"
        echo "    5. Resource Management"
        echo ""
        echo "  ${CYAN}Information:${NC}"
        echo "    6. View Documentation"
        echo "    7. System Status"
        echo ""
        echo "  ${CYAN}Exit:${NC}"
        echo "    8. Exit"
        echo ""
        
        read -p "Enter your choice [1-8]: " choice
        
        case $choice in
            1) start_network ;;
            2) deploy_chaincodes ;;
            3) run_tests ;;
            4) manage_rpc_server ;;
            5) manage_resources ;;
            6) view_docs ;;
            7) 
                check_system_resources
                check_network_status
                read -p "Press Enter to continue..."
                ;;
            8)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid choice"
                sleep 2
                ;;
        esac
    done
}

# Check dependencies
check_dependencies() {
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        missing=1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        missing=1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Please install missing dependencies"
        exit 1
    fi
}

# Run main
check_dependencies
main_menu
