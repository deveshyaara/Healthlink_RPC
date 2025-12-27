// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title InsuranceClaims
 * @dev Blockchain-based insurance claims verification and processing
 * @notice Stores insurance claims immutably on-chain for transparency and audit trail
 */
contract InsuranceClaims is AccessControl, ReentrancyGuard {
    using Strings for uint256;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSURANCE_ROLE = keccak256("INSURANCE_ROLE");
    bytes32 public constant HOSPITAL_ROLE = keccak256("HOSPITAL_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Claim status enum
    enum ClaimStatus {
        Submitted,    // 0 - Initial submission by hospital/doctor
        Verified,     // 1 - Verified by insurance reviewer
        Approved,     // 2 - Approved with amount
        Rejected,     // 3 - Rejected by insurance
        Paid          // 4 - Payment processed
    }

    // Claim struct
    struct Claim {
        string claimId;              // Unique claim identifier
        string policyNumber;         // Insurance policy number
        string patientId;            // Patient blockchain ID
        string providerId;           // Hospital/doctor who submitted
        uint256 claimedAmount;       // Amount claimed (in wei for precision)
        uint256 approvedAmount;      // Amount approved (0 if not approved)
        ClaimStatus status;          // Current status
        string[] supportingDocuments; // IPFS hashes of supporting documents
        address submittedBy;         // Ethereum address of submitter
        address verifiedBy;          // Address of verifier (if verified)
        address approvedBy;          // Address of approver (if approved)
        uint256 submittedAt;         // Timestamp of submission
        uint256 updatedAt;           // Last update timestamp
        string rejectionReason;      // Reason if rejected
        bool exists;                 // Flag for existence check
    }

    // Storage
    mapping(string => Claim) private claims;
    string[] private allClaimIds;
    
    // Mappings for quick lookups
    mapping(string => string[]) private claimsByPatient;
    mapping(string => string[]) private claimsByProvider;
    mapping(string => string[]) private claimsByPolicy;

    // Events
    event ClaimSubmitted(
        string indexed claimId,
        string policyNumber,
        string patientId,
        string providerId,
        uint256 claimedAmount,
        uint256 timestamp
    );

    event ClaimVerified(
        string indexed claimId,
        address indexed verifier,
        uint256 timestamp
    );

    event ClaimApproved(
        string indexed claimId,
        uint256 approvedAmount,
        address indexed approver,
        uint256 timestamp
    );

    event ClaimRejected(
        string indexed claimId,
        string reason,
        address indexed rejector,
        uint256 timestamp
    );

    event ClaimPaid(
        string indexed claimId,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Constructor - grants admin role to deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier claimExists(string memory _claimId) {
        require(claims[_claimId].exists, "Claim does not exist");
        _;
    }

    modifier claimInStatus(string memory _claimId, ClaimStatus _status) {
        require(claims[_claimId].status == _status, "Claim not in required status");
        _;
    }

    // ============================================================================
    // Public Functions
    // ============================================================================

    /**
     * @notice Submit a new insurance claim
     * @param _claimId Unique claim identifier
     * @param _policyNumber Insurance policy number
     * @param _patientId Patient blockchain ID
     * @param _providerId Hospital/doctor identifier
     * @param _claimedAmount Amount being claimed (in wei)
     * @param _supportingDocs Array of IPFS hashes for documents
     */
    function submitClaim(
        string memory _claimId,
        string memory _policyNumber,
        string memory _patientId,
        string memory _providerId,
        uint256 _claimedAmount,
        string[] memory _supportingDocs
    ) external nonReentrant {
        require(!claims[_claimId].exists, "Claim already exists");
        require(_claimedAmount > 0, "Claim amount must be greater than 0");
        require(bytes(_claimId).length > 0, "Claim ID required");
        require(bytes(_policyNumber).length > 0, "Policy number required");

        claims[_claimId] = Claim({
            claimId: _claimId,
            policyNumber: _policyNumber,
            patientId: _patientId,
            providerId: _providerId,
            claimedAmount: _claimedAmount,
            approvedAmount: 0,
            status: ClaimStatus.Submitted,
            supportingDocuments: _supportingDocs,
            submittedBy: msg.sender,
            verifiedBy: address(0),
            approvedBy: address(0),
            submittedAt: block.timestamp,
            updatedAt: block.timestamp,
            rejectionReason: "",
            exists: true
        });

        allClaimIds.push(_claimId);
        claimsByPatient[_patientId].push(_claimId);
        claimsByProvider[_providerId].push(_claimId);
        claimsByPolicy[_policyNumber].push(_claimId);

        emit ClaimSubmitted(
            _claimId,
            _policyNumber,
            _patientId,
            _providerId,
            _claimedAmount,
            block.timestamp
        );
    }

    /**
     * @notice Verify a submitted claim (insurance role only)
     * @param _claimId Claim identifier to verify
     */
    function verifyClaim(string memory _claimId)
        external
        onlyRole(INSURANCE_ROLE)
        nonReentrant
        claimExists(_claimId)
        claimInStatus(_claimId, ClaimStatus.Submitted)
    {
        claims[_claimId].status = ClaimStatus.Verified;
        claims[_claimId].verifiedBy = msg.sender;
        claims[_claimId].updatedAt = block.timestamp;

        emit ClaimVerified(_claimId, msg.sender, block.timestamp);
    }

    /**
     * @notice Approve a verified claim with approved amount
     * @param _claimId Claim identifier
     * @param _approvedAmount Amount approved (can be less than claimed)
     */
    function approveClaim(string memory _claimId, uint256 _approvedAmount)
        external
        onlyRole(INSURANCE_ROLE)
        nonReentrant
        claimExists(_claimId)
        claimInStatus(_claimId, ClaimStatus.Verified)
    {
        require(_approvedAmount > 0, "Approved amount must be greater than 0");
        require(
            _approvedAmount <= claims[_claimId].claimedAmount,
            "Approved amount cannot exceed claimed amount"
        );

        claims[_claimId].status = ClaimStatus.Approved;
        claims[_claimId].approvedAmount = _approvedAmount;
        claims[_claimId].approvedBy = msg.sender;
        claims[_claimId].updatedAt = block.timestamp;

        emit ClaimApproved(_claimId, _approvedAmount, msg.sender, block.timestamp);
    }

    /**
     * @notice Reject a claim with reason
     * @param _claimId Claim identifier
     * @param _reason Rejection reason
     */
    function rejectClaim(string memory _claimId, string memory _reason)
        external
        onlyRole(INSURANCE_ROLE)
        nonReentrant
        claimExists(_claimId)
    {
        require(
            claims[_claimId].status == ClaimStatus.Submitted ||
            claims[_claimId].status == ClaimStatus.Verified,
            "Claim cannot be rejected in current status"
        );
        require(bytes(_reason).length > 0, "Rejection reason required");

        claims[_claimId].status = ClaimStatus.Rejected;
        claims[_claimId].rejectionReason = _reason;
        claims[_claimId].updatedAt = block.timestamp;

        emit ClaimRejected(_claimId, _reason, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark claim as paid (admin only)
     * @param _claimId Claim identifier
     */
    function markAsPaid(string memory _claimId)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        claimExists(_claimId)
        claimInStatus(_claimId, ClaimStatus.Approved)
    {
        claims[_claimId].status = ClaimStatus.Paid;
        claims[_claimId].updatedAt = block.timestamp;

        emit ClaimPaid(_claimId, claims[_claimId].approvedAmount, block.timestamp);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @notice Get claim details by ID
     * @param _claimId Claim identifier
     * @return Claim struct
     */
    function getClaim(string memory _claimId)
        external
        view
        claimExists(_claimId)
        returns (Claim memory)
    {
        return claims[_claimId];
    }

    /**
     * @notice Get all claims for a patient
     * @param _patientId Patient identifier
     * @return Array of claim IDs
     */
    function getClaimsByPatient(string memory _patientId)
        external
        view
        returns (string[] memory)
    {
        return claimsByPatient[_patientId];
    }

    /**
     * @notice Get all claims submitted by a provider
     * @param _providerId Provider identifier
     * @return Array of claim IDs
     */
    function getClaimsByProvider(string memory _providerId)
        external
        view
        returns (string[] memory)
    {
        return claimsByProvider[_providerId];
    }

    /**
     * @notice Get all claims for a policy
     * @param _policyNumber Policy number
     * @return Array of claim IDs
     */
    function getClaimsByPolicy(string memory _policyNumber)
        external
        view
        returns (string[] memory)
    {
        return claimsByPolicy[_policyNumber];
    }

    /**
     * @notice Get total number of claims
     * @return Total claim count
     */
    function getTotalClaimsCount() external view returns (uint256) {
        return allClaimIds.length;
    }

    /**
     * @notice Get claim ID by index
     * @param _index Index in allClaimIds array
     * @return Claim ID
     */
    function getClaimIdByIndex(uint256 _index) external view returns (string memory) {
        require(_index < allClaimIds.length, "Index out of bounds");
        return allClaimIds[_index];
    }

    // ============================================================================
    // Role Management (Admin only)
    // ============================================================================

    /**
     * @notice Grant insurance role to an address
     * @param _insurance Address to grant role to
     */
    function grantInsuranceRole(address _insurance) external onlyRole(ADMIN_ROLE) {
        grantRole(INSURANCE_ROLE, _insurance);
    }

    /**
     * @notice Revoke insurance role from an address
     * @param _insurance Address to revoke role from
     */
    function revokeInsuranceRole(address _insurance) external onlyRole(ADMIN_ROLE) {
        revokeRole(INSURANCE_ROLE, _insurance);
    }

    /**
     * @notice Grant hospital role to an address
     * @param _hospital Address to grant role to
     */
    function grantHospitalRole(address _hospital) external onlyRole(ADMIN_ROLE) {
        grantRole(HOSPITAL_ROLE, _hospital);
    }

    /**
     * @notice Grant auditor role to an address
     * @param _auditor Address to grant role to
     */
    function grantAuditorRole(address _auditor) external onlyRole(ADMIN_ROLE) {
        grantRole(AUDITOR_ROLE, _auditor);
    }
}
