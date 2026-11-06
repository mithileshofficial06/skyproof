## UI / 3D rules
- On `/experience`, the canvas is fixed and full-viewport; DOM sections scroll over it. The 3D and DOM communicate only through the zustand store.
- Budget: 60fps mid laptop, dpr [1,1.75], GLB < 2MB. Never allocate objects inside useFrame.
- Data only via web/src/lib/data/adapter.ts. Never present simulated data as live; keep the mode badge truthful.
- Verify every visual change with Playwright screenshots (1440 + 390) before calling it done.
- Use Context7 for library APIs; do not guess props.
- Log AI-assisted UI files in AI_USAGE.md; list third-party assets in CREDITS.md.
- specs/05a-uiux-decisions.md records how specs/05-uiux.md is adapted to this repo; it wins over 05 where they differ.
