#!/bin/bash

################################################################################
# HealthLink Pro - SSL Certificate Setup Script
# Purpose: Automate Let's Encrypt SSL certificate installation
# Compatible: Ubuntu 22.04 LTS, Certbot, Nginx
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
WEBROOT="${WEBROOT:-/var/www/html}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HealthLink Pro - SSL Certificate Setup                  ║${NC}"
echo -e "${BLUE}║  Let's Encrypt (Free, Auto-Renewing)                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

# Step 1: Validate input
echo -e "${YELLOW}[1/7] Validating configuration...${NC}"

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}ERROR: DOMAIN not set!${NC}"
    echo -e "Usage: DOMAIN=your-domain.com EMAIL=admin@example.com ./setup-ssl.sh"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${YELLOW}WARNING: EMAIL not set. Using default.${NC}"
    EMAIL="admin@$DOMAIN"
fi

echo -e "${GREEN}✓ Domain: $DOMAIN${NC}"
echo -e "${GREEN}✓ Email: $EMAIL${NC}"

# Step 2: Check DNS resolution
echo -e "\n${YELLOW}[2/7] Checking DNS resolution...${NC}"

if ! host $DOMAIN > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Domain $DOMAIN does not resolve to an IP address!${NC}"
    echo -e "${YELLOW}Please configure your domain's A record to point to this server's IP.${NC}"
    SERVER_IP=$(curl -s ifconfig.me)
    echo -e "${YELLOW}This server's IP: $SERVER_IP${NC}"
    exit 1
fi

RESOLVED_IP=$(host $DOMAIN | grep "has address" | awk '{print $4}')
SERVER_IP=$(curl -s ifconfig.me)

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}WARNING: Domain resolves to $RESOLVED_IP but this server is $SERVER_IP${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ DNS correctly configured ($RESOLVED_IP)${NC}"
fi

# Step 3: Install Certbot
echo -e "\n${YELLOW}[3/7] Installing Certbot...${NC}"

if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✓ Certbot already installed ($(certbot --version))${NC}"
else
    sudo apt-get update -qq
    sudo apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
fi

# Step 4: Verify Nginx is running
echo -e "\n${YELLOW}[4/7] Checking Nginx status...${NC}"

if ! systemctl is-active --quiet nginx; then
    echo -e "${RED}ERROR: Nginx is not running!${NC}"
    echo -e "Starting Nginx..."
    sudo systemctl start nginx
fi

if ! sudo nginx -t > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Nginx configuration has errors!${NC}"
    sudo nginx -t
    exit 1
fi

echo -e "${GREEN}✓ Nginx is running and configured correctly${NC}"

# Step 5: Check port 80 accessibility
echo -e "\n${YELLOW}[5/7] Verifying port 80 is accessible...${NC}"

if ! sudo netstat -tlnp | grep -q ":80"; then
    echo -e "${RED}ERROR: Port 80 is not listening!${NC}"
    exit 1
fi

# Test HTTP accessibility
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/api/health || echo "000")
if [ "$HTTP_STATUS" != "000" ]; then
    echo -e "${GREEN}✓ Port 80 is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}WARNING: Could not reach http://$DOMAIN${NC}"
    echo -e "Certbot may still work if DNS is correct."
fi

# Step 6: Obtain SSL certificate
echo -e "\n${YELLOW}[6/7] Obtaining SSL certificate...${NC}"

# Check if certificate already exists
if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo -e "${YELLOW}Certificate already exists for $DOMAIN${NC}"
    read -p "Renew existing certificate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo certbot renew --force-renewal --nginx \
            --domain $DOMAIN \
            --non-interactive \
            --agree-tos \
            --email $EMAIL \
            --redirect
    else
        echo -e "${GREEN}✓ Using existing certificate${NC}"
    fi
else
    # Obtain new certificate
    sudo certbot --nginx \
        --domain $DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --redirect

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
    else
        echo -e "${RED}ERROR: Failed to obtain SSL certificate${NC}"
        exit 1
    fi
fi

# Step 7: Configure auto-renewal
echo -e "\n${YELLOW}[7/7] Configuring auto-renewal...${NC}"

# Test renewal process
if sudo certbot renew --dry-run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Auto-renewal configured and tested${NC}"
else
    echo -e "${YELLOW}WARNING: Auto-renewal test failed${NC}"
fi

# Check certbot timer
if systemctl is-active --quiet certbot.timer; then
    echo -e "${GREEN}✓ Certbot timer is active (auto-renewal enabled)${NC}"
else
    echo -e "${YELLOW}Enabling certbot timer...${NC}"
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer
fi

# Reload Nginx
echo -e "\n${YELLOW}Reloading Nginx...${NC}"
sudo systemctl reload nginx

# Final summary
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                SSL Setup Complete!                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Certificate Information:${NC}"
sudo certbot certificates | grep -A 5 "$DOMAIN"

echo -e "\n${GREEN}Your site is now accessible via:${NC}"
echo -e "  ✓ HTTPS: ${BLUE}https://$DOMAIN${NC}"
echo -e "  ✓ HTTP (redirects to HTTPS): ${BLUE}http://$DOMAIN${NC}"

echo -e "\n${GREEN}Auto-Renewal:${NC}"
echo -e "  ✓ Certificates will auto-renew before expiration"
echo -e "  ✓ Check status: ${BLUE}sudo systemctl status certbot.timer${NC}"
echo -e "  ✓ Manual renewal: ${BLUE}sudo certbot renew${NC}"

echo -e "\n${YELLOW}Security Recommendations:${NC}"
echo -e "  1. Test your SSL configuration: https://www.ssllabs.com/ssltest/"
echo -e "  2. Monitor certificate expiration (90 days)"
echo -e "  3. Set up monitoring alerts for renewal failures"

echo -e "\n${GREEN}Setup complete! Your application is now secured with HTTPS.${NC}"
