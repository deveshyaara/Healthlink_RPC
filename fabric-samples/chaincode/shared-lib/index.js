'use strict';

/**
 * HealthLink Shared Library - Central Export
 * This is the main entry point for the shared library.
 * All contracts should import from this file for consistency.
 */

const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const {
    HealthLinkError,
    AssetNotFoundError,
    AssetAlreadyExistsError,
    ValidationError,
    UnauthorizedError,
    InvalidStateError,
    ConflictError
} = require('./errors');

module.exports = {
    // Base Contract
    BaseHealthContract,
    
    // Validators
    Validators,
    
    // Error Classes
    HealthLinkError,
    AssetNotFoundError,
    AssetAlreadyExistsError,
    ValidationError,
    UnauthorizedError,
    InvalidStateError,
    ConflictError
};
