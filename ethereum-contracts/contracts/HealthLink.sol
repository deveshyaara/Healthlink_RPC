// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title HealthLink
 * @dev Lightweight contract for Records and Appointments with Admin proxy logic for Doctors
 */
contract HealthLink is AccessControl {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");

    struct Record {
        string ipfsHash;
        string fileName;
        address patient;
        address doctor;
        address uploadedBy;
        uint256 timestamp;
    }

    struct Appointment {
        uint256 id;
        address patient;
        address doctor;
        uint256 time;
        string details;
        address scheduledBy;
        bool isActive;
    }

    struct Patient {
        string patientId;
        string publicData; // JSON string with patient details
        bool exists;
        uint256 createdAt;
    }

    // Storage
    mapping(address => Record[]) private patientRecords;
    mapping(address => Appointment[]) private doctorAppointments;
    mapping(address => Appointment[]) private patientAppointments;
    mapping(string => Patient) private patients;

    uint256 private _appointmentIdCounter;

    // Events
    event DoctorAdded(address indexed account, address indexed admin);
    event RecordUploaded(address indexed patient, address indexed doctor, address indexed uploadedBy, string ipfsHash, string fileName, uint256 timestamp);
    event AppointmentCreated(uint256 indexed appointmentId, address indexed patient, address indexed doctor, uint256 time, string details, address scheduledBy);

    constructor(address initialAdmin) {
        address admin = initialAdmin == address(0) ? msg.sender : initialAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRoleAdmin(DOCTOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * createPatient
     * Create a new patient record with minimal information
     */
    function createPatient(
        string calldata _patientId,
        string calldata _name,
        uint256 _age,
        string calldata _gender,
        string calldata _ipfsHash
    ) external returns (bool) {
        require(!patients[_patientId].exists, "HealthLink: patient already exists");
        require(bytes(_patientId).length > 0, "HealthLink: patient ID required");
        require(bytes(_name).length > 0, "HealthLink: name required");

        // Create JSON string for public data
        string memory publicData = string(abi.encodePacked(
            '{"name":"', _name, '",',
            '"age":', uint2str(_age), ',',
            '"gender":"', _gender, '",',
            '"ipfsHash":"', _ipfsHash, '"}'
        ));

        patients[_patientId] = Patient({
            patientId: _patientId,
            publicData: publicData,
            exists: true,
            createdAt: block.timestamp
        });

        return true;
    }

    /**
     * getPatient
     * Get patient information by ID
     */
    function getPatient(string calldata _patientId) external view returns (
        string memory patientId,
        string memory publicData,
        bool exists,
        uint256 createdAt
    ) {
        Patient memory patient = patients[_patientId];
        return (
            patient.patientId,
            patient.publicData,
            patient.exists,
            patient.createdAt
        );
    }

    /**
     * updatePatientData
     * Update patient information (add additional details)
     */
    function updatePatientData(
        string calldata _patientId,
        string calldata _updatedData
    ) external {
        require(patients[_patientId].exists, "HealthLink: patient does not exist");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(DOCTOR_ROLE, msg.sender), 
                "HealthLink: only admin or doctor can update patient data");

        patients[_patientId].publicData = _updatedData;
    }

    // Admin function to add doctor role
    function addDoctor(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "HealthLink: doctor address zero");
        grantRole(DOCTOR_ROLE, account);
        emit DoctorAdded(account, msg.sender);
    }

    /**
     * uploadRecord
     * - If msg.sender has DEFAULT_ADMIN_ROLE: use _targetDoctor as the doctor (must be non-zero).
     * - If msg.sender has DOCTOR_ROLE: require _targetDoctor == msg.sender.
     */
    function uploadRecord(
        address _patient,
        string calldata _ipfsHash,
        string calldata _fileName,
        address _targetDoctor
    ) external returns (uint256) {
        require(_patient != address(0), "HealthLink: invalid patient");
        require(bytes(_ipfsHash).length > 0, "HealthLink: ipfs hash required");
        require(bytes(_fileName).length > 0, "HealthLink: fileName required");

        address doctorAddr;

        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            require(_targetDoctor != address(0), "HealthLink: target doctor required for admin");
            doctorAddr = _targetDoctor;
        } else {
            require(hasRole(DOCTOR_ROLE, msg.sender), "HealthLink: only doctor or admin");
            // Doctor must specify themselves as _targetDoctor
            require(_targetDoctor == msg.sender, "HealthLink: doctor must be msg.sender");
            doctorAddr = msg.sender;
        }

        Record memory rec = Record({
            ipfsHash: _ipfsHash,
            fileName: _fileName,
            patient: _patient,
            doctor: doctorAddr,
            uploadedBy: msg.sender,
            timestamp: block.timestamp
        });

        patientRecords[_patient].push(rec);
        uint256 index = patientRecords[_patient].length - 1;

        emit RecordUploaded(_patient, doctorAddr, msg.sender, _ipfsHash, _fileName, block.timestamp);

        return index;
    }

    /**
     * createAppointment
     * - If msg.sender has DEFAULT_ADMIN_ROLE: allow any _targetDoctor (non-zero).
     * - If msg.sender has DOCTOR_ROLE: require _targetDoctor == msg.sender.
     */
    function createAppointment(
        address _patient,
        address _targetDoctor,
        uint256 _time,
        string calldata _details
    ) external returns (uint256) {
        require(_patient != address(0), "HealthLink: invalid patient");
        require(_time > block.timestamp, "HealthLink: appointment time must be future");

        address assignedDoctor;

        if (hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            require(_targetDoctor != address(0), "HealthLink: target doctor required for admin");
            assignedDoctor = _targetDoctor;
        } else {
            require(hasRole(DOCTOR_ROLE, msg.sender), "HealthLink: only doctor or admin");
            // Doctor must schedule for themselves
            require(_targetDoctor == msg.sender, "HealthLink: doctor must be msg.sender");
            assignedDoctor = msg.sender;
        }

        _appointmentIdCounter += 1;
        uint256 newId = _appointmentIdCounter;

        Appointment memory apt = Appointment({
            id: newId,
            patient: _patient,
            doctor: assignedDoctor,
            time: _time,
            details: _details,
            scheduledBy: msg.sender,
            isActive: true
        });

        doctorAppointments[assignedDoctor].push(apt);
        patientAppointments[_patient].push(apt);

        emit AppointmentCreated(newId, _patient, assignedDoctor, _time, _details, msg.sender);

        return newId;
    }

    // View helpers

    function getRecordsForPatient(address _patient) external view returns (Record[] memory) {
        return patientRecords[_patient];
    }

    function getAppointmentsForDoctor(address _doctor) external view returns (Appointment[] memory) {
        return doctorAppointments[_doctor];
    }

    function getAppointmentsForPatient(address _patient) external view returns (Appointment[] memory) {
        return patientAppointments[_patient];
    }

    // Optional: cancel appointment (only doctor or admin who created it)
    function cancelAppointment(address _doctor, uint256 _appointmentIndex) external {
        require(_doctor != address(0), "HealthLink: invalid doctor");
        require(_appointmentIndex < doctorAppointments[_doctor].length, "HealthLink: invalid appointment index");

        Appointment storage apt = doctorAppointments[_doctor][_appointmentIndex];

        // Only the scheduler, admin, or doctor may cancel
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            require(msg.sender == apt.scheduledBy || msg.sender == apt.doctor, "HealthLink: not authorized to cancel");
        }

        apt.isActive = false;

        // Also update patientAppointments: find and mark inactive (linear search)
        Appointment[] storage pApts = patientAppointments[apt.patient];
        for (uint256 i = 0; i < pApts.length; i++) {
            if (pApts[i].id == apt.id) {
                pApts[i].isActive = false;
                break;
            }
        }
    }

    // Required override for AccessControl
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
