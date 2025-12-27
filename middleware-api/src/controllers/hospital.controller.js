/**
 * Hospital Controller
 * Handles hospital operations: registration, department/staff management, analytics
 */

import logger from '../utils/logger.js';
import dbService from '../services/db.service.prisma.js';

class HospitalController {
  /**
     * Register a new hospital
     * POST /api/v1/hospital/register
     */
  async registerHospital(req, res) {
    try {
      const { name, registrationNumber, type, address, phone, email } = req.body;

      if (!name || !registrationNumber || !type || !address) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: name, registrationNumber, type, address',
        });
      }

      const hospital = await dbService.prisma.hospital.create({
        data: {
          name,
          registrationNumber,
          type,
          address,
          phone: phone || null,
          email: email || null,
        },
      });

      logger.info(`✅ Hospital registered: ${hospital.name} (${hospital.registrationNumber})`);

      res.status(201).json({
        status: 'success',
        data: hospital,
      });
    } catch (error) {
      logger.error('Failed to register hospital:', error);

      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Hospital with this registration number already exists',
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to register hospital',
      });
    }
  }

  /**
     * List all hospitals
     * GET /api/v1/hospital
     */
  async listHospitals(req, res) {
    try {
      const { isActive = 'true', type, limit = 50, offset = 0 } = req.query;

      const where = {
        isActive: isActive === 'true',
      };

      if (type) {
        where.type = type;
      }

      const hospitals = await dbService.prisma.hospital.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          departments: true,
          _count: {
            select: { staff: true, departments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = await dbService.prisma.hospital.count({ where });

      res.json({
        status: 'success',
        data: hospitals,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      });
    } catch (error) {
      logger.error('Failed to list hospitals:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve hospitals',
      });
    }
  }

  /**
     * Get hospital by ID
     * GET /api/v1/hospital/:hospitalId
     */
  async getHospital(req, res) {
    try {
      const { hospitalId } = req.params;

      const hospital = await dbService.prisma.hospital.findUnique({
        where: { id: hospitalId },
        include: {
          departments: true,
          staff: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              doctorSpecialization: true,
            },
          },
        },
      });

      if (!hospital) {
        return res.status(404).json({
          status: 'error',
          message: 'Hospital not found',
        });
      }

      res.json({
        status: 'success',
        data: hospital,
      });
    } catch (error) {
      logger.error('Failed to get hospital:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve hospital',
      });
    }
  }

  /**
     * Update hospital details
     * PATCH /api/v1/hospital/:hospitalId
     */
  async updateHospital(req, res) {
    try {
      const { hospitalId } = req.params;
      const updates = req.body;

      const hospital = await dbService.prisma.hospital.update({
        where: { id: hospitalId },
        data: updates,
      });

      res.json({
        status: 'success',
        data: hospital,
      });
    } catch (error) {
      logger.error('Failed to update hospital:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update hospital',
      });
    }
  }

  /**
     * Add department to hospital
     * POST /api/v1/hospital/:hospitalId/departments
     */
  async addDepartment(req, res) {
    try {
      const { hospitalId } = req.params;
      const { name, description, headDoctorId } = req.body;

      if (!name) {
        return res.status(400).json({
          status: 'error',
          message: 'Department name is required',
        });
      }

      const department = await dbService.prisma.department.create({
        data: {
          hospitalId,
          name,
          description: description || null,
          headDoctorId: headDoctorId || null,
        },
      });

      logger.info(`✅ Department added: ${name} to hospital ${hospitalId}`);

      res.status(201).json({
        status: 'success',
        data: department,
      });
    } catch (error) {
      logger.error('Failed to add department:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add department',
      });
    }
  }

  /**
     * List hospital departments
     * GET /api/v1/hospital/:hospitalId/departments
     */
  async listDepartments(req, res) {
    try {
      const { hospitalId } = req.params;

      const departments = await dbService.prisma.department.findMany({
        where: { hospitalId },
        orderBy: { name: 'asc' },
      });

      res.json({
        status: 'success',
        data: departments,
      });
    } catch (error) {
      logger.error('Failed to list departments:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve departments',
      });
    }
  }

  /**
     * Update department
     * PATCH /api/v1/hospital/:hospitalId/departments/:departmentId
     */
  async updateDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      const updates = req.body;

      const department = await dbService.prisma.department.update({
        where: { id: departmentId },
        data: updates,
      });

      res.json({
        status: 'success',
        data: department,
      });
    } catch (error) {
      logger.error('Failed to update department:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update department',
      });
    }
  }

  /**
     * Add staff member to hospital
     * POST /api/v1/hospital/:hospitalId/staff
     */
  async addStaff(req, res) {
    try {
      const { hospitalId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'userId is required',
        });
      }

      // Update user's hospitalId
      const user = await dbService.prisma.user.update({
        where: { id: userId },
        data: { hospitalId },
      });

      logger.info(`✅ Staff added: ${user.fullName} to hospital ${hospitalId}`);

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      logger.error('Failed to add staff:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add staff member',
      });
    }
  }

  /**
     * List hospital staff
     * GET /api/v1/hospital/:hospitalId/staff
     */
  async listStaff(req, res) {
    try {
      const { hospitalId } = req.params;
      const { role } = req.query;

      const where = { hospitalId };
      if (role) {
        where.role = role;
      }

      const staff = await dbService.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          phoneNumber: true,
          doctorSpecialization: true,
          doctorLicenseNumber: true,
          isActive: true,
        },
        orderBy: { fullName: 'asc' },
      });

      res.json({
        status: 'success',
        data: staff,
      });
    } catch (error) {
      logger.error('Failed to list staff:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve staff',
      });
    }
  }

  /**
     * Remove staff member from hospital
     * DELETE /api/v1/hospital/:hospitalId/staff/:userId
     */
  async removeStaff(req, res) {
    try {
      const { userId } = req.params;

      // Set hospitalId to null
      await dbService.prisma.user.update({
        where: { id: userId },
        data: { hospitalId: null },
      });

      res.json({
        status: 'success',
        message: 'Staff member removed from hospital',
      });
    } catch (error) {
      logger.error('Failed to remove staff:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove staff member',
      });
    }
  }

  /**
     * Get hospital analytics
     * GET /api/v1/hospital/:hospitalId/analytics
     */
  async getAnalytics(req, res) {
    try {
      const { hospitalId } = req.params;

      // Get staff affiliated with hospital
      const staff = await dbService.prisma.user.findMany({
        where: { hospitalId },
      });

      const staffIds = staff.map(s => s.id);

      // Count appointments with hospital doctors
      const totalAppointments = await dbService.prisma.appointment.count({
        where: { doctorId: { in: staffIds } },
      });

      const upcomingAppointments = await dbService.prisma.appointment.count({
        where: {
          doctorId: { in: staffIds },
          scheduledAt: { gte: new Date() },
          status: 'SCHEDULED',
        },
      });

      // Count departments
      const totalDepartments = await dbService.prisma.department.count({
        where: { hospitalId },
      });

      res.json({
        status: 'success',
        data: {
          staffCount: staff.length,
          departmentCount: totalDepartments,
          totalAppointments,
          upcomingAppointments,
          doctors: staff.filter(s => s.role === 'doctor').length,
        },
      });
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve analytics',
      });
    }
  }
}

export default new HospitalController();
