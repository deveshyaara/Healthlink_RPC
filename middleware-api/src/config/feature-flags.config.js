/**
 * Feature Flags Configuration
 * Controls gradual rollout of Phase 1 features
 *
 * Environment Variables:
 * - ENABLE_PHARMACY: Enable pharmacy e-prescription system
 * - ENABLE_HOSPITAL: Enable hospital management
 * - ENABLE_INSURANCE: Enable insurance claims processing
 * - ENABLE_2FA: Enable two-factor authentication
 * - ENABLE_SYSTEM_AUDIT: Enable system audit logging
 */

export const featureFlags = {
  // Phase 1 Features
  enablePharmacy: process.env.ENABLE_PHARMACY === 'true',
  enableHospital: process.env.ENABLE_HOSPITAL === 'true',
  enableInsurance: process.env.ENABLE_INSURANCE === 'true',
  enable2FA: process.env.ENABLE_2FA === 'true',

  // Admin/Audit Features
  enableSystemAudit: process.env.ENABLE_SYSTEM_AUDIT === 'true',

  // Development Features
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableVerboseLogging: process.env.VERBOSE_LOGGING === 'true',
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {boolean} - Whether the feature is enabled
 */
export function isFeatureEnabled(featureName) {
  if (!(featureName in featureFlags)) {
    console.warn(`Feature flag '${featureName}' not found`);
    return false;
  }
  return featureFlags[featureName] === true;
}

/**
 * Middleware to require a feature flag to be enabled
 * Returns 503 Service Unavailable if feature is disabled
 * @param {string} featureName - Name of the feature to require
 * @returns {Function} Express middleware function
 */
export function requireFeature(featureName) {
  return (req, res, next) => {
    if (!isFeatureEnabled(featureName)) {
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        message: `Feature '${featureName}' is currently disabled`,
        error: {
          code: 'FEATURE_DISABLED',
          details: 'This feature is not available. Please contact system administrator.',
        },
      });
    }
    next();
  };
}

/**
 * Get all feature flags status (for admin dashboard)
 * @returns {Object} - Object with all feature flags and their status
 */
export function getAllFeatureFlags() {
  return { ...featureFlags };
}

/**
 * Log feature flags status on startup
 */
export function logFeatureFlagsStatus(logger) {
  logger.info('📋 Feature Flags Status:');
  logger.info(`  - Pharmacy System: ${featureFlags.enablePharmacy ? '✅ ENABLED' : '❌ DISABLED'}`);
  logger.info(`  - Hospital Management: ${featureFlags.enableHospital ? '✅ ENABLED' : '❌ DISABLED'}`);
  logger.info(`  - Insurance Claims: ${featureFlags.enableInsurance ? '✅ ENABLED' : '❌ DISABLED'}`);
  logger.info(`  - Two-Factor Auth: ${featureFlags.enable2FA ? '✅ ENABLED' : '❌ DISABLED'}`);
  logger.info(`  - System Audit Logs: ${featureFlags.enableSystemAudit ? '✅ ENABLED' : '❌ DISABLED'}`);
  logger.info(`  - Debug Mode: ${featureFlags.enableDebugMode ? '✅ ON' : '❌ OFF'}`);
}

export default featureFlags;
