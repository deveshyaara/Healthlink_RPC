# HealthLink Shared Library

**Version**: 1.0.0  
**Type**: Reusable Smart Contract Components  
**License**: Apache-2.0

---

## 📖 Overview

This is the **permanent shared library** for all HealthLink Pro smart contracts. It provides reusable base classes, validators, and error handling to eliminate code duplication and ensure consistency across all contracts.

---

## 🏗️ Architecture

### Components

1. **BaseHealthContract** - Base class with common functionality
2. **Validators** - Input validation utilities
3. **Error Classes** - Custom error hierarchy

---

## 📦 Installation

### For New Contracts

Since Hyperledger Fabric packages chaincode with embedded dependencies, copy the shared library files into your contract:

```bash
# Copy shared library to your contract
cp -r fabric-samples/chaincode/shared-lib/*.js \
      fabric-samples/chaincode/your-contract/lib/
```

### Import in Your Contract

```javascript
const { BaseHealthContract } = require('./base-contract');
const { Validators } = require('./validators');
const { ValidationError, AssetNotFoundError } = require('./errors');

class YourContract extends BaseHealthContract {
    async YourFunction(ctx, param1, param2) {
        // Validate inputs
        this.validateRequiredFields(
            { param1, param2 },
            ['param1', 'param2']
        );
        
        // Use validators
        if (!Validators.isValidEmail(param1)) {
            throw new ValidationError('Invalid email', 'param1');
        }
        
        // Your logic here
        const asset = await this.getAsset(ctx, param2);
        
        // Create audit trail
        await this.createAuditRecord(ctx, 'YourFunction', param2, 'asset', {
            param1: param1
        });
        
        return asset;
    }
}

module.exports = { YourContract };
```

---

## 🔧 BaseHealthContract API

### Asset Management

#### `assetExists(ctx, assetId)`
Check if an asset exists on the ledger.
```javascript
const exists = await this.assetExists(ctx, 'ASSET001');
```

#### `getAsset(ctx, assetId)`
Get asset by ID with automatic error handling.
```javascript
const asset = await this.getAsset(ctx, 'ASSET001');
// Throws AssetNotFoundError if not found
```

#### `validateRequiredFields(fields, fieldNames)`
Validate that required fields are present.
```javascript
this.validateRequiredFields(
    { name, email, phone },
    ['name', 'email', 'phone']
);
```

### Querying

#### `executeQuery(ctx, queryString)`
Execute CouchDB rich query.
```javascript
const results = await this.executeQuery(ctx, {
    selector: { docType: 'patient', status: 'active' },
    sort: [{ createdAt: 'desc' }]
});
```

#### `getQueryResultsWithPagination(ctx, queryString, pageSize, bookmark)`
Get paginated query results.
```javascript
const page = await this.getQueryResultsWithPagination(ctx, query, 25, '');
```

### Audit & History

#### `createAuditRecord(ctx, action, targetId, targetType, details)`
Create immutable audit trail.
```javascript
await this.createAuditRecord(ctx, 'UpdateRecord', 'REC001', 'medicalRecord', {
    updatedFields: ['status', 'notes']
});
```

#### `getAssetHistory(ctx, assetId)`
Get full version history of an asset.
```javascript
const history = await this.getAssetHistory(ctx, 'ASSET001');
```

### Identity & Access

#### `getCurrentTimestamp(ctx)`
Get current transaction timestamp.
```javascript
const timestamp = this.getCurrentTimestamp(ctx);
```

#### `getCallerId(ctx)`
Get identity of transaction caller.
```javascript
const caller = this.getCallerId(ctx);
```

#### `getCallerMSP(ctx)`
Get MSP ID of caller.
```javascript
const mspId = this.getCallerMSP(ctx);
```

#### `hasAttribute(ctx, attributeName)`
Check if caller has specific attribute.
```javascript
if (this.hasAttribute(ctx, 'admin')) {
    // Admin-only logic
}
```

---

## ✅ Validators API

### Email & Phone

```javascript
Validators.isValidEmail('user@example.com')           // true
Validators.isValidPhone('+919876543210')              // true
```

### Date & Time

```javascript
Validators.isValidDate('2025-11-03')                  // true
Validators.isFutureDate('2026-01-01')                 // true
Validators.isValidTimeSlot('14:30')                   // true
```

### Healthcare Specific

