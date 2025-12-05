# HealthLink Middleware API

Production-ready middleware API for HealthLink blockchain healthcare system built on Hyperledger Fabric. This API implements the Controller-Service-Repository pattern with enterprise-grade features including async transaction processing, real-time event streaming, and comprehensive error handling.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│                    http://localhost:9002                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Middleware API (Express.js)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │  Validators  │  │   Routes     │     │
│  └──────┬───────┘  └──────────────┘  └──────────────┘     │
│         │                                                   │
│  ┌──────▼────────────────────────────────────────────┐     │
│  │             Services Layer                         │     │
│  │  • TransactionService (Business Logic)            │     │
│  │  • FabricGateway (Fabric SDK Integration)         │     │
│  │  • WalletService (Identity Management)            │     │
│  │  • EventService (WebSocket Server)                │     │
│  └──────┬────────────────────────────────────────────┘     │
│         │                                                   │
│  ┌──────▼───────┐                                          │
│  │  Bull Queue  │ ◄─── Async Transaction Processing       │
│  └──────────────┘                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ Fabric Gateway Protocol
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Hyperledger Fabric Network (v2.5.0)                │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Org1    │  │  Org2    │  │ Orderer  │  │ CouchDB  │   │
│  │  Peer0   │  │  Peer0   │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  Chaincodes: healthlink, patient-records, doctor-creds,     │
│              appointment, prescription                       │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Capabilities
- **Controller-Service-Repository Pattern**: Clean separation of concerns
- **Fabric Gateway Integration**: Connection pooling and efficient gateway management
- **Identity Management**: Wallet service with CA client integration
- **Async Transaction Processing**: Bull queue with Redis for background jobs
- **Real-time Event Streaming**: WebSocket server broadcasting blockchain events
- **Contract & Block Events**: Subscribe to specific contract events or full block events

### Enterprise Features
- **Global Error Handling**: Distinguishes blockchain errors from HTTP errors
- **Request Validation**: Joi schemas for all endpoints
- **Rate Limiting**: Configurable per-IP request limits
- **Security**: Helmet, CORS, compression, body size limits
- **Structured Logging**: Winston with file rotation and console output
- **Health Checks**: API, blockchain, queue, and WebSocket status monitoring
- **Graceful Shutdown**: Proper cleanup of connections and resources

### Error Classification
Custom error types for precise debugging:
- `BlockchainError`: General Fabric errors
- `MVCCConflictError`: Concurrent transaction conflicts
- `PeerUnavailableError`: Network connectivity issues
- `ValidationError`: Input validation failures
- `AuthorizationError`: Access control issues

## 📦 Installation

### Prerequisites
- Node.js >= 16.0.0
- Redis (optional, for async queue)
- Hyperledger Fabric network running (v2.5.0+)
- Admin/User identities enrolled in wallet

### Setup

1. **Install dependencies:**
```bash
cd middleware-api
npm install
```

2. **Create connection profile:**
Copy your Fabric network connection profile to `config/connection-profile.json`:
```bash
cp ../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json \
   config/connection-profile.json
```

3. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Fabric Network
CONNECTION_PROFILE_PATH=./config/connection-profile.json
WALLET_PATH=./wallet
CHANNEL_NAME=mychannel
CHAINCODE_NAME=healthlink
MSP_ID=Org1MSP

# Fabric CA
CA_URL=https://localhost:7054
CA_NAME=ca-org1
ADMIN_USER=admin
ADMIN_PASSWORD=adminpw

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# WebSocket
WEBSOCKET_PORT=3001

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Create wallet directory:**
```bash
mkdir -p wallet
```

## 🚀 Usage

### Start the server:

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### Enroll admin identity (first time setup):
```bash
curl -X POST http://localhost:3000/api/v1/wallet/enroll-admin \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentID": "admin",
    "enrollmentSecret": "adminpw"
  }'
```

### Register a user:
```bash
curl -X POST http://localhost:3000/api/v1/wallet/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "role": "client",
    "affiliation": "org1.department1"
  }'
```

## 📡 API Endpoints

### Health & Status
```http
GET /health                    # Simple health check
GET /api/health                # Detailed health with metrics
GET /api/v1                    # API documentation
```

### Transactions
```http
POST /api/v1/transactions                    # Submit transaction
POST /api/v1/transactions/private            # Submit with private data
POST /api/v1/query                           # Query ledger
GET  /api/v1/history/:assetId                # Get asset history
GET  /api/v1/jobs/:jobId                     # Check async job status
```

### Assets (CRUD Operations)
```http
GET    /api/v1/assets                        # Get all assets
POST   /api/v1/assets/query                  # Query assets with filter
POST   /api/v1/assets                        # Create asset
PUT    /api/v1/assets/:assetId               # Update asset
DELETE /api/v1/assets/:assetId               # Delete asset
```

### Wallet Management
```http
POST   /api/v1/wallet/enroll-admin           # Enroll admin
POST   /api/v1/wallet/register               # Register user
GET    /api/v1/wallet/identity/:userId       # Get identity
GET    /api/v1/wallet/identities             # List all identities
DELETE /api/v1/wallet/identity/:userId       # Remove identity
```

