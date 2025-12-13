// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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

    function grantAdminRole(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, _admin);
    }
}
