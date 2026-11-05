// Code generated — DO NOT EDIT.
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
} from 'viem'
import type { Address, Hex } from 'viem'
import {
  bytesToHex,
  encodeCallMsg,
  EVMClient,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  prepareReportRequest,
  type EVMLog,
  type Runtime,
} from '@chainlink/cre-sdk'

export interface DecodedLog<T> extends Omit<EVMLog, 'data'> { data: T }

const encodeTopicValue = (t: Hex | Hex[] | null): string[] => {
  if (t == null) return []
  if (Array.isArray(t)) return t.map(hexToBase64)
  return [hexToBase64(t)]
}





/**
 * Filter params for AirframeRegistered. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type AirframeRegisteredTopics = {
  airframeId?: `0x${string}`
}

/**
 * Decoded AirframeRegistered event data.
 */
export type AirframeRegisteredDecoded = {
  airframeId: `0x${string}`
  previousCap: bigint
  cap: bigint
}


/**
 * Filter params for BondDeposited. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type BondDepositedTopics = {
  airframeId?: `0x${string}`
  operator?: `0x${string}`
}

/**
 * Decoded BondDeposited event data.
 */
export type BondDepositedDecoded = {
  airframeId: `0x${string}`
  operator: `0x${string}`
  amount: bigint
  bond: bigint
}


/**
 * Filter params for BondWithdrawn. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type BondWithdrawnTopics = {
  airframeId?: `0x${string}`
  operator?: `0x${string}`
}

/**
 * Decoded BondWithdrawn event data.
 */
export type BondWithdrawnDecoded = {
  airframeId: `0x${string}`
  operator: `0x${string}`
  amount: bigint
  bond: bigint
}


/**
 * Filter params for ClaimDepositUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimDepositUpdatedTopics = {
}

/**
 * Decoded ClaimDepositUpdated event data.
 */
export type ClaimDepositUpdatedDecoded = {
  previousDeposit: bigint
  newDeposit: bigint
}


/**
 * Filter params for ClaimExpired. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimExpiredTopics = {
  claimId?: bigint
}

/**
 * Decoded ClaimExpired event data.
 */
export type ClaimExpiredDecoded = {
  claimId: bigint
}


/**
 * Filter params for ClaimOpened. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimOpenedTopics = {
  claimId?: bigint
  airframeId?: `0x${string}`
  victim?: `0x${string}`
}

/**
 * Decoded ClaimOpened event data.
 */
export type ClaimOpenedDecoded = {
  claimId: bigint
  airframeId: `0x${string}`
  victim: `0x${string}`
  incidentId: bigint
  cap: bigint
  deposit: bigint
}


/**
 * Filter params for ClaimWindowClosed. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimWindowClosedTopics = {
  claimId?: bigint
  airframeId?: `0x${string}`
}

/**
 * Decoded ClaimWindowClosed event data.
 */
export type ClaimWindowClosedDecoded = {
  claimId: bigint
  airframeId: `0x${string}`
  incidentTime: bigint
  lat: bigint
  lon: bigint
  evidenceHash: `0x${string}`
  claimsInIncident: bigint
}


/**
 * Filter params for ClaimWindowUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ClaimWindowUpdatedTopics = {
}

/**
 * Decoded ClaimWindowUpdated event data.
 */
export type ClaimWindowUpdatedDecoded = {
  previousWindow: bigint
  newWindow: bigint
}


/**
 * Filter params for CreditAccrued. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type CreditAccruedTopics = {
  to?: `0x${string}`
}

/**
 * Decoded CreditAccrued event data.
 */
export type CreditAccruedDecoded = {
  to: `0x${string}`
  amount: bigint
}


/**
 * Filter params for CreditWithdrawn. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type CreditWithdrawnTopics = {
  to?: `0x${string}`
}

/**
 * Decoded CreditWithdrawn event data.
 */
export type CreditWithdrawnDecoded = {
  to: `0x${string}`
  amount: bigint
}


/**
 * Filter params for DepositForfeited. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type DepositForfeitedTopics = {
  claimId?: bigint
  insurer?: `0x${string}`
}

/**
 * Decoded DepositForfeited event data.
 */
export type DepositForfeitedDecoded = {
  claimId: bigint
  insurer: `0x${string}`
  amount: bigint
}


/**
 * Filter params for DepositRefunded. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type DepositRefundedTopics = {
  claimId?: bigint
  victim?: `0x${string}`
}

/**
 * Decoded DepositRefunded event data.
 */
export type DepositRefundedDecoded = {
  claimId: bigint
  victim: `0x${string}`
  amount: bigint
}


/**
 * Filter params for ExpectedWorkflowIdUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ExpectedWorkflowIdUpdatedTopics = {
  previousWorkflowId?: `0x${string}`
  newWorkflowId?: `0x${string}`
}

/**
 * Decoded ExpectedWorkflowIdUpdated event data.
 */
export type ExpectedWorkflowIdUpdatedDecoded = {
  previousWorkflowId: `0x${string}`
  newWorkflowId: `0x${string}`
}


