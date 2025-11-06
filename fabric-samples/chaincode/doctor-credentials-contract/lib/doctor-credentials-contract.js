'use strict';

const { Contract } = require('fabric-contract-api');
const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const {
    AssetNotFoundError,
    AssetAlreadyExistsError,
    ValidationError,
    UnauthorizedError,
    InvalidStateError
} = require('./errors');/**
 * DoctorCredentialsContract - Manages doctor registration, verification, and credentials
 * Features:
 * - Doctor registration with credentials
 * - Verification by medical board
 * - Rating and review system
 * - Availability management
 * - Specialization tracking
 */
class DoctorCredentialsContract extends BaseHealthContract {

    /**
     * Register a new doctor
     */
    async RegisterDoctor(ctx, doctorId, name, specialization, licenseNumber, hospital, credentialsJson, contactJson) {
        console.info('============= START : Register Doctor ===========');

        // Validate required fields
        this.validateRequiredFields(
            { doctorId, name, specialization, licenseNumber, hospital, credentialsJson, contactJson },
            ['doctorId', 'name', 'specialization', 'licenseNumber', 'hospital', 'credentialsJson', 'contactJson']
        );

        // Check if doctor already exists
        const exists = await this.assetExists(ctx, doctorId);
        if (exists) {
            throw new AssetAlreadyExistsError('Doctor', doctorId);
        }

        // Validate license number
        if (!Validators.isValidLicenseNumber(licenseNumber)) {
            throw new ValidationError('Invalid license number format', 'licenseNumber');
        }

        // Parse credentials
        let credentials, contact;
        try {
            credentials = JSON.parse(credentialsJson);
            contact = JSON.parse(contactJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format', 'credentials/contact');
        }

        // Validate contact info
        if (contact.email && !Validators.isValidEmail(contact.email)) {
            throw new ValidationError('Invalid email format', 'contact.email');
        }

        if (contact.phone && !Validators.isValidPhone(contact.phone)) {
            throw new ValidationError('Invalid phone format', 'contact.phone');
        }

        const timestamp = this.getCurrentTimestamp(ctx);
        const callerId = this.getCallerId(ctx);

        const doctor = {
            docType: 'doctor',
            doctorId: Validators.validateDoctorId(doctorId),
            name: Validators.sanitizeString(name),
            specialization: specialization,
            licenseNumber: licenseNumber,
            hospital: hospital,
            credentials: credentials, // degrees, certifications, experience
            contact: contact,
            verificationStatus: 'pending',
            registeredAt: timestamp,
            registeredBy: callerId,
            verifiedAt: null,
            verifiedBy: null,
            verifierComments: null,
            rating: 0,
            totalReviews: 0,
            totalPatients: 0,
            status: 'active',
            availability: [],
            languages: credentials.languages || [],
            yearsOfExperience: credentials.yearsOfExperience || 0
        };

        // Store doctor
        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Create audit
        await this.createAuditRecord(ctx, 'RegisterDoctor', doctorId, 'doctor', {
            hospital: hospital,
            specialization: specialization
        });

        // Emit event
        this.emitEvent(ctx, 'DoctorRegistered', {
            doctorId: doctorId,
            name: name,
            specialization: specialization,
            timestamp: timestamp
        });

        console.info('============= END : Register Doctor ===========');
        return JSON.stringify({
            success: true,
            doctorId: doctorId,
            message: 'Doctor registered successfully. Pending verification.',
            doctor: doctor
        });
    }

    /**
     * Verify doctor credentials (by medical board admin)
     */
    async VerifyDoctor(ctx, doctorId, verificationStatus, verifierComments) {
        console.info('============= START : Verify Doctor ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        // Validate verification status
        const validStatuses = ['verified', 'rejected', 'pending_review'];
        if (!validStatuses.includes(verificationStatus)) {
            throw new ValidationError(`Verification status must be one of: ${validStatuses.join(', ')}`, 'verificationStatus');
        }

        const timestamp = this.getCurrentTimestamp(ctx);
        const callerId = this.getCallerId(ctx);

        doctor.verificationStatus = verificationStatus;
        doctor.verifiedAt = timestamp;
        doctor.verifiedBy = callerId;
        doctor.verifierComments = verifierComments || '';

        if (verificationStatus === 'rejected') {
            doctor.status = 'suspended';
        }

        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Audit
        await this.createAuditRecord(ctx, 'VerifyDoctor', doctorId, 'doctor', {
            verificationStatus: verificationStatus,
            verifierComments: verifierComments
        });

        // Emit event
        this.emitEvent(ctx, 'DoctorVerified', {
            doctorId: doctorId,
            verificationStatus: verificationStatus,
            timestamp: timestamp
        });

        console.info('============= END : Verify Doctor ===========');
        return JSON.stringify({
            success: true,
            message: `Doctor ${verificationStatus} successfully`,
            doctor: doctor
        });
    }

    /**
     * Get doctor profile
     */
    async GetDoctor(ctx, doctorId) {
        console.info('============= START : Get Doctor ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        console.info('============= END : Get Doctor ===========');
        return JSON.stringify(doctor);
    }

    /**
     * Get doctors by specialization
     */
    async GetDoctorsBySpecialization(ctx, specialization, verifiedOnly) {
        console.info('============= START : Get Doctors By Specialization ===========');

        const queryString = {
            selector: {
                docType: 'doctor',
                specialization: specialization,
                status: 'active'
            },
            sort: [{ rating: 'desc' }]
        };

        if (verifiedOnly === 'true') {
            queryString.selector.verificationStatus = 'verified';
        }

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Get Doctors By Specialization ===========');
        return results;
    }

    /**
     * Get doctors by hospital
     */
    async GetDoctorsByHospital(ctx, hospital) {
        console.info('============= START : Get Doctors By Hospital ===========');

        const queryString = {
            selector: {
                docType: 'doctor',
                hospital: hospital,
                status: 'active',
                verificationStatus: 'verified'
            },
            sort: [{ rating: 'desc' }]
        };

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Get Doctors By Hospital ===========');
        return results;
    }

    /**
     * Update doctor availability
     */
    async UpdateAvailability(ctx, doctorId, availabilitySlotsJson) {
        console.info('============= START : Update Availability ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        // Parse availability slots
        let availabilitySlots;
        try {
            availabilitySlots = JSON.parse(availabilitySlotsJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format for availability slots', 'availabilitySlotsJson');
        }

        // Validate time slots
        for (const slot of availabilitySlots) {
            if (!Validators.isValidTimeSlot(slot.startTime) || !Validators.isValidTimeSlot(slot.endTime)) {
                throw new ValidationError('Invalid time slot format. Use HH:MM', 'timeSlot');
            }
        }

        const timestamp = this.getCurrentTimestamp(ctx);

        doctor.availability = availabilitySlots;
        doctor.updatedAt = timestamp;

        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Audit
        await this.createAuditRecord(ctx, 'UpdateAvailability', doctorId, 'doctor', {
            slotsCount: availabilitySlots.length
        });

        console.info('============= END : Update Availability ===========');
        return JSON.stringify({
            success: true,
            message: 'Availability updated successfully',
            availability: availabilitySlots
        });
    }

    /**
     * Rate doctor (by patient)
     */
    async RateDoctor(ctx, doctorId, patientId, rating, reviewText) {
        console.info('============= START : Rate Doctor ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        // Validate rating
        if (!Validators.isValidRating(rating)) {
            throw new ValidationError('Rating must be between 1 and 5', 'rating');
        }

        const numRating = parseInt(rating);
        const timestamp = this.getCurrentTimestamp(ctx);

        // Calculate new average rating
        const totalRatings = (doctor.rating * doctor.totalReviews) + numRating;
        doctor.totalReviews += 1;
        doctor.rating = parseFloat((totalRatings / doctor.totalReviews).toFixed(2));

        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Create review record
        const reviewId = `review_${doctorId}_${Date.now()}`;
        const review = {
            docType: 'review',
            reviewId: reviewId,
            doctorId: doctorId,
            patientId: Validators.validatePatientId(patientId),
            rating: numRating,
            reviewText: Validators.sanitizeString(reviewText),
            timestamp: timestamp,
            helpful: 0,
            flagged: false
        };

        await ctx.stub.putState(reviewId, Buffer.from(JSON.stringify(review)));

        // Audit
        await this.createAuditRecord(ctx, 'RateDoctor', doctorId, 'doctor', {
            patientId: patientId,
            rating: numRating,
            newAverageRating: doctor.rating
        });

        // Emit event
        this.emitEvent(ctx, 'DoctorRated', {
            doctorId: doctorId,
            rating: numRating,
            newAverage: doctor.rating,
            timestamp: timestamp
        });

        console.info('============= END : Rate Doctor ===========');
        return JSON.stringify({
            success: true,
            message: 'Doctor rated successfully',
            doctor: {
                doctorId: doctor.doctorId,
                rating: doctor.rating,
                totalReviews: doctor.totalReviews
            },
            review: review
        });
    }

    /**
     * Get reviews for a doctor
     */
    async GetDoctorReviews(ctx, doctorId) {
        console.info('============= START : Get Doctor Reviews ===========');

        const queryString = {
            selector: {
                docType: 'review',
                doctorId: doctorId,
                flagged: false
            },
            sort: [{ timestamp: 'desc' }]
        };

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Get Doctor Reviews ===========');
        return results;
    }

    /**
     * Update doctor profile
     */
    async UpdateDoctorProfile(ctx, doctorId, updatedFieldsJson) {
        console.info('============= START : Update Doctor Profile ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        // Parse updated fields
        let updatedFields;
        try {
            updatedFields = JSON.parse(updatedFieldsJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format', 'updatedFieldsJson');
        }

        const timestamp = this.getCurrentTimestamp(ctx);

        // Update allowed fields only
        const allowedFields = ['hospital', 'contact', 'languages', 'yearsOfExperience'];
        for (const field of allowedFields) {
            if (updatedFields[field] !== undefined) {
                doctor[field] = updatedFields[field];
            }
        }

        doctor.updatedAt = timestamp;

        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Audit
        await this.createAuditRecord(ctx, 'UpdateDoctorProfile', doctorId, 'doctor', {
            updatedFields: Object.keys(updatedFields)
        });

        console.info('============= END : Update Doctor Profile ===========');
        return JSON.stringify({
            success: true,
            message: 'Doctor profile updated successfully',
            doctor: doctor
        });
    }

    /**
     * Suspend doctor account
     */
    async SuspendDoctor(ctx, doctorId, reason) {
        console.info('============= START : Suspend Doctor ===========');

        const doctor = await this.getAsset(ctx, doctorId);

        if (doctor.docType !== 'doctor') {
            throw new ValidationError('Asset is not a doctor profile', 'doctorId');
        }

        const timestamp = this.getCurrentTimestamp(ctx);

        doctor.status = 'suspended';
        doctor.suspendedAt = timestamp;
        doctor.suspensionReason = reason;

        await ctx.stub.putState(doctorId, Buffer.from(JSON.stringify(doctor)));

        // Audit
        await this.createAuditRecord(ctx, 'SuspendDoctor', doctorId, 'doctor', {
            reason: reason
        });

        console.info('============= END : Suspend Doctor ===========');
        return JSON.stringify({
            success: true,
            message: 'Doctor suspended successfully'
        });
    }

    /**
     * Search doctors by multiple criteria
     */
    async SearchDoctors(ctx, searchCriteriaJson) {
        console.info('============= START : Search Doctors ===========');

        let criteria;
        try {
            criteria = JSON.parse(searchCriteriaJson);
        } catch (error) {
            throw new ValidationError('Invalid JSON format', 'searchCriteriaJson');
        }

        const queryString = {
            selector: {
                docType: 'doctor',
                status: 'active',
                verificationStatus: 'verified'
            }
        };

        // Add filters
        if (criteria.specialization) {
            queryString.selector.specialization = criteria.specialization;
        }

        if (criteria.hospital) {
            queryString.selector.hospital = criteria.hospital;
        }

        if (criteria.minRating) {
            queryString.selector.rating = { $gte: parseFloat(criteria.minRating) };
        }

        if (criteria.languages) {
            queryString.selector.languages = { $in: criteria.languages };
        }

        // Sort
        queryString.sort = [{ rating: 'desc' }];

        const results = await this.getQueryResults(ctx, queryString);

        console.info('============= END : Search Doctors ===========');
        return results;
    }
}

module.exports = DoctorCredentialsContract;
