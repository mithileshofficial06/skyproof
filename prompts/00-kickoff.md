# Kickoff prompt (specs/05-uiux.md, Section 1)

```
Read CLAUDE.md, every file in specs/, and `git log --oneline | head -30`. Then read specs/05-uiux.md fully.
Reply in at most 10 lines: what already exists, what you will add, what you will NOT touch (Section 0).
Run baseline checks (`forge test`; `npm run build` in web/ if present) and report results without fixing unrelated failures.
Create branch feat/ui-3d. Then execute tasks UI-0 to UI-10 from Section 11, one at a time:
plan -> wait for my approval -> implement -> unit tests -> Playwright screenshots (1440x900 and 390x844) -> self-critique -> commit -> log in AI_USAGE.md.
Use Context7 for exact three / @react-three/fiber / drei / postprocessing / gsap / lenis APIs. Never guess props or invent SDK functions.
Mark assumptions as [ASSUMPTION]. Stop and ask on any conflict with Section 0.
```

## Answers given at kickoff (2026-11-06)

- Tamper data: real sealed flights (see specs/05a-uiux-decisions.md D1)
- Route: new `/experience` page (D2)
- Missing docs: use the code as truth; create AI_USAGE.md, CREDITS.md, prompts/, CLAUDE.md UI section (D13)
- Look: the spec's near-black + cyan (D10)
