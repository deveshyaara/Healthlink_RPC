'use strict';

/**
 * Validation utilities for HealthLink contracts
 */
class Validators {

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number (international format)
     */
    static isValidPhone(phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Validate date format (ISO 8601)
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Validate future date
     */
    static isFutureDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        return date > now;
    }

    /**
     * Validate IPFS hash (CIDv0 or CIDv1)
     */
    static isValidIpfsHash(hash) {
        // CIDv0: Qm... (46 characters)
        // CIDv1: b... or z... (variable length)
        const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
        const cidv1Regex = /^[bz][A-Za-z2-7]{58}$/;
        return cidv0Regex.test(hash) || cidv1Regex.test(hash);
    }

    /**
     * Validate license number format
     */
    static isValidLicenseNumber(license) {
        // Customize based on your region
        return license && license.length >= 5 && license.length <= 20;
    }

    /**
     * Validate amount (positive number)
     */
    static isValidAmount(amount) {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0;
    }

    /**
     * Validate status value against allowed statuses
     */
    static isValidStatus(status, allowedStatuses) {
        return allowedStatuses.includes(status);
    }

    /**
     * Validate urgency level
     */
    static isValidUrgency(urgency) {
        const validUrgencies = ['routine', 'urgent', 'emergency'];
        return validUrgencies.includes(urgency);
    }

    /**
     * Validate rating (1-5)
     */
    static isValidRating(rating) {
        const num = parseInt(rating);
        return !isNaN(num) && num >= 1 && num <= 5;
    }

    /**
     * Validate UUID v4
     */
    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Sanitize string input
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return input;
        }
        return input.trim().replace(/[<>]/g, '');
    }

    /**
     * Validate and sanitize patient ID
     */
    static validatePatientId(patientId) {
        const sanitized = this.sanitizeString(patientId);
        if (!sanitized || sanitized.length < 3 || sanitized.length > 50) {
            throw new Error('Invalid patient ID format');
        }
        return sanitized;
    }

    /**
     * Validate and sanitize doctor ID
     */
    static validateDoctorId(doctorId) {
        const sanitized = this.sanitizeString(doctorId);
        if (!sanitized || sanitized.length < 3 || sanitized.length > 50) {
            throw new Error('Invalid doctor ID format');
        }
        return sanitized;
    }

    /**
     * Validate consent scope
     */
    static isValidConsentScope(scope) {
        const validScopes = [
            'view_records',
            'full_access',
            'emergency_access',
            'research',
            'limited_access'
        ];
        return validScopes.includes(scope);
    }

    /**
     * Validate prescription dosage format
     */
    static isValidDosage(dosage) {
        // Example: "500mg twice daily", "2 tablets every 8 hours"
        return dosage && dosage.length >= 5 && dosage.length <= 200;
    }

    /**
     * Validate time slot format (HH:MM)
     */
    static isValidTimeSlot(timeSlot) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex.test(timeSlot);
    }

    /**
     * Validate ID field (used by contracts)
     */
    static validateId(id, fieldName = 'ID') {
        const sanitized = this.sanitizeString(id);
        if (!sanitized || sanitized.length < 3 || sanitized.length > 100) {
            throw new Error(`Invalid ${fieldName}: must be 3-100 characters`);
        }
        return sanitized;
    }

    /**
     * Validate date field (used by contracts)
     */
    static validateDate(dateString, fieldName = 'Date') {
        if (!this.isValidDate(dateString)) {
            throw new Error(`Invalid ${fieldName}: must be a valid date`);
        }
        return dateString;
    }

    /**
     * Validate time field (used by contracts)
     */
    static validateTime(timeString, fieldName = 'Time') {
        if (!this.isValidTimeSlot(timeString)) {
            throw new Error(`Invalid ${fieldName}: must be in HH:MM format`);
        }
        return timeString;
    }

    /**
     * Validate email field (used by contracts)
     */
    static validateEmail(email, fieldName = 'Email') {
        if (!this.isValidEmail(email)) {
            throw new Error(`Invalid ${fieldName}: must be a valid email address`);
        }
        return email;
    }

    /**
     * Validate phone field (used by contracts)
     */
    static validatePhone(phone, fieldName = 'Phone') {
        if (!this.isValidPhone(phone)) {
            throw new Error(`Invalid ${fieldName}: must be a valid phone number`);
        }
        return phone;
    }
}

module.exports = { Validators };
