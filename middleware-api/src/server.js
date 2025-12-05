import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import config from './config/index.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import transactionRoutes from './routes/transaction.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import authRoutes from './routes/auth.routes.js';
import storageRoutes from './routes/storage.routes.js';
import eventService from './events/event.service.js';
import { disconnectGateway } from './services/fabricGateway.service.js';
import { getQueueStats } from './queue/transaction.queue.js';
import { createDynamicRouter, createGenericChaincodeRouter } from './factories/route.factory.js';
import routesConfig from './config/routes.config.js';

/**
 * HealthLink Middleware API Server
 * Production-ready Express server for Hyperledger Fabric
 */

const app = express();
const httpServer = createServer(app);

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
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'healthlink-middleware-api',
    version: '1.0.0',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    // Get queue stats with safe error handling
    let queueStats;
    try {
      queueStats = await getQueueStats();
    } catch (queueError) {
      // Queue might fail if Redis is down - provide fallback
      queueStats = {
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
        status: 'unavailable',
      };
    }
    
    // Extract only serializable properties from queue stats
    const safeQueueStats = {
      active: queueStats.active || 0,
      waiting: queueStats.waiting || 0,
      completed: queueStats.completed || 0,
      failed: queueStats.failed || 0,
      delayed: queueStats.delayed || 0,
      total: queueStats.total || 0,
    };
    
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        api: 'UP',
        blockchain: 'UP',
        queue: safeQueueStats.active === 0 && safeQueueStats.failed === 0 ? 'UP' : 'DEGRADED',
        websocket: eventService.getConnectedClientsCount() >= 0 ? 'UP' : 'DOWN',
      },
      metrics: {
        connectedClients: eventService.getConnectedClientsCount(),
        queueStats: safeQueueStats,
      },
    });
  } catch (error) {
    // Use safe error serialization - never expose internal error structure
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// ======================
// API Routes
// ======================

const API_VERSION = config.server.apiVersion;

// Mount authentication routes (no version prefix for frontend compatibility)
app.use('/api/auth', authRoutes);

// Mount storage routes (Content-Addressable Storage)
app.use('/api/storage', storageRoutes);

// Mount legacy transaction routes
app.use(`/api/${API_VERSION}`, transactionRoutes);

// Mount wallet routes
app.use(`/api/${API_VERSION}/wallet`, walletRoutes);

// Mount dynamic routes from configuration
const dynamicRouter = createDynamicRouter(routesConfig);
app.use('/api', dynamicRouter);

// Mount generic chaincode invocation endpoints (fallback)
const genericRouter = createGenericChaincodeRouter();
app.use('/api/chaincode', genericRouter);

// API documentation endpoint
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.status(200).json({
    message: 'HealthLink Middleware API',
    version: API_VERSION,
    endpoints: {
      transactions: {
        submit: `POST /api/${API_VERSION}/transactions`,
        submitPrivate: `POST /api/${API_VERSION}/transactions/private`,
        query: `POST /api/${API_VERSION}/query`,
      },
      assets: {
        getAll: `GET /api/${API_VERSION}/assets`,
        query: `POST /api/${API_VERSION}/assets/query`,
        create: `POST /api/${API_VERSION}/assets`,
        update: `PUT /api/${API_VERSION}/assets/:assetId`,
        delete: `DELETE /api/${API_VERSION}/assets/:assetId`,
        history: `GET /api/${API_VERSION}/history/:assetId`,
      },
      jobs: {
        status: `GET /api/${API_VERSION}/jobs/:jobId`,
      },
      wallet: {
        enrollAdmin: `POST /api/${API_VERSION}/wallet/enroll-admin`,
        register: `POST /api/${API_VERSION}/wallet/register`,
        getIdentity: `GET /api/${API_VERSION}/wallet/identity/:userId`,
        listIdentities: `GET /api/${API_VERSION}/wallet/identities`,
        removeIdentity: `DELETE /api/${API_VERSION}/wallet/identity/:userId`,
      },
      websocket: '/ws',
    },
    documentation: 'https://github.com/your-repo/api-docs',
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
    },
  });
});

// ======================
// Error Handler
// ======================

app.use(errorHandler);

// ======================
// WebSocket Initialization
// ======================

// Initialize WebSocket with explicit CORS and httpServer binding
eventService.initialize(httpServer);

// ======================
// Server Startup
// ======================

const startServer = async () => {
  try {
    // Start HTTP server
    httpServer.listen(config.server.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║   HealthLink Middleware API Server                        ║
║   Environment: ${config.server.env.padEnd(43)}║
║   HTTP Port: ${config.server.port.toString().padEnd(45)}║
║   WebSocket Port: ${config.websocket.port.toString().padEnd(40)}║
║   API Version: ${config.server.apiVersion.padEnd(43)}║
║                                                            ║
║   HTTP API: http://localhost:${config.server.port}${' '.repeat(28)}║
║   WebSocket: ws://localhost:${config.websocket.port}/ws${' '.repeat(20)}║
║   Health Check: http://localhost:${config.server.port}/health${' '.repeat(17)}║
╚════════════════════════════════════════════════════════════╝
      `);
      
      logger.info('✅ Server started successfully');
      logger.info(`📊 API Documentation available at: http://localhost:${config.server.port}/api/${API_VERSION}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new requests
      httpServer.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Disconnect from blockchain gateway
          await disconnectGateway();
          logger.info('Fabric gateway disconnected');
          
          // Disconnect Prisma Client
          const dbService = await import('./services/db.service.prisma.js');
          if (dbService.default.isReady()) {
            await dbService.default.disconnect();
            logger.info('Prisma Client disconnected');
          }
          
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

// Start the server
startServer();

export default app;
