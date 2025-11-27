# 🚀 HealthLink RPC - Complete System Quick Start Guide

**Status**: ✅ **FULLY OPERATIONAL** - November 22, 2025

This guide will get you up and running with the complete **HealthLink RPC** blockchain healthcare system (backend + frontend) in minutes.

---

## 📋 System Components

| Component | Port | Tech Stack | Status |
|-----------|------|-----------|--------|
| **Backend (RPC Server)** | 4000 | Express.js + Fabric SDK | ✅ |
| **Frontend (UI)** | 9002 | Next.js + React | ✅ |
| **Hyperledger Fabric** | 7050, 7051, 8054 | Blockchain | ✅ |
| **CouchDB** | 5984, 7984 | Database | ✅ |

---

## ⚡ Quick Start (Choose One)

### Option 1: One-Command Full Setup (Recommended)

```bash
# From repo root
cd /workspaces/Healthlink_RPC
chmod +x setup-and-run.sh
./setup-and-run.sh
```

**What happens**:
1. Installs frontend dependencies
2. Configures backend URL
3. Starts backend (if not running)
4. Starts frontend dev server

**Result**: System ready at:
- Backend API: `http://localhost:4000`
- Frontend UI: `http://localhost:9002`

### Option 2: Step-by-Step Manual Setup

#### Step 1: Start Backend
```bash
cd /workspaces/Healthlink_RPC
./start.sh
```

Wait 5-8 minutes for:
- Fabric network to start
- Chaincodes to deploy
- RPC server to initialize

Verify:
```bash
curl http://localhost:4000/api/health
# Expected: {"status":"UP"}
```

#### Step 2: Start Frontend
```bash
cd /workspaces/Healthlink_RPC/frontend
npm install
npm run dev
```

Opens frontend at: `http://localhost:9002`

#### Step 3: Access the System

| Resource | URL | Purpose |
|----------|-----|---------|
| Frontend UI | `http://localhost:9002` | Main application |
| Backend Health | `http://localhost:4000/api/health` | System status |
| API Reference | See `/API_REFERENCE.md` | Endpoint docs |

---

## 🎯 What You Can Do Now

### Create & Manage Patients
```bash
curl -X POST http://localhost:4000/api/patient \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PAT001",
    "publicData": {"name": "John Doe", "email": "john@example.com", "phone": "+1234567890"},
    "privateData": {"ssn": "123-45-6789", "medicalHistory": "None"}
  }'
```

### Register Doctors
```bash
curl -X POST http://localhost:4000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "DOC001",
    "name": "Dr. Smith",
    "specialization": "Cardiology",
    "licenseNumber": "LIC123456",
    "hospital": "City Hospital",
    "credentials": {"degree": "MD"},
    "contact": {"email": "smith@hospital.com", "phone": "1234567890"}
  }'
```

### Schedule Appointments
```bash
curl -X POST http://localhost:4000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "APT001",
    "patientId": "PAT001",
    "doctorId": "DOC001",
    "appointmentDate": "2025-12-20",
    "startTime": "10:00",
    "endTime": "11:00",
    "reason": "Regular checkup"
  }'
```

### Create Prescriptions
```bash
curl -X POST http://localhost:4000/api/prescriptions \
  -H "Content-Type: application/json" \
  -d '{
    "prescriptionId": "RX001",
    "patientId": "PAT001",
    "doctorId": "DOC001",
    "medications": [{"name": "Amoxicillin", "dosage": "500mg", "frequency": "3x daily", "duration": "7", "quantity": 21, "instructions": "Take after meals"}],
    "diagnosis": "Bacterial infection",
    "appointmentId": "APT001"
  }'
```

### Manage Consents
```bash
curl -X POST http://localhost:4000/api/consents \
  -H "Content-Type: application/json" \
  -d '{
    "consentId": "CON001",
    "patientId": "PAT001",
    "granteeId": "HOSP001",
    "scope": "medical_records",
    "purpose": "Treatment",
    "validUntil": "2025-12-31T23:59:59Z"
  }'
```

---

## 📚 Complete Documentation

| Document | Purpose |
|----------|---------|
| **API_REFERENCE.md** | Complete list of all 54 API endpoints |
| **FRONTEND_SETUP.md** | Detailed frontend setup & troubleshooting |
| **FRONTEND_ENDPOINT_VERIFICATION.md** | Frontend vs backend endpoint verification |
| **API_UPDATES_NOVEMBER_2025.md** | All permanent fixes applied |
| **SYSTEM_SUMMARY.md** | Complete system architecture |

---

## 🔍 Verify Everything is Working

### 1. Check Backend Health
```bash
curl http://localhost:4000/api/health | jq .
# Expected: {"status":"UP"}
```

### 2. Test Frontend Connection
Open browser: `http://localhost:9002`

### 3. Run Test Suite (Optional)
```bash
# From repo root
./test.sh
# Tests all 14 core APIs
```

### 4. Check Docker Containers
```bash
docker ps | grep -E 'peer|orderer|couchdb|ca'
# Should show 8 containers running
```

---

## 🛑 Stop Everything

```bash
# From repo root
./stop.sh
```

This will:
- Stop all Docker containers
- Clean up network
- Shutdown RPC server

