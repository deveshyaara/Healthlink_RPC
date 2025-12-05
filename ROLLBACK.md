# 🚨 EMERGENCY ROLLBACK GUIDE

**Purpose**: Quickly recover from failed production deployment  
**Author**: DevOps & QA Lead  
**Date**: December 5, 2025

---

## 🔥 CRITICAL SCENARIOS

### 1. White Screen of Death (Frontend Crash)

**Symptoms**: Frontend loads but shows blank white screen or error boundary

**IMMEDIATE FIX** (30 seconds):
```bash
cd /workspaces/Healthlink_RPC/frontend

# Restore original config if backup exists
if [ -f next.config.ts.backup ]; then
  mv next.config.ts.backup next.config.ts
  echo "✓ Config restored from backup"
fi

# Kill production build and restart dev mode
killall node 2>/dev/null
npm run dev
```

**Expected Output**:
```
✓ Config restored from backup
> frontend@0.1.0 dev
> next dev -p 9002

- ready started server on 0.0.0.0:9002
```

---

### 2. Backend API Unresponsive

**Symptoms**: Frontend cannot connect to backend, API timeouts

**IMMEDIATE FIX** (15 seconds):
```bash
cd /workspaces/Healthlink_RPC/middleware-api

# Kill all node processes
killall node 2>/dev/null

# Restart in development mode
npm run dev
```

**Verify Fix**:
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

---

### 3. Database Connection Failure

**Symptoms**: "Prisma Client initialization error" or "Database unavailable"

**IMMEDIATE FIX** (10 seconds):
```bash
cd /workspaces/Healthlink_RPC/middleware-api

# Regenerate Prisma Client
npx prisma generate

# Restart backend
killall node 2>/dev/null
npm run dev
```

**Deep Fix** (if above fails):
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# If empty, reload from .env
export $(grep -v '^#' .env | xargs)

# Test connection
npx prisma db pull
```

---

### 4. Blockchain Network Down

**Symptoms**: "Fabric gateway connection failed" or "Chaincode unavailable"

**IMMEDIATE FIX** (60 seconds):
```bash
# Check if Fabric network is running
docker ps | grep hyperledger

# If no containers, restart network
cd /workspaces/Healthlink_RPC
./start.sh

# Wait for network initialization (30 seconds)
sleep 30

# Restart backend to reconnect
cd middleware-api
killall node 2>/dev/null
npm run dev
```

**Verify Fix**:
```bash
# Check chaincode is deployed
docker ps | grep "dev-peer"
# Should show chaincode containers
```

---

## 🛑 KILL ALL PROCESSES

**Nuclear option** - Stops everything:

```bash
#!/bin/bash
# Stop all HealthLink services

# Kill all node processes
killall node 2>/dev/null

# Stop Fabric network
cd /workspaces/Healthlink_RPC
./stop.sh

# Kill any lingering processes on production ports
lsof -ti:9002 | xargs kill -9 2>/dev/null  # Frontend
lsof -ti:4000 | xargs kill -9 2>/dev/null  # Backend
lsof -ti:3000 | xargs kill -9 2>/dev/null  # Alternate backend port

echo "✓ All services stopped"
```

Save as: `emergency_stop.sh`  
Usage: `chmod +x emergency_stop.sh && ./emergency_stop.sh`

---

## 🔄 COMPLETE ROLLBACK PROCEDURE

**Full reset to working state** (2 minutes):

```bash
cd /workspaces/Healthlink_RPC

# STEP 1: Stop everything
killall node 2>/dev/null
./stop.sh

# STEP 2: Restore configs
cd frontend
if [ -f next.config.ts.backup ]; then
  mv next.config.ts.backup next.config.ts
fi
cd ..

# STEP 3: Restart Fabric network
./start.sh
sleep 30  # Wait for network initialization

# STEP 4: Restart backend in dev mode
cd middleware-api
npm run dev &
BACKEND_PID=$!
sleep 5  # Wait for backend to start

# STEP 5: Restart frontend in dev mode
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✓ Rollback complete"
echo "Backend PID: $BACKEND_PID (port 4000)"
echo "Frontend PID: $FRONTEND_PID (port 9002)"
```

---

## 🧪 VERIFY ROLLBACK SUCCESS

After rollback, run verification:

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

---

## 📋 ROLLBACK DECISION TREE

```
Production Deployment Failed
│
├─ Frontend Issue?
│  ├─ White screen → Restore next.config.ts.backup
│  ├─ Build errors → Restore original files + npm run dev
│  └─ Port conflict → Kill process on port 9002
│
├─ Backend Issue?
│  ├─ API unresponsive → killall node + npm run dev
│  ├─ Database error → npx prisma generate + restart
│  └─ Port conflict → Kill process on port 4000
│
├─ Blockchain Issue?
│  ├─ Network down → ./start.sh + wait 30s
│  ├─ Chaincode missing → Redeploy chaincode
│  └─ Connection timeout → Restart backend
│
└─ Multiple Issues?
   └─ Use COMPLETE ROLLBACK PROCEDURE (above)
```

---

## 🔍 DIAGNOSTIC COMMANDS

### Check Service Status
```bash
# Frontend
curl http://localhost:9002
# Should return HTML

# Backend API
curl http://localhost:4000/health
# Should return: {"status":"ok"}

# Database
cd middleware-api && npx prisma db pull
# Should complete without errors

