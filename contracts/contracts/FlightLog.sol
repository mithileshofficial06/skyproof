// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DroneRegistry} from "./DroneRegistry.sol";

/// @title FlightLog
/// @notice Ordered, timestamped fingerprints of each flight's black box.
/// The records themselves live encrypted on 0G Storage; each anchor fixes the head hash of the
/// hash-chained record at `seq` and the 0G Storage root of the segment that contains it.
contract FlightLog {
    struct Flight {
        bytes32 airframeId;
        bytes32 permitHash;
        address operator;
        bytes32 rec0Hash;     // hash of the first record (PERMIT)
        uint64 openedAt;
        uint64 closedAt;
        uint64 lastSeq;       // seq of the latest anchored record
        bytes32 head;         // record hash at lastSeq
        bool open;
    }

    struct Anchor {
        uint64 seq;
        bytes32 head;
        bytes32 storageRoot;
        uint64 time;
    }

    DroneRegistry public immutable registry;
    mapping(bytes32 => Flight) public flights;
    mapping(bytes32 => Anchor[]) private _anchors;
    mapping(bytes32 => bytes32) public openFlightOf; // airframeId => flightId

    event FlightOpened(bytes32 indexed flightId, bytes32 indexed airframeId, bytes32 permitHash, bytes32 rec0Hash);
    event Anchored(bytes32 indexed flightId, uint64 seq, bytes32 head, bytes32 storageRoot, uint64 time);
    event FlightClosed(bytes32 indexed flightId, uint64 finalSeq, bytes32 finalHead);

    error NotOperator();
    error PermitInvalid();
    error FlightAlreadyOpen();
    error FlightNotOpen();
    error SeqNotIncreasing();

    constructor(DroneRegistry registry_) {
        registry = registry_;
    }

    function flightIdOf(bytes32 airframeId, bytes32 rec0Hash) public pure returns (bytes32) {
        return keccak256(abi.encode(airframeId, rec0Hash));
    }

    function openFlight(bytes32 airframeId, bytes32 permitHash, bytes32 rec0Hash) external returns (bytes32 flightId) {
        (address operator,,,,) = registry.airframes(airframeId);
        if (msg.sender != operator) revert NotOperator();
        if (!registry.permitValid(airframeId, permitHash, block.timestamp)) revert PermitInvalid();
        if (openFlightOf[airframeId] != bytes32(0)) revert FlightAlreadyOpen();

        flightId = flightIdOf(airframeId, rec0Hash);
        if (flights[flightId].openedAt != 0) revert FlightAlreadyOpen();
        flights[flightId] = Flight({
            airframeId: airframeId,
            permitHash: permitHash,
            operator: operator,
            rec0Hash: rec0Hash,
            openedAt: uint64(block.timestamp),
            closedAt: 0,
            lastSeq: 0,
            head: rec0Hash,
            open: true
        });
        openFlightOf[airframeId] = flightId;
        emit FlightOpened(flightId, airframeId, permitHash, rec0Hash);
    }

    function anchor(bytes32 flightId, uint64 seq, bytes32 head, bytes32 storageRoot) public {
        Flight storage f = flights[flightId];
        if (!f.open) revert FlightNotOpen();
        if (msg.sender != f.operator) revert NotOperator();
        if (_anchors[flightId].length > 0 && seq <= f.lastSeq) revert SeqNotIncreasing();
        f.lastSeq = seq;
        f.head = head;
        _anchors[flightId].push(Anchor(seq, head, storageRoot, uint64(block.timestamp)));
        emit Anchored(flightId, seq, head, storageRoot, uint64(block.timestamp));
    }

    /// @notice Final anchor and close in one call.
    function closeFlight(bytes32 flightId, uint64 finalSeq, bytes32 finalHead, bytes32 storageRoot) external {
        anchor(flightId, finalSeq, finalHead, storageRoot);
        Flight storage f = flights[flightId];
        f.open = false;
        f.closedAt = uint64(block.timestamp);
        delete openFlightOf[f.airframeId];
        emit FlightClosed(flightId, finalSeq, finalHead);
    }

    function anchorCount(bytes32 flightId) external view returns (uint256) {
        return _anchors[flightId].length;
    }

    function getAnchors(bytes32 flightId) external view returns (Anchor[] memory) {
        return _anchors[flightId];
    }
}
