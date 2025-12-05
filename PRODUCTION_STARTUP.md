# 🚀 PRODUCTION STARTUP GUIDE

**Purpose**: Deploy HealthLink Pro v2.0 to production  
**Author**: DevOps & QA Lead  
**Date**: December 5, 2025

---

## 🎯 PRE-DEPLOYMENT CHECKLIST

Run these checks **BEFORE** starting production:

```bash
# 1. Verify frontend build
cd /workspaces/Healthlink_RPC/frontend
npm run build
# Expected: ✓ Compiled successfully

# 2. Run Trident verification
cd /workspaces/Healthlink_RPC/middleware-api
node verify_full_stack.js
# Expected: ✅ ALL SYSTEMS OPERATIONAL

# 3. Check Fabric network
docker ps | grep hyperledger | wc -l
# Expected: 5+ containers running

# 4. Verify environment variables
cd /workspaces/Healthlink_RPC/middleware-api
grep -E "DATABASE_URL|SUPABASE" .env | head -2
# Expected: Both variables populated
```

**ONLY proceed if all 4 checks pass!**

---

## 🚀 OPTION 1: Simple Background Processes (nohup)

**Best for**: Quick deployment, single server, no process management needed

### Start Production Stack

```bash
cd /workspaces/Healthlink_RPC

# 1. Start Backend API (port 4000)
cd middleware-api
nohup npm run dev > logs/backend.log 2>&1 &
echo $! > backend.pid
echo "✓ Backend started (PID: $(cat backend.pid))"

# 2. Start Frontend (port 9002)
cd ../frontend
nohup npm run start > logs/frontend.log 2>&1 &
echo $! > frontend.pid
echo "✓ Frontend started (PID: $(cat frontend.pid))"

# 3. Verify startup
sleep 5
curl http://localhost:4000/health && echo "" && echo "✓ Backend healthy"
curl -I http://localhost:9002 | head -1 && echo "✓ Frontend healthy"
```

### Monitor Logs

```bash
# Backend logs (real-time)
tail -f /workspaces/Healthlink_RPC/middleware-api/logs/backend.log

# Frontend logs (real-time)
tail -f /workspaces/Healthlink_RPC/frontend/logs/frontend.log

# Last 50 lines
tail -50 /workspaces/Healthlink_RPC/middleware-api/logs/backend.log
```

### Stop Production Stack

```bash
cd /workspaces/Healthlink_RPC

# Stop backend
kill $(cat middleware-api/backend.pid) 2>/dev/null
rm middleware-api/backend.pid

# Stop frontend
kill $(cat frontend/frontend.pid) 2>/dev/null
rm frontend/frontend.pid

echo "✓ Production stopped"
```

---

## 🔥 OPTION 2: PM2 Process Manager (Recommended)

**Best for**: Production environments, auto-restart on crash, log management

### Install PM2 (if not installed)

```bash
npm install -g pm2
```

### Start Production Stack

```bash
cd /workspaces/Healthlink_RPC

# 1. Start Backend API
cd middleware-api
pm2 start npm --name "healthlink-backend" -- run dev
pm2 save  # Save process list

# 2. Start Frontend
cd ../frontend
pm2 start npm --name "healthlink-frontend" -- run start
pm2 save  # Save process list

# 3. View status
pm2 status
```

**Expected Output**:
```
┌─────┬────────────────────────┬─────────┬───────┬────────┬─────────┐
│ id  │ name                   │ mode    │ ↺     │ status │ cpu     │
├─────┼────────────────────────┼─────────┼───────┼────────┼─────────┤
│ 0   │ healthlink-backend     │ fork    │ 0     │ online │ 0%      │
│ 1   │ healthlink-frontend    │ fork    │ 0     │ online │ 0%      │
└─────┴────────────────────────┴─────────┴───────┴────────┴─────────┘
```

### Monitor with PM2

```bash
# View status dashboard
pm2 monit

# View logs (all processes)
pm2 logs

# View logs (specific process)
pm2 logs healthlink-backend
pm2 logs healthlink-frontend

# View last 100 lines
pm2 logs --lines 100

# Clear logs
pm2 flush
```

