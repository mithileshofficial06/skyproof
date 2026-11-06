# Credits

Third-party assets used by SkyProof. Append-only.

| Asset | Where | Author | Licence |
|---|---|---|---|
| `drone.glb` ("Drone") | `web/public/models/drone.glb` (Live page, flight replays) | NateGazzard, https://poly.pizza/m/DNbUoMtG3H | CC BY 3.0 |
| Noto Sans Regular | `web/public/fonts/NotoSans-Regular.ttf` (3D labels) | Google | SIL Open Font License 1.1 |
| Geist Sans, Geist Mono | via `next/font/google` | Vercel | SIL Open Font License 1.1 |
| Weather data | Chainlink judge (Open-Meteo API) | Open-Meteo | CC BY 4.0 |
| ozky web UI (design system, Header, Menu, Footer, Loader, rune glyphs, home sections) | `web/src/components/oz/`, `web/src/app/oz-theme.css`, `web/public/oz/` | github.com/xavio2495/ozky (built by the SkyProof author); ported from SvelteKit to React | reused with the author's permission |
| 0G logo (`White-OG-Logo.svg`) | `web/public/logos/0g-white.svg` (sponsor flags in the 3D scene) | 0G Labs, official brand kit https://0g.ai/brandkit | Trademark of 0G Labs; used unmodified to credit the sponsor |
| Chainlink logo (`Chainlink-Logo-White.svg`) | `web/public/logos/chainlink-white.svg` (sponsor flags) | Chainlink, official brand assets https://chain.link/brand-assets | Trademark of Chainlink; used unmodified to credit the sponsor |
| Arc logo (`Arc_Logo_White.svg`) | `web/public/logos/arc-white.svg` (sponsor flags) | Circle, official Arc logo pack (Arc_Logos.zip) | Trademark of Circle Internet Group; used unmodified to credit the sponsor |

`/experience` (specs/05-uiux.md): the drone is procedural (built from primitives, no third-party model) and the
lighting environment is generated with drei Lightformers (no HDRI file).
