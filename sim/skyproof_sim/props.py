"""Scenario props: a construction crane, printed signs and ground labels."""
from pathlib import Path

import pybullet as p
from PIL import Image, ImageDraw, ImageFont

TEX_DIR = Path(__file__).resolve().parents[1] / "results" / "textures"


def _texture(name: str, lines: list[str], size=(512, 320), bg=(255, 255, 255), fg=(200, 20, 20)) -> str:
    TEX_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=int(size[1] / (len(lines) + 1)))
    y = size[1] / (len(lines) + 1) * 0.5
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text(((size[0] - w) / 2, y), line, fill=fg, font=font)
        y += size[1] / (len(lines) + 1)
    path = TEX_DIR / f"{name}.png"
    img.save(path)
    return str(path)


def _box(cid, center, half, rgba, collide=True):
    vis = p.createVisualShape(p.GEOM_BOX, halfExtents=half, rgbaColor=rgba, physicsClientId=cid)
    col = p.createCollisionShape(p.GEOM_BOX, halfExtents=half, physicsClientId=cid) if collide else -1
    return p.createMultiBody(0, col, vis, center, physicsClientId=cid)


def add_crane(cid, tower_xy, boom_end_x, boom_z):
    """A tower crane: yellow tower plus a horizontal boom crossing the route (the Tolleson case)."""
    yellow = [0.95, 0.75, 0.05, 1]
    tx, ty = tower_xy
    tower = _box(cid, [tx, ty, (boom_z + 0.3) / 2], [0.05, 0.05, (boom_z + 0.3) / 2], yellow)
    half_len = abs(boom_end_x - tx) / 2
    boom = _box(cid, [(tx + boom_end_x) / 2, ty, boom_z], [half_len, 0.05, 0.2], yellow)
    return [tower, boom]


def add_sign(cid, xy, lines, z=0.25, facing_y=-1):
    """An upright printed sign facing the approaching drone (the CHAI attack)."""
    tex = p.loadTexture(_texture("sign", lines), physicsClientId=cid)
    body = _box(cid, [xy[0], xy[1], z], [0.17, 0.004, 0.11], [1, 1, 1, 1])
    p.changeVisualShape(body, -1, textureUniqueId=tex, physicsClientId=cid)
    vis = p.createVisualShape(p.GEOM_CYLINDER, radius=0.008, length=z, rgbaColor=[0.3, 0.3, 0.3, 1], physicsClientId=cid)
    p.createMultiBody(0, -1, vis, [xy[0], xy[1] + 0.01 * facing_y, z / 2 - 0.05], physicsClientId=cid)
    return body


def add_ground_label(cid, xy, letter, half=0.08):
    """A flat tile with a big letter so the camera (and 0G) can name the spot."""
    tex = p.loadTexture(_texture(f"spot_{letter}", [letter], size=(256, 256), bg=(250, 250, 250), fg=(20, 20, 20)),
                        physicsClientId=cid)
    body = _box(cid, [xy[0], xy[1], 0.003], [half, half, 0.001], [1, 1, 1, 1], collide=False)
    p.changeVisualShape(body, -1, textureUniqueId=tex, physicsClientId=cid)
    return body
