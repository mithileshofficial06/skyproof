// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @notice ERC-20 USDC bond and claim escrow. All amounts are six-decimal base units.
/// @dev No native-currency entry points. The constructor token must be the trusted,
/// non-rebasing, non-fee-on-transfer USDC ERC-20 view for the target chain.
contract SkyProofEscrow is Ownable, ReentrancyGuard, ERC165, IReceiver {
    using SafeERC20 for IERC20;

    enum ClaimState { None, Open, WindowClosed, Paid, Held, Resolved, Expired }

    struct Airframe {
        uint256 cap;
        uint256 bond;
        address operator;
        uint256 pendingClaims;
    }

    struct Incident {
        uint256 firstClaimAt;
        uint256 windowEnd;
        uint256 claimCount;
    }

    struct Claim {
        bytes32 airframeId;
        address victim;
        uint256 incidentId;
        uint64 incidentTime;
        int256 lat;
        int256 lon;
        bytes32 evidenceHash;
        uint256 cap;
        uint256 deposit;
        ClaimState state;
        uint8 verdict;
        bytes32 breachCode;
        bytes32 reportHash;
        uint256 heldDeadline;
    }

    IERC20 public immutable usdc;
    address public forwarder;
    bytes32 public expectedWorkflowId;
    address public expectedWorkflowOwner;
    address public insurer;
    uint256 public claimWindow = 120;
    uint256 public claimDeposit = 1e6;
    uint256 public verdictTimeout = 7 days;
    uint256 public nextClaimId = 1;
    uint256 public totalBonds;
    uint256 public totalClaimDeposits;
    uint256 public totalCredits;
    uint256 public heldTimeout = 30 days;
    mapping(address => uint256) public credits;
    mapping(bytes32 => bool) private _operatorPreBound;

    mapping(bytes32 => Airframe) public airframes;
    mapping(bytes32 => uint256) public currentIncidentId;
    // Historical incidents remain available after a new incident starts.
    mapping(bytes32 => mapping(uint256 => Incident)) public incidents;
    mapping(bytes32 => uint256) public lastClaimClosedAt;
    mapping(uint256 => Claim) private _claims;

    error ZeroAddress();
    error ZeroAmount();
    error ZeroDuration();
    error InvalidCap();
    error AirframeNotRegistered(bytes32 airframeId);
    error InactiveAirframe(bytes32 airframeId);
    error UnauthorizedOperator(address caller);
    error UnauthorizedForwarder(address caller);
    error InvalidMetadata();
    error UnexpectedWorkflowId(bytes32 workflowId);
    error UnexpectedWorkflowOwner(address workflowOwner);
    error UnauthorizedInsurer(address caller);
    error InitialBondTooSmall(uint256 amount, uint256 required);
    error InsufficientBond(uint256 amount, uint256 available);
    error PendingClaims(bytes32 airframeId, uint256 count);
    error BondCooldown(uint256 availableAt);
    error FutureIncidentTime(uint64 incidentTime);
    error ClaimNotFound(uint256 claimId);
    error InvalidClaimState(uint256 claimId, ClaimState state);
    error ClaimWindowStillOpen(uint256 windowEnd);
    error VerdictAlreadyReceived(uint256 claimId);
    error InvalidVerdict(uint256 verdict);
    error InvalidReportLength(uint256 length);
    error VerdictTimeoutNotReached(uint256 deadline);
    error OperatorAlreadySet(bytes32 airframeId);
    error HeldTimeoutNotReached(uint256 deadline);
    error HeldTimeoutReached(uint256 deadline);

    event ForwarderUpdated(address indexed previousForwarder, address indexed newForwarder);
    event ExpectedWorkflowIdUpdated(bytes32 indexed previousWorkflowId, bytes32 indexed newWorkflowId);
    event ExpectedWorkflowOwnerUpdated(address indexed previousWorkflowOwner, address indexed newWorkflowOwner);
    event InsurerUpdated(address indexed previousInsurer, address indexed newInsurer);
    event ClaimWindowUpdated(uint256 previousWindow, uint256 newWindow);
    event ClaimDepositUpdated(uint256 previousDeposit, uint256 newDeposit);
    event VerdictTimeoutUpdated(uint256 previousTimeout, uint256 newTimeout);
    event AirframeRegistered(bytes32 indexed airframeId, uint256 previousCap, uint256 cap);
    event OperatorUpdated(bytes32 indexed airframeId, address indexed previousOperator, address indexed newOperator);
    event BondDeposited(bytes32 indexed airframeId, address indexed operator, uint256 amount, uint256 bond);
    event BondWithdrawn(bytes32 indexed airframeId, address indexed operator, uint256 amount, uint256 bond);
    event IncidentUpdated(bytes32 indexed airframeId, uint256 indexed incidentId, uint256 firstClaimAt, uint256 windowEnd, uint256 claimCount);
    event ClaimOpened(uint256 indexed claimId, bytes32 indexed airframeId, address indexed victim, uint256 incidentId, uint256 cap, uint256 deposit);
    event ClaimWindowClosed(uint256 indexed claimId, bytes32 indexed airframeId, uint64 incidentTime, int256 lat, int256 lon, bytes32 evidenceHash, uint256 claimsInIncident);
    event VerdictReceived(uint256 indexed claimId, uint8 verdict, bytes32 breachCode, bytes32 reportHash);
    event FundsHeld(uint256 indexed claimId, address indexed insurer, bytes32 reportHash);
    event Payout(uint256 indexed claimId, address indexed victim, uint256 amount);
    event DepositRefunded(uint256 indexed claimId, address indexed victim, uint256 amount);
    event DepositForfeited(uint256 indexed claimId, address indexed insurer, uint256 amount);
    event HeldResolved(uint256 indexed claimId, address indexed insurer, bool approved);
    event ClaimExpired(uint256 indexed claimId);
    event HeldTimeoutUpdated(uint256 previousTimeout, uint256 newTimeout);
    event CreditAccrued(address indexed to, uint256 amount);
    event CreditWithdrawn(address indexed to, uint256 amount);

    constructor(address usdc_, address initialOwner, address initialForwarder, address initialInsurer)
        Ownable(initialOwner)
    {
        if (usdc_ == address(0) || initialInsurer == address(0)) revert ZeroAddress();
        // Ownable rejects a zero initialOwner with OwnableInvalidOwner.
        usdc = IERC20(usdc_);
        forwarder = initialForwarder;
        insurer = initialInsurer;
        emit ForwarderUpdated(address(0), initialForwarder);
        emit InsurerUpdated(address(0), initialInsurer);
        emit ClaimWindowUpdated(0, claimWindow);
        emit ClaimDepositUpdated(0, claimDeposit);
        emit VerdictTimeoutUpdated(0, verdictTimeout);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    function setForwarder(address newForwarder) external onlyOwner {
        emit ForwarderUpdated(forwarder, newForwarder);
        forwarder = newForwarder;
    }

    function setExpectedWorkflowId(bytes32 newWorkflowId) external onlyOwner {
        emit ExpectedWorkflowIdUpdated(expectedWorkflowId, newWorkflowId);
        expectedWorkflowId = newWorkflowId;
    }

    function setExpectedWorkflowOwner(address newWorkflowOwner) external onlyOwner {
        emit ExpectedWorkflowOwnerUpdated(expectedWorkflowOwner, newWorkflowOwner);
        expectedWorkflowOwner = newWorkflowOwner;
    }

    function setInsurer(address newInsurer) external onlyOwner {
        if (newInsurer == address(0)) revert ZeroAddress();
        emit InsurerUpdated(insurer, newInsurer);
        insurer = newInsurer;
    }

    function setClaimWindow(uint256 newWindow) external onlyOwner {
        if (newWindow == 0) revert ZeroDuration();
        emit ClaimWindowUpdated(claimWindow, newWindow);
        claimWindow = newWindow;
    }

    /// @notice Zero is allowed to disable the deposit for newly opened claims.
    function setClaimDeposit(uint256 newDeposit) external onlyOwner {
        emit ClaimDepositUpdated(claimDeposit, newDeposit);
        claimDeposit = newDeposit;
    }

    function setVerdictTimeout(uint256 newTimeout) external onlyOwner {
        if (newTimeout == 0) revert ZeroDuration();
        emit VerdictTimeoutUpdated(verdictTimeout, newTimeout);
        verdictTimeout = newTimeout;
    }

    function setHeldTimeout(uint256 newTimeout) external onlyOwner {
        if (newTimeout == 0) revert ZeroDuration();
        emit HeldTimeoutUpdated(heldTimeout, newTimeout);
        heldTimeout = newTimeout;
    }

    function setAirframeOperator(bytes32 airframeId, address operator) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        Airframe storage airframe = airframes[airframeId];
        if (airframe.cap == 0) revert AirframeNotRegistered(airframeId);
        if (airframe.operator != address(0) || airframe.bond != 0) revert OperatorAlreadySet(airframeId);
        airframe.operator = operator;
        _operatorPreBound[airframeId] = true;
        emit OperatorUpdated(airframeId, address(0), operator);
    }

    function registerAirframe(bytes32 airframeId, uint256 cap) external onlyOwner {
        if (cap == 0) revert InvalidCap();
        Airframe storage airframe = airframes[airframeId];
        emit AirframeRegistered(airframeId, airframe.cap, cap);
        airframe.cap = cap;
    }

    function isActive(bytes32 airframeId) public view returns (bool) {
        Airframe storage airframe = airframes[airframeId];
        return airframe.cap != 0 && airframe.bond >= airframe.cap;
    }

    /// @notice Full struct getter avoids an oversized flattened ABI getter.
    function claims(uint256 claimId) external view returns (Claim memory) {
        return _claims[claimId];
    }

    function currentIncident(bytes32 airframeId) external view returns (Incident memory) {
        return incidents[airframeId][currentIncidentId[airframeId]];
    }

    function depositBond(bytes32 airframeId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Airframe storage airframe = airframes[airframeId];
        if (airframe.cap == 0) revert AirframeNotRegistered(airframeId);
        if (airframe.operator == address(0)) {
            if (amount < airframe.cap) revert InitialBondTooSmall(amount, airframe.cap);
            airframe.operator = msg.sender;
            emit OperatorUpdated(airframeId, address(0), msg.sender);
        } else if (airframe.operator != msg.sender) {
            revert UnauthorizedOperator(msg.sender);
        }
        if (_operatorPreBound[airframeId]) {
            if (amount < airframe.cap) revert InitialBondTooSmall(amount, airframe.cap);
            _operatorPreBound[airframeId] = false;
        }
        airframe.bond += amount;
        totalBonds += amount;
        emit BondDeposited(airframeId, msg.sender, amount, airframe.bond);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdrawBond(bytes32 airframeId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Airframe storage airframe = airframes[airframeId];
        if (airframe.operator != msg.sender) revert UnauthorizedOperator(msg.sender);
        if (airframe.pendingClaims != 0) revert PendingClaims(airframeId, airframe.pendingClaims);
        uint256 closedAt = lastClaimClosedAt[airframeId];
        if (closedAt != 0 && block.timestamp < closedAt + claimWindow) {
            revert BondCooldown(closedAt + claimWindow);
        }
        if (amount > airframe.bond) revert InsufficientBond(amount, airframe.bond);
        airframe.bond -= amount;
        totalBonds -= amount;
        if (airframe.bond == 0) {
            airframe.operator = address(0);
            emit OperatorUpdated(airframeId, msg.sender, address(0));
        }
        emit BondWithdrawn(airframeId, msg.sender, amount, airframe.bond);
        usdc.safeTransfer(msg.sender, amount);
    }

    function openClaim(
        bytes32 airframeId,
        uint64 incidentTime,
        int256 lat,
        int256 lon,
        bytes32 evidenceHash
    ) external nonReentrant returns (uint256 claimId) {
        if (!isActive(airframeId)) revert InactiveAirframe(airframeId);
        if (uint256(incidentTime) > block.timestamp) revert FutureIncidentTime(incidentTime);
        uint256 incidentId = currentIncidentId[airframeId];
        if (incidentId == 0 || block.timestamp > incidents[airframeId][incidentId].windowEnd) {
            incidentId += 1;
            currentIncidentId[airframeId] = incidentId;
            incidents[airframeId][incidentId].firstClaimAt = block.timestamp;
            incidents[airframeId][incidentId].windowEnd = block.timestamp + claimWindow;
        }
        Incident storage incident = incidents[airframeId][incidentId];
        incident.claimCount += 1;
        emit IncidentUpdated(airframeId, incidentId, incident.firstClaimAt, incident.windowEnd, incident.claimCount);

        claimId = nextClaimId++;
        Claim storage claim = _claims[claimId];
        claim.airframeId = airframeId;
        claim.victim = msg.sender;
        claim.incidentId = incidentId;
        claim.incidentTime = incidentTime;
        claim.lat = lat;
        claim.lon = lon;
        claim.evidenceHash = evidenceHash;
        claim.cap = airframes[airframeId].cap;
        claim.deposit = claimDeposit;
        claim.state = ClaimState.Open;
        airframes[airframeId].pendingClaims += 1;
        totalClaimDeposits += claim.deposit;
        emit ClaimOpened(claimId, airframeId, msg.sender, incidentId, claim.cap, claim.deposit);
        if (claim.deposit != 0) usdc.safeTransferFrom(msg.sender, address(this), claim.deposit);
    }

    function closeClaimWindow(uint256 claimId) external {
        Claim storage claim = _existingClaim(claimId);
        if (claim.state != ClaimState.Open) revert InvalidClaimState(claimId, claim.state);
        Incident storage incident = incidents[claim.airframeId][claim.incidentId];
        if (block.timestamp <= incident.windowEnd) revert ClaimWindowStillOpen(incident.windowEnd);
        claim.state = ClaimState.WindowClosed;
        lastClaimClosedAt[claim.airframeId] = block.timestamp;
        emit ClaimWindowClosed(claimId, claim.airframeId, claim.incidentTime, claim.lat, claim.lon, claim.evidenceHash, incident.claimCount);
    }

    /// @dev Both expected workflow values default to zero, disabling metadata checks for simulation.
    /// This is insecure on a shared forwarder; both should be set in production.
    function onReport(bytes calldata metadata, bytes calldata report) external override nonReentrant {
        if (forwarder == address(0) || msg.sender != forwarder) revert UnauthorizedForwarder(msg.sender);
        if (expectedWorkflowId != bytes32(0) || expectedWorkflowOwner != address(0)) {
            if (metadata.length < 62) revert InvalidMetadata();
            bytes32 workflowId = bytes32(metadata[0:32]);
            bytes10 workflowName = bytes10(metadata[32:42]);
            address workflowOwner = address(bytes20(metadata[42:62]));
            if (expectedWorkflowId != bytes32(0) && workflowId != expectedWorkflowId) {
                revert UnexpectedWorkflowId(workflowId);
            }
            if (expectedWorkflowOwner != address(0) && workflowOwner != expectedWorkflowOwner) {
                revert UnexpectedWorkflowOwner(workflowOwner);
            }
        }
        if (report.length != 128) revert InvalidReportLength(report.length);
        // Decode the verdict word wide so even a noncanonical uint8 gets a custom error.
        (uint256 claimId, uint256 verdictWord, bytes32 breachCode, bytes32 reportHash) =
            abi.decode(report, (uint256, uint256, bytes32, bytes32));
        if (verdictWord != 1 && verdictWord != 2) revert InvalidVerdict(verdictWord);
        Claim storage claim = _existingClaim(claimId);
        if (claim.verdict != 0) revert VerdictAlreadyReceived(claimId);
        if (claim.state != ClaimState.WindowClosed) revert InvalidClaimState(claimId, claim.state);
        claim.verdict = uint8(verdictWord);
        claim.breachCode = breachCode;
        claim.reportHash = reportHash;
        lastClaimClosedAt[claim.airframeId] = block.timestamp;
        emit VerdictReceived(claimId, uint8(verdictWord), breachCode, reportHash);
        if (verdictWord == 2 || incidents[claim.airframeId][claim.incidentId].claimCount > 1) {
            claim.state = ClaimState.Held;
            claim.heldDeadline = block.timestamp + heldTimeout;
            emit FundsHeld(claimId, insurer, reportHash);
        } else {
            claim.state = ClaimState.Paid;
            _payAndRefund(claimId, claim);
        }
    }

    /// @notice The currently configured insurer handles all held claims, including older ones.
    function resolveHeld(uint256 claimId, bool approve) external nonReentrant {
        if (msg.sender != insurer) revert UnauthorizedInsurer(msg.sender);
        Claim storage claim = _existingClaim(claimId);
        if (claim.state != ClaimState.Held) revert InvalidClaimState(claimId, claim.state);
        if (block.timestamp > claim.heldDeadline) revert HeldTimeoutReached(claim.heldDeadline);
        claim.state = ClaimState.Resolved;
        lastClaimClosedAt[claim.airframeId] = block.timestamp;
        emit HeldResolved(claimId, msg.sender, approve);
        if (approve) {
            _payAndRefund(claimId, claim);
        } else {
            airframes[claim.airframeId].pendingClaims -= 1;
            totalClaimDeposits -= claim.deposit;
            emit DepositForfeited(claimId, msg.sender, claim.deposit);
            if (claim.deposit != 0) _sendOrCredit(msg.sender, claim.deposit);
        }
    }

    /// @notice Uses the stored incident end and the currently configured verdict timeout.
    function expireClaim(uint256 claimId) external nonReentrant {
        Claim storage claim = _existingClaim(claimId);
        if (claim.state != ClaimState.Open && claim.state != ClaimState.WindowClosed) revert InvalidClaimState(claimId, claim.state);
        uint256 deadline = incidents[claim.airframeId][claim.incidentId].windowEnd + verdictTimeout;
        if (block.timestamp <= deadline) revert VerdictTimeoutNotReached(deadline);
        claim.state = ClaimState.Expired;
        airframes[claim.airframeId].pendingClaims -= 1;
        lastClaimClosedAt[claim.airframeId] = block.timestamp;
        totalClaimDeposits -= claim.deposit;
        emit ClaimExpired(claimId);
        emit DepositRefunded(claimId, claim.victim, claim.deposit);
        if (claim.deposit != 0) _sendOrCredit(claim.victim, claim.deposit);
    }

    function expireHeld(uint256 claimId) external nonReentrant {
        Claim storage claim = _existingClaim(claimId);
        if (claim.state != ClaimState.Held) revert InvalidClaimState(claimId, claim.state);
        if (block.timestamp <= claim.heldDeadline) revert HeldTimeoutNotReached(claim.heldDeadline);
        claim.state = ClaimState.Expired;
        airframes[claim.airframeId].pendingClaims -= 1;
        lastClaimClosedAt[claim.airframeId] = block.timestamp;
        totalClaimDeposits -= claim.deposit;
        emit ClaimExpired(claimId);
        emit DepositRefunded(claimId, claim.victim, claim.deposit);
        if (claim.deposit != 0) _sendOrCredit(claim.victim, claim.deposit);
    }

    function withdrawCredit() external nonReentrant {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert ZeroAmount();
        credits[msg.sender] = 0;
        totalCredits -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit CreditWithdrawn(msg.sender, amount);
    }

    function _sendOrCredit(address to, uint256 amount) internal {
        try IERC20(usdc).transfer(to, amount) returns (bool ok) {
            if (ok) return;
        } catch {}
        credits[to] += amount;
        totalCredits += amount;
        emit CreditAccrued(to, amount);
    }

    function _existingClaim(uint256 claimId) private view returns (Claim storage claim) {
        claim = _claims[claimId];
        if (claim.state == ClaimState.None) revert ClaimNotFound(claimId);
    }

    /// @dev Caller first sets the terminal state. All accounting precedes either transfer.
    /// The historical deposit snapshot is retained on the claim after disbursement.
    function _payAndRefund(uint256 claimId, Claim storage claim) private {
        Airframe storage airframe = airframes[claim.airframeId];
        uint256 amount = claim.cap < airframe.bond ? claim.cap : airframe.bond;
        airframe.bond -= amount;
        totalBonds -= amount;
        airframe.pendingClaims -= 1;
        totalClaimDeposits -= claim.deposit;
        emit Payout(claimId, claim.victim, amount);
        emit DepositRefunded(claimId, claim.victim, claim.deposit);
        if (amount != 0) _sendOrCredit(claim.victim, amount);
        if (claim.deposit != 0) _sendOrCredit(claim.victim, claim.deposit);
    }
}
