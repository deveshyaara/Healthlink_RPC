# Production Deployment Guide for HealthLink Pro

## 🎯 Overview

This guide walks you through deploying your **low-spec optimized** HealthLink Pro application from localhost to a production VPS (AWS, DigitalOcean, or Azure).

**Target**: Ubuntu 22.04 LTS VPS with 2GB RAM, 1-2 vCPUs

---

## 📋 Prerequisites

### Local Machine
- ✅ Application tested and working via `./deploy-low-spec.sh`
- ✅ `.env.low-spec` file with production secrets
- ✅ Git repository (GitHub, GitLab, Bitbucket)
- ✅ SSH key pair for VPS access

### Remote Server
- ✅ Fresh Ubuntu 22.04 LTS instance
- ✅ Public IP address
- ✅ Domain name pointed to server IP (optional but recommended)
- ✅ Root or sudo access

---

## 🚀 Deployment Process

### Phase 1: Server Provisioning (15 minutes)

#### Step 1.1: Connect to Your VPS

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Or if using key-based auth
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP
```

#### Step 1.2: Create Non-Root User (Security Best Practice)

```bash
# Create deployment user
sudo adduser healthlink
sudo usermod -aG sudo healthlink

# Switch to new user
su - healthlink
```

#### Step 1.3: Download Setup Script

```bash
# Download setup script
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_USERNAME/Healthlink_RPC/main/setup-vps.sh

# Or if you have the repository locally, SCP it
# On your local machine:
scp setup-vps.sh healthlink@YOUR_SERVER_IP:/home/healthlink/
```

#### Step 1.4: Run VPS Setup Script

```bash
# Make script executable
chmod +x setup-vps.sh

# Run with environment variables
GIT_REPO_URL="https://github.com/YOUR_USERNAME/Healthlink_RPC.git" \
DOMAIN_NAME="healthlink.yourdomain.com" \
ADMIN_EMAIL="admin@yourdomain.com" \
./setup-vps.sh
```

**What This Does**:
- ✅ Installs Docker, Docker Compose, Node.js 18, Nginx
- ✅ Configures UFW firewall (allows 22, 80, 443 | blocks 3000, 7051, etc.)
- ✅ Clones your repository to `/opt/healthlink`
- ✅ Configures Nginx reverse proxy
- ✅ Installs SSL certificate (if domain provided)

**Expected Output**:
```
╔═══════════════════════════════════════════════════════════╗
║                 VPS Setup Complete!                       ║
╚═══════════════════════════════════════════════════════════╝

Installed Components:
  ✓ Docker: Docker version 24.x
  ✓ Docker Compose: docker-compose version 2.x
  ✓ Node.js: v18.x.x
  ✓ Nginx: nginx/1.18.0
```

---

### Phase 2: Secure Environment Transfer (5 minutes)

#### Step 2.1: Transfer `.env.low-spec` File Securely

**Option A: SCP (Recommended)**

```bash
# On your local machine
scp .env.low-spec healthlink@YOUR_SERVER_IP:/opt/healthlink/.env

# Verify transfer
ssh healthlink@YOUR_SERVER_IP "ls -lah /opt/healthlink/.env"
```

**Option B: Manual Copy-Paste (Less Secure)**

```bash
# On remote server
nano /opt/healthlink/.env

# Paste contents from your local .env.low-spec
# Press Ctrl+X, then Y, then Enter to save
```

#### Step 2.2: Verify Environment Variables

```bash
# On remote server
cd /opt/healthlink
cat .env

# Check for sensitive values (DO NOT commit these!)
grep -E "JWT_SECRET|DATABASE|PASSWORD" .env
```

**Critical Variables to Update**:

```bash
# Production JWT secret (generate a strong one)
JWT_SECRET=your-random-256-bit-secret-here

# Production API URL
API_URL=https://healthlink.yourdomain.com

# Fabric network endpoints (should be localhost on VPS)
FABRIC_PEER_URL=grpcs://localhost:7051
FABRIC_ORDERER_URL=grpcs://localhost:7050