```javascript
Validators.isValidIpfsHash('QmYwAPJzv5CZsn...')      // true (CIDv0)
Validators.isValidLicenseNumber('MED123456')          // true
Validators.isValidRating(4)                           // true (1-5)
Validators.isValidUrgency('emergency')                // true
```

### Sanitization

```javascript
Validators.sanitizeString('<script>alert()</script>') // 'scriptalert()/script'
Validators.validatePatientId('P001')                  // 'P001' (sanitized)
Validators.validateDoctorId('D001')                   // 'D001' (sanitized)
```

---

## 🚨 Error Classes

### Usage

```javascript
// Throw specific errors
throw new AssetNotFoundError('Patient', 'P001');
throw new ValidationError('Invalid email format', 'email');
throw new UnauthorizedError('Admin access required');
throw new ConflictError('Appointment slot already booked');
```

### Error Hierarchy

```
HealthLinkError (base)
├── AssetNotFoundError       - Resource not found
├── AssetAlreadyExistsError  - Duplicate creation attempt
├── ValidationError          - Input validation failed
├── UnauthorizedError        - Access denied
├── InvalidStateError        - Invalid state transition
└── ConflictError           - Resource conflict
```

### Error Properties

All errors include:
- `name` - Error class name
- `message` - Human-readable message
- `code` - Error code for API responses
- `toJSON()` - Serialization for responses

---

## 📝 Best Practices

### 1. Always Validate Inputs
```javascript
async CreatePatient(ctx, patientId, name, email) {
    // Validate required fields
    this.validateRequiredFields(
        { patientId, name, email },
        ['patientId', 'name', 'email']
    );
    
    // Validate format
    if (!Validators.isValidEmail(email)) {
        throw new ValidationError('Invalid email format', 'email');
    }
    
    // Sanitize inputs
    const sanitizedName = Validators.sanitizeString(name);
    
    // Your logic...
}
```

### 2. Create Audit Trails
```javascript
// After important operations
await this.createAuditRecord(ctx, 'CreatePatient', patientId, 'patient', {
    name: sanitizedName,
    email: email
});
```

### 3. Use Proper Error Types
```javascript
// Check existence before creating
if (await this.assetExists(ctx, patientId)) {
    throw new AssetAlreadyExistsError('Patient', patientId);
}

// Get with automatic error handling
const patient = await this.getAsset(ctx, patientId);
// Automatically throws AssetNotFoundError if missing
```

### 4. Emit Events
```javascript
// Notify external systems
this.emitEvent(ctx, 'PatientCreated', {
    patientId: patientId,
    timestamp: this.getCurrentTimestamp(ctx)
});
```

---

## 🔄 Updating the Library

### Version Bumping

When making changes to the shared library:

1. Update version in `package.json`
2. Copy updated files to all contracts
3. Redeploy contracts with incremented sequence

```bash
# Update shared library
cd fabric-samples/chaincode/shared-lib
# Make your changes...

# Copy to all contracts
for contract in patient-records-contract doctor-credentials-contract; do
    cp *.js ../\$contract/lib/
done

# Redeploy contracts
cd ../../test-network
./network.sh deployCC -ccn patient-records -ccv 1.1 -ccs 6
./network.sh deployCC -ccn doctor-credentials -ccv 1.2 -ccs 7
```

---

## 🧪 Testing

The shared library is tested through the contracts that use it:

```bash
# Run contract tests
./test-new-contracts.sh

# All functions are implicitly tested when contracts use them
```

---

## 📊 Dependencies

- **fabric-contract-api**: ^2.5.0 - Hyperledger Fabric contract API
- **fabric-shim**: ^2.5.0 - Fabric chaincode shim

---

## 🤝 Contributing

When adding new functionality:

1. **Add to appropriate file** (base-contract.js, validators.js, or errors.js)
2. **Document with JSDoc** comments
3. **Update this README** with usage examples
4. **Test thoroughly** in a contract
5. **Bump version** in package.json
6. **Propagate to all contracts**

---

## 📄 License

Apache-2.0 - See LICENSE file for details

---

## 🆘 Support

For issues or questions:
1. Check IMPLEMENTATION_GUIDE.md
2. Review contract examples (patient-records, doctor-credentials)
3. Check error messages (they're descriptive!)

---

**This is a permanent, production-grade shared library. No patches, no workarounds, no technical debt.** 🏗️✨
