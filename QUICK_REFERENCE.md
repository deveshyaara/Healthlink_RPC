# HealthLink Pro - Quick Reference Card

## 🚀 Getting Started (3 Steps)

```bash
# 1. Make scripts executable
chmod +x manage-healthlink.sh *.sh

# 2. Start the master manager
./manage-healthlink.sh

# 3. Follow the interactive menu
```

---

## 📋 Essential Commands

### Master Manager (Recommended)
```bash
./manage-healthlink.sh          # Interactive menu for everything
```

### Deployment
```bash
./deploy-chaincode-sequential.sh    # Deploy all chaincodes safely
```

### Testing
```bash
./test-chaincode-sequential.sh      # Test all chaincodes safely
```

### Monitoring
```bash
./monitor-resources.sh              # Real-time resource monitor
./monitor-resources.sh 5            # Update every 5 seconds
```

### Cleanup
```bash
./cleanup-resources.sh              # Interactive cleanup menu
```

---

## 🎯 Common Tasks

### Deploy Everything
```bash
./manage-healthlink.sh
# Select: 1. Start Fabric Network
# Select: 2. Deploy Chaincodes → Sequential Deployment
# Select: 4. Manage RPC Server → Start Server
```

### Run All Tests
```bash
./manage-healthlink.sh
# Select: 3. Run Tests → Sequential Testing
```

### Clean Up System
```bash
./manage-healthlink.sh
# Select: 5. Resource Management → Quick Cleanup
```

### Monitor While Testing
```bash
# Terminal 1
./monitor-resources.sh

# Terminal 2
./test-chaincode-sequential.sh
```

---

## 🔍 Check Status

### Network Status
```bash
docker ps | grep peer                # Check Fabric network
docker ps | grep dev-peer            # Check chaincodes
```

### RPC Server Status
```bash
lsof -i:4000                        # Check if RPC running
curl http://localhost:4000/api/health  # Health check
```

### System Resources
```bash
free -h                             # Memory
df -h                               # Disk
docker ps -q | wc -l                # Container count
```

---

## 🛠️ Troubleshooting

### System Crash / Out of Memory
```bash
./cleanup-resources.sh
# Select: 3. Full Network Cleanup
```

### RPC Server Won't Start
```bash
lsof -ti:4000 | xargs kill -9       # Kill port 4000
cd my-project/rpc-server
rm -rf wallet                       # Clean wallet
node addToWallet.js                 # Recreate wallet
npm start                           # Start server
```

### Chaincode Won't Deploy
```bash
./cleanup-resources.sh
# Select: 1. Quick Cleanup
./deploy-chaincode-sequential.sh    # Redeploy
```

### Test Failures
```bash
cat sequential-test-results.log     # Check test log
tail -50 my-project/rpc-server/rpc-server.log  # Check RPC log
```

---

## 📊 Resource Thresholds

| Resource | OK | Warning | Critical |
|----------|----|---------|---------| 
| Memory   | < 70% | 70-85% | > 85% |
| CPU      | < 70% | 70-85% | > 85% |
| Disk     | < 80% | 80-90% | > 90% |

**If Critical:** Run cleanup before proceeding!

---

## 📝 Log Files

```bash
# Test results
cat sequential-test-results.log

# Deployment log
cat deployment-sequential.log

# Resource usage
cat resource-monitor.log

# RPC server errors
tail -100 my-project/rpc-server/rpc-server.log
```

---

## 🔄 Typical Workflow

### Development Cycle
```bash
# 1. Start system
./manage-healthlink.sh → Start Network

# 2. Deploy code
./manage-healthlink.sh → Deploy Chaincodes → Sequential

# 3. Start server
./manage-healthlink.sh → Manage RPC Server → Start

# 4. Test
./manage-healthlink.sh → Run Tests → Sequential

# 5. Review results
cat sequential-test-results.log

# 6. Cleanup (end of day)
./cleanup-resources.sh → Quick Cleanup
```

---

## ⚡ Performance Tips

### Before Any Operation
```bash
# Check resources
free -h

# If < 1GB free, cleanup first
./cleanup-resources.sh
```

### During Operations
- Close unnecessary apps
- Monitor with `./monitor-resources.sh`
- Stop if memory > 90%

### After Operations
- Always run Quick Cleanup
- Review logs for errors
- Check disk space

---

## 🆘 Emergency Commands

### Kill Everything
```bash
pkill -f "node.*rpc-server"         # Kill RPC
docker rm -f $(docker ps -aq)       # Remove all containers
docker system prune -f              # Cleanup Docker
```

### Full Reset
```bash
cd fabric-samples/test-network
./network.sh down                   # Stop network
docker system prune -af --volumes   # Deep clean
./network.sh up createChannel       # Restart
```

### Check What's Running
```bash
docker ps                           # All containers
lsof -i -P -n | grep LISTEN        # All ports
ps aux | grep node                  # Node processes
```

---

## 📚 Documentation

```bash
# Master manager → View Documentation menu
./manage-healthlink.sh

# Or directly
cat RESOURCE_OPTIMIZED_GUIDE.md
cat SEQUENTIAL_TESTING_IMPLEMENTATION.md
```

---

## ✅ Validation Checklist

### After Deployment
- [ ] All 5 chaincodes deployed
- [ ] Chaincode containers running
- [ ] No deployment errors in log
- [ ] Memory usage < 75%

### After Testing
- [ ] All tests executed
- [ ] Pass rate > 90%
- [ ] Results logged
- [ ] No RPC errors

### After Cleanup
- [ ] No chaincode containers
- [ ] Memory freed
- [ ] RPC server stopped
- [ ] System responsive

---

## 🎓 Remember

1. **Sequential = Stable** (vs Parallel = Crashes)
2. **Monitor Before** (check resources first)
3. **Cleanup After** (free resources)
4. **Check Logs** (debug issues)
5. **Use Master Manager** (easiest way)

---

## 🆕 New vs Old

### ❌ Old (Crashes)
```bash
./deploy-contracts-simple.sh        # All at once
./test-phase1-api.sh                # All at once
```

### ✅ New (Stable)
```bash
./manage-healthlink.sh              # Master manager
# OR
./deploy-chaincode-sequential.sh    # One at a time
./test-chaincode-sequential.sh      # One at a time
```

---

## 💡 Pro Tips

1. Always use sequential scripts on systems with < 8GB RAM
2. Monitor resources during first deployment
3. Keep at least 1GB free memory
4. Cleanup before and after major operations
5. Use master manager for guided workflows

---

## 🔗 Script Relationships

```
manage-healthlink.sh (MASTER)
    ├── deploy-chaincode-sequential.sh
    ├── test-chaincode-sequential.sh
    ├── monitor-resources.sh
    └── cleanup-resources.sh
```

Use master manager to access everything!

---

**Need Help?**
1. Check logs
2. Run monitor
3. Try cleanup
4. Restart fresh

**Questions?**
- Read: `RESOURCE_OPTIMIZED_GUIDE.md`
- Read: `SEQUENTIAL_TESTING_IMPLEMENTATION.md`