# Node environment
NODE_ENV=production

# Disable telemetry
NEXT_TELEMETRY_DISABLED=1
```

#### Step 2.3: Generate Strong JWT Secret

```bash
# Generate a secure 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env with this value
nano /opt/healthlink/.env
```

---

### Phase 3: Application Deployment (10 minutes)

#### Step 3.1: Pull Latest Code (if needed)

```bash
cd /opt/healthlink
git pull origin main
```

#### Step 3.2: Run Low-Spec Deployment Script

**Option A: Foreground (for testing)**

```bash
./deploy-low-spec.sh
```

**Option B: Background (production mode)**

```bash
# Run in detached mode using nohup
nohup ./deploy-low-spec.sh > deployment.log 2>&1 &

# Monitor logs
tail -f deployment.log
```

**Option C: Using screen (recommended for long deployments)**

```bash
# Install screen if not available
sudo apt-get install -y screen

# Start screen session
screen -S healthlink-deploy

# Run deployment
./deploy-low-spec.sh

# Detach with Ctrl+A, then D
# Reattach later with: screen -r healthlink-deploy
```

#### Step 3.3: Verify Deployment

```bash
# Check Docker containers
docker ps

# Expected output:
# peer0.org1.example.com   (UP, 256MB limit)
# orderer.example.com      (UP, 128MB limit)
# ca.org1.example.com      (UP, 64MB limit)
# ... (middleware and frontend processes)

# Check resource usage
docker stats --no-stream

# Check application logs
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

---

### Phase 4: Configure Systemd Services (Auto-Restart on Crash)

#### Step 4.1: Create Middleware Systemd Service

```bash
sudo nano /etc/systemd/system/healthlink-middleware.service
```

**File Contents**:

```ini
[Unit]
Description=HealthLink Pro Middleware API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=healthlink
WorkingDirectory=/opt/healthlink/middleware-api
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/opt/healthlink/start-low-spec.sh
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Step 4.2: Create Frontend Systemd Service

```bash
sudo nano /etc/systemd/system/healthlink-frontend.service
```

**File Contents**:

```ini
[Unit]
Description=HealthLink Pro Next.js Frontend
After=network.target healthlink-middleware.service
Requires=healthlink-middleware.service

[Service]
Type=simple
User=healthlink
WorkingDirectory=/opt/healthlink/frontend
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Step 4.3: Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable healthlink-middleware
sudo systemctl enable healthlink-frontend

# Start services
sudo systemctl start healthlink-middleware
sudo systemctl start healthlink-frontend

# Check status
sudo systemctl status healthlink-middleware
sudo systemctl status healthlink-frontend
```

---

### Phase 5: SSL Certificate Setup (5 minutes)

#### Step 5.1: Run Certbot (if not done during setup)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email admin@yourdomain.com \
  --domain healthlink.yourdomain.com \
  --redirect
```

**What This Does**:
- ✅ Obtains free SSL certificate from Let's Encrypt
- ✅ Automatically configures Nginx for HTTPS
- ✅ Sets up HTTP → HTTPS redirect
- ✅ Configures auto-renewal (via cron)

#### Step 5.2: Test SSL Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check certificate
sudo certbot certificates
```

#### Step 5.3: Verify Auto-Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check cron job
sudo systemctl status certbot.timer
```

---

### Phase 6: Final Verification (5 minutes)

#### Step 6.1: Access Application

**Via Domain (if configured)**:
```
https://healthlink.yourdomain.com
```

**Via IP Address**:
```
http://YOUR_SERVER_IP
```

#### Step 6.2: Test Endpoints

```bash
# Health check
curl https://healthlink.yourdomain.com/api/health

# Expected: {"status":"ok","timestamp":"..."}

# API test
curl -X POST https://healthlink.yourdomain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

#### Step 6.3: Check Firewall

```bash
# Verify external ports are blocked
sudo ufw status numbered

