import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkyProof · An independent black box for autonomous drones",
  description: "0G decides and records. Chainlink judges. Arc pays. Every drone decision is made by 0G AI, sealed on 0G Storage and 0G Chain, judged by Chainlink CRE and settled in USDC on Arc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}>
        <Nav />
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-20 sm:px-6">{children}</main>
        <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
          SkyProof · ETHGlobal Mumbai 2026 · 0G · Arc · Chainlink CRE · Drone model &quot;Drone&quot; by NateGazzard (CC BY 3.0, poly.pizza)
        </footer>
      </body>
    </html>
  );
}