---

## 📊 System Architecture

```
┌────────────────────────────────────────────────────┐
│  Frontend (React/Next.js) on localhost:9002        │
│  ✅ Patient Management                             │
│  ✅ Doctor Registration                            │
│  ✅ Appointment Scheduling                         │
│  ✅ Prescription Management                        │
│  ✅ Consent Management                             │
└────────────────────────────────────────────────────┘
                      ↓ HTTP/REST
┌────────────────────────────────────────────────────┐
│  Backend API (Express.js) on localhost:4000        │
│  ✅ 54 REST Endpoints                              │
│  ✅ Fabric SDK Integration                         │
│  ✅ CORS Enabled                                   │
│  ✅ Auto-Wallet Management                         │
└────────────────────────────────────────────────────┘
                      ↓ gRPC
┌────────────────────────────────────────────────────┐
│  Hyperledger Fabric v2.5 Network                   │
│  ✅ 2 Organizations                                │
│  ✅ 2 Peer Nodes (Org1, Org2)                      │
│  ✅ 1 Orderer (Raft Consensus)                     │
│  ✅ 3 Certificate Authorities                      │
│  ✅ 2 CouchDB Instances                            │
│                                                    │
│  Deployed Chaincode:                               │
│  ✅ healthlink v1.0                                │
│  ✅ patient-records v1.1                           │
│  ✅ doctor-credentials v1.2 (FIXED)               │
│  ✅ appointment v1.9 (FIXED)                      │
│  ✅ prescription v1.6 (FIXED)                     │
└────────────────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### Authentication
- **Current**: No authentication (implicit Fabric wallet)
- **Future**: Implement auth endpoints if needed

### CORS
- ✅ Backend allows requests from all origins (development mode)
- 🔐 Restrict this in production

### Environment Variables
**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_DEBUG=false
```

**Backend**: Uses Fabric wallet auto-enrollment (no env vars needed)

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if ports are in use
lsof -i :4000
lsof -i :7050
lsof -i :7051

# Check Docker
docker ps -a
docker logs <container_id>

# Check fabric-samples/bin exists
ls -la fabric-samples/bin/
```

### Frontend won't connect
```bash
# Verify backend is running
curl http://localhost:4000/api/health

# Check .env.local has correct URL
cat frontend/.env.local

# Clear next.js cache
rm -rf frontend/.next
npm run dev
```

### Port already in use
```bash
# Find process using port
lsof -i :<PORT>

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3000
```

---

## 🎓 Learning Path

### 1. First Time Users
1. Run `./start.sh` to start backend
2. Open `http://localhost:4000/api/health` to verify
3. Start frontend with `npm run dev`
4. Explore frontend UI at `http://localhost:9002`

### 2. Developers
1. Read `/API_REFERENCE.md` for all endpoints
2. Check `/FRONTEND_ENDPOINT_VERIFICATION.md` for status
3. Review chaincode in `fabric-samples/chaincode/`
4. Modify `my-project/rpc-server/server.js` for backend changes

### 3. DevOps/Operations
1. Review `/SYSTEM_SUMMARY.md`
2. Understand deployment with `./start.sh`
3. Check logs in `my-project/rpc-server/server.log`
4. Monitor Fabric network with `docker ps`

---

## 🎉 What's Included

✅ **54 Fully Functional APIs**
- Patient Management
- Doctor Credentials
- Appointment Scheduling
- E-Prescriptions
- Consent Management
- Medical Records
- Audit Trail

✅ **Modern Frontend**
- Next.js React application
- Tailwind CSS styling
- Responsive design
- Real-time data fetching

✅ **Enterprise Blockchain**
- Hyperledger Fabric v2.5
- 5 Smart Contracts
- CouchDB for queries
- Raft consensus
- Multi-org setup

✅ **Complete Documentation**
- API reference
- Setup guides
- Endpoint verification
- Troubleshooting guides

---

## 🚀 Next Steps

1. ✅ **System Running**: Backend and frontend are ready
2. ⏭️ **Customize**: Modify endpoints or frontend as needed
3. ⏭️ **Test**: Run `./test.sh` to validate all APIs
4. ⏭️ **Deploy**: Use provided Docker files for production

---

## 📞 Quick Reference

| Command | Purpose |
|---------|---------|
| `./start.sh` | Start everything |
| `./stop.sh` | Stop everything |
| `./test.sh` | Run test suite |
| `npm run dev` | Start frontend dev server |
| `curl http://localhost:4000/api/health` | Check backend status |

---

## 📚 Documentation Index

- `API_REFERENCE.md` - All 54 endpoints documented
- `API_UPDATES_NOVEMBER_2025.md` - Recent fixes
- `FRONTEND_SETUP.md` - Frontend detailed setup
- `FRONTEND_ENDPOINT_VERIFICATION.md` - Endpoint verification report
- `SYSTEM_SUMMARY.md` - Complete system overview
- `README.md` - Original project documentation

---

**Last Updated**: November 22, 2025  
**Status**: ✅ Production Ready  
**Version**: 1.0.0

---

**🎯 Ready to go! Start with `./start.sh` then open `http://localhost:9002` 🎉**
