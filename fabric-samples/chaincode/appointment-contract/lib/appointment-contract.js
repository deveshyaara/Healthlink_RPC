'use strict';

const { Contract } = require('fabric-contract-api');
const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const { 
    ValidationError, 
    AssetNotFoundError, 
    ConflictError,
    InvalidStateError,
    UnauthorizedError 
} = require('./errors');

/**
 * AppointmentContract - Smart contract for managing patient-doctor appointments
 * 
 * Features:
 * - Appointment scheduling with conflict detection
 * - Status management (scheduled, confirmed, completed, cancelled, no-show)
 * - Automatic reminder tracking
 * - Slot availability management
 * - Patient and doctor appointment history
 * - Rescheduling with history tracking
 * - Search and filtering capabilities
 */
class AppointmentContract extends BaseHealthContract {

    /**
     * Schedule a new appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Unique appointment ID
     * @param {string} patientId - Patient identifier
     * @param {string} doctorId - Doctor identifier
     * @param {string} appointmentDate - ISO 8601 date string
     * @param {string} startTime - Start time (HH:MM format)
     * @param {string} endTime - End time (HH:MM format)
     * @param {string} reasonJson - JSON string with reason, symptoms, notes
     * @returns {Object} Success response with appointment details
     */
    async ScheduleAppointment(ctx, appointmentId, patientId, doctorId, appointmentDate, startTime, endTime, reasonJson) {
        console.info('============= START : Schedule Appointment ===========');
        console.info('Context:', ctx ? 'EXISTS' : 'UNDEFINED');
        console.info('Context stub:', ctx && ctx.stub ? 'EXISTS' : 'UNDEFINED');
        
        // Validate required fields
        this.validateRequiredFields(
            { appointmentId, patientId, doctorId, appointmentDate, startTime, endTime },
            ['appointmentId', 'patientId', 'doctorId', 'appointmentDate', 'startTime', 'endTime']
        );

        // Validate formats
        Validators.validateId(appointmentId, 'Appointment ID');
        Validators.validateId(patientId, 'Patient ID');
        Validators.validateId(doctorId, 'Doctor ID');
        Validators.validateDate(appointmentDate, 'Appointment date');
        Validators.validateTime(startTime, 'Start time');
        Validators.validateTime(endTime, 'End time');

        // Check if appointment already exists
        const exists = await this.assetExists(ctx, appointmentId);
        if (exists) {
            throw new ConflictError(`Appointment with ID ${appointmentId} already exists`);
        }

        // Parse and validate reason
        let reason = {};
        try {
            reason = JSON.parse(reasonJson);
            if (!reason.purpose) {
                throw new ValidationError('Appointment purpose is required in reason');
            }
        } catch (error) {
            if (error instanceof ValidationError) throw error;
            throw new ValidationError('Invalid reason JSON format');
        }

        // Validate time logic
        if (startTime >= endTime) {
            throw new ValidationError('Start time must be before end time');
        }

        // Check for appointment conflicts for the doctor
        const conflictingAppointments = await this._checkDoctorConflicts(ctx, doctorId, appointmentDate, startTime, endTime);
        if (conflictingAppointments.length > 0) {
            throw new ConflictError(`Doctor has conflicting appointment(s) at this time: ${conflictingAppointments.join(', ')}`);
        }

        // Create appointment object
        const appointment = {
            docType: 'appointment',
            appointmentId,
            patientId,
            doctorId,
            appointmentDate,
            startTime,
            endTime,
            duration: this._calculateDuration(startTime, endTime),
            reason: {
                purpose: reason.purpose,
                symptoms: reason.symptoms || [],
                notes: reason.notes || '',
                urgency: reason.urgency || 'normal'
            },
            status: 'scheduled',
            createdAt: this.getCurrentTimestamp(ctx),
            createdBy: this.getCallerId(ctx),
            updatedAt: this.getCurrentTimestamp(ctx),
            confirmedAt: null,
            confirmedBy: null,
            completedAt: null,
            cancelledAt: null,
            cancellationReason: null,
            remindersSent: [],
            prescriptionIds: [],
            labTestIds: [],
            followUpAppointmentId: null,
            isFollowUp: false,
            originalAppointmentId: null,
            rescheduledFrom: null,
            rescheduledTo: null,
            history: []
        };

        // Save appointment
        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        // Create audit record
        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_SCHEDULED',
            appointmentId,
            patientId,
            doctorId,
            date: appointmentDate,
            time: `${startTime}-${endTime}`,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            appointmentId,
            message: 'Appointment scheduled successfully',
            appointment
        };
    }

    /**
     * Get appointment details
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @returns {Object} Appointment details
     */
    async GetAppointment(ctx, appointmentId) {
        Validators.validateId(appointmentId, 'Appointment ID');

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        return appointment;
    }

    /**
     * Confirm an appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @param {string} confirmerId - ID of person confirming (patient or staff)
     * @returns {Object} Success response
     */
    async ConfirmAppointment(ctx, appointmentId, confirmerId) {
        Validators.validateId(appointmentId, 'Appointment ID');
        Validators.validateId(confirmerId, 'Confirmer ID');

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        if (appointment.status !== 'scheduled') {
            throw new InvalidStateError(
                `Cannot confirm appointment in status: ${appointment.status}`,
                'INVALID_STATUS_TRANSITION'
            );
        }

        // Update appointment
        appointment.status = 'confirmed';
        appointment.confirmedAt = this.getCurrentTimestamp(ctx);
        appointment.confirmedBy = confirmerId;
        appointment.updatedAt = this.getCurrentTimestamp(ctx);
        
        appointment.history.push({
            action: 'confirmed',
            timestamp: this.getCurrentTimestamp(ctx),
            by: confirmerId,
            previousStatus: 'scheduled'
        });

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_CONFIRMED',
            appointmentId,
            confirmedBy: confirmerId,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Appointment confirmed successfully',
            appointment
        };
    }

    /**
     * Complete an appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @param {string} notesJson - JSON string with completion notes
     * @returns {Object} Success response
     */
    async CompleteAppointment(ctx, appointmentId, notesJson) {
        Validators.validateId(appointmentId, 'Appointment ID');

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        if (!['scheduled', 'confirmed'].includes(appointment.status)) {
            throw new InvalidStateError(
                `Cannot complete appointment in status: ${appointment.status}`,
                'INVALID_STATUS_TRANSITION'
            );
        }

        // Parse completion notes
        let notes = {};
        try {
            notes = JSON.parse(notesJson || '{}');
        } catch (error) {
            throw new ValidationError('Invalid notes JSON format');
        }

        // Update appointment
        const previousStatus = appointment.status;
        appointment.status = 'completed';
        appointment.completedAt = this.getCurrentTimestamp(ctx);
        appointment.updatedAt = this.getCurrentTimestamp(ctx);
        appointment.completionNotes = {
            diagnosis: notes.diagnosis || '',
            treatment: notes.treatment || '',
            notes: notes.notes || '',
            prescriptionIds: notes.prescriptionIds || [],
            labTestIds: notes.labTestIds || [],
            followUpRequired: notes.followUpRequired || false,
            followUpDate: notes.followUpDate || null
        };

        appointment.history.push({
            action: 'completed',
            timestamp: this.getCurrentTimestamp(ctx),
            by: this.getCallerId(ctx),
            previousStatus,
            notes: appointment.completionNotes
        });

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_COMPLETED',
            appointmentId,
            completedBy: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Appointment completed successfully',
            appointment
        };
    }

    /**
     * Cancel an appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @param {string} reason - Cancellation reason
     * @param {string} cancelledBy - ID of person cancelling
     * @returns {Object} Success response
     */
    async CancelAppointment(ctx, appointmentId, reason, cancelledBy) {
        Validators.validateId(appointmentId, 'Appointment ID');
        
        if (!reason || reason.trim().length === 0) {
            throw new ValidationError('Cancellation reason is required');
        }

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        if (!['scheduled', 'confirmed'].includes(appointment.status)) {
            throw new InvalidStateError(
                `Cannot cancel appointment in status: ${appointment.status}`,
                'INVALID_STATUS_TRANSITION'
            );
        }

        // Update appointment
        const previousStatus = appointment.status;
        appointment.status = 'cancelled';
        appointment.cancelledAt = this.getCurrentTimestamp(ctx);
        appointment.cancellationReason = reason;
        appointment.cancelledBy = cancelledBy;
        appointment.updatedAt = this.getCurrentTimestamp(ctx);

        appointment.history.push({
            action: 'cancelled',
            timestamp: this.getCurrentTimestamp(ctx),
            by: cancelledBy,
            previousStatus,
            reason
        });

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_CANCELLED',
            appointmentId,
            reason,
            cancelledBy,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Appointment cancelled successfully',
            appointment
        };
    }

    /**
     * Reschedule an appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Original appointment ID
     * @param {string} newDate - New date
     * @param {string} newStartTime - New start time
     * @param {string} newEndTime - New end time
     * @param {string} reason - Rescheduling reason
     * @returns {Object} Success response with new appointment
     */
    async RescheduleAppointment(ctx, appointmentId, newDate, newStartTime, newEndTime, reason) {
        Validators.validateId(appointmentId, 'Original Appointment ID');
        Validators.validateDate(newDate, 'New date');
        Validators.validateTime(newStartTime, 'New start time');
        Validators.validateTime(newEndTime, 'New end time');

        const originalAppointment = await this.getAsset(ctx, appointmentId);
        if (!originalAppointment || originalAppointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        if (!['scheduled', 'confirmed'].includes(originalAppointment.status)) {
            throw new InvalidStateError(
                `Cannot reschedule appointment in status: ${originalAppointment.status}`,
                'INVALID_STATUS_TRANSITION'
            );
        }

        // Auto-generate new appointment ID using deterministic timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const newAppointmentId = `${appointmentId}_R${txTimestamp.seconds}${txTimestamp.nanos}`;

        // Check for conflicts at new time
        const conflicts = await this._checkDoctorConflicts(
            ctx, 
            originalAppointment.doctorId, 
            newDate, 
            newStartTime, 
            newEndTime
        );
        if (conflicts.length > 0) {
            throw new ConflictError(`Doctor has conflicting appointment(s): ${conflicts.join(', ')}`);
        }

        // Cancel original appointment
        const previousStatus = originalAppointment.status;
        originalAppointment.status = 'rescheduled';
        originalAppointment.rescheduledTo = newAppointmentId;
        originalAppointment.updatedAt = this.getCurrentTimestamp(ctx);
        originalAppointment.history.push({
            action: 'rescheduled',
            timestamp: this.getCurrentTimestamp(ctx),
            by: this.getCallerId(ctx),
            previousStatus,
            reason,
            newAppointmentId
        });

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(originalAppointment)));

        // Create new appointment
        const newAppointment = {
            ...originalAppointment,
            appointmentId: newAppointmentId,
            appointmentDate: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            duration: this._calculateDuration(newStartTime, newEndTime),
            status: 'scheduled',
            rescheduledFrom: appointmentId,
            originalAppointmentId: originalAppointment.originalAppointmentId || appointmentId,
            createdAt: this.getCurrentTimestamp(ctx),
            updatedAt: this.getCurrentTimestamp(ctx),
            confirmedAt: null,
            confirmedBy: null,
            completedAt: null,
            cancelledAt: null,
            cancellationReason: null,
            history: [{
                action: 'created_from_reschedule',
                timestamp: this.getCurrentTimestamp(ctx),
                by: this.getCallerId(ctx),
                originalAppointmentId: appointmentId,
                reason
            }]
        };

        await ctx.stub.putState(newAppointmentId, Buffer.from(JSON.stringify(newAppointment)));

        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_RESCHEDULED',
            originalAppointmentId: appointmentId,
            newAppointmentId,
            newDate,
            newTime: `${newStartTime}-${newEndTime}`,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Appointment rescheduled successfully',
            originalAppointment,
            newAppointment
        };
    }

    /**
     * Mark appointment as no-show
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @returns {Object} Success response
     */
    async MarkNoShow(ctx, appointmentId) {
        Validators.validateId(appointmentId, 'Appointment ID');

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        if (!['scheduled', 'confirmed'].includes(appointment.status)) {
            throw new InvalidStateError(
                `Cannot mark as no-show in status: ${appointment.status}`,
                'INVALID_STATUS_TRANSITION'
            );
        }

        const previousStatus = appointment.status;
        appointment.status = 'no-show';
        appointment.updatedAt = this.getCurrentTimestamp(ctx);
        appointment.history.push({
            action: 'marked_no_show',
            timestamp: this.getCurrentTimestamp(ctx),
            by: this.getCallerId(ctx),
            previousStatus
        });

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        await this.createAuditRecord(ctx, {
            action: 'APPOINTMENT_NO_SHOW',
            appointmentId,
            actor: this.getCallerId(ctx)
        });

        return {
            success: true,
            message: 'Appointment marked as no-show',
            appointment
        };
    }

    /**
     * Get appointments by patient
     * @param {Context} ctx - Transaction context
     * @param {string} patientId - Patient ID
     * @returns {Array} List of appointments
     */
    async GetPatientAppointments(ctx, patientId) {
        Validators.validateId(patientId, 'Patient ID');

        const query = {
            selector: {
                docType: 'appointment',
                patientId
            },
            sort: [{ appointmentDate: 'desc' }, { startTime: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get appointments by doctor
     * @param {Context} ctx - Transaction context
     * @param {string} doctorId - Doctor ID
     * @returns {Array} List of appointments
     */
    async GetDoctorAppointments(ctx, doctorId) {
        Validators.validateId(doctorId, 'Doctor ID');

        const query = {
            selector: {
                docType: 'appointment',
                doctorId
            },
            sort: [{ appointmentDate: 'desc' }, { startTime: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get appointments by date range
     * @param {Context} ctx - Transaction context
     * @param {string} startDate - Start date (ISO 8601)
     * @param {string} endDate - End date (ISO 8601)
     * @returns {Array} List of appointments
     */
    async GetAppointmentsByDateRange(ctx, startDate, endDate) {
        Validators.validateDate(startDate, 'Start date');
        Validators.validateDate(endDate, 'End date');

        const query = {
            selector: {
                docType: 'appointment',
                appointmentDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            },
            sort: [{ appointmentDate: 'asc' }, { startTime: 'asc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get doctor's appointments for a specific date
     * @param {Context} ctx - Transaction context
     * @param {string} doctorId - Doctor ID
     * @param {string} date - Date (ISO 8601)
     * @returns {Array} List of appointments
     */
    async GetDoctorSchedule(ctx, doctorId, date) {
        Validators.validateId(doctorId, 'Doctor ID');
        Validators.validateDate(date, 'Date');

        const query = {
            selector: {
                docType: 'appointment',
                doctorId,
                appointmentDate: date,
                status: { $in: ['scheduled', 'confirmed'] }
            },
            sort: [{ startTime: 'asc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Search appointments with filters
     * @param {Context} ctx - Transaction context
     * @param {string} filtersJson - JSON string with search filters
     * @returns {Array} Filtered appointments
     */
    async SearchAppointments(ctx, filtersJson) {
        let filters = {};
        try {
            filters = JSON.parse(filtersJson);
        } catch (error) {
            throw new ValidationError('Invalid filters JSON format');
        }

        const selector = { docType: 'appointment' };

        if (filters.patientId) selector.patientId = filters.patientId;
        if (filters.doctorId) selector.doctorId = filters.doctorId;
        if (filters.status) selector.status = filters.status;
        if (filters.dateFrom || filters.dateTo) {
            selector.appointmentDate = {};
            if (filters.dateFrom) selector.appointmentDate.$gte = filters.dateFrom;
            if (filters.dateTo) selector.appointmentDate.$lte = filters.dateTo;
        }
        if (filters.urgency) selector['reason.urgency'] = filters.urgency;

        const query = {
            selector,
            sort: [{ appointmentDate: 'desc' }, { startTime: 'desc' }]
        };

        return await this.executeQuery(ctx, query);
    }

    /**
     * Get appointment history (audit trail)
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @returns {Array} History of changes
     */
    async GetAppointmentHistory(ctx, appointmentId) {
        Validators.validateId(appointmentId, 'Appointment ID');

        const history = await this.getAssetHistory(ctx, appointmentId);
        return history;
    }

    /**
     * Add reminder to appointment
     * @param {Context} ctx - Transaction context
     * @param {string} appointmentId - Appointment ID
     * @param {string} reminderType - Type of reminder (sms, email, push)
     * @returns {Object} Success response
     */
    async AddReminder(ctx, appointmentId, reminderType) {
        Validators.validateId(appointmentId, 'Appointment ID');

        const appointment = await this.getAsset(ctx, appointmentId);
        if (!appointment || appointment.docType !== 'appointment') {
            throw new AssetNotFoundError('Appointment', appointmentId);
        }

        const reminder = {
            type: reminderType,
            sentAt: this.getCurrentTimestamp(ctx),
            status: 'sent'
        };

        appointment.remindersSent.push(reminder);
        appointment.updatedAt = this.getCurrentTimestamp(ctx);

        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));

        return {
            success: true,
            message: `${reminderType} reminder added successfully`,
            reminder
        };
    }

    // ==================== Private Helper Methods ====================

    /**
     * Check for doctor appointment conflicts
     * @private
     */
    async _checkDoctorConflicts(ctx, doctorId, date, startTime, endTime) {
        console.info('_checkDoctorConflicts: Starting check for doctor:', doctorId);
        console.info('Context in _checkDoctorConflicts:', ctx ? 'EXISTS' : 'UNDEFINED');
        console.info('Context stub in _checkDoctorConflicts:', ctx && ctx.stub ? 'EXISTS' : 'UNDEFINED');
        
        const query = {
            selector: {
                docType: 'appointment',
                doctorId,
                appointmentDate: date,
                status: { $in: ['scheduled', 'confirmed'] }
            }
        };

        console.info('About to call executeQuery');
        const appointments = await this.executeQuery(ctx, query);
        console.info('executeQuery completed, results:', appointments.length);
        const conflicts = [];

        for (const appt of appointments) {
            // Check for time overlap
            if (this._timesOverlap(startTime, endTime, appt.Record.startTime, appt.Record.endTime)) {
                conflicts.push(appt.Record.appointmentId);
            }
        }

        return conflicts;
    }

    /**
     * Check if two time ranges overlap
     * @private
     */
    _timesOverlap(start1, end1, start2, end2) {
        return (start1 < end2) && (end1 > start2);
    }

    /**
     * Calculate duration in minutes between two times
     * @private
     */
    _calculateDuration(startTime, endTime) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        return endMinutes - startMinutes;
    }
}

module.exports = AppointmentContract;
