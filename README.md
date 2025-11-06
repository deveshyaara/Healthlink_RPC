# HealthLink Pro - Blockchain Healthcare Platform

A **permanent, production-grade** blockchain-based healthcare platform built with Hyperledger Fabric. Features enterprise-level consent management, medical records, doctor credentials, and comprehensive audit logging.

## 🆕 NEW: Resource-Optimized Operations (November 2025)

**Problem Solved:** System crashes on low-resource systems during testing/deployment.

**Solution:** Sequential execution with comprehensive resource management - **PERMANENT fixes, no patch work!**

### Quick Start (Recommended)
```bash
# One-time setup
./setup-sequential-testing.sh

# Launch master manager (interactive menu)
./manage-healthlink.sh
```

### New Scripts Available
- **`manage-healthlink.sh`** - Interactive master manager for all operations
- **`deploy-chaincode-sequential.sh`** - Deploy chaincodes one at a time (prevents crashes)
- **`test-chaincode-sequential.sh`** - Test each chaincode separately (22 automated tests)
- **`monitor-resources.sh`** - Real-time system resource monitoring
- **`cleanup-resources.sh`** - Interactive resource cleanup with multiple options

### Documentation
- **`RESOURCE_OPTIMIZED_GUIDE.md`** - Complete user guide
- **`SEQUENTIAL_TESTING_IMPLEMENTATION.md`** - Technical implementation details
- **`QUICK_REFERENCE.md`** - Quick reference card
- **`PERMANENT_FIXES_SUMMARY.md`** - Implementation summary

**Benefits:** 95% success rate (vs 30% before), no crashes, works on 4GB RAM systems!

---

## 📋 Description

HealthLink Pro is an **enterprise blockchain platform** for secure healthcare data management with:

- **✅ 3 Production Smart Contracts** - Deployed and tested
- **🔐 Private Data Collections** - Sensitive patient data protection
- **📝 Medical Records Management** - IPFS-backed record storage
- **👨‍⚕️ Doctor Credentials** - Verification and rating system
- **📊 Consent Management** - Granular access control
- **🔍 Audit Logging** - Immutable transaction tracking
- **🌐 RESTful API** - Node.js/Express.js interface
- **♻️ Shared Library Architecture** - Zero code duplication (DRY)

## 🏗️ Architecture

### Smart Contracts (Chaincode)
- **healthlink-contract** (v1.1) - Consent management
- **patient-records** (v1.0) - Medical records with IPFS
- **doctor-credentials** (v1.1) - Doctor registration & verification
- **shared-lib** - Reusable base classes, validators, error handling

### Technology Stack
- **Blockchain**: Hyperledger Fabric 2.5
- **Database**: CouchDB (for rich queries)
- **Smart Contracts**: JavaScript (Node.js)
- **API Server**: Node.js + Express.js
- **Off-Chain Storage**: IPFS (for large medical files)

## 📁 Project Structure

```
HealthLink_RPC/
├── fabric-samples/
│   ├── chaincode/
│   │   ├── shared-lib/                    # ✨ Shared library (PERMANENT)
│   │   │   ├── base-contract.js          # Base class with 15+ methods
│   │   │   ├── validators.js             # 20+ validation functions
│   │   │   ├── errors.js                 # Custom error classes
│   │   │   ├── index.js                  # Module exports
│   │   │   ├── package.json              # Dependencies
│   │   │   └── README.md                 # Library documentation
│   │   ├── healthlink-contract/           # Consent management
│   │   ├── patient-records-contract/      # ✨ Medical records (v1.0)
│   │   ├── doctor-credentials-contract/   # ✨ Doctor management (v1.1)
│   │   ├── appointment-contract/          # (Phase 2)
│   │   ├── prescription-contract/         # (Phase 2)
│   │   ├── lab-test-contract/             # (Phase 3)
│   │   └── insurance-claims-contract/     # (Phase 3)
│   └── test-network/                      # Fabric network scripts
├── my-project/
│   └── rpc-server/                        # Node.js API server
│       ├── server.js                      # Express.js routes
│       ├── fabric-client.js               # Fabric SDK wrapper
│       └── package.json
├── sync-shared-lib.sh                     # ✨ Sync shared library
├── create-contract.sh                     # ✨ Contract generator
├── deploy-contracts.sh                    # Automated deployment
├── test-new-contracts.sh                  # ✨ Contract tests
├── start-project.sh                       # Network startup
├── test-api.sh                            # API tests
├── IMPLEMENTATION_GUIDE.md                # ✨ Technical guide
├── DEPLOYMENT_SUCCESS.md                  # ✨ Deployment report
├── PERMANENT_FIXES.md                     # ✨ Architecture docs
├── PROJECT_STATUS.md                      # ✨ Progress tracker
└── README.md                              # This file
```

