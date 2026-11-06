import type { Metadata } from "next";
import { Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { LiveBackground } from "@/components/LiveBackground";
import { Nav } from "@/components/Nav";

// body text: Manrope (kept on the --font-geist-sans variable that components already reference); headings: Space Grotesk
const geistSans = Manrope({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkyProof · An independent black box for autonomous drones",
  description: "When a drone hurts someone, the only record belongs to the operator. SkyProof: 0G decides and records, Chainlink judges, Arc pays the victim in USDC.",
  openGraph: {
    title: "SkyProof · An independent black box for autonomous drones",
    description: "0G decides and records. Chainlink judges. Arc pays.",
    type: "website",
  },
  twitter: { card: "summary", title: "SkyProof", description: "0G decides and records. Chainlink judges. Arc pays." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${display.variable} ${geistMono.variable} cockpit min-h-screen font-sans antialiased`}>
        <LiveBackground />
        <Nav />
        <main className="mx-auto w-full max-w-[1400px] px-5 pb-20 pt-24 sm:px-8">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-xs text-[#9ea3d6]">
          SkyProof · ETHGlobal Mumbai 2026 · built on 0G, Chainlink CRE and Arc · drone model &quot;Drone&quot; by NateGazzard (CC BY 3.0)
        </footer>
      </body>
    </html>
  );
}
