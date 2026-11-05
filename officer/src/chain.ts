// 0G Chain (Galileo) client for DroneRegistry + FlightLog, plus 0G Storage upload/download.
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { env, need } from "./env.js";

const DEPLOY_DIR = fileURLToPath(new URL("../../contracts/deployments/", import.meta.url));

export interface Deployment {
  chainId: number;
  DroneRegistry: string;
  FlightLog: string;
  admin: string;
}

export function loadDeployment(): Deployment | null {
  const f = `${DEPLOY_DIR}galileo.json`;
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Deployment) : null;
}

const abi = (name: string) => JSON.parse(readFileSync(`${DEPLOY_DIR}abi/${name}.json`, "utf8"));

export const provider = new ethers.JsonRpcProvider(env.zgRpc, 16602, { staticNetwork: true });

/** The operator key signs records, anchors flights and pays for storage. Falls back to the deployer. */
export function operatorWallet(): ethers.Wallet {
  return new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY?.trim() || need("DEPLOYER_PRIVATE_KEY"), provider);
}

export function adminWallet(): ethers.Wallet {
  return new ethers.Wallet(need("DEPLOYER_PRIVATE_KEY"), provider);
}

export function contracts(runner: ethers.ContractRunner) {
  const d = loadDeployment();
  if (!d) throw new Error("contracts/deployments/galileo.json not found: run `pnpm deploy` in contracts/");
  return {
    deployment: d,
    registry: new ethers.Contract(d.DroneRegistry, abi("DroneRegistry"), runner),
    log: new ethers.Contract(d.FlightLog, abi("FlightLog"), runner),
  };
}

export const airframeKey = (airframeId: string) => ethers.encodeBytes32String(airframeId);
export const modelKey = (model: string) => ethers.id(model);

// ---- 0G Storage ------------------------------------------------------------------
const indexer = new Indexer(env.zgIndexer);

export async function storageUpload(bytes: Uint8Array, signer: ethers.Wallet): Promise<{ rootHash: string; txHash: string }> {
  const data = new MemData(bytes);
  const [, treeErr] = await data.merkleTree();
  if (treeErr !== null) throw new Error(`merkle tree: ${treeErr}`);
  const [tx, err] = await indexer.upload(data, env.zgRpc, signer as any); // SDK types reference the CJS ethers build
  if (err !== null) throw new Error(`0G Storage upload: ${err}`);
  if (!("rootHash" in tx)) throw new Error("unexpected fragmented upload");
  return { rootHash: tx.rootHash, txHash: tx.txHash };
}

export async function storageDownload(rootHash: string, outFile: string): Promise<Buffer> {
  mkdirSync(fileURLToPath(new URL("../.tmp/dl/", import.meta.url)), { recursive: true });
  rmSync(outFile, { force: true }); // the SDK refuses to overwrite
  const err = await indexer.download(rootHash, outFile, true);
  if (err !== null) throw new Error(`0G Storage download ${rootHash}: ${err}`);
  return readFileSync(outFile);
}
