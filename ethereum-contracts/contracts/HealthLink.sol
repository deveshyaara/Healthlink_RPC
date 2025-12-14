// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HealthLink
 * @dev Main HealthLink contract with Role-Based Access Control, Audit Trails, and Consent Management
 */
contract HealthLink is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");

    // Data structures
    struct Patient {
        string patientId;
        string publicData; // JSON string of non-sensitive public data
        bool exists;
        uint256 createdAt;
    }

    struct Consent {
        string consentId;
        string patientId;
        address granteeAddress;
        string scope;
        string purpose;
        uint256 validUntil;
        ConsentStatus status;
        uint256 createdAt;
        uint256 revokedAt;
    }

    struct AuditRecord {
        string action;
        address actor;
        string targetId;
        string details;
        uint256 timestamp;
        bytes32 txHash;
    }

    enum ConsentStatus { Active, Revoked }

    // State variables
    mapping(string => Patient) private patients;
    mapping(string => Consent) private consents;
    mapping(bytes32 => AuditRecord) private auditRecords;
    mapping(string => mapping(string => string)) private recordHashes; // patientId => recordId => hash
    
    string[] private patientIds;
    string[] private consentIds;
    bytes32[] private auditIds;

    // Events
    event PatientCreated(string indexed patientId, address indexed creator, uint256 timestamp);
    event RecordHashAdded(string indexed patientId, string recordId, string recordHash, uint256 timestamp);
    event ConsentCreated(string indexed consentId, string indexed patientId, address indexed grantee);
    event ConsentRevoked(string indexed consentId, uint256 timestamp);
    event AuditRecordCreated(bytes32 indexed auditId, address indexed actor, string action);

    /**
     * @dev Constructor - sets up initial admin role
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new patient record
     * Can be called by admins or doctors (healthcare providers)
     */
    function createPatient(
        string memory _patientId,
        string memory _publicData
    ) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Only admins or doctors can create patients"
        );
        require(!patients[_patientId].exists, "Patient already exists");
        
        patients[_patientId] = Patient({
            patientId: _patientId,
            publicData: _publicData,
            exists: true,
            createdAt: block.timestamp
        });

        patientIds.push(_patientId);

        // Create audit record
        _createAuditRecord("CreatePatient", _patientId, _publicData);

        emit PatientCreated(_patientId, msg.sender, block.timestamp);
    }

    /**
     * @dev Add a record hash for a patient
     */
    function addRecordHash(
        string memory _patientId,
        string memory _recordId,
        string memory _recordHash
    ) external nonReentrant {
        require(patients[_patientId].exists, "Patient does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized: Only admins or doctors can add records"
        );

        recordHashes[_patientId][_recordId] = _recordHash;

        // Create audit record
        string memory details = string(abi.encodePacked("RecordId: ", _recordId));
        _createAuditRecord("AddRecordHash", _patientId, details);

        emit RecordHashAdded(_patientId, _recordId, _recordHash, block.timestamp);
    }

    /**
     * @dev Get record hash
     */
    function getRecordHash(
        string memory _patientId,
        string memory _recordId
    ) external view returns (string memory) {
        return recordHashes[_patientId][_recordId];
    }

    /**
     * @dev Create a consent record
     */
    function createConsent(
        string memory _consentId,
        string memory _patientId,
        address _granteeAddress,
        string memory _scope,
        string memory _purpose,
        uint256 _validUntil
    ) external nonReentrant {
        require(patients[_patientId].exists, "Patient does not exist");
        require(
            hasRole(PATIENT_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Unauthorized: Only patients or admins can create consent"
        );
        require(bytes(consents[_consentId].consentId).length == 0, "Consent already exists");

        consents[_consentId] = Consent({
            consentId: _consentId,
            patientId: _patientId,
            granteeAddress: _granteeAddress,
            scope: _scope,
            purpose: _purpose,
            validUntil: _validUntil,
            status: ConsentStatus.Active,
            createdAt: block.timestamp,
            revokedAt: 0
        });

        consentIds.push(_consentId);

        // Create audit record
        string memory details = string(abi.encodePacked("Grantee: ", addressToString(_granteeAddress)));
        _createAuditRecord("CreateConsent", _consentId, details);

        emit ConsentCreated(_consentId, _patientId, _granteeAddress);
    }

    /**
     * @dev Revoke a consent
     */
    function revokeConsent(string memory _consentId) external nonReentrant {
        require(bytes(consents[_consentId].consentId).length > 0, "Consent does not exist");
        require(consents[_consentId].status == ConsentStatus.Active, "Consent already revoked");
        require(
            hasRole(PATIENT_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Unauthorized: Only patients or admins can revoke consent"
        );

        consents[_consentId].status = ConsentStatus.Revoked;
        consents[_consentId].revokedAt = block.timestamp;

        // Create audit record
        _createAuditRecord("RevokeConsent", _consentId, "");

        emit ConsentRevoked(_consentId, block.timestamp);
    }

    /**
     * @dev Get consent details
     */
    function getConsent(string memory _consentId) external view returns (Consent memory) {
        require(bytes(consents[_consentId].consentId).length > 0, "Consent does not exist");
        return consents[_consentId];
    }

    /**
     * @dev Get all consents for a patient
     */
    function getConsentsByPatient(string memory _patientId) external view returns (Consent[] memory) {
        uint256 count = 0;
        
        // First, count matching consents
        for (uint256 i = 0; i < consentIds.length; i++) {
            if (keccak256(bytes(consents[consentIds[i]].patientId)) == keccak256(bytes(_patientId))) {
                count++;
            }
        }

        // Create array and populate
        Consent[] memory patientConsents = new Consent[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < consentIds.length; i++) {
            if (keccak256(bytes(consents[consentIds[i]].patientId)) == keccak256(bytes(_patientId))) {
                patientConsents[index] = consents[consentIds[i]];
                index++;
            }
        }

        return patientConsents;
    }

    /**
     * @dev Get patient details
     */
    function getPatient(string memory _patientId) external view returns (Patient memory) {
        require(patients[_patientId].exists, "Patient does not exist");
        return patients[_patientId];
    }

    /**
     * @dev Get audit record
     */
    function getAuditRecord(bytes32 _auditId) external view returns (AuditRecord memory) {
        require(auditRecords[_auditId].timestamp != 0, "Audit record does not exist");
        return auditRecords[_auditId];
    }

    /**
     * @dev Get all audit records (limited to avoid gas issues)
     */
    function getAuditRecords(uint256 _limit) external view returns (AuditRecord[] memory) {
        uint256 limit = _limit > auditIds.length ? auditIds.length : _limit;
        AuditRecord[] memory records = new AuditRecord[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            records[i] = auditRecords[auditIds[auditIds.length - 1 - i]]; // Most recent first
        }

        return records;
    }

    /**
     * @dev Internal function to create audit records
     */
    function _createAuditRecord(
        string memory _action,
        string memory _targetId,
        string memory _details
    ) private {
        bytes32 auditId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            _action,
            _targetId
        ));

        auditRecords[auditId] = AuditRecord({
            action: _action,
            actor: msg.sender,
            targetId: _targetId,
            details: _details,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1)
        });

        auditIds.push(auditId);

        emit AuditRecordCreated(auditId, msg.sender, _action);
    }

    /**
     * @dev Helper function to convert address to string
     */
    function addressToString(address _addr) private pure returns (string memory) {
        bytes memory data = abi.encodePacked(_addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(data[i] >> 4)];
            str[3+i*2] = alphabet[uint8(data[i] & 0x0f)];
        }
        
        return string(str);
    }

    /**
     * @dev Admin functions to grant roles
     */
    function grantDoctorRole(address _doctor) external onlyRole(ADMIN_ROLE) {
        grantRole(DOCTOR_ROLE, _doctor);
    }

    function grantPatientRole(address _patient) external onlyRole(ADMIN_ROLE) {
        grantRole(PATIENT_ROLE, _patient);
    }

    function grantAdminRole(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, _admin);
    }
}
