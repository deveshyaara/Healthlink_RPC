#!/bin/bash

################################################################################
# HealthLink Pro - VPS Production Setup Script
# Target: Ubuntu 22.04 LTS (AWS t3.small, DigitalOcean Droplet, Azure B1s)
# Purpose: Provision a fresh VPS for low-spec production deployment
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables (USER MUST SET THESE)
GIT_REPO_URL="${GIT_REPO_URL:-}"  # e.g., https://github.com/yourusername/Healthlink_RPC.git
DOMAIN_NAME="${DOMAIN_NAME:-}"     # e.g., healthlink.example.com
ADMIN_EMAIL="${ADMIN_EMAIL:-}"     # For SSL certificate notifications

clear
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HealthLink Pro - VPS Production Setup                   ║${NC}"
echo -e "${BLUE}║  Ubuntu 22.04 LTS - Low-Spec Optimized                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

# Step 0: Validate input
echo -e "${YELLOW}[0/10] Validating configuration...${NC}"

if [ -z "$GIT_REPO_URL" ]; then
    echo -e "${RED}ERROR: GIT_REPO_URL not set!${NC}"
    echo -e "Usage: GIT_REPO_URL=https://github.com/user/repo.git ./setup-vps.sh"
    exit 1
fi

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${YELLOW}WARNING: DOMAIN_NAME not set. SSL will be skipped.${NC}"
    echo -e "To enable SSL: DOMAIN_NAME=yourdomain.com ./setup-vps.sh"
fi

echo -e "${GREEN}✓ Git Repository: $GIT_REPO_URL${NC}"
echo -e "${GREEN}✓ Domain Name: ${DOMAIN_NAME:-'Not configured (localhost only)'}${NC}"
echo -e "${GREEN}✓ Admin Email: ${ADMIN_EMAIL:-'Not set'}${NC}"

# Step 1: System update
echo -e "\n${YELLOW}[1/10] Updating system packages...${NC}"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
echo -e "${GREEN}✓ System updated${NC}"

# Step 2: Install Docker
echo -e "\n${YELLOW}[2/10] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker already installed ($(docker --version))${NC}"
else
    # Install Docker using official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✓ Docker installed${NC}"
    echo -e "${YELLOW}NOTE: You may need to log out and back in for docker group to take effect${NC}"
fi

# Step 3: Install Docker Compose
echo -e "\n${YELLOW}[3/10] Installing Docker Compose...${NC}"

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose already installed ($(docker-compose --version))${NC}"
else
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
fi

# Step 4: Install Node.js 18 LTS
echo -e "\n${YELLOW}[4/10] Installing Node.js 18 LTS...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✓ Node.js already installed ($(node --version))${NC}"
    else
        echo -e "${YELLOW}Upgrading Node.js to v18...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js 18 installed${NC}"
fi

# Verify npm
if ! command -v npm &> /dev/null; then
    sudo apt-get install -y npm
fi

echo -e "${GREEN}✓ Node: $(node --version), npm: $(npm --version)${NC}"

# Step 5: Install Nginx
echo -e "\n${YELLOW}[5/10] Installing Nginx...${NC}"

if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✓ Nginx already installed ($(nginx -v 2>&1))${NC}"
else
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo -e "${GREEN}✓ Nginx installed and started${NC}"
fi

# Step 6: Configure Firewall (UFW)
echo -e "\n${YELLOW}[6/10] Configuring firewall (UFW)...${NC}"

if ! command -v ufw &> /dev/null; then
    sudo apt-get install -y ufw
fi

# Reset UFW to default deny
sudo ufw --force reset

# Allow essential services
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (CRITICAL - Don't lock yourself out!)
sudo ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS (Public web access)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# DENY direct access to application ports (security)
sudo ufw deny 3000/tcp comment 'Block direct middleware access'
sudo ufw deny 9002/tcp comment 'Block direct Next.js access'
sudo ufw deny 4001/tcp comment 'Block direct WebSocket access'
sudo ufw deny 7051/tcp comment 'Block Fabric peer port'
sudo ufw deny 7054/tcp comment 'Block Fabric CA port'
sudo ufw deny 7050/tcp comment 'Block Fabric orderer port'

# Enable firewall
echo "y" | sudo ufw enable

# Show status
echo -e "${GREEN}✓ Firewall configured${NC}"
sudo ufw status numbered

# Step 7: Clone repository
echo -e "\n${YELLOW}[7/10] Cloning repository...${NC}"

# Create application directory
APP_DIR="/opt/healthlink"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}Repository already exists. Pulling latest changes...${NC}"
    cd $APP_DIR
    git pull
else
    git clone $GIT_REPO_URL $APP_DIR
    cd $APP_DIR
fi

echo -e "${GREEN}✓ Repository cloned to $APP_DIR${NC}"

# Step 8: Install application dependencies
echo -e "\n${YELLOW}[8/10] Installing application dependencies...${NC}"

# Install middleware dependencies
if [ -d "$APP_DIR/middleware-api" ]; then
    cd $APP_DIR/middleware-api
    npm ci --omit=dev
    echo -e "${GREEN}✓ Middleware dependencies installed${NC}"
fi

