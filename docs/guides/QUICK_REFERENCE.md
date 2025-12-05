# HealthLink Quick Reference Card

## 🚀 System URLs

| Service | URL | Status |
|---------|-----|--------|
| **Test Interface** | http://localhost:9002/blockchain-test | ✅ Interactive UI |
| **Frontend** | http://localhost:9002 | ✅ Next.js App |
| **API Server** | http://localhost:3000 | ✅ REST API |
| **WebSocket** | ws://localhost:4001/ws | ✅ Real-time Events |
| **Health Check** | http://localhost:3000/health | ✅ Status Monitor |
| **API Docs** | http://localhost:3000/api/v1 | ✅ Endpoint List |

## 🎯 Common Tasks

### 1️⃣ Register a New User
```bash
curl -X POST http://localhost:3000/api/v1/wallet/register \
  -H 'Content-Type: application/json' \
  -d '{"userId": "USER_ID", "role": "client", "affiliation": "org1.department1"}'
```

### 2️⃣ Create Patient Record
```bash
curl -X POST http://localhost:3000/api/v1/transactions/private \
  -H 'Content-Type: application/json' \
  -d '{
    "contractName": "healthlink",
    "functionName": "CreatePatient",
    "transientData": {
      "patientDetails": "{\"name\":\"Patient Name\",\"dob\":\"1990-01-01\",\"bloodType\":\"O+\"}"
    },
    "args": ["PATIENT_ID"],
    "userId": "doctor1"
  }'
```

### 3️⃣ Create Consent
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H 'Content-Type: application/json' \
  -d '{
    "contractName": "healthlink",
    "functionName": "CreateConsent",
    "args": ["CONSENT_ID", "PATIENT_ID", "doctor1", "read", "treatment", "2025-12-31"],
    "userId": "doctor1",
    "async": false
  }'
```

### 4️⃣ Query Consent
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "contractName": "healthlink",
    "functionName": "GetConsent",
    "args": ["CONSENT_ID"],
    "userId": "doctor1"
  }'
```

### 5️⃣ Get Patient Consents
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "contractName": "healthlink",
    "functionName": "GetConsentsByPatient",
    "args": ["PATIENT_ID"],
    "userId": "doctor1"
  }'
```

### 6️⃣ List All Identities
```bash
curl http://localhost:3000/api/v1/wallet/identities
```

## 📊 System Commands

### Check Status
```bash
./demo.sh
```

### View Logs
```bash
# Middleware API logs
tail -f middleware-api/logs/combined.log

# Blockchain logs
docker logs -f peer0.org1.example.com
```

### Restart Services
```bash
# Restart middleware API
cd middleware-api
pkill -9 -f "node src/server.js"
npm start

# Restart frontend
cd frontend
pkill -9 -f "next dev"
npm run dev
```

## 🔧 Troubleshooting

### Middleware API not responding
```bash
cd /workspaces/Healthlink_RPC/middleware-api
pkill -9 -f "node src/server.js"
npm start
```

### Frontend not loading
```bash
cd /workspaces/Healthlink_RPC/frontend
pkill -9 -f "next dev"
npm run dev
```

### Blockchain network down
```bash
cd /workspaces/Healthlink_RPC/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
```

## 🎮 Using the Web Interface

1. **Open**: http://localhost:9002/blockchain-test
2. **Connect WebSocket**: Click "Connect WebSocket" button
3. **Select Identity**: Choose from dropdown (admin, doctor1, nurse1)
4. **Create Patient**: Fill form and click "Create Patient Record"
5. **Manage Consents**: Use Consent tab for operations
6. **Monitor Events**: Watch Events tab for real-time updates
7. **View Results**: Check Results tab for API responses

## 🌟 Pre-configured Identities

- **admin** - System administrator
- **doctor1** - Doctor user (registered)
- **nurse1** - Nurse user (just registered)

## 📦 Available Chaincodes

1. **healthlink** - Patient consent management
2. **patient-records** - Medical records
3. **doctor-credentials** - Doctor verification
4. **appointment** - Appointment scheduling
5. **prescription** - Prescription management

## 🎯 Quick Test Sequence

1. Open test interface: http://localhost:9002/blockchain-test
2. Connect WebSocket
3. Register new user
4. Create patient record
5. Create consent
6. Query consent
7. Watch events in real-time

## 📞 Support

- **Documentation**: `/workspaces/Healthlink_RPC/middleware-api/README.md`
- **Quick Start**: `/workspaces/Healthlink_RPC/middleware-api/QUICK_START.md`
- **Integration Status**: `/workspaces/Healthlink_RPC/INTEGRATION_STATUS.md`
- **This Guide**: `/workspaces/Healthlink_RPC/QUICK_REFERENCE.md`

---

**System Status**: ✅ FULLY OPERATIONAL  
**Last Updated**: December 1, 2025
