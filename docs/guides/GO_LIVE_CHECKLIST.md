# 🚀 HealthLink Pro - Production Go-Live Checklist

## 📋 Pre-Deployment Checklist

### Local Preparation (On Your Development Machine)

- [ ] **Test Low-Spec Deployment Locally**
  ```bash
  ./deploy-low-spec.sh
  docker stats  # Verify memory usage <1.5GB
  ```

- [ ] **Commit All Changes to Git**
  ```bash
  git status
  git add .
  git commit -m "Production-ready low-spec deployment"
  git push origin main
  ```

- [ ] **Prepare Environment Variables**
  - [ ] Copy `.env.low-spec` to `.env.production`
  - [ ] Generate new JWT_SECRET: `openssl rand -hex 32`
  - [ ] Update API URLs to production domain
  - [ ] Remove any test/debug flags

- [ ] **Backup Current Data**
  ```bash
  tar -czf healthlink_backup_$(date +%Y%m%d).tar.gz \
    middleware-api/data \
    fabric-samples/test-network/organizations
  ```

---

## 🌍 VPS Setup (On Remote Server)

### Phase 1: Server Provisioning (15 min)

- [ ] **1.1 Connect to VPS**
  ```bash
  ssh root@YOUR_SERVER_IP
  # Or: ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_SERVER_IP
  ```

- [ ] **1.2 Create Deployment User**
  ```bash
  sudo adduser healthlink
  sudo usermod -aG sudo healthlink
  su - healthlink
  ```

- [ ] **1.3 Run VPS Setup Script**
  ```bash
  # Upload setup-vps.sh to server first
  GIT_REPO_URL="https://github.com/YOUR_USERNAME/Healthlink_RPC.git" \
  DOMAIN_NAME="healthlink.yourdomain.com" \
  ADMIN_EMAIL="admin@yourdomain.com" \
  ./setup-vps.sh
  ```

- [ ] **1.4 Verify Setup**
  ```bash
  # Check installed software
  docker --version
  docker-compose --version
  node --version
  nginx -v
  
  # Check firewall
  sudo ufw status numbered
  
  # Check repository
  ls -la /opt/healthlink
  ```

---

### Phase 2: Environment Configuration (5 min)

- [ ] **2.1 Transfer Production Environment File**
  ```bash
  # On local machine
  scp .env.production healthlink@YOUR_SERVER_IP:/opt/healthlink/.env
  ```

- [ ] **2.2 Verify Environment Variables on Server**
  ```bash
  cd /opt/healthlink
  cat .env | grep -v "PASSWORD\|SECRET"  # Check without exposing secrets
  ```

- [ ] **2.3 Update Application URLs**
  ```bash
  nano /opt/healthlink/.env
  
  # Update these:
  API_URL=https://healthlink.yourdomain.com
  FRONTEND_URL=https://healthlink.yourdomain.com
  NODE_ENV=production
  ```

---

### Phase 3: SSL Certificate (5 min)

- [ ] **3.1 Verify DNS Resolution**
  ```bash
  host healthlink.yourdomain.com
  # Should show your server IP
  ```

- [ ] **3.2 Run SSL Setup Script**
  ```bash
  cd /opt/healthlink
  DOMAIN=healthlink.yourdomain.com \
  EMAIL=admin@yourdomain.com \
  ./setup-ssl.sh
  ```

- [ ] **3.3 Test HTTPS**
  ```bash
  curl -I https://healthlink.yourdomain.com
  # Should return: HTTP/2 200 (or redirect)
  ```

- [ ] **3.4 Verify Auto-Renewal**
  ```bash
  sudo certbot renew --dry-run
  sudo systemctl status certbot.timer
  ```

---

### Phase 4: Application Deployment (10 min)

- [ ] **4.1 Run Low-Spec Deployment**
  ```bash
  cd /opt/healthlink
  
  # Option A: Foreground (watch progress)
  ./deploy-low-spec.sh
  
  # Option B: Background (production)
  nohup ./deploy-low-spec.sh > deployment.log 2>&1 &
  tail -f deployment.log
  ```

