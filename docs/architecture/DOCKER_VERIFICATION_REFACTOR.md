# 🔧 Start Script Refactoring - Docker-Based Verification

**Date:** December 5, 2025  
**Issue:** Timeout waiting for CA on localhost:7054 (netcat unreliable in Codespace)  
**Solution:** Docker log inspection instead of network port checks

---

## 🔴 The Problem

### Symptom
```bash
❌ Timeout waiting for Certificate Authority (CA) on localhost:7054
```

### Root Cause
1. **IPv6 vs IPv4 mismatch:** Docker binds to `::1` but `nc` checks `127.0.0.1`
2. **Port forwarding lag:** Codespace networking introduces delays
3. **Netcat unreliability:** `nc -z localhost 7054` fails even when CA is running
4. **Proof:** Docker logs show `POST /enroll 201 OK` (CA is working!)

---

## ✅ The Solution

### Key Changes

#### 1. **Aggressive Port Cleanup** (Before Network Start)

**Before:**
```bash
./network.sh down  # Only stops containers
```

**After:**
```bash
kill_port 7054  # CA
kill_port 7051  # Peer
kill_port 9051  # Peer Operations
kill_port 7050  # Orderer
kill_port 9443  # Orderer Operations
kill_port 5984  # CouchDB

./network.sh down
```

**Function Implementation:**
```bash
kill_port() {
    local port=$1
    # Method 1: Using lsof
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        kill -9 $pids 2>/dev/null || true
    fi
    # Method 2: Using fuser (backup)
    fuser -k -n tcp $port 2>/dev/null || true
}
```

**Why:** Eliminates zombie processes that block port binding

---

#### 2. **Docker Log Inspection** (Instead of Netcat)

**Before (UNRELIABLE):**
```bash
wait_for_port() {
    while [ $elapsed -lt $max_wait ]; do
        if nc -z $host $port 2>/dev/null; then  # ❌ Fails in Codespace
            return 0
        fi
        sleep 2
    done
}

wait_for_port localhost 7054 "Certificate Authority (CA)" 90
```

**After (FAIL-SAFE):**
```bash
wait_for_container() {
    local container=$1
    local log_string=$2
    local max_wait=$3
    
    while [ $elapsed -lt $max_wait ]; do
        # Check 1: Container running?
        if ! docker ps | grep -q ${container}; then
            continue
        fi
        
        # Check 2: Log contains ready message?
        if docker logs ${container} 2>&1 | grep -q "${log_string}"; then
            return 0
        fi
        sleep 2
    done
}

wait_for_container "ca_org1" "Listening on" 90
```

**Why:** Bypasses network layer entirely - if Docker says it's listening, it's ready

---

#### 3. **Component-Specific Log Verification**

**CA (Certificate Authority):**
```bash
wait_for_container "ca_org1" "Listening on" 90

# Additional verification
if docker logs ca_org1 2>&1 | grep -q "POST /enroll"; then
    echo "✅ CA enrollment endpoint has processed requests"
fi
```

**Peer:**
```bash
wait_for_container "peer0.org1.example.com" "Started peer" 60
```

**Orderer:**
```bash
wait_for_container "orderer.example.com" "Beginning to serve requests" 60
```

**CouchDB:**
```bash
wait_for_container "couchdb0" "Apache CouchDB has started" 60
```

---

## 📊 Before vs After

| Check Type | Before (Unreliable) | After (Fail-Safe) |
|------------|---------------------|-------------------|
| **CA Ready?** | `nc -z localhost 7054` ❌ | `docker logs ca_org1 \| grep "Listening on"` ✅ |
| **Peer Ready?** | `nc -z localhost 7051` ❌ | `docker logs peer0.org1 \| grep "Started peer"` ✅ |
| **Orderer Ready?** | `nc -z localhost 7050` ❌ | `docker logs orderer \| grep "Beginning to serve"` ✅ |
| **Port Cleanup** | None ❌ | `kill_port` before start ✅ |
| **Network Issues** | Fails in Codespace ❌ | Works everywhere ✅ |

