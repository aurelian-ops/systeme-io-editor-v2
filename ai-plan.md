# AI upgrade plan

Goal: an AI that understands the user, remembers, plans before building, writes pages that convert and look premium.

## Steps (status)

1. Memory: page brief kept by the AI (business, offer, audience, objections, proof, voice, goal, decisions), sent every time, updated after every message; longer, fuller history; conversation kept across reloads. — engine done; the panel to see / edit it: options in app/ai-memory.html
2. Plan → build → review: plan stage (asks 2–3 one-tap questions only when something is missing, then a section plan with each section's job), build stage follows the plan, review stage looks at a screenshot + the page and fixes problems. Small edits stay one fast call. — done (one-tap questions in the chat; ~80s for a full page)
3. Conversion: conversion skill in every prompt (page-type playbooks, copy formulas, objection handling); "Conversion check" = score + top 3 fixes, each one click. — done (skill in server/skills/conversion.md; check from the AI suggestions); AI sample proof flagged in the editor
4. Design: design skill (8 directions with exact fonts / colours / radius / spacing / motion); the AI composes its own layouts instead of only the 14 templates; visual self-check. — done (server/skills/design.md, review stage looks at a screenshot); quality tuning with test briefs ongoing
5. New elements: comparison table, timeline, before/after, bento grid, logo marquee, animated number. — todo
6. Motion: animation presets on any element (entrance, scroll, hover, counters) + AI custom animation (labelled, removable), reduced-motion safe. — engine done (render/motion.ts); the settings group: options in app/motion-panel.html

## Architecture

- Server (`server/ai.ts`) takes a `stage`: plan | build | edit | review | check | variations.
- Skills live in `server/skills/*.md`, read on each request; only the parts that fit the request are sent (e.g. "Soft" direction + opt-in playbook).
- New ops: `remember` (brief updates), `ask` (one-tap questions), `plan`, `score` (conversion check), `animate`.
- Client (`src/editor/ai/run.ts`) runs the stages in order and shows them as steps in the thread.

## Research

- `research/design-research.md`, `research/conversion-research.md` → distilled into `server/skills/design.md`, `server/skills/conversion.md`.
