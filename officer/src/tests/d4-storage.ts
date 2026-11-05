// Day-0 test D4: upload a sample record to 0G Storage and download it back.
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
import { mkdirSync, readFileSync } from "node:fs";
import { env, need } from "../env.js";

const provider = new ethers.JsonRpcProvider(env.zgRpc);
const signer = new ethers.Wallet(need("DEPLOYER_PRIVATE_KEY"), provider);
const indexer = new Indexer(env.zgIndexer);

const record = JSON.stringify({ flightId: "d4-test", seq: 0, type: "PERMIT", t: Date.now() });
const data = new MemData(new TextEncoder().encode(record));

const [tree, treeErr] = await data.merkleTree();
if (treeErr !== null) throw new Error(`merkle tree: ${treeErr}`);
console.log("root hash (local):", tree?.rootHash());

const t0 = Date.now();
const [tx, err] = await indexer.upload(data, env.zgRpc, signer);
if (err !== null) throw new Error(`upload: ${err}`);
if (!("rootHash" in tx)) throw new Error("unexpected fragmented upload");
console.log(`uploaded in ${Date.now() - t0} ms, tx ${tx.txHash}, root ${tx.rootHash}`);

mkdirSync(".tmp", { recursive: true });
const out = `.tmp/d4-${Date.now()}.json`;
const dErr = await indexer.download(tx.rootHash, out, true);
if (dErr !== null) throw new Error(`download: ${dErr}`);
const back = readFileSync(out, "utf8");
console.log("downloaded:", back);
console.log(back === record ? "D4 PASS" : "D4 FAIL (content differs)");