### Manage Processes

```bash
# Restart single process
pm2 restart healthlink-backend
pm2 restart healthlink-frontend

# Restart all
pm2 restart all

# Stop single process
pm2 stop healthlink-backend

# Stop all
pm2 stop all

# Delete process (removes from PM2 list)
pm2 delete healthlink-backend
pm2 delete healthlink-frontend

# Delete all
pm2 delete all
```

### Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# To disable auto-start
pm2 unstartup
```

---

## 🐳 OPTION 3: Docker Compose (Advanced)

**Best for**: Containerized deployment, multiple servers, microservices

### Create docker-compose.yml

Save as `/workspaces/Healthlink_RPC/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Backend API
  backend:
    build:
      context: ./middleware-api
      dockerfile: Dockerfile.prod
    container_name: healthlink-backend
    restart: always
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./middleware-api/logs:/app/logs
      - ./fabric-samples:/app/fabric-samples:ro
    depends_on:
      - fabric-network
    networks:
      - healthlink-network

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: healthlink-frontend
    restart: always
    ports:
      - "9002:9002"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on:
      - backend
    networks:
      - healthlink-network

networks:
  healthlink-network:
    driver: bridge
```

### Start with Docker Compose

```bash
cd /workspaces/Healthlink_RPC

# Build and start in background
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View status
docker-compose -f docker-compose.prod.yml ps

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose -f docker-compose.prod.yml down -v
```

---

## 📊 POST-DEPLOYMENT VERIFICATION

After starting production, **ALWAYS run verification**:

### 1. Run Trident Test

```bash
cd /workspaces/Healthlink_RPC/middleware-api
node verify_full_stack.js
```

**Expected Output**:
```
========================================
HEALTHLINK PRO - FULL STACK VERIFICATION
========================================

⏳ Testing database connection...
✓ Database: Connected

⏳ Testing blockchain connection...
✓ Blockchain: Connected

⏳ Testing API server...
✓ API Server: Running on port 4000

========================================
FINAL VERDICT: ✅ ALL SYSTEMS OPERATIONAL
========================================
```

### 2. Manual Health Checks

```bash
# Backend API health
curl http://localhost:4000/health
# Expected: {"status":"ok"}

# Frontend accessibility
curl -I http://localhost:9002 | head -1
# Expected: HTTP/1.1 200 OK

# Database connection (from backend)
cd middleware-api
npx prisma db pull
# Expected: No errors

# Blockchain network
docker ps | grep hyperledger | wc -l
# Expected: 5+ containers
```

### 3. Browser Testing

Open browser and navigate to:
- **Frontend**: `http://localhost:9002`
- **Backend Health**: `http://localhost:4000/health`

**Checklist**:
```
[ ] Login page loads without errors
[ ] Can log in with test credentials
[ ] Dashboard loads correctly
[ ] No errors in browser console (F12)
[ ] Patient records accessible
[ ] Prescriptions can be created
[ ] Lab tests display correctly
[ ] Blockchain events appear
```

---

## 🔍 TROUBLESHOOTING

### Frontend Not Loading

```bash
# Check if process is running
ps aux | grep next

# Check if port is in use
lsof -i :9002

# Restart frontend
cd /workspaces/Healthlink_RPC/frontend
npm run build
npm run start
```

### Backend API Errors

```bash
# Check logs
tail -50 /workspaces/Healthlink_RPC/middleware-api/logs/backend.log

# Test database connection
cd middleware-api
npx prisma db pull

# Restart backend
killall node
npm run dev
```

### Blockchain Not Responding

```bash
# Check Fabric containers
docker ps | grep hyperledger

# Restart Fabric network
cd /workspaces/Healthlink_RPC
./stop.sh
./start.sh

# Wait for network to initialize (30 seconds)
sleep 30

# Restart backend to reconnect
cd middleware-api
killall node
npm run dev
```

---

## 🎯 PRODUCTION URLS

After successful deployment:

