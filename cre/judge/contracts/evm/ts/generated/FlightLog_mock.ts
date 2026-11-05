// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { FlightLogABI } from './FlightLog'

export type FlightLogMock = {
  anchorCount?: (flightId: `0x${string}`) => bigint
  flightIdOf?: (airframeId: `0x${string}`, rec0Hash: `0x${string}`) => `0x${string}`
  flights?: (arg0: `0x${string}`) => readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, bigint, `0x${string}`, boolean]
  getAnchors?: (flightId: `0x${string}`) => readonly { seq: bigint; head: `0x${string}`; storageRoot: `0x${string}`; time: bigint }[]
  openFlightOf?: (arg0: `0x${string}`) => `0x${string}`
  registry?: () => `0x${string}`
} & Pick<ContractMock<typeof FlightLogABI>, 'writeReport'>

export function newFlightLogMock(address: Address, evmMock: EvmMock): FlightLogMock {
  return addContractMock(evmMock, { address, abi: FlightLogABI }) as FlightLogMock
}

