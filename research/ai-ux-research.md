# Making the AI easy (and premium): what the best AI builders do, where we fall short, what to build

Research date: 23 Oct 2026. Scope: AI creation and editing UX in Lovable, v0, Bolt, Framer, Wix Harmony/Aria, Squarespace Blueprint, Durable, Gamma, Canva, Notion, Figma Make/First Draft, ChatGPT canvas, Claude Design/artifacts and Cursor, plus usability research from NN/g, Nielsen, Microsoft HAX, Google PAIR and academic work. It is reviewed against our current code (`app/src/editor/ai/*`, `app/src/editor/canvas/*`). No code was changed.

The owner's test is the yardstick throughout. At every moment a coach must know: **(1) where am I, (2) what is the AI doing, (3) what can I do next, (4) how do I change it.** The second requirement is **easy AND premium**, judged by the two house rules files (`apple-design.md`, `premium-ui-playbook.md`): calm motion, no loud colour, options that look different.

Reliability note: "screens in words" below come from vendor help pages, launch posts and hands-on reviews. I did not use the products live. Vendor claims are marked (primary) and reviews (secondary).

---

## 0. TL;DR

1. **Everyone has moved from "one prompt, wait, hope" to "brief → plan you can see → build → review in place".** Gamma 5 (Oct 2026) opens with agent questions and then a plan you approve. It offers *Plan* or *Express*. Lovable has *Chat / Plan / Build* modes and a Plan view you can edit and approve. Notion's agent previews a plan, edits nothing until you approve, and can propose edits one at a time. Wix Harmony fills a visible **Site Profile** while Aria asks questions. Relume and Webflow show a sitemap first. Our flow has the questions but **no visible plan**. After "Build my page" you wait 2-5 minutes without knowing what will be built.
2. **The canvas carries the story. The chat only narrates it.** Framer, Wix, Lovable's preview toolbar, Claude Design and Figma Make all have you point at the thing, change it there, and see the result there. Ours does the opposite on the three key moments: picking the look (tiny cards in a 324px panel), progress (one truncated line plus a seconds counter), and approval (Keep/Undo at the bottom of the chat). The canvas sits idle or locked meanwhile.
3. **Typing is the hard part for our users.** Nielsen's "articulation barrier" estimates that about half of adults in rich countries are low-literacy users. His 2025 follow-up lists six fixes: style galleries, prompt rewrite, targeted rewrite, related prompts, prompt builders and sliders. Coaches should be able to do 80% of the work by tapping: chips, galleries, "try another", sliders. The text box is for the rest.
4. **Long waits need structure, not a spinner.** NN/g: anything over 10 s needs percent-done or "x of y", a time estimate padded high, a reason for the wait, and a way to stop or do something else. Buell & Norton's *labor illusion* found that visible work raises perceived value, and that a changing list of what is being done beat a plain progress bar. Our 2-5 minute build is the moment that decides trust, and today it shows the least.
5. **Approval should be per section and on the page.** Notion approves edits one by one. Cursor's per-hunk accept is so loved that users protested when it was hidden. ChatGPT canvas has *Show changes* plus version arrows. Framer puts big changes on a *branch*. Ours is all-or-nothing Keep/Undo, and it is **kept silently** if you send another message, start a new chat, or (for a new page) simply carry on.
6. **Premium means calm, fast and crafted, not decorated.** The products that feel high-end (Linear, Raycast, Framer, Gamma) answer the hand instantly, keep one accent colour, use real type, show real previews instead of icons, and keep motion short and interruptible. We already follow most of this. The gap is that our AI states are *text in a sidebar*. Premium AI shows the page changing, quietly, where you are looking.

**Top 6 changes, in order of value:** (a) a visible *page plan* card on the canvas before building; (b) looks chosen on the canvas as full-width live first screens; (c) a building state on the canvas, section by section ("Building 3 of 7 · about 2 min left"), with the editor usable around it; (d) per-section review chips on the canvas (changed / keep / undo / try again) plus a clear "Your page is ready" moment; (e) an inline prompt at the selection, with "Try another version" for sections (the Layouts popover already exists but nothing opens it); (f) Memory renamed to something plain, made visible when it learns something, and reused across the funnel.

---

## 1. Product by product: what matters