/**
 * Filter params for ExpectedWorkflowOwnerUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ExpectedWorkflowOwnerUpdatedTopics = {
  previousWorkflowOwner?: `0x${string}`
  newWorkflowOwner?: `0x${string}`
}

/**
 * Decoded ExpectedWorkflowOwnerUpdated event data.
 */
export type ExpectedWorkflowOwnerUpdatedDecoded = {
  previousWorkflowOwner: `0x${string}`
  newWorkflowOwner: `0x${string}`
}


/**
 * Filter params for ForwarderUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ForwarderUpdatedTopics = {
  previousForwarder?: `0x${string}`
  newForwarder?: `0x${string}`
}

/**
 * Decoded ForwarderUpdated event data.
 */
export type ForwarderUpdatedDecoded = {
  previousForwarder: `0x${string}`
  newForwarder: `0x${string}`
}


/**
 * Filter params for FundsHeld. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type FundsHeldTopics = {
  claimId?: bigint
  insurer?: `0x${string}`
}

/**
 * Decoded FundsHeld event data.
 */
export type FundsHeldDecoded = {
  claimId: bigint
  insurer: `0x${string}`
  reportHash: `0x${string}`
}


/**
 * Filter params for HeldResolved. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type HeldResolvedTopics = {
  claimId?: bigint
  insurer?: `0x${string}`
}

/**
 * Decoded HeldResolved event data.
 */
export type HeldResolvedDecoded = {
  claimId: bigint
  insurer: `0x${string}`
  approved: boolean
}


/**
 * Filter params for HeldTimeoutUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type HeldTimeoutUpdatedTopics = {
}

/**
 * Decoded HeldTimeoutUpdated event data.
 */
export type HeldTimeoutUpdatedDecoded = {
  previousTimeout: bigint
  newTimeout: bigint
}


/**
 * Filter params for IncidentUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type IncidentUpdatedTopics = {
  airframeId?: `0x${string}`
  incidentId?: bigint
}

/**
 * Decoded IncidentUpdated event data.
 */
export type IncidentUpdatedDecoded = {
  airframeId: `0x${string}`
  incidentId: bigint
  firstClaimAt: bigint
  windowEnd: bigint
  claimCount: bigint
}


/**
 * Filter params for InsurerUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type InsurerUpdatedTopics = {
  previousInsurer?: `0x${string}`
  newInsurer?: `0x${string}`
}

/**
 * Decoded InsurerUpdated event data.
 */
export type InsurerUpdatedDecoded = {
  previousInsurer: `0x${string}`
  newInsurer: `0x${string}`
}


/**
 * Filter params for OperatorUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type OperatorUpdatedTopics = {
  airframeId?: `0x${string}`
  previousOperator?: `0x${string}`
  newOperator?: `0x${string}`
}

/**
 * Decoded OperatorUpdated event data.
 */
export type OperatorUpdatedDecoded = {
  airframeId: `0x${string}`
  previousOperator: `0x${string}`
  newOperator: `0x${string}`
}


/**
 * Filter params for OwnershipTransferred. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type OwnershipTransferredTopics = {
  previousOwner?: `0x${string}`
  newOwner?: `0x${string}`
}

/**
 * Decoded OwnershipTransferred event data.
 */
export type OwnershipTransferredDecoded = {
  previousOwner: `0x${string}`
  newOwner: `0x${string}`
}


/**
 * Filter params for Payout. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type PayoutTopics = {
  claimId?: bigint
  victim?: `0x${string}`
}

/**
 * Decoded Payout event data.
 */
export type PayoutDecoded = {
  claimId: bigint
  victim: `0x${string}`
  amount: bigint
}


/**
 * Filter params for VerdictReceived. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type VerdictReceivedTopics = {
  claimId?: bigint
}

/**
 * Decoded VerdictReceived event data.
 */
export type VerdictReceivedDecoded = {
  claimId: bigint
  verdict: number
  breachCode: `0x${string}`
  reportHash: `0x${string}`
}


/**
 * Filter params for VerdictTimeoutUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type VerdictTimeoutUpdatedTopics = {
}

/**
 * Decoded VerdictTimeoutUpdated event data.
 */
export type VerdictTimeoutUpdatedDecoded = {
  previousTimeout: bigint
  newTimeout: bigint
}


