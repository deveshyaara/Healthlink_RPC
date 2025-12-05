# 🚀 GO LIVE - PRODUCTION DEPLOYMENT

**HealthLink Pro v2.0**  
**Date**: December 5, 2025  
**Status**: ✅ **READY FOR PRODUCTION**

---

## 🎯 DEPLOYMENT IN 3 COMMANDS

```bash
# 1. Navigate to project
cd /workspaces/Healthlink_RPC

# 2. Deploy everything
./deploy.sh

# 3. Open browser
# Navigate to: http://localhost:9002
```

**That's it! HealthLink Pro is now live! 🎉**

---

## 📋 WHAT deploy.sh DOES

The automated deployment script (`deploy.sh`) performs these steps:

1. ✅ **Pre-flight Checks** - Verifies directories and port availability
2. 🌐 **Start Fabric Network** - Launches Hyperledger Fabric blockchain (30s initialization)
3. �� **Create Log Directories** - Sets up logging infrastructure
4. 🔧 **Start Backend API** - Launches Express API on port 4000
5. 🎨 **Start Frontend** - Launches Next.js app on port 9002
6. 🧪 **Verify Deployment** - Runs Trident Test (Database + Blockchain + API)

**Total Time**: ~60 seconds

---

## 🧪 VERIFICATION

After deployment, the script automatically runs the **Trident Test**:

```
🔱 THE TRIDENT TEST
Testing Database + Blockchain + API connectivity...

⏳ Testing database connection...
✅ Database: Connected

⏳ Testing blockchain connection...
✅ Blockchain: Connected

⏳ Testing API server...
✅ API Server: Running on port 4000

========================================
FINAL VERDICT: ✅ ALL SYSTEMS OPERATIONAL
========================================
```

**Manual Verification**:
```bash
# Re-run Trident Test anytime
cd middleware-api
node verify_full_stack.js

# Test backend health
curl http://localhost:4000/health

# Test frontend
curl -I http://localhost:9002
```

---

## 📊 MONITORING

### Real-Time Logs

```bash
# Backend logs (real-time)
tail -f middleware-api/logs/backend.log

# Frontend logs (real-time)
tail -f frontend/logs/frontend.log

# Both logs simultaneously
tail -f middleware-api/logs/backend.log frontend/logs/frontend.log
```

### Process Status

```bash
# Check if services are running
ps aux | grep node

# Check specific service
ps -p $(cat middleware-api/backend.pid)
ps -p $(cat frontend/frontend.pid)

# Check ports
lsof -i :4000  # Backend
lsof -i :9002  # Frontend
```

---

## 🛑 STOPPING SERVICES

### Quick Stop (All Services)

```bash
killall node
```

### Graceful Stop (Individual Services)

```bash
# Stop backend
kill $(cat middleware-api/backend.pid)

# Stop frontend
kill $(cat frontend/frontend.pid)

# Stop Fabric network
./stop.sh
```

### Complete Shutdown

```bash
cd /workspaces/Healthlink_RPC

# Stop all node processes
killall node

# Stop Fabric network
./stop.sh

# Clean up PID files
rm -f middleware-api/backend.pid frontend/frontend.pid

echo "✓ All services stopped"
```

---

## 🚨 TROUBLESHOOTING

### Issue: Port Already in Use

**Symptoms**: "Port 4000/9002 is already in use"

**Fix**:
```bash
# Kill process on port 4000 (backend)
lsof -ti:4000 | xargs kill -9

# Kill process on port 9002 (frontend)
lsof -ti:9002 | xargs kill -9

# Then re-run deploy.sh
./deploy.sh
```

### Issue: Fabric Network Not Starting

**Symptoms**: "Blockchain: Disconnected" in verification

**Fix**:
```bash
# Stop existing network
./stop.sh

# Clean Docker (removes all Fabric containers)
docker system prune -af

# Restart network
./start.sh
sleep 30

# Restart backend to reconnect
killall node
cd middleware-api && npm run dev &
```

### Issue: Database Connection Failed

**Symptoms**: "Database: Disconnected" in verification

**Fix**:
```bash
cd middleware-api

# Regenerate Prisma Client
npx prisma generate

# Test connection
npx prisma db pull

# Restart backend
killall node
npm run dev &
```

### Issue: Frontend Shows White Screen

**Symptoms**: Frontend loads but shows blank page

