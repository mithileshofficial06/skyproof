"""WebSocket link from the simulated flight computer to the officer service."""
import json

from websockets.sync.client import connect


class OfficerLink:
    def __init__(self, url: str = "ws://localhost:8787"):
        self.ws = connect(url, max_size=8 * 1024 * 1024)
        self.inbox: list[dict] = []

    def send(self, msg: dict):
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
