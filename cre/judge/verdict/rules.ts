// The judge's objective rules, kept free of CRE imports so they can be tested against real flights.
// Same record format and hashing as officer/src/verify.ts.
import { secp256k1 } from '@noble/curves/secp256k1'
import { type Hex, hexToBytes, keccak256, toBytes } from 'viem'

export type Rec = { flightId: string; seq: number; prev: string; type: string; body: any; localTime: number; hash: Hex; sig: Hex }
export type Anchor = { seq: bigint; head: Hex; storageRoot: Hex; time: bigint }
export type Breach = { code: string; detail: string }

const ZERO = `0x${'00'.repeat(32)}`
/** an approval must be used within this long (the drone's gate allows 10 s) */
export const FRESH_MS = 10_000
/** independent wind may exceed the permit limit by this much before it counts as a breach (sensor/grid slack) */
export const WIND_MARGIN_MS = 2

export const canonical = (v: unknown): string => {
	if (v === null || typeof v !== 'object') return JSON.stringify(v)
	if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
	const o = v as Record<string, unknown>
	return `{${Object.keys(o)
		.sort()
		.filter((k) => o[k] !== undefined)
		.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
		.join(',')}}`
}

export const recoverSigner = (hash: Hex, sig: Hex): string => {
	const b = hexToBytes(sig)
	const v = b[64] >= 27 ? b[64] - 27 : b[64]
	const pub = secp256k1.Signature.fromCompact(b.slice(0, 64)).addRecoveryBit(v).recoverPublicKey(hexToBytes(hash)).toRawBytes(false)
	return `0x${keccak256(pub.slice(1)).slice(-40)}`
}

export const inPoly = ([x, y]: number[], poly: number[][]): boolean => {
	let inside = false
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i]
		const [xj, yj] = poly[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
	}
	return inside
}

/** points every ~5 cm along the straight line a->b, so a dip between two samples is not missed */
const between = (a: number[], b: number[]): number[][] => {
	const n = Math.min(40, Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05)))
	return Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n])
}

/** which decision an action needs: the same command, or for a manoeuvre the situation choice it carried out */
const approves = (d: Rec, action: any): boolean => {
	if (d.body?.kind === 'SITUATION') return action.cmd?.type === 'MANEUVER' && d.body.choice === action.cmd?.choice && !!d.body.choice
	return d.body?.verdict === 'ALLOW' && d.body?.request?.cmd?.type === action.cmd?.type
}

export interface JudgeOpts {
	/** the flight was never closed on 0G Chain (e.g. it crashed) */
	unclosed?: boolean
}

export function judge(records: Rec[], anchors: Anchor[], operator: string, permitHash: Hex, opts: JudgeOpts = {}) {
	const issues: string[] = []
	const breaches: Breach[] = []
	let prev = ZERO
	const bySeq = new Map<number, Rec>()
	if (!Array.isArray(records) || records.length === 0) issues.push('no records handed over')
	for (const [i, r] of (records ?? []).entries()) {
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
	if (anchors.length && (records?.length ?? 0) - 1 > Number(anchors[anchors.length - 1].seq)) issues.push('records after last anchor')
	if (records?.length && records[records.length - 1].type !== 'CLOSE') issues.push('flight record does not end with CLOSE')
	if (opts.unclosed) issues.push('flight never closed on 0G Chain')
	const permit = records?.[0]?.body?.permit
	if (!permit || records[0].body.permitHash !== permitHash) issues.push('permit missing or not the one registered for the flight')
	for (const i of issues) breaches.push({ code: 'B5_RECORD_BROKEN', detail: i })

	const decisions = new Map<string, Rec>()
	const used = new Set<string>()
	let lastDenied: string | null = null
	let takeoffAt: number | null = null
	for (const r of records ?? []) {
		const b = r.body
		if (r.type === 'DECISION') {
			decisions.set(r.hash, r)
			if (b.kind !== 'SITUATION') lastDenied = b.verdict === 'ALLOW' ? null : b.request?.cmd?.type
		}
		if (r.type === 'ACTION') {
			const d = b.decisionHash ? decisions.get(b.decisionHash) : undefined
			let why = ''
			if (!d) why = 'no 0G decision'
			else if (!approves(d, b)) why = `decision was for something else (${d.body?.kind === 'SITUATION' ? d.body.choice : d.body?.request?.cmd?.type} ${d.body?.verdict})`
			else if (r.localTime - d.localTime > FRESH_MS) why = `approval was ${((r.localTime - d.localTime) / 1000).toFixed(1)} s old`
			else if (used.has(d.hash)) why = 'approval already used'
			if (why) breaches.push({ code: 'B3_UNAPPROVED_ACTION', detail: `${b.cmd?.type} at record ${r.seq}: ${why}` })
			if (d) used.add(d.hash)
			if (b.cmd?.type === 'TAKEOFF') {
				takeoffAt ??= r.localTime
				if (permit && b.state?.windMs > permit.maxWindMs) breaches.push({ code: 'B6_UNSAFE_WIND_LAUNCH', detail: `recorded wind ${b.state.windMs} m/s` })
			}
		}
		if (r.type === 'OVERRIDE' && lastDenied) breaches.push({ code: 'B4_OVERRIDE_ON_DENY', detail: `record ${r.seq}` })
		if (r.type === 'STATE' && permit) {
			let last: number[] | null = null
			for (const s of b.samples ?? []) {
				if (s.alt < 0.15) { last = null; continue }
				const pts = last ? between(last, s.pos) : [s.pos]
				last = s.pos
				const out = pts.find((p) => !inPoly(p, permit.geofence))
				if (out) { breaches.push({ code: 'B1_GEOFENCE', detail: `outside area t=${s.t}` }); break }
				const nf = permit.noFly.find((z: any) => pts.some((p) => inPoly(p, z.polygon)))
				if (nf) { breaches.push({ code: 'B1_GEOFENCE', detail: `in ${nf.name} t=${s.t}` }); break }
				if (s.alt > permit.altCeilingM) { breaches.push({ code: 'B2_ALTITUDE', detail: `${s.alt} m t=${s.t}` }); break }
			}
		}
	}
	return { intact: issues.length === 0, issues, breaches, maxWindMs: permit?.maxWindMs as number | undefined, takeoffAt }
}

/** independent wind check (rule B6): Open-Meteo hourly wind at the take-off hour vs the permit limit */
export function windBreach(hourly: { time: string[]; wind_speed_10m: number[] } | undefined, atUnixS: number, maxWindMs: number | undefined): { wind: number | null; breach: Breach | null } {
	if (!hourly?.time?.length || maxWindMs === undefined) return { wind: null, breach: null }
	const hour = new Date(Math.floor(atUnixS / 3600) * 3600 * 1000).toISOString().slice(0, 13) + ':00'
	const i = hourly.time.indexOf(hour)
	const wind = i >= 0 ? Number(hourly.wind_speed_10m[i]) : null
	if (wind === null || Number.isNaN(wind)) return { wind: null, breach: null }
	return { wind, breach: wind > maxWindMs + WIND_MARGIN_MS ? { code: 'B6_UNSAFE_WIND_LAUNCH', detail: `independent wind ${wind} m/s at ${hour}Z > limit ${maxWindMs}` } : null }
}
