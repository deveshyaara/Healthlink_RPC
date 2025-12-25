import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fabricConfig from './fabric-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// On Vercel/Render, environment variables are injected directly into process.env
// Only load from .env files in local development
const isCloudPlatform = process.env.VERCEL === '1' || process.env.RENDER === 'true';
if (!isCloudPlatform) {
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
  const envPath = path.resolve(__dirname, '../../', envFile);
  dotenv.config({ path: envPath });
}

/**
 * Configuration object for the entire application
 * Centralizes all configuration values from environment variables
 * Now uses Ethereum instead of Fabric
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
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {return callback(null, true);}

      // Base allowed origins (strings)
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:9002',
      ];

      // Add custom origins from environment variable
      if (process.env.CORS_ORIGIN) {
        allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(o => o.trim()));
      }

      // Always allow GitHub Codespaces domains (regex)
      const githubCodespacesPattern = /https:\/\/.*\.app\.github\.dev$/;

      // Check if origin matches allowed strings
      const isAllowedString = allowedOrigins.includes(origin);

      // Check if origin matches Codespaces pattern
      const isCodespaces = githubCodespacesPattern.test(origin);

      if (isAllowedString || isCodespaces) {
        callback(null, true);
      } else {
        // Avoid importing logger here to prevent circular dependency during startup
        /* eslint-disable no-console */
        console.warn(`[CORS] Blocked origin: ${origin}`);
        /* eslint-enable no-console */
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  },
};

// Validate required configuration (Ethereum-focused)
const requiredConfig = [
  // Removed fabric requirements since we migrated to Ethereum
  // 'fabric.channelName',
  // 'fabric.chaincodeName',
  // 'fabric.mspId',
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
