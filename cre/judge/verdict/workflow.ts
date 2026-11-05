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
import { secp256k1 } from '@noble/curves/secp256k1'
import {
	type Address,
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	type Hex,
	hexToBytes,
	keccak256,
	parseAbiParameters,
	stringToHex,
	toBytes,
} from 'viem'
import { z } from 'zod'
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

/** eth_call against 0G Chain (not a CRE-native chain, so it is reached over JSON-RPC). */
const zgCall = (runtime: Runtime<Config>, data: Hex): Hex => {
	const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: runtime.config.flightLog, data }, 'latest'] })
	const res = JSON.parse(fetchText(runtime, runtime.config.zgRpc, req))
	if (res.error) throw new Error(`0G eth_call: ${res.error.message}`)
	return res.result as Hex
}

// ---- record verification (same rules as officer/src/verify.ts) ------------------------------
type Rec = { flightId: string; seq: number; prev: string; type: string; body: any; localTime: number; hash: Hex; sig: Hex }
const ZERO = `0x${'00'.repeat(32)}`

const canonical = (v: unknown): string => {
	if (v === null || typeof v !== 'object') return JSON.stringify(v)
	if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
	const o = v as Record<string, unknown>
	return `{${Object.keys(o)
		.sort()
		.filter((k) => o[k] !== undefined)
		.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
		.join(',')}}`
}

const recoverSigner = (hash: Hex, sig: Hex): string => {
	const b = hexToBytes(sig)
	const v = b[64] >= 27 ? b[64] - 27 : b[64]
	const pub = secp256k1.Signature.fromCompact(b.slice(0, 64)).addRecoveryBit(v).recoverPublicKey(hexToBytes(hash)).toRawBytes(false)
	return `0x${keccak256(pub.slice(1)).slice(-40)}`
}

const inPoly = ([x, y]: number[], poly: number[][]): boolean => {
	let inside = false
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i]
		const [xj, yj] = poly[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
	}
	return inside
}

type Anchor = { seq: bigint; head: Hex; storageRoot: Hex; time: bigint }

const judge = (records: Rec[], anchors: Anchor[], operator: string, permitHash: Hex) => {
	const issues: string[] = []
	const breaches: { code: string; detail: string }[] = []
	let prev = ZERO
	const bySeq = new Map<number, Rec>()
	for (const [i, r] of records.entries()) {
		if (r.seq !== i) { issues.push(`missing record at ${i}`); break }
		if (r.prev !== prev) issues.push(`broken link at ${r.seq}`)
		const { hash, sig, ...unsigned } = r
		if (keccak256(toBytes(canonical(unsigned))) !== hash) issues.push(`record ${r.seq} edited`)
		else if (recoverSigner(hash, sig).toLowerCase() !== operator.toLowerCase()) issues.push(`record ${r.seq} not signed by operator`)
		prev = hash
		bySeq.set(r.seq, r)
	}
	if (anchors.length === 0) issues.push('no anchors on 0G Chain')
	for (const a of anchors) {
		const r = bySeq.get(Number(a.seq))
		if (!r) issues.push(`anchor ${a.seq} has no record`)
		else if (r.hash !== a.head) issues.push(`anchor ${a.seq} does not match record`)
	}
	if (anchors.length && records.length - 1 > Number(anchors[anchors.length - 1].seq)) issues.push('records after last anchor')
	const permit = records[0]?.body?.permit
	if (!permit || records[0].body.permitHash !== permitHash) issues.push('permit missing or not the one registered for the flight')
	for (const i of issues) breaches.push({ code: 'B5_RECORD_BROKEN', detail: i })

	const decisions = new Map<string, Rec>()
	let lastDenied: string | null = null
	for (const r of records) {
		const b = r.body
		if (r.type === 'DECISION') {
			decisions.set(r.hash, r)
			if (b.kind !== 'SITUATION') lastDenied = b.verdict === 'ALLOW' ? null : b.request.cmd.type
		}
		if (r.type === 'ACTION') {
			const d = b.decisionHash ? decisions.get(b.decisionHash) : undefined
			if (!d || d.body.verdict !== 'ALLOW') breaches.push({ code: 'B3_UNAPPROVED_ACTION', detail: `${b.cmd.type} at record ${r.seq}` })
			if (b.cmd.type === 'TAKEOFF' && permit && b.state?.windMs > permit.maxWindMs) breaches.push({ code: 'B6_UNSAFE_WIND_LAUNCH', detail: `wind ${b.state.windMs}` })
		}
		if (r.type === 'OVERRIDE' && lastDenied) breaches.push({ code: 'B4_OVERRIDE_ON_DENY', detail: `record ${r.seq}` })
		if (r.type === 'STATE' && permit) {
			for (const s of b.samples ?? []) {
				if (s.alt < 0.15) continue
				if (!inPoly(s.pos, permit.geofence)) { breaches.push({ code: 'B1_GEOFENCE', detail: `outside area t=${s.t}` }); break }
				const nf = permit.noFly.find((z: any) => inPoly(s.pos, z.polygon))
				if (nf) { breaches.push({ code: 'B1_GEOFENCE', detail: `in ${nf.name} t=${s.t}` }); break }
				if (s.alt > permit.altCeilingM) { breaches.push({ code: 'B2_ALTITUDE', detail: `${s.alt} m t=${s.t}` }); break }
			}
		}
	}
	return { intact: issues.length === 0, issues, breaches }
}