export const SkyProofEscrowABI = [{"type":"constructor","inputs":[{"name":"usdc_","type":"address","internalType":"address"},{"name":"initialOwner","type":"address","internalType":"address"},{"name":"initialForwarder","type":"address","internalType":"address"},{"name":"initialInsurer","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"airframes","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"cap","type":"uint256","internalType":"uint256"},{"name":"bond","type":"uint256","internalType":"uint256"},{"name":"operator","type":"address","internalType":"address"},{"name":"pendingClaims","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"claimDeposit","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"claimWindow","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"claims","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"tuple","internalType":"structSkyProofEscrow.Claim","components":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"victim","type":"address","internalType":"address"},{"name":"incidentId","type":"uint256","internalType":"uint256"},{"name":"incidentTime","type":"uint64","internalType":"uint64"},{"name":"lat","type":"int256","internalType":"int256"},{"name":"lon","type":"int256","internalType":"int256"},{"name":"evidenceHash","type":"bytes32","internalType":"bytes32"},{"name":"cap","type":"uint256","internalType":"uint256"},{"name":"deposit","type":"uint256","internalType":"uint256"},{"name":"state","type":"uint8","internalType":"enumSkyProofEscrow.ClaimState"},{"name":"verdict","type":"uint8","internalType":"uint8"},{"name":"breachCode","type":"bytes32","internalType":"bytes32"},{"name":"reportHash","type":"bytes32","internalType":"bytes32"},{"name":"heldDeadline","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},{"type":"function","name":"closeClaimWindow","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"credits","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"currentIncident","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"tuple","internalType":"structSkyProofEscrow.Incident","components":[{"name":"firstClaimAt","type":"uint256","internalType":"uint256"},{"name":"windowEnd","type":"uint256","internalType":"uint256"},{"name":"claimCount","type":"uint256","internalType":"uint256"}]}],"stateMutability":"view"},{"type":"function","name":"currentIncidentId","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"depositBond","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"expectedWorkflowId","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"expectedWorkflowOwner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"expireClaim","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"expireHeld","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"forwarder","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"heldTimeout","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"incidents","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"},{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"firstClaimAt","type":"uint256","internalType":"uint256"},{"name":"windowEnd","type":"uint256","internalType":"uint256"},{"name":"claimCount","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"insurer","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"isActive","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"lastClaimClosedAt","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"nextClaimId","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"onReport","inputs":[{"name":"metadata","type":"bytes","internalType":"bytes"},{"name":"report","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"openClaim","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"incidentTime","type":"uint64","internalType":"uint64"},{"name":"lat","type":"int256","internalType":"int256"},{"name":"lon","type":"int256","internalType":"int256"},{"name":"evidenceHash","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"registerAirframe","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"cap","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"renounceOwnership","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"resolveHeld","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"},{"name":"approve","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setAirframeOperator","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"operator","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setClaimDeposit","inputs":[{"name":"newDeposit","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setClaimWindow","inputs":[{"name":"newWindow","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setExpectedWorkflowId","inputs":[{"name":"newWorkflowId","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setExpectedWorkflowOwner","inputs":[{"name":"newWorkflowOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setForwarder","inputs":[{"name":"newForwarder","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setHeldTimeout","inputs":[{"name":"newTimeout","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setInsurer","inputs":[{"name":"newInsurer","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setVerdictTimeout","inputs":[{"name":"newTimeout","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"supportsInterface","inputs":[{"name":"interfaceId","type":"bytes4","internalType":"bytes4"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"totalBonds","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"totalClaimDeposits","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"totalCredits","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"usdc","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contractIERC20"}],"stateMutability":"view"},{"type":"function","name":"verdictTimeout","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"withdrawBond","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdrawCredit","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"AirframeRegistered","inputs":[{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"previousCap","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"cap","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"BondDeposited","inputs":[{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"operator","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"bond","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"BondWithdrawn","inputs":[{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"operator","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"bond","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ClaimDepositUpdated","inputs":[{"name":"previousDeposit","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"newDeposit","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ClaimExpired","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ClaimOpened","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"victim","type":"address","indexed":true,"internalType":"address"},{"name":"incidentId","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"cap","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"deposit","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ClaimWindowClosed","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"incidentTime","type":"uint64","indexed":false,"internalType":"uint64"},{"name":"lat","type":"int256","indexed":false,"internalType":"int256"},{"name":"lon","type":"int256","indexed":false,"internalType":"int256"},{"name":"evidenceHash","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"claimsInIncident","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ClaimWindowUpdated","inputs":[{"name":"previousWindow","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"newWindow","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"CreditAccrued","inputs":[{"name":"to","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"CreditWithdrawn","inputs":[{"name":"to","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"DepositForfeited","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"insurer","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"DepositRefunded","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"victim","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"ExpectedWorkflowIdUpdated","inputs":[{"name":"previousWorkflowId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"newWorkflowId","type":"bytes32","indexed":true,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"ExpectedWorkflowOwnerUpdated","inputs":[{"name":"previousWorkflowOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newWorkflowOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"ForwarderUpdated","inputs":[{"name":"previousForwarder","type":"address","indexed":true,"internalType":"address"},{"name":"newForwarder","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"FundsHeld","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"insurer","type":"address","indexed":true,"internalType":"address"},{"name":"reportHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"HeldResolved","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"insurer","type":"address","indexed":true,"internalType":"address"},{"name":"approved","type":"bool","indexed":false,"internalType":"bool"}],"anonymous":false},{"type":"event","name":"HeldTimeoutUpdated","inputs":[{"name":"previousTimeout","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"newTimeout","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"IncidentUpdated","inputs":[{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"incidentId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"firstClaimAt","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"windowEnd","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"claimCount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"InsurerUpdated","inputs":[{"name":"previousInsurer","type":"address","indexed":true,"internalType":"address"},{"name":"newInsurer","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OperatorUpdated","inputs":[{"name":"airframeId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"previousOperator","type":"address","indexed":true,"internalType":"address"},{"name":"newOperator","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true,"internalType":"address"},{"name":"newOwner","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"Payout","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"victim","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"VerdictReceived","inputs":[{"name":"claimId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"verdict","type":"uint8","indexed":false,"internalType":"uint8"},{"name":"breachCode","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"reportHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"VerdictTimeoutUpdated","inputs":[{"name":"previousTimeout","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"newTimeout","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"error","name":"AirframeNotRegistered","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"}]},{"type":"error","name":"BondCooldown","inputs":[{"name":"availableAt","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"ClaimNotFound","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"ClaimWindowStillOpen","inputs":[{"name":"windowEnd","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"FutureIncidentTime","inputs":[{"name":"incidentTime","type":"uint64","internalType":"uint64"}]},{"type":"error","name":"HeldTimeoutNotReached","inputs":[{"name":"deadline","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"HeldTimeoutReached","inputs":[{"name":"deadline","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InactiveAirframe","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"}]},{"type":"error","name":"InitialBondTooSmall","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"required","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InsufficientBond","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"available","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InvalidCap","inputs":[]},{"type":"error","name":"InvalidClaimState","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"},{"name":"state","type":"uint8","internalType":"enumSkyProofEscrow.ClaimState"}]},{"type":"error","name":"InvalidMetadata","inputs":[]},{"type":"error","name":"InvalidReportLength","inputs":[{"name":"length","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"InvalidVerdict","inputs":[{"name":"verdict","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"OperatorAlreadySet","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"}]},{"type":"error","name":"OwnableInvalidOwner","inputs":[{"name":"owner","type":"address","internalType":"address"}]},{"type":"error","name":"OwnableUnauthorizedAccount","inputs":[{"name":"account","type":"address","internalType":"address"}]},{"type":"error","name":"PendingClaims","inputs":[{"name":"airframeId","type":"bytes32","internalType":"bytes32"},{"name":"count","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"ReentrancyGuardReentrantCall","inputs":[]},{"type":"error","name":"SafeERC20FailedOperation","inputs":[{"name":"token","type":"address","internalType":"address"}]},{"type":"error","name":"UnauthorizedForwarder","inputs":[{"name":"caller","type":"address","internalType":"address"}]},{"type":"error","name":"UnauthorizedInsurer","inputs":[{"name":"caller","type":"address","internalType":"address"}]},{"type":"error","name":"UnauthorizedOperator","inputs":[{"name":"caller","type":"address","internalType":"address"}]},{"type":"error","name":"UnexpectedWorkflowId","inputs":[{"name":"workflowId","type":"bytes32","internalType":"bytes32"}]},{"type":"error","name":"UnexpectedWorkflowOwner","inputs":[{"name":"workflowOwner","type":"address","internalType":"address"}]},{"type":"error","name":"VerdictAlreadyReceived","inputs":[{"name":"claimId","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"VerdictTimeoutNotReached","inputs":[{"name":"deadline","type":"uint256","internalType":"uint256"}]},{"type":"error","name":"ZeroAddress","inputs":[]},{"type":"error","name":"ZeroAmount","inputs":[]},{"type":"error","name":"ZeroDuration","inputs":[]}] as const

export class SkyProofEscrow {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  airframes(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): readonly [bigint, bigint, `0x${string}`, bigint] {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'airframes' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'airframes' as const,
      data: bytesToHex(result.data),
    }) as readonly [bigint, bigint, `0x${string}`, bigint]
  }

  claimDeposit(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'claimDeposit' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'claimDeposit' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  claimWindow(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'claimWindow' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'claimWindow' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  claims(
    runtime: Runtime<unknown>,
    claimId: bigint,
  ): { airframeId: `0x${string}`; victim: `0x${string}`; incidentId: bigint; incidentTime: bigint; lat: bigint; lon: bigint; evidenceHash: `0x${string}`; cap: bigint; deposit: bigint; state: number; verdict: number; breachCode: `0x${string}`; reportHash: `0x${string}`; heldDeadline: bigint } {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'claims' as const,
      args: [claimId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'claims' as const,
      data: bytesToHex(result.data),
    }) as { airframeId: `0x${string}`; victim: `0x${string}`; incidentId: bigint; incidentTime: bigint; lat: bigint; lon: bigint; evidenceHash: `0x${string}`; cap: bigint; deposit: bigint; state: number; verdict: number; breachCode: `0x${string}`; reportHash: `0x${string}`; heldDeadline: bigint }
  }

  credits(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'credits' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'credits' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  currentIncident(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
  ): { firstClaimAt: bigint; windowEnd: bigint; claimCount: bigint } {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'currentIncident' as const,
      args: [airframeId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'currentIncident' as const,
      data: bytesToHex(result.data),
    }) as { firstClaimAt: bigint; windowEnd: bigint; claimCount: bigint }
  }

  currentIncidentId(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'currentIncidentId' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'currentIncidentId' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  expectedWorkflowId(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'expectedWorkflowId' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'expectedWorkflowId' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  expectedWorkflowOwner(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'expectedWorkflowOwner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'expectedWorkflowOwner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  forwarder(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'forwarder' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'forwarder' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  heldTimeout(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'heldTimeout' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'heldTimeout' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  incidents(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
    arg1: bigint,
  ): readonly [bigint, bigint, bigint] {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'incidents' as const,
      args: [arg0, arg1],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'incidents' as const,
      data: bytesToHex(result.data),
    }) as readonly [bigint, bigint, bigint]
  }

  insurer(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'insurer' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'insurer' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  isActive(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'isActive' as const,
      args: [airframeId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'isActive' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  lastClaimClosedAt(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'lastClaimClosedAt' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'lastClaimClosedAt' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  nextClaimId(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'nextClaimId' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'nextClaimId' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  owner(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'owner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'owner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  supportsInterface(
    runtime: Runtime<unknown>,
    interfaceId: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'supportsInterface' as const,
      args: [interfaceId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'supportsInterface' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  totalBonds(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'totalBonds' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'totalBonds' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  totalClaimDeposits(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'totalClaimDeposits' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'totalClaimDeposits' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  totalCredits(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'totalCredits' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'totalCredits' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  usdc(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'usdc' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'usdc' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  verdictTimeout(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'verdictTimeout' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: SkyProofEscrowABI,
      functionName: 'verdictTimeout' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  writeReportFromCloseClaimWindow(
    runtime: Runtime<unknown>,
    claimId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'closeClaimWindow' as const,
      args: [claimId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromDepositBond(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    amount: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'depositBond' as const,
      args: [airframeId, amount],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromExpireClaim(
    runtime: Runtime<unknown>,
    claimId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'expireClaim' as const,
      args: [claimId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromExpireHeld(
    runtime: Runtime<unknown>,
    claimId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'expireHeld' as const,
      args: [claimId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromOnReport(
    runtime: Runtime<unknown>,
    metadata: `0x${string}`,
    report: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'onReport' as const,
      args: [metadata, report],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromOpenClaim(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    incidentTime: bigint,
    lat: bigint,
    lon: bigint,
    evidenceHash: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'openClaim' as const,
      args: [airframeId, incidentTime, lat, lon, evidenceHash],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromRegisterAirframe(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    cap: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'registerAirframe' as const,
      args: [airframeId, cap],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromResolveHeld(
    runtime: Runtime<unknown>,
    claimId: bigint,
    approve: boolean,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'resolveHeld' as const,
      args: [claimId, approve],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetAirframeOperator(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    operator: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setAirframeOperator' as const,
      args: [airframeId, operator],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetClaimDeposit(
    runtime: Runtime<unknown>,
    newDeposit: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setClaimDeposit' as const,
      args: [newDeposit],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetClaimWindow(
    runtime: Runtime<unknown>,
    newWindow: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setClaimWindow' as const,
      args: [newWindow],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetExpectedWorkflowId(
    runtime: Runtime<unknown>,
    newWorkflowId: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setExpectedWorkflowId' as const,
      args: [newWorkflowId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetExpectedWorkflowOwner(
    runtime: Runtime<unknown>,
    newWorkflowOwner: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setExpectedWorkflowOwner' as const,
      args: [newWorkflowOwner],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetForwarder(
    runtime: Runtime<unknown>,
    newForwarder: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setForwarder' as const,
      args: [newForwarder],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetHeldTimeout(
    runtime: Runtime<unknown>,
    newTimeout: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setHeldTimeout' as const,
      args: [newTimeout],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetInsurer(
    runtime: Runtime<unknown>,
    newInsurer: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setInsurer' as const,
      args: [newInsurer],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetVerdictTimeout(
    runtime: Runtime<unknown>,
    newTimeout: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'setVerdictTimeout' as const,
      args: [newTimeout],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromTransferOwnership(
    runtime: Runtime<unknown>,
    newOwner: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'transferOwnership' as const,
      args: [newOwner],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromWithdrawBond(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    amount: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: SkyProofEscrowABI,
      functionName: 'withdrawBond' as const,
      args: [airframeId, amount],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReport(
    runtime: Runtime<unknown>,
    callData: Hex,
    gasConfig?: { gasLimit?: string },
  ) {
    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  /**
   * Creates a log trigger for AirframeRegistered events.
   * The returned trigger's adapt method decodes the raw log into AirframeRegisteredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerAirframeRegistered(
    filters?: AirframeRegisteredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'AirframeRegistered' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        airframeId: f.airframeId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'AirframeRegistered' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          airframeId: f.airframeId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'AirframeRegistered' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<AirframeRegisteredDecoded> => contract.decodeAirframeRegistered(rawOutput),
    }
  }

  /**
   * Decodes a log into AirframeRegistered data, preserving all log metadata.
   */
  decodeAirframeRegistered(log: EVMLog): DecodedLog<AirframeRegisteredDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as AirframeRegisteredDecoded }
  }

  /**
   * Creates a log trigger for BondDeposited events.
   * The returned trigger's adapt method decodes the raw log into BondDepositedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerBondDeposited(
    filters?: BondDepositedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'BondDeposited' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        airframeId: f.airframeId,
        operator: f.operator,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'BondDeposited' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          airframeId: f.airframeId,
          operator: f.operator,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'BondDeposited' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<BondDepositedDecoded> => contract.decodeBondDeposited(rawOutput),
    }
  }

  /**
   * Decodes a log into BondDeposited data, preserving all log metadata.
   */
  decodeBondDeposited(log: EVMLog): DecodedLog<BondDepositedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as BondDepositedDecoded }
  }

  /**
   * Creates a log trigger for BondWithdrawn events.
   * The returned trigger's adapt method decodes the raw log into BondWithdrawnDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerBondWithdrawn(
    filters?: BondWithdrawnTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'BondWithdrawn' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        airframeId: f.airframeId,
        operator: f.operator,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'BondWithdrawn' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          airframeId: f.airframeId,
          operator: f.operator,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'BondWithdrawn' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<BondWithdrawnDecoded> => contract.decodeBondWithdrawn(rawOutput),
    }
  }

  /**
   * Decodes a log into BondWithdrawn data, preserving all log metadata.
   */
  decodeBondWithdrawn(log: EVMLog): DecodedLog<BondWithdrawnDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as BondWithdrawnDecoded }
  }

  /**
   * Creates a log trigger for ClaimDepositUpdated events.
   * The returned trigger's adapt method decodes the raw log into ClaimDepositUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimDepositUpdated(
    filters?: ClaimDepositUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimDepositUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimDepositUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ClaimDepositUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimDepositUpdatedDecoded> => contract.decodeClaimDepositUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimDepositUpdated data, preserving all log metadata.
   */
  decodeClaimDepositUpdated(log: EVMLog): DecodedLog<ClaimDepositUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimDepositUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ClaimExpired events.
   * The returned trigger's adapt method decodes the raw log into ClaimExpiredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimExpired(
    filters?: ClaimExpiredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimExpired' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimExpired' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ClaimExpired' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimExpiredDecoded> => contract.decodeClaimExpired(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimExpired data, preserving all log metadata.
   */
  decodeClaimExpired(log: EVMLog): DecodedLog<ClaimExpiredDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimExpiredDecoded }
  }

  /**
   * Creates a log trigger for ClaimOpened events.
   * The returned trigger's adapt method decodes the raw log into ClaimOpenedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimOpened(
    filters?: ClaimOpenedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimOpened' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        airframeId: f.airframeId,
        victim: f.victim,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimOpened' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          airframeId: f.airframeId,
          victim: f.victim,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ClaimOpened' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimOpenedDecoded> => contract.decodeClaimOpened(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimOpened data, preserving all log metadata.
   */
  decodeClaimOpened(log: EVMLog): DecodedLog<ClaimOpenedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimOpenedDecoded }
  }

  /**
   * Creates a log trigger for ClaimWindowClosed events.
   * The returned trigger's adapt method decodes the raw log into ClaimWindowClosedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimWindowClosed(
    filters?: ClaimWindowClosedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimWindowClosed' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        airframeId: f.airframeId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimWindowClosed' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          airframeId: f.airframeId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ClaimWindowClosed' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimWindowClosedDecoded> => contract.decodeClaimWindowClosed(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimWindowClosed data, preserving all log metadata.
   */
  decodeClaimWindowClosed(log: EVMLog): DecodedLog<ClaimWindowClosedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimWindowClosedDecoded }
  }

  /**
   * Creates a log trigger for ClaimWindowUpdated events.
   * The returned trigger's adapt method decodes the raw log into ClaimWindowUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerClaimWindowUpdated(
    filters?: ClaimWindowUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimWindowUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ClaimWindowUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ClaimWindowUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ClaimWindowUpdatedDecoded> => contract.decodeClaimWindowUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ClaimWindowUpdated data, preserving all log metadata.
   */
  decodeClaimWindowUpdated(log: EVMLog): DecodedLog<ClaimWindowUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ClaimWindowUpdatedDecoded }
  }

  /**
   * Creates a log trigger for CreditAccrued events.
   * The returned trigger's adapt method decodes the raw log into CreditAccruedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerCreditAccrued(
    filters?: CreditAccruedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'CreditAccrued' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        to: f.to,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'CreditAccrued' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          to: f.to,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'CreditAccrued' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<CreditAccruedDecoded> => contract.decodeCreditAccrued(rawOutput),
    }
  }

  /**
   * Decodes a log into CreditAccrued data, preserving all log metadata.
   */
  decodeCreditAccrued(log: EVMLog): DecodedLog<CreditAccruedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as CreditAccruedDecoded }
  }

  /**
   * Creates a log trigger for CreditWithdrawn events.
   * The returned trigger's adapt method decodes the raw log into CreditWithdrawnDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerCreditWithdrawn(
    filters?: CreditWithdrawnTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'CreditWithdrawn' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        to: f.to,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'CreditWithdrawn' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          to: f.to,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'CreditWithdrawn' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<CreditWithdrawnDecoded> => contract.decodeCreditWithdrawn(rawOutput),
    }
  }

  /**
   * Decodes a log into CreditWithdrawn data, preserving all log metadata.
   */
  decodeCreditWithdrawn(log: EVMLog): DecodedLog<CreditWithdrawnDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as CreditWithdrawnDecoded }
  }

  /**
   * Creates a log trigger for DepositForfeited events.
   * The returned trigger's adapt method decodes the raw log into DepositForfeitedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerDepositForfeited(
    filters?: DepositForfeitedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'DepositForfeited' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        insurer: f.insurer,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'DepositForfeited' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          insurer: f.insurer,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'DepositForfeited' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<DepositForfeitedDecoded> => contract.decodeDepositForfeited(rawOutput),
    }
  }

  /**
   * Decodes a log into DepositForfeited data, preserving all log metadata.
   */
  decodeDepositForfeited(log: EVMLog): DecodedLog<DepositForfeitedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as DepositForfeitedDecoded }
  }

  /**
   * Creates a log trigger for DepositRefunded events.
   * The returned trigger's adapt method decodes the raw log into DepositRefundedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerDepositRefunded(
    filters?: DepositRefundedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'DepositRefunded' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        victim: f.victim,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'DepositRefunded' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          victim: f.victim,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'DepositRefunded' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<DepositRefundedDecoded> => contract.decodeDepositRefunded(rawOutput),
    }
  }

  /**
   * Decodes a log into DepositRefunded data, preserving all log metadata.
   */
  decodeDepositRefunded(log: EVMLog): DecodedLog<DepositRefundedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as DepositRefundedDecoded }
  }

  /**
   * Creates a log trigger for ExpectedWorkflowIdUpdated events.
   * The returned trigger's adapt method decodes the raw log into ExpectedWorkflowIdUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerExpectedWorkflowIdUpdated(
    filters?: ExpectedWorkflowIdUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ExpectedWorkflowIdUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousWorkflowId: f.previousWorkflowId,
        newWorkflowId: f.newWorkflowId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ExpectedWorkflowIdUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousWorkflowId: f.previousWorkflowId,
          newWorkflowId: f.newWorkflowId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ExpectedWorkflowIdUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ExpectedWorkflowIdUpdatedDecoded> => contract.decodeExpectedWorkflowIdUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ExpectedWorkflowIdUpdated data, preserving all log metadata.
   */
  decodeExpectedWorkflowIdUpdated(log: EVMLog): DecodedLog<ExpectedWorkflowIdUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ExpectedWorkflowIdUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ExpectedWorkflowOwnerUpdated events.
   * The returned trigger's adapt method decodes the raw log into ExpectedWorkflowOwnerUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerExpectedWorkflowOwnerUpdated(
    filters?: ExpectedWorkflowOwnerUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ExpectedWorkflowOwnerUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousWorkflowOwner: f.previousWorkflowOwner,
        newWorkflowOwner: f.newWorkflowOwner,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ExpectedWorkflowOwnerUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousWorkflowOwner: f.previousWorkflowOwner,
          newWorkflowOwner: f.newWorkflowOwner,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ExpectedWorkflowOwnerUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ExpectedWorkflowOwnerUpdatedDecoded> => contract.decodeExpectedWorkflowOwnerUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ExpectedWorkflowOwnerUpdated data, preserving all log metadata.
   */
  decodeExpectedWorkflowOwnerUpdated(log: EVMLog): DecodedLog<ExpectedWorkflowOwnerUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ExpectedWorkflowOwnerUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ForwarderUpdated events.
   * The returned trigger's adapt method decodes the raw log into ForwarderUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerForwarderUpdated(
    filters?: ForwarderUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ForwarderUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousForwarder: f.previousForwarder,
        newForwarder: f.newForwarder,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'ForwarderUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousForwarder: f.previousForwarder,
          newForwarder: f.newForwarder,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'ForwarderUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ForwarderUpdatedDecoded> => contract.decodeForwarderUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ForwarderUpdated data, preserving all log metadata.
   */
  decodeForwarderUpdated(log: EVMLog): DecodedLog<ForwarderUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ForwarderUpdatedDecoded }
  }

  /**
   * Creates a log trigger for FundsHeld events.
   * The returned trigger's adapt method decodes the raw log into FundsHeldDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerFundsHeld(
    filters?: FundsHeldTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'FundsHeld' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        insurer: f.insurer,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'FundsHeld' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          insurer: f.insurer,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'FundsHeld' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<FundsHeldDecoded> => contract.decodeFundsHeld(rawOutput),
    }
  }

  /**
   * Decodes a log into FundsHeld data, preserving all log metadata.
   */
  decodeFundsHeld(log: EVMLog): DecodedLog<FundsHeldDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as FundsHeldDecoded }
  }

  /**
   * Creates a log trigger for HeldResolved events.
   * The returned trigger's adapt method decodes the raw log into HeldResolvedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerHeldResolved(
    filters?: HeldResolvedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'HeldResolved' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        insurer: f.insurer,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'HeldResolved' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          insurer: f.insurer,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'HeldResolved' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<HeldResolvedDecoded> => contract.decodeHeldResolved(rawOutput),
    }
  }

  /**
   * Decodes a log into HeldResolved data, preserving all log metadata.
   */
  decodeHeldResolved(log: EVMLog): DecodedLog<HeldResolvedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as HeldResolvedDecoded }
  }

  /**
   * Creates a log trigger for HeldTimeoutUpdated events.
   * The returned trigger's adapt method decodes the raw log into HeldTimeoutUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerHeldTimeoutUpdated(
    filters?: HeldTimeoutUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'HeldTimeoutUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'HeldTimeoutUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'HeldTimeoutUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<HeldTimeoutUpdatedDecoded> => contract.decodeHeldTimeoutUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into HeldTimeoutUpdated data, preserving all log metadata.
   */
  decodeHeldTimeoutUpdated(log: EVMLog): DecodedLog<HeldTimeoutUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as HeldTimeoutUpdatedDecoded }
  }

  /**
   * Creates a log trigger for IncidentUpdated events.
   * The returned trigger's adapt method decodes the raw log into IncidentUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerIncidentUpdated(
    filters?: IncidentUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'IncidentUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        airframeId: f.airframeId,
        incidentId: f.incidentId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'IncidentUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          airframeId: f.airframeId,
          incidentId: f.incidentId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'IncidentUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<IncidentUpdatedDecoded> => contract.decodeIncidentUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into IncidentUpdated data, preserving all log metadata.
   */
  decodeIncidentUpdated(log: EVMLog): DecodedLog<IncidentUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as IncidentUpdatedDecoded }
  }

  /**
   * Creates a log trigger for InsurerUpdated events.
   * The returned trigger's adapt method decodes the raw log into InsurerUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerInsurerUpdated(
    filters?: InsurerUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'InsurerUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousInsurer: f.previousInsurer,
        newInsurer: f.newInsurer,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'InsurerUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousInsurer: f.previousInsurer,
          newInsurer: f.newInsurer,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'InsurerUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<InsurerUpdatedDecoded> => contract.decodeInsurerUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into InsurerUpdated data, preserving all log metadata.
   */
  decodeInsurerUpdated(log: EVMLog): DecodedLog<InsurerUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as InsurerUpdatedDecoded }
  }

  /**
   * Creates a log trigger for OperatorUpdated events.
   * The returned trigger's adapt method decodes the raw log into OperatorUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerOperatorUpdated(
    filters?: OperatorUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'OperatorUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        airframeId: f.airframeId,
        previousOperator: f.previousOperator,
        newOperator: f.newOperator,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'OperatorUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          airframeId: f.airframeId,
          previousOperator: f.previousOperator,
          newOperator: f.newOperator,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'OperatorUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<OperatorUpdatedDecoded> => contract.decodeOperatorUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into OperatorUpdated data, preserving all log metadata.
   */
  decodeOperatorUpdated(log: EVMLog): DecodedLog<OperatorUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as OperatorUpdatedDecoded }
  }

  /**
   * Creates a log trigger for OwnershipTransferred events.
   * The returned trigger's adapt method decodes the raw log into OwnershipTransferredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerOwnershipTransferred(
    filters?: OwnershipTransferredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'OwnershipTransferred' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previousOwner: f.previousOwner,
        newOwner: f.newOwner,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'OwnershipTransferred' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previousOwner: f.previousOwner,
          newOwner: f.newOwner,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'OwnershipTransferred' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<OwnershipTransferredDecoded> => contract.decodeOwnershipTransferred(rawOutput),
    }
  }

  /**
   * Decodes a log into OwnershipTransferred data, preserving all log metadata.
   */
  decodeOwnershipTransferred(log: EVMLog): DecodedLog<OwnershipTransferredDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as OwnershipTransferredDecoded }
  }

  /**
   * Creates a log trigger for Payout events.
   * The returned trigger's adapt method decodes the raw log into PayoutDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerPayout(
    filters?: PayoutTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'Payout' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
        victim: f.victim,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'Payout' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
          victim: f.victim,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'Payout' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<PayoutDecoded> => contract.decodePayout(rawOutput),
    }
  }

  /**
   * Decodes a log into Payout data, preserving all log metadata.
   */
  decodePayout(log: EVMLog): DecodedLog<PayoutDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as PayoutDecoded }
  }

  /**
   * Creates a log trigger for VerdictReceived events.
   * The returned trigger's adapt method decodes the raw log into VerdictReceivedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerVerdictReceived(
    filters?: VerdictReceivedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'VerdictReceived' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        claimId: f.claimId,
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'VerdictReceived' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          claimId: f.claimId,
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'VerdictReceived' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<VerdictReceivedDecoded> => contract.decodeVerdictReceived(rawOutput),
    }
  }

  /**
   * Decodes a log into VerdictReceived data, preserving all log metadata.
   */
  decodeVerdictReceived(log: EVMLog): DecodedLog<VerdictReceivedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as VerdictReceivedDecoded }
  }

  /**
   * Creates a log trigger for VerdictTimeoutUpdated events.
   * The returned trigger's adapt method decodes the raw log into VerdictTimeoutUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerVerdictTimeoutUpdated(
    filters?: VerdictTimeoutUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'VerdictTimeoutUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: SkyProofEscrowABI,
        eventName: 'VerdictTimeoutUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: SkyProofEscrowABI,
          eventName: 'VerdictTimeoutUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<VerdictTimeoutUpdatedDecoded> => contract.decodeVerdictTimeoutUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into VerdictTimeoutUpdated data, preserving all log metadata.
   */
  decodeVerdictTimeoutUpdated(log: EVMLog): DecodedLog<VerdictTimeoutUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: SkyProofEscrowABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as VerdictTimeoutUpdatedDecoded }
  }
}

