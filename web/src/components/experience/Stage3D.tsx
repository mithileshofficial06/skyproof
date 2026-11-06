"use client";
// Mounts the 3D scene behind the page: lazy-loaded (no SSR), with a branded loader showing real progress,
// an error boundary, and a still poster when WebGL is unavailable.
import { useProgress } from "@react-three/drei";
import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useState } from "react";
import { hasWebGL, initialQuality } from "@/lib/quality";
import { useUI } from "@/lib/store";

const Scene = dynamic(() => import("@/components/canvas/Scene"), { ssr: false });

function Poster({ reason }: { reason: string }) {
  return (
    <div className="absolute inset-0 bg-x-bg">
      <div className="absolute inset-x-0 top-1/2 mx-auto h-px max-w-xl bg-x-cyan/30" />
      <p className="absolute bottom-6 right-6 font-mono text-[11px] text-x-muted">{reason}</p>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Poster reason="3D view unavailable · every section works without it" /> : this.props.children;
  }
}

function Loader() {
  const { active, progress } = useProgress();
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (active) return;
    const t = setTimeout(() => setGone(true), 500);
    return () => clearTimeout(t);
  }, [active]);
  if (gone) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 grid place-items-center bg-x-bg transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}>
      <div className="w-56 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-x-cyan">SkyProof · black box</div>
        <div className="mt-3 h-px overflow-hidden bg-x-border">
          <div className="h-full bg-x-cyan transition-[width] duration-300" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <div className="mt-2 font-mono text-[11px] text-x-muted">{Math.round(progress)}%</div>
      </div>
    </div>
  );
}

export function Stage3D() {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => {
    useUI.getState().setQuality(initialQuality());
    setGl(hasWebGL());
  }, []);
  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      {gl === false ? (
        <Poster reason="WebGL is off in this browser · every section works without it" />
      ) : gl ? (
        <Boundary>
          <Scene />
          <Loader />
        </Boundary>
      ) : null}
    </div>
  );
}
