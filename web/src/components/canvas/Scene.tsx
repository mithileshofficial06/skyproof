"use client";
// The /experience canvas shell (specs/05-uiux.md 7.9): fixed, full-viewport, near-black with fog,
// generated studio lighting, selective bloom on the HDR-bright parts, quality tiers that step down on slow GPUs.
import { Environment, Grid, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense } from "react";
import { step } from "@/lib/quality";
import { useUI } from "@/lib/store";
import { X } from "@/lib/tokens";
import { Color } from "three";

const CYAN_HDR = new Color(X.cyan).multiplyScalar(2.2); // > 1 so only this glows (6.14)

function Stage() {
  // placeholder stage until the drone (UI-3) and flight rig (UI-4) arrive
  return (
    <group>
      <Grid infiniteGrid position={[0, -1.6, 0]} cellSize={1} cellThickness={0.6} cellColor={X.gridSub} sectionSize={6} sectionThickness={1} sectionColor={X.grid} fadeDistance={70} fadeStrength={1.6} followCamera />
      <mesh position={[0, 0.4, -7]} rotation-x={0.25}>
        <torusGeometry args={[1.1, 0.025, 16, 160]} />
        <meshBasicMaterial color={CYAN_HDR} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  const quality = useUI((s) => s.quality);
  const setQuality = useUI((s) => s.setQuality);
  return (
    <Canvas
      dpr={quality === "low" ? 1 : [1, 1.75]}
      // without post-processing (low tier) the browser's own MSAA does the anti-aliasing
      gl={{ antialias: useUI.getState().quality === "low", powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 42, near: 0.1, far: 400, position: [0, 0.9, 6] }}
      aria-label="Decorative 3D scene; all information is available in the text sections"
    >
      <PerformanceMonitor onDecline={() => setQuality(step(useUI.getState().quality))} />
      <color attach="background" args={[X.bg]} />
      <fog attach="fog" args={[X.bg, 18, 90]} />
      <Environment resolution={128} frames={1} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={1.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.8} color={X.cyan} position={[-6, 2, 3]} scale={[4, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[6, 1, -4]} scale={[4, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <Suspense fallback={null}>
        <Stage />
      </Suspense>
      {quality !== "low" && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
          <Bloom intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
