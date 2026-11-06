"use client";
// Two Truths group: the real sealed flight (from the data adapter, via the store) drawn as recorded + claimed trails
// with its hash chain, anchored on the story route (specs/05-uiux.md Section 8).
import { useMemo } from "react";
import * as THREE from "three";
import { truthsAnchor } from "@/lib/flight-curve";
import { useUI } from "@/lib/store";
import { pathPoints } from "@/lib/telemetry";
import { HashChain } from "./HashChain";
import { Trails } from "./Trails";

export function TelemetryGroup() {
  const flight = useUI((s) => s.flight);
  const curve = useMemo(() => {
    const pts = flight ? pathPoints(flight.path) : [];
    return pts.length > 1 ? new THREE.CatmullRomCurve3(pts, false, "centripetal") : null;
  }, [flight]);
  if (!flight || !curve) return null;
  return (
    <group position={truthsAnchor}>
      <Trails curve={curve} blocks={flight.blocks.length} />
      <HashChain curve={curve} count={flight.blocks.length} onPick={(i) => useUI.getState().setSelected(i)} />
    </group>
  );
}
