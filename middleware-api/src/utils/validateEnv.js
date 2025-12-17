/**
 * Environment Variable Validation
 * Ensures critical environment variables are set before server starts
 */

import logger from './logger.js';

const REQUIRED_ENV_VARS = {
  // Database
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_KEY: 'Supabase service key',
  DATABASE_URL: 'PostgreSQL database connection string',

  // Security
  ENCRYPTION_KEY: 'Encryption key for file storage (64 hex characters)',

  // Blockchain
  ETHEREUM_RPC_URL: 'Ethereum RPC URL',
  PRIVATE_KEY: 'Ethereum wallet private key',
};

const OPTIONAL_ENV_VARS = {
  JWT_SECRET: {
    defaultValue: 'healthlink-secret-key-change-in-production',
    warning: '⚠️  Using default JWT_SECRET - set a secure value in production!',
  },
  GEMINI_API_KEY: {
    defaultValue: null,
    warning: '⚠️  GEMINI_API_KEY not set - AI chat features will be unavailable',
  },
  GOOGLE_API_KEY: {
    defaultValue: null,
    warning: '⚠️  GOOGLE_API_KEY not set - AI chat features will be unavailable',
  },
};

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
export function validateRequiredEnvVars() {
  const missing = [];

  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[varName]) {
      missing.push(`  - ${varName}: ${description}`);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `\n❌ Missing required environment variables:\n${missing.join('\n')}\n\nPlease set these in your .env file.\n`;
    logger.error(errorMsg);
    throw new Error('Missing required environment variables');
  }
}

/**
 * Check optional environment variables and warn if using defaults
 */
export function checkOptionalEnvVars() {
  for (const [varName, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[varName];

    if (!value || (config.defaultValue && value === config.defaultValue)) {
      logger.warn(config.warning);
    }
  }
}

/**
 * Validate encryption key format (should be 64 hex characters)
 */
export function validateEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (key && key.length !== 64) {
    logger.warn('⚠️  ENCRYPTION_KEY should be 64 hex characters (32 bytes). Current length: ' + key.length);
  }

  if (key && !/^[0-9a-fA-F]+$/.test(key)) {
    logger.warn('⚠️  ENCRYPTION_KEY should contain only hexadecimal characters (0-9, a-f)');
  }
}

/**
 * Run all environment variable validations
 */
export function validateEnvironment() {
  logger.info('🔍 Validating environment variables...');

  validateRequiredEnvVars();
  checkOptionalEnvVars();
  validateEncryptionKey();

  logger.info('✅ Environment validation complete');
}
