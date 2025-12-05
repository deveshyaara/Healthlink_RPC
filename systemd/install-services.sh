#!/bin/bash

################################################################################
# HealthLink Pro - Systemd Services Installer
# Purpose: Install and configure systemd services for auto-restart
################################################################################

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Installing HealthLink Pro Systemd Services              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}This script requires sudo privileges.${NC}"
    echo "Restarting with sudo..."
    sudo "$0" "$@"
    exit
fi

# Step 1: Copy service files
echo -e "${YELLOW}[1/5] Copying service files...${NC}"

cp systemd/healthlink-fabric.service /etc/systemd/system/
cp systemd/healthlink-middleware.service /etc/systemd/system/
cp systemd/healthlink-frontend.service /etc/systemd/system/

echo -e "${GREEN}✓ Service files copied${NC}"

# Step 2: Reload systemd
echo -e "\n${YELLOW}[2/5] Reloading systemd daemon...${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓ Systemd reloaded${NC}"

# Step 3: Enable services (start on boot)
echo -e "\n${YELLOW}[3/5] Enabling services...${NC}"
systemctl enable healthlink-fabric.service
systemctl enable healthlink-middleware.service
systemctl enable healthlink-frontend.service
echo -e "${GREEN}✓ Services enabled${NC}"

# Step 4: Start services
echo -e "\n${YELLOW}[4/5] Starting services...${NC}"

echo "Starting Fabric network..."
systemctl start healthlink-fabric.service
sleep 5

echo "Starting Middleware API..."
systemctl start healthlink-middleware.service
sleep 3

echo "Starting Frontend..."
systemctl start healthlink-frontend.service
sleep 2

echo -e "${GREEN}✓ All services started${NC}"

# Step 5: Verify status
echo -e "\n${YELLOW}[5/5] Checking service status...${NC}"

systemctl status healthlink-fabric.service --no-pager
echo
systemctl status healthlink-middleware.service --no-pager
echo
systemctl status healthlink-frontend.service --no-pager

echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Systemd Services Installed!                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Available Commands:${NC}"
echo -e "  Start all:    ${BLUE}sudo systemctl start healthlink-*${NC}"
echo -e "  Stop all:     ${BLUE}sudo systemctl stop healthlink-*${NC}"
echo -e "  Restart all:  ${BLUE}sudo systemctl restart healthlink-*${NC}"
echo -e "  Status:       ${BLUE}sudo systemctl status healthlink-*${NC}"
echo -e "  Logs:         ${BLUE}sudo journalctl -u healthlink-middleware -f${NC}"

echo -e "\n${GREEN}Services will now start automatically on boot!${NC}"
