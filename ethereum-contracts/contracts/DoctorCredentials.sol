// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DoctorCredentials
 * @dev Contract for managing doctor credentials and verification
 */
contract DoctorCredentials is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum VerificationStatus { Pending, Verified, Rejected, Revoked }

    struct Doctor {
        string doctorId;
        string name;
        string specialty;
        string licenseNumber;
        string qualifications;
        string hospital;
        VerificationStatus status;
        address walletAddress;
        uint256 createdAt;
        uint256 verifiedAt;
        bool exists;
    }

    struct Review {
        string reviewId;
        string doctorId;
        string patientId;
        uint8 rating; // 1-5
        string comment;
        uint256 createdAt;
        bool exists;
    }

    // State variables
    mapping(string => Doctor) private doctors;
    mapping(address => string) private addressToDoctorId;
    mapping(string => Review[]) private doctorReviews;
    string[] private allDoctorIds;
    
    // Events
    event DoctorRegistered(string indexed doctorId, address indexed walletAddress, uint256 timestamp);
    event DoctorVerified(string indexed doctorId, uint256 timestamp);
    event DoctorRejected(string indexed doctorId, uint256 timestamp);
    event DoctorRevoked(string indexed doctorId, uint256 timestamp);
    event ReviewAdded(string indexed doctorId, string reviewId, uint8 rating, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Register a new doctor
     */
    function registerDoctor(
        string memory _doctorId,
        string memory _name,
        string memory _specialty,
        string memory _licenseNumber,
        string memory _qualifications,
        string memory _hospital,
        address _walletAddress
    ) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(VERIFIER_ROLE, msg.sender),
            "Unauthorized"
        );
        require(!doctors[_doctorId].exists, "Doctor already registered");
        require(_walletAddress != address(0), "Invalid wallet address");
        require(bytes(addressToDoctorId[_walletAddress]).length == 0, "Wallet already registered");

        doctors[_doctorId] = Doctor({
            doctorId: _doctorId,
            name: _name,
            specialty: _specialty,
            licenseNumber: _licenseNumber,
            qualifications: _qualifications,
            hospital: _hospital,
            status: VerificationStatus.Pending,
            walletAddress: _walletAddress,
            createdAt: block.timestamp,
            verifiedAt: 0,
            exists: true
        });

        addressToDoctorId[_walletAddress] = _doctorId;
        allDoctorIds.push(_doctorId);

        emit DoctorRegistered(_doctorId, _walletAddress, block.timestamp);
    }

    /**
     * @dev Verify a doctor
     */
    function verifyDoctor(string memory _doctorId) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(VERIFIER_ROLE, msg.sender),
            "Unauthorized"
        );
        require(doctors[_doctorId].exists, "Doctor does not exist");
        require(
            doctors[_doctorId].status == VerificationStatus.Pending,
            "Doctor is not in pending status"
        );

        doctors[_doctorId].status = VerificationStatus.Verified;
        doctors[_doctorId].verifiedAt = block.timestamp;

        emit DoctorVerified(_doctorId, block.timestamp);
    }

    /**
     * @dev Reject a doctor's credentials
     */
    function rejectDoctor(string memory _doctorId) external nonReentrant {
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(VERIFIER_ROLE, msg.sender),
            "Unauthorized"
        );
        require(doctors[_doctorId].exists, "Doctor does not exist");

        doctors[_doctorId].status = VerificationStatus.Rejected;

        emit DoctorRejected(_doctorId, block.timestamp);
    }

    /**
     * @dev Revoke a doctor's verification
     */
    function revokeDoctor(string memory _doctorId) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(doctors[_doctorId].exists, "Doctor does not exist");

        doctors[_doctorId].status = VerificationStatus.Revoked;

        emit DoctorRevoked(_doctorId, block.timestamp);
    }

    /**
     * @dev Get doctor details
     */
    function getDoctor(string memory _doctorId) external view returns (Doctor memory) {
        require(doctors[_doctorId].exists, "Doctor does not exist");
        return doctors[_doctorId];
    }

    /**
     * @dev Get doctor by wallet address
     */
    function getDoctorByAddress(address _address) external view returns (Doctor memory) {
        string memory doctorId = addressToDoctorId[_address];
        require(bytes(doctorId).length > 0, "No doctor found for this address");
        return doctors[doctorId];
    }

    /**
     * @dev Get all verified doctors
     */
    function getVerifiedDoctors() external view returns (Doctor[] memory) {
        uint256 verifiedCount = 0;
        
        // Count verified doctors
        for (uint256 i = 0; i < allDoctorIds.length; i++) {
            if (doctors[allDoctorIds[i]].status == VerificationStatus.Verified) {
                verifiedCount++;
            }
        }

        // Create array and populate
        Doctor[] memory verifiedDoctors = new Doctor[](verifiedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allDoctorIds.length; i++) {
            if (doctors[allDoctorIds[i]].status == VerificationStatus.Verified) {
                verifiedDoctors[index] = doctors[allDoctorIds[i]];
                index++;
            }
        }

        return verifiedDoctors;
    }

    /**
     * @dev Add a review for a doctor
     */
    function addReview(
        string memory _reviewId,
        string memory _doctorId,
        string memory _patientId,
        uint8 _rating,
        string memory _comment
    ) external nonReentrant {
        require(doctors[_doctorId].exists, "Doctor does not exist");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");

        Review memory newReview = Review({
            reviewId: _reviewId,
            doctorId: _doctorId,
            patientId: _patientId,
            rating: _rating,
            comment: _comment,
            createdAt: block.timestamp,
            exists: true
        });

        doctorReviews[_doctorId].push(newReview);

        emit ReviewAdded(_doctorId, _reviewId, _rating, block.timestamp);
    }

    /**
     * @dev Get all reviews for a doctor
     */
    function getReviews(string memory _doctorId) external view returns (Review[] memory) {
        require(doctors[_doctorId].exists, "Doctor does not exist");
        return doctorReviews[_doctorId];
    }

    /**
     * @dev Get average rating for a doctor
     */
    function getAverageRating(string memory _doctorId) external view returns (uint256) {
        require(doctors[_doctorId].exists, "Doctor does not exist");
        
        Review[] memory reviews = doctorReviews[_doctorId];
        if (reviews.length == 0) {
            return 0;
        }

        uint256 totalRating = 0;
        for (uint256 i = 0; i < reviews.length; i++) {
            totalRating += reviews[i].rating;
        }

        return (totalRating * 100) / reviews.length; // Returns rating * 100 for precision
    }

    /**
     * @dev Check if doctor exists
     */
    function doctorExists(string memory _doctorId) external view returns (bool) {
        return doctors[_doctorId].exists;
    }

    /**
     * @dev Get total number of doctors
     */
    function getTotalDoctors() external view returns (uint256) {
        return allDoctorIds.length;
    }

    /**
     * @dev Admin functions to grant roles
     */
    function grantVerifierRole(address _verifier) external onlyRole(ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, _verifier);
    }

    function grantAdminRole(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, _admin);
    }
}
