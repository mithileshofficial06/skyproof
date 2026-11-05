"""The permission gate inside the flight computer.

A mission command (TAKEOFF, REROUTE, DROP, LAND) runs only if the officer returned
an ALLOW for exactly this request: same nonce, same request hash, and fresh.
Everything else (DENY, NO_DECISION, stale, mismatched) means: do not execute.
"""
import hashlib
import json
import time
import uuid

FRESH_S = 10.0


def make_request(cmd: dict, state: dict, people_in_zone: int | None = None) -> tuple[str, str, str]:
    """Return (nonce, body, request_hash). `body` is the exact string the officer hashes."""
    nonce = uuid.uuid4().hex[:16]
    req = {"nonce": nonce, "cmd": cmd, "state": state}
    if people_in_zone is not None:
        req["peopleInZone"] = people_in_zone
    body = json.dumps(req, sort_keys=True, separators=(",", ":"))
    return nonce, body, "0x" + hashlib.sha256(body.encode()).hexdigest()


class Gate:
    def __init__(self):
        self.used_nonces: set[str] = set()
        self.enabled = True  # a cheating operator can disable it; the recorder still sees everything

    def permits(self, nonce: str, request_hash: str, sent_at: float, decision: dict | None) -> tuple[bool, str]:
        if decision is None:
            return False, "no decision"
        if decision.get("nonce") != nonce:
            return False, "decision is for a different request"
        if decision.get("requestHash") != request_hash:
            return False, "request hash mismatch"
        if time.time() - sent_at > FRESH_S:
            return False, "decision is stale"
        if nonce in self.used_nonces:
            return False, "decision already used"
        if decision.get("verdict") != "ALLOW":
            return False, f"{decision.get('verdict')} {decision.get('code')}"
        self.used_nonces.add(nonce)
        return True, "ALLOW"


def make_situation(kind: str, detail: str, options: list[dict], state: dict) -> tuple[str, str, str]:
    """Like make_request, for an in-flight situation with a menu of options."""
    nonce = uuid.uuid4().hex[:16]
    req = {"nonce": nonce, "situation": {"kind": kind, "detail": detail, "options": options}, "state": state}
    body = json.dumps(req, sort_keys=True, separators=(",", ":"))
    return nonce, body, "0x" + hashlib.sha256(body.encode()).hexdigest()
