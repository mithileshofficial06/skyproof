// One-time (and after any permit or prompt change): register the airframe, its signed permit
// and the allowed 0G model + prompts in DroneRegistry. Run as the admin (deployer key).
//   pnpm setup-chain
import { adminWallet, airframeKey, contracts, modelKey, operatorWallet } from "./chain.js";
import { env } from "./env.js";
import { loadPermit } from "./permit.js";
import { PROMPT_HASH, SITUATION_PROMPT_HASH } from "./zg.js";

const admin = adminWallet();
const { registry, deployment } = contracts(admin);
const { permit, permitHash } = loadPermit();
const operator = operatorWallet().address;
const af = airframeKey(permit.airframeId);
const now = Math.floor(Date.now() / 1000);

console.log(`DroneRegistry ${deployment.DroneRegistry}  admin ${admin.address}`);

async function send(label: string, p: Promise<any>) {
  const tx = await p;
  await tx.wait();
  console.log(`  ${label}: tx ${tx.hash}`);
}

const current = await registry.airframes(af);
if (current.operator.toLowerCase() !== operator.toLowerCase())
  await send(`registerAirframe ${permit.airframeId} -> operator ${operator}`, registry.registerAirframe(af, operator));
else console.log(`  airframe ${permit.airframeId} already registered to ${operator}`);

if (current.permitHash !== permitHash || Number(current.validTo) < now + 86_400)
  await send(`setPermit ${permitHash.slice(0, 18)}… valid 30 days`, registry.setPermit(af, permitHash, now - 300, now + 30 * 86_400));
else console.log(`  permit ${permitHash.slice(0, 18)}… already current`);

for (const [label, prompt] of [["decision prompt", PROMPT_HASH], ["situation prompt", SITUATION_PROMPT_HASH]] as const) {
  if (await registry.isAllowedModel(modelKey(env.visionModel), prompt)) console.log(`  ${env.visionModel} + ${label} already allowed`);
  else await send(`allow ${env.visionModel} + ${label}`, registry.setModelAllowlist(modelKey(env.visionModel), prompt, true));
}
console.log("chain setup complete");
