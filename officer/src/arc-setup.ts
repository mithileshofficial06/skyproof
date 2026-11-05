// One-time Arc setup (re-runnable): register the airframe with a payout cap, bind the operator
// BEFORE any deposit (so nobody else can claim the airframe by depositing first), and lock the bond.
//   pnpm arc-setup
import { ethers } from "ethers";
import { airframeKey } from "./chain.js";
import { arcOperator, arcOwner, ensureAllowance, escrow, escrowAddress, send, usd } from "./arc.js";
import { loadPermit } from "./permit.js";

const CAP = ethers.parseUnits(process.env.ARC_CAP_USDC || "5", 6);
const BOND = ethers.parseUnits(process.env.ARC_BOND_USDC || "10", 6);

const { permit } = loadPermit();
const af = airframeKey(permit.airframeId);
const owner = arcOwner();
const op = arcOperator();
const e = escrow(owner);
console.log(`SkyProofEscrow ${escrowAddress}  owner ${await e.owner()}  insurer ${await e.insurer()}`);

let a = await e.airframes(af);
if (a.cap !== CAP) await send(`registerAirframe ${permit.airframeId} cap ${usd(CAP)}`, e.registerAirframe(af, CAP));
else console.log(`  ${permit.airframeId} already registered, cap ${usd(a.cap)}`);

a = await e.airframes(af);
if (a.operator === ethers.ZeroAddress && a.bond === 0n) await send(`setAirframeOperator -> ${op.address}`, e.setAirframeOperator(af, op.address));
else if (a.operator.toLowerCase() !== op.address.toLowerCase()) throw new Error(`airframe is bound to ${a.operator}, not the operator in .env`);
else console.log(`  operator already ${a.operator}`);

a = await e.airframes(af);
if (a.bond < BOND) {
  const top = BOND - a.bond;
  await ensureAllowance(op, top);
  await send(`operator depositBond ${usd(top)}`, escrow(op).depositBond(af, top));
} else console.log(`  bond already ${usd(a.bond)}`);

a = await e.airframes(af);
console.log(`airframe ${permit.airframeId}: cap ${usd(a.cap)}, bond ${usd(a.bond)}, operator ${a.operator}, active ${await e.isActive(af)}`);
