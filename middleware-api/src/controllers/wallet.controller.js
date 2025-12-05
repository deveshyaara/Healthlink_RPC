import { getWalletServiceInstance } from '../services/wallet.service.js';
import logger from '../utils/logger.js';

/**
 * WalletController
 * Handles HTTP requests for identity and wallet management
 */
class WalletController {
  /**
   * Enroll admin user
   * POST /api/v1/wallet/enroll-admin
   */
  async enrollAdmin(req, res, next) {
    try {
      const walletService = await getWalletServiceInstance();
      const result = await walletService.enrollAdmin();

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register and enroll a new user
   * POST /api/v1/wallet/register
   */
  async registerUser(req, res, next) {
    try {
      const { userId, role, affiliation } = req.body;

      const walletService = await getWalletServiceInstance();
      const result = await walletService.registerUser(userId, role, affiliation);

      res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user identity
   * GET /api/v1/wallet/identity/:userId
   */
  async getIdentity(req, res, next) {
    try {
      const { userId } = req.params;

      const walletService = await getWalletServiceInstance();
      const identity = await walletService.getIdentity(userId);

      if (!identity) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: `Identity not found for user: ${userId}`,
            statusCode: 404,
          },
        });
      }

      res.status(200).json({
        success: true,
        identity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all identities
   * GET /api/v1/wallet/identities
   */
  async listIdentities(req, res, next) {
    try {
      const walletService = await getWalletServiceInstance();
      const identities = await walletService.listIdentities();

      res.status(200).json({
        success: true,
        count: identities.length,
        identities,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove user identity
   * DELETE /api/v1/wallet/identity/:userId
   */
  async removeIdentity(req, res, next) {
    try {
      const { userId } = req.params;

      const walletService = await getWalletServiceInstance();
      const result = await walletService.removeIdentity(userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

const walletController = new WalletController();
export default walletController;
