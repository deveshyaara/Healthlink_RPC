'use strict';

/**
 * Custom error classes for HealthLink contracts
 */

class HealthLinkError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: this.name,
            message: this.message,
            code: this.code
        };
    }
}

class AssetNotFoundError extends HealthLinkError {
    constructor(assetType, assetId) {
        super(`${assetType} with ID ${assetId} not found`, 'ASSET_NOT_FOUND');
        this.assetType = assetType;
        this.assetId = assetId;
    }
}

class AssetAlreadyExistsError extends HealthLinkError {
    constructor(assetType, assetId) {
        super(`${assetType} with ID ${assetId} already exists`, 'ASSET_EXISTS');
        this.assetType = assetType;
        this.assetId = assetId;
    }
}

class ValidationError extends HealthLinkError {
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class UnauthorizedError extends HealthLinkError {
    constructor(message) {
        super(message || 'Unauthorized access', 'UNAUTHORIZED');
    }
}

class InvalidStateError extends HealthLinkError {
    constructor(message) {
        super(message, 'INVALID_STATE');
    }
}

class ConflictError extends HealthLinkError {
    constructor(message) {
        super(message, 'CONFLICT');
    }
}

module.exports = {
    HealthLinkError,
    AssetNotFoundError,
    AssetAlreadyExistsError,
    ValidationError,
    UnauthorizedError,
    InvalidStateError,
    ConflictError
};
