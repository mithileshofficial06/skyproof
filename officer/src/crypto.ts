// Segment encryption: AES-256-GCM with a per-flight key. The 0G Storage copy is ciphertext only.
// Blob layout: "SKP1" | iv (12) | tag (16) | ciphertext. The AAD binds the blob to its flight and segment.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("SKP1");

export function newFlightKey(): Buffer {
  return randomBytes(32);
}

export function encryptSegment(key: Buffer, aad: string, plaintext: string): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), ct]);
}

export function decryptSegment(key: Buffer, aad: string, blob: Buffer): string {
  if (!blob.subarray(0, 4).equals(MAGIC)) throw new Error("not a SkyProof segment");
  const iv = blob.subarray(4, 16);
  const tag = blob.subarray(16, 32);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(blob.subarray(32)), d.final()]).toString("utf8");
}

export function segmentAad(chainFlightId: string, index: number): string {
  return `skyproof:${chainFlightId.toLowerCase()}:${index}`;
}