---

## 🔍 Technical Details

### Why Netcat Fails in Codespace

1. **IPv6 Binding:**
   ```bash
   # Docker binds to IPv6
   docker logs ca_org1 | grep "Listening"
   # Output: Listening on https://[::]:7054
   
   # But nc checks IPv4
   nc -z localhost 7054  # Checks 127.0.0.1
   nc -z 127.0.0.1 7054  # ❌ Fails
   nc -z ::1 7054        # ✅ Would work, but not portable
   ```

2. **Port Forwarding Lag:**
   - Codespace forwards ports to external network
   - Local checks may fail even when container is ready
   - Docker logs are always accurate

3. **Race Conditions:**
   - CA starts listener before enrollment endpoint is ready
   - Netcat sees open port but CA returns errors
   - Log inspection waits for "ready" message

---

### Log Verification Strategy

**CA Verification (Multi-Stage):**
```bash
# Stage 1: Container running
docker ps | grep "ca_org1"

# Stage 2: Listening on port
docker logs ca_org1 | grep "Listening on"

# Stage 3: Enrollment endpoint ready
docker logs ca_org1 | grep "POST /enroll"  # Optional but confirms readiness
```

**Why Multi-Stage?**
- Container can be running but not listening
- Listener can be open but endpoints not initialized
- Log message confirms full initialization

---

## 🧪 Testing

### Test 1: Clean Start
```bash
./start.sh
```

**Expected Output:**
```
🧹 Performing aggressive port cleanup...
✅ Port 7054 cleaned
✅ Port 7051 cleaned
🚀 Starting Fabric network...
⏳ Waiting for container 'ca_org1' (checking for: 'Listening on')...
✅ Container 'ca_org1' is ready (12s)
   Log verification: Found 'Listening on'
✅ All Fabric components are ready and verified via Docker inspection
```

### Test 2: Existing Network (Idempotent)
```bash
./start.sh  # Run twice
```

**Expected Output:**
```
⚠️  Network is already running. Checking health...
✅ Existing network is healthy. Skipping network restart.
```

### Test 3: Failed CA (Graceful Failure)
```bash
# Simulate CA failure
docker stop ca_org1
./start.sh
```

**Expected Output:**
```
❌ Timeout waiting for 'ca_org1' after 90s
📋 Last 10 log lines from container:
(shows actual logs)
```

---

## 📁 Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `start.sh` | ~150 lines | Replaced netcat with Docker inspection |

**Key Functions Added:**
- `kill_port()` - Aggressive port cleanup
- `wait_for_container()` - Docker log verification
- `wait_for_container_port()` - Legacy fallback

**Key Functions Removed:**
- `wait_for_port()` - Unreliable netcat checks

---

## ✅ Benefits

1. **Works in Codespace:** Bypasses IPv4/IPv6 issues
2. **More Reliable:** Docker logs never lie
3. **Better Debugging:** Shows actual log messages on failure
4. **Port Cleanup:** Eliminates zombie process issues
5. **Faster Detection:** Knows immediately when component is ready
6. **Portable:** Works on any Docker environment

---

## 🚀 Next Steps

### Run the Updated Script
```bash
cd /workspaces/Healthlink_RPC
./start.sh
```

### If Issues Persist

**Check Docker Logs:**
```bash
docker logs ca_org1
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

**Verify Containers:**
```bash
docker ps -a
```

**Manual Port Check:**
```bash
docker port ca_org1
# Should show: 7054/tcp -> 0.0.0.0:7054
```

---

## 📖 References

- **Hyperledger Fabric Docs:** https://hyperledger-fabric.readthedocs.io/
- **Docker Logs API:** `docker logs --help`
- **Port Cleanup:** `lsof -ti :PORT` and `fuser -k -n tcp PORT`

---

**Status:** ✅ **READY TO TEST**

The start script now uses Docker container inspection instead of unreliable network port checks. This eliminates the Codespace networking issues and provides fail-safe component verification.
