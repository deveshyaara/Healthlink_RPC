/**
 * Audit Routes
 * Admin-only endpoints for viewing audit logs
 */

import express from 'express';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

const router = express.Router();

/**
 * Get Prisma client safely
 */
function getPrismaClient() {
  if (dbService && dbService.isReady && dbService.isReady()) {
    return dbService.prisma;
  }
  throw new Error('Database not connected. Check DATABASE_URL configuration.');
}

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs
 * @access  Admin only
 */
router.get('/logs', authenticateJWT, requireAdmin, async (req, res, next) => {
  try {
    const db = getPrismaClient();

    // Parse pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Check if audit_logs table exists
    let logs = [];
    try {
      logs = await db.auditLog?.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          action: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
        },
      }) || [];
    } catch (error) {
      // If audit_logs table doesn't exist yet, return empty array
      logger.warn('Audit logs table not found or query failed:', error.message);
      logs = [];
    }

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit,
        offset,
        total: logs.length,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs:', error);

    // Return empty array instead of error for graceful degradation
    res.json({
      success: true,
      data: [],
      message: 'Audit logs are not available yet',
    });
  }
});

/**
 * @route   GET /api/v1/audit/logs/:id
 * @desc    Get specific audit log by ID
 * @access  Admin only
 */
router.get('/logs/:id', authenticateJWT, requireAdmin, async (req, res, next) => {
  try {
    const db = getPrismaClient();

    const log = await db.auditLog?.findUnique({
      where: { id: req.params.id },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    logger.error('Failed to fetch audit log:', error);
    next(error);
  }
});

export default router;
