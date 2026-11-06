# Per-task, polish and production prompts (specs/05-uiux.md, Section 11)

## Per task
```
Implement UI-<n> from specs/05-uiux.md (Sections 5-9 for details). Plan first and wait for my approval.
Then: implement, add/extend unit tests, run Playwright screenshots at 1440x900 and 390x844, critique your own screenshots against
"premium, cinematic, readable, honest", fix the top issues, commit, append to AI_USAGE.md. Do not touch anything outside Section 0 scope.
```

## Polish (UI-10)
```
Act as a senior design engineer at a top consumer-tech company. Review the running site at 1440 and 390 widths with Playwright at scroll
positions 0, .15, .35, .55, .7, .85, 1.0. List the 15 highest-impact issues (hierarchy, spacing, type, motion timing, contrast, perf, layout shift).
Fix the top 8, re-screenshot, repeat once. Do not add features.
```

## Production (UI-10)
```
Audit for production: Lighthouse performance + accessibility, bundle size of the 3D chunk, lazy loading, WebGL fallback, reduced motion, error boundaries,
meta/OG tags, favicon, 404, env handling, memory leaks (dispose geometries/materials on unmount). Fix what is below target, then list remaining risks.
```
