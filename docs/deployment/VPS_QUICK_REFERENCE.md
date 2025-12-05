# 🚀 VPS Production Deployment - Quick Reference

## One-Command Deployment

```bash
# On fresh Ubuntu 22.04 VPS
GIT_REPO_URL="https://github.com/YOUR_USER/Healthlink_RPC.git" \
DOMAIN_NAME="healthlink.example.com" \
ADMIN_EMAIL="admin@example.com" \
./setup-vps.sh
```

---

## 📁 Files Created (10)

| File | Purpose | Lines |
|------|---------|-------|
| `setup-vps.sh` | VPS provisioning | 450 |
| `healthlink.nginx.conf` | Reverse proxy | 260 |
| `setup-ssl.sh` | SSL automation | 180 |
| `systemd/healthlink-*.service` | Auto-restart | 3 files |
| `systemd/install-services.sh` | Service installer | 80 |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Full manual | 800+ |
| `GO_LIVE_CHECKLIST.md` | Launch checklist | 500+ |
| `VPS_DEPLOYMENT_SUMMARY.md` | Overview | 600+ |

---

## 🔑 Key Commands

### Deployment
```bash
# Setup VPS
./setup-vps.sh

# Transfer environment
scp .env.low-spec healthlink@SERVER:/opt/healthlink/.env

# Deploy app
cd /opt/healthlink && ./deploy-low-spec.sh

# Install services
cd systemd && sudo ./install-services.sh

# Setup SSL
DOMAIN=your-domain.com EMAIL=admin@example.com ./setup-ssl.sh
```

### Service Management
```bash
# Start all
sudo systemctl start healthlink-*

# Stop all
sudo systemctl stop healthlink-*

# Restart all
sudo systemctl restart healthlink-*

# Check status
sudo systemctl status healthlink-middleware
sudo systemctl status healthlink-frontend
sudo systemctl status healthlink-fabric
```

### Monitoring
```bash
# Real-time logs
sudo journalctl -u healthlink-middleware -f

# Docker stats
docker stats

# Nginx logs
sudo tail -f /var/log/nginx/healthlink_access.log
```

---

## 🌐 Network Routing

```
External Request              Internal Service
─────────────────────────────────────────────────
https://domain.com/           → localhost:9002 (Next.js)
https://domain.com/api/       → localhost:3000 (Middleware)
https://domain.com/socket.io/ → localhost:4001 (WebSocket)
```

---

## 🔒 Firewall Rules

```
✅ ALLOW: 22 (SSH), 80 (HTTP), 443 (HTTPS)
❌ DENY:  3000, 7051, 7050, 9002 (internal only)
```

---

## 📊 Resource Limits

| Component | Memory | CPU | Auto-Restart |
|-----------|--------|-----|--------------|
| Peer | 256MB | 0.5 | ✅ |
| Orderer | 128MB | 0.25 | ✅ |
| Middleware | 768MB | 75% | ✅ |
| Frontend | 384MB | 50% | ✅ |
| **Total** | ~1.5GB | ~100% | ✅ |

---

## ✅ Success Checklist

- [ ] App accessible at `https://your-domain.com`
- [ ] SSL certificate valid (A+ grade)
- [ ] All services auto-restart on crash
- [ ] Application ports blocked (3000, 7051, 9002)
- [ ] Response time <2 seconds
- [ ] Total RAM <1.5GB
- [ ] Monitoring alerts configured

---

## 🐛 Quick Troubleshooting

**502 Bad Gateway**
```bash
sudo systemctl restart healthlink-*
```

**SSL Failed**
```bash
host your-domain.com  # Check DNS
sudo certbot renew --force-renewal
```

**Out of Memory**
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

**Docker Permission Denied**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📞 Support

- **Full Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Checklist**: `GO_LIVE_CHECKLIST.md`
- **Summary**: `VPS_DEPLOYMENT_SUMMARY.md`

---

**Deployment Time**: 45 minutes  
**Target**: Ubuntu 22.04 LTS (2GB RAM, 1-2 vCPU)  
**Status**: Production-ready 🚀
