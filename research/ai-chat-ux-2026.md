# AI page builders, Oct 2026: what the best do, what users hate, what to copy

Research for the editor's AI chat (one-shot "build me a page", edits, reporting). Compiled 2026-10-24 by a research agent from vendor docs, reviews and forums; secondary sources are marked.

## What the best do
- **Questions before building: few, optional or none.** Claude Design asks short follow-ups only when it needs more (hook angle, feel, variations). v0 asks only when needed, inline, with Skip; it removed its "Enhance prompt" button. Lovable asks only in opt-in Plan mode. Wix Harmony/Aria and Google Stitch ask nothing for text prompts.
- **Progress:** Stitch streams onto the canvas and lets you steer mid-way; Aria shows a sidebar of what it builds next and why; v0 reports files/lines (developer-facing).
- **Edits:** click an element, then comment (Claude Design: "the single best part", "95% of what I needed"); Lovable Visual Edits; v0 batched numbered annotations; ChatGPT canvas highlight-then-ask.
- **Undo:** Claude Design Ctrl+Z, no history yet; v0 version picker; Bolt rollback per message; Hostinger "Undo this change" (but it deletes later messages).
- **Reporting changes in plain words:** nobody does it well. Lovable's Plan view has "key decisions and assumptions". A gap to own.

## What users hate
- Generic look (indigo gradients, Inter, three-card grids); "template" results; Wix ADI: many questions then a generic site.
- Fixes that break other parts; prompts ignored; v0 Design Mode editing surrounding elements.
- Paying credits for retries.
- Back-and-forth tweaking; slow first drafts (Claude Design "can take a long time"; Aria minutes).
- Fake content: invented testimonials, pricing tiers, dashboard numbers (FTC fake-review rule applies).
- Hard to edit afterwards (Framer locked output; Stitch element editing disputed).
- Too many questions (users abandon).

## What users love
- Click-to-comment on the result; a first draft better than expected; fast variations.
- Text/colour edits that cost nothing and need no chat.
- Undo inside the chat.
- Real copy instead of placeholder text.
- Good design out of the box; a small site in ten minutes.

## Patterns to copy (applied in the editor)
1. Never block on questions; make a robust guess and state assumptions (OpenAI Model Spec; one-question budget).
2. First message restates the brief in one line (NN/g confirmation rule): "Building a sign-up page for your 5-day sleep course, calm tone, your brand colours."
3. Show assumptions as editable chips after the build (not yet built; the reply states them).
4. Never invent proof; mark samples (done).
5. Plain-language progress steps on the canvas (done).
6. Scope click-to-edit strictly and say so (done: inline Ask AI).
7. Direct edits free and instant (done; hex applies as typed).
8. End every edit with a change report that names what was left alone ("Nothing else changed.") (done).
9. Fight the generic look with the user's own brand: read it from their screenshot or site (done for screenshots).
10. Show something usable fast, then refine (sections stream in as written).

## Sources
MacStories Claude Design hands-on · dev.to brand-kit test · support.claude.com Claude Design · v0.app/changelog · docs.lovable.dev Plan mode · websitebuilderexpert Wix Harmony · Google Labs Stitch posts · lovable.dev Visual Edits · OpenAI canvas help · tech.co and websitebuilderexpert Hostinger Horizons reviews · dev.to "why every AI site looks the same" · HN 47832366, 47818700 · tooltester/websiteplanet Wix ADI · Product Hunt and Trustpilot Lovable reviews · Vercel community v0 Design Mode thread · superdesign.dev v0/Framer reviews (competitor) · runsolo.io FTC testimonials · moda.app Stitch review · OpenAI Model Spec 2025-12-18 · alkemata.com clarifying questions · NN/g confirmation dialogs · anthropic.com Claude Design.