## 🔌 WebSocket Events

Connect to `ws://localhost:3001/ws`

### Client -> Server Events

**Subscribe to contract events:**
```javascript
socket.emit('subscribe-contract-event', {
  contractName: 'healthlink',
  eventName: 'PatientRecordCreated'
});
```

**Subscribe to block events:**
```javascript
socket.emit('subscribe-block-event', {
  startBlock: 10  // optional
});
```

**Unsubscribe:**
```javascript
socket.emit('unsubscribe-contract-event', {
  contractName: 'healthlink',
  eventName: 'PatientRecordCreated'
});
```

### Server -> Client Events

**Contract events:**
```javascript
socket.on('contract-event', (data) => {
  console.log('Event:', data.eventName);
  console.log('Payload:', data.payload);
});
```

**Block events:**
```javascript
socket.on('block-event', (data) => {
  console.log('Block:', data.blockNumber);
  console.log('Transactions:', data.transactions);
});
```

**Errors:**
```javascript
socket.on('event-error', (error) => {
  console.error('Event error:', error.message);
});
```

## 📝 Request Examples

### Submit Transaction (Sync)
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "healthlink",
    "functionName": "CreatePatientRecord",
    "args": ["patient123", "John Doe", "A+", "1990-01-01"],
    "userId": "user1",
    "async": false
  }'
```

### Submit Transaction (Async)
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "healthlink",
    "functionName": "CreatePatientRecord",
    "args": ["patient456", "Jane Doe", "B+", "1992-05-15"],
    "userId": "user1",
    "async": true
  }'

# Returns: { "success": true, "jobId": "abc123..." }

# Check job status:
curl http://localhost:3000/api/v1/jobs/abc123...
```

### Query Ledger
```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "healthlink",
    "functionName": "GetPatientRecord",
    "args": ["patient123"],
    "userId": "user1"
  }'
```

### Create Asset
```bash
curl -X POST http://localhost:3000/api/v1/assets \
  -H "Content-Type: application/json" \
  -d '{
    "contractName": "healthlink",
    "functionName": "CreateAsset",
    "assetData": {
      "assetId": "asset789",
      "owner": "hospital1",
      "value": 1000
    },
    "userId": "user1"
  }'
```

### Get Asset History
```bash
curl http://localhost:3000/api/v1/history/patient123?contractName=healthlink&userId=user1
```

## 🛠️ Development

### Project Structure
```
middleware-api/
├── src/
│   ├── config/              # Configuration management
│   │   └── index.js
│   ├── controllers/         # Request handlers
│   │   ├── transaction.controller.js
│   │   └── wallet.controller.js
│   ├── services/            # Business logic
│   │   ├── fabricGateway.service.js
│   │   ├── wallet.service.js
│   │   └── transaction.service.js
│   ├── queue/               # Async processing
│   │   └── transaction.queue.js
│   ├── events/              # WebSocket server
│   │   └── event.service.js
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── routes/              # API routes
│   │   ├── transaction.routes.js
│   │   └── wallet.routes.js
│   ├── utils/               # Utilities
│   │   ├── logger.js
│   │   └── errors.js
│   └── server.js            # Main entry point
├── config/
│   └── connection-profile.json
├── wallet/                  # Identity storage
├── logs/                    # Application logs
├── .env                     # Environment variables
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## 📊 Monitoring

### Health Check Response
```json
{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "UP",
    "blockchain": "UP",
    "queue": "UP",
    "websocket": "UP"
  },
  "metrics": {
    "connectedClients": 5,
    "queueStats": {
      "waiting": 2,
      "active": 1,
      "completed": 150,
      "failed": 3
    }
  }
}
```

### Logs
Logs are written to:
- Console: All levels based on `LOG_LEVEL`
- `logs/error.log`: Error level only
- `logs/combined.log`: All levels

## 🔒 Security

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **Body Size Limits**: 10MB max
- **Input Validation**: Joi schemas on all endpoints
- **Identity Verification**: Wallet-based authentication

## 🐛 Troubleshooting

### Connection refused to Fabric network
- Verify Fabric network is running: `docker ps`
- Check connection profile path in `.env`
- Ensure peer endpoints are accessible

### Redis connection failed
- Install Redis: `sudo apt-get install redis-server`
- Start Redis: `redis-server`
- Or disable async queue in config

### Admin enrollment fails
- Verify CA URL and credentials
- Check CA is running: `docker ps | grep ca`
- Ensure TLS certificates are valid

### WebSocket connection drops
- Check firewall rules for WebSocket port
- Verify `WEBSOCKET_PORT` configuration
- Enable WebSocket debugging: `DEBUG=socket.io*`

## 📚 Documentation

- [Hyperledger Fabric Docs](https://hyperledger-fabric.readthedocs.io/)
- [fabric-network SDK](https://hyperledger.github.io/fabric-sdk-node/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Socket.io](https://socket.io/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## 📄 License

MIT

## 👥 Authors

- Senior Full-Stack Blockchain Architect

## 🙏 Acknowledgments

- Hyperledger Fabric Team
- fabric-samples repository
- HealthLink Project Contributors

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15
