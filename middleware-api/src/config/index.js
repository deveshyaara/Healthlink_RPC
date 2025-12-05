import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fabricConfig from './fabric-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Configuration object for the entire application
 * Centralizes all configuration values from environment variables
 * Uses fabric-config.js for all Fabric-specific settings
 */
const config = {
  // Server configuration
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 4000,
    apiVersion: process.env.API_VERSION || 'v1',
  },

  // Fabric network configuration (delegated to fabric-config)
  fabric: {
    channelName: fabricConfig.network.channel.name,
    chaincodeName: fabricConfig.getDefaultChaincode(),
    orgName: process.env.ORG_NAME || 'Org1',
    mspId: fabricConfig.getDefaultMspId(),
    peerEndpoint: process.env.PEER_ENDPOINT || 'localhost:7051',
    connectionProfilePath: fabricConfig.profiles.default,
  },

  // Wallet configuration (delegated to fabric-config)
  wallet: {
    path: fabricConfig.wallet.basePath,
    adminUserId: fabricConfig.wallet.adminUserId,
    appUserId: fabricConfig.wallet.appUserId,
  },

  // Redis configuration for Bull Queue
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // WebSocket configuration
  websocket: {
    port: parseInt(process.env.WS_PORT, 10) || 4001,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:9002'],
    credentials: true,
  },
};

// Validate required configuration
const requiredConfig = [
  'fabric.channelName',
  'fabric.chaincodeName',
  'fabric.mspId',
];

requiredConfig.forEach((key) => {
  const keys = key.split('.');
  let value = config;
  keys.forEach((k) => {
    value = value?.[k];
  });
  
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
});

export default config;
