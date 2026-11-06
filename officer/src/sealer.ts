// The sealer puts a flight's black box on 0G while it flies:
//   openFlight on 0G Chain -> every 15 s: encrypt new records, upload to 0G Storage, anchor head + root on 0G Chain
//   -> on close: final segment + closeFlight.
// All chain/storage writes go through one serial queue (one wallet, no nonce races).
// If 0G is slow, segments simply get bigger; nothing is skipped.
import { ethers } from "ethers";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { airframeKey, contracts, operatorWallet, storageUpload } from "./chain.js";
import { encryptSegment, newFlightKey, segmentAad } from "./crypto.js";
import type { FlightRecorder } from "./record.js";

const OUT = fileURLToPath(new URL("../.tmp/", import.meta.url));
const CUT_EVERY_MS = 15_000;

export interface SegmentInfo {
  index: number;
  fromSeq: number;
  toSeq: number;
  head: string;
  rootHash: string;
  storageTx: string;
  anchorTx: string;
  bytes: number;
}

export interface Manifest {
  flightId: string;
  chainFlightId: string;
  airframeId: string;
  permitHash: string;
  operator: string;
  flightLog: string;
  openTx?: string;
  closeTx?: string;
  closed: boolean;
  segments: SegmentInfo[];
}

type Log = (...a: unknown[]) => void;

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

async function retry<T>(what: string, log: Log, fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      log(`0G ${what} failed (try ${i}/${tries}): ${(e as Error).message.slice(0, 160)}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw last;
}

export class FlightSealer {
  readonly key = newFlightKey();
  readonly wallet = operatorWallet();
  readonly manifest: Manifest;
  private sealedSeq = -1;
  private cutPending = false;
  private timer: NodeJS.Timeout | null = null;
  private opened: Promise<void>;
  private failed = false;
  private finalRequested = false;
  onOpen?: (openTx: string) => void;
  onSeal?: (seg: { fromSeq: number; toSeq: number; anchorTx: string; storageTx: string; rootHash: string; final: boolean }) => void;

  constructor(private rec: FlightRecorder, airframeId: string, permitHash: string, private log: Log) {
    const { log: flightLog } = contracts(this.wallet);
    const rec0 = rec.records[0];
    this.manifest = {
      flightId: rec.flightId,
      chainFlightId: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [airframeKey(airframeId), rec0.hash])),
      airframeId,
      permitHash,
      operator: this.wallet.address,
      flightLog: flightLog.target as string,
      closed: false,
      segments: [],
    };
    mkdirSync(`${OUT}keys`, { recursive: true });
    // The operator keeps the key and releases it to the CRE judge / investigator on a valid claim.
    writeFileSync(`${OUT}keys/${rec.flightId}.key`, this.key.toString("hex"));
    this.save();
    this.opened = enqueue(() =>
      retry("openFlight", log, async () => {
        // A flight left open (officer crashed mid-flight) blocks this airframe: close it with no
        // storage root, so any later check of that flight shows it as unsealed (B5), never as clean.
        const stale: string = await flightLog.openFlightOf(airframeKey(airframeId));
        if (stale !== ethers.ZeroHash && stale !== this.manifest.chainFlightId) {
          const f = await flightLog.flights(stale);
          const tx0 = await flightLog.closeFlight(stale, f.lastSeq + 1n, f.head, ethers.ZeroHash);
          await tx0.wait();
          log(`0G Chain: closed stale open flight ${stale.slice(0, 18)}… as UNSEALED, tx ${tx0.hash}`);
        }
        const tx = await flightLog.openFlight(airframeKey(airframeId), permitHash, rec0.hash);
        await tx.wait();
        this.manifest.openTx = tx.hash;
        this.save();
        this.onOpen?.(tx.hash);
        log(`0G Chain: flight opened ${this.manifest.chainFlightId.slice(0, 18)}… tx ${tx.hash}`);
      })
    ).catch((e) => {
      this.failed = true;
      log(`0G Chain: could not open flight on-chain: ${(e as Error).message.slice(0, 200)}`);
    });
    this.timer = setInterval(() => this.cut(), CUT_EVERY_MS);
  }

  private save() {
    writeFileSync(`${OUT}flights/${this.rec.flightId}.manifest.json`, JSON.stringify(this.manifest, null, 2));
  }

  /** Queue a segment with everything recorded since the last one (coalesces if 0G is slow). */
  cut(final = false): Promise<void> {
    if (final) this.finalRequested = true;
    if (this.cutPending && !final) return Promise.resolve();
    if (!final) this.cutPending = true;
    return enqueue(async () => {
      if (!final) this.cutPending = false;
      await this.opened;
      if (this.failed) return;
      if (!final && this.finalRequested) return; // the closing segment takes everything
      const records = this.rec.records.filter((r) => r.seq > this.sealedSeq);
      if (records.length === 0 && !final) return;
      const { log: flightLog } = contracts(this.wallet);
      const index = this.manifest.segments.length;
      if (records.length > 0) {
        const fromSeq = records[0].seq;
        const toSeq = records[records.length - 1].seq;
        const head = records[records.length - 1].hash;
        const blob = encryptSegment(this.key, segmentAad(this.manifest.chainFlightId, index),
          JSON.stringify({ flightId: this.rec.flightId, index, fromSeq, toSeq, records }));
        const t0 = Date.now();
        const up = await retry(`Storage upload seg ${index}`, this.log, () => storageUpload(blob, this.wallet));
        const anchorTx = await retry(`anchor seg ${index}`, this.log, async () => {
          const tx = final
            ? await flightLog.closeFlight(this.manifest.chainFlightId, toSeq, head, up.rootHash)
            : await flightLog.anchor(this.manifest.chainFlightId, toSeq, head, up.rootHash);
          await tx.wait();
          return tx.hash as string;
        });
        this.sealedSeq = toSeq;
        this.manifest.segments.push({ index, fromSeq, toSeq, head, rootHash: up.rootHash, storageTx: up.txHash, anchorTx, bytes: blob.length });
        if (final) {
          this.manifest.closed = true;
          this.manifest.closeTx = anchorTx;
        }
        this.onSeal?.({ fromSeq, toSeq, anchorTx, storageTx: up.txHash, rootHash: up.rootHash, final });
        this.save();
        this.log(`0G sealed seg ${index}: records ${fromSeq}-${toSeq} (${blob.length} B) root ${up.rootHash.slice(0, 14)}… ${final ? "closeFlight" : "anchor"} tx ${anchorTx.slice(0, 14)}… in ${Date.now() - t0} ms`);
      }
    }).catch((e) => {
      this.log(`0G sealing error: ${(e as Error).message.slice(0, 200)} (records stay in the local file and retry on the next cut)`);
    });
  }

  /** Seal the rest and close the flight on-chain. Resolves when done. */
  async finish(): Promise<Manifest> {
    if (this.timer) clearInterval(this.timer);
    await this.cut(true);
    if (!this.manifest.closed) this.log(`0G: flight ${this.rec.flightId} NOT fully sealed (see errors above)`);
    else this.log(`0G: flight ${this.rec.flightId} sealed: ${this.manifest.segments.length} segments, closed on-chain`);
    return this.manifest;
  }
}
