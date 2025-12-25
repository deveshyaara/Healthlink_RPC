import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import config from './config/index.js';
import logger from './utils/logger.js';
import { validateEnvironment } from './utils/validateEnv.js';
import errorHandler from './middleware/errorHandler.js';
import healthcareRoutes from './routes/healthcare.routes.js';
import HealthcareController from './controllers/healthcare.controller.js';
import { authenticateJWT, requireDoctor } from './middleware/auth.middleware.js';
import transactionRoutes from './routes/transaction.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import storageRoutes from './routes/storage.routes.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import ethereumService from './services/ethereum.service.js';
import StorageService from './services/storage.service.js';

/**
 * HealthLink Middleware API Server
 * Production-ready Express server for Ethereum Blockchain
 */

const app = express();
const httpServer = createServer(app);

// Instantiate healthcare controller
const healthcareController = new HealthcareController();

// Bind all prototype methods to the controller instance to ensure `this` is preserved
// when handlers are passed directly to Express (avoids "Cannot read properties of undefined" errors)
Object.getOwnPropertyNames(Object.getPrototypeOf(healthcareController)).forEach((name) => {
  if (name !== 'constructor' && typeof healthcareController[name] === 'function') {
    healthcareController[name] = healthcareController[name].bind(healthcareController);
  }
});

// Trust proxy for accurate IP detection behind reverse proxies (e.g., Render)
// Set to 1 to trust only the immediate proxy, not all proxies in the chain
app.set('trust proxy', 1);

// ======================
// Security Middleware
// ======================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors(config.cors));

// Global rate limiter (for general API endpoints)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ======================
// Body Parsing Middleware
// ======================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// ======================
// Request Logging
// ======================

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ======================
// Health Check Endpoints
// ======================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'healthlink-middleware-api',
    version: '1.0.0',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    // Check Ethereum connection
    let ethereumStatus = 'DOWN';
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545';
      const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
      await ethereumService.initialize(rpcUrl, privateKey);
      ethereumStatus = 'UP';
    } catch (error) {
      logger.error('Ethereum health check failed:', error);
    }

    res.status(200).json({
      success: true,
      status: ethereumStatus === 'UP' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        api: 'UP',
        ethereum: ethereumStatus,
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Blockchain status endpoint (standardized response)
app.get('/api/blockchain/status', (req, res) => {
  // Return a simple standardized response for clients and health checks
  res.status(200).json({
    success: true,
    connected: true,
    network: 'sepolia',
  });
});

// ======================
// API Routes
// ======================

const API_VERSION = config.server.apiVersion;
const PORT = process.env.PORT || 4000;

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount chat routes (AI agent)
app.use('/api/chat', chatRoutes);

// Mount storage routes (for IPFS/file storage)
app.use('/api/storage', storageRoutes);

// Mount NEW healthcare routes (Ethereum-based)
app.use(`/api/${API_VERSION}/healthcare`, healthcareRoutes);

// Mount medical records routes (aliased for frontend compatibility)
app.use('/api/medical-records', healthcareRoutes);

// Mount appointments routes (aliased for frontend compatibility)
// Explicit alias routes so `/api/appointments` maps to the correct handlers
app.get('/api/appointments', authenticateJWT, healthcareController.getCurrentUserAppointments);
app.post('/api/appointments', authenticateJWT, requireDoctor, healthcareController.createAppointment);

// Mount prescriptions routes (aliased for frontend compatibility)
// Explicit alias routes so `/api/prescriptions` maps to the correct handlers
app.get('/api/prescriptions', authenticateJWT, healthcareController.getCurrentUserPrescriptions);
app.post('/api/prescriptions', authenticateJWT, requireDoctor, healthcareController.createPrescription);

// Note: consents and patients endpoints are provided by the healthcare router
// mounted under the API version and via explicit alias routes where needed.

// Mount user management routes
app.use('/api/users', userRoutes);

// Mount admin routes
app.use('/api/v1/admin', adminRoutes);

// Mount legacy transaction routes (for backward compatibility)
app.use(`/api/${API_VERSION}`, transactionRoutes);

// Mount wallet routes
app.use(`/api/${API_VERSION}/wallet`, walletRoutes);

// Serve API documentation (Swagger UI) at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API documentation endpoint
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.status(200).json({
    message: 'HealthLink Middleware API - Ethereum Blockchain',
    version: API_VERSION,
    blockchain: 'Ethereum',
    endpoints: {
      healthcare: {
        createPatient: `POST /api/${API_VERSION}/healthcare/patients`,
        getPatient: `GET /api/${API_VERSION}/healthcare/patients/:patientId`,
        createRecord: `POST /api/${API_VERSION}/healthcare/records`,
        getRecord: `GET /api/${API_VERSION}/healthcare/records/:recordId`,
        getRecordsByPatient: `GET /api/${API_VERSION}/healthcare/patients/:patientId/records`,
        createConsent: `POST /api/${API_VERSION}/healthcare/consents`,
        createAppointment: `POST /api/${API_VERSION}/healthcare/appointments`,
        createPrescription: `POST /api/${API_VERSION}/healthcare/prescriptions`,
        registerDoctor: `POST /api/${API_VERSION}/healthcare/doctors`,
        verifyDoctor: `POST /api/${API_VERSION}/healthcare/doctors/:doctorAddress/verify`,
        getVerifiedDoctors: `GET /api/${API_VERSION}/healthcare/doctors/verified`,
        getAudit: `GET /api/${API_VERSION}/healthcare/audit`,
      },
      wallet: {
        enrollAdmin: `POST /api/${API_VERSION}/wallet/enroll-admin`,
        register: `POST /api/${API_VERSION}/wallet/register`,
      },
    },
    documentation: 'See /ethereum-contracts/README.md',
  });
});