- [ ] **4.2 Verify Docker Containers**
  ```bash
  docker ps
  
  # Expected containers:
  # - peer0.org1.example.com (UP)
  # - orderer.example.com (UP)
  # - ca.org1.example.com (UP)
  ```

- [ ] **4.3 Check Resource Usage**
  ```bash
  docker stats --no-stream
  
  # Expected total: <1.5GB RAM
  ```

---

### Phase 5: Systemd Services (5 min)

- [ ] **5.1 Install Systemd Services**
  ```bash
  cd /opt/healthlink/systemd
  sudo ./install-services.sh
  ```

- [ ] **5.2 Verify Services Running**
  ```bash
  sudo systemctl status healthlink-fabric
  sudo systemctl status healthlink-middleware
  sudo systemctl status healthlink-frontend
  ```

- [ ] **5.3 Test Auto-Restart**
  ```bash
  # Kill a process and check if it restarts
  sudo pkill -f "node src/server.js"
  sleep 5
  sudo systemctl status healthlink-middleware
  # Should show: active (running)
  ```

---

### Phase 6: Nginx Reverse Proxy (Verification)

- [ ] **6.1 Test Nginx Configuration**
  ```bash
  sudo nginx -t
  # Should return: test is successful
  ```

- [ ] **6.2 Check Nginx Logs**
  ```bash
  sudo tail -f /var/log/nginx/healthlink_access.log
  sudo tail -f /var/log/nginx/healthlink_error.log
  ```

- [ ] **6.3 Test Rate Limiting**
  ```bash
  # Rapid requests should be throttled
  for i in {1..20}; do
    curl -I https://healthlink.yourdomain.com/api/health
  done
  
  # Should see some 429 (Too Many Requests) responses
  ```

---

## ✅ Post-Deployment Verification (10 min)

### Functional Tests

- [ ] **Access Frontend**
  - Navigate to: `https://healthlink.yourdomain.com`
  - Check: Page loads without errors
  - Check: No mixed content warnings (HTTP resources on HTTPS page)

- [ ] **Test API Endpoints**
  ```bash
  # Health check
  curl https://healthlink.yourdomain.com/api/health
  # Expected: {"status":"ok"}
  
  # Authentication
  curl -X POST https://healthlink.yourdomain.com/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password"}'
  # Expected: JWT token
  ```

- [ ] **Test WebSocket Connection**
  - Open browser console at `https://healthlink.yourdomain.com`
  - Check for Socket.io connection messages
  - No CORS errors

- [ ] **Submit Test Transaction**
  - Create a test patient record
  - Verify record appears in blockchain
  - Check transaction in Fabric logs:
    ```bash
    docker logs peer0.org1.example.com | tail -20
    ```

### Security Tests

- [ ] **Firewall Verification**
  ```bash
  # From external machine, try to access blocked ports:
  curl http://YOUR_SERVER_IP:3000  # Should timeout
  curl http://YOUR_SERVER_IP:7051  # Should timeout
  curl http://YOUR_SERVER_IP:9002  # Should timeout
  
  # Only 80 and 443 should be accessible
  curl http://YOUR_SERVER_IP:80    # Should redirect to HTTPS
  curl https://YOUR_SERVER_IP:443  # Should work
  ```

- [ ] **SSL Configuration Check**
  - Visit: https://www.ssllabs.com/ssltest/
  - Enter: `healthlink.yourdomain.com`
  - Target Grade: A or A+

- [ ] **Check Security Headers**
  ```bash
  curl -I https://healthlink.yourdomain.com | grep -E "X-Frame|X-Content|Strict-Transport"
  # Should see: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
  ```

### Performance Tests

- [ ] **Response Time Check**
  ```bash
  # Test average response time
  curl -w "@curl-format.txt" -o /dev/null -s https://healthlink.yourdomain.com/api/health
  
  # Create curl-format.txt:
  echo "time_total: %{time_total}s" > curl-format.txt
  
  # Expected: <2 seconds
  ```

- [ ] **Load Test (Optional)**
  ```bash
  # Install Apache Bench
  sudo apt-get install -y apache2-utils
  
  # Run load test (100 requests, 10 concurrent)
  ab -n 100 -c 10 https://healthlink.yourdomain.com/api/health
  
  # Expected: All requests succeed, mean time <2s
  ```

