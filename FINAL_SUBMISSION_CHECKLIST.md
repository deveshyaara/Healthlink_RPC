# HealthLink Pro v2.0 - Final Submission Checklist

## 🎯 Purpose
This checklist guides a stranger to set up and run **HealthLink Pro v2.0** from scratch on a new machine. Follow each step exactly as written.

---

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / macOS 12+ / Windows 11 with WSL2
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: 20GB free space
- **Network**: Stable internet connection (for Docker images and npm packages)

### Required Software

#### 1. Docker & Docker Compose
**Why**: Runs Hyperledger Fabric network (peers, orderers, CAs)

```bash
# Check if installed
docker --version  # Should be 20.10.0+
docker-compose --version  # Should be 1.29.0+

# Install on Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker run hello-world
```

#### 2. Node.js & npm
**Why**: Runs Next.js frontend and Express middleware

```bash
# Check if installed
node --version  # Should be v18.0.0+ or v20.0.0+
npm --version   # Should be 9.0.0+

# Install using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

#### 3. Git
**Why**: Clone the repository

```bash
# Check if installed
git --version  # Should be 2.0.0+

# Install on Ubuntu/Debian
sudo apt update
sudo apt install git

# Verify
git --version
```

#### 4. Go (Optional, for chaincode development)
**Why**: Compile Hyperledger Fabric chaincodes

```bash
# Check if installed
go version  # Should be 1.20+

# Install
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
go version
```

---

## 🚀 Setup Instructions

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/deveshyaara/Healthlink_RPC.git
cd Healthlink_RPC

# Verify directory structure
ls -la
# Should see: fabric-samples/, frontend/, middleware-api/, start.sh, stop.sh, etc.
```

### Step 2: Configure Environment Variables

#### A. Middleware API Configuration

```bash
cd middleware-api

# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Required environment variables:**

```bash
# Server Configuration
NODE_ENV=development
PORT=4000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRY=24h

# Supabase Configuration (User Authentication)
# Get these from https://app.supabase.com after creating project
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here

# Hyperledger Fabric Configuration
FABRIC_NETWORK_CONFIG=/path/to/connection-profile.json
FABRIC_WALLET_PATH=./wallet
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=patient-records-contract

# Content-Addressable Storage
CAS_STORAGE_PATH=./storage/cas
CAS_ENCRYPTION_KEY=your-32-character-encryption-key
```

**⚠️ CRITICAL: Supabase Setup**

1. Go to https://app.supabase.com and create free account
2. Create new project: "healthlink-pro"
3. Wait 2 minutes for project initialization
4. Go to Project Settings → API
5. Copy **Project URL** → paste into `SUPABASE_URL`
6. Copy **service_role secret** → paste into `SUPABASE_SERVICE_KEY` (⚠️ NOT anon key)
7. Go to SQL Editor
8. Paste contents of `middleware-api/supabase-schema.sql`
9. Click "Run" (creates users and audit_log tables)
10. Verify tables: Go to Table Editor → should see `users` table

**Fallback Mode**: If you skip Supabase setup, system will use file-based storage (development only).

#### B. Frontend Configuration

```bash
cd ../frontend

# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local
nano .env.local
```

**Required environment variables:**

```bash
# Backend API URL (auto-detected in most cases)
NEXT_PUBLIC_API_URL=http://localhost:4000

# For GitHub Codespaces (auto-detected):
# NEXT_PUBLIC_API_URL=https://{codespace-name}-4000.github.dev
```

**Note**: The frontend auto-detects Codespace URLs, so this may not need manual configuration.

---

### Step 3: Install Dependencies

#### A. Middleware Dependencies

```bash
cd /path/to/Healthlink_RPC/middleware-api
npm install

# Expected output:
# added 500+ packages
# ✅ No critical vulnerabilities (5 high vulnerabilities are in dev dependencies, safe)
```

**If you see warnings about vulnerabilities:**
```bash
npm audit fix  # Fix automatically fixable issues
# Some vulnerabilities are in dev dependencies (testing/build tools) and don't affect production
```

#### B. Frontend Dependencies

```bash
cd /path/to/Healthlink_RPC/frontend
npm install

# Expected output:
# added 300+ packages
# ✅ No critical vulnerabilities
```

#### C. Fabric Binaries (Optional, if not present)

```bash
cd /path/to/Healthlink_RPC/fabric-samples/test-network
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.4 1.5.7
# Downloads: peer, orderer, configtxgen, cryptogen binaries
```

---

### Step 4: Start Hyperledger Fabric Network

```bash
cd /path/to/Healthlink_RPC/fabric-samples/test-network

# Clean any previous networks (if running before)
./network.sh down

# Start network with CouchDB for state database
./network.sh up createChannel -ca -s couchdb

