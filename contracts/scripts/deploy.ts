import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";

// Deploy DroneRegistry + FlightLog to 0G Galileo and save the addresses for the officer.
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY missing in ../.env");
  console.log(`network ${network.name}, deployer ${deployer.address}, balance ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} 0G`);

  const registry = await ethers.deployContract("DroneRegistry");
  await registry.waitForDeployment();
  const log = await ethers.deployContract("FlightLog", [await registry.getAddress()]);
  await log.waitForDeployment();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    DroneRegistry: await registry.getAddress(),
    FlightLog: await log.getAddress(),
    admin: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  mkdirSync("deployments", { recursive: true });
  writeFileSync(`deployments/${network.name}.json`, JSON.stringify(out, null, 2) + "\n");
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
