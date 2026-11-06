import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}>
        <Nav />
        <main className="mx-auto w-full max-w-[1400px] px-5 pb-20 pt-20 sm:px-8">{children}</main>
        <footer className="border-t border-[#e3ded3] py-8 text-center text-xs text-[#8a8d93]">
          SkyProof · ETHGlobal Mumbai 2026 · built on 0G, Chainlink CRE and Arc · drone model &quot;Drone&quot; by NateGazzard (CC BY 3.0)
        </footer>
      </body>
    </html>
  );
}