// ---- handler ----------------------------------------------------------------------------
export const onClaimWindowClosed = (runtime: Runtime<Config>, payload: DecodedLog<ClaimWindowClosedDecoded>): string => {
	const cfg = runtime.config
	const { claimId, airframeId, incidentTime } = payload.data
	runtime.log(`claim #${claimId}: airframe ${airframeId}, incident at ${incidentTime}`)

	// 1. which flight? (asked of the operator's evidence host, then confirmed on 0G Chain)
	const { chainFlightId } = JSON.parse(fetchText(runtime, `${cfg.evidenceUrl}/lookup?airframe=${airframeId}&t=${incidentTime}`))
	const flight = decodeFunctionResult({
		abi: FlightLogABI,
		functionName: 'flights',
		data: zgCall(runtime, encodeFunctionData({ abi: FlightLogABI, functionName: 'flights', args: [chainFlightId] })),
	}) as readonly [Hex, Hex, Address, Hex, bigint, bigint, bigint, Hex, boolean]
	const [fAirframe, permitHash, operator, , openedAt, closedAt] = flight
	if (fAirframe !== airframeId || incidentTime < openedAt || incidentTime > closedAt) throw new Error('flight does not match the claim on 0G Chain')
	const anchors = decodeFunctionResult({
		abi: FlightLogABI,
		functionName: 'getAnchors',
		data: zgCall(runtime, encodeFunctionData({ abi: FlightLogABI, functionName: 'getAnchors', args: [chainFlightId] })),
	}) as readonly Anchor[]
	runtime.log(`0G Chain: flight ${chainFlightId}, operator ${operator}, ${anchors.length} anchors`)

	// 2. the record, checked against 0G Chain. Each node downloads and checks the full record itself;
	//    only the compact result goes through consensus (records can be far larger than the 25 KB limit).
	const anchorsJson = JSON.stringify(anchors.map((x) => ({ seq: x.seq.toString(), head: x.head, storageRoot: x.storageRoot, time: x.time.toString() })))
	const result = JSON.parse(
		new cre.capabilities.HTTPClient()
			.sendRequest(
				runtime,
				(sr: HTTPSendRequester, url: string, aj: string, op: string, ph: string) => {
					const text = httpGet(sr, url)
					const ev = JSON.parse(text)
					const as = (JSON.parse(aj) as any[]).map((x) => ({ seq: BigInt(x.seq), head: x.head, storageRoot: x.storageRoot, time: BigInt(x.time) }))
					const r = judge(ev.records as Rec[], as, op, ph as Hex)
					return canonical({ records: ev.records.length, recordsHash: keccak256(toBytes(text)), intact: r.intact, issues: r.issues.slice(0, 10), breaches: r.breaches.slice(0, 20) })
				},
				consensusIdenticalAggregation<string>(),
			)(`${cfg.evidenceUrl}/evidence/${chainFlightId}`, anchorsJson, operator, permitHash)
			.result(),
	) as { records: number; recordsHash: Hex; intact: boolean; issues: string[]; breaches: { code: string; detail: string }[] }
	runtime.log(`record: ${result.records} records from 0G Storage, intact=${result.intact}`)

	// 3. weather cross-check
	const wx = JSON.parse(fetchText(runtime, cfg.weatherUrl))
	const windNow = Number(wx?.current?.wind_speed_10m ?? -1)
	runtime.log(`weather (Open-Meteo): wind ${windNow} m/s at the permit location`)

	// 4. verdict
	const verdict = result.breaches.length ? 1 : 2
	const breachCode = stringToHex((result.breaches[0]?.code ?? 'NONE').slice(0, 31), { size: 32 })
	const summary = { claimId: claimId.toString(), chainFlightId, recordsHash: result.recordsHash, verdict, breaches: result.breaches, issues: result.issues, windNow }
	const reportHash = keccak256(toBytes(canonical(summary)))
	for (const b of result.breaches) runtime.log(`  ${b.code}: ${b.detail}`)
	runtime.log(`verdict: ${verdict === 1 ? 'BREACH -> pay the victim' : 'REVIEW -> hold for the insurer'}`)

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
