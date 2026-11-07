// Site copy for the ozky-style UI. Edit text here; components read from these structures.
export type SubLink = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: SubLink[] };

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Report a problem", href: "/claim" },
  { label: "Track my claim", href: "/track" },
  { label: "For insurers", href: "/insurer" },
  {
    label: "For operators",
    href: "/operator",
    children: [
      { label: "Live flight", href: "/live" },
      { label: "Past flights", href: "/flights" },
      { label: "Check a record", href: "/#check" },
      { label: "3D story", href: "/experience" },
    ],
  },
];

export const links = {
  github: "https://github.com/mithileshofficial06/skyproof",
  docs: "https://github.com/mithileshofficial06/skyproof/tree/main/docs",
  arcStudio: "https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm",
};

export const footer = {
  tagline: ["0G decides.", "Chainlink judges.", "Arc pays."],
  address: ["SkyProof", "ETHGlobal Mumbai 2026", "0G Galileo · Arc Testnet"],
  links: [
    { label: "GitHub", href: links.github },
    { label: "Docs", href: links.docs },
    { label: "Arc Studio", href: links.arcStudio },
  ],
  legal: [
    { label: "©2026 SkyProof" },
    { label: 'Drone model "Drone" by NateGazzard (CC BY 3.0)', href: "https://poly.pizza/m/DNbUoMtG3H" },
    { label: "Sponsor logos are trademarks of their owners" },
  ] as { label: string; href?: string }[],
};

export const lander = {
  titleTop: "Sky",
  titleBottom: "Proof",
  subhead: "An independent black box for autonomous drones",
  tagline: "When an autonomous drone hurts someone, the only record belongs to the operator. SkyProof changes who holds the truth. Shown here on a delivery drone.",
  status: [
    "0G vision model · TEE",
    "Sealed channel · TDX",
    "Safety gate · 10 s",
    "Signed record chain",
    "0G Storage · encrypted",
    "0G Chain · anchors",
    "Chainlink CRE judge",
    "Open-Meteo wind",
    "Arc escrow · USDC",
    "Safe stop · no fakes",
  ],
  feats: [
    { tag: "0G / Decide", title: "Every move is approved by an AI running on 0G", body: "A vision model in a TEE says ALLOW or DENY before each take-off, drop and landing. No answer means a safe stop." },
    { tag: "0G / Record", title: "A black box nobody can quietly edit", body: "Signed, hash-chained records are encrypted to 0G Storage every 15 s and fingerprinted on 0G Chain." },
    { tag: "Chainlink + Arc / Pay", title: "Broken rule? The victim is paid automatically", body: "Chainlink CRE checks the record against six rules; the Arc escrow pays USDC from the operator's bond." },
  ],
  exploreLabel: "Watch a drone decide, live.",
  exploreHref: "/live",
};

export type RoleCard = { title: string; body: string; href: string; cta: string; graphic: "tetra" | "globe" | "halftone" | "starburst" };
export const roles = {
  heading: "One black box. Everyone who needs the truth.",
  cards: [
    { title: "I was affected by a drone", body: "A drone or its package hurt you or damaged your things. Tell us what happened; we check the drone's sealed black box.", href: "/claim", cta: "Report a problem", graphic: "starburst" },
    { title: "Track my claim", body: "Type your claim number and follow every step in plain words: received, checked, decided, paid.", href: "/track", cta: "Track a claim", graphic: "halftone" },
    { title: "I review claims", body: "See the claims that need a person, with the drone's record and the complaint side by side. Approve or reject with a reason.", href: "/insurer", cta: "Open the inbox", graphic: "globe" },
    { title: "I run drones", body: "Start a live flight, open the black box of past flights, and replay them in 3D.", href: "/operator", cta: "Operator tools", graphic: "tetra" },
    { title: "Check a record yourself", body: "Your browser re-checks a sealed flight against 0G Chain. Change one line and it fails.", href: "/#check", cta: "Run the check", graphic: "halftone" },
    { title: "The 3D story", body: "A guided walk-through of SkyProof from take-off to payout.", href: "/experience", cta: "Start the story", graphic: "globe" },
  ] as RoleCard[],
};

export const integrates = {
  title: "Every step, proven on-chain.",
  blurb: "Each part of SkyProof runs on a sponsor network you can check yourself: the decision on 0G, the record on 0G Storage and Chain, the verdict on Chainlink CRE, the money on Arc.",
  items: [
    { title: "0G Private Computer", sub: "TEE vision decisions", href: "/live" },
    { title: "0G Storage", sub: "Encrypted black box", href: "/flights" },
    { title: "0G Chain", sub: "Fingerprints + permit", href: "/#check" },
    { title: "Safe stop", sub: "No 0G answer, no action", href: "/flights" },
    { title: "Chainlink CRE", sub: "Six-rule judge", href: "/track?id=10" },
    { title: "Open-Meteo", sub: "Independent wind check", href: "/track?id=10" },
    { title: "Arc escrow", sub: "Built in Arc Studio", href: "https://studio.arc.io/share/sky-proof-escrow-contract-tzqdmj9nlm" },
    { title: "Insurer desk", sub: "Human review + reason", href: "/insurer" },
    { title: "Report a problem", sub: "Three short steps", href: "/claim" },
    { title: "All docs", sub: "Read on GitHub ↗", href: "https://github.com/mithileshofficial06/skyproof/tree/main/docs" },
  ],
};

export const cta = { lead: "Ready to see a drone", emphasis: "decide in a TEE?", primary: { label: "Watch a live flight", href: "/live" }, secondary: { label: "Report a problem", href: "/claim" } };
