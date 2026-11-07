// Animated hero: an autonomous drone (a delivery drone in the demo) crosses a city map; each stage of SkyProof appears as it happens.
const ROUTE = "M 70 330 C 150 330, 170 250, 250 240 S 380 180, 430 120 S 520 70, 560 90";

const STAMPS: { x: number; y: number; delay: number; tone: string; title: string; sub: string }[] = [
  { x: 120, y: 268, delay: 0.5, tone: "#0f766e", title: "0G · ALLOW take-off", sub: "request 0a7d…e21b" },
  { x: 250, y: 168, delay: 2.6, tone: "#b91c1c", title: "Shortcut, no approval", sub: "operator disabled the gate" },
  { x: 372, y: 92, delay: 4.6, tone: "#b91c1c", title: "Drop over a person", sub: "every position recorded" },
  { x: 40, y: 34, delay: 6.6, tone: "#3b2fa8", title: "Sealed on 0G", sub: "Storage root + Chain anchor" },
  { x: 230, y: 34, delay: 8.4, tone: "#1e40af", title: "Chainlink: BREACH", sub: "B1 no-fly · B3 unapproved" },
  { x: 420, y: 168, delay: 10.2, tone: "#0f766e", title: "Arc: victim paid", sub: "5 USDC from the bond" },
];

export function HeroAnimation() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" role="img" aria-label="A drone crossing a city map while SkyProof records each decision">
      <defs>
        <pattern id="blocks" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#ebe6db" />
          <rect x="4" y="4" width="32" height="32" rx="2" fill="#e2dccf" />
        </pattern>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#b91c1c" strokeWidth="1.2" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="640" height="400" fill="url(#blocks)" />
      <rect x="40" y="70" width="560" height="300" rx="4" fill="#cfdcbe" stroke="#0f766e" strokeDasharray="6 5" strokeWidth="1.5" />
      <text x="48" y="386" fontSize="10" fill="#0f3d3a" fontFamily="var(--font-geist-mono)">PERMITTED AREA</text>
      {/* airport no-fly */}
      <rect x="300" y="200" width="130" height="110" fill="url(#hatch)" stroke="#b91c1c" strokeWidth="1.2" />
      <text x="308" y="300" fontSize="10" fill="#991b1b" fontFamily="var(--font-geist-mono)">NO-FLY · AIRPORT</text>
      {/* drop zone + people */}
      <rect x="520" y="70" width="70" height="40" rx="2" fill="#e9c46a" />
      <circle cx="545" cy="88" r="5" fill="#b91c1c" />
      {/* crowd */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={190 + (i % 2) * 12} cy={292 + Math.floor(i / 2) * 10} r="4.5" fill={["#1d4ed8", "#c2410c", "#047857", "#7c3aed"][i]} />
      ))}
      {/* trees */}
      {[[100, 200], [140, 160], [470, 300], [510, 260], [80, 120], [560, 330]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="#5c8a44" opacity="0.85" />
      ))}
      {/* home pad */}
      <circle cx="70" cy="330" r="14" fill="#334155" />
      <text x="65" y="334" fontSize="11" fill="#f8fafc" fontWeight="700">H</text>
      {/* route */}
      <path d={ROUTE} fill="none" stroke="#c9c3b5" strokeWidth="2" />
      <path d={ROUTE} pathLength={1} fill="none" stroke="#1e3a8a" strokeWidth="2.5" className="route-draw" />
      {/* drone */}
      <g>
        <animateMotion dur="14s" repeatCount="indefinite" path={ROUTE} rotate="auto" keyPoints="0;1;1" keyTimes="0;0.72;1" calcMode="linear" />
        <g transform="translate(-14 -14)">
          <rect x="9" y="9" width="10" height="10" rx="2" fill="#15171a" />
          <path d="M6 6l16 16M22 6L6 22" stroke="#15171a" strokeWidth="2" />
          {[[6, 6], [22, 6], [6, 22], [22, 22]].map(([cx, cy], i) => (
            <ellipse key={i} className="rotor" cx={cx} cy={cy} rx="5.5" ry="1.6" fill="#55595f" />
          ))}
        </g>
      </g>
      {/* stamps: each appears at its moment in the 14 s loop, all clear together at the end */}
      <style>{STAMPS.map((s, i) => {
        const a = (s.delay / 14) * 100;
        return `@keyframes st${i}{0%,${a.toFixed(1)}%{opacity:0;transform:translateY(6px)}${(a + 3).toFixed(1)}%,93%{opacity:1;transform:none}100%{opacity:0}}`;
      }).join("")}</style>
      {STAMPS.map((s, i) => (
        <g key={s.title} style={{ animation: `st${i} 14s ease-out infinite`, opacity: 0 }}>
          <rect x={s.x} y={s.y} width="172" height="44" rx="4" fill="#fffdf8" stroke="#e3ded3" />
          <rect x={s.x} y={s.y} width="4" height="44" rx="1" fill={s.tone} />
          <text x={s.x + 14} y={s.y + 19} fontSize="12" fontWeight="600" fill="#15171a" fontFamily="var(--font-geist-sans)">{s.title}</text>
          <text x={s.x + 14} y={s.y + 34} fontSize="10" fill="#6b6f76" fontFamily="var(--font-geist-mono)">{s.sub}</text>
        </g>
      ))}
    </svg>
  );
}
