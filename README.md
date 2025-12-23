# HealthLink RPC

**Version:** v2.0.0-RELEASE

A comprehensive blockchain-based healthcare management system that enables secure, decentralized medical record management using Ethereum smart contracts and Hyperledger Fabric integration.

## 🚀 Features

- **Blockchain Medical Records**: Secure, immutable patient records stored on Ethereum blockchain
- **Smart Contracts**: Solidity contracts for Appointments, Doctor Credentials, HealthLink, Patient Records, and Prescriptions
- **Decentralized Identity**: Hyperledger Fabric integration for identity management
- **Modern Web Interface**: Next.js frontend with TypeScript and Radix UI components
- **API Middleware**: Express.js backend with authentication, rate limiting, and real-time updates
- **Database Integration**: Supabase for relational data and Prisma for ORM
- **AI Integration**: Google Generative AI for intelligent healthcare insights
- **IPFS Storage**: Pinata SDK for decentralized file storage
- **Real-time Communication**: Socket.io for live updates
- **Comprehensive Testing**: Playwright for E2E tests, Jest for backend tests

## 🏗️ Architecture

The system consists of four main components:

1. **Ethereum Contracts** (`ethereum-contracts/`): Solidity smart contracts deployed on Ethereum
2. **Frontend** (`frontend/`): Next.js application for user interface
3. **Middleware API** (`middleware-api/`): Express.js server handling business logic
4. **Supabase** (`supabase/`): Database setup and migrations

## 🛠️ Tech Stack

### Blockchain Layer
- **Ethereum**: Smart contract platform
- **Solidity**: Contract programming language
- **Hardhat**: Development environment and testing framework
- **Ethers.js**: Ethereum interaction library

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Prisma**: Database ORM
- **Supabase**: PostgreSQL database
- **Redis**: Caching and session management
- **Bull**: Job queue management

### Frontend
- **Next.js**: React framework
- **TypeScript**: Type-safe JavaScript
- **Radix UI**: Accessible component library
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library

### DevOps & Tools
- **Docker**: Containerization
- **Jest**: Testing framework
- **Playwright**: End-to-end testing
- **ESLint**: Code linting
- **Hyperledger Fabric**: Enterprise blockchain for identity

## 📋 Prerequisites

- Node.js (v18+)
- npm or yarn
- Docker and Docker Compose
- Ethereum node (local or testnet)
- Supabase account
- Pinata account for IPFS
- Google AI API key

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/deveshyaara/Healthlink_RPC.git
   cd Healthlink_RPC
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Setup Supabase:**
   ```bash
   npm run setup-db
   ```

4. **Deploy Ethereum Contracts:**
   ```bash
   cd ethereum-contracts
   npm install
   npx hardhat compile
   npx hardhat deploy
   ```

5. **Setup Middleware API:**
   ```bash
   cd ../middleware-api
   npm install
   npm run postinstall  # Generates Prisma client
   cp .env.example .env  # Configure environment variables
   npm run dev
   ```

6. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   cp .env.local.example .env.local  # Configure environment variables
   npm run dev
   ```

## ⚙️ Configuration

### Environment Variables

Create `.env` files in respective directories with the following variables:

#### Middleware API (.env)
```
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
GOOGLE_AI_API_KEY=...
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379
ETHEREUM_RPC_URL=http://localhost:8545
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🏃‍♂️ Usage

1. **Start the development servers:**
   ```bash
   # Terminal 1: Middleware API
   cd middleware-api && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev

   # Terminal 3: Ethereum node (if using local)
   npx hardhat node
   ```

2. **Access the application:**
   - Frontend: http://localhost:9002
   - API: http://localhost:3001

3. **Run tests:**
   ```bash
   # Backend tests
   cd middleware-api && npm test

   # Frontend E2E tests
   cd frontend && npm run test:e2e

   # Contract tests
   cd ethereum-contracts && npx hardhat test
   ```

## 📁 Project Structure

```
Healthlink_RPC/
├── ethereum-contracts/     # Solidity smart contracts
│   ├── contracts/          # Contract source files
│   ├── scripts/            # Deployment scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.js
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # Utility functions
│   │   └── services/       # API services
│   └── public/             # Static assets
├── middleware-api/         # Express.js backend
│   ├── src/                # Source code
│   ├── prisma/             # Database schema
│   ├── scripts/            # Setup scripts
│   └── config/             # Configuration files
├── supabase/               # Database setup
│   └── migrations/         # Database migrations
└── scripts/                # Utility scripts
```

## 🔧 Development

### Code Quality
- **Linting:** `npm run lint` in respective directories
- **Type Checking:** `npm run typecheck` in frontend
- **Testing:** Run tests before committing

### Smart Contract Development
```bash
cd ethereum-contracts
npx hardhat compile    # Compile contracts
npx hardhat test       # Run tests
npx hardhat deploy     # Deploy to network
```

### Database Migrations
```bash
cd middleware-api
npx prisma migrate dev  # Development migration
npx prisma generate     # Generate client
```

## 🚀 Deployment

### Production Setup
1. Configure production environment variables
2. Build and deploy contracts to mainnet/testnet
3. Deploy middleware API to cloud (e.g., Render, Heroku)
4. Deploy frontend to Vercel/Netlify
5. Setup Supabase production instance

### Docker Deployment
```bash
# Build images
docker build -f frontend/Dockerfile.low-spec -t healthlink-frontend .
docker build -f middleware-api/Dockerfile -t healthlink-api .

# Run with docker-compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

### Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the HealthLink team

## 🙏 Acknowledgments

- Ethereum Foundation for blockchain infrastructure
- Hyperledger Foundation for Fabric
- Supabase for database services
- Open source community for amazing tools and libraries