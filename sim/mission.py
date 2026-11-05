"""Fly one delivery mission against the officer service.

Scenarios:
  normal           every mission command approved by 0G, package delivered
  people_below     a pedestrian stands in the drop zone; 0G says DENY until they walk away
  network_down     the link to 0G is cut before the drop; the drone safe-stops at a rally point
  geofence_breach  a cheating operator disables the gate and flies straight through the airport

Start the officer first (cd officer && pnpm officer), then:
  .venv/Scripts/python.exe mission.py --scenario normal [--gui]
"""
import argparse
import math
import time

from skyproof_sim.drone import CTRL_HZ, Drone
from skyproof_sim.gate import Gate, make_request
from skyproof_sim.link import OfficerLink
from skyproof_sim.world import World, load_permit

CRUISE = 1.0
APPROACH_ALT = 0.55
DECISION_TIMEOUT_S = 9.0     # one 0G call (officer times out at 8 s)
RETRY_WINDOW_S = 15.0        # keep trying this long without an ALLOW, then safe-stop
RETRY_PAUSE_S = 3.0
TELEMETRY_EVERY = CTRL_HZ // 2  # 2 Hz


class SafeStopped(Exception):
    pass


def point_in_poly(pt, poly):
    x, y = pt
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


class FlightComputer:
    def __init__(self, scenario: str, gui: bool, realtime: bool, seed: int):
        self.scenario = scenario
        self.realtime = realtime
        self.permit = load_permit()
        self.drone = Drone(seed=seed, gui=gui)
        self.world = World(self.drone.cid, self.permit)
        self.gate = Gate()
        self.link = OfficerLink()
        self.ticks = 0
        self.wall0 = time.time()
        self.events: list[str] = []
        self.drone.set_wind(3.0)

    # ---- plumbing ----------------------------------------------------------
    def say(self, text):
        print(f"[{self.drone.t:6.1f}s] {text}", flush=True)

    def tick(self):
        self.ticks += 1
        if self.ticks % TELEMETRY_EVERY == 0:
            self.link.send({"type": "telemetry", "state": self.drone.state()})
        if self.realtime:
            lag = self.drone.t - (time.time() - self.wall0)
            if lag > 0:
                time.sleep(lag)

    def hover(self, seconds):
        self.drone.hold(seconds, on_tick=self.tick)

    def fly(self, xy, alt):
        self.drone.fly_to([xy[0], xy[1], alt], on_tick=self.tick)

    # ---- asking the officer ------------------------------------------------
    def ask(self, cmd: dict, look_at=None) -> tuple[str, str, float, dict | None]:
        people = None
        if cmd["type"] in ("DROP", "LAND"):
            people = self.world.people_within(cmd["to"], 0.4)
        nonce, body, req_hash = make_request(cmd, self.drone.state(), people)
        frame = self.drone.camera_png_b64(look_at_xy=look_at) if look_at is not None else None
        sent = time.time()
        self.link.send({"type": "request", "body": body, "frame": frame})
        decision = None
        while time.time() - sent < DECISION_TIMEOUT_S and decision is None:
            self.drone.step()  # keep hovering while 0G thinks: the autopilot never waits
            self.tick()
            for m in self.link.poll(0.005):
                if m.get("type") == "decision" and m.get("nonce") == nonce:
                    decision = m
        return nonce, req_hash, sent, decision

    def command(self, cmd: dict, look_at=None) -> dict:
        """Get an ALLOW for `cmd` or safe-stop. Returns the approving decision."""
        start = self.drone.t  # sim seconds: the drone hovers in sim time while it waits
        while True:
            nonce, req_hash, sent, d = self.ask(cmd, look_at)
            ok, why = self.gate.permits(nonce, req_hash, sent, d)
            src = f"[{d['source']}] {d.get('zgRequestId') or ''}" if d else ""
            self.say(f"{cmd['type']:7s} -> {why:24s} {src} {d['reason'] if d else ''}")
            if ok:
                self.link.send({"type": "action", "cmd": cmd, "decisionHash": d["decisionHash"], "state": self.drone.state()})
                return d
            if d and d["verdict"] == "DENY" and d["code"] not in ("PEOPLE_BELOW", "UNCERTAIN"):
                raise SafeStopped(f"{cmd['type']} refused: {d['code']}")
            if d and d["code"] == "PEOPLE_BELOW":
                self.on_people_denied()
            if self.drone.t - start > RETRY_WINDOW_S:
                raise SafeStopped(f"no ALLOW for {cmd['type']} within {RETRY_WINDOW_S:.0f} s")
            self.hover(RETRY_PAUSE_S)

    # ---- scenario hooks ----------------------------------------------------
    def on_people_denied(self):
        if self.scenario == "people_below" and self.world.pedestrians and "walked" not in self.events:
            self.events.append("walked")
            self.say("pedestrian sees the drone and walks away")
            self.world.clear_pedestrians()

    # ---- the safe stop (no 0G involved, logged honestly) -------------------
    def safe_stop(self, why: str):
        self.link.send({"type": "safe_stop", "step": "HOLD_EXPIRED", "detail": why})
        here = self.drone.pos[:2]
        best = None
        for name, rp in self.permit["rallyPoints"].items():
            steps = 40
            path = [(here[0] + (rp[0] - here[0]) * i / steps, here[1] + (rp[1] - here[1]) * i / steps) for i in range(steps + 1)]
            if any(point_in_poly(p, nf["polygon"]) for nf in self.permit["noFly"] for p in path):
                continue
            d = math.dist(here, rp)
            if best is None or d < best[1]:
                best = (name, d, rp)
        if best is None:
            self.link.send({"type": "safe_stop", "step": "LAND_IN_PLACE", "detail": "no reachable rally point"})
            self.hover(2.0)
            self.fly(here, 0.05)
            return
        name, _, rp = best
        self.link.send({"type": "safe_stop", "step": "DIVERT", "detail": f"to rally point {name} {rp}"})
        self.say(f"SAFE STOP: diverting to rally point {name} (no 0G decision claimed)")
        self.fly(rp, max(self.drone.pos[2], 0.6))
        self.link.send({"type": "safe_stop", "step": "LAND", "detail": f"landing at {name}"})
        self.fly(rp, 0.05)
        self.hover(1.0)

    # ---- missions ----------------------------------------------------------
    def run(self):
        hello = (self.link.send({"type": "hello", "scenario": self.scenario}), self.link.wait_for("hello"))[1]
        self.say(f"flight {hello['flightId']} opened, permit {hello['permitHash'][:18]}...")
        home = self.permit["rallyPoints"]["HOME"]
        corner = self.permit["rallyPoints"]["R2"]
        dz = self.permit["dropZones"]["DZ-1"]
        approach = [dz[0], dz[1] - 0.55]

        if self.scenario == "geofence_breach":
            return self.run_cheat(home, approach, dz)

        try:
            self.command({"type": "TAKEOFF", "from": home, "to": home, "alt": CRUISE}, look_at=None)
            self.fly(home, CRUISE)
            self.command({"type": "REROUTE", "from": home, "to": corner, "alt": CRUISE})
            self.fly(corner, CRUISE)
            self.command({"type": "REROUTE", "from": corner, "to": approach, "alt": APPROACH_ALT})
            self.fly(approach, APPROACH_ALT)

            if self.scenario == "people_below":
                self.world.add_pedestrian(tuple(dz))
                self.say("a pedestrian is standing in the drop zone")
            if self.scenario == "network_down":
                self.link.send({"type": "control", "network": "down"})
                self.say("** link to 0G cut **")

            self.command({"type": "DROP", "from": approach, "to": dz, "alt": APPROACH_ALT, "zone": "DZ-1"}, look_at=dz)
            self.drone.drop_payload()
            self.hover(1.0)
            self.say("package delivered")
            self.command({"type": "REROUTE", "from": approach, "to": corner, "alt": CRUISE})
            self.fly(corner, CRUISE)
            self.command({"type": "REROUTE", "from": corner, "to": home, "alt": CRUISE})
            self.fly(home, CRUISE)
            self.command({"type": "LAND", "from": home, "to": home, "alt": 0.0}, look_at=home)
            self.fly(home, 0.05)
            self.hover(1.0)
            self.say("landed at HOME")
        except SafeStopped as e:
            self.say(f"SAFE STOP triggered: {e}")
            self.safe_stop(str(e))
            self.say("landed safely at a rally point")

    def run_cheat(self, home, approach, dz):
        """The operator disables the gate and takes a shortcut through the airport.
        The flight recorder is untouched, so every position still lands in the record."""
        self.gate.enabled = False
        self.world.add_pedestrian(tuple(dz))
        self.say("operator disabled the gate; flying a shortcut with no approvals")
        for cmd, fly in [
            ({"type": "TAKEOFF", "from": home, "to": home, "alt": CRUISE}, lambda: self.fly(home, CRUISE)),
            ({"type": "REROUTE", "from": home, "to": approach, "alt": APPROACH_ALT}, lambda: self.fly(approach, APPROACH_ALT)),
            ({"type": "DROP", "from": approach, "to": dz, "alt": APPROACH_ALT, "zone": "DZ-1"}, lambda: (self.drone.drop_payload(), self.hover(1.0))),
            ({"type": "REROUTE", "from": approach, "to": home, "alt": CRUISE}, lambda: self.fly(home, CRUISE)),
            ({"type": "LAND", "from": home, "to": home, "alt": 0.0}, lambda: (self.fly(home, 0.05), self.hover(1.0))),
        ]:
            self.link.send({"type": "action", "cmd": cmd, "decisionHash": None, "state": self.drone.state()})
            self.say(f"{cmd['type']:7s} executed WITHOUT approval")
            fly()
        self.say("package dropped onto a pedestrian; operator landed at HOME")

    def close(self):
        self.link.send({"type": "close", "state": self.drone.state()})
        closed = self.link.wait_for("closed", timeout=20)
        self.say(f"record closed: {closed['records']} records, head {closed['head'][:18]}...")
        self.say(f"record file: {closed['file']}")
        self.link.close()
        self.drone.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", default="normal", choices=["normal", "people_below", "network_down", "geofence_breach"])
    ap.add_argument("--gui", action="store_true", help="open the PyBullet 3D window")
    ap.add_argument("--realtime", action="store_true", help="pace the sim to wall-clock time (on by default with --gui)")
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    fc = FlightComputer(a.scenario, a.gui, a.realtime or a.gui, a.seed)
    try:
        fc.run()
    finally:
        fc.close()


if __name__ == "__main__":
    main()
