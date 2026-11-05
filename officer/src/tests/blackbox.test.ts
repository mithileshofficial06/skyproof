// Offline tests: encryption round trip and that verifyFlight catches every kind of tampering.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { decryptSegment, encryptSegment, newFlightKey, segmentAad } from "../crypto.js";
import { FlightRecorder, type FlightRecord } from "../record.js";
import { verifyFlight, type AnchorView } from "../verify.js";
import { loadPermit } from "../permit.js";

const wallet = ethers.Wallet.createRandom();
const { permit, permitHash } = loadPermit();

function flight(opts: { cheat?: boolean } = {}) {
  const rec = new FlightRecorder(`test-${Date.now()}-${Math.random().toString(16).slice(2)}`, wallet as unknown as ethers.Wallet);
  rec.append("PERMIT", { permitHash, permit });
  const req = { nonce: "n1", cmd: { type: "DROP", from: [3.5, 2.95], to: [3.5, 3.5], alt: 0.55 }, state: {} };
  const d = rec.append("DECISION", { request: req, verdict: opts.cheat ? "DENY" : "ALLOW", code: opts.cheat ? "PEOPLE_BELOW" : "OK", source: "0G", zg: { requestId: "r1" } });
  rec.append("STATE", { samples: [{ t: 1, pos: opts.cheat ? [2.0, 2.0] : [3.5, 2.9], alt: 0.6 }] });
  rec.append("ACTION", { cmd: req.cmd, decisionHash: opts.cheat ? null : d.hash, state: { windMs: 3 } });
  rec.append("CLOSE", {});
  const anchors: AnchorView[] = [
    { seq: 2, head: rec.records[2].hash, storageRoot: "0x01", time: 1 },
    { seq: 4, head: rec.records[4].hash, storageRoot: "0x02", time: 2 },
  ];
  return { records: structuredClone(rec.records) as FlightRecord[], anchors };
}

test("segment encryption round-trips and rejects a wrong key or a moved segment", () => {
  const key = newFlightKey();
  const blob = encryptSegment(key, segmentAad("0xabc", 0), "hello black box");
  assert.equal(decryptSegment(key, segmentAad("0xabc", 0), blob), "hello black box");
  assert.throws(() => decryptSegment(newFlightKey(), segmentAad("0xabc", 0), blob));
  assert.throws(() => decryptSegment(key, segmentAad("0xabc", 1), blob)); // same blob claimed as another segment
});

test("an honest flight verifies and gets REVIEW", () => {
  const { records, anchors } = flight();
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.equal(r.ok, true, r.issues.join("; "));
  assert.equal(r.verdict, "REVIEW");
});

test("editing a record is caught", () => {
  const { records, anchors } = flight();
  (records[1].body as any).verdict = "DENY";
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.includes("edited")));
  assert.equal(r.verdict, "BREACH");
});

test("deleting a record is caught", () => {
  const { records, anchors } = flight();
  records.splice(3, 1);
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.equal(r.ok, false);
});

test("re-signing a forged record with another key is caught", () => {
  const { records, anchors } = flight();
  const other = ethers.Wallet.createRandom();
  records[4].sig = other.signingKey.sign(records[4].hash).serialized;
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.ok(r.issues.some((i) => i.includes("not signed")));
});

test("a record not matching its on-chain anchor is caught", () => {
  const { records, anchors } = flight();
  anchors[0].head = ethers.id("something else");
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.ok(r.issues.some((i) => i.includes("does not match")));
});

test("a wrong permit is caught", () => {
  const { records, anchors } = flight();
  const r = verifyFlight(records, anchors, wallet.address, ethers.id("other permit"));
  assert.ok(r.issues.some((i) => i.includes("permit")));
});

test("cheating flight: no-fly zone + unapproved drop give B1 and B3", () => {
  const { records, anchors } = flight({ cheat: true });
  const r = verifyFlight(records, anchors, wallet.address, permitHash);
  assert.equal(r.ok, true, r.issues.join("; "));
  const codes = r.breaches.map((b) => b.code);
  assert.ok(codes.includes("B1_GEOFENCE"));
  assert.ok(codes.includes("B3_UNAPPROVED_ACTION"));
  assert.equal(r.verdict, "BREACH");
});
