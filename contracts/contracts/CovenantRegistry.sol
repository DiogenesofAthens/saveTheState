// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CovenantRegistry
 * @notice Immutable on-chain registry of land use covenants tied to Assessor Parcel Numbers.
 *         Each parcel is identified by the keccak256 hash of its APN string.
 *         Covenants are append-only; deactivation is logged but the original record is permanent.
 */
contract CovenantRegistry {
    struct Covenant {
        string covenantType;
        string legalText;
        string ipfsHash;
        address creator;
        uint256 timestamp;
        bool active;
    }

    struct Parcel {
        string apn;
        bool exists;
        uint256 mintedAt;
        address mintedBy;
    }

    address public owner;
    mapping(address => bool) public authorized;
    mapping(uint256 => Parcel) public parcels;
    mapping(uint256 => Covenant[]) private _covenants;

    event ParcelMinted(
        uint256 indexed parcelId,
        string apn,
        address indexed minter,
        uint256 timestamp
    );

    event CovenantAdded(
        uint256 indexed parcelId,
        uint256 indexed covenantIndex,
        string covenantType,
        address indexed creator,
        uint256 timestamp
    );

    event CovenantDeactivated(
        uint256 indexed parcelId,
        uint256 indexed covenantIndex,
        address indexed deactivatedBy,
        uint256 timestamp
    );

    event AuthorizationChanged(address indexed account, bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "CovenantRegistry: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorized[msg.sender],
            "CovenantRegistry: caller is not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorized[msg.sender] = true;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CovenantRegistry: zero address");
        owner = newOwner;
    }

    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
        emit AuthorizationChanged(account, status);
    }

    /**
     * @notice Register a new parcel. Can only be called by the registry owner.
     * @param apn The Assessor Parcel Number string (e.g. "154-210-01")
     * @return parcelId The uint256 token ID derived from keccak256(apn)
     */
    function mintParcel(string calldata apn) external onlyOwner returns (uint256) {
        uint256 parcelId = uint256(keccak256(abi.encodePacked(apn)));
        require(!parcels[parcelId].exists, "CovenantRegistry: parcel already registered");
        parcels[parcelId] = Parcel({
            apn: apn,
            exists: true,
            mintedAt: block.timestamp,
            mintedBy: msg.sender
        });
        emit ParcelMinted(parcelId, apn, msg.sender, block.timestamp);
        return parcelId;
    }

    /**
     * @notice Attach a new covenant to a registered parcel.
     * @param parcelId The uint256 parcel ID
     * @param covenantType Human-readable covenant category
     * @param legalText Plain-English summary of the covenant obligation
     * @param ipfsHash Content-addressed hash of the full legal document
     */
    function addCovenant(
        uint256 parcelId,
        string calldata covenantType,
        string calldata legalText,
        string calldata ipfsHash
    ) external onlyAuthorized {
        require(parcels[parcelId].exists, "CovenantRegistry: parcel not registered");
        _covenants[parcelId].push(
            Covenant({
                covenantType: covenantType,
                legalText: legalText,
                ipfsHash: ipfsHash,
                creator: msg.sender,
                timestamp: block.timestamp,
                active: true
            })
        );
        uint256 index = _covenants[parcelId].length - 1;
        emit CovenantAdded(parcelId, index, covenantType, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a covenant as inactive. The original record is immutable.
     */
    function deactivateCovenant(
        uint256 parcelId,
        uint256 covenantIndex
    ) external onlyAuthorized {
        require(parcels[parcelId].exists, "CovenantRegistry: parcel not registered");
        require(covenantIndex < _covenants[parcelId].length, "CovenantRegistry: invalid index");
        require(_covenants[parcelId][covenantIndex].active, "CovenantRegistry: already inactive");
        _covenants[parcelId][covenantIndex].active = false;
        emit CovenantDeactivated(parcelId, covenantIndex, msg.sender, block.timestamp);
    }

    function getCovenants(uint256 parcelId) external view returns (Covenant[] memory) {
        return _covenants[parcelId];
    }

    function getParcel(uint256 parcelId) external view returns (Parcel memory) {
        return parcels[parcelId];
    }

    function apnToId(string calldata apn) external pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(apn)));
    }

    function covenantCount(uint256 parcelId) external view returns (uint256) {
        return _covenants[parcelId].length;
    }
}
