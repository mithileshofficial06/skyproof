// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DroneRegistry
/// @notice Who flies which airframe, under which signed permit, using which approved 0G model and prompt.
/// The admin plays the regulator / insurer role: only it can register airframes, permits and models.
contract DroneRegistry {
    struct Airframe {
        address operator;     // key that signs the flight record and anchors it
        bytes32 permitHash;   // sha256 of the signed flight permit (scenarios/permit.json)
        uint64 validFrom;
        uint64 validTo;
        bool registered;
    }

    address public admin;
    mapping(bytes32 => Airframe) public airframes;
    /// keccak256(modelId, promptHash) => allowed
    mapping(bytes32 => bool) public modelAllowed;

    event AdminChanged(address indexed admin);
    event AirframeRegistered(bytes32 indexed airframeId, address indexed operator);
    event PermitSet(bytes32 indexed airframeId, bytes32 permitHash, uint64 validFrom, uint64 validTo);
    event ModelAllowlistSet(bytes32 indexed modelId, bytes32 indexed promptHash, bool allowed);

    error NotAdmin();
    error UnknownAirframe();
    error BadWindow();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
        emit AdminChanged(msg.sender);
    }

    function setAdmin(address next) external onlyAdmin {
        admin = next;
        emit AdminChanged(next);
    }

    function registerAirframe(bytes32 airframeId, address operator) external onlyAdmin {
        Airframe storage a = airframes[airframeId];
        a.operator = operator;
        a.registered = true;
        emit AirframeRegistered(airframeId, operator);
    }

    function setPermit(bytes32 airframeId, bytes32 permitHash, uint64 validFrom, uint64 validTo) external onlyAdmin {
        Airframe storage a = airframes[airframeId];
        if (!a.registered) revert UnknownAirframe();
        if (validTo <= validFrom) revert BadWindow();
        a.permitHash = permitHash;
        a.validFrom = validFrom;
        a.validTo = validTo;
        emit PermitSet(airframeId, permitHash, validFrom, validTo);
    }

    function setModelAllowlist(bytes32 modelId, bytes32 promptHash, bool allowed) external onlyAdmin {
        modelAllowed[keccak256(abi.encode(modelId, promptHash))] = allowed;
        emit ModelAllowlistSet(modelId, promptHash, allowed);
    }

    function isAllowedModel(bytes32 modelId, bytes32 promptHash) external view returns (bool) {
        return modelAllowed[keccak256(abi.encode(modelId, promptHash))];
    }

    /// @notice True if `permitHash` is the airframe's current permit and it is valid at `t`.
    function permitValid(bytes32 airframeId, bytes32 permitHash, uint256 t) public view returns (bool) {
        Airframe storage a = airframes[airframeId];
        return a.registered && a.permitHash == permitHash && t >= a.validFrom && t <= a.validTo;
    }
}