# Expected output:
# ✅ Creating network "fabric_test" with the default driver
# ✅ Creating peer0.org1.example.com ... done
# ✅ Creating peer0.org2.example.com ... done
# ✅ Creating orderer.example.com ... done
# ✅ Channel 'mychannel' created

# Verify network is running
docker ps
# Should show 7+ containers:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
# - ca_org1
# - ca_org2
# - couchdb0
# - couchdb1
```

**Troubleshooting**:
- If port conflicts: Change ports in `docker-compose-test-net.yaml`
- If disk space issues: Run `docker system prune -a` (removes old images)

---

### Step 5: Deploy Chaincodes (Smart Contracts)

```bash
cd /path/to/Healthlink_RPC/fabric-samples/test-network

# Deploy patient records chaincode
./network.sh deployCC -ccn patient-records-contract -ccp ../chaincode/patient-records-contract -ccl go

# Expected output:
# ✅ Chaincode installed on peer0.org1
# ✅ Chaincode installed on peer0.org2
# ✅ Chaincode approved by Org1
# ✅ Chaincode approved by Org2
# ✅ Chaincode committed on channel 'mychannel'
# ✅ Chaincode definition committed

# Deploy additional chaincodes (optional, for full functionality)
./network.sh deployCC -ccn prescription-contract -ccp ../chaincode/prescription-contract -ccl go
./network.sh deployCC -ccn consent-contract -ccp ../chaincode/consent-contract -ccl go
./network.sh deployCC -ccn appointment-contract -ccp ../chaincode/appointment-contract -ccl go
./network.sh deployCC -ccn lab-test-contract -ccp ../chaincode/lab-test-contract -ccl go
./network.sh deployCC -ccn doctor-credentials-contract -ccp ../chaincode/doctor-credentials-contract -ccl go
```

**Troubleshooting**:
- If chaincode fails to build: Check Go version (`go version` should be 1.20+)
- If endorsement fails: Check peer logs (`docker logs peer0.org1.example.com`)

---

### Step 6: Start Middleware API

```bash
cd /path/to/Healthlink_RPC/middleware-api

# Start the API server
npm start

# Expected output:
# ✅ Supabase database connected successfully (if configured)
# ✅ Auth service using Supabase database
# ⚡ Middleware API server running on port 4000
# 🔗 Environment: development
# 📡 Fabric network: mychannel
```

**Alternative: Use project start script**
```bash
cd /path/to/Healthlink_RPC
./start.sh  # Starts middleware in background
```

**Verify API is running**:
```bash
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"2025-12-05T..."}
```

**Troubleshooting**:
- Port 4000 in use: Change `PORT` in `.env` to 4001
- Fabric connection fails: Check `FABRIC_NETWORK_CONFIG` path in `.env`
- Database errors: Verify Supabase credentials in `.env`

---

### Step 7: Start Frontend

```bash
cd /path/to/Healthlink_RPC/frontend

# Start Next.js development server
npm run dev

# Expected output:
# ✅ Local: http://localhost:9002
# ✅ Ready in 3.5s
```

**Verify frontend is running**:
- Open browser: http://localhost:9002
- Should see HealthLink Pro landing page with login/register buttons

**Troubleshooting**:
- Port 9002 in use: Change port in `package.json` → `"dev": "next dev -p 9003"`
- API connection fails: Check `NEXT_PUBLIC_API_URL` in `.env.local`

---

### Step 8: Create Admin User (First-Time Setup)

```bash
# Option 1: Use Supabase default admin (if you ran schema.sql)
# Email: admin@healthlink.com
# Password: Admin123! (⚠️ Change immediately)

# Option 2: Register via UI
# 1. Go to http://localhost:9002/register
# 2. Fill form:
#    - Name: Admin User
#    - Email: admin@yourdomain.com
#    - Password: SecurePassword123
#    - Role: admin
# 3. Click "Register"
# 4. Redirected to dashboard

# Option 3: Use API directly
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123",
    "role": "admin"
  }'
```

---

### Step 9: Test Complete System

#### A. Test Authentication

```bash
# Test registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "doctor@hospital.com",
    "password": "DoctorPass123",
    "role": "doctor"
  }'

# Expected response:
# {
#   "status": "success",
#   "statusCode": 201,
#   "message": "User registered successfully",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": {
#       "userId": "user1",
#       "email": "doctor@hospital.com",
#       "role": "doctor",
#       "name": "Dr. Smith"
#     }
#   }
# }

# Test login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "password": "DoctorPass123"
  }'

# Save the token from response for next steps
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### B. Test Blockchain Operations

