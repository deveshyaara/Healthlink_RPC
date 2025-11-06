#!/bin/bash

# HealthLink Pro - Installation & Setup Script
# Sets up all sequential testing tools
# One-time setup

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}║     HealthLink Pro - Sequential Testing Setup              ║${NC}"
    echo -e "${BLUE}║     Resource-Optimized for Low-Memory Systems              ║${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    echo ""
    
    local missing=0
    
    # Check Docker
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker installed: $docker_version"
    else
        print_error "Docker is NOT installed"
        missing=1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        print_success "Node.js installed: $node_version"
    else
        print_error "Node.js is NOT installed"
        missing=1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        print_success "npm installed: $npm_version"
    else
        print_error "npm is NOT installed"
        missing=1
    fi
    
    # Check jq
    if command -v jq &> /dev/null; then
        print_success "jq installed"
    else
        print_warning "jq is NOT installed (optional, but recommended)"
        print_info "Install with: sudo apt-get install jq"
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_success "curl installed"
    else
        print_error "curl is NOT installed"
        missing=1
    fi
    
    echo ""
    
    if [ $missing -eq 1 ]; then
        print_error "Missing required dependencies!"
        echo ""
        echo "Please install:"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - npm: (usually comes with Node.js)"
        echo "  - curl: sudo apt-get install curl"
        echo ""
        exit 1
    fi
    
    print_success "All required dependencies are installed!"
    echo ""
}

# Check system resources
check_resources() {
    echo -e "${YELLOW}Checking system resources...${NC}"
    echo ""
    
    # Check memory
    if command -v free &> /dev/null; then
        total_mem=$(free -m | awk 'NR==2{print $2}')
        available_mem=$(free -m | awk 'NR==2{print $7}')
        
        echo -e "${CYAN}Memory:${NC}"
        echo -e "  Total: ${total_mem}MB"
        echo -e "  Available: ${available_mem}MB"
        
        if [ "$total_mem" -lt 3000 ]; then
            print_warning "System has less than 3GB RAM"
            print_info "Sequential scripts are ESSENTIAL for your system"
        elif [ "$total_mem" -lt 6000 ]; then
            print_warning "System has less than 6GB RAM"
            print_info "Sequential scripts are RECOMMENDED"
        else
            print_success "System has adequate RAM"
            print_info "Sequential scripts will ensure stability"
        fi
    fi
    
    # Check disk space
    echo ""
    available_disk=$(df -h . | awk 'NR==2{print $4}')
    echo -e "${CYAN}Disk Space:${NC}"
    echo -e "  Available: $available_disk"
    
    disk_gb=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$disk_gb" -lt 10 ]; then
        print_error "Less than 10GB disk space available!"
        print_warning "You may encounter issues"
    else
        print_success "Adequate disk space"
    fi
    
    echo ""
}

# Make scripts executable
make_executable() {
    echo -e "${YELLOW}Making scripts executable...${NC}"
    echo ""
    
    local scripts=(
        "manage-healthlink.sh"
        "deploy-chaincode-sequential.sh"
        "test-chaincode-sequential.sh"
        "monitor-resources.sh"
        "cleanup-resources.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            print_success "$script"
        else
            print_error "$script not found!"
        fi
    done
    
    echo ""
}

# Show summary
show_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    SETUP COMPLETE!                         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}New Scripts Available:${NC}"
    echo ""
    echo -e "${CYAN}1. Master Manager (Recommended)${NC}"
    echo -e "   ${GREEN}./manage-healthlink.sh${NC}"
    echo -e "   Interactive menu for all operations"
    echo ""
    echo -e "${CYAN}2. Sequential Deployment${NC}"
    echo -e "   ${GREEN}./deploy-chaincode-sequential.sh${NC}"
    echo -e "   Deploy chaincodes one at a time (safe)"
    echo ""
    echo -e "${CYAN}3. Sequential Testing${NC}"
    echo -e "   ${GREEN}./test-chaincode-sequential.sh${NC}"
    echo -e "   Test each chaincode separately (stable)"
    echo ""
    echo -e "${CYAN}4. Resource Monitor${NC}"
    echo -e "   ${GREEN}./monitor-resources.sh${NC}"
    echo -e "   Real-time system monitoring"
    echo ""
    echo -e "${CYAN}5. Resource Cleanup${NC}"
    echo -e "   ${GREEN}./cleanup-resources.sh${NC}"
    echo -e "   Free up system resources"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo -e "  • ${GREEN}RESOURCE_OPTIMIZED_GUIDE.md${NC} - Complete guide"
    echo -e "  • ${GREEN}SEQUENTIAL_TESTING_IMPLEMENTATION.md${NC} - Technical details"
    echo -e "  • ${GREEN}QUICK_REFERENCE.md${NC} - Quick reference card"
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo -e "  1. Run: ${GREEN}./manage-healthlink.sh${NC}"
    echo -e "  2. Select: Start Fabric Network"
    echo -e "  3. Select: Deploy Chaincodes → Sequential Deployment"
    echo -e "  4. Select: Manage RPC Server → Start Server"
    echo -e "  5. Select: Run Tests → Sequential Testing"
    echo ""
    echo -e "${GREEN}✓ No more system crashes!${NC}"
    echo -e "${GREEN}✓ Stable operation on low-resource systems!${NC}"
    echo ""
}

# Main setup
main() {
    print_banner
    
    check_prerequisites
    check_resources
    make_executable
    show_summary
    
    echo -e "${CYAN}Ready to start?${NC}"
    echo ""
    read -p "Launch Master Manager now? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${GREEN}Starting Master Manager...${NC}"
        sleep 1
        ./manage-healthlink.sh
    else
        echo ""
        echo -e "${CYAN}Run ${GREEN}./manage-healthlink.sh${CYAN} when ready!${NC}"
        echo ""
    fi
}

# Run setup
main
