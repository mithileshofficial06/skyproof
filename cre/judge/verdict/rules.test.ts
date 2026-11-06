// The judge's rules against every real published flight, plus each fix:
// reused / wrong / stale approvals, unclosed flights, withheld records, independent wind.
//   bun test
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { type Anchor, judge, type Rec, windBreach } from './rules'

const DIR = new URL('../../../web/public/data/flights/', import.meta.url)
const flights = readdirSync(DIR)
	.filter((f) => f.startsWith('SKY-') && f.endsWith('.json'))
	.map((f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')))
const run = (f: any, records: Rec[] = f.records, opts = {}) =>
	judge(records, f.anchors.map((a: any) => ({ seq: BigInt(a.seq), head: a.head, storageRoot: a.storageRoot, time: BigInt(a.time) })) as Anchor[], f.chain.operator, f.records[0].body.permitHash, opts)
const clone = (x: any) => JSON.parse(JSON.stringify(x))

describe('real flights', () => {
	test(`all ${flights.length} published flights get the same verdict as the officer's verifier`, () => {
		for (const f of flights) {
			const r = run(f)
			expect({ id: f.flightId, v: r.breaches.length ? 'BREACH' : 'REVIEW' }).toEqual({ id: f.flightId, v: f.report.verdict })
		}
	})
})

const honest = flights.find((f) => f.report.verdict === 'REVIEW' && f.records.filter((r: Rec) => r.type === 'ACTION').length >= 3)!

describe('approvals must match their action (fix #2)', () => {
	const actions = honest.records.filter((r: Rec) => r.type === 'ACTION' && r.body.cmd.type !== 'MANEUVER')
	test('an approval reused for a second action is a breach', () => {
		const recs = clone(honest.records)
		const [a, b] = actions
		recs[b.seq].body.decisionHash = a.body.decisionHash
		expect(run(honest, recs).breaches.some((x) => x.code === 'B3_UNAPPROVED_ACTION' && /already used|something else/.test(x.detail))).toBe(true)
	})
	test('an approval for a different command is a breach', () => {
		const recs = clone(honest.records)
		const take = actions.find((r: Rec) => r.body.cmd.type === 'TAKEOFF')!
		const other = actions.find((r: Rec) => r.body.cmd.type !== 'TAKEOFF')!
		recs[other.seq].body.decisionHash = take.body.decisionHash
		expect(run(honest, recs).breaches.some((x) => /decision was for something else|already used/.test(x.detail))).toBe(true)
	})
	test('a stale approval is a breach', () => {
		const recs = clone(honest.records)
		recs[actions[0].seq].localTime += 60_000
		expect(run(honest, recs).breaches.some((x) => /old$/.test(x.detail))).toBe(true)
	})
})

describe('the judge always rules (fix #1)', () => {
	test('an unclosed (crashed) flight is breach B5', () => {
		expect(run(honest, honest.records, { unclosed: true }).breaches.some((x) => x.detail === 'flight never closed on 0G Chain')).toBe(true)
	})
	test('no records handed over is breach B5, not a crash', () => {
		expect(() => run(honest, [])).not.toThrow()
		expect(run(honest, []).breaches.some((x) => x.code === 'B5_RECORD_BROKEN')).toBe(true)
	})
})

describe('independent wind (fix #3)', () => {
	const hourly = { time: ['2026-11-06T08:00', '2026-11-06T09:00'], wind_speed_10m: [4.1, 13.5] }
	const at = Date.UTC(2026, 10, 6, 8, 40) / 1000
	test('calm hour: no breach', () => expect(windBreach(hourly, at, 9)).toEqual({ wind: 4.1, breach: null }))
	test('storm hour: B6', () => expect(windBreach(hourly, at + 3600, 9).breach?.code).toBe('B6_UNSAFE_WIND_LAUNCH'))
	test('missing data: no verdict change', () => expect(windBreach(undefined, at, 9).breach).toBeNull())
})
