// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Appointments
 * @dev Contract for managing medical appointments
 */
contract Appointments is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");

    enum AppointmentStatus { Scheduled, Confirmed, Completed, Cancelled }

    struct Appointment {
        string appointmentId;
        string patientId;
        string doctorId;
        uint256 appointmentDate;
        string reason;
        string notes;
        AppointmentStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // State variables
    mapping(string => Appointment) private appointments;
    mapping(string => string[]) private patientAppointments; // patientId => appointmentIds[]
    mapping(string => string[]) private doctorAppointments; // doctorId => appointmentIds[]
    string[] private allAppointmentIds;

    // Events
    event AppointmentCreated(
        string indexed appointmentId,
        string indexed patientId,
        string indexed doctorId,
        uint256 appointmentDate
    );
    event AppointmentUpdated(string indexed appointmentId, AppointmentStatus status);
    event AppointmentCancelled(string indexed appointmentId, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new appointment
     */
    function createAppointment(
        string memory _appointmentId,
        string memory _patientId,
        string memory _doctorId,
        uint256 _appointmentDate,
        string memory _reason,
        string memory _notes
    ) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            hasRole(DOCTOR_ROLE, msg.sender) || 
            hasRole(PATIENT_ROLE, msg.sender),
            "Unauthorized"
        );
        require(!appointments[_appointmentId].exists, "Appointment already exists");
        require(_appointmentDate > block.timestamp, "Appointment date must be in the future");

        appointments[_appointmentId] = Appointment({
            appointmentId: _appointmentId,
            patientId: _patientId,
            doctorId: _doctorId,
            appointmentDate: _appointmentDate,
            reason: _reason,
            notes: _notes,
            status: AppointmentStatus.Scheduled,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        patientAppointments[_patientId].push(_appointmentId);
        doctorAppointments[_doctorId].push(_appointmentId);
        allAppointmentIds.push(_appointmentId);

        emit AppointmentCreated(_appointmentId, _patientId, _doctorId, _appointmentDate);
    }

    /**
     * @dev Get appointment by ID
     */
    function getAppointment(string memory _appointmentId) 
        external 
        view 
        returns (Appointment memory) 
    {
        require(appointments[_appointmentId].exists, "Appointment does not exist");
        return appointments[_appointmentId];
    }

    /**
     * @dev Get appointments by patient
     */
    function getAppointmentsByPatient(string memory _patientId) 
        external 
        view 
        returns (Appointment[] memory) 
    {
        string[] memory appointmentIds = patientAppointments[_patientId];
        Appointment[] memory patientAppointmentList = new Appointment[](appointmentIds.length);

        for (uint256 i = 0; i < appointmentIds.length; i++) {
            patientAppointmentList[i] = appointments[appointmentIds[i]];
        }

        return patientAppointmentList;
    }

    /**
     * @dev Get appointments by doctor
     */
    function getAppointmentsByDoctor(string memory _doctorId) 
        external 
        view 
        returns (Appointment[] memory) 
    {
        string[] memory appointmentIds = doctorAppointments[_doctorId];
        Appointment[] memory doctorAppointmentList = new Appointment[](appointmentIds.length);

        for (uint256 i = 0; i < appointmentIds.length; i++) {
            doctorAppointmentList[i] = appointments[appointmentIds[i]];
        }

        return doctorAppointmentList;
    }

    /**
     * @dev Update appointment status
     */
    function updateAppointmentStatus(
        string memory _appointmentId,
        AppointmentStatus _status
    ) external nonReentrant {
        require(appointments[_appointmentId].exists, "Appointment does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized"
        );

        appointments[_appointmentId].status = _status;
        appointments[_appointmentId].updatedAt = block.timestamp;

        emit AppointmentUpdated(_appointmentId, _status);
    }

    /**
     * @dev Update appointment notes
     */
    function updateAppointmentNotes(
        string memory _appointmentId,
        string memory _notes
    ) external nonReentrant {
        require(appointments[_appointmentId].exists, "Appointment does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender),
            "Unauthorized"
        );

        appointments[_appointmentId].notes = _notes;
        appointments[_appointmentId].updatedAt = block.timestamp;

        emit AppointmentUpdated(_appointmentId, appointments[_appointmentId].status);
    }

    /**
     * @dev Cancel appointment
     */
    function cancelAppointment(string memory _appointmentId) external nonReentrant {
        require(appointments[_appointmentId].exists, "Appointment does not exist");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || 
            hasRole(DOCTOR_ROLE, msg.sender) || 
            hasRole(PATIENT_ROLE, msg.sender),
            "Unauthorized"
        );

        appointments[_appointmentId].status = AppointmentStatus.Cancelled;
        appointments[_appointmentId].updatedAt = block.timestamp;

        emit AppointmentCancelled(_appointmentId, block.timestamp);
    }

    /**
     * @dev Check if appointment exists
     */
    function appointmentExists(string memory _appointmentId) external view returns (bool) {
        return appointments[_appointmentId].exists;
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