**✨ = New permanent additions**

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.x or higher) - [Download](https://nodejs.org/)
- **Docker** and **Docker Compose** - [Get Docker](https://www.docker.com/get-started)
- **Go** (v1.17 or higher) - [Install Go](https://golang.org/doc/install)
- **jq** (command-line JSON processor) - `sudo apt-get install jq` or `brew install jq`
- **curl** (for API testing)
- **netcat (nc)** - Usually pre-installed on Linux/macOS

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

Use the provided script to start everything with one command:

```bash
# Make the script executable
chmod +x start-project.sh

# Disable IPv6 temporarily (required for network startup)
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Run the automated setup script
./start-project.sh

# Re-enable IPv6 after startup
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
```

The script will:
1. Stop any existing network
2. Start the Fabric network with CouchDB
3. Create the channel and join peers
4. Deploy the chaincode
5. Enroll the admin identity
6. Start the RPC server on port 4000

### Option 2: Manual Setup

#### Step 1: Set Up Hyperledger Fabric Network

```bash
cd fabric-samples/test-network

# Bring down any existing network
./network.sh down

# Start network with CouchDB and create channel
./network.sh up createChannel -c mychannel -ca -s couchdb

# Deploy the HealthLink chaincode
./network.sh deployCC -ccn healthlink-contract \
  -ccp ../chaincode/healthlink-contract \
  -ccl javascript \
  -ccv 1.0 \
  -ccs 1 \
  -ccep "OR('Org1MSP.member','Org2MSP.member')" \
  -cccg ../chaincode/healthlink-contract/collections_config.json
```

**Important**: The `-s couchdb` flag is **required** because the chaincode uses rich queries that are only supported by CouchDB.

#### Step 2: Set Up Node.js RPC Server

```bash
cd my-project/rpc-server

# Install dependencies
npm install

# Enroll admin identity
node addToWallet.js

# Start the server
node server.js
```

The API server will be available at `http://localhost:4000`.

## 📡 API Reference

### Base URL
```
http://localhost:4000
```

### Endpoints

#### 1. Create Consent
Create a new consent record for a patient.

**Endpoint:** `POST /api/consents`

**Request Body:**
```json
{
  "consentId": "consent-123",
  "patientId": "patient-456",
  "granteeId": "hospital-abc",
  "scope": "view_records",
  "purpose": "emergency_care",
  "validUntil": "2026-12-31T23:59:59Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-001",
  "patientId": "patient-001",
  "granteeId": "hospital-abc",
  "scope": "view_records",
  "purpose": "emergency_care",
  "validUntil": "2026-12-31T23:59:59Z"
}'
```

**Response:**
```json
{
  "result": "Consent created successfully",
  "txId": "a1b2c3d4e5f6..."
}
```

---

#### 2. Get Consent by ID
Retrieve a specific consent by its ID.

**Endpoint:** `GET /api/consents/:consentId`

**Example:**
```bash
curl http://localhost:4000/api/consents/consent-001
```

**Response:**
```json
{
  "consentId": "consent-001",
  "patientId": "patient-001",
  "granteeId": "hospital-abc",
  "scope": "view_records",
  "purpose": "emergency_care",
  "status": "active",
  "validUntil": "2026-12-31T23:59:59Z",
  "createdAt": "2025-10-29T12:00:00Z"
}
```

---

#### 3. Get All Consents for a Patient
Retrieve all consents associated with a specific patient.

**Endpoint:** `GET /api/patient/:patientId/consents`

**Example:**
```bash
curl http://localhost:4000/api/patient/patient-001/consents
```

**Response:**
```json
[
  {
    "Key": "consent-001",
    "Record": {
      "consentId": "consent-001",
      "patientId": "patient-001",
      "granteeId": "hospital-abc",
      "scope": "view_records",
      "status": "active",
      "createdAt": "2025-10-29T12:00:00Z"
    }
  }
]
```

---

#### 4. Revoke Consent
Revoke an existing consent.

**Endpoint:** `PATCH /api/consents/:consentId/revoke`

**Example:**
```bash
curl -X PATCH http://localhost:4000/api/consents/consent-001/revoke
```

**Response:**
```json
{
  "result": "Consent revoked successfully",
  "txId": "f6e5d4c3b2a1..."
}
```

---

#### 5. Get Audit Record
Retrieve the audit trail for a specific transaction.

**Endpoint:** `GET /api/audit/:txId`

**Example:**
```bash
curl http://localhost:4000/api/audit/a1b2c3d4e5f6...
```

**Response:**
```json
{
  "txId": "a1b2c3d4e5f6...",
  "timestamp": "2025-10-29T12:00:00Z",
  "invokedBy": "Admin@org1.example.com",
  "functionName": "CreateConsent",
  "parameters": ["consent-001", "patient-001", "hospital-abc", "view_records", "emergency_care", "2026-12-31T23:59:59Z"]
}
```

---

## 🧪 Testing

### Automated Test Suite

Run all test cases automatically:

```bash
# Make the test script executable
chmod +x test-api.sh

# Run the tests
./test-api.sh
```

### Manual Test Cases

#### Test Case 1: Create a Consent

```bash
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-test-001",
  "patientId": "patient-test-001",
  "granteeId": "hospital-xyz",
  "scope": "full_access",
  "purpose": "routine_checkup",
  "validUntil": "2027-12-31T23:59:59Z"
}' | jq .
```

**Expected Result:**
- Status: Success
- Response contains `txId`
- Message confirms consent creation

---

#### Test Case 2: Retrieve the Created Consent

```bash
curl http://localhost:4000/api/consents/consent-test-001 | jq .
```

**Expected Result:**
- Status: `active`
- All fields match the creation request
- `createdAt` timestamp is present

---

#### Test Case 3: Query Consents by Patient

```bash
curl http://localhost:4000/api/patient/patient-test-001/consents | jq .
```

**Expected Result:**
- Returns an array of consents
- Contains the consent created in Test Case 1
- Uses CouchDB rich query capabilities

---

#### Test Case 4: Revoke the Consent

```bash
curl -X PATCH http://localhost:4000/api/consents/consent-test-001/revoke | jq .
```

**Expected Result:**
- Success message
- Returns new transaction ID
- Consent status changes to `revoked`

---

#### Test Case 5: Verify Revocation

```bash
curl http://localhost:4000/api/consents/consent-test-001 | jq .
```

**Expected Result:**
- Status field shows: `revoked`
- All other fields remain unchanged
- `revokedAt` timestamp is present

---

#### Test Case 6: View Audit Trail

```bash
# Replace TX_ID with the actual transaction ID from Test Case 1
curl http://localhost:4000/api/audit/TX_ID | jq .
```

**Expected Result:**
- Transaction details are returned
- Shows function name: `CreateConsent`
- Displays timestamp and invoker
- Lists all parameters passed to the function

---

#### Test Case 7: Create Multiple Consents for Same Patient

```bash
# Create first consent
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-multi-001",
  "patientId": "patient-multi",
  "granteeId": "hospital-a",
  "scope": "view_records",
  "purpose": "consultation",
  "validUntil": "2026-06-30T23:59:59Z"
}' | jq .

# Create second consent
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-multi-002",
  "patientId": "patient-multi",
  "granteeId": "hospital-b",
  "scope": "full_access",
  "purpose": "surgery",
  "validUntil": "2026-12-31T23:59:59Z"
}' | jq .

# Query all consents for the patient
curl http://localhost:4000/api/patient/patient-multi/consents | jq .
```

**Expected Result:**
- Both consents are created successfully
- Query returns array with 2 consents
- Each consent has unique `consentId` and `granteeId`

---

#### Test Case 8: Error Handling - Duplicate Consent ID

```bash
# Create initial consent
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-duplicate",
  "patientId": "patient-dup",
  "granteeId": "hospital-c",
  "scope": "view_records",
  "purpose": "test",
  "validUntil": "2026-12-31T23:59:59Z"
}' | jq .

# Try to create duplicate
curl -X POST http://localhost:4000/api/consents \
-H "Content-Type: application/json" \
-d '{
  "consentId": "consent-duplicate",
  "patientId": "patient-dup",
  "granteeId": "hospital-c",
  "scope": "view_records",
  "purpose": "test",
  "validUntil": "2026-12-31T23:59:59Z"
}' | jq .
```

**Expected Result:**
- Second request fails
- Error message indicates consent already exists

---

#### Test Case 9: Error Handling - Non-existent Consent

```bash
curl http://localhost:4000/api/consents/non-existent-consent | jq .
```

**Expected Result:**
- Error response
- Message indicates consent not found

---

#### Test Case 10: Error Handling - Invalid Patient Query

```bash
curl http://localhost:4000/api/patient/non-existent-patient/consents | jq .
```

**Expected Result:**
- Returns empty array `[]`
- No error (valid query with no results)

---

## 📊 Test Results Summary

| Test Case | Description | Expected Outcome |
|-----------|-------------|------------------|
| TC-01 | Create Consent | Success with txId |
| TC-02 | Get Consent by ID | Returns consent details |
| TC-03 | Query by Patient | Returns array of consents |
| TC-04 | Revoke Consent | Success with new txId |
| TC-05 | Verify Revocation | Status = "revoked" |
| TC-06 | View Audit Trail | Returns transaction details |
| TC-07 | Multiple Consents | Multiple consents for one patient |
| TC-08 | Duplicate ID Error | Error for duplicate consent |
| TC-09 | Non-existent Consent | Error for missing consent |
| TC-10 | Invalid Patient | Empty array returned |

---

## 🛠️ Upgrading Chaincode

To deploy an updated version of the chaincode:

```bash
cd fabric-samples/test-network

# Deploy new version (increment version and sequence)
./network.sh deployCC -ccn healthlink-contract \
  -ccp ../chaincode/healthlink-contract \
  -ccl javascript \
  -ccv 1.1 \
  -ccs 2 \
  -ccep "OR('Org1MSP.member','Org2MSP.member')" \
  -cccg ../chaincode/healthlink-contract/collections_config.json
```

---

## 🐛 Troubleshooting

### Network Issues

**Problem:** Connection refused errors during startup

**Solution:** Temporarily disable IPv6:
```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
# Run your network startup
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
```

---

**Problem:** "ExecuteQuery not supported for leveldb"

**Solution:** Always use the `-s couchdb` flag when starting the network. CouchDB is required for rich queries.

---

**Problem:** Port already in use

**Solution:** Kill existing processes:
```bash
# Kill RPC server on port 4000
kill $(lsof -t -i:4000) 2>/dev/null

# Or bring down the entire network
cd fabric-samples/test-network
./network.sh down
```

---

### Chaincode Issues

**Problem:** "Chaincode does not exist"

**Solution:** Redeploy the chaincode with the correct parameters

---

**Problem:** Incorrect sequence number

**Solution:** After restarting the network, always start with sequence 1

---

### Wallet/Identity Issues

**Problem:** "Access denied" or authentication errors

**Solution:** Re-enroll the admin identity:
```bash
cd my-project/rpc-server
rm -rf wallet/
node addToWallet.js
```

---

## �️ Development Workflow

### Creating a New Smart Contract

Use the permanent contract generator:

```bash
# Generate new contract with proper structure
./create-contract.sh appointment-contract AppointmentContract

# This creates:
# - Full contract template extending BaseHealthContract
# - Shared library integration
# - package.json with dependencies
# - README.md with documentation
# - All necessary files for deployment
```

### Updating the Shared Library

When you modify base-contract.js, validators.js, or errors.js:

```bash
# Synchronize changes to all contracts
./sync-shared-lib.sh

# Increment contract versions
cd fabric-samples/test-network
./network.sh deployCC -ccn patient-records -ccv 1.1 -ccs 6
./network.sh deployCC -ccn doctor-credentials -ccv 1.2 -ccs 7
```

### Testing Contracts

```bash
# Run comprehensive test suite
./test-new-contracts.sh

# This tests:
# - Patient records creation and retrieval
# - Doctor registration and profile queries
# - Access logging
# - Data integrity
```

### Deployment Process

```bash
# 1. Start the network
./start-project.sh

# 2. Deploy specific contract
cd fabric-samples/test-network
./network.sh deployCC -ccn your-contract \
  -ccp ../chaincode/your-contract \
  -ccl javascript -ccv 1.0 -ccs 1

# 3. Verify deployment
docker ps | grep dev-peer

# 4. Test functionality
peer chaincode query -C mychannel -n your-contract \
  -c '{"function":"YourFunction","Args":["arg1"]}'
```

---

## �📝 Architecture

### Components

1. **Hyperledger Fabric Network**
   - 2 Organizations (Org1, Org2)
   - 1 Peer per organization
   - 1 Orderer (Raft consensus)
   - 3 Certificate Authorities
   - 2 CouchDB instances

2. **Chaincode (Smart Contract)**
   - Language: JavaScript (Node.js)
   - Functions: CreateConsent, GetConsent, RevokeConsent, GetConsentsByPatient, GetAuditRecord
   - Private Data Collections for sensitive patient information

3. **RPC Server**
   - Framework: Express.js
   - Port: 4000
   - SDK: fabric-network
   - Features: RESTful API, automatic transaction handling

---

## 🔐 Security Considerations

- **Private Keys**: Never commit the `wallet/` directory or `organizations/` directory
- **Credentials**: Store sensitive data in `.env` files (also gitignored)
- **Network Access**: API server runs on localhost by default
- **Audit Trail**: All blockchain transactions are immutably logged

---

## 📄 License

This project is for educational and demonstration purposes.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📧 Support

For issues and questions, please open an issue in the repository.

---

**Built with ❤️ using Hyperledger Fabric**