# Install frontend dependencies
if [ -d "$APP_DIR/frontend" ]; then
    cd $APP_DIR/frontend
    npm ci --omit=dev
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
fi

cd $APP_DIR

# Step 9: Configure Nginx reverse proxy
echo -e "\n${YELLOW}[9/10] Configuring Nginx reverse proxy...${NC}"

# Create Nginx configuration
NGINX_CONF="/etc/nginx/sites-available/healthlink"

sudo tee $NGINX_CONF > /dev/null <<'EOF'
# HealthLink Pro - Nginx Reverse Proxy Configuration
# Generated by setup-vps.sh

# Rate limiting zones (DDoS protection)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Upstream definitions
upstream frontend {
    server localhost:9002;
    keepalive 32;
}

upstream middleware {
    server localhost:3000;
    keepalive 32;
}

upstream websocket {
    server localhost:4001;
    keepalive 32;
}

server {
    listen 80;
    server_name DOMAIN_NAME_PLACEHOLDER;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Max body size (for file uploads)
    client_max_body_size 10M;

    # Connection limits
    limit_conn conn_limit 10;

    # Access logs
    access_log /var/log/nginx/healthlink_access.log;
    error_log /var/log/nginx/healthlink_error.log;

    # Frontend (Next.js) - Root path
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Keepalive
        proxy_set_header Connection "";
    }

    # Middleware API
    location /api/ {
        # Rate limiting (10 requests/second)
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://middleware;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts (longer for blockchain operations)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        # Keepalive
        proxy_set_header Connection "";
    }

    # Auth endpoints (stricter rate limiting)
    location ~ ^/api/(login|register|auth) {
        # Rate limiting (5 requests/second)
        limit_req zone=auth_limit burst=10 nodelay;
        
        proxy_pass http://middleware;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts (long-lived connections)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Static assets (aggressive caching)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        
        # Cache for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # No access logs for static assets
        access_log off;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://middleware;
        access_log off;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Replace domain placeholder
if [ -n "$DOMAIN_NAME" ]; then
    sudo sed -i "s/DOMAIN_NAME_PLACEHOLDER/$DOMAIN_NAME/g" $NGINX_CONF
else
    # Use server IP or localhost
    SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
    sudo sed -i "s/DOMAIN_NAME_PLACEHOLDER/$SERVER_IP _;/g" $NGINX_CONF
fi

# Enable site
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/healthlink

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"
else
    echo -e "${RED}ERROR: Nginx configuration test failed${NC}"
    exit 1
fi

# Step 10: Install SSL (if domain is configured)
if [ -n "$DOMAIN_NAME" ] && [ -n "$ADMIN_EMAIL" ]; then
    echo -e "\n${YELLOW}[10/10] Installing SSL certificate...${NC}"
    
    if ! command -v certbot &> /dev/null; then
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Obtain certificate
    sudo certbot --nginx \
        --non-interactive \
        --agree-tos \
        --email $ADMIN_EMAIL \
        --domain $DOMAIN_NAME \
        --redirect
    
    echo -e "${GREEN}✓ SSL certificate installed${NC}"
else
    echo -e "\n${YELLOW}[10/10] Skipping SSL (no domain configured)${NC}"
fi

# Final summary
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 VPS Setup Complete!                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Installed Components:${NC}"
echo -e "  ✓ Docker: $(docker --version)"
echo -e "  ✓ Docker Compose: $(docker-compose --version)"
echo -e "  ✓ Node.js: $(node --version)"
echo -e "  ✓ Nginx: $(nginx -v 2>&1)"
echo -e "  ✓ UFW: $(sudo ufw status | head -1)"

echo -e "\n${GREEN}Application:${NC}"
echo -e "  ✓ Repository: $GIT_REPO_URL"
echo -e "  ✓ Location: $APP_DIR"
echo -e "  ✓ Domain: ${DOMAIN_NAME:-'Not configured'}"

echo -e "\n${GREEN}Firewall Rules:${NC}"
echo -e "  ✓ SSH (22): ${GREEN}ALLOWED${NC}"
echo -e "  ✓ HTTP (80): ${GREEN}ALLOWED${NC}"
echo -e "  ✓ HTTPS (443): ${GREEN}ALLOWED${NC}"
echo -e "  ✓ Application ports (3000, 9002, 7051, etc.): ${RED}BLOCKED${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Transfer your .env.low-spec file to the server (see PRODUCTION_DEPLOYMENT_GUIDE.md)"
echo -e "  2. Run: cd $APP_DIR && ./deploy-low-spec.sh"
echo -e "  3. Access your app at: http://${DOMAIN_NAME:-$SERVER_IP}"

if [ -n "$DOMAIN_NAME" ]; then
    echo -e "\n${GREEN}SSL Certificate:${NC}"
    echo -e "  ✓ Your site is now accessible via HTTPS"
    echo -e "  ✓ Certificate auto-renewal configured (via certbot)"
fi

echo -e "\n${YELLOW}Security Reminder:${NC}"
echo -e "  - Application ports are blocked from external access"
echo -e "  - All traffic must go through Nginx reverse proxy"
echo -e "  - Change default SSH port (optional): sudo nano /etc/ssh/sshd_config"

echo -e "\n${BLUE}Setup complete! Your server is ready for deployment.${NC}"
