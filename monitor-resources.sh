#!/bin/bash

# HealthLink Pro - System Resource Monitor
# Monitors system resources during chaincode operations
# Helps identify resource bottlenecks

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
INTERVAL=2  # Update interval in seconds
LOG_FILE="resource-monitor.log"

print_header() {
    clear
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  HealthLink Pro - System Resource Monitor${NC}"
    echo -e "${BLUE}  Monitoring interval: ${INTERVAL}s | Press Ctrl+C to exit${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

get_memory_info() {
    if command -v free &> /dev/null; then
        # Get memory stats in MB
        total=$(free -m | awk 'NR==2{print $2}')
        used=$(free -m | awk 'NR==2{print $3}')
        free=$(free -m | awk 'NR==2{print $4}')
        available=$(free -m | awk 'NR==2{print $7}')
        
        # Calculate percentage
        used_percent=$(awk "BEGIN {printf \"%.1f\", ($used/$total)*100}")
        
        echo -e "${CYAN}Memory Usage:${NC}"
        echo -e "  Total:     ${total}MB"
        echo -e "  Used:      ${used}MB (${used_percent}%)"
        echo -e "  Free:      ${free}MB"
        echo -e "  Available: ${available}MB"
        
        # Warning thresholds
        if (( $(echo "$used_percent > 90" | bc -l) )); then
            echo -e "  ${RED}⚠ CRITICAL: Memory usage very high!${NC}"
        elif (( $(echo "$used_percent > 75" | bc -l) )); then
            echo -e "  ${YELLOW}⚠ WARNING: High memory usage${NC}"
        else
            echo -e "  ${GREEN}✓ Memory OK${NC}"
        fi
        
        echo ""
    fi
}

get_cpu_info() {
    if command -v top &> /dev/null; then
        # Get CPU usage
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
        
        echo -e "${CYAN}CPU Usage:${NC}"
        echo -e "  Current: ${cpu_usage}%"
        
        if (( $(echo "$cpu_usage > 90" | bc -l) )); then
            echo -e "  ${RED}⚠ CRITICAL: CPU usage very high!${NC}"
        elif (( $(echo "$cpu_usage > 75" | bc -l) )); then
            echo -e "  ${YELLOW}⚠ WARNING: High CPU usage${NC}"
        else
            echo -e "  ${GREEN}✓ CPU OK${NC}"
        fi
        
        echo ""
    fi
}

get_docker_info() {
    echo -e "${CYAN}Docker Containers:${NC}"
    
    # Count containers
    total=$(docker ps -q | wc -l)
    echo -e "  Running: $total containers"
    
    # Fabric network containers
    fabric_count=$(docker ps --filter "name=peer" --filter "name=orderer" -q | wc -l)
    echo -e "  Fabric Network: $fabric_count containers"
    
    # Chaincode containers
    chaincode_count=$(docker ps --filter "name=dev-peer" -q | wc -l)
    echo -e "  Chaincodes: $chaincode_count containers"
    
    echo ""
    
    # List active chaincodes
    if [ $chaincode_count -gt 0 ]; then
        echo -e "${CYAN}Active Chaincodes:${NC}"
        docker ps --filter "name=dev-peer" --format "  ✓ {{.Names}}" | \
            sed 's/dev-peer[0-9].org[0-9].example.com-//' | \
            sed 's/-[0-9a-f]*$//'
        echo ""
    fi
}

get_disk_info() {
    echo -e "${CYAN}Disk Usage:${NC}"
    
    # Get disk usage for current directory
    usage=$(df -h . | awk 'NR==2{print $5}' | sed 's/%//')
    available=$(df -h . | awk 'NR==2{print $4}')
    
    echo -e "  Available: $available"
    echo -e "  Used: ${usage}%"
    
    if [ "$usage" -gt 90 ]; then
        echo -e "  ${RED}⚠ CRITICAL: Disk almost full!${NC}"
    elif [ "$usage" -gt 80 ]; then
        echo -e "  ${YELLOW}⚠ WARNING: Low disk space${NC}"
    else
        echo -e "  ${GREEN}✓ Disk OK${NC}"
    fi
    
    echo ""
}

get_network_info() {
    echo -e "${CYAN}Network Status:${NC}"
    
    # Check if RPC server is running
    if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓ RPC Server: Running on port 4000${NC}"
    else
        echo -e "  ${YELLOW}⚠ RPC Server: Not running${NC}"
    fi
    
    # Check if peers are accessible
    if docker ps | grep -q "peer0.org1.example.com"; then
        echo -e "  ${GREEN}✓ Peer0.Org1: Running${NC}"
    else
        echo -e "  ${RED}✗ Peer0.Org1: Not running${NC}"
    fi
    
    if docker ps | grep -q "peer0.org2.example.com"; then
        echo -e "  ${GREEN}✓ Peer0.Org2: Running${NC}"
    else
        echo -e "  ${RED}✗ Peer0.Org2: Not running${NC}"
    fi
    
    echo ""
}

get_process_info() {
    echo -e "${CYAN}Top Processes (by memory):${NC}"
    
    # Show top 5 memory-consuming processes
    ps aux --sort=-%mem | head -6 | tail -5 | awk '{printf "  %s (PID %s): %.1f%% MEM, %.1f%% CPU\n", $11, $2, $4, $3}'
    
    echo ""
}

log_stats() {
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if command -v free &> /dev/null; then
        mem_used=$(free -m | awk 'NR==2{print $3}')
        mem_total=$(free -m | awk 'NR==2{print $2}')
        mem_percent=$(awk "BEGIN {printf \"%.1f\", ($mem_used/$mem_total)*100}")
    else
        mem_percent="N/A"
    fi
    
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    docker_count=$(docker ps -q | wc -l)
    
    echo "$timestamp,CPU:${cpu_usage}%,MEM:${mem_percent}%,Containers:$docker_count" >> "$LOG_FILE"
}

monitor_loop() {
    # Initialize log
    echo "Timestamp,CPU,Memory,Docker Containers" > "$LOG_FILE"
    
    while true; do
        print_header
        
        get_memory_info
        get_cpu_info
        get_docker_info
        get_disk_info
        get_network_info
        get_process_info
        
        # Recommendations
        echo -e "${CYAN}Recommendations:${NC}"
        
        mem_used_percent=$(free -m | awk 'NR==2{print $3}' | awk -v total=$(free -m | awk 'NR==2{print $2}') '{printf "%.0f\n", ($1/total)*100}')
        
        if [ "$mem_used_percent" -gt 75 ]; then
            echo -e "  ${YELLOW}• Consider closing unused applications${NC}"
            echo -e "  ${YELLOW}• Use sequential deployment/testing scripts${NC}"
            echo -e "  ${YELLOW}• Stop and remove unused Docker containers${NC}"
        else
            echo -e "  ${GREEN}• System resources are adequate${NC}"
            echo -e "  ${GREEN}• Safe to proceed with operations${NC}"
        fi
        
        echo ""
        echo -e "${CYAN}Logging to: $LOG_FILE${NC}"
        
        log_stats
        sleep $INTERVAL
    done
}

# Show usage
show_usage() {
    echo "HealthLink Pro - System Resource Monitor"
    echo ""
    echo "Usage: $0 [interval]"
    echo ""
    echo "  interval  Update interval in seconds (default: 2)"
    echo ""
    echo "Examples:"
    echo "  $0        # Monitor with 2-second interval"
    echo "  $0 5      # Monitor with 5-second interval"
    echo ""
    echo "Features:"
    echo "  • Real-time memory, CPU, and disk monitoring"
    echo "  • Docker container tracking"
    echo "  • Chaincode deployment status"
    echo "  • Resource usage logging"
    echo "  • Performance recommendations"
    echo ""
}

# Main
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

if [ -n "$1" ]; then
    INTERVAL=$1
fi

echo -e "${GREEN}Starting system resource monitor...${NC}"
echo -e "Monitoring interval: ${INTERVAL}s"
echo -e "Log file: $LOG_FILE"
echo ""
sleep 2

monitor_loop