# Expected:
# [1] 22/tcp     ALLOW IN    Anywhere (SSH)
# [2] 80/tcp     ALLOW IN    Anywhere (HTTP)
# [3] 443/tcp    ALLOW IN    Anywhere (HTTPS)
# [4] 3000/tcp   DENY IN     Anywhere (Middleware blocked)
# [5] 7051/tcp   DENY IN     Anywhere (Fabric peer blocked)
```

#### Step 6.4: Monitor Resources

```bash
# Real-time monitoring
htop

# Or Docker stats
docker stats

# Check memory usage
free -h

# Expected total usage: ~1.5GB RAM
```

---

## 🔒 Security Checklist

### Post-Deployment Security

- [ ] Change default SSH port (optional):
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Change Port 22 to Port 2222
  sudo systemctl restart sshd
  ```

- [ ] Disable root SSH login:
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set PermitRootLogin no
  sudo systemctl restart sshd
  ```

- [ ] Enable automatic security updates:
  ```bash
  sudo apt-get install -y unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

- [ ] Set up fail2ban (brute force protection):
  ```bash
  sudo apt-get install -y fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] Configure log rotation:
  ```bash
  sudo nano /etc/logrotate.d/healthlink
  ```
  ```
  /var/log/nginx/healthlink_*.log {
      daily
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 www-data adm
      sharedscripts
      postrotate
          [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
      endscript
  }
  ```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check application status
sudo systemctl status healthlink-middleware
sudo systemctl status healthlink-frontend

# Check Docker containers
docker ps -a

# Check disk space
df -h

# Check memory usage
free -h
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Pull latest code
cd /opt/healthlink && git pull

# Restart services if needed
sudo systemctl restart healthlink-middleware
sudo systemctl restart healthlink-frontend

# Check logs for errors
sudo journalctl -u healthlink-middleware -n 100
sudo journalctl -u healthlink-frontend -n 100
```

### Backup Strategy

```bash
# Create backup script
nano /opt/healthlink/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/healthlink"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Fabric crypto material
tar -czf $BACKUP_DIR/fabric_crypto_$DATE.tar.gz \
  /opt/healthlink/fabric-samples/test-network/organizations

# Backup middleware data
tar -czf $BACKUP_DIR/middleware_data_$DATE.tar.gz \
  /opt/healthlink/middleware-api/data

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /opt/healthlink/backup.sh

# Add to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/healthlink/backup.sh") | crontab -
```

---

## 🐛 Troubleshooting

### Issue 1: "502 Bad Gateway"

**Cause**: Backend services not running

**Solution**:
```bash
# Check service status
sudo systemctl status healthlink-middleware
sudo systemctl status healthlink-frontend

# Check Docker containers
docker ps -a

# Restart services
sudo systemctl restart healthlink-middleware
sudo systemctl restart healthlink-frontend
```

### Issue 2: Out of Memory Errors

**Cause**: VPS has insufficient RAM

**Solution**:
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue 3: SSL Certificate Renewal Failed

**Cause**: Port 80 blocked or domain not resolving

**Solution**:
```bash
# Check Nginx is listening on port 80
sudo netstat -tlnp | grep :80

# Test domain resolution
dig healthlink.yourdomain.com

# Manually renew
sudo certbot renew --force-renewal
```

### Issue 4: Fabric Network Won't Start

**Cause**: Port conflicts or insufficient permissions

**Solution**:
```bash
# Check port usage
sudo lsof -i :7051
sudo lsof -i :7050

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Restart Docker
sudo systemctl restart docker
```

---

## 📞 Support & Next Steps

**After Deployment**:
1. Set up monitoring (Uptime Robot, Pingdom)
2. Configure backup automation
3. Document your custom configurations
4. Set up staging environment for testing updates

**Maintenance Schedule**:
- Daily: Check service status
- Weekly: Security updates
- Monthly: Full backup test
- Quarterly: SSL certificate verification

---

**Status**: Production-ready deployment guide  
**Target**: Ubuntu 22.04 LTS VPS (2GB RAM, 1-2 vCPU)  
**Deployment Time**: ~45 minutes total  
**Skill Level**: Intermediate DevOps knowledge required