```bash
# Create medical record
curl -X POST http://localhost:4000/api/medical-records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "recordId": "record123",
    "doctorId": "doctor1",
    "recordType": "consultation",
    "ipfsHash": "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
    "metadata": {
      "diagnosis": "Annual checkup",
      "notes": "Patient is healthy"
    }
  }'

# Expected response:
# {
#   "status": "success",
#   "message": "Medical record created successfully",
#   "data": {
#     "recordId": "record123",
#     "txId": "abc123...",
#     "timestamp": "2025-12-05T10:30:00Z"
#   }
# }

# Fetch medical record
curl -X GET http://localhost:4000/api/medical-records/record123 \
  -H "Authorization: Bearer $TOKEN"
```

#### C. Test Frontend UI

1. **Open browser**: http://localhost:9002
2. **Login**: Use credentials from Step 9A
3. **Navigate to Dashboard**: Should see overview stats
4. **Test Medical Records**:
   - Click "Medical Records" in sidebar
   - Click "Create New Record"
   - Fill form and submit
   - Verify record appears in list
5. **Test Prescriptions**: Create and view prescriptions
6. **Test Consents**: Grant and revoke consents
7. **Test Profile**: Update user profile

---

## 🔍 Verification Checklist

Mark each item when verified:

### Infrastructure
- [ ] Docker containers running (7+ containers): `docker ps`
- [ ] Fabric network accessible: `docker logs peer0.org1.example.com | grep "Joined channel"`
- [ ] CouchDB accessible: http://localhost:5984/_utils (admin/adminpw)

### Backend
- [ ] Middleware API running: `curl http://localhost:4000/health`
- [ ] Supabase connected: Check middleware logs for "✅ Supabase database connected"
- [ ] Fabric gateway connected: Check logs for "✅ Connected to channel: mychannel"
- [ ] JWT tokens working: Login returns valid token

### Frontend
- [ ] Next.js server running: http://localhost:9002
- [ ] Login page loads: http://localhost:9002/login
- [ ] Registration works: Can create new user
- [ ] Dashboard accessible: Shows user name after login
- [ ] API calls working: Medical records page shows data

### Database
- [ ] Supabase users table has records: Check in Supabase Dashboard → Table Editor
- [ ] Fabric ledger has blocks: `docker exec peer0.org1.example.com peer channel getinfo -c mychannel`
- [ ] CAS storage has files: `ls -la middleware-api/storage/cas/`

### Security
- [ ] JWT tokens expire after 24 hours
- [ ] Passwords hashed in database (check Supabase users table)
- [ ] Unauthorized requests return 401
- [ ] CORS configured correctly (frontend can call backend)

---

## 📊 System Monitoring

### Check Logs

```bash
# Middleware logs
cd middleware-api
npm run logs  # or: tail -f logs/app.log

# Fabric peer logs
docker logs -f peer0.org1.example.com

# Fabric orderer logs
docker logs -f orderer.example.com

# Frontend logs (browser console)
# Open DevTools (F12) → Console tab
```

### Health Checks

```bash
# Middleware health
curl http://localhost:4000/health

# Fabric peer health
curl http://localhost:7051/healthz

# Frontend health
curl http://localhost:9002
```

### Resource Usage

```bash
# Docker stats (CPU, memory usage)
docker stats

# Disk usage
docker system df
du -sh /path/to/Healthlink_RPC

# Network ports
netstat -tulpn | grep -E '4000|9002|7051|7050'
```

---

## 🛑 Stopping the System

### Graceful Shutdown (Recommended)

```bash
# Stop all services using project script
cd /path/to/Healthlink_RPC
./stop.sh

# Or manually:
cd frontend
npm run stop  # or Ctrl+C

cd ../middleware-api
npm run stop  # or Ctrl+C

cd ../fabric-samples/test-network
./network.sh down
```

### Force Stop (Emergency)

```bash
# Kill all Node.js processes
pkill -f node

# Stop and remove all Docker containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Clean Docker networks
docker network prune -f
```

---

## 🧹 Cleanup & Reset

### Full System Reset

```bash
cd /path/to/Healthlink_RPC

# 1. Stop all services
./stop.sh

# 2. Clean Docker
docker system prune -a --volumes -f

# 3. Remove node_modules
rm -rf middleware-api/node_modules
rm -rf frontend/node_modules

# 4. Remove generated files
rm -rf middleware-api/wallet/*
rm -rf middleware-api/storage/cas/*
rm -rf middleware-api/data/users.json

# 5. Clean Fabric network
cd fabric-samples/test-network
./network.sh down
rm -rf organizations/ channel-artifacts/

# 6. Reset Supabase (optional)
# Go to Supabase Dashboard → SQL Editor → Run:
# DROP TABLE user_audit_log;
# DROP TABLE users;
# Then re-run supabase-schema.sql

# 7. Reinstall dependencies
cd ../../middleware-api && npm install
cd ../frontend && npm install

# 8. Restart from Step 4
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Find process using port
lsof -i :4000
# or
netstat -tulpn | grep 4000

# Kill process
kill -9 <PID>

# Or change port in .env:
PORT=4001
```

