#!/bin/bash

# HealthLink Pro - Resource Cleanup Script
# Cleans up Docker resources to free system memory
# Permanent solution for low-resource systems

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
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

# Show current resource usage
show_resources() {
    print_header "Current Resource Usage"
    
    # Docker containers
    container_count=$(docker ps -q | wc -l)
    echo -e "${CYAN}Docker Containers:${NC} $container_count running"
    
    # Docker images
    image_count=$(docker images -q | wc -l)
    echo -e "${CYAN}Docker Images:${NC} $image_count total"
    
    # Docker volumes
    volume_count=$(docker volume ls -q | wc -l)
    echo -e "${CYAN}Docker Volumes:${NC} $volume_count total"
    
    # Memory
    if command -v free &> /dev/null; then
        total_mem=$(free -m | awk 'NR==2{print $2}')
        used_mem=$(free -m | awk 'NR==2{print $3}')
        free_mem=$(free -m | awk 'NR==2{print $4}')
        available_mem=$(free -m | awk 'NR==2{print $7}')
        
        echo -e "${CYAN}Memory:${NC}"
        echo -e "  Total: ${total_mem}MB"
        echo -e "  Used: ${used_mem}MB"
        echo -e "  Free: ${free_mem}MB"
        echo -e "  Available: ${available_mem}MB"
    fi
    
    # Disk
    disk_usage=$(df -h . | awk 'NR==2{print $5}')
    disk_available=$(df -h . | awk 'NR==2{print $4}')
    echo -e "${CYAN}Disk:${NC}"
    echo -e "  Used: $disk_usage"
    echo -e "  Available: $disk_available"
    
    echo ""
}

# Stop RPC server
stop_rpc_server() {
    print_info "Stopping RPC server..."
    
    # Kill node processes on port 4000
    if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:4000 | xargs kill -9 2>/dev/null || true
        print_success "RPC server stopped"
    else
        print_info "RPC server not running"
    fi
    
    # Kill any rpc-server node processes
    pkill -f "node.*rpc-server" 2>/dev/null || true
}

# Remove chaincode containers only
cleanup_chaincode_containers() {
    print_header "Cleaning Up Chaincode Containers"
    
    chaincode_containers=$(docker ps -aq --filter "name=dev-peer")
    
    if [ -n "$chaincode_containers" ]; then
        echo "Removing chaincode containers..."
        echo "$chaincode_containers" | xargs docker rm -f 2>/dev/null || true
        print_success "Chaincode containers removed"
    else
        print_info "No chaincode containers to remove"
    fi
}

# Remove all stopped containers
cleanup_stopped_containers() {
    print_header "Cleaning Up Stopped Containers"
    
    stopped=$(docker ps -aq -f status=exited)
    
    if [ -n "$stopped" ]; then
        echo "Removing stopped containers..."
        echo "$stopped" | xargs docker rm 2>/dev/null || true
        print_success "Stopped containers removed"
    else
        print_info "No stopped containers"
    fi
}

# Remove unused images
cleanup_unused_images() {
    print_header "Cleaning Up Unused Images"
    
    dangling=$(docker images -f "dangling=true" -q)
    
    if [ -n "$dangling" ]; then
        echo "Removing dangling images..."
        echo "$dangling" | xargs docker rmi -f 2>/dev/null || true
        print_success "Dangling images removed"
    else
        print_info "No dangling images"
    fi
}

# Prune Docker system
prune_docker_system() {
    print_header "Pruning Docker System"
    
    print_info "Removing unused data..."
    docker system prune -f
    print_success "Docker system pruned"
}

# Prune Docker volumes
prune_docker_volumes() {
    print_header "Pruning Docker Volumes"
    
    print_warning "This will remove all unused volumes!"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        print_success "Docker volumes pruned"
    else
        print_info "Skipped volume pruning"
    fi
}

# Full network cleanup (restart)
full_network_cleanup() {
    print_header "Full Network Cleanup (Restart)"
    
    print_warning "This will stop and restart the entire Fabric network!"
    print_warning "All chaincode containers will be removed!"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled"
        return
    fi
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    TEST_NETWORK_DIR="${SCRIPT_DIR}/fabric-samples/test-network"
    
    cd "$TEST_NETWORK_DIR"
    
    print_info "Stopping network..."
    ./network.sh down
    
    print_info "Cleaning up..."
    docker system prune -f
    
    print_info "Starting network..."
    ./network.sh up createChannel
    
    print_success "Network restarted and cleaned"
    
    cd "$SCRIPT_DIR"
}

# Quick cleanup (safe)
quick_cleanup() {
    print_header "Quick Cleanup (Safe)"
    
    stop_rpc_server
    cleanup_chaincode_containers
    cleanup_stopped_containers
    prune_docker_system
    
    print_success "Quick cleanup completed"
}

# Deep cleanup (aggressive)
deep_cleanup() {
    print_header "Deep Cleanup (Aggressive)"
    
    print_warning "This will remove chaincode containers and unused images!"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled"
        return
    fi
    
    stop_rpc_server
    cleanup_chaincode_containers
    cleanup_stopped_containers
    cleanup_unused_images
    prune_docker_system
    
    print_success "Deep cleanup completed"
}

# Show menu
show_menu() {
    print_header "HealthLink Pro - Resource Cleanup"
    
    echo "Select cleanup option:"
    echo ""
    echo "  1. Quick Cleanup (Safe)"
    echo "     - Stop RPC server"
    echo "     - Remove chaincode containers"
    echo "     - Remove stopped containers"
    echo "     - Prune Docker system"
    echo ""
    echo "  2. Deep Cleanup (Aggressive)"
    echo "     - Everything in Quick Cleanup"
    echo "     - Remove unused images"
    echo ""
    echo "  3. Full Network Cleanup (Restart)"
    echo "     - Stop entire Fabric network"
    echo "     - Clean all Docker resources"
    echo "     - Restart network"
    echo ""
    echo "  4. Custom Cleanup"
    echo "     - Choose specific cleanup tasks"
    echo ""
    echo "  5. Show Resources"
    echo "     - Display current resource usage"
    echo ""
    echo "  6. Exit"
    echo ""
}

# Custom cleanup menu
custom_cleanup_menu() {
    while true; do
        print_header "Custom Cleanup"
        
        echo "Select tasks to perform:"
        echo ""
        echo "  1. Stop RPC Server"
        echo "  2. Remove Chaincode Containers"
        echo "  3. Remove Stopped Containers"
        echo "  4. Remove Unused Images"
        echo "  5. Prune Docker System"
        echo "  6. Prune Docker Volumes"
        echo "  7. Back to Main Menu"
        echo ""
        
        read -p "Enter choice [1-7]: " choice
        
        case $choice in
            1) stop_rpc_server ;;
            2) cleanup_chaincode_containers ;;
            3) cleanup_stopped_containers ;;
            4) cleanup_unused_images ;;
            5) prune_docker_system ;;
            6) prune_docker_volumes ;;
            7) break ;;
            *) print_error "Invalid option" ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Main menu loop
main() {
    while true; do
        show_menu
        show_resources
        
        read -p "Enter choice [1-6]: " choice
        
        case $choice in
            1)
                quick_cleanup
                ;;
            2)
                deep_cleanup
                ;;
            3)
                full_network_cleanup
                ;;
            4)
                custom_cleanup_menu
                ;;
            5)
                show_resources
                ;;
            6)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main
main