- [ ] **Memory Stability Check**
  ```bash
  # Monitor for 5 minutes
  watch -n 10 'docker stats --no-stream'
  
  # Memory should stay stable (<1.5GB total)
  # No container restarts
  ```

---

## 🔒 Security Hardening (Post-Launch)

- [ ] **Change Default SSH Port (Optional)**
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Change: Port 22 → Port 2222
  sudo systemctl restart sshd
  
  # Update firewall
  sudo ufw allow 2222/tcp
  sudo ufw delete allow 22/tcp
  ```

- [ ] **Disable Root Login**
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PermitRootLogin no
  sudo systemctl restart sshd
  ```

- [ ] **Install Fail2Ban (Brute Force Protection)**
  ```bash
  sudo apt-get install -y fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] **Enable Automatic Security Updates**
  ```bash
  sudo apt-get install -y unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  # Select: Yes
  ```

- [ ] **Set Up Log Rotation**
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
          systemctl reload nginx
      endscript
  }
  ```

---

## 📊 Monitoring Setup

- [ ] **Set Up Uptime Monitoring**
  - Service: Uptime Robot, Pingdom, or StatusCake
  - Monitor: `https://healthlink.yourdomain.com/api/health`
  - Interval: Every 5 minutes
  - Alert: Email/SMS on downtime

- [ ] **Configure Log Monitoring**
  ```bash
  # View real-time logs
  sudo journalctl -u healthlink-middleware -f
  sudo journalctl -u healthlink-frontend -f
  
  # Search for errors
  sudo journalctl -u healthlink-middleware --since "1 hour ago" | grep ERROR
  ```

- [ ] **Set Up Resource Alerts**
  - Monitor: RAM usage >80%
  - Monitor: CPU usage >90%
  - Monitor: Disk space <10%

---

## 🎯 Go-Live Announcement

- [ ] **Update DNS (if needed)**
  - Remove any CNAME records for testing
  - Ensure A record points to production IP

- [ ] **Announce to Stakeholders**
  - Email: "HealthLink Pro is now live at https://healthlink.yourdomain.com"
  - Provide: User guide, support contact

- [ ] **Monitor First 24 Hours**
  - Check logs hourly
  - Monitor uptime
  - Track user activity

---

## 🐛 Rollback Plan (If Issues Occur)

- [ ] **Quick Rollback Steps**
  ```bash
  # Stop all services
  sudo systemctl stop healthlink-*
  
  # Restore backup
  cd /opt/healthlink
  tar -xzf healthlink_backup_YYYYMMDD.tar.gz
  
  # Restart services
  sudo systemctl start healthlink-*
  ```

- [ ] **DNS Rollback**
  - Point domain back to old server IP
  - Wait for DNS propagation (5-60 minutes)

---

## 📝 Post-Launch Tasks

### Week 1
- [ ] Monitor uptime (target: 99.9%)
- [ ] Check SSL certificate status
- [ ] Review error logs daily
- [ ] Verify backups are working

### Month 1
- [ ] Performance optimization based on real usage
- [ ] Security audit
- [ ] Update documentation
- [ ] Train users on new features

### Ongoing
- [ ] Monthly security updates
- [ ] Quarterly SSL certificate verification
- [ ] Backup testing (restore test every 3 months)
- [ ] Capacity planning review

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Application accessible at `https://healthlink.yourdomain.com`  
✅ SSL certificate valid (A grade on SSL Labs)  
✅ All services auto-restart on failure  
✅ Total RAM usage <1.5GB  
✅ Response time <2 seconds  
✅ No errors in logs for 24 hours  
✅ Backups configured and tested  
✅ Monitoring alerts active  

---

**Deployment Complete! Your HealthLink Pro application is now live in production.** 🚀

**Support**: For issues, check `PRODUCTION_DEPLOYMENT_GUIDE.md` and logs  
**Monitoring**: `sudo systemctl status healthlink-*`  
**Logs**: `sudo journalctl -u healthlink-middleware -f`
