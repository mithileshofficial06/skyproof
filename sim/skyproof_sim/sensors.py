"""Distance sensors: invisible beams around the drone, like a rangefinder or LiDAR.

Only objects with a collision shape are seen (buildings, the crane, signs).
"""
import math

import numpy as np
import pybullet as p

YAWS = (-0.35, 0.0, 0.35)        # rad, left / ahead / right
PITCHES = (-0.12, 0.0, 0.12)     # rad, slightly down / level / slightly up
START = 0.07                     # start outside the drone's own body


def forward_clearance(cid, drone_id, pos, direction_xy, rng=0.8):
    """Closest hit in a cone ahead of travel. Returns (distance, body_id, hit_xyz) or (rng, None, None)."""
    d = np.asarray(direction_xy, dtype=float)
    n = np.linalg.norm(d)
    if n < 1e-6:
        return rng, None, None
    heading = math.atan2(d[1], d[0])
    froms, tos = [], []
    for yaw in YAWS:
        for pitch in PITCHES:
            u = np.array([math.cos(heading + yaw) * math.cos(pitch),
                          math.sin(heading + yaw) * math.cos(pitch),
                          math.sin(pitch)])
            froms.append((pos + u * START).tolist())
            tos.append((pos + u * rng).tolist())
    best = (rng, None, None)
    for oid, _link, frac, hit, _normal in p.rayTestBatch(froms, tos, physicsClientId=cid):
        if oid < 0 or oid == drone_id:
            continue
        dist = START + frac * (rng - START)
        if dist < best[0]:
            best = (dist, oid, list(hit))
    return best
