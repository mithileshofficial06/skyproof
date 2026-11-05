"""Day-0 test D3: fly a simulated drone and grab a downward camera frame.

Pass: the drone takes off, flies to a waypoint and lands near it, and a
320x240 PNG is saved to sim/results/.
Run: .venv/Scripts/python.exe d3_flight_test.py
"""
from pathlib import Path

import numpy as np
import pybullet as p
from PIL import Image

from gym_pybullet_drones.control.DSLPIDControl import DSLPIDControl
from gym_pybullet_drones.envs.CtrlAviary import CtrlAviary
from gym_pybullet_drones.utils.enums import DroneModel, Physics

SEED = 42
CTRL_HZ = 48
RESULTS = Path(__file__).parent / "results"


def downward_frame(env, pos, w=320, h=240):
    """Render what a camera under the drone would see."""
    view = p.computeViewMatrix(
        cameraEyePosition=pos,
        cameraTargetPosition=[pos[0], pos[1], 0.0],
        cameraUpVector=[1, 0, 0],
        physicsClientId=env.CLIENT,
    )
    proj = p.computeProjectionMatrixFOV(
        fov=70, aspect=w / h, nearVal=0.05, farVal=20, physicsClientId=env.CLIENT
    )
    _, _, rgba, _, _ = p.getCameraImage(
        w, h, view, proj, renderer=p.ER_TINY_RENDERER, physicsClientId=env.CLIENT
    )
    return np.reshape(rgba, (h, w, 4))[:, :, :3].astype(np.uint8)


def main():
    env = CtrlAviary(
        drone_model=DroneModel.CF2X,
        num_drones=1,
        initial_xyzs=np.array([[0.0, 0.0, 0.1]]),
        physics=Physics.PYB,
        pyb_freq=240,
        ctrl_freq=CTRL_HZ,
        gui=False,
    )
    obs, _ = env.reset(seed=SEED)
    ctrl = DSLPIDControl(drone_model=DroneModel.CF2X)

    # A placeholder "pedestrian" in the drop zone, so the camera has something to see.
    p.loadURDF("cube.urdf", [1.0, 1.0, 0.1], globalScaling=0.2, physicsClientId=env.CLIENT)

    # Takeoff -> cruise to the drop zone -> descend
    legs = [([0.0, 0.0, 1.0], 3.0), ([1.0, 1.0, 1.0], 4.0), ([1.0, 1.0, 0.3], 3.0)]
    frame = None
    for target, seconds in legs:
        for _ in range(int(seconds * CTRL_HZ)):
            action, _, _ = ctrl.computeControlFromState(
                control_timestep=env.CTRL_TIMESTEP,
                state=obs[0],
                target_pos=np.array(target),
                target_rpy=np.zeros(3),
            )
            obs, _, _, _, _ = env.step(action.reshape(1, 4))
        pos = obs[0][0:3]
        print(f"reached target {target} -> drone at {np.round(pos, 3).tolist()}")
        if target == [1.0, 1.0, 1.0]:
            frame = downward_frame(env, pos.tolist())

    env.close()

    err = np.linalg.norm(obs[0][0:3] - np.array([1.0, 1.0, 0.3]))
    RESULTS.mkdir(exist_ok=True)
    out = RESULTS / "d3_drop_zone_frame.png"
    Image.fromarray(frame).save(out)
    print(f"final position error: {err:.3f} m")
    print(f"camera frame: {frame.shape[1]}x{frame.shape[0]} saved to {out}")
    print("D3 PASS" if err < 0.15 else "D3 FAIL")


if __name__ == "__main__":
    main()
