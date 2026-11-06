import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import "./oz-theme.css";
import { Shell } from "@/components/oz/Shell";

// ozky type system: Inter for display + body (kept on the variables components already reference), Space Mono for captions
const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Inter({ variable: "--font-display", subsets: ["latin"] });
const mono = Space_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "700"] });

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
      <body className={`${inter.variable} ${display.variable} ${mono.variable} oz cockpit min-h-screen font-sans antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
