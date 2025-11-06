# HealthLink Pro - Resource-Optimized Operations Guide

## Overview

This guide explains how to run HealthLink Pro on **low-resource systems** without crashes. All scripts implement **permanent fixes** with proper resource management - no patch work.

## Problem Solved

**Issue:** System crashes when testing/deploying multiple chaincodes simultaneously due to insufficient resources (RAM/CPU).

**Solution:** Sequential execution with resource cleanup between operations.

---

## New Scripts (Permanent Implementation)

### 1. Master Management Script (Recommended)

**File:** `manage-healthlink.sh`

**Purpose:** Interactive menu-driven interface for all operations

**Usage:**
```bash
./manage-healthlink.sh
```

**Features:**
- System resource monitoring
- Network management
- Sequential chaincode deployment
- Sequential testing
- RPC server control
- Resource cleanup
- Documentation viewer

**Benefits:**
- One-stop solution for all operations
- Real-time resource monitoring
- Prevents system crashes
- User-friendly interface

---

### 2. Sequential Chaincode Deployment

**File:** `deploy-chaincode-sequential.sh`

**Purpose:** Deploy chaincodes one at a time with resource management

**Usage:**
```bash
./deploy-chaincode-sequential.sh
```

**Process:**
1. Checks Fabric network status
2. Cleans up existing resources
3. Deploys each chaincode sequentially:
   - healthlink-contract
   - patient-records
   - doctor-credentials
   - appointment-contract
   - prescription-contract
4. Waits 8 seconds between deployments
5. Cleans up after each deployment

**Advantages:**
- Prevents memory overload
- Stable deployment process
- Better error handling
- Detailed logging

---

### 3. Sequential Chaincode Testing

**File:** `test-chaincode-sequential.sh`

**Purpose:** Test each chaincode separately with complete isolation

**Usage:**
```bash
./test-chaincode-sequential.sh
```

**Process for Each Chaincode:**
1. Deploy only that specific chaincode
2. Start fresh RPC server
3. Run targeted tests
4. Stop RPC server
5. Remove chaincode container
6. Cleanup Docker resources
7. Wait 10 seconds for system recovery
8. Move to next chaincode

**Test Coverage:**
- Consent Management: 4 tests
- Patient Records: 5 tests
- Doctor Credentials: 5 tests
- Appointments: 4 tests
- Prescriptions: 4 tests
- **Total: 22 automated tests**

**Advantages:**
- Complete resource isolation
- No interference between tests
- Reliable results
- Detailed logging to `sequential-test-results.log`

---

### 4. Resource Monitor

**File:** `monitor-resources.sh`

**Purpose:** Real-time system resource monitoring

**Usage:**
```bash
./monitor-resources.sh [interval]

# Examples:
./monitor-resources.sh        # 2-second updates
./monitor-resources.sh 5      # 5-second updates
```

**Displays:**
- Memory usage (with warnings)
- CPU usage (with warnings)
- Docker container count
- Active chaincodes
- Disk usage
- Network status
- Top memory-consuming processes
- Performance recommendations

**Logs to:** `resource-monitor.log`

**Use Case:**
- Monitor during deployment
- Monitor during testing
- Identify resource bottlenecks
- Track system health

---

### 5. Resource Cleanup

**File:** `cleanup-resources.sh`

**Purpose:** Interactive resource cleanup with multiple options

**Usage:**
```bash
./cleanup-resources.sh
```

**Cleanup Options:**

1. **Quick Cleanup (Safe)**
   - Stop RPC server
   - Remove chaincode containers
   - Remove stopped containers
   - Prune Docker system

2. **Deep Cleanup (Aggressive)**
   - Everything in Quick Cleanup
   - Remove unused images
   - More thorough resource freeing

3. **Full Network Cleanup**
   - Stop entire Fabric network
   - Clean all resources
   - Restart network fresh

4. **Custom Cleanup**
   - Choose specific tasks
   - Fine-grained control

**Use Case:**
- Before deployment
- After testing
- When system is slow
- To free up memory

---

## Recommended Workflows

### First-Time Setup

```bash
# 1. Start the master script
./manage-healthlink.sh

# 2. Select: Start Fabric Network
# 3. Select: Deploy Chaincodes → Sequential Deployment
# 4. Select: Manage RPC Server → Start Server
# 5. Select: Run Tests → Sequential Testing
```

### Daily Development Workflow

```bash
# Start master manager
./manage-healthlink.sh

# Check system status (automatic on startup)
# If resources are low:
#   - Select: Resource Management → Quick Cleanup

# Deploy or test as needed
```

### Low Resource System Workflow

```bash
# 1. Clean resources first
./cleanup-resources.sh
# Select: Quick Cleanup

# 2. Monitor resources
./monitor-resources.sh 5 &
MONITOR_PID=$!

# 3. Deploy sequentially
./deploy-chaincode-sequential.sh

# 4. Test sequentially
./test-chaincode-sequential.sh

# 5. Stop monitor
kill $MONITOR_PID
```

### Testing Individual Chaincodes

If you want to test just one chaincode manually:

```bash
# 1. Clean up
./cleanup-resources.sh  # Select Quick Cleanup

# 2. Deploy only that chaincode
cd fabric-samples/test-network
./network.sh deployCC -ccn appointment-contract \
  -ccp ../chaincode/appointment-contract \
  -ccl javascript -ccv 1.0 -ccs 1

# 3. Start RPC server
cd ../../my-project/rpc-server
rm -rf wallet
node addToWallet.js
npm start &

# 4. Run specific tests
# (use curl commands for that specific chaincode)

# 5. Clean up when done
./cleanup-resources.sh
```

