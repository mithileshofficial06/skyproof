// SkyProof judge (Chainlink CRE).
// Trigger: ClaimWindowClosed on the Arc escrow. Then:
//   1. find the flight that was in the air at the incident time and confirm it on 0G Chain (FlightLog)
//   2. fetch the released flight record and check it against the 0G Chain anchors (hash chain,
//      operator signatures, anchor heads) - the evidence host is not trusted
//   3. cross-check live weather (Open-Meteo)
//   4. apply the objective rules B1-B6
//   5. write the verdict report to the escrow: BREACH (1) pays the victim, REVIEW (2) holds for the insurer
import {
	bytesToHex,
	consensusIdenticalAggregation,
	cre,
	getNetwork,
	type HTTPSendRequester,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import {
	type Address,
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	type Hex,
	keccak256,
	parseAbiParameters,
	stringToHex,
	toBytes,
} from 'viem'
import { z } from 'zod'
import { type Anchor, type Breach, canonical, judge, type Rec, windBreach } from './rules'
import { FlightLogABI } from '../contracts/evm/ts/generated/FlightLog'
import { type ClaimWindowClosedDecoded, type DecodedLog, SkyProofEscrow } from '../contracts/evm/ts/generated/SkyProofEscrow'

export const configSchema = z.object({
	arcChain: z.string(),
	escrow: z.string(),
	zgRpc: z.string(),
	flightLog: z.string(),
	evidenceUrl: z.string(),
	weatherUrl: z.string(),
	gasLimit: z.string(),
})
type Config = z.infer<typeof configSchema>

// ---- HTTP helpers (every node must see the same bytes: identical-consensus) ----------------
const httpGet = (sr: HTTPSendRequester, url: string): string => {
	const r = sr.sendRequest({ method: 'GET', url }).result()
	const text = Buffer.from(r.body).toString('utf-8')
	if (r.statusCode !== 200) throw new Error(`GET ${url} -> ${r.statusCode}: ${text.slice(0, 200)}`)
	return text
}
const httpPost = (sr: HTTPSendRequester, url: string, body: string): string => {
	const r = sr
		.sendRequest({ method: 'POST', url, headers: { 'Content-Type': 'application/json' }, body: Buffer.from(body).toString('base64') })
		.result()
	const text = Buffer.from(r.body).toString('utf-8')
	if (r.statusCode !== 200) throw new Error(`POST ${url} -> ${r.statusCode}: ${text.slice(0, 200)}`)
	return text
}
const fetchText = (runtime: Runtime<Config>, url: string, body?: string): string =>
	new cre.capabilities.HTTPClient()
		.sendRequest(runtime, (sr: HTTPSendRequester, u: string, b: string) => (b ? httpPost(sr, u, b) : httpGet(sr, u)), consensusIdenticalAggregation<string>())(url, body ?? '')
		.result()

/** GET that never throws: the status and body go through consensus, and the handler decides what a failure means */
const tryGet = (runtime: Runtime<Config>, url: string): { status: number; body: string } =>
	JSON.parse(
		new cre.capabilities.HTTPClient()
			.sendRequest(
				runtime,
				(sr: HTTPSendRequester, u: string) => {
					try {
						const r = sr.sendRequest({ method: 'GET', url: u }).result()
						return JSON.stringify({ status: r.statusCode, body: Buffer.from(r.body).toString('utf-8') })
					} catch {
						return JSON.stringify({ status: 0, body: '' })
					}
				},
				consensusIdenticalAggregation<string>(),
			)(url)
			.result(),
	)

/** eth_call against 0G Chain (not a CRE-native chain, so it is reached over JSON-RPC). */
const zgCall = (runtime: Runtime<Config>, data: Hex): Hex => {
	const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: runtime.config.flightLog, data }, 'latest'] })
	const res = JSON.parse(fetchText(runtime, runtime.config.zgRpc, req))
	if (res.error) throw new Error(`0G eth_call: ${res.error.message}`)
	return res.result as Hex
}

