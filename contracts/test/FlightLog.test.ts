import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const AIRFRAME = ethers.encodeBytes32String("SKY-001");
const PERMIT = ethers.id("permit-v1");
const REC0 = ethers.id("record-0");
const MODEL = ethers.id("qwen3.8-flash");
const PROMPT = ethers.id("prompt-v1");

async function setup() {
  const [admin, operator, stranger] = await ethers.getSigners();
  const registry = await ethers.deployContract("DroneRegistry");
  const log = await ethers.deployContract("FlightLog", [await registry.getAddress()]);
  const now = await time.latest();
  await registry.registerAirframe(AIRFRAME, operator.address);
  await registry.setPermit(AIRFRAME, PERMIT, now - 10, now + 3600);
  return { registry, log, admin, operator, stranger, now };
}

describe("DroneRegistry", () => {
  it("only the admin can register airframes, permits and models", async () => {
    const { registry, stranger } = await setup();
    await expect(registry.connect(stranger).registerAirframe(AIRFRAME, stranger.address)).to.be.revertedWithCustomError(registry, "NotAdmin");
    await expect(registry.connect(stranger).setPermit(AIRFRAME, PERMIT, 0, 1)).to.be.revertedWithCustomError(registry, "NotAdmin");
    await expect(registry.connect(stranger).setModelAllowlist(MODEL, PROMPT, true)).to.be.revertedWithCustomError(registry, "NotAdmin");
  });

  it("tracks the model + prompt allowlist", async () => {
    const { registry } = await setup();
    expect(await registry.isAllowedModel(MODEL, PROMPT)).to.equal(false);
    await registry.setModelAllowlist(MODEL, PROMPT, true);
    expect(await registry.isAllowedModel(MODEL, PROMPT)).to.equal(true);
  });

  it("rejects a permit for an unknown airframe or an empty window", async () => {
    const { registry } = await setup();
    await expect(registry.setPermit(ethers.encodeBytes32String("NOPE"), PERMIT, 0, 1)).to.be.revertedWithCustomError(registry, "UnknownAirframe");
    await expect(registry.setPermit(AIRFRAME, PERMIT, 5, 5)).to.be.revertedWithCustomError(registry, "BadWindow");
  });
});

describe("FlightLog", () => {
  it("opens a flight only for the operator with the current, valid permit", async () => {
    const { log, operator, stranger } = await setup();
    await expect(log.connect(stranger).openFlight(AIRFRAME, PERMIT, REC0)).to.be.revertedWithCustomError(log, "NotOperator");
    await expect(log.connect(operator).openFlight(AIRFRAME, ethers.id("other-permit"), REC0)).to.be.revertedWithCustomError(log, "PermitInvalid");
    await expect(log.connect(operator).openFlight(AIRFRAME, PERMIT, REC0)).to.emit(log, "FlightOpened");
  });

  it("refuses a flight when the permit has expired", async () => {
    const { log, operator } = await setup();
    await time.increase(7200);
    await expect(log.connect(operator).openFlight(AIRFRAME, PERMIT, REC0)).to.be.revertedWithCustomError(log, "PermitInvalid");
  });

  it("allows one open flight per airframe", async () => {
    const { log, operator } = await setup();
    await log.connect(operator).openFlight(AIRFRAME, PERMIT, REC0);
    await expect(log.connect(operator).openFlight(AIRFRAME, PERMIT, ethers.id("record-0b"))).to.be.revertedWithCustomError(log, "FlightAlreadyOpen");
  });

  it("anchors with strictly increasing seq, only by the operator", async () => {
    const { log, operator, stranger } = await setup();
    await log.connect(operator).openFlight(AIRFRAME, PERMIT, REC0);
    const id = await log.flightIdOf(AIRFRAME, REC0);
    await log.connect(operator).anchor(id, 5, ethers.id("h5"), ethers.id("root1"));
    await expect(log.connect(operator).anchor(id, 5, ethers.id("h5b"), ethers.id("root2"))).to.be.revertedWithCustomError(log, "SeqNotIncreasing");
    await expect(log.connect(stranger).anchor(id, 9, ethers.id("h9"), ethers.id("root2"))).to.be.revertedWithCustomError(log, "NotOperator");
    await log.connect(operator).anchor(id, 9, ethers.id("h9"), ethers.id("root2"));
    const anchors = await log.getAnchors(id);
    expect(anchors.map((a) => Number(a.seq))).to.deep.equal([5, 9]);
    expect(anchors[1].storageRoot).to.equal(ethers.id("root2"));
  });

  it("closes with a final anchor, then rejects further anchors and frees the airframe", async () => {
    const { log, operator } = await setup();
    await log.connect(operator).openFlight(AIRFRAME, PERMIT, REC0);
    const id = await log.flightIdOf(AIRFRAME, REC0);
    await expect(log.connect(operator).closeFlight(id, 20, ethers.id("h20"), ethers.id("rootF"))).to.emit(log, "FlightClosed");
    await expect(log.connect(operator).anchor(id, 21, ethers.id("h21"), ethers.id("x"))).to.be.revertedWithCustomError(log, "FlightNotOpen");
    expect(await log.openFlightOf(AIRFRAME)).to.equal(ethers.ZeroHash);
    const f = await log.flights(id);
    expect(f.open).to.equal(false);
    expect(f.lastSeq).to.equal(20n);
    await expect(log.connect(operator).openFlight(AIRFRAME, PERMIT, ethers.id("record-0c"))).to.emit(log, "FlightOpened");
  });
});
