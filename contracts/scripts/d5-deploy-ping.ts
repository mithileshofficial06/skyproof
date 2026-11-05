import { ethers, network } from "hardhat";

// Day-0 test D5: deploy Ping to 0G Galileo and call it once.
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY missing in ../.env");
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`network ${network.name}, deployer ${deployer.address}, balance ${ethers.formatEther(bal)} 0G`);

  const ping = await ethers.deployContract("Ping");
  await ping.waitForDeployment();
  console.log(`Ping deployed at ${await ping.getAddress()}`);

  const tx = await ping.ping();
  await tx.wait();
  console.log(`ping tx ${tx.hash}, count = ${await ping.count()}`);
  console.log("D5 PASS");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
