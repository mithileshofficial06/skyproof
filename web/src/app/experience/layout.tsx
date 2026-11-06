import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "SkyProof · The black box drones can't lie to",
  description: "Scroll a real sealed drone flight, then try to tamper with it: every later fingerprint breaks against 0G Chain. Recorded on 0G, judged by Chainlink, settled on Arc.",
  openGraph: { title: "The black box drones can't lie to", description: "A real sealed flight. Try to tamper with it.", type: "website" },
};

export default function ExperienceLayout({ children }: { children: ReactNode }) {
  return children;
}