### Issue 2: Docker Permission Denied

**Symptom**: `Got permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Restart Docker
sudo systemctl restart docker
```

### Issue 3: Fabric Network Fails to Start

**Symptom**: `Error: error getting endorser client for channel: endorser client failed to connect`

**Solution**:
```bash
# Clean and restart network
cd fabric-samples/test-network
./network.sh down
docker system prune -f
./network.sh up createChannel -ca -s couchdb

# Check logs
docker logs peer0.org1.example.com
```

### Issue 4: Supabase Connection Fails

**Symptom**: `⚠️ Supabase credentials not configured`

**Solution**:
1. Verify `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Check URL format: `https://xxxxx.supabase.co` (no trailing slash)
3. Verify service role key (not anon key): Starts with `eyJhbGciOiJIUzI1NiI...`
4. Test connection in Supabase Dashboard → API → Test API

**Fallback**: System will use file-based storage if Supabase unavailable

### Issue 5: Chaincode Deployment Fails

**Symptom**: `Error: chaincode install failed with status: 500`

**Solution**:
```bash
# Check Go installation
go version  # Should be 1.20+

# Clean chaincode cache
cd fabric-samples/test-network
./network.sh down
rm -rf organizations/

# Rebuild chaincode
cd ../chaincode/patient-records-contract
go mod tidy
go build

# Redeploy
cd ../../test-network
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn patient-records-contract -ccp ../chaincode/patient-records-contract -ccl go
```

### Issue 6: Frontend Can't Connect to Backend

**Symptom**: `Failed to fetch` or `Network Error` in browser console

**Solution**:
1. Check middleware is running: `curl http://localhost:4000/health`
2. Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Check CORS configuration in `middleware-api/src/index.js`
4. Disable browser extensions (ad blockers may block localhost)

### Issue 7: JWT Token Invalid/Expired

**Symptom**: `401 Unauthorized: Invalid or expired token`

**Solution**:
```bash
# 1. Check JWT_SECRET matches in .env
# 2. Verify token not expired (24-hour expiry)
# 3. Clear localStorage and login again
localStorage.removeItem('auth_token')

# 4. Test token manually:
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📈 Performance Optimization

### For Development
- **Reduce Docker resources**: Edit `docker-compose-test-net.yaml` to limit CPU/RAM
- **Disable unused chaincodes**: Deploy only patient-records-contract
- **Use file-based auth**: Skip Supabase setup for faster iteration

### For Production
- **Enable caching**: Configure Redis for API responses
- **Scale horizontally**: Deploy multiple middleware instances behind load balancer
- **Optimize Fabric**: Add more peers for higher throughput
- **CDN for frontend**: Deploy to Vercel/Netlify for edge caching

---

## 📚 Additional Resources

### Documentation
- **Hyperledger Fabric**: https://hyperledger-fabric.readthedocs.io/
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Express.js**: https://expressjs.com/

### Project Files
- **Architecture Diagram**: `/ARCHITECTURE_DIAGRAM.md`
- **Supabase Setup Guide**: `/middleware-api/SUPABASE_INTEGRATION_GUIDE.md`
- **API Documentation**: `/middleware-api/README.md`
- **Frontend Documentation**: `/frontend/README.md`

### Support
- **GitHub Issues**: https://github.com/deveshyaara/Healthlink_RPC/issues
- **Email**: deveshyaara@example.com (replace with actual email)

---

## ✅ Success Criteria

You have successfully set up HealthLink Pro v2.0 when:

1. ✅ All Docker containers running (7+ containers)
2. ✅ Middleware API responds at http://localhost:4000/health
3. ✅ Frontend loads at http://localhost:9002
4. ✅ Can register new user via UI
5. ✅ Can login and see dashboard
6. ✅ Can create and view medical records
7. ✅ Supabase shows user records (or file-based storage works)
8. ✅ Blockchain transactions visible in peer logs

---

## 🎓 Next Steps After Setup

1. **Explore the UI**: Test all features (records, prescriptions, consents, appointments)
2. **Read the Architecture**: Review `/ARCHITECTURE_DIAGRAM.md` for system design
3. **Review Code**: Check JSDoc comments in core services:
   - `middleware-api/src/services/auth.service.js`
   - `middleware-api/src/services/db.service.js`
   - `middleware-api/src/services/fabricGateway.service.js`
   - `frontend/src/lib/api-client.ts`
4. **Customize**: Modify chaincodes for your use case
5. **Deploy**: Follow production deployment guide in `ARCHITECTURE_DIAGRAM.md`

---

**Version**: 2.0  
**Last Updated**: December 5, 2025  
**Estimated Setup Time**: 45-60 minutes (first time)

**Good luck! 🚀**
