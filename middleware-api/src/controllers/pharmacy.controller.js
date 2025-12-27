/**
 * Pharmacy Controller
 * Handles pharmacy operations: registration, prescription verification, inventory management
 */

import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

class PharmacyController {
  /**
     * Register a new pharmacy
     * POST /api/v1/pharmacy/register
     */
  async registerPharmacy(req, res) {
    try {
      const { name, licenseNumber, address, phone, email } = req.body;

      // Validate required fields
      if (!name || !licenseNumber || !address) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: name, licenseNumber, address',
        });
      }

      // Create pharmacy
      const pharmacy = await dbService.prisma.pharmacy.create({
        data: {
          name,
          licenseNumber,
          address,
          phone: phone || null,
          email: email || null,
        },
      });

      logger.info(`✅ Pharmacy registered: ${pharmacy.name} (${pharmacy.licenseNumber})`);

      res.status(201).json({
        status: 'success',
        data: pharmacy,
      });
    } catch (error) {
      logger.error('Failed to register pharmacy:', error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Pharmacy with this license number already exists',
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to register pharmacy',
        error: error.message,
      });
    }
  }

  /**
     * Get pharmacy by ID
     * GET /api/v1/pharmacy/:pharmacyId
     */
  async getPharmacy(req, res) {
    try {
      const { pharmacyId } = req.params;

      const pharmacy = await dbService.prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
        include: {
          inventory: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!pharmacy) {
        return res.status(404).json({
          status: 'error',
          message: 'Pharmacy not found',
        });
      }

      res.json({
        status: 'success',
        data: pharmacy,
      });
    } catch (error) {
      logger.error('Failed to get pharmacy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve pharmacy',
      });
    }
  }

  /**
     * List all pharmacies
     * GET /api/v1/pharmacy
     */
  async listPharmacies(req, res) {
    try {
      const { isActive = 'true', limit = 50, offset = 0 } = req.query;

      const pharmacies = await dbService.prisma.pharmacy.findMany({
        where: {
          isActive: isActive === 'true',
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
      });

      const total = await dbService.prisma.pharmacy.count({
        where: { isActive: isActive === 'true' },
      });

      res.json({
        status: 'success',
        data: pharmacies,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      logger.error('Failed to list pharmacies:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve pharmacies',
      });
    }
  }

  /**
     * Update pharmacy details
     * PATCH /api/v1/pharmacy/:pharmacyId
     */
  async updatePharmacy(req, res) {
    try {
      const { pharmacyId } = req.params;
      const updates = req.body;

      const pharmacy = await dbService.prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: updates,
      });

      res.json({
        status: 'success',
        data: pharmacy,
      });
    } catch (error) {
      logger.error('Failed to update pharmacy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update pharmacy',
      });
    }
  }

  /**
     * Verify prescription by QR code or prescription ID
     * POST /api/v1/pharmacy/:pharmacyId/verify-prescription
     */
  async verifyPrescription(req, res) {
    try {
      const { pharmacyId } = req.params;
      const { prescriptionId, qrCodeHash } = req.body;

      if (!prescriptionId) {
        return res.status(400).json({
          status: 'error',
          message: 'prescriptionId is required',
        });
      }

      // Get prescription from database
      const prescription = await dbService.prisma.prescription.findUnique({
        where: { prescriptionId },
        include: {
          patient: true,
          doctor: true,
        },
      });

      if (!prescription) {
        return res.status(404).json({
          status: 'error',
          message: 'Prescription not found',
          verified: false,
        });
      }

      // Check if already dispensed
      if (prescription.status === 'COMPLETED') {
        return res.status(400).json({
          status: 'error',
          message: 'Prescription already dispensed',
          verified: false,
        });
      }

      // Check expiry
      if (prescription.expiryDate && new Date(prescription.expiryDate) < new Date()) {
        return res.status(400).json({
          status: 'error',
          message: 'Prescription has expired',
          verified: false,
        });
      }

      // Verify QR code hash on blockchain if provided
      if (qrCodeHash) {
        try {
          const ethereumService = (await import('../services/ethereum.service.js')).default;
          const isValidQR = await ethereumService.verifyPrescriptionQR(prescriptionId, qrCodeHash);

          if (!isValidQR) {
            return res.status(400).json({
              status: 'error',
              message: 'Invalid QR code or prescription',
              details: 'QR verification failed on blockchain',
            });
          }

          logger.info(`✅ QR code verified on blockchain for prescription: ${prescriptionId}`);
        } catch (blockchainError) {
          logger.warn('Blockchain QR verification failed, skipping:', blockchainError.message);
          // Continue with database verification only
        }
      }

      res.json({
        status: 'success',
        verified: true,
        data: {
          prescription: {
            id: prescription.prescriptionId,
            medication: prescription.medication,
            dosage: prescription.dosage,
            instructions: prescription.instructions,
            patient: {
              name: prescription.patient.name,
              email: prescription.patient.email,
            },
            doctor: {
              fullName: prescription.doctor.fullName,
            },
            expiryDate: prescription.expiryDate,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to verify prescription:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify prescription',
      });
    }
  }

  /**
     * Dispense prescription
     * POST /api/v1/pharmacy/:pharmacyId/dispense
     */
  async dispensePrescription(req, res) {
    try {
      const { pharmacyId } = req.params;
      const { prescriptionId } = req.body;
      const pharmacistId = req.user.userId;

      // Update prescription status
      const prescription = await dbService.prisma.prescription.update({
        where: { prescriptionId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });

      // Call blockchain fillPrescription() function
      try {
        const ethereumService = (await import('../services/ethereum.service.js')).default;
        const txReceipt = await ethereumService.fillPrescription(
          prescriptionId,
          pharmacistId,
        );

        if (txReceipt) {
          logger.info(`✅ Prescription ${prescriptionId} filled on blockchain: ${txReceipt.transactionHash}`);
        }
      } catch (blockchainError) {
        logger.warn('Failed to record dispensing on blockchain, continuing with database only:', blockchainError.message);
        // Continue with database update even if blockchain fails
      }

      logger.info(`✅ Prescription dispensed: ${prescriptionId} by ${pharmacistId}`);

      res.json({
        status: 'success',
        message: 'Prescription dispensed successfully',
        data: prescription,
      });
    } catch (error) {
      logger.error('Failed to dispense prescription:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to dispense prescription',
      });
    }
  }

  /**
     * Get pharmacy inventory
     * GET /api/v1/pharmacy/:pharmacyId/inventory
     */
  async getInventory(req, res) {
    try {
      const { pharmacyId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const inventory = await dbService.prisma.drugInventory.findMany({
        where: { pharmacyId },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { drugName: 'asc' },
      });

      const total = await dbService.prisma.drugInventory.count({
        where: { pharmacyId },
      });

      res.json({
        status: 'success',
        data: inventory,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      });
    } catch (error) {
      logger.error('Failed to get inventory:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve inventory',
      });
    }
  }

  /**
     * Add or update drug in inventory
     * POST /api/v1/pharmacy/:pharmacyId/inventory
     */
  async updateInventory(req, res) {
    try {
      const { pharmacyId } = req.params;
      const { drugName, batchNumber, quantity, expiryDate, manufacturer, pricePerUnit } = req.body;

      // Check if drug with same batch already exists
      const existing = await dbService.prisma.drugInventory.findFirst({
        where: {
          pharmacyId,
          drugName,
          batchNumber,
        },
      });

      let drug;
      if (existing) {
        // Update quantity
        drug = await dbService.prisma.drugInventory.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      } else {
        // Create new entry
        drug = await dbService.prisma.drugInventory.create({
          data: {
            pharmacyId,
            drugName,
            batchNumber,
            quantity,
            expiryDate: new Date(expiryDate),
            manufacturer,
            pricePerUnit,
          },
        });
      }

      res.json({
        status: 'success',
        data: drug,
      });
    } catch (error) {
      logger.error('Failed to update inventory:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update inventory',
      });
    }
  }

  /**
     * Get inventory alerts (low stock, expiring soon)
     * GET /api/v1/pharmacy/:pharmacyId/inventory/alerts
     */
  async getInventoryAlerts(req, res) {
    try {
      const { pharmacyId } = req.params;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Low stock (< 10 units)
      const lowStock = await dbService.prisma.drugInventory.findMany({
        where: {
          pharmacyId,
          quantity: { lt: 10 },
        },
      });

      // Expiring soon (< 30 days)
      const expiringSoon = await dbService.prisma.drugInventory.findMany({
        where: {
          pharmacyId,
          expiryDate: { lt: thirtyDaysFromNow },
        },
      });

      res.json({
        status: 'success',
        data: {
          lowStock,
          expiringSoon,
        },
      });
    } catch (error) {
      logger.error('Failed to get inventory alerts:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve alerts',
      });
    }
  }

  /**
     * Get dispensing history
     * GET /api/v1/pharmacy/:pharmacyId/dispensed
     */
  async getDispensingHistory(req, res) {
    try {
      const { pharmacyId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Get completed prescriptions (dispensed)
      const history = await dbService.prisma.prescription.findMany({
        where: {
          status: 'COMPLETED',
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { updatedAt: 'desc' },
        include: {
          patient: true,
        },
      });

      res.json({
        status: 'success',
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get dispensing history:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve history',
      });
    }
  }
}

export default new PharmacyController();
