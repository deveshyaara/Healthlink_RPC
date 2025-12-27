/**
 * Insurance Controller
 * Handles insurance providers, policies, and blockchain-integrated claims
 */

import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

class InsuranceController {
  /**
     * Register insurance provider
     * POST /api/v1/insurance/providers
     */
  async registerProvider(req, res) {
    try {
      const { name, registrationNumber, contactEmail, contactPhone } = req.body;

      if (!name || !registrationNumber || !contactEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: name, registrationNumber, contactEmail',
        });
      }

      const provider = await dbService.prisma.insuranceProvider.create({
        data: { name, registrationNumber, contactEmail, contactPhone: contactPhone || null },
      });

      logger.info(`✅ Insurance provider registered: ${provider.name}`);

      res.status(201).json({
        status: 'success',
        data: provider,
      });
    } catch (error) {
      logger.error('Failed to register insurance provider:', error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Insurance provider with this registration number already exists',
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to register insurance provider',
      });
    }
  }

  /**
     * List insurance providers
     * GET /api/v1/insurance/providers
     */
  async listProviders(req, res) {
    try {
      const { isActive = 'true' } = req.query;

      const providers = await dbService.prisma.insuranceProvider.findMany({
        where: { isActive: isActive === 'true' },
        orderBy: { name: 'asc' },
      });

      res.json({
        status: 'success',
        data: providers,
      });
    } catch (error) {
      logger.error('Failed to list insurance providers:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve providers',
      });
    }
  }

  /**
     * Create insurance policy for patient
     * POST /api/v1/insurance/policies
     */
  async createPolicy(req, res) {
    try {
      const { policyNumber, providerId, patientId, coverageAmount, validFrom, validUntil } = req.body;

      if (!policyNumber || !providerId || !patientId || !coverageAmount || !validFrom || !validUntil) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields',
        });
      }

      const policy = await dbService.prisma.insurancePolicy.create({
        data: {
          policyNumber,
          providerId,
          patientId,
          coverageAmount,
          validFrom: new Date(validFrom),
          validUntil: new Date(validUntil),
        },
        include: {
          provider: true,
          patient: true,
        },
      });

      logger.info(`✅ Insurance policy created: ${policyNumber}`);

      res.status(201).json({
        status: 'success',
        data: policy,
      });
    } catch (error) {
      logger.error('Failed to create policy:', error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Policy with this number already exists',
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to create policy',
      });
    }
  }

  /**
     * Get patient's insurance policies
     * GET /api/v1/insurance/policies/patient/:patientId
     */
  async getPatientPolicies(req, res) {
    try {
      const { patientId } = req.params;

      const policies = await dbService.prisma.insurancePolicy.findMany({
        where: { patientId },
        include: {
          provider: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        status: 'success',
        data: policies,
      });
    } catch (error) {
      logger.error('Failed to get patient policies:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve policies',
      });
    }
  }

  /**
     * Submit insurance claim (blockchain-integrated)
     * POST /api/v1/insurance/claims
     */
  async submitClaim(req, res) {
    try {
      const { policyId, claimedAmount, supportingDocs } = req.body;
      const providerId = req.user.userId; // Hospital/doctor submitting

      if (!policyId || !claimedAmount) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: policyId, claimedAmount',
        });
      }

      // Generate claim ID
      const claimId = `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Submit claim to blockchain
      let blockchainTxHash = null;
      try {
        // Get policy and patient details for blockchain
        const policy = await dbService.prisma.insurancePolicy.findUnique({
          where: { id: policyId },
          include: { patient: true },
        });

        if (!policy) {
          return res.status(404).json({
            status: 'error',
            message: 'Policy not found',
          });
        }

        const ethereumService = (await import('../services/ethereum.service.js')).default;
        const txReceipt = await ethereumService.submitInsuranceClaim(
          claimId,
          policy.policyNumber,
          policy.patient.walletAddress || policy.patientId,
          providerId,
          claimedAmount,
          supportingDocs || [],
        );

        if (txReceipt) {
          blockchainTxHash = txReceipt.transactionHash;
          logger.info(`Claim ${claimId} submitted to blockchain: ${blockchainTxHash}`);
        }
      } catch (blockchainError) {
        logger.warn('Failed to submit claim to blockchain, continuing with database only:', blockchainError.message);
        // Continue with database storage even if blockchain fails
      }

      const claim = await dbService.prisma.insuranceClaim.create({
        data: {
          claimId,
          policyId,
          providerId,
          claimedAmount,
          supportingDocs: supportingDocs || [],
          blockchainTxHash,
          status: 'SUBMITTED',
        },
        include: {
          policy: {
            include: {
              provider: true,
              patient: true,
            },
          },
        },
      });

      logger.info(`✅ Insurance claim submitted: ${claimId}`);

      res.status(201).json({
        status: 'success',
        data: claim,
      });
    } catch (error) {
      logger.error('Failed to submit claim:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to submit claim',
      });
    }
  }

  /**
     * Get claim by ID
     * GET /api/v1/insurance/claims/:claimId
     */
  async getClaim(req, res) {
    try {
      const { claimId } = req.params;

      const claim = await dbService.prisma.insuranceClaim.findUnique({
        where: { claimId },
        include: {
          policy: {
            include: {
              provider: true,
              patient: true,
            },
          },
        },
      });

      if (!claim) {
        return res.status(404).json({
          status: 'error',
          message: 'Claim not found',
        });
      }

      res.json({
        status: 'success',
        data: claim,
      });
    } catch (error) {
      logger.error('Failed to get claim:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve claim',
      });
    }
  }

  /**
     * List claims (filtered by role)
     * GET /api/v1/insurance/claims
     */
  async listClaims(req, res) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      const userRole = req.user.role;

      const where = {};
      if (status) {
        where.status = status;
      }

      // Filter by user role
      if (userRole === 'hospital_admin') {
        where.providerId = req.user.userId;
      }
      // Insurance and admin see all

      const claims = await dbService.prisma.insuranceClaim.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          policy: {
            include: {
              provider: true,
              patient: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = await dbService.prisma.insuranceClaim.count({ where });

      res.json({
        status: 'success',
        data: claims,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      });
    } catch (error) {
      logger.error('Failed to list claims:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve claims',
      });
    }
  }

  /**
     * Verify claim
     * PATCH /api/v1/insurance/claims/:claimId/verify
     */
  async verifyClaim(req, res) {
    try {
      const { claimId } = req.params;

      const claim = await dbService.prisma.insuranceClaim.update({
        where: { claimId },
        data: { status: 'VERIFIED' },
      });

      // Update blockchain state
      try {
        const ethereumService = (await import('../services/ethereum.service.js')).default;
        const txReceipt = await ethereumService.verifyInsuranceClaim(claimId);
        if (txReceipt) {
          logger.info(`Claim ${claimId} verified on blockchain: ${txReceipt.transactionHash}`);
          // Optionally update the claim with verification tx hash
          await dbService.prisma.insuranceClaim.update({
            where: { claimId },
            data: { blockchainTxHash: txReceipt.transactionHash },
          });
        }
      } catch (blockchainError) {
        logger.warn('Failed to update blockchain state for verification:', blockchainError.message);
      }

      logger.info(`✅ Claim verified: ${claimId}`);

      res.json({
        status: 'success',
        data: claim,
      });
    } catch (error) {
      logger.error('Failed to verify claim:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify claim',
      });
    }
  }

  /**
     * Approve claim with amount
     * PATCH /api/v1/insurance/claims/:claimId/approve
     */
  async approveClaim(req, res) {
    try {
      const { claimId } = req.params;
      const { approvedAmount } = req.body;

      if (!approvedAmount) {
        return res.status(400).json({
          status: 'error',
          message: 'approvedAmount is required',
        });
      }

      const claim = await dbService.prisma.insuranceClaim.update({
        where: { claimId },
        data: {
          status: 'APPROVED',
          approvedAmount,
        },
      });

      // Update blockchain state
      try {
        const ethereumService = (await import('../services/ethereum.service.js')).default;
        const txReceipt = await ethereumService.approveInsuranceClaim(claimId, approvedAmount);
        if (txReceipt) {
          logger.info(`Claim ${claimId} approved on blockchain: ${txReceipt.transactionHash}`);
          // Optionally update the claim with approval tx hash
          await dbService.prisma.insuranceClaim.update({
            where: { claimId },
            data: { blockchainTxHash: txReceipt.transactionHash },
          });
        }
      } catch (blockchainError) {
        logger.warn('Failed to update blockchain state for approval:', blockchainError.message);
      }

      logger.info(`✅ Claim approved: ${claimId} for ${approvedAmount}`);

      res.json({
        status: 'success',
        data: claim,
      });
    } catch (error) {
      logger.error('Failed to approve claim:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to approve claim',
      });
    }
  }

  /**
     * Reject claim with reason
     * PATCH /api/v1/insurance/claims/:claimId/reject
     */
  async rejectClaim(req, res) {
    try {
      const { claimId } = req.params;
      const { reason } = req.body;

      const claim = await dbService.prisma.insuranceClaim.update({
        where: { claimId },
        data: { status: 'REJECTED' },
      });

      // Update blockchain state with reason
      try {
        const ethereumService = (await import('../services/ethereum.service.js')).default;
        const txReceipt = await ethereumService.rejectInsuranceClaim(claimId, reason || 'No reason provided');
        if (txReceipt) {
          logger.info(`Claim ${claimId} rejected on blockchain: ${txReceipt.transactionHash}`);
          // Optionally update the claim with rejection tx hash
          await dbService.prisma.insuranceClaim.update({
            where: { claimId },
            data: { blockchainTxHash: txReceipt.transactionHash },
          });
        }
      } catch (blockchainError) {
        logger.warn('Failed to update blockchain state for rejection:', blockchainError.message);
      }

      logger.info(`✅ Claim rejected: ${claimId}`);

      res.json({
        status: 'success',
        data: claim,
        reason,
      });
    } catch (error) {
      logger.error('Failed to reject claim:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reject claim',
      });
    }
  }
}

export default new InsuranceController();
