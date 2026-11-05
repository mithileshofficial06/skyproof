"""The simulated drone: physics, autopilot (the "spinal cord"), camera, battery, wind.

The autopilot flies to whatever target it is given, instantly and locally. It never
waits for 0G. Mission-level commands are gated separately (see gate.py).
"""
import io
import base64

import numpy as np
import pybullet as p
from PIL import Image

from gym_pybullet_drones.control.DSLPIDControl import DSLPIDControl
from gym_pybullet_drones.envs.CtrlAviary import CtrlAviary
from gym_pybullet_drones.utils.enums import DroneModel, Physics

CTRL_HZ = 48
DRAIN_PER_S = 0.004       # battery fraction per second of flight
CRUISE_SPEED = 0.6        # m/s along a leg (sim scale)


class Drone:
    def __init__(self, seed: int, gui: bool = False, start=(0.0, 0.0)):
        self.rng = np.random.default_rng(seed)
        self.env = CtrlAviary(
            drone_model=DroneModel.CF2X,
            num_drones=1,
            initial_xyzs=np.array([[start[0], start[1], 0.05]]),
            physics=Physics.PYB,
            pyb_freq=240,
            ctrl_freq=CTRL_HZ,
            gui=gui,
        )
        self.obs, _ = self.env.reset(seed=seed)
        self.cid = self.env.CLIENT
        self.ctrl = DSLPIDControl(drone_model=DroneModel.CF2X)
        self.target = np.array([start[0], start[1], 0.05])
        self.battery = 1.0
        self.t = 0.0
        self.wind_ms = 0.0
        self.gust_force = np.zeros(3)
        self.payload_attached = True

    # ---- state -------------------------------------------------------------
    @property
    def pos(self) -> np.ndarray:
        return self.obs[0][0:3].copy()

    @property
    def vel(self) -> np.ndarray:
        return self.obs[0][10:13].copy()

    def state(self) -> dict:
        x, y, z = self.pos
        vx, vy, vz = self.vel
        return {
            "t": round(self.t, 2),
            "pos": [round(float(x), 3), round(float(y), 3)],
            "alt": round(float(z), 3),
            "vel": [round(float(vx), 3), round(float(vy), 3), round(float(vz), 3)],
            "battery": round(self.battery, 3),
            "windMs": round(self.wind_ms, 1),
            "payload": self.payload_attached,
        }

    # ---- control -------------------------------------------------------------
    def set_wind(self, wind_ms: float):
        """Seeded gusts: a small random horizontal force scaled by wind speed."""
        self.wind_ms = wind_ms

    def step(self, n: int = 1):
        for _ in range(n):
            if self.wind_ms > 0 and self.rng.random() < 0.05:
                ang = self.rng.uniform(0, 2 * np.pi)
                mag = 0.00012 * self.wind_ms
                self.gust_force = np.array([np.cos(ang) * mag, np.sin(ang) * mag, 0.0])
            if self.wind_ms > 0:
                p.applyExternalForce(self.env.DRONE_IDS[0], -1, self.gust_force.tolist(),
                                     self.pos.tolist(), p.WORLD_FRAME, physicsClientId=self.cid)
            action, _, _ = self.ctrl.computeControlFromState(
                control_timestep=self.env.CTRL_TIMESTEP,
                state=self.obs[0],
                target_pos=self.target,
                target_rpy=np.zeros(3),
            )
            self.obs, _, _, _, _ = self.env.step(action.reshape(1, 4))
            self.t += 1.0 / CTRL_HZ
            if self.pos[2] > 0.08:
                self.battery = max(0.0, self.battery - DRAIN_PER_S / CTRL_HZ)

    def hold(self, seconds: float, on_tick=None):
        """Hover in place (or keep flying to the current target) for `seconds`."""
        for _ in range(int(seconds * CTRL_HZ)):
            self.step()
            if on_tick:
                on_tick()

    def fly_to(self, xyz, on_tick=None, tol=0.08, timeout=30.0):
        """Fly a straight leg at cruise speed by moving the target along the line."""
        start = self.pos
        goal = np.array(xyz, dtype=float)
        dist = float(np.linalg.norm(goal - start))
        steps = max(1, int(dist / CRUISE_SPEED * CTRL_HZ))
        for i in range(1, steps + 1):
            self.target = start + (goal - start) * (i / steps)
            self.step()
            if on_tick:
                on_tick()
        self.target = goal
        elapsed = 0.0
        while np.linalg.norm(self.pos - goal) > tol and elapsed < timeout:
            self.step()
            elapsed += 1.0 / CTRL_HZ
            if on_tick:
                on_tick()
        return float(np.linalg.norm(self.pos - goal))

    def drop_payload(self):
        self.payload_attached = False

    # ---- camera --------------------------------------------------------------
    def camera_png_b64(self, look_at_xy=None, w=320, h=240) -> str:
        """A camera under the drone, tilted toward `look_at_xy` (default: straight down)."""
        x, y, z = self.pos.tolist()
        tx, ty = look_at_xy if look_at_xy is not None else (x + 0.001, y)
        view = p.computeViewMatrix([x, y, z - 0.04], [tx, ty, 0.0], [0, 0, 1] if look_at_xy is not None else [1, 0, 0],
                                   physicsClientId=self.cid)
        proj = p.computeProjectionMatrixFOV(fov=75, aspect=w / h, nearVal=0.02, farVal=30, physicsClientId=self.cid)
        _, _, rgba, _, _ = p.getCameraImage(w, h, view, proj, renderer=p.ER_TINY_RENDERER, physicsClientId=self.cid)
        rgb = np.reshape(rgba, (h, w, 4))[:, :, :3].astype(np.uint8)
        buf = io.BytesIO()
        Image.fromarray(rgb).save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()

    def close(self):
        self.env.close()
