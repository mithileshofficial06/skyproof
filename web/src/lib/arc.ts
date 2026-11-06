// Arc Testnet + SkyProofEscrow helpers shared by the claim page and the insurer desk.
import { createPublicClient, createWalletClient, custom, defineChain, http, stringToHex, toHex, type Address, type Hex } from "viem";
import { ARC_EXPLORER } from "./flight";

export const ESCROW = (process.env.NEXT_PUBLIC_ARC_ESCROW || "0x10daa2dbded35f0056be1dbdbee908a12e4644d8") as Address;
export const USDC = "0x3600000000000000000000000000000000000000" as Address;
export const EVIDENCE_URL = process.env.NEXT_PUBLIC_EVIDENCE_URL || "http://localhost:8788";
export const AIRFRAME = stringToHex("SKY-001", { size: 32 });
export const STATES = ["None", "Open", "WindowClosed", "Paid", "Held", "Resolved", "Expired"];

export const arc = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "Arcscan", url: ARC_EXPLORER } },
  testnet: true,
});
export const pub = createPublicClient({ chain: arc, transport: http() });

export interface ClaimView {
  airframeId: Hex;
  victim: Address;
  incidentId: bigint;
  incidentTime: bigint;
  lat: bigint;
  lon: bigint;
  evidenceHash: Hex;
  cap: bigint;
  deposit: bigint;
  state: number;
  verdict: number;
  breachCode: Hex;
  reportHash: Hex;
  heldDeadline: bigint;
}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global {
  interface Window {
    ethereum?: Eth;
  }
}

/** Ask MetaMask for an account and switch it to Arc Testnet (adding the network if needed). */
export async function connectArc(): Promise<Address> {
  if (!window.ethereum) throw new Error("Install MetaMask to continue.");
  const [a] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: toHex(arc.id) }] });
  } catch {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: toHex(arc.id), chainName: arc.name, nativeCurrency: arc.nativeCurrency, rpcUrls: arc.rpcUrls.default.http, blockExplorerUrls: [ARC_EXPLORER] }],
    });
  }
  return a;
}

export function arcWallet(account: Address) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return createWalletClient({ chain: arc, transport: custom(window.ethereum), account });
}

/** The insurer's note is signed over exactly this text (the evidence server checks the same string). */
export const decisionText = (claimId: number, approve: boolean, reason: string, tx: string) => `SkyProof insurer decision\nclaim #${claimId}: ${approve ? "APPROVE" : "REJECT"}\nArc tx: ${tx}\nreason: ${reason}`;

/** Read a browser File as base64; photos are downscaled to keep the bundle small. */
export async function packFile(f: File): Promise<{ name: string; type: string; dataB64: string }> {
  if (f.type.startsWith("image/")) {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
    return { name: f.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg", dataB64: url.slice(url.indexOf(",") + 1) };
  }
  if (f.size > 1.5 * 1024 * 1024) throw new Error(`${f.name} is too large (max 1.5 MB for documents)`);
  const buf = new Uint8Array(await f.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { name: f.name, type: f.type || "application/octet-stream", dataB64: btoa(s) };
}
