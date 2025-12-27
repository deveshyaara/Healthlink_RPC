// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Prescriptions
 * @dev Contract for managing electronic prescriptions
 */
contract Prescriptions is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 public constant PHARMACIST_ROLE = keccak256("PHARMACIST_ROLE");

    enum PrescriptionStatus { Active, Filled, Cancelled, Expired }

    struct Prescription {
        string prescriptionId;
        string patientId;
        string doctorId;
        string medication;
        string dosage;
        string instructions;
        uint256 issuedDate;
        uint256 expiryDate;
        PrescriptionStatus status;
        string filledBy; // Pharmacist ID
        uint256 filledDate;
        string qrCodeHash; // Phase 1: SHA256 hash of QR code for pharmacy verification
        bool isDispensed; // Phase 1: Quick dispensed check
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // State variables
    mapping(string => Prescription) private prescriptions;
    mapping(string => string[]) private patientPrescriptions; // patientId => prescriptionIds[]
    mapping(string => string[]) private doctorPrescriptions; // doctorId => prescriptionIds[]
    string[] private allPrescriptionIds;

    // Events
    event PrescriptionCreated(
        string indexed prescriptionId,
        string indexed patientId,
        string indexed doctorId,
        string medication
    );
    event PrescriptionFilled(string indexed prescriptionId, string filledBy, uint256 timestamp);
    event PrescriptionCancelled(string indexed prescriptionId, uint256 timestamp);
    event PrescriptionExpired(string indexed prescriptionId, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new prescription
     */
    function createPrescription(
        string memory _prescriptionId,
        string memory _patientId,
        string memory _doctorId,
        string memory _medication,
        string memory _dosage,
        string memory _instructions,
        uint256 _expiryDate
    ) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized: Only doctors or admins can create prescriptions"
        );
        require(!prescriptions[_prescriptionId].exists, "Prescription already exists");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");

        prescriptions[_prescriptionId] = Prescription({
            prescriptionId: _prescriptionId,
            patientId: _patientId,
            doctorId: _doctorId,
            medication: _medication,
            dosage: _dosage,
            instructions: _instructions,
            issuedDate: block.timestamp,
            expiryDate: _expiryDate,
            status: PrescriptionStatus.Active,
            filledBy: "",
            filledDate: 0,
            qrCodeHash: generateQRCodeHash(_prescriptionId, block.timestamp),
            isDispensed: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        patientPrescriptions[_patientId].push(_prescriptionId);
        doctorPrescriptions[_doctorId].push(_prescriptionId);
        allPrescriptionIds.push(_prescriptionId);

        emit PrescriptionCreated(_prescriptionId, _patientId, _doctorId, _medication);
    }

    /**
     * @dev Get prescription by ID
     */
    function getPrescription(string memory _prescriptionId) 
        external 
        view 
        returns (Prescription memory) 
    {
        require(prescriptions[_prescriptionId].exists, "Prescription does not exist");
        return prescriptions[_prescriptionId];
    }

    /**
     * @dev Get prescriptions by patient
     */
    function getPrescriptionsByPatient(string memory _patientId) 
        external 
        view 
        returns (Prescription[] memory) 
    {
        string[] memory prescriptionIds = patientPrescriptions[_patientId];
        Prescription[] memory patientPrescriptionList = new Prescription[](prescriptionIds.length);

        for (uint256 i = 0; i < prescriptionIds.length; i++) {
            patientPrescriptionList[i] = prescriptions[prescriptionIds[i]];
        }

        return patientPrescriptionList;
    }

    /**
     * @dev Get prescriptions by doctor
     */
    function getPrescriptionsByDoctor(string memory _doctorId) 
        external 
        view 
        returns (Prescription[] memory) 
    {
        string[] memory prescriptionIds = doctorPrescriptions[_doctorId];
        Prescription[] memory doctorPrescriptionList = new Prescription[](prescriptionIds.length);

        for (uint256 i = 0; i < prescriptionIds.length; i++) {
            doctorPrescriptionList[i] = prescriptions[prescriptionIds[i]];
        }

        return doctorPrescriptionList;
    }

    /**
     * @dev Fill prescription
     */
    function fillPrescription(
        string memory _prescriptionId,
        string memory _pharmacistId
    ) external nonReentrant {
        require(prescriptions[_prescriptionId].exists, "Prescription does not exist");
        require(
            hasRole(PHARMACIST_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Unauthorized: Only pharmacists can fill prescriptions"
        );
        require(
            prescriptions[_prescriptionId].status == PrescriptionStatus.Active,
            "Prescription is not active"
        );
        require(
            block.timestamp <= prescriptions[_prescriptionId].expiryDate,
            "Prescription has expired"
        );

        prescriptions[_prescriptionId].status = PrescriptionStatus.Filled;
        prescriptions[_prescriptionId].filledBy = _pharmacistId;
        prescriptions[_prescriptionId].filledDate = block.timestamp;
        prescriptions[_prescriptionId].updatedAt = block.timestamp;

        emit PrescriptionFilled(_prescriptionId, _pharmacistId, block.timestamp);
    }

    /**
     * @dev Cancel prescription
     */
    function cancelPrescription(string memory _prescriptionId) external nonReentrant {
        require(prescriptions[_prescriptionId].exists, "Prescription does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized"
        );
        require(
            prescriptions[_prescriptionId].status == PrescriptionStatus.Active,
            "Prescription is not active"
        );

        prescriptions[_prescriptionId].status = PrescriptionStatus.Cancelled;
        prescriptions[_prescriptionId].updatedAt = block.timestamp;

        emit PrescriptionCancelled(_prescriptionId, block.timestamp);
    }

    /**
     * @dev Mark prescription as expired
     */
    function markAsExpired(string memory _prescriptionId) external nonReentrant {
        require(prescriptions[_prescriptionId].exists, "Prescription does not exist");
        require(
            block.timestamp > prescriptions[_prescriptionId].expiryDate,
            "Prescription has not expired yet"
        );
        require(
            prescriptions[_prescriptionId].status == PrescriptionStatus.Active,
            "Prescription is not active"
        );

        prescriptions[_prescriptionId].status = PrescriptionStatus.Expired;
        prescriptions[_prescriptionId].updatedAt = block.timestamp;

        emit PrescriptionExpired(_prescriptionId, block.timestamp);
    }

    /**
     * @dev Check if prescription exists
     */
    function prescriptionExists(string memory _prescriptionId) external view returns (bool) {
        return prescriptions[_prescriptionId].exists;
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

    function grantPharmacistRole(address _pharmacist) external onlyRole(ADMIN_ROLE) {
        grantRole(PHARMACIST_ROLE, _pharmacist);
    }

    function revokePharmacistRole(address _pharmacist) external onlyRole(ADMIN_ROLE) {
        revokeRole(PHARMACIST_ROLE, _pharmacist);
    }

    function grantAdminRole(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, _admin);
    }

    // ============================================================================
    // Phase 1: QR Code Verification Functions
    // ============================================================================

    /**
     * @notice Verify prescription by QR code hash
     * @dev Used by pharmacies to verify prescription authenticity before dispensing
     * @param _prescriptionId Prescription identifier
     * @param _qrHash QR code hash to verify against stored hash
     * @return isValid Whether the QR code is valid and prescription can be dispensed
     */
    function verifyPrescriptionQR(
        string memory _prescriptionId,
        string memory _qrHash
    ) external view returns (bool isValid) {
        require(prescriptions[_prescriptionId].exists, "Prescription does not exist");
        
        Prescription memory prescription = prescriptions[_prescriptionId];
        
        // Check if QR hash matches
        if (keccak256(bytes(prescription.qrCodeHash)) != keccak256(bytes(_qrHash))) {
            return false;
        }
        
        // Check if prescription is active
        if (prescription.status != PrescriptionStatus.Active) {
            return false;
        }
        
        // Check if already dispensed
        if (prescription.isDispensed) {
            return false;
        }
        
        // Check if expired
        if (block.timestamp > prescription.expiryDate) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Generate QR code hash for a prescription (internal utility)
     * @dev Combines prescription ID and timestamp for unique QR code
     * @param _prescriptionId Prescription identifier
     * @param _timestamp Creation timestamp
     * @return QR code hash
     */
    function generateQRCodeHash(
        string memory _prescriptionId,
        uint256 _timestamp
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            _prescriptionId,
            "-",
            Strings.toString(_timestamp)
        ));
    }

    /**
     * @notice Mark prescription as dispensed (called during fillPrescription)
     * @param _prescriptionId Prescription to mark as dispensed
     */
    function markAsDispensed(string memory _prescriptionId) internal {
        prescriptions[_prescriptionId].isDispensed = true;
        prescriptions[_prescriptionId].updatedAt = block.timestamp;
    }
}
