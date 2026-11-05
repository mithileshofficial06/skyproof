"""The simulated city block: ground, buildings, no-fly zone, drop zone, pedestrians.

Everything is 1:50 scale so the Crazyflie model flies it naturally
(1 sim metre ~ 50 real metres). The layout comes from scenarios/permit.json.
"""
import json
from pathlib import Path

import pybullet as p

PERMIT_PATH = Path(__file__).resolve().parents[2] / "scenarios" / "permit.json"


def load_permit() -> dict:
    return json.loads(PERMIT_PATH.read_text())


def _box(cid, center, half, rgba, collide=True):
    vis = p.createVisualShape(p.GEOM_BOX, halfExtents=half, rgbaColor=rgba, physicsClientId=cid)
    col = p.createCollisionShape(p.GEOM_BOX, halfExtents=half, physicsClientId=cid) if collide else -1
    return p.createMultiBody(0, col, vis, center, physicsClientId=cid)


def _ground_patch(cid, polygon, rgba, z=0.001):
    xs = [pt[0] for pt in polygon]
    ys = [pt[1] for pt in polygon]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    half = [(max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2, 0.001]
    return _box(cid, [cx, cy, z], half, rgba, collide=False)


class Pedestrian:
    """A simple person figure built from primitives (shirt, trousers, head, arms)."""

    SKIN = [0.87, 0.67, 0.53, 1]
    SHIRT = [0.85, 0.15, 0.15, 1]
    PANTS = [0.15, 0.2, 0.45, 1]

    def __init__(self, cid, xy):
        self.cid = cid
        self.parts = []
        x, y = xy
        s = 0.32  # scale: person ~0.58 m tall so the camera can resolve them
        specs = [
            # (shape, dims, offset z, rgba, offset x/y)
            (p.GEOM_CYLINDER, (0.07 * s, 0.85 * s), 0.425 * s, self.PANTS, (0, -0.1 * s)),
            (p.GEOM_CYLINDER, (0.07 * s, 0.85 * s), 0.425 * s, self.PANTS, (0, 0.1 * s)),
            (p.GEOM_BOX, (0.12 * s, 0.22 * s, 0.32 * s), 1.17 * s, self.SHIRT, (0, 0)),
            (p.GEOM_CYLINDER, (0.05 * s, 0.6 * s), 1.15 * s, self.SHIRT, (0, -0.29 * s)),
            (p.GEOM_CYLINDER, (0.05 * s, 0.6 * s), 1.15 * s, self.SHIRT, (0, 0.29 * s)),
            (p.GEOM_SPHERE, (0.13 * s,), 1.62 * s, self.SKIN, (0, 0)),
        ]
        for shape, dims, z, rgba, (dx, dy) in specs:
            if shape == p.GEOM_CYLINDER:
                vis = p.createVisualShape(shape, radius=dims[0], length=dims[1], rgbaColor=rgba, physicsClientId=cid)
            elif shape == p.GEOM_SPHERE:
                vis = p.createVisualShape(shape, radius=dims[0], rgbaColor=rgba, physicsClientId=cid)
            else:
                vis = p.createVisualShape(shape, halfExtents=dims, rgbaColor=rgba, physicsClientId=cid)
            self.parts.append(p.createMultiBody(0, -1, vis, [x + dx, y + dy, z], physicsClientId=cid))
        self.xy = (x, y)

    def remove(self):
        for b in self.parts:
            p.removeBody(b, physicsClientId=self.cid)
        self.parts = []


class World:
    def __init__(self, cid, permit: dict):
        self.cid = cid
        self.permit = permit
        self.pedestrians: list[Pedestrian] = []
        # Grass inside the geofence, grey no-fly zone, yellow drop pad, blue rally pads
        _ground_patch(cid, permit["geofence"], [0.55, 0.7, 0.45, 1], z=0.0005)
        for nf in permit["noFly"]:
            _ground_patch(cid, nf["polygon"], [0.55, 0.55, 0.58, 1], z=0.001)
            xs = [pt[0] for pt in nf["polygon"]]
            ys = [pt[1] for pt in nf["polygon"]]
            # control tower in the middle of the airport
            _box(cid, [(min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 0.3], [0.08, 0.08, 0.3], [0.9, 0.9, 0.9, 1])
        for name, (x, y) in permit["dropZones"].items():
            _box(cid, [x, y, 0.0015], [0.25, 0.25, 0.001], [0.95, 0.8, 0.1, 1], collide=False)
        for name, (x, y) in permit["rallyPoints"].items():
            _box(cid, [x, y, 0.0015], [0.12, 0.12, 0.001], [0.2, 0.45, 0.95, 1], collide=False)
        # A few buildings outside the flight corridor
        for c, h in [((0.9, 3.6), 0.35), ((4.2, 1.6), 0.45), ((-0.2, 2.0), 0.25)]:
            _box(cid, [c[0], c[1], h], [0.2, 0.2, h], [0.75, 0.68, 0.6, 1])

    def add_pedestrian(self, xy) -> Pedestrian:
        ped = Pedestrian(self.cid, xy)
        self.pedestrians.append(ped)
        return ped

    def clear_pedestrians(self):
        for ped in self.pedestrians:
            ped.remove()
        self.pedestrians = []

    def people_within(self, xy, radius: float) -> int:
        return sum(1 for ped in self.pedestrians
                   if (ped.xy[0] - xy[0]) ** 2 + (ped.xy[1] - xy[1]) ** 2 <= radius ** 2)
