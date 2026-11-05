// Arc Testnet client for SkyProofEscrow (built in Arc Studio). USDC has 6 decimals and also pays gas on Arc.
import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { need } from "./env.js";

const DEPLOY_DIR = fileURLToPath(new URL("../../contracts/deployments/", import.meta.url));
export const arcDeployment = JSON.parse(readFileSync(`${DEPLOY_DIR}arc.json`, "utf8"));
const escrowAbi = JSON.parse(readFileSync(`${DEPLOY_DIR}abi/SkyProofEscrow.json`, "utf8"));
const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

export const arcProvider = new ethers.JsonRpcProvider(need("ARC_RPC_URL"), Number(process.env.ARC_CHAIN_ID || 5042002), { staticNetwork: true });
export const escrowAddress = process.env.ARC_ESCROW_ADDRESS?.trim() || arcDeployment.SkyProofEscrow;

const key = (name: string) => {
  const k = need(`${name}_PRIVATE_KEY`);
  return new ethers.Wallet(k.startsWith("0x") ? k : `0x${k}`, arcProvider);
};
export const arcOwner = () => key("DEPLOYER"); // owner + insurer
export const arcOperator = () => key("OPERATOR");
export const arcVictim = () => key("VICTIM");

export const escrow = (runner: ethers.ContractRunner = arcProvider) => new ethers.Contract(escrowAddress, escrowAbi, runner);
export const usdc = (runner: ethers.ContractRunner = arcProvider) => new ethers.Contract(arcDeployment.usdc, erc20Abi, runner);
export const usd = (v: bigint) => `${ethers.formatUnits(v, 6)} USDC`;

export const CLAIM_STATES = ["None", "Open", "WindowClosed", "Paid", "Held", "Resolved", "Expired"];

export async function send(label: string, p: Promise<any>) {
  const tx = await p;
  const r = await tx.wait();
  console.log(`  ${label}: tx ${tx.hash} (block ${r.blockNumber})`);
  return r;
}

/** Approve the escrow to pull `amount` USDC from `w` if needed. */
export async function ensureAllowance(w: ethers.Wallet, amount: bigint) {
  const t = usdc(w);
  if ((await t.allowance(w.address, escrowAddress)) < amount) await send(`approve ${usd(amount)}`, t.approve(escrowAddress, amount));
}
