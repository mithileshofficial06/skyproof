import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} missing in .env`);
  return v;
}

export const env = {
  zgRpc: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
  zgIndexer: process.env.ZG_STORAGE_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
  pcBase: process.env.ZG_PC_BASE_URL || "https://router-api.0g.ai/v1",
  visionModel: process.env.ZG_VISION_MODEL || "qwen3.8-flash",
};

for (const [name, url] of Object.entries({ ZG_RPC_URL: env.zgRpc, ZG_STORAGE_INDEXER: env.zgIndexer, ZG_PC_BASE_URL: env.pcBase })) {
  if (!/^https?:\/\/[^\s=]+$/.test(url)) throw new Error(`${name} in .env is not a valid URL: "${url}"`);
}