**Fix**:
```bash
cd frontend

# Restore config backup (if exists)
if [ -f next.config.ts.backup ]; then
  mv next.config.ts.backup next.config.ts
fi

# Rebuild frontend
npm run build

# Restart
killall node
npm run start &
```

---

## 📁 KEY FILES

| File | Purpose | Usage |
|------|---------|-------|
| `deploy.sh` | **Automated deployment** | `./deploy.sh` |
| `verify_full_stack.js` | **Trident test** | `cd middleware-api && node verify_full_stack.js` |
| `start.sh` | Start Fabric network | `./start.sh` |
| `stop.sh` | Stop Fabric network | `./stop.sh` |
| `DEPLOYMENT_SUMMARY.md` | Comprehensive guide | Read for full details |
| `PRODUCTION_STARTUP.md` | Startup options | PM2, Docker, nohup |
| `ROLLBACK.md` | Emergency procedures | For deployment failures |

---

## 🔗 PRODUCTION URLS

| Service | URL | Port |
|---------|-----|------|
| **Frontend** | `http://localhost:9002` | 9002 |
| **Backend API** | `http://localhost:4000` | 4000 |
| **API Health** | `http://localhost:4000/health` | 4000 |
| **API Docs** | `http://localhost:4000/api-docs` | 4000 |

---

## ✅ POST-DEPLOYMENT CHECKLIST

```
[ ] Run ./deploy.sh successfully
[ ] Trident test passes (3/3 tests)
[ ] Frontend accessible: http://localhost:9002
[ ] Backend health: curl http://localhost:4000/health
[ ] No errors in backend logs
[ ] No errors in frontend logs
[ ] Login page loads correctly
[ ] Can log in with test credentials
[ ] Dashboard displays correctly
[ ] Patient records accessible
[ ] Prescriptions can be created
[ ] Lab tests display correctly
[ ] Blockchain events working
[ ] No errors in browser console (F12)
```

---

## 🎯 QUICK COMMANDS REFERENCE

```bash
# Deploy everything
./deploy.sh

# Verify deployment
cd middleware-api && node verify_full_stack.js

# Stop all services
killall node

# View backend logs
tail -f middleware-api/logs/backend.log

# View frontend logs
tail -f frontend/logs/frontend.log

# Restart backend only
kill $(cat middleware-api/backend.pid)
cd middleware-api && nohup npm run dev > logs/backend.log 2>&1 &

# Restart frontend only
kill $(cat frontend/frontend.pid)
cd frontend && nohup npm run start > logs/frontend.log 2>&1 &

# Emergency rollback
# See ROLLBACK.md
```

---

## 🆘 EMERGENCY ROLLBACK

If deployment fails completely:

```bash
cd /workspaces/Healthlink_RPC

# Stop everything
killall node 2>/dev/null
./stop.sh

# Restore frontend config
cd frontend
if [ -f next.config.ts.backup ]; then
  mv next.config.ts.backup next.config.ts
fi

# Restart Fabric network
cd ..
./start.sh
sleep 30

# Restart services in dev mode
cd middleware-api && npm run dev &
cd ../frontend && npm run dev &

echo "✓ Rollback complete - Running in dev mode"
```

**Complete Rollback Guide**: See `ROLLBACK.md`

---

## 📞 NEED HELP?

1. **Check Logs First**:
   ```bash
   tail -50 middleware-api/logs/backend.log
   tail -50 frontend/logs/frontend.log
   ```

2. **Run Verification**:
   ```bash
   cd middleware-api
   node verify_full_stack.js
   ```

3. **Check Documentation**:
   - `DEPLOYMENT_SUMMARY.md` - Comprehensive deployment guide
   - `PRODUCTION_STARTUP.md` - Alternative deployment methods
   - `ROLLBACK.md` - Emergency procedures
   - `DEPLOYMENT_GUIDE.md` - Detailed troubleshooting

4. **Common Issues**:
   - Port conflicts → Kill processes on ports 4000/9002
   - Fabric network down → `./stop.sh && ./start.sh`
   - Database connection → `npx prisma generate`
   - Frontend issues → Restore config backup

---

## 🎉 SUCCESS!

When you see this in your browser at `http://localhost:9002`:

```
✅ HealthLink Pro Login Page
✅ No errors in console (F12)
✅ Can log in and access dashboard
```

**Congratulations! HealthLink Pro v2.0 is LIVE! 🚀**

---

**Last Updated**: December 5, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready

**Quick Start**: `./deploy.sh`