| Service | URL | Status Check |
|---------|-----|--------------|
| Frontend | `http://localhost:9002` | Open in browser |
| Backend API | `http://localhost:4000` | `curl http://localhost:4000/health` |
| API Docs | `http://localhost:4000/api-docs` | Open in browser |
| Blockchain Explorer | `docker logs peer0.org1.example.com` | Check logs |

---

## 🛡️ PRODUCTION BEST PRACTICES

### 1. Environment Variables

**NEVER commit `.env` files to git!**

```bash
# Verify sensitive data is hidden
cd middleware-api
grep -E "DATABASE_URL|SUPABASE|SECRET" .env
# Should show actual values (not in git)

# Backup .env securely
cp .env .env.backup
chmod 600 .env.backup
```

### 2. Log Rotation

```bash
# Create logs directory
mkdir -p middleware-api/logs
mkdir -p frontend/logs

# Setup log rotation (Linux)
sudo tee /etc/logrotate.d/healthlink <<EOF
/workspaces/Healthlink_RPC/middleware-api/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
/workspaces/Healthlink_RPC/frontend/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

### 3. Monitoring

```bash
# Watch CPU/Memory usage
watch -n 5 'ps aux | grep node | grep -v grep'

# Monitor API response time
while true; do
  curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/health
  sleep 5
done
```

Create `curl-format.txt`:
```
time_total: %{time_total}s
```

### 4. Backup Strategy

```bash
# Daily backup script
cat > /workspaces/Healthlink_RPC/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/healthlink-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup database (Supabase auto-backups, but also export schema)
cd /workspaces/Healthlink_RPC/middleware-api
npx prisma db pull > $BACKUP_DIR/schema.prisma

# Backup configs
cp frontend/next.config.ts $BACKUP_DIR/
cp middleware-api/.env $BACKUP_DIR/

echo "✓ Backup complete: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

---

## 📈 PERFORMANCE OPTIMIZATION

### Frontend (Next.js)

```bash
# Enable production optimizations in next.config.ts
{
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
}
```

### Backend (Express)

```bash
# Enable compression middleware
npm install compression

# Add to src/app.ts:
import compression from 'compression';
app.use(compression());
```

---

## 🆘 EMERGENCY PROCEDURES

### Quick Restart (All Services)

```bash
cd /workspaces/Healthlink_RPC

# Option 1: Using nohup
killall node 2>/dev/null
cd middleware-api && nohup npm run dev > logs/backend.log 2>&1 &
cd ../frontend && nohup npm run start > logs/frontend.log 2>&1 &

# Option 2: Using PM2
pm2 restart all

# Option 3: Using Docker Compose
docker-compose -f docker-compose.prod.yml restart
```

### Complete Rollback

See `ROLLBACK.md` for detailed procedures.

Quick rollback:
```bash
cd /workspaces/Healthlink_RPC
./emergency_rollback.sh
```

---

## 📞 SUPPORT CONTACTS

- **DevOps Lead**: [Your contact]
- **Database Admin**: [Your contact]
- **Blockchain Team**: [Your contact]

---

## 📝 DEPLOYMENT CHECKLIST

```
PRE-DEPLOYMENT:
[ ] Frontend builds successfully (npm run build)
[ ] Trident verification passes (verify_full_stack.js)
[ ] Fabric network running (5+ containers)
[ ] Environment variables set (.env populated)
[ ] Backups created (configs and .env)

DEPLOYMENT:
[ ] Choose deployment method (nohup/PM2/Docker)
[ ] Start backend API
[ ] Start frontend
[ ] Verify processes running

POST-DEPLOYMENT:
[ ] Run Trident verification
[ ] Test backend health endpoint
[ ] Test frontend in browser
[ ] Check logs for errors
[ ] Verify user login works
[ ] Monitor for 15 minutes

PRODUCTION MONITORING:
[ ] Setup log rotation
[ ] Configure monitoring/alerts
[ ] Document any issues
[ ] Update ROLLBACK.md if needed
```

---

**Last Updated**: December 5, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