### Gamma (deck/site generator; the clearest "outline-first" product)
- **Flow (primary, help center):** *Create New AI* → choose **Generate / Paste / Import** → choose **Plan** (review the plan before building), **Express** (build straight away) or **Research** (Plan plus sources) → image choice (AI images, stock, your own, *Image placeholders*, *Don't add images*) → build. Theme can be changed afterwards with one **Theme** button. *View Source Prompt* shows what was asked.
- **Gamma 5 (6 Oct 2026):** the start is now a conversation. The agent asks about the audience, the purpose and the direction, then shows a plan to approve. Changes can be "reviewed side by side". Gamma calls it its biggest overhaul, and its aim is to stop look-alike output (secondary summaries; the primary post returned 403).
- **Card-level AI:** each card has a small sparkle icon at its top left that opens the editor for *that card only*. A separate icon at top right edits many cards. **Try new layout** shows other layouts for the card in real time, keeping its content.
- **Screen in words:** a centred prompt field with three large entry tiles above it. Next, an outline view: a vertical list of numbered card titles, each a text field you can drag, edit or delete, and a "Continue" button. The deck then fills in card by card, top to bottom.
- **Lesson for us:** ask a few questions, then show the plan as an editable list, then build. Keep the AI on the unit (card = our section) next to it, with "try new layout" as the main regenerate action.

### Lovable (chat + preview; the reference for "modes" and point-and-edit)
- **Modes (primary):** **Chat** ("Ask anything, explore ideas", no changes, free while the daily allowance lasts), **Plan** (it writes a structured plan in a *Plan view*; you edit, approve, then it builds), **Build**. A *Start building* card offers **Build / Skip**. Switching modes keeps the conversation.
- **Preview toolbar (primary):** four modes with shortcuts. **Select elements (S)**: click, Cmd-click for several, then describe. **Edit text inline (T)**: free up to 100 edits a day. **Draw annotation (D)**: sketch arrows or boxes on the preview and add a message; Lovable gets the annotated screenshot. **Comment (C)**. The toolbar can be dragged, docked and minimised. Requests sent while Lovable works "are picked up at the next stopping point".
- **Recovery (primary FAQ):** *View History* lets you restore any version as a new edit card, "nothing gets lost". **Try to fix** (free) appears after errors.
- **Lesson:** direct manipulation for small things (free, instant), AI for intent. Plan before big changes. You can queue requests while it works. Restoring never destroys.

### v0 (Vercel)
- **Design Mode (primary launch, 2025):** select an element and change colour, spacing and text in a panel "without spending credits". Later versions route changes through *Apply*, which costs credits, and users complained loudly in community threads (secondary).
- **Lesson:** keep small manual tweaks free and instant. Our classic editor already does this. Users hate it when a small edit secretly becomes an AI call.

### Bolt (bolt.new)
- Version history is a timeline you can browse, preview, label and restore (primary). **Plan** mode discusses the approach without changing code. Discussion mode was reportedly retired into Plan in Aug 2026 (secondary).
- **Lesson:** a named, restorable timeline is the safety net that makes people brave.

### Framer (Wireframer, Framer 3.0 Agents, Branching)
- Wireframer: a prompt or preset gives a full layout with **all breakpoints created automatically** (secondary).
- Agents (Framer 3.0, primary): select a page, frame or component as context, then describe the outcome. The agent "updates only that part". **Branching** isolates agent edits so you can review and compare before merging. External agents always work on a branch.
- **Hero variations:** the agent restacks the existing hero into several layouts *keeping copy and styles*; you compare and drop one onto the site.
- **Screen in words:** canvas first. A floating agent box. Variations appear as several frames side by side on the canvas, at real size, not as thumbnails in a panel.
- **Lesson:** variations are shown as real sections on the canvas. Big changes are "proposals" you can compare, not silent rewrites.

### Wix Harmony + Aria (Jan 2026)
- **Onboarding (primary help):** *Create New Site* → *Wix Harmony Editor* → *Let's Go* opens a chat with Aria. **As you answer, your Site Profile fills in on the left.** Suggested apps → *Continue*. Later *Design Site* shows a **suggested description you can edit** (business, colours, style) → *Generate Site* → a live preview opens in the editor.
- **Editing:** *Ask Aria* sits at the bottom right. Selecting an element and choosing *Ask AI* in its action bar **offers prompt suggestions for that element**. You move freely between prompts and drag-and-drop. Desktop and mobile toggle with one click. One review warns that the hybrid "may overwhelm small business owners" (Durable, a competitor).
- **Lesson:** the brief becomes a visible, editable profile as you talk, which answers "what does it know?". The selection toolbar's *Ask AI* opens element-specific suggestions.

### Squarespace Blueprint (the gold standard for non-technical "guided" creation)
- **Steps (secondary, hands-on):** business type and goal → site title + **one of 7 brand personalities** (the sample text changes live to show the tone) → homepage sections (9 options, some marked *recommended*, each with a **Layout Switcher**) → pages (arrow previews) → **colour palettes grouped by personality; clicking one updates the homepage preview on the left** → **14 font pairings, each refreshing the preview** → *Finish*. About 10 minutes in all. 2025 Refresh added conversational setup and a ChatGPT entry (secondary).
- **Screen in words:** a split screen. A narrow column of choices on the right, and a large live homepage preview on the left that changes with every click.
- **Lesson:** **style choices are made against the user's own page at full size**, never as tiny swatches. Every choice is a tap. No prompt is needed.

### Durable
- Three questions (business type, location, name) → a site in about 30 s. Per-section **Regenerate** redoes that section's content and images. Sign-up comes only after the result (secondary).
- **Lesson:** "regenerate this section" is the most-used AI action after creation and needs a one-click home on the section.

### Canva (Magic Studio → Canva AI 2.0)
- One prompt returns **several design options** to pick from, each fully editable (secondary). Canva AI 2.0 is conversational and outputs editable layered designs (primary help). **Brand Voice** in the Brand Kit (500 characters) feeds every copy generation.
- **Lesson:** give options first, then edit. Brand rules live in one place (the Brand Kit) and apply everywhere, not per document.

### Notion AI / Notion 3.0 agents
- Inline: select text → action → **Replace selection** or **Insert below**, or **Try again** (secondary). Agents: a **plan preview** lists the goal, steps and "a preview of what will change", and is read-only until approved (primary). Agents can now **propose edits that you approve or reject one by one** (secondary).
- **Lesson:** the "insert below" option (keep both) is a gentle alternative to replace. Approve per change.

### Figma Make / First Draft
- First Draft picks from **4 curated libraries** (lo-fi to hi-fi), then lets you edit by prompt *or* with style controls (colour, radius, spacing, type) (primary). Make's **Point and edit / Edit tool**: click an element in the preview, change properties or prompt; changes commit on **Apply**. Users report selection getting lost on send (forum).
- **Lesson:** offer sliders and controls next to the prompt. Make sure the selection you pointed at is the one that changes, and show it.

### ChatGPT canvas
- Highlight text → floating **Ask ChatGPT** button. A **shortcut menu** at bottom right: some apply instantly (final polish), others are **sliders** (length, reading level). **Show changes** shows additions and deletions. **Version arrows** browse and restore (primary).
- **Lesson:** sliders for "shorter / longer / simpler" beat retyping. Show what changed, not only that something changed.

### Claude Design (Anthropic Labs, Apr 2026) and artifacts
- Iterate by chat, **inline comments pinned to an element**, direct text edits, and **generated sliders** in a *Tweaks* panel (spacing, colour, timing) (secondary reviews).
- **Lesson:** the AI can create the *controls* for its own output. A "warmer ↔ cooler" or "calmer ↔ bolder" slider is easier than a prompt.

### Cursor (code agents, the strongest diff culture)
- Per-change Accept/Reject with inline red/green diffs. When Cursor 3 moved to session-level review, users asked for per-hunk review back (forum).
- **Lesson:** once people have per-unit approval they don't want to give it up. Our unit is the section.

### Cross-product picture
| Moment | What the best do | Who |
|---|---|---|
| First screen | Prompt **plus** tap-only routes (tiles, personalities, templates); examples you can click | Gamma, Blueprint, Wix, Canva |
| Brief | A few questions; the brief becomes a visible, editable profile or description | Gamma 5, Wix, Durable |
| Plan | Outline / sitemap / plan view, editable, approve to build; "Express" to skip | Gamma, Lovable, Notion, Relume, Webflow |
| Style | Chosen against your own page at full size, live | Blueprint, Framer, Canva |
| Build | Streams into the canvas, unit by unit; you can queue requests | Gamma, Lovable, Framer |
| Review | Per unit; show changes; branch/compare; versions restorable | Notion, Cursor, ChatGPT canvas, Framer, Lovable |
| Edit a part | Select → inline prompt/suggestions/sliders; small manual edits free | Wix, Lovable, Figma Make, Claude Design, v0 |
| Regenerate | "Regenerate" / "Try new layout" on the unit, content kept | Durable, Gamma, Framer, Relume |
| Brand | One brand kit / voice reused everywhere | Canva, Framer Skills |

---

## 2. What the research says (2024-2026)

- **Articulation barrier (Nielsen, 2023; patterns 2025).** Prompting needs good writing; about half of adults are low-literacy. Fixes: *style galleries*, *prompt rewrite*, *targeted rewrite*, *related prompts* (Perplexity's follow-ups reportedly doubled engagement), *prompt builders*, *parametrization (sliders)*. → Coaches need taps, galleries and sliders first, the text box second.
- **NN/g early genAI behaviours (2024).** *Accordion editing* (repeatedly asking to expand or shrink) and *apple picking* (scrolling the chat to find the one good line). → Provide length controls, and keep results on the page, not in the chat.
- **NN/g CARE prompts (2024).** Context, Ask, Rules, Examples. → Our brief questions should collect C, R and E so users never have to.
- **NN/g "Designing AI Agents" (2025).** Offer redundant entry points (typing **and** visible menus). **Don't auto-send a prefilled prompt for broad categories**: ask a clarifying question with a short list. Reuse familiar patterns ("Okay, now I know where I am. This looks familiar"). Show decision-critical information before commitment. → Keep the classic editor's patterns, and only auto-run suggestions that are fully specified.
- **NN/g progress indicators.** Over 1 s show something. 2-10 s a spinner is fine. **Over 10 s: percent-done or "x of y", a padded time estimate, text explaining why, a stop option.** Avoid static "Loading…". → Our 2-5 minute build breaks every one of these except Stop.
- **Labor illusion (Buell & Norton, 2011).** Visible work raises perceived value (+8% in the travel study). **A changing list of what is being done beat a progress bar at every wait length.** Caveat: when the result is poor, transparency makes users less satisfied. → Show the real work (sections appearing, photos being made), tied to a real result.
- **Skeleton screens.** Evidence is mixed. Viget (136 people) found skeletons felt *slower* than a spinner because they draw attention. Another small study favoured left-to-right shimmer. → Real content streaming in beats skeletons. Use a skeleton only for the next one or two slots, and keep it still.
- **Follow-up questions (Tix, arXiv 2407.12017).** Documents made after the AI asked questions were preferred, and the experience was rated better. **Thought-provoking questions were valued more than form-filling ones.** → Our questions are right. Make them fewer and sharper, with tap answers.
- **Microsoft HAX 18 guidelines (CHI 2019)** include making clear what the system can do, showing contextually relevant information, efficient invocation, dismissal and correction, scoping services when in doubt, and explaining why. **Google PAIR:** onboard in stages, set expectations, and give paths forward from failure ("creating paths for users to take action in response to errors encourages patience").
- **Chat fatigue (2025-26 practitioner essays).** Chat suits exploring and fails for known, repeated tasks. One team cut drop-off from 60% to 12% by replacing a chat flow with an inline form. → Chat for intent, direct manipulation for everything known.

---

## 3. What makes an AI product feel premium (and stay simple)

From our two rule files plus the products above:

1. **Response before intelligence.** The press answers on pointer-down. The panel opens in under 320 ms. Something on the canvas changes within about 1 s of sending (`apple-design.md` §1; playbook §5). A slow model in a fast shell reads premium; a fast model in a laggy shell does not.
2. **Real previews, never icons or swatches.** Blueprint, Framer and our own `LookCard` show the user's own words in real fonts. Premium is *their page, beautifully set*, at a size that does it justice.
3. **One accent, colour only on small things.** Linear-style restraint (playbook §3; memory "no loud chrome"). AI states use type weight, position and a thin line, not a coloured toolbar or glow.
4. **Calm motion that has meaning.** Sections fade and rise once as they arrive (≤ 300 ms, `--ease-out`). No sweeping light, no shimmer loops, no AI cursor (memory "calm AI motion"). Motion can be interrupted: the user can scroll, select and look around while the AI works (`apple-design.md` §3 "never lock out input").
5. **Typography carries the hierarchy.** Big, quiet serif moments for the first screen and "Your page is ready". UI text at 13/20. Tabular numbers for time and counts (playbook §3).
6. **Specific, plain language.** "Writing your testimonials", not "Running critic pass". "About 2 minutes left", not "37s" counting up. No model names. Short past-tense toasts with Undo (playbook §6).
7. **Craft in the seams.** Popovers grow from their trigger. Scroll-to-section is smooth. Nothing overlaps (memory "no flawed options"). States are the same across panel, canvas and toasts, from one primitive each (playbook §7).
8. **Confidence through reversibility.** Premium tools never make you afraid: every step is restorable and named in History (Lovable, Bolt). Apple's "Agency" principle: easy undo, confirm only what is irreversible.

### Where ease and premium pull apart, and how to resolve each

| Tension | Easy wants | Premium wants | Resolution |
|---|---|---|---|
| Guidance vs. clean screen | Many hints, examples, tiles | One quiet prompt | One prompt **plus one row of 3-4 tappable starter chips** under it (static, not typed out). Detail appears only after the first tap (progressive disclosure, PAIR "onboard in stages"). |
| Showing progress vs. calm | Lots of status | No noise | **Progress is the page itself**: sections arrive in place, plus one quiet status line ("Building 3 of 7 · about 2 min"). No animated lights. |
| Choice vs. decision fatigue | "Decide for me" | Show taste, offer options | **Four looks, one recommended** and pre-selected. "Build" works with zero taps. Options must look different (memory rule). |
| Explaining AI vs. minimal copy | Explain everything | Few words | One line per state that answers the four questions. Detail sits behind a disclosure ("See what I did"). |
| Safety (confirm) vs. flow | Ask before every change | Never interrupt | No dialogs. Changes apply as **proposals** with Keep/Undo *on the section*; leaving them alone keeps them, and a toast says so ("Kept. Undo"). |
| Chat vs. canvas | Chat explains | Canvas feels pro | Chat narrates; the **canvas holds every decision** (plan, looks, review chips, variations). |
| Power features vs. simplicity | Sliders, modes | Few controls | Show 2-3 contextual actions on selection. Sliders appear only inside the popover that needs them (Rewrite: shorter ↔ longer). |

---

## 4. Proven AI UX patterns and when to use them

| Pattern | Use when | Avoid when | Example |
|---|---|---|---|
| Starter tiles / templates | Blank state, users can't articulate | Returning power users (keep the prompt first) | Gamma, Blueprint |
| Clickable example prompts | First screen | As an auto-typing animation (can't be clicked, adds motion) | Wix suggestions |
| Clarifying questions with tap answers | Intent is ambiguous; ≤ 3 questions | The request is fully specified (just do it) | Gamma 5, our Questions |
| Visible brief / profile | Anything the AI "remembers" | Never hide it | Wix Site Profile |
| Plan / outline approval | Builds > 30 s or multi-section changes | One-element tweaks | Gamma Plan, Lovable Plan, Notion |
| Express mode | Confident users, re-runs | First-time users by default | Gamma Express |
| Style gallery at full size | Choosing look, fonts, colours | Thumbnails in a narrow panel | Blueprint, Framer |
| Streaming into the canvas | Any generation | Behind a modal or cover | Gamma, Lovable |
| x-of-y + estimate + stop | Waits > 10 s | Waits < 2 s | NN/g |
| Queue while working | Long runs | — | Lovable "next stopping point" |
| Proposal + Keep/Undo per unit | AI changes to existing content | Brand-new page (everything is new; use "Undo build" in History) | Notion, Cursor |
| Show changes (highlight) | After any edit | — | ChatGPT canvas |
| Before/After | Whole-page restyles | Small text edits (inline diff is better) | Our Segmented |
| Branch / compare | Big restyles of a live page | Small tweaks | Framer Branching |
| Inline prompt at selection | Editing one thing | — | Wix Ask AI, Lovable Select |
| Quick actions + sliders | Shorter, simpler, warmer | Open-ended changes | ChatGPT canvas, Claude Tweaks |
| N variations, pick one | Copy, hero, section layout | Global settings | Our Rewrite, Framer hero |
| Regenerate one unit | After build | — | Durable, Gamma "Try new layout" |
| Annotate / point | "This thing here" requests | — | Lovable Draw |
| Version history restore | Always, as the safety net | — | Lovable, Bolt |
| Error with a next step | Every failure | Blaming the user | Lovable "Try to fix" |

---

## 5. Friction points in our current UX (with files)

**First screen (`canvas/EmptyVariants.tsx`)**
1. **Free prompt only.** The single field relies on articulation. The examples live only in an **auto-typing placeholder** (`useTypedPlaceholder`, `EXAMPLES`), so they can't be tapped and they add constant motion to the first screen. There are no tap-only routes (page type, goal, "use my old page / a site I like").
2. **"Memory" shown before anything exists** (Studio card footer renders `MemoryButton`). A brain icon and the word "Memory" on a blank page raise "what is this?". The empty list says "Nothing yet…".
3. **No expectation set.** Nothing says "I'll ask 2-3 quick questions, show you 4 looks, then build in about 3 minutes". The send button's label is "Build the page", but the next step is actually questions.

**Brief and looks (`ai/AiThread.tsx` `Questions`, `LookCard`)**
4. **The most visual decision is shown smallest.** Four looks render as 2×2 cards 92px tall inside a 324px side panel, while the canvas shows only a `BuildingSkeleton` (`canvas/Canvas.tsx` ~L503-540, "asking" state). Blueprint and Framer show this choice at page size.
5. **No look is recommended** and no default is visible. "Decide for me" exists only implicitly (unanswered = AI decides, as the small print says).
6. **No plan is shown.** `run.ts` builds a real plan (`doc.plan`, "promise, angle, each section's job, the look") but the user never sees it before building. They can't remove "pricing" or add "testimonials" before 3 minutes of work.
7. **Answered questions fade to 60%** (`!live && 'opacity-60'`) and stay in the chat as history. The brief that came out of them is visible only in the Memory popover.

**Building (`AiThread.tsx` `Turn`, `run.ts`, `Overlay.tsx`, panels)**
8. **Progress is one truncated line plus a seconds counter going up** (`<Spinner/> {current?.text} {secs}s`). There is no "x of y", no estimate, and earlier steps collapse. This breaks NN/g's >10 s guidance for a 2-5 minute job.
9. **Step names leak internals and can alarm**: "Checking it on desktop and phone", "Fixing what the critic found", "It passed the check" (`run.ts` L300-312). A coach reads "critic found" as "something is wrong".
10. **The editor is locked with no explanation on the canvas.** The selection toolbars are hidden while `aiBusy` (`Overlay.tsx` L354-410), and controls in Elements and Settings are disabled (`LeftPanel.tsx` L357, `SettingsPanel.tsx` L146). Nothing on the page says "I'm building. You can scroll and look; editing opens when I'm done".
11. **Close the AI panel and progress disappears.** The TopBar "AI" button (`TopBar.tsx` L120-131) shows no working state.
12. **Photos finish after "done".** `fillPhotos()` runs during the critic, and "Creating photo…" placeholders (`render/PageView.tsx` L1203) can still be filling after Keep/Undo shows. "Is it finished?" is unclear.

**Review (`AiThread.tsx` Keep/Undo, `run.ts` `runAI`, `newChat`)**
13. **Approval lives only at the bottom of the chat**, on the last turn. The canvas has no "proposal" state except while comparing (`CompareLabel`).
14. **Changes get kept silently**: sending another request keeps the pending change (`run.ts` L150, `checkpoint(...)`, `patchTurn({status:'kept'})`), and *New chat* keeps it too (`newChat`). Correct as behaviour, but nothing tells the user.
15. **All-or-nothing.** A restyle of 7 sections can't keep 5 and undo 2. There is no per-section accept and no inline "what changed" highlight. "Done: 3 changes." doesn't say *which* three, and the clickable step targets hide behind the "N steps" disclosure.
16. **"Undo" on a brand-new page** returns you to the empty first screen: a scary, destructive-sounding action sitting next to "Keep" after 3 minutes of work. "Before/After" on a new page compares against blank.

**Editing a selection (`canvas/Overlay.tsx`, `Composer.tsx`, `TextOptions.tsx`, `Variations.tsx`)**
17. **"Ask AI" sends you away from the element**: it opens or focuses the right-side panel (`askAI()` L587, toolbar L612/L729). The prompt is far from the thing it changes (Wix, Lovable and Figma prompt at the element).
18. **The section "Layouts" popover is unreachable.** `VariationsPopover` exists and is rendered from `CanvasPopovers`, but no toolbar opens `openPopover('layouts', …)`. There is **no "try another version" or "regenerate" for a section**, the most used post-build AI action elsewhere.
19. **The scope can change silently.** The composer's scope chip follows the canvas selection (`useScope`). If you select a headline and then type "make it more premium", only the headline changes. The chip is small (12px) and its X ("Ask about the whole page") is easy to miss.
20. **Rewrite has no length or tone control and no "more options"**: three options, or "No options this time. Try again." with no button (`TextOptions.tsx`).

**Memory, errors, chrome**
21. **Memory is per page** (`doc.brief`) and named for the mechanism ("Memory", brain icon). Coaches think in terms of "my business" and "my brand", which should carry across every funnel step. It also learns silently: no "Saved: your price is €197" moment.
22. **Errors are dead ends**: `status: 'empty'` with a note and no *Try again*. "Nothing changed. Try being more specific." puts the blame on the user (`summary()`).
23. **Jargon in the header**: the model name, or "Offline mode", shows next to "AI" (`useModel`).
24. **Phone view isn't part of the story.** The critic checks mobile, but the user is never shown the phone result at the end (Wix: one-click toggle; Framer: breakpoints made for you).

---

## 6. Recommended end-to-end UX (classic editor intact)

Principles: the classic layout stays (left Elements/Layers, canvas, right panel = Settings *or* AI). **Decisions happen on the canvas; the AI panel narrates and keeps history.** Every state answers the four questions in one line.

### 6.1 First screen (EmptyVariants → refine, not replace)
- Keep the serif headline and the one card. Under the field, show **one static row of 4 starter chips** by goal: *Free guide sign-up*, *Sell a course*, *Book a call*, *Webinar*, adapted to the funnel `stepType`. Tapping one fills a sentence with a blank to finish ("A free guide for ___ that helps them ___"). Do not auto-send (NN/g). Drop the auto-typing placeholder and use one static example.
- A small second line: **"Paste your website or attach a page you like"** (the paperclip already exists, so this only makes it discoverable).
- Under the card, one line that sets expectations: *"I'll ask 2 quick questions, show you 4 looks, then build it in about 3 minutes. Nothing is final until you keep it."*
- Move **Memory off the first screen**. Show it after the first answer, as "What I know" (see 6.8).

### 6.2 Brief: 2-3 questions, sharper
- Keep tap-answer chips (proven). Limit to 3, each with a "Decide for me" chip selected by default, so **Build works with zero taps**.
- Prefer insight questions ("What's the one result your clients get?") over form-filling (Tix 2024).
- As answers come in, a compact **"Your page brief"** card at the top of the AI panel fills in live (Wix Site Profile): business · offer · audience · goal · voice. Each line can be edited in place.

### 6.3 Looks: on the canvas, at size
- When looks are ready, the **canvas** shows the four as full-width *first screens* of the user's own page, stacked or in a 2×2 grid at canvas scale, each with its name and one-line feeling. One is marked **Recommended** and pre-selected. The panel shows only "Pick a look (you can change it later)".
- Four looks that truly look different (memory rule): different font family, colour temperature, density and radius.
- Clicking a look applies it to that preview at once (Blueprint feel). No extra animation: a 200 ms cross-fade.

### 6.4 Plan: one card, editable, then Build
- Before building, show **"Your page plan"** on the canvas, above the chosen first screen: a numbered list of sections, each with its job in plain words ("3 · Testimonials: proof from clients like Anna"). Rows can be **removed, dragged, or added** from a small "+ Add a section" list. Data comes from `doc.plan`, which already exists.
- Two buttons: **Build my page** (primary) and *Change the brief*. Returning users get a remembered **"Skip the plan next time"** toggle (Gamma *Express*).

### 6.5 Building: the page builds itself, calmly
- The canvas shows the **plan list turning into real sections** one by one, each fading and rising once (≤ 300 ms) into its slot. One still skeleton marks the next slot only (no shimmer).
- One quiet status bar on the canvas, top centre, using the existing `--hud` capsule style: **"Building 3 of 7 · Testimonials · about 2 min left · Stop"**. The estimate is padded high, so it finishes early. Plain step names: *Planning · Writing your sections · Checking on phone and desktop · Polishing · Creating 4 photos*. Never "critic".
- **The canvas stays explorable**: scroll, select and read. Editing tools show a small note ("Editing opens when I'm done, about 2 min"). You can type the next request; it queues ("I'll do this next") as in Lovable.
- With the AI panel closed, the TopBar "AI" button shows a small spinner and "3/7" (tabular numbers).
- Photos: the status says "Creating 4 photos (your page is ready to edit)". The build counts as finished when text and layout are done. Photos fill in after with a calm fade, each placeholder saying "Photo on its way".

### 6.6 Review: a clear "ready" moment, then per-section control
- **New page:** no Keep/Undo pair. The panel shows a serif moment, **"Your page is ready."**, with three next steps as buttons: *See it on phone* (switches view), *Check how well it converts*, *Change anything: click it*. A full undo stays in History ("AI built the page"). This removes the scary "Undo" (friction 16).
- **Changes to an existing page (proposal state):** each changed section gets a **thin studio-blue outline and a small capsule at its right edge**, in the approved selection style: **Changed · Keep · Undo · Try again**. The panel shows the summary with the list of changed sections; each row jumps to its section. Keep all / Undo all stay in the panel, and Before/After stays for whole-page restyles.
- Text changes show an **inline highlight of the new words** for 2 s, then settle (ChatGPT "Show changes", without colour noise).
- **Silent keeps become visible**: if the user moves on, a toast says "Kept the AI changes · Undo" (playbook §6).

### 6.7 Editing a section or element: at the selection
- **Ask AI** in the selection capsule opens a **small inline prompt under the element** instead of jumping to the side panel. It shows 3 contextual suggestions (from `suggest.ts`, already written) and a field. Enter runs it on that element only. The scope is visible in the prompt itself ("Change this testimonial…"). *Open in chat* is available for longer talks.
- **Section capsule adds "Try another version"**, reusing `VariationsPopover` (friction 18): real previews of 3 layouts with the same text, plus an AI option "Write a new version". Picking one replaces the section as a proposal (Keep/Undo on the capsule).
- **Rewrite** gains a "Shorter ↔ Longer" and "Simpler ↔ Bolder" segmented pair at the top, a **More options** button, and **Try again** on empty results.
- Manual editing is always free and instant. AI never intercepts typing (v0 lesson).

### 6.8 Memory → "Your business"
- Rename to **"About your business"** (or "What I know") with a plain icon. Keep the grouped list, the per-item forget and the rules field (already good). Make it **account- or funnel-level**, so the next page starts knowing the business, price, voice and logo (Canva Brand Kit).
- When the AI learns something, show one quiet line in the chat: *"Noted: your price is €197 · Edit"*.
- Show it on the second page's first screen: "I'll use what I know about Calm Studio Yoga · Edit".

### 6.9 Errors and recovery
- Every failure gets a reason in plain words and a button: *Try again*, *Try a simpler change*, or *Restore the last version*. "Nothing changed" becomes "I couldn't find what to change. Try selecting it first." with *Select on page*.
- Remove the model name from the header. If the AI is offline: "AI is resting. Simple edits still work."

### 6.10 What stays exactly as it is
Left panel tabs, Elements adding flow, canvas framing (1280 desktop with gutters), selection design (one blue, glass capsule), Settings, History, Preview and Save. The AI only adds states on top of these.

---

## 7. Suggested order of work

| # | Change | Fixes | Size |
|---|---|---|---|
| 1 | Canvas build status ("x of y · time left · Stop"), plain step names, TopBar working state | 8, 9, 11, 12 | S |
| 2 | "Your page is ready" moment (no Undo for new pages) + "Kept · Undo" toast on silent keeps | 14, 16, 24 | S |
| 3 | Wire "Try another version" (existing `VariationsPopover`) + Rewrite controls/Try again | 18, 20 | S |
| 4 | Plan card on canvas from `doc.plan`, editable, + Express toggle | 6 | M |
| 5 | Looks shown on canvas at size, one recommended | 4, 5 | M |
| 6 | Per-section proposal capsule (Changed · Keep · Undo · Try again) + changed-text highlight | 13, 15 | M |
| 7 | Inline Ask-AI prompt at selection with suggestions | 17, 19 | M |
| 8 | First screen: static starter chips, expectation line, Memory moved | 1, 2, 3 | S |
| 9 | Explorable canvas while building + queued requests | 10 | M |
| 10 | Business-level memory + "Noted" lines; errors with next steps | 21, 22, 23 | M |

Per the house rules, each item should be shown as 2-4 visibly different options in context and screenshotted for overlaps before review.

---

## 8. Sources

**Products**
- Gamma, create with AI (Generate/Paste/Import, Plan/Express/Research): https://help.gamma.app/en/articles/7838093-how-to-create-a-new-presentation-document-or-webpage-with-gamma-ai
- Gamma, edit content with AI (card sparkle, multi-card): https://help.gamma.app/en/articles/8033284-how-to-edit-content-using-ai ; cards: https://help.gamma.app/en/articles/11016396-what-are-cards-in-gamma-and-how-do-they-work
- Gamma 5 announcement: https://gamma.app/th/insights/introducing-gamma-5-your-story-your-style-your-tools ; summary: https://www.hubsite365.com/en-ww/crm-pages/the-new-gamma-5-is-here-how-to-build-decks-with-ai-agents-1dd5eef8-3748-4dd0-bd3a-b516ced3ab1c.htm ; https://borncity.com/news/gamma-5-gamma-tech-stellt-den-groessten-umbau-seiner-praesentationsplattform-vor/
- Gamma workflow guide: https://gamma.app/explore/content/guides/how-gamma-maps-content-directly-to-slides-using-its-card-system ; https://www.mindstudio.ai/blog/how-to-build-professional-presentation-gamma-under-5-minutes-step-by-step
- Lovable preview toolbar: https://docs.lovable.dev/features/preview-toolbar ; chat/plan mode: https://docs.lovable.dev/features/chat-mode ; agent mode: https://docs.lovable.dev/features/agent-mode ; "A smarter Lovable": https://lovable.dev/a-smarter-lovable ; errors/restore FAQ: https://lovable.dev/faq/ai-agent/errors/lovable-breaks-site
- v0 Design Mode launch: https://community.vercel.com/t/introducing-design-mode-on-v0/13225 ; credit complaints: https://community.vercel.com/t/new-design-mode-why-do-simple-edits-now-require-ai-credits/44083
- Bolt rollback/version history: https://support.bolt.new/building/using-bolt/rollback-backup ; modes review: https://similarlabs.com/es/blog/bolt-new-review ; https://omidsaffari.com/es/blog/resena-de-bolt-new
- Framer 3.0 Agents + Branching: https://www.framer.com/blog/framer-3/ ; agents lesson: https://www.framer.com/ja/academy/lessons/framer-agents-generation-layout-style ; hero variations: https://www.createwith.com/tool/framer/updates/framer-adds-hero-variations-to-framer-agent ; layouts keep styles: https://www.createwith.com/tool/framer/updates/framer-agent-now-generates-new-website-layouts-while-preserving-your-styles ; AI builder: https://framer.com/solutions/ai-website-builder/ ; Wireframer: https://framer.university/blog/the-new-ai-workflow-for-building-websites
- Wix Harmony, create with AI: https://support.wix.com/en/article/wix-harmony-editor-creating-a-site-with-ai ; working with Aria: https://support.wix.com/it/article/wix-harmony-editor-working-with-aria ; launch: https://petapixel.com/2026/01/21/wix-harmony-lets-you-build-a-website-using-natural-language-prompts/ ; review: https://durable.com/ai-tools/wix-harmony-review ; older chat builder: https://www.websitebuilderexpert.com/website-builders/how-use-wix-ai/
- Squarespace Blueprint hands-on: https://www.websitebuilderexpert.com/website-builders/squarespace-blueprint-ai/ ; Refresh 2025: https://www.squarespace.com/press-releases/2025/9/30/squarespace-refresh-2025-built-to-stand-out-ready-to-scale ; https://www.techradar.com/pro/website-building/squarespace-just-dropped-60-updates-here-are-the-ones-that-matter
- Durable: https://www.techradar.com/pro/software-services/durable ; https://www.websiteplanet.com/website-builders/durable/ ; https://chaux.durable.com/blog/best-ai-website-builder
- Relume sitemap/wireframes: https://www.relume.io/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder ; https://www.relume.io/resources/docs/building-a-sitemap-with-ai
- Canva AI 2.0 / editable designs: https://www.canva.com/help/ai-prompting-tips/ ; https://storyboard18.com/digital/canva-rolls-out-new-ai-features-including-editable-design-generation-83521.htm ; Magic Layers: https://www.canva.com/newsroom/news/magic-layers ; Magic Studio: https://www.canva.com/newsroom/news/magic-studio/ ; guide: https://eesel.ai/blog/canva-ai
- Notion plan approval: https://www.notion.com/es-es/help/review-and-approve-plans-before-notion-ai-runs ; Notion 3.0: https://alternativeto.net/news/2025/9/notion-3-0-introduces-new-ai-agents-to-automate-nearly-all-tasks-a-human-can-do-in-the-app ; edit-by-edit approval: https://spaces.collab365.com/posts/notion-agents-can-now-work-inside-your-pages-and-w-8yi_cn ; inline flow: https://www.slashgear.com/1304573/notion-ai-note-taking/ ; HAX example: https://www.microsoft.com/en-us/haxtoolkit/example/notion-9b-support-efficient-correction/
- Figma First Draft: https://help.figma.com/hc/en-us/articles/23955143044247 ; https://www.figma.com/blog/figma-ai-first-draft ; Figma Make edit tool: https://help.figma.com/hc/en-us/articles/42009840449175 ; https://help.figma.com/hc/en-us/articles/31304485164695 ; selection-lost bug: https://forum.figma.com/report-a-problem-6/when-i-use-the-point-and-edit-tool-in-figma-make-it-selects-the-item-but-when-i-send-the-message-it-sends-the-message-without-the-selected-item-51081
- ChatGPT canvas: https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt
- Claude Design: https://www.datacamp.com/blog/claude-design ; https://www.eesel.ai/blog/claude-design-review ; https://engadget.com/ai/anthropic-now-has-a-design-assistant-too-150000903.html
- Cursor per-change review: https://forum.cursor.com/t/bring-back-per-change-apply-inline-diff-review-you-re-throwing-away-your-best-ux-advantage/160856 ; https://forum.cursor.com/t/missing-accept-all-files-and-revert-all-files-in-cursor-3-is-hurting-productivity/160141

**Research and guidelines**
- Nielsen, The Articulation Barrier: https://www.uxtigers.com/post/ai-articulation-barrier ; six patterns: https://www.uxtigers.com/post/prompt-augmentation
- NN/g, Accordion Editing and Apple Picking (2024, mirror): https://glasp.ai/malcolmjmr/p/ed33b04348e94486b979 ; CARE prompts: https://www.nngroup.com/articles/careful-prompts/ ; Designing AI Agents: https://www.nngroup.com/articles/designing-ai-agents/ ; top 2025: https://www.nngroup.com/articles/top-articles-2025/
- NN/g, Progress Indicators: https://www.nngroup.com/articles/progress-indicators/ ; Response Times: https://www.nngroup.com/articles/response-times-3-important-limits/
- Buell & Norton, The Labor Illusion (Management Science 2011): https://ideas.repec.org/a/inm/ormnsc/v57y2011i9p1564-1579.html
- Viget, A Bone to Pick with Skeleton Screens: https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens ; counter-study: https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a
- Tix, Follow-Up Questions Improve Documents Generated by LLMs: https://arxiv.org/abs/2407.12017
- Microsoft, Guidelines for Human-AI Interaction (CHI 2019): https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/ ; HAX library: https://www.microsoft.com/en-us/haxtoolkit/library/
- Google PAIR Guidebook: https://pair.withgoogle.com/guidebook/chapters ; Errors + Graceful Failure: https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Errors%20+%20Graceful%20Failure.pdf
- Shape of AI (Wayfinders, Tuners…): https://www.shapeof.ai/pattern-types/wayfinders
- Chat as the wrong default: https://labs.adaline.ai/p/post-chat-interface-ai-products ; https://uxdesign.cc/are-we-doing-ux-for-ai-the-right-way-aea01e14138e

**Premium craft**
- Raycast, A fresh look and feel: https://www.raycast.com/blog/a-fresh-look-and-feel
- Linear, How we redesigned the Linear UI: https://linear.app/now/how-we-redesigned-the-linear-ui ; Saarinen on quality: https://morganperry.substack.com/p/devtools-brew-62-building-linear
- Vercel Web Interface Guidelines: https://vercel.com/design/guidelines ; Emil Kowalski, Great animations: https://emilkowal.ski/ui/great-animations
- House rules: `/Users/redmobile/systeme_io_editor_v2/apple-design.md`, `/Users/redmobile/systeme_io_editor_v2/premium-ui-playbook.md`; earlier output-quality research: `research/ai-builders-research.md`