// Debug: list registered routes (for diagnosing missing endpoints)
app.get(`/api/${API_VERSION}/debug/routes`, (req, res) => {
  try {
    const routes = [];
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        routes.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack.forEach((l) => {
          if (l.route && l.route.path) {
            routes.push({
              path: l.route.path,
              methods: Object.keys(l.route.methods),
            });
          }
        });
      }
    });

    // Filter duplicates and sort
    const uniqueRoutes = Array.from(new Map(routes.map(r => [r.path + ':' + r.methods.join(','), r])).values());

    res.status(200).json({ success: true, routes: uniqueRoutes });
  } catch (err) {
    logger.error('Failed to list routes:', err);
    res.status(500).json({ success: false, error: 'Failed to list routes' });
  }
});

// Handle 404 - improved logging
app.use((req, res) => {
  logger.warn('404 Not Found', { path: req.originalUrl, method: req.method, host: req.hostname });
  const errorResponse = {
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  };

  // Add technical details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      path: req.originalUrl,
      method: req.method,
      host: req.hostname,
    };
  }

  res.status(404).json(errorResponse);
});

// ======================
// Error Handler
// ======================

app.use(errorHandler);

// ======================

// Server Startup
// ======================

const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnvironment();

    // Initialize Ethereum service first
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545';
      const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

      logger.info(`🔗 Connecting to Ethereum network at: ${rpcUrl}`);
      await ethereumService.initialize(rpcUrl, privateKey);
      logger.info('🔗 Ethereum service initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Ethereum service initialization failed:', error.message);
      logger.warn('   Make sure Ethereum RPC URL is correct and network is accessible');
    }

    // Initialize database service (Supabase)
    try {
      logger.info('🗄️  Initializing database service...');
      const dbService = await import('./services/db.service.js');
      await dbService.default.initialize();
      logger.info('🗄️  Database service initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Database service initialization failed:', error.message);
      logger.warn('   Authentication will not work without Supabase connection');
      logger.warn('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    }

    // Initialize storage service
    try {
      logger.info('💾 Initializing storage service...');
      StorageService.getInstance().initializeStorage();
      logger.info('💾 Storage service initialized successfully');
    } catch (error) {
      logger.error('❌ Storage service initialization failed:', error);
      logger.error('   File uploads will not work without proper storage directories');
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║   HealthLink Middleware API Server                        ║
║   Environment: ${config.server.env.padEnd(43)}║
║   HTTP Port: ${PORT.toString().padEnd(45)}║
║   WebSocket Port: ${config.websocket.port.toString().padEnd(40)}║
║   API Version: ${config.server.apiVersion.padEnd(43)}║
║                                                            ║
║   HTTP API: http://localhost:${PORT}${' '.repeat(28)}║
║   Health Check: http://localhost:${PORT}/health${' '.repeat(17)}║
║   Blockchain: Ethereum${' '.repeat(35)}║
╚════════════════════════════════════════════════════════════╝
      `);

      logger.info('✅ Server started successfully');
      logger.info(`📊 API Documentation available at: http://localhost:${PORT}/api/${API_VERSION}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new requests
      httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server only when not running tests or when explicitly allowed
if (process.env.NODE_ENV !== 'test' && process.env.SKIP_AUTO_START !== 'true') {
  startServer();
}

// Export the app for testing (ESM)
export default app;

// Provide CommonJS compatibility when this file is transpiled to CJS
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
  }
} catch (e) {
  // ignore in strict ESM environments
}
