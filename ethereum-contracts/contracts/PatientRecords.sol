// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PatientRecords
 * @dev Contract for managing patient medical records with IPFS integration
 */
contract PatientRecords is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");

    struct MedicalRecord {
        string recordId;
        string patientId;
        string doctorId;
        string recordType;
        string ipfsHash;
        string metadata; // JSON string
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // State variables
    mapping(string => MedicalRecord) private records;
    mapping(string => string[]) private patientRecords; // patientId => recordIds[]
    string[] private allRecordIds;

    // Events
    event RecordCreated(
        string indexed recordId,
        string indexed patientId,
        string doctorId,
        string recordType,
        uint256 timestamp
    );
    event RecordUpdated(string indexed recordId, uint256 timestamp);
    event RecordDeleted(string indexed recordId, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new medical record
     */
    function createRecord(
        string memory _recordId,
        string memory _patientId,
        string memory _doctorId,
        string memory _recordType,
        string memory _ipfsHash,
        string memory _metadata
    ) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            hasRole(DOCTOR_ROLE, msg.sender) || 
            hasRole(PATIENT_ROLE, msg.sender),
            "Unauthorized"
        );
        require(!records[_recordId].exists, "Record already exists");
        require(bytes(_recordId).length > 0, "Record ID cannot be empty");
        require(bytes(_patientId).length > 0, "Patient ID cannot be empty");

        records[_recordId] = MedicalRecord({
            recordId: _recordId,
            patientId: _patientId,
            doctorId: bytes(_doctorId).length > 0 ? _doctorId : "self-uploaded",
            recordType: _recordType,
            ipfsHash: _ipfsHash,
            metadata: _metadata,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        // Add to patient's record list
        patientRecords[_patientId].push(_recordId);
        allRecordIds.push(_recordId);

        emit RecordCreated(_recordId, _patientId, _doctorId, _recordType, block.timestamp);
    }

    /**
     * @dev Get a medical record by ID
     */
    function getRecord(string memory _recordId) 
        external 
        view 
        returns (MedicalRecord memory) 
    {
        require(records[_recordId].exists, "Record does not exist");
        return records[_recordId];
    }

    /**
     * @dev Get all records for a patient
     */
    function getRecordsByPatient(string memory _patientId) 
        external 
        view 
        returns (MedicalRecord[] memory) 
    {
        string[] memory recordIds = patientRecords[_patientId];
        MedicalRecord[] memory patientRecordsList = new MedicalRecord[](recordIds.length);

        for (uint256 i = 0; i < recordIds.length; i++) {
            patientRecordsList[i] = records[recordIds[i]];
        }

        return patientRecordsList;
    }

    /**
     * @dev Update record metadata
     */
    function updateRecordMetadata(
        string memory _recordId,
        string memory _metadata
    ) external nonReentrant {
        require(records[_recordId].exists, "Record does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized: Only admins or doctors can update records"
        );

        records[_recordId].metadata = _metadata;
        records[_recordId].updatedAt = block.timestamp;

        emit RecordUpdated(_recordId, block.timestamp);
    }

    /**
     * @dev Delete a record
     */
    function deleteRecord(string memory _recordId) external nonReentrant {
        require(records[_recordId].exists, "Record does not exist");
        require(hasRole(ADMIN_ROLE, msg.sender), "Unauthorized: Only admins can delete records");

        string memory patientId = records[_recordId].patientId;

        // Remove from patient's record list
        string[] storage patientRecordList = patientRecords[patientId];
        for (uint256 i = 0; i < patientRecordList.length; i++) {
            if (keccak256(bytes(patientRecordList[i])) == keccak256(bytes(_recordId))) {
                patientRecordList[i] = patientRecordList[patientRecordList.length - 1];
                patientRecordList.pop();
                break;
            }
        }

        // Mark as deleted
        records[_recordId].exists = false;

        emit RecordDeleted(_recordId, block.timestamp);
    }

    /**
     * @dev Check if a record exists
     */
    function recordExists(string memory _recordId) external view returns (bool) {
        return records[_recordId].exists;
    }

    /**
     * @dev Get total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return allRecordIds.length;
    }

    /**
     * @dev Get patient record count
     */
    function getPatientRecordCount(string memory _patientId) external view returns (uint256) {
        return patientRecords[_patientId].length;
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