# Blockchain
docker ps | grep hyperledger
# Should show 5+ containers running
```

### Check Logs
```bash
# Backend logs (if running with nohup)
tail -f middleware-api/nohup.out

# Frontend logs (if running with nohup)
tail -f frontend/nohup.out

# Fabric network logs
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

### Check Port Usage
```bash
# See what's running on production ports
lsof -i :9002  # Frontend
lsof -i :4000  # Backend
lsof -i :7051  # Fabric peer
lsof -i :7050  # Fabric orderer
```

---

## 🆘 ESCALATION PROCEDURES

### Level 1: Self-Service (5 minutes)
- Follow scenario-specific IMMEDIATE FIX above
- Run verification script
- Check diagnostic commands

### Level 2: Complete Rollback (10 minutes)
- Execute COMPLETE ROLLBACK PROCEDURE
- Restart all services in dev mode
- Verify all three pillars (Database + Blockchain + API)

### Level 3: Nuclear Reset (20 minutes)
```bash
# Stop everything
killall node 2>/dev/null
./stop.sh

# Clean Docker (removes all Fabric containers/volumes)
docker system prune -af --volumes

# Restart from scratch
./start.sh
cd middleware-api && npm run dev &
cd ../frontend && npm run dev &
```

**WARNING**: Level 3 will DELETE all blockchain data. Only use if blockchain is corrupted.

---

## 📊 SUCCESS CRITERIA

After rollback, verify:

- ✅ Frontend accessible at `http://localhost:9002`
- ✅ Backend responding at `http://localhost:4000/health`
- ✅ Database queries working (Prisma can connect)
- ✅ Blockchain responding (Fabric network healthy)
- ✅ No error messages in logs

---

## 🎯 POST-ROLLBACK CHECKLIST

```
[ ] All services stopped successfully
[ ] Configs restored from backups
[ ] Fabric network restarted
[ ] Backend API responding
[ ] Frontend loading without errors
[ ] Verification script passes (3/3 tests)
[ ] No errors in browser console
[ ] No errors in backend logs
[ ] Database queries working
[ ] Blockchain transactions working
[ ] Users can log in
[ ] Dashboard loads correctly
```

---

## 🔐 BACKUP LOCATIONS

Before any deployment, ensure backups exist:

```
frontend/next.config.ts.backup          - Frontend config
middleware-api/.env.backup              - Backend environment
fabric-samples/test-network/config/     - Blockchain config
```

**Verify Backups**:
```bash
ls -lh frontend/next.config.ts.backup
ls -lh middleware-api/.env.backup
```

---

## 📞 EMERGENCY CONTACTS

- **DevOps Lead**: [Your contact info]
- **Database Admin**: [Your contact info]
- **Blockchain Team**: [Your contact info]

---

## 🧰 ROLLBACK SCRIPT (AUTOMATED)

Save this as `/workspaces/Healthlink_RPC/emergency_rollback.sh`:

```bash
#!/bin/bash

set -e  # Exit on any error

echo "========================================="
echo "🚨 EMERGENCY ROLLBACK IN PROGRESS"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop everything
echo -e "${YELLOW}[1/5] Stopping all services...${NC}"
killall node 2>/dev/null || true
cd /workspaces/Healthlink_RPC && ./stop.sh
echo -e "${GREEN}✓ Services stopped${NC}"

# Step 2: Restore configs
echo -e "${YELLOW}[2/5] Restoring configurations...${NC}"
cd /workspaces/Healthlink_RPC/frontend
if [ -f next.config.ts.backup ]; then
  cp next.config.ts.backup next.config.ts
  echo -e "${GREEN}✓ Frontend config restored${NC}"
else
  echo -e "${RED}⚠ No backup found for frontend config${NC}"
fi
cd ..

# Step 3: Restart Fabric network
echo -e "${YELLOW}[3/5] Restarting Fabric network (60s)...${NC}"
./start.sh
sleep 30
echo -e "${GREEN}✓ Fabric network started${NC}"

# Step 4: Restart backend
echo -e "${YELLOW}[4/5] Restarting backend API...${NC}"
cd middleware-api
npm run dev > nohup.out 2>&1 &
BACKEND_PID=$!
sleep 5
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Step 5: Restart frontend
echo -e "${YELLOW}[5/5] Restarting frontend...${NC}"
cd ../frontend
npm run dev > nohup.out 2>&1 &
FRONTEND_PID=$!
sleep 5
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "========================================="
echo "🎉 ROLLBACK COMPLETE"
echo "========================================="
echo "Frontend: http://localhost:9002 (PID: $FRONTEND_PID)"
echo "Backend:  http://localhost:4000 (PID: $BACKEND_PID)"
echo ""
echo "Next steps:"
echo "1. Verify services: cd middleware-api && node verify_full_stack.js"
echo "2. Check frontend: open http://localhost:9002"
echo "3. Check backend: curl http://localhost:4000/health"
echo ""
echo "To stop services: killall node"
echo "========================================="
```

**Usage**:
```bash
chmod +x emergency_rollback.sh
./emergency_rollback.sh
```

---

## 📝 NOTES

- **Always create backups** before deployment (`cp next.config.ts next.config.ts.backup`)
- **Test rollback procedure** in non-production environment first
- **Document any new issues** encountered during rollback
- **Keep this guide updated** with new scenarios

---

**Last Updated**: December 5, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
