// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { SkyProofEscrowABI } from './SkyProofEscrow'

export type SkyProofEscrowMock = {
  airframes?: (arg0: `0x${string}`) => readonly [bigint, bigint, `0x${string}`, bigint]
  claimDeposit?: () => bigint
  claimWindow?: () => bigint
  claims?: (claimId: bigint) => { airframeId: `0x${string}`; victim: `0x${string}`; incidentId: bigint; incidentTime: bigint; lat: bigint; lon: bigint; evidenceHash: `0x${string}`; cap: bigint; deposit: bigint; state: number; verdict: number; breachCode: `0x${string}`; reportHash: `0x${string}`; heldDeadline: bigint }
  credits?: (arg0: `0x${string}`) => bigint
  currentIncident?: (airframeId: `0x${string}`) => { firstClaimAt: bigint; windowEnd: bigint; claimCount: bigint }
  currentIncidentId?: (arg0: `0x${string}`) => bigint
  expectedWorkflowId?: () => `0x${string}`
  expectedWorkflowOwner?: () => `0x${string}`
  forwarder?: () => `0x${string}`
  heldTimeout?: () => bigint
  incidents?: (arg0: `0x${string}`, arg1: bigint) => readonly [bigint, bigint, bigint]
  insurer?: () => `0x${string}`
  isActive?: (airframeId: `0x${string}`) => boolean
  lastClaimClosedAt?: (arg0: `0x${string}`) => bigint
  nextClaimId?: () => bigint
  owner?: () => `0x${string}`
  supportsInterface?: (interfaceId: `0x${string}`) => boolean
  totalBonds?: () => bigint
  totalClaimDeposits?: () => bigint
  totalCredits?: () => bigint
  usdc?: () => `0x${string}`
  verdictTimeout?: () => bigint
} & Pick<ContractMock<typeof SkyProofEscrowABI>, 'writeReport'>

export function newSkyProofEscrowMock(address: Address, evmMock: EvmMock): SkyProofEscrowMock {
  return addContractMock(evmMock, { address, abi: SkyProofEscrowABI }) as SkyProofEscrowMock
}

