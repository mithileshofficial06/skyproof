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
 * Filter params for Anchored. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type AnchoredTopics = {
  flightId?: `0x${string}`
}

/**
 * Decoded Anchored event data.
 */
export type AnchoredDecoded = {
  flightId: `0x${string}`
  seq: bigint
  head: `0x${string}`
  storageRoot: `0x${string}`
  time: bigint
}


/**
 * Filter params for FlightClosed. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type FlightClosedTopics = {
  flightId?: `0x${string}`
}

/**
 * Decoded FlightClosed event data.
 */
export type FlightClosedDecoded = {
  flightId: `0x${string}`
  finalSeq: bigint
  finalHead: `0x${string}`
}


/**
 * Filter params for FlightOpened. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type FlightOpenedTopics = {
  flightId?: `0x${string}`
  airframeId?: `0x${string}`
}

/**
 * Decoded FlightOpened event data.
 */
export type FlightOpenedDecoded = {
  flightId: `0x${string}`
  airframeId: `0x${string}`
  permitHash: `0x${string}`
  rec0Hash: `0x${string}`
}


export const FlightLogABI = [{"inputs":[{"internalType":"contractDroneRegistry","name":"registry_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"FlightAlreadyOpen","type":"error"},{"inputs":[],"name":"FlightNotOpen","type":"error"},{"inputs":[],"name":"NotOperator","type":"error"},{"inputs":[],"name":"PermitInvalid","type":"error"},{"inputs":[],"name":"SeqNotIncreasing","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"flightId","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"seq","type":"uint64"},{"indexed":false,"internalType":"bytes32","name":"head","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"storageRoot","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"time","type":"uint64"}],"name":"Anchored","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"flightId","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"finalSeq","type":"uint64"},{"indexed":false,"internalType":"bytes32","name":"finalHead","type":"bytes32"}],"name":"FlightClosed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"flightId","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"airframeId","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"permitHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"rec0Hash","type":"bytes32"}],"name":"FlightOpened","type":"event"},{"inputs":[{"internalType":"bytes32","name":"flightId","type":"bytes32"},{"internalType":"uint64","name":"seq","type":"uint64"},{"internalType":"bytes32","name":"head","type":"bytes32"},{"internalType":"bytes32","name":"storageRoot","type":"bytes32"}],"name":"anchor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"flightId","type":"bytes32"}],"name":"anchorCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"flightId","type":"bytes32"},{"internalType":"uint64","name":"finalSeq","type":"uint64"},{"internalType":"bytes32","name":"finalHead","type":"bytes32"},{"internalType":"bytes32","name":"storageRoot","type":"bytes32"}],"name":"closeFlight","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"airframeId","type":"bytes32"},{"internalType":"bytes32","name":"rec0Hash","type":"bytes32"}],"name":"flightIdOf","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"flights","outputs":[{"internalType":"bytes32","name":"airframeId","type":"bytes32"},{"internalType":"bytes32","name":"permitHash","type":"bytes32"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"bytes32","name":"rec0Hash","type":"bytes32"},{"internalType":"uint64","name":"openedAt","type":"uint64"},{"internalType":"uint64","name":"closedAt","type":"uint64"},{"internalType":"uint64","name":"lastSeq","type":"uint64"},{"internalType":"bytes32","name":"head","type":"bytes32"},{"internalType":"bool","name":"open","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"flightId","type":"bytes32"}],"name":"getAnchors","outputs":[{"components":[{"internalType":"uint64","name":"seq","type":"uint64"},{"internalType":"bytes32","name":"head","type":"bytes32"},{"internalType":"bytes32","name":"storageRoot","type":"bytes32"},{"internalType":"uint64","name":"time","type":"uint64"}],"internalType":"structFlightLog.Anchor[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"airframeId","type":"bytes32"},{"internalType":"bytes32","name":"permitHash","type":"bytes32"},{"internalType":"bytes32","name":"rec0Hash","type":"bytes32"}],"name":"openFlight","outputs":[{"internalType":"bytes32","name":"flightId","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"openFlightOf","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"registry","outputs":[{"internalType":"contractDroneRegistry","name":"","type":"address"}],"stateMutability":"view","type":"function"}] as const

export class FlightLog {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  anchorCount(
    runtime: Runtime<unknown>,
    flightId: `0x${string}`,
  ): bigint {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'anchorCount' as const,
      args: [flightId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'anchorCount' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  flightIdOf(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    rec0Hash: `0x${string}`,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'flightIdOf' as const,
      args: [airframeId, rec0Hash],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'flightIdOf' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  flights(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, bigint, `0x${string}`, boolean] {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'flights' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'flights' as const,
      data: bytesToHex(result.data),
    }) as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, bigint, `0x${string}`, boolean]
  }

  getAnchors(
    runtime: Runtime<unknown>,
    flightId: `0x${string}`,
  ): readonly { seq: bigint; head: `0x${string}`; storageRoot: `0x${string}`; time: bigint }[] {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'getAnchors' as const,
      args: [flightId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'getAnchors' as const,
      data: bytesToHex(result.data),
    }) as readonly { seq: bigint; head: `0x${string}`; storageRoot: `0x${string}`; time: bigint }[]
  }

  openFlightOf(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'openFlightOf' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'openFlightOf' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  registry(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'registry' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: FlightLogABI,
      functionName: 'registry' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  writeReportFromAnchor(
    runtime: Runtime<unknown>,
    flightId: `0x${string}`,
    seq: bigint,
    head: `0x${string}`,
    storageRoot: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'anchor' as const,
      args: [flightId, seq, head, storageRoot],
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

  writeReportFromCloseFlight(
    runtime: Runtime<unknown>,
    flightId: `0x${string}`,
    finalSeq: bigint,
    finalHead: `0x${string}`,
    storageRoot: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'closeFlight' as const,
      args: [flightId, finalSeq, finalHead, storageRoot],
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

  writeReportFromOpenFlight(
    runtime: Runtime<unknown>,
    airframeId: `0x${string}`,
    permitHash: `0x${string}`,
    rec0Hash: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: FlightLogABI,
      functionName: 'openFlight' as const,
      args: [airframeId, permitHash, rec0Hash],
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
   * Creates a log trigger for Anchored events.
   * The returned trigger's adapt method decodes the raw log into AnchoredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerAnchored(
    filters?: AnchoredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'Anchored' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        flightId: f.flightId,
      }
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'Anchored' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          flightId: f.flightId,
        }
        return encodeEventTopics({
          abi: FlightLogABI,
          eventName: 'Anchored' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<AnchoredDecoded> => contract.decodeAnchored(rawOutput),
    }
  }

  /**
   * Decodes a log into Anchored data, preserving all log metadata.
   */
  decodeAnchored(log: EVMLog): DecodedLog<AnchoredDecoded> {
    const decoded = decodeEventLog({
      abi: FlightLogABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as AnchoredDecoded }
  }

  /**
   * Creates a log trigger for FlightClosed events.
   * The returned trigger's adapt method decodes the raw log into FlightClosedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerFlightClosed(
    filters?: FlightClosedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'FlightClosed' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        flightId: f.flightId,
      }
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'FlightClosed' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          flightId: f.flightId,
        }
        return encodeEventTopics({
          abi: FlightLogABI,
          eventName: 'FlightClosed' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<FlightClosedDecoded> => contract.decodeFlightClosed(rawOutput),
    }
  }

  /**
   * Decodes a log into FlightClosed data, preserving all log metadata.
   */
  decodeFlightClosed(log: EVMLog): DecodedLog<FlightClosedDecoded> {
    const decoded = decodeEventLog({
      abi: FlightLogABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as FlightClosedDecoded }
  }

  /**
   * Creates a log trigger for FlightOpened events.
   * The returned trigger's adapt method decodes the raw log into FlightOpenedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerFlightOpened(
    filters?: FlightOpenedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'FlightOpened' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        flightId: f.flightId,
        airframeId: f.airframeId,
      }
      const encoded = encodeEventTopics({
        abi: FlightLogABI,
        eventName: 'FlightOpened' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          flightId: f.flightId,
          airframeId: f.airframeId,
        }
        return encodeEventTopics({
          abi: FlightLogABI,
          eventName: 'FlightOpened' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<FlightOpenedDecoded> => contract.decodeFlightOpened(rawOutput),
    }
  }

  /**
   * Decodes a log into FlightOpened data, preserving all log metadata.
   */
  decodeFlightOpened(log: EVMLog): DecodedLog<FlightOpenedDecoded> {
    const decoded = decodeEventLog({
      abi: FlightLogABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as FlightOpenedDecoded }
  }
}

