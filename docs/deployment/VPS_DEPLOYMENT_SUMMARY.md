# 🌐 VPS Production Deployment - Complete Package

## 📦 What Was Created

This production deployment package provides **complete infrastructure-as-code** to deploy your low-spec optimized HealthLink Pro application to a real VPS (AWS, DigitalOcean, Azure).

### 🎯 Achievement

**From Localhost → Production in 45 Minutes**

| Aspect | Before | After |
|--------|--------|-------|
| **Access** | http://localhost:3000 | https://your-domain.com |
| **Ports** | :3000, :7051, :9002 exposed | Only :80, :443 public |
| **SSL** | None | Let's Encrypt (auto-renewing) |
| **Uptime** | Manual start/stop | Auto-restart on crash |
| **Security** | Development mode | Hardened (firewall, rate limits) |

---

## 📁 Files Created (10 Production Files)

### 1. **setup-vps.sh** (450 lines)
**Purpose**: Automated VPS provisioning script

**What It Does**:
- ✅ Installs Docker, Docker Compose, Node.js 18, Nginx
- ✅ Configures UFW firewall (allows 22, 80, 443 | blocks 3000, 7051, 9002)
- ✅ Clones Git repository to `/opt/healthlink`
- ✅ Installs application dependencies (production only)
- ✅ Configures Nginx reverse proxy
- ✅ Obtains SSL certificate (Let's Encrypt)

**Usage**:
```bash
GIT_REPO_URL="https://github.com/user/Healthlink_RPC.git" \
DOMAIN_NAME="healthlink.example.com" \
ADMIN_EMAIL="admin@example.com" \
./setup-vps.sh
```

---

### 2. **healthlink.nginx.conf** (260 lines)
**Purpose**: Nginx reverse proxy configuration

**Key Features**:
- ✅ **Frontend Routing**: `your-domain.com/` → Next.js (localhost:9002)
- ✅ **API Routing**: `your-domain.com/api/` → Middleware (localhost:3000)
- ✅ **WebSocket Support**: `your-domain.com/socket.io/` → Socket.io (localhost:4001)
- ✅ **Rate Limiting**: 
  - General API: 10 req/sec
  - Auth endpoints: 5 req/sec
- ✅ **Security Headers**: X-Frame-Options, HSTS, CSP
- ✅ **Static Asset Caching**: 1 year cache for immutable files
- ✅ **Gzip Compression**: Automatic for text/CSS/JS

**Routing Table**:
```
External Request              → Internal Service
────────────────────────────────────────────────────
https://domain.com/           → localhost:9002 (Next.js)
https://domain.com/api/       → localhost:3000 (Middleware)
https://domain.com/socket.io/ → localhost:4001 (WebSocket)
https://domain.com/_next/     → localhost:9002 (Static files)
```

---

### 3. **PRODUCTION_DEPLOYMENT_GUIDE.md** (800+ lines)
**Purpose**: Complete step-by-step deployment manual

**Contents**:
- 📋 Prerequisites checklist
- 🚀 6-phase deployment process
- 🔒 Security hardening steps
- 📊 Monitoring setup
- 🐛 Troubleshooting guide
- 💾 Backup strategy
- 🔄 Rollback procedures

**Phases**:
1. Server provisioning (15 min)
2. Environment transfer (5 min)
3. Application deployment (10 min)
4. Systemd services (5 min)
5. SSL certificate (5 min)
6. Final verification (10 min)

---

### 4. **setup-ssl.sh** (180 lines)
**Purpose**: Automated SSL certificate installation

**What It Does**:
- ✅ Validates DNS resolution
- ✅ Installs Certbot
- ✅ Obtains Let's Encrypt certificate
- ✅ Configures Nginx for HTTPS
- ✅ Sets up auto-renewal (90-day expiration)
- ✅ Tests renewal process

**Usage**:
```bash
DOMAIN=healthlink.example.com \
EMAIL=admin@example.com \
./setup-ssl.sh
```

---

### 5. **systemd/healthlink-middleware.service**
**Purpose**: Systemd service for Node.js middleware

**Features**:
- ✅ Auto-start on boot
- ✅ Auto-restart on crash (max 5 restarts in 5 minutes)
- ✅ Memory limit: 768MB
- ✅ CPU quota: 75%
- ✅ Security hardening (NoNewPrivileges, PrivateTmp)
- ✅ Logging to systemd journal

**Commands**:
```bash
sudo systemctl start healthlink-middleware
sudo systemctl status healthlink-middleware
sudo journalctl -u healthlink-middleware -f
```

---

### 6. **systemd/healthlink-frontend.service**
**Purpose**: Systemd service for Next.js frontend

**Features**:
- ✅ Runs standalone Next.js build
- ✅ Memory limit: 384MB
- ✅ CPU quota: 50%
- ✅ Auto-restart on failure
- ✅ Waits for middleware to start first

---

### 7. **systemd/healthlink-fabric.service**
**Purpose**: Systemd service for Hyperledger Fabric network

**Features**:
- ✅ Manages Docker Compose lifecycle
- ✅ Starts peer, orderer, CAs
- ✅ Type: oneshot (fire-and-forget)
- ✅ RemainAfterExit: yes (don't restart containers)

---

### 8. **systemd/install-services.sh** (80 lines)
**Purpose**: One-command systemd installation

**What It Does**:
```bash
sudo ./install-services.sh

# Installs:
# - healthlink-fabric.service
# - healthlink-middleware.service
# - healthlink-frontend.service

# Then:
# - Reloads systemd
# - Enables services (start on boot)
# - Starts all services
# - Verifies status
```

---

### 9. **GO_LIVE_CHECKLIST.md** (500+ lines)
**Purpose**: Pre-launch verification checklist

**Sections**:
- 📋 Pre-deployment (local preparation)
- 🌍 VPS setup (6 phases with checkboxes)
- ✅ Post-deployment verification (functional, security, performance)
- 🔒 Security hardening
- 📊 Monitoring setup
- 🐛 Rollback plan
- 📝 Post-launch tasks

**Example Checklist Item**:
```markdown
- [ ] **4.1 Run Low-Spec Deployment**
  ```bash
  cd /opt/healthlink
  ./deploy-low-spec.sh
  ```
```

---

### 10. **VPS_DEPLOYMENT_SUMMARY.md** (This Document)
**Purpose**: Quick reference for all deployment files

---

## 🚀 Quick Start: 3-Command Deployment

### On Fresh Ubuntu 22.04 VPS

```bash
# 1. Run VPS setup (15 min)
GIT_REPO_URL="https://github.com/YOUR_USERNAME/Healthlink_RPC.git" \
DOMAIN_NAME="healthlink.example.com" \
ADMIN_EMAIL="admin@example.com" \
./setup-vps.sh

# 2. Transfer environment file
scp .env.low-spec healthlink@YOUR_SERVER_IP:/opt/healthlink/.env

# 3. Deploy application
cd /opt/healthlink
./deploy-low-spec.sh
```

**Result**: Application live at `https://healthlink.example.com`

---

## 🔍 Architecture Overview

### Network Flow (Production)

```
Internet User
     ↓
[Cloudflare/DNS]
     ↓
https://healthlink.example.com
     ↓
[Ubuntu VPS - Public IP]
     ↓
[UFW Firewall]
  ├─ :22  → SSH (admin access)
  ├─ :80  → HTTP (redirect to HTTPS)
  ├─ :443 → HTTPS (public access)
  └─ BLOCK: :3000, :7051, :9002 (internal only)
     ↓
[Nginx Reverse Proxy]
  ├─ /          → localhost:9002 (Next.js)
  ├─ /api/      → localhost:3000 (Middleware)
  └─ /socket.io → localhost:4001 (WebSocket)
     ↓
[Application Layer]
  ├─ Next.js Frontend (Port 9002)
  │  └─ Memory: 256MB, CPU: 50%
  │
  ├─ Node.js Middleware (Port 3000)
  │  └─ Memory: 512MB, CPU: 75%
  │
  └─ Socket.io Server (Port 4001)
     └─ Memory: 128MB, CPU: 25%
     ↓
[Hyperledger Fabric]
  ├─ Peer (peer0.org1)    - 256MB, 0.5 CPU
  ├─ Orderer              - 128MB, 0.25 CPU
  └─ CAs (3x)             - 64MB each, 0.1 CPU
```

### Port Mapping

| External Port | Internal Port | Service | Access |
|--------------|---------------|---------|--------|
| 443 (HTTPS) | 9002 | Next.js | ✅ Public |
| 443 (HTTPS) | 3000 | Middleware | ✅ Public (via /api/) |
| 443 (HTTPS) | 4001 | WebSocket | ✅ Public (via /socket.io/) |
| 22 | 22 | SSH | ✅ Admin only |
| ❌ Blocked | 7051 | Fabric Peer | ❌ Internal only |
| ❌ Blocked | 7050 | Fabric Orderer | ❌ Internal only |
| ❌ Blocked | 7054 | Fabric CA | ❌ Internal only |

---

## 🔒 Security Features

### Firewall (UFW)

```bash
sudo ufw status
# Output:
# 22/tcp    ALLOW   (SSH)
# 80/tcp    ALLOW   (HTTP)
# 443/tcp   ALLOW   (HTTPS)
# 3000/tcp  DENY    (Middleware blocked)
# 7051/tcp  DENY    (Fabric peer blocked)
# 9002/tcp  DENY    (Next.js blocked)
```

### Nginx Rate Limiting

```nginx
# General API: 10 requests/second
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
}

# Auth endpoints: 5 requests/second
location ~ ^/api/(login|register) {
    limit_req zone=auth_limit burst=10 nodelay;
}
```

### Security Headers

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

### Systemd Security

```ini
# Service isolation
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
```

---

## 📊 Resource Allocation (Production)

| Component | Memory Limit | CPU Limit | Auto-Restart |
|-----------|-------------|-----------|--------------|
| **Fabric Peer** | 256MB | 0.5 CPU | ✅ Docker |
| **Fabric Orderer** | 128MB | 0.25 CPU | ✅ Docker |
| **Fabric CAs (3x)** | 64MB each | 0.1 CPU each | ✅ Docker |
| **Node.js Middleware** | 768MB | 75% | ✅ Systemd |
| **Next.js Frontend** | 384MB | 50% | ✅ Systemd |
| **Nginx** | ~50MB | <5% | ✅ Systemd |
| **Total** | ~1.5GB | ~100% (1 CPU) | ✅ Full HA |

---

## 🐛 Common Deployment Issues & Solutions

### Issue 1: "502 Bad Gateway"

**Symptom**: Nginx shows 502 error when accessing domain

**Cause**: Backend service not running

**Solution**:
```bash
# Check service status
sudo systemctl status healthlink-middleware
sudo systemctl status healthlink-frontend

# Restart services
sudo systemctl restart healthlink-middleware
sudo systemctl restart healthlink-frontend

# Check Nginx logs
sudo tail -f /var/log/nginx/healthlink_error.log
```

---

### Issue 2: "Certificate Obtain Failed"

**Symptom**: Certbot fails to get SSL certificate

**Cause**: DNS not resolving or port 80 blocked

**Solution**:
```bash
# Verify DNS
host healthlink.example.com
# Should return your server IP

# Check port 80
sudo netstat -tlnp | grep :80

# Test with HTTP challenge manually
sudo certbot certonly --standalone \
  -d healthlink.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com
```

---

### Issue 3: "Docker Permission Denied"

**Symptom**: `docker: permission denied` when running commands

**Cause**: User not in docker group

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes (logout and login)
newgrp docker

# Verify
docker ps
```

---

### Issue 4: "Out of Memory"

**Symptom**: Services crash with OOM errors

**Cause**: VPS has insufficient RAM

**Solution**:
```bash
# Add 2GB swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

---

## 📈 Monitoring Commands

### Real-Time Monitoring

```bash
# Docker container stats
docker stats

# System resource usage
htop

# Service logs (real-time)
sudo journalctl -u healthlink-middleware -f
sudo journalctl -u healthlink-frontend -f

# Nginx access logs
sudo tail -f /var/log/nginx/healthlink_access.log
```

### Periodic Checks

```bash
# Daily health check
curl https://healthlink.example.com/api/health

# Weekly resource summary
docker stats --no-stream
free -h
df -h

# Monthly security updates
sudo apt-get update && sudo apt-get upgrade -y
```

---

## 🎯 Success Metrics

Your deployment is production-ready when:

✅ **Accessibility**: App loads at `https://your-domain.com`  
✅ **SSL Grade**: A or A+ on SSL Labs test  
✅ **Uptime**: 99.9%+ (measured over 30 days)  
✅ **Response Time**: <2 seconds average  
✅ **Memory Usage**: <1.5GB total  
✅ **CPU Usage**: <80% average  
✅ **Auto-Restart**: Services recover within 10 seconds of crash  
✅ **Security**: All application ports blocked except 80/443  

---

## 📚 Documentation Index

| Document | Purpose | Lines |
|----------|---------|-------|
| **setup-vps.sh** | VPS provisioning automation | 450 |
| **healthlink.nginx.conf** | Reverse proxy configuration | 260 |
| **PRODUCTION_DEPLOYMENT_GUIDE.md** | Step-by-step deployment manual | 800+ |
| **setup-ssl.sh** | SSL certificate automation | 180 |
| **systemd/*.service** | Auto-restart service definitions | 3 files |
| **systemd/install-services.sh** | Service installer | 80 |
| **GO_LIVE_CHECKLIST.md** | Pre-launch verification | 500+ |
| **VPS_DEPLOYMENT_SUMMARY.md** | This document (overview) | 600+ |

---

## 🔗 Related Documentation

- **LOW_SPEC_OPTIMIZATION_GUIDE.md** - Resource optimization technical details
- **LOW_SPEC_DEPLOYMENT.md** - Local low-spec deployment guide
- **SECURITY_IMPLEMENTATION_SUMMARY.md** - Security architecture

---

## 🤝 Support & Next Steps

### After Deployment

1. ✅ Set up uptime monitoring (Uptime Robot, Pingdom)
2. ✅ Configure backup automation (daily at 2 AM)
3. ✅ Set up log aggregation (optional: ELK stack)
4. ✅ Create staging environment for testing updates

### Maintenance Schedule

| Frequency | Task | Command |
|-----------|------|---------|
| **Daily** | Check service status | `sudo systemctl status healthlink-*` |
| **Weekly** | Security updates | `sudo apt-get update && upgrade` |
| **Monthly** | Backup verification | Restore test |
| **Quarterly** | SSL certificate check | `sudo certbot certificates` |

---

**Status**: ✅ Production deployment package complete  
**Target**: Ubuntu 22.04 LTS VPS (2GB RAM, 1-2 vCPU)  
**Total Files**: 10 production-ready files  
**Deployment Time**: 45 minutes  
**Skill Level**: Intermediate DevOps  

---

**Your HealthLink Pro application is now ready to go live!** 🚀

Run `./setup-vps.sh` on your VPS to get started.
