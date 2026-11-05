import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const deployer = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    // 0G Galileo testnet
    galileo: {
      url: process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai",
      chainId: Number(process.env.ZG_CHAIN_ID || 16602),
      accounts: deployer ? [deployer] : [],
    },
  },
};

export default config;