---

## System Requirements

### Minimum:
- **RAM:** 4GB (2GB available)
- **CPU:** 2 cores
- **Disk:** 20GB free space
- **Docker:** 20.10+
- **Node.js:** 14+

### Recommended:
- **RAM:** 8GB (4GB available)
- **CPU:** 4 cores
- **Disk:** 50GB free space

---

## Resource Usage Per Chaincode

Approximate memory usage:

| Component | Memory |
|-----------|--------|
| Fabric Network (base) | ~800MB |
| Single Chaincode Container | ~100-150MB |
| RPC Server | ~50-100MB |
| **Total per test cycle** | **~1GB** |

**Sequential vs Parallel:**
- **Parallel (5 chaincodes):** ~1.5GB
- **Sequential (1 at a time):** ~1GB per cycle

---

## Monitoring Best Practices

### Before Deployment/Testing:
```bash
# Check available resources
free -h
df -h

# If memory is low (< 1GB available):
./cleanup-resources.sh  # Quick Cleanup
```

### During Operations:
```bash
# In separate terminal:
./monitor-resources.sh 3

# Watch for warnings:
# - Memory > 75%: Consider cleanup
# - Memory > 90%: Stop and cleanup
# - CPU > 90%: Wait for processes to finish
```

### After Operations:
```bash
# Always cleanup
./cleanup-resources.sh  # Quick Cleanup

# Or from master script:
./manage-healthlink.sh
# Select: Resource Management → Quick Cleanup
```

---

## Troubleshooting

### System Crashes During Testing

**Solution:**
```bash
# Use sequential testing
./test-chaincode-sequential.sh
```

### Out of Memory Errors

**Solution:**
```bash
# 1. Cleanup
./cleanup-resources.sh

# 2. Close other applications

# 3. Use sequential operations only
```

### Chaincode Container Won't Start

**Solution:**
```bash
# 1. Check network
docker ps | grep peer

# 2. Remove old containers
./cleanup-resources.sh
# Select: Remove Chaincode Containers

# 3. Redeploy
./deploy-chaincode-sequential.sh
```

### RPC Server Won't Start

**Solution:**
```bash
# Check if port is in use
lsof -i:4000

# Kill process
lsof -ti:4000 | xargs kill -9

# Restart from master script
./manage-healthlink.sh
# Select: Manage RPC Server → Start Server
```

### Docker System Errors

**Solution:**
```bash
# Full cleanup and restart
./cleanup-resources.sh
# Select: Full Network Cleanup
```

---

## Log Files

All operations create detailed logs:

| File | Purpose |
|------|---------|
| `sequential-test-results.log` | Test execution results |
| `deployment-sequential.log` | Deployment progress |
| `resource-monitor.log` | Resource usage over time |
| `my-project/rpc-server/rpc-server.log` | RPC server logs |

**View logs:**
```bash
# Recent test results
tail -100 sequential-test-results.log

# Recent deployments
tail -100 deployment-sequential.log

# Resource usage trends
tail -100 resource-monitor.log

# RPC errors
tail -100 my-project/rpc-server/rpc-server.log
```

---

## Performance Tips

1. **Always use sequential operations on low-resource systems**
2. **Run cleanup before major operations**
3. **Monitor resources during operations**
4. **Close unnecessary applications**
5. **Use swap space if available**
6. **Restart Docker daemon periodically**

### Enable Swap (Linux):
```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Verify
free -h
```

---

## Comparison: Old vs New Approach

### Old Approach (Caused Crashes):
```bash
# Deploy all at once
./deploy-contracts-simple.sh

# Test all at once
./test-phase1-api.sh
./test-phase2-api.sh

# Result: System crash on low resources
```

### New Approach (Stable):
```bash
# Use master manager
./manage-healthlink.sh

# Or deploy sequentially
./deploy-chaincode-sequential.sh

# Test sequentially
./test-chaincode-sequential.sh

# Result: Stable operation, no crashes
```

---

## Quick Reference

### Essential Commands

```bash
# Master manager (recommended)
./manage-healthlink.sh

# Sequential deployment
./deploy-chaincode-sequential.sh

# Sequential testing
./test-chaincode-sequential.sh

# Monitor resources
./monitor-resources.sh

# Cleanup resources
./cleanup-resources.sh

# Check network
docker ps | grep peer

# Check RPC server
lsof -i:4000

# View recent tests
cat sequential-test-results.log
```

---

## Summary

✅ **Use sequential scripts for:**
- Low-resource systems
- Stable deployments
- Reliable testing
- Better debugging

✅ **Use master manager for:**
- Easy operation
- Integrated resource management
- Quick status checks
- One-stop solution

✅ **Always monitor resources when:**
- Available memory < 2GB
- Running on VMs
- Multiple Docker services running

✅ **Always cleanup:**
- Before major operations
- After testing
- When system is slow

---

## Support

For issues or questions:
1. Check logs first
2. Run resource monitor
3. Try cleanup and retry
4. Use sequential scripts
5. Check Docker status

**Remember:** Sequential execution prevents crashes on low-resource systems. This is a permanent solution, not a temporary patch.