// ---- handler ----------------------------------------------------------------------------
export const onClaimWindowClosed = (runtime: Runtime<Config>, payload: DecodedLog<ClaimWindowClosedDecoded>): string => {
	const cfg = runtime.config
	const { claimId, airframeId, incidentTime } = payload.data
	runtime.log(`claim #${claimId}: airframe ${airframeId}, incident at ${incidentTime}`)

	const readFlight = (id: Hex) =>
		decodeFunctionResult({ abi: FlightLogABI, functionName: 'flights', data: zgCall(runtime, encodeFunctionData({ abi: FlightLogABI, functionName: 'flights', args: [id] })) }) as readonly [Hex, Hex, Address, Hex, bigint, bigint, bigint, Hex, boolean]
	const covers = (f: readonly [Hex, Hex, Address, Hex, bigint, bigint, bigint, Hex, boolean]) =>
		f[0] === airframeId && incidentTime >= f[4] && (f[5] === 0n || incidentTime <= f[5]) // closedAt 0 = never closed (e.g. crashed)
	const ZERO32 = `0x${'00'.repeat(32)}` as Hex

	// 1. which flight? Ask the operator's evidence host, but never depend on it: a flight still open on
	//    0G Chain is found directly, and an unreachable host is treated as withholding the record.
	let result: { records: number; recordsHash: Hex; intact: boolean; issues: string[]; breaches: Breach[] }
	let chainFlightId: Hex = ZERO32
	let noFlight = false
	const look = tryGet(runtime, `${cfg.evidenceUrl}/lookup?airframe=${airframeId}&t=${incidentTime}`)
	let candidate: Hex | null = look.status === 200 ? (JSON.parse(look.body).chainFlightId as Hex) : null
	if (candidate && !covers(readFlight(candidate))) {
		runtime.log(`evidence host named flight ${candidate}, which does not cover the incident on 0G Chain`)
		candidate = null
	}
	if (!candidate) {
		const open = decodeFunctionResult({ abi: FlightLogABI, functionName: 'openFlightOf', data: zgCall(runtime, encodeFunctionData({ abi: FlightLogABI, functionName: 'openFlightOf', args: [airframeId] })) }) as Hex
		if (open !== ZERO32 && covers(readFlight(open))) candidate = open
	}
	const hostDown = look.status !== 200 && look.status !== 404

	if (candidate) {
		chainFlightId = candidate
		const [, permitHash, operator, , , closedAt] = readFlight(chainFlightId)
		const anchors = decodeFunctionResult({
			abi: FlightLogABI,
			functionName: 'getAnchors',
			data: zgCall(runtime, encodeFunctionData({ abi: FlightLogABI, functionName: 'getAnchors', args: [chainFlightId] })),
		}) as readonly Anchor[]
		runtime.log(`0G Chain: flight ${chainFlightId}, operator ${operator}, ${anchors.length} anchors${closedAt === 0n ? ', NEVER CLOSED' : ''}`)

		// 2. the record, checked against 0G Chain. Each node downloads and checks the full record itself;
		//    only the compact result goes through consensus. A missing or unreadable record is breach B5.
		const anchorsJson = JSON.stringify(anchors.map((x) => ({ seq: x.seq.toString(), head: x.head, storageRoot: x.storageRoot, time: x.time.toString() })))
		result = JSON.parse(
			new cre.capabilities.HTTPClient()
				.sendRequest(
					runtime,
					(sr: HTTPSendRequester, url: string, aj: string, op: string, ph: string, unclosed: string) => {
						const withheld = (why: string) => canonical({ records: 0, recordsHash: ZERO32, intact: false, issues: [why], breaches: [{ code: 'B5_RECORD_BROKEN', detail: why }] })
						let text = ''
						try {
							const r = sr.sendRequest({ method: 'GET', url }).result()
							if (r.statusCode !== 200) return withheld(`record withheld: evidence host answered ${r.statusCode}`)
							text = Buffer.from(r.body).toString('utf-8')
						} catch {
							return withheld('record withheld: evidence host unreachable')
						}
						let ev: { records?: Rec[] }
						try {
							ev = JSON.parse(text)
						} catch {
							return withheld('record unreadable: not valid JSON')
						}
						const as = (JSON.parse(aj) as any[]).map((x) => ({ seq: BigInt(x.seq), head: x.head, storageRoot: x.storageRoot, time: BigInt(x.time) }))
						const j = judge(ev.records ?? [], as, op, ph as Hex, { unclosed: unclosed === '1' })
						// the take-off time rides along (as a marker) for the independent wind check
						const takeoff = j.takeoffAt !== null ? [{ code: 'TAKEOFF_AT', detail: `${Math.floor(j.takeoffAt / 1000)}:${j.maxWindMs ?? ''}` }] : []
						return canonical({ records: ev.records?.length ?? 0, recordsHash: keccak256(toBytes(text)), intact: j.intact, issues: j.issues.slice(0, 10), breaches: [...j.breaches.slice(0, 20), ...takeoff] })
					},
					consensusIdenticalAggregation<string>(),
				)(`${cfg.evidenceUrl}/evidence/${chainFlightId}`, anchorsJson, operator, permitHash, closedAt === 0n ? '1' : '0')
				.result(),
		)
		runtime.log(`record: ${result.records} records from 0G Storage, intact=${result.intact}`)
	} else if (hostDown) {
		const why = `record withheld: evidence host ${look.status ? `answered ${look.status}` : 'unreachable'} and no open flight on 0G Chain`
		result = { records: 0, recordsHash: ZERO32, intact: false, issues: [why], breaches: [{ code: 'B5_RECORD_BROKEN', detail: why }] }
	} else {
		noFlight = true
		result = { records: 0, recordsHash: ZERO32, intact: false, issues: ['no sealed flight covers the incident time'], breaches: [] }
	}

	// 3. independent wind at the take-off hour (Open-Meteo hourly; a past hour reads the same on every node)
	const tk = result.breaches.find((b) => b.code === 'TAKEOFF_AT')
	result.breaches = result.breaches.filter((b) => b.code !== 'TAKEOFF_AT')
	let windAt: number | null = null
	if (tk) {
		const [t, max] = tk.detail.split(':').map(Number)
		const wx = tryGet(runtime, cfg.weatherUrl)
		if (wx.status === 200) {
			const w = windBreach(JSON.parse(wx.body)?.hourly, t, Number.isFinite(max) ? max : undefined)
			windAt = w.wind
			if (w.breach) result.breaches.push(w.breach)
		}
	}
	runtime.log(`weather (Open-Meteo): ${windAt === null ? 'unavailable' : `${windAt} m/s at the take-off hour`}`)

	// 4. verdict
	const verdict = result.breaches.length ? 1 : 2
	const breachCode = stringToHex((result.breaches[0]?.code ?? (noFlight ? 'NO_RECORDED_FLIGHT' : 'NONE')).slice(0, 31), { size: 32 })
	const summary = { claimId: claimId.toString(), chainFlightId, recordsHash: result.recordsHash, verdict, breaches: result.breaches, issues: result.issues, windAt, noFlight }
	const reportHash = keccak256(toBytes(canonical(summary)))
	for (const b of result.breaches) runtime.log(`  ${b.code}: ${b.detail}`)
	runtime.log(`verdict: ${verdict === 1 ? 'BREACH -> pay the victim' : noFlight ? 'REVIEW -> no recorded flight, a human decides' : 'REVIEW -> hold for the insurer'}`)

	// 5. report to the Arc escrow (only the CRE forwarder can call onReport)
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: cfg.arcChain, isTestnet: true })
	if (!network) throw new Error(`network ${cfg.arcChain} not found`)
	const escrow = new SkyProofEscrow(new cre.capabilities.EVMClient(network.chainSelector.selector), cfg.escrow as Address)
	const report = encodeAbiParameters(parseAbiParameters('uint256, uint256, bytes32, bytes32'), [claimId, BigInt(verdict), breachCode, reportHash])
	const w = escrow.writeReport(runtime, report, { gasLimit: cfg.gasLimit })
	if (w.txStatus !== TxStatus.SUCCESS) throw new Error(`report tx failed: ${w.errorMessage || w.txStatus}`)
	const tx = bytesToHex(w.txHash || new Uint8Array(32))
	runtime.log(`verdict written to Arc escrow: tx ${tx}`)
	return `claim ${claimId}: ${verdict === 1 ? 'BREACH' : 'REVIEW'} (${result.breaches.map((b) => b.code).join(',') || 'no breach'}) tx ${tx}`
}

export function initWorkflow(config: Config) {
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: config.arcChain, isTestnet: true })
	if (!network) throw new Error(`network ${config.arcChain} not found`)
	const escrow = new SkyProofEscrow(new cre.capabilities.EVMClient(network.chainSelector.selector), config.escrow as Address)
	return [cre.handler(escrow.logTriggerClaimWindowClosed(), onClaimWindowClosed)]
}
