"""WebSocket link from the simulated flight computer to the officer service."""
import json
import os
from pathlib import Path

from websockets.sync.client import connect

# The officer only accepts a drone that presents this run's token: passed in by the officer when it starts the
# simulator, or read from officer/.tmp/drone.token when the simulator is started by hand on the same machine.
_TOKEN_FILE = Path(__file__).resolve().parents[2] / "officer" / ".tmp" / "drone.token"


def _drone_token() -> str:
    t = os.environ.get("SKYPROOF_DRONE_TOKEN", "").strip()
    if not t and _TOKEN_FILE.exists():
        t = _TOKEN_FILE.read_text(encoding="utf-8").strip()
    return t


class OfficerLink:
    def __init__(self, url: str | None = None):
        self.ws = connect(url or os.environ.get("SKYPROOF_OFFICER_URL", "ws://localhost:8787"), max_size=8 * 1024 * 1024)
        self.inbox: list[dict] = []

    def send(self, msg: dict):
        if msg.get("type") == "hello":
            msg = {**msg, "token": _drone_token()}
        self.ws.send(json.dumps(msg))

    def poll(self, timeout: float = 0.0) -> list[dict]:
        """Collect any messages that have arrived, waiting at most `timeout` seconds."""
        try:
            while True:
                self.inbox.append(json.loads(self.ws.recv(timeout=timeout)))
                timeout = 0.0
        except TimeoutError:
            pass
        out, self.inbox = self.inbox, []
        return out

    def wait_for(self, msg_type: str, timeout: float = 10.0) -> dict:
        msg = json.loads(self.ws.recv(timeout=timeout))
        while msg.get("type") != msg_type:
            self.inbox.append(msg)
            msg = json.loads(self.ws.recv(timeout=timeout))
        return msg

    def close(self):
        self.ws.close()
