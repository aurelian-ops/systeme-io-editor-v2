# Premium and fully editable AI pages, and how to measure design quality

Research date: 23 Oct 2026. This file fills two gaps that `ai-builders-research.md` and `agent-reliability-research.md` leave open. Read those first, because this one does not repeat them. Those files cover: library-first builders, tokens before layout, directions before building, a skeptical critic, anti-slop lists, and the 23 ranked techniques.

- **Part A:** how products keep AI output premium *and* editable by non-technical users. This covers schemas, slots, variants, tokens, images, overlaps, mobile, layout swap, and catalog constraint.
- **Part B:** how to measure and improve design quality reliably, plus which models lead the design leaderboards in Oct 2026.

Our context: an OpenAI model (`gpt-5.4` in `server/ai.ts`) builds a section > row > column > element tree, partly through 18 recipes in `app/src/editor/recipes.ts`. Each recipe has a shared `RecipeCopy`, string-described knobs, and a `props.recipe` tag. Source quality is marked (primary) for vendor docs or papers, and (secondary) for reviews and aggregators.

---

## 0. TL;DR

1. **Every product that is both premium and editable uses the same model:** a section is a *typed component*. It has named content fields (slots), a small set of enum options (variants or knobs), token-bound styling, and limits. The editor UI and the AI both read the *same schema*. Shopify's section schema is the clearest public example (`settings`, `blocks`, `max_blocks`, `presets`, `static` blocks, `color_scheme`). Webflow (props, slots, slot restrictions, variants), Builder.io (`inputs`) and Puck (component `fields`) work the same way.
2. **The AI picks from the catalog and fills slots. Freeform is a separate, opt-in mode.** Puck makes this explicit: "assembly mode" uses only registered components, and "design mode" (off by default) may invent new ones. Builder.io shows the failure when the catalog is not enforced in code: its AI "may still default to built-in components" even in components-only mode. The constraint must live in the output schema and the validator, not only in the prompt.
3. **Content and layout must be separable for "swap layout, keep content".** Relume's Component Shuffling keeps "text, icons, and assets… mapped" to the new component. Wix offers "Change Layout" and "Alternative Layouts". That only works when every editable node remembers *which slot* it fills. Our recipes build nodes from `RecipeCopy` but don't record that mapping, and we should add it.
4. **Mobile is derived, not authored.** Framer breakpoints inherit from the primary breakpoint and only store overrides. Squarespace Fluid Engine keeps content and styles global and lets only placement and size differ on mobile (24 columns become 8 below about 750px). Each component declares its mobile behaviour once.
5. **Images users must click and replace are real image elements.** Backgrounds are only for decoration or for photos with text overlaid. Shopify models every image as an `image_picker` setting. Wix separates "Replace Background" from image elements. Our `hero-split` puts its photo in a column `backgroundImage`, so a click selects a column, not a photo.
6. **Measure with pairwise comparisons, not absolute scores.** WebDevJudge (ICLR 2026): pairwise judging had about 8 points more agreement with humans than single-answer grading. The best judge reached 70% against 85% human-to-human agreement. A 2026 best-of-N study found that pairwise judging recovered 61% of the gain of perfect selection, against 21% for pointwise scores. Use binary checks for anything objective. Calibrate the judge against 100 or more human-labelled pairs and track TPR/TNR.
7. **Leaderboards (Oct 2026):** Claude Opus 5.5 leads Arena WebDev (1807). Muse Wonder and Muse Spark 1.3 lead Design Arena Website (1360/1356). The best OpenAI models are **GPT-6 Astra** (#2 WebDev, 1774) and **GPT-6.1 Sol** (#4 WebDev, 1753; #7 Design Arena, 1321; $2/$10 per M tokens). Our `gpt-5.4` is #56 on Design Arena (1221). A 100 Elo gap means about a 64% expected win rate. Testing `gpt-6.1-sol` in our own eval is the cheapest quality gain available.

---

## Part A. Premium and editable: what each product does that matters

### A1. Shopify Online Store 2.0 / Horizon: the reference model for constrained, editable sections (primary)

A section is a Liquid file with a `{% schema %}` JSON block. The theme editor builds its whole UI from that schema: sidebar fields, "Add block", reorder, and the preset picker. Merchants never see code, and theme developers own the pixels.

```json
{
  "name": "Slideshow", "tag": "section", "class": "slideshow", "limit": 1,
  "settings": [
    { "type": "text", "id": "title", "label": "Slideshow" },
    { "type": "color_scheme", "id": "color_scheme", "label": "Color scheme", "default": "scheme_1" },
    { "type": "range", "id": "height", "min": 400, "max": 900, "step": 20, "unit": "px", "label": "Height", "default": 640 },
    { "type": "select", "id": "vertical_alignment", "label": "Vertical alignment", "default": "middle",
      "options": [{ "value": "top", "label": "Top" }, { "value": "middle", "label": "Middle" }, { "value": "bottom", "label": "Bottom" }] }
  ],
  "max_blocks": 5,
  "blocks": [
    { "name": "Slide", "type": "slide",
      "settings": [{ "type": "image_picker", "id": "image", "label": "Image" }] }
  ],
  "presets": [
    { "name": "Slideshow", "category": "Banners",
      "settings": { "title": "Slideshow" },
      "blocks": [{ "type": "slide" }, { "type": "slide" }] }
  ],
  "enabled_on": { "templates": ["*"], "groups": ["footer"] }
}
```

What matters for us:
- **Typed inputs:**
  - Basic types (7): text, textarea, number, range, select, radio, checkbox.
  - Specialized types (about 25): `image_picker`, `color_scheme`, `font_picker`, `inline_richtext`, `richtext`, `url`, `video`, `text_alignment`, product/collection pickers and others.
  - A `select` with 2 to 5 options renders as a segmented control.
  - `range` has min, max, step and unit, so a merchant cannot pick an ugly value.
  - The type sets both the editor control and the validation rule.
- **Blocks** are the repeatable slot (`items[]`):
  - `max_blocks` (50 at most) caps count.
  - Block and setting IDs must be unique.
  - The editor titles each block from its first `heading`, `title` or `text` setting.
- **Presets** are named starting configurations, each a variant with filled content. Since May 2025 they have categories, and they are what "Add section" lists. A section or theme block needs at least one preset to appear in the editor.
- **Theme blocks** (2024–25) can nest up to 8 levels:
  - A section accepts them with `{"type":"@theme"}`.
  - Presets can build nested layouts, for example a Group block with a "Column" preset holding Text blocks.
  - Theme blocks and section-local blocks can't be mixed in one section.
- **Static blocks** are the lesson for "premium but editable":
  - The developer places them in a fixed position: `{% content_for "block", type: "slide-controls", id: "controls" %}`.
  - Merchants **can edit their settings but cannot move or delete them**.
  - They don't count toward `max_blocks`, and presets mark them `"static": true` with the same `id`.
  - This is how a design keeps its fixed composition, such as an icon plus summary or a floating badge, while every visible thing stays editable.
- **Color schemes are tokens:**
  - `color_scheme_group`, defined once in `settings_schema.json`, defines N schemes (background, text, button, and so on).
  - Each section only picks `scheme_1`…`scheme_n`.
  - That is exactly our `SectionTone` idea, extended to named palettes.
- **AI inside this model:** Horizon (Summer '25 Edition) and Sidekick can "Generate" a new theme block from a prompt. The output is a normal block with settings, editable in the same sidebar (secondary). The AI's output is a catalog item, not loose markup.

### A2. Webflow: components with props, slots, variants, restrictions (primary)

- **Props** are typed per component: text, rich text, link, number, video, visibility, and image is also used in practice. Instances override props, not structure. DevLink exports them as typed React props, and the Designer warns that "Manual edits are discouraged" in the generated files.
- **Slots** are a native Slot element that "lets a component accept other components as content".
  - **Slot restrictions** (update dated 28 Aug 2026) let designers limit which components each slot allows.
  - Slots stay open by default.
  - For us this means a column in a recipe can declare that it accepts only `[button, text]`.
- **Variants:**
  - A component has a base variant plus named variants.
  - Each instance picks one in the Props panel.
  - The Designer API can create, get and set variants, and gained a way to get the selected variant on 17 Mar 2026.
  - The Variant prop type is a fixed option list (name, options, default).
- **Auto-suggested props** (27 Jan 2026): Webflow recommends props for common settings, CMS fields and nested instances.
- The AI site builder produces global colour variables, text styles and spacing on Flowkit, and the result opens in the normal Designer, already covered in the earlier file. AI code components (30 Apr 2026) are generated on the canvas, then refined by chat or code, and become reusable components.
- **Lesson:** the line between "what the user can change" (props, variant, slot contents) and "what the designer owns" (structure, styles) is explicit. The AI should write into the same props and slots a user edits.

### A3. Framer: neutral structure first, inherited breakpoints, variants (primary/secondary)

- **Wireframer** produces "responsive, purpose-driven but neutral layouts" with all breakpoints. Users restyle afterwards, and the AI agent's output lands as native Frames, Stacks, Grids, Text and Image layers ("Changes stay editable"). Framer 3.0 (16 Jun 2026) moved toward canvas agents.
- **Breakpoints inherit from the primary breakpoint and store only overrides.** The editor shows which properties are overridden and lets you reset each one. Breakpoint variants cover changes like a navbar becoming a hamburger or a card grid stacking into one column.
- **Component variants:** named states or versions (default, hover, active, or layout versions) with animated transitions between them. Props expose what instances may change.
- Reviewers still say people "need to correct hierarchy, generic copy, responsive behavior" after generation (secondary). Neutral structure with auto breakpoints doesn't produce premium output by itself.
- **Lesson:** model mobile as *overrides on top of desktop*, show them, and make them resettable. We already have `responsive.ts` with `base | override | auto | inherited`, so keep it and make the recipes' mobile rules the `auto` layer.

### A4. Relume: a designer-owned library, AI picks and fills, shuffle keeps content (primary/secondary)

- More than 1,000 components per platform (Figma, Webflow, React). The AI "mix[es] and match[es]" human-designed components into sitemap > wireframe > style guide (covered before).
- **Component Shuffling** (Nov 2025 release): swap a section's component on the canvas "within seconds", and "your text, icons, and assets stay mapped" to the new component. This only works because every component exposes slots of the same kinds: heading, paragraph, buttons[], image, items[].
- **Library MCP** (1 Jul 2026): assistants search the library in natural language ("ask for the outcome, not the file name") and then "fetch the actual Relume code by slug, deterministically". The code arrives as editable files on shared tokens and primitives (button, card, Tailwind preset, icons).
- **Failure lesson:** wireframes imported into Figma arrive *detached*, done on purpose so that site-builder edits carry over, so users can no longer swap them. Once a section is detached, it loses library features.
- **Lesson:** retrieval by intent, then deterministic fetch by ID. Slot names shared across the catalog make re-layout lossless. Keep the component link (`props.recipe` + slot map) after the user edits, so swap still works later.

### A5. Wix Harmony (Jan 2026): designed, AI and blank sections on a cell grid (primary)

- "Add Section" offers three starting points: **Generate with AI** (from a description), **Designed Section** (ready-made, by category), or **Blank**.
- Each section has a built-in grid "that starts with a single cell holding your entire section". **Change Layout** picks a grid, and you can resize rows and columns, adjust gaps, merge, swap or delete cells.
- **Replace Background** (colour, image or video, with opacity, dividers and scroll effects) is a different action from editing image elements.
- The Aria agent redesigns sections on the canvas. In the classic editor, Alternative Layouts lets you "shuffle through several ready-made layout alternatives". One review found the AI "correctly interprets basic layout requests about 70% of the time" (secondary).
- **Lesson:** cells are a user-understandable layout primitive (our rows and columns). Keep "background" and "image" as two different, clearly named things in the UI and in the AI's ops.

### A6. Squarespace Fluid Engine and Blueprint (primary/secondary)

- Blocks sit on a grid of 24 columns on desktop and 8 below about 750px (secondary). Blocks can overlap and be layered, which is how overlapping badges stay editable: each badge is a normal block with a z-order.
- The **mobile layout is independent for placement and size only.** "Any changes to the block content or section styles are global." Pitfall: mobile order starts as the order blocks were *added*, not their visual order. Recipes should set mobile order explicitly.
- Blueprint (covered before): personality, then curated palettes and font pairs. The AI never invents colours.

### A7. Puck AI and Builder.io: "AI uses your components" in open editors (primary/secondary)

- **Puck AI** (0.8, 28 Jul 2026):
  - **assembly mode** builds pages only from the components in your `config`, each declared with editable `fields`;
  - **design mode** (off by default) "generates new components on the fly and uses components from your config where possible", guided by server `instructions` such as "use the CSS variable for primary";
  - generated components still get fields and appear in the blocks tab;
  - a newer agent "visually inspects the pages it generates".
  This is the architecture we want, with the default and the escape hatch named.
- **Builder.io:** `registerComponent` with `inputs` (type, default, `showIf`) defines the editing UI and what the AI may compose. Forum threads report that its AI can ignore custom components and fall back to built-ins (secondary). **Prompt-only constraint leaks, so enforce it with the schema.**

### A8. Canva Magic Design, Gamma, Durable, Hostinger (secondary)

- **Canva:** a brief yields 8 to 12 template variations, and you pick one. Every element is a normal Canva element. Magic Switch re-lays out the same content for other formats ("repositions text, recropping images"). Reviews call the output "formulaic" unless customised.
- **Gamma:** cards with smart layouts that "adjust automatically as content changes" (timeline, comparison, and so on). Layout follows content type.
- **Durable / Hostinger:** template sections with per-section regeneration (Durable only). They feel safe but generic, as covered before.

### A9. Cross-cutting patterns (what to copy)

| Problem | Pattern | Who |
|---|---|---|
| AI output editable like hand-made | AI writes into the same typed fields/slots the user edits; no special "AI layer" | Shopify, Webflow, Puck, Builder, Framer |
| Premium stays premium after edits | Designer owns structure + styles; user changes content, enums, ranges; static parts can't be deleted but can be edited | Shopify static blocks, Webflow props vs structure |
| Repeatable content | `blocks`/`items[]` with min/max count, each with its own fields | Shopify `max_blocks`, Relume, Gamma |
| Variants | Few named enums per component (side, tone, size); presets = filled starting points | Shopify presets, Webflow/Framer variants |
| Tokens | Section picks a scheme or tone ID, never raw colours; type is by role | Shopify color schemes, Webflow variables, Lovable |
| Images | Always a real image field or element with crop/focal point; backgrounds only for decoration or text-over-photo, labelled "Background" | Shopify `image_picker`, Wix Replace Background |
| Overlaps / floating badges | A normal element in its own cell or layer, with a declared mobile fallback (stack below, or hide) | Fluid Engine layering, Shopify static blocks |
| Mobile | Inherit desktop, store overrides, component declares mobile rules; show and reset overrides | Framer, Squarespace, our `responsive.ts` |
| Swap layout, keep content | Shared slot vocabulary + per-node slot binding; remap content to the new component | Relume shuffle, Wix Alternative Layouts, Canva Magic Switch |
| Constrain AI to catalog | Schema enum of component IDs + per-component field schema, plus a validator; free generation is a named, separate mode | Puck assembly vs design, Relume MCP fetch-by-slug, Builder (failure) |

---

## Part B. Recommended architecture for us

**Principle: section components with slots, variants and tokens. The AI chooses and fills. Freeform only as a last resort.** We are about two-thirds of the way there with `recipes.ts`. Below are the gaps and the proposed format.

### B1. Gaps in today's recipes

1. **Free text instead of a typed spec.**
   - Knobs are described as free text ("side (photo left|right)…"), and all recipes share one loose `RecipeCopy`.
   - The model doesn't know per recipe which slots are required, how long they may be, or how many items fit.
   - The validator can't reject a bad fill.
2. **No slot binding on the built nodes.** `buildRecipe` sets `props.recipe` only, so we cannot swap a layout after the user edits text, and cannot tell which node is "the headline".
3. **Some photos are backgrounds.** `hero-split` puts its photo in a column `backgroundImage`, which goes against "users must be able to click and edit everything". The Shopify and Wix rule is that a replaceable photo is an image element.
4. **No variant or preset concept.** Knobs exist, but there are no named, designer-vetted combinations (presets) for the AI to choose from. The AI combines knobs freely, so some combinations nobody has looked at.
5. **No schema-level catalog constraint.** The `recipe` op name is checked in code (it falls back to `hero-split`), but the plan output isn't constrained to the enum, and slot shapes aren't validated.

### B2. Proposed section schema (one per recipe, in TS, exported as JSON for the model)

```json
{
  "id": "hero-split",
  "version": 3,
  "label": "Half photo, half words",
  "job": ["hero"],
  "use": "First screen; tall photo fills one half edge to edge; words in the other half. Coaches, wellness, creators, courses.",
  "avoidWhen": "No real photo available; more than 2 lines of headline needed.",
  "slots": {
    "eyebrow":  { "type": "text",   "optional": true, "max": 32 },
    "headline": { "type": "inline", "max": 48, "lines": { "desktop": 2, "mobile": 3 } },
    "sub":      { "type": "text",   "max": 140 },
    "cta":      { "type": "button", "max": 24, "action": ["url", "popup", "submit"] },
    "note":     { "type": "text",   "optional": true, "max": 60 },
    "photo":    { "type": "image",  "aspect": "3:4", "focal": true, "prompt": "tall editorial photo, calm area on the text side" },
    "card":     { "type": "group",  "optional": true, "fields": { "big": { "type": "text", "max": 8 }, "small": { "type": "text", "max": 28 } } }
  },
  "knobs": {
    "side":  { "enum": ["left", "right"], "default": "right" },
    "tone":  { "enum": ["light", "tint", "dark"], "default": "light" },
    "size":  { "enum": ["big", "huge"], "default": "huge" }
  },
  "presets": [
    { "id": "calm",   "knobs": { "side": "right", "tone": "light", "size": "big" } },
    { "id": "bold",   "knobs": { "side": "left",  "tone": "dark",  "size": "huge" } }
  ],
  "tokens": { "colors": ["bg", "surface", "ink", "muted", "primary", "onPrimary"], "type": ["display", "lead", "body"] },
  "mobile": { "order": ["headline", "sub", "cta", "note", "photo"], "photo": { "aspect": "4:5", "minHeight": 420 }, "card": "stack-below", "headlineStep": "display-m" },
  "locks": ["structure"],
  "swapGroup": "hero"
}
```

Rules this implies:
- **Slot types are few and shared across the whole catalog:**
  - `text`, `inline` (short rich text), `button`, `image`, `video`, `items[]` (with `min`, `max` and a per-item field schema), `stats[]`, `quote`, `price`, `faqs[]`, `form`, and `group`.
  - Shared slot names (`headline`, `sub`, `cta`, `photo`, `items`…) make remapping between recipes lossless (Relume).
- **`items` declares count bounds and degradation**, for example `"items": {"min": 2, "max": 6, "fields": {...}, "layoutBy": {"2-3": "row", "4-6": "grid-2"}}`. The AI then uses the real number of things (no reflexive threes) and the layout still holds.
- **Each built node carries its binding:** `props.recipe = "hero-split@3"`, `props.slot = "headline"` or `"items[2].title"`, and the section carries `props.knobs`. It's cheap and invisible to users, and it is what makes swap, regenerate-copy and the critic's "fix the headline" precise.
- **Images:** every `image` slot is an `image` node (cover fit, focal point, aspect per device), even when it fills a column edge to edge. Use `backgroundImage` only for `overlay` slots (text over a photo, as in `hero-fullbleed`), and label it "Background photo" in the settings panel so users can still replace it.
- **Floating badges and overlaps:**
  - The badge is a normal element in a slot (`card`) with a declared mobile fallback (`stack-below` or `hide`).
  - Following our V1 behaviours, the user can edit and delete it, and the recipe stays valid because the slot is `optional`.
- **Locks:**
  - `structure` means users can edit, restyle, delete or add elements freely, since that is our V1 behaviour and everything stays editable.
  - The recipe link is only *flagged* as "customised" once someone adds or removes structure.
  - Swap stays available but warns "custom elements will be kept at the end", which avoids Relume's detach dead-end.
- **Presets are the vetted variants.**
  - The AI chooses `recipe + preset`, and may only change knobs within the enum.
  - New presets are added by designers after review, never invented at runtime.

### B3. The AI's contract

1. **Plan** (strict `json_schema`):
   - `sections[]`, each with `job`, `claim`, `proof`, and `component` as an enum of recipe IDs plus `"custom"`, and `preset` as an enum built from the chosen recipe's presets.
   - Generate the enum from the catalog at request time.
   - Use the deal-a-shortlist step from the earlier file: the server offers 2 or 3 candidate recipes per job.
2. **Fill:** one call per section, or batched. The output schema for that section is *that recipe's slot schema*, as a strict JSON schema with `maxLength` and `minItems`/`maxItems`. The validator re-checks limits (lines per device are measured after render) and asks for a rewrite of only the failing slot.
3. **Build** is deterministic code (`buildRecipe(id, preset, knobs, slots)`), with no model involved. That is where premium layout, tokens and mobile rules live.
4. **Custom (last resort):**
   - Allowed only when the plan says `custom` with a reason, for example a comparison table, a form, or a timeline when no recipe exists yet.
   - Built from insert ops with the token linter, the overlap checks and the critic.
   - Log every custom section. Recurring custom patterns become new recipes (the library grows from real demand, which is Puck's design mode loop).
5. **Swap layout:** "Change layout" on a selected section lists the recipes in the same `swapGroup`, rendered live with the *real* content, following our "options must look different" rule.
   - The remap is deterministic: same slot names go across, extra `items` are trimmed with a warning, and missing optional slots are dropped.
   - Missing required slots are filled by one tiny model call, for example a new `sub` when the target needs one.
   - "New look" re-deals tokens and keeps structure. "New layout" re-deals recipes and keeps tokens and copy.
6. **Edit:** user requests on a recipe section become `setSlot`/`setKnob` ops first. Raw `setStyle` is the fallback.

### B4. Why this keeps it premium

Designers make each recipe and preset once, at desktop *and* mobile, and every page inherits that work: a library improvement reaches every page (Relume). The model does what it is good at (choosing, writing, fitting content to limits) and never positions pixels. The critic then judges *choices*: was this the right recipe, preset, image or copy?

---

## Part C. Measuring and improving design quality

### C1. What the evidence says about judges

- **Pairwise beats absolute.**
  - WebDevJudge (654 human-labelled pairs, ICLR 2026): pairwise was about 8 points higher than single-answer grading. The best judges (GPT-4.1 70.3%, Claude 4 Sonnet 70.2%) plateau around 70%, against 84.6% human-to-human agreement.
  - In single-answer mode, **binary rubrics clearly beat Likert scales**. Rubrics raised human agreement from 65% to about 90%.
  - In pairwise mode, plain direct prompting was as good as elaborate guidance, and reasoning models did best with direct prompts.
  - Agentic judges didn't beat static ones.
  - **Code plus screenshots** was best, and removing code hurt more than removing screenshots. For us, send the tree JSON with the screenshots.
- **Selection needs pairwise.** In "When LLM judge scores look good but best-of-N decisions fail" (2026), a judge with global r = 0.47 recovered only 21% of the gain of perfect best-of-4 selection. Pointwise scores tied 67% of the time, and switching to pairwise raised recovery to 61%. Our critic's "keep the best version" step should compare candidates pairwise, not compare their scores.
- **Position bias is real:** swap consistency was 83–90% in WebDevJudge. One 2026 study (21 judges, about 541k judgments) found that test-retest reliability above 0.95 can coexist with position bias above 0.10, and that Cohen's kappa runs 33–41 points below raw agreement. Always judge both orders and count a split as a tie.
- **Vision judges on UI perception** (Luera et al., Adobe, 2025):
  - Pairwise accuracy is only about 60% overall, but reaches about 90% (GPT-4o) and 93% (Claude) when humans see a *large* difference.
  - It is near chance on "Ease of use" and "Comfort".
  - The models underrate "Interesting" but rank it well (r = 0.85).
  - Use judges for clear differences and regressions, not for fine taste calls.
- **Automated aesthetic benchmarks can track human arenas:**
  - ArtifactsBench (Tencent, 1,825 tasks, checklist plus multi-frame screenshots, MLLM judge) reports 94.4% ranking consistency with WebDev Arena and 90.95% pairwise agreement with experts.
  - OpenDesign (840 cases, GPT-5 scores a full-page screenshot on Instruction 40 / Aesthetics and readability 30 / Structure and cohesion 30) reports Spearman 0.98 with the Design Arena ranking across 10 models.
  - These agreements hold *at model level over many tasks*. Per page, a judge is much noisier.
- **Critique quality:** UICrit (983 UIs, 3,059 designer critiques) got +55% from few-shot plus visual prompting. A 2026 comparison still puts it at 0.48 against 0.75 for human designers. Few-shot calibration helps but does not reach designer level.
- **Human benchmarks for tools:** UI-Bench (Aug 2025) used 10 tools, 30 prompts, 300 sites and more than 4,000 expert pairwise judgments, ranked with TrueSkill confidence intervals. Its leaderboard reportedly had Orchids, then Figma Make, then Lovable at the top (secondary). Thirty well-chosen prompts plus pairwise expert votes were enough to separate tools.
- **Practice from evals teams:**
  - Hamel Husain's `validate-evaluator` procedure: about 100 traces per failure mode, balanced pass and fail labels from a domain expert, split train 10–20% / dev 40–45% / test 40–45%; report TPR and TNR; aim for more than 90% and accept no less than 80%.
  - Gamma: user feedback grew past 10K samples, so they built narrow LLM judges per error class (missing content, length coverage, structural completeness, followed instructions) rather than one "quality" judge.
  - Anthropic's harness (covered before): a skeptical separate evaluator, calibrated with few-shot score breakdowns, read its logs where it diverged from humans, hard thresholds.

### C2. Our evaluation methodology

**1. Test set: three tiers.** All tiers are fixed and versioned, and briefs are never edited in place.

| Tier | Size | Runs | Purpose |
|---|---|---|---|
| Smoke | 12 briefs × 1 seed | every prompt/skill/recipe PR (~10 min) | catch breakage |
| Core | 60 briefs × 2 seeds | nightly + before release | decide A vs B |
| Full | 150 briefs × 2 seeds | model switch, monthly | coverage, p10 |

The 60 core briefs are stratified, not random:
- **Page type (about 8):** opt-in or lead magnet, sales page, webinar or event, course, coaching or service, product or e-commerce, membership, thank-you.
- **Industry:** about 15, weighted to the real systeme.io mix (coaches, creators, wellness, fitness, finance, local services, e-commerce, B2B…). Pull it from analytics.
- **Input richness:** a one-line prompt, a full brief, a brief plus logo, a brief plus brand colours, a brief plus a reference URL or screenshot, and a brief plus real photos.
- **Language:** at least 25% non-English (FR, DE, ES, PT, IT), because systeme.io is multilingual.
- **Hard cases (about 15%):** very long names or offers, no photos, five nav links, many testimonials, a sensitive niche, a logo with poor contrast, and RTL if we support it.
- **Real failures:** every thumbs-down or regenerate-after-generation in production becomes a candidate brief (Gamma). Rotate about 10% of the set per quarter, and keep a frozen copy for long-term comparison.

**2. Deterministic checks (free, every run, hard gates).** These come from the DOM and tree after render at 1280 and 390:
- text or button bounding-box overlaps, and text overflowing its parent
- horizontal scroll on mobile
- headline line count per device against the slot limit
- WCAG contrast of text against its real background (sampled pixels for photo backgrounds)
- off-token colours, fonts or sizes
- the number of distinct font sizes and colours
- empty bands taller than half a viewport
- broken images and placeholder or lorem text
- the copy linter's hit count (genre words, "Get started", tricolons)
- the tell detectors (eyebrow over every H2, 01/02/03, three-icon-cards, pill above the hero)
- the share of sections from recipes against custom ones
- schema-invalid ops and repairs
- latency and cost per page

Any hard-gate failure fails that page, whatever the judge says.

**3. Rubric: binary first, graded second.**
- **Binary checks for the judge** (each pass/fail with a one-line reason; these are what WebDevJudge found reliable):
  - one dominant idea in the first viewport
  - the hero image is a real, relevant subject
  - the CTA is visible above the fold
  - the hierarchy is readable at a squint (2–3 masses)
  - the page reads as one system (same rhythm, radii, type)
  - nothing looks broken or cramped on mobile
  - the copy is specific to this business (passes the cover-the-logo test)
  - no fake proof
  - the section order follows the argument
- **Graded (1–5, for trend tracking only):** design quality, originality, conversion clarity. Weighting as in the earlier file (design and originality highest).

**4. Pairwise judging is the decision metric.** For a change A (baseline) against B (candidate), on each brief and seed:
- Inputs: desktop screenshot tiles, mobile tiles, the brief, and the compact tree JSON for each side.
- The judge answers per criterion and overall: `A | B | tie`, each with a reason that points to an element.
- Run both orders. If they disagree, count it as a tie.
- Use a judge model from a **different family than the generator** to avoid self-preference. We generate with OpenAI, so judge with Claude Opus 5.5 / Sonnet 5.5 or Gemini 4 Argon, or average two judges, ArtifactsBench-style.
- Report the B win rate with a 95% Wilson interval, plus per-criterion wins.
- Aggregate several variants with Bradley-Terry (Design Arena's method) when comparing more than two.
- Sample size: 120 pairs (60 briefs × 2 seeds) gives a 95% CI of about ±9 points, so a 60/40 result is significant, but 55/45 needs about 400 pairs. Use the full tier for small expected gains.
- Ship rule: B wins (CI excludes 50%), and B has no hard-gate regressions and no drop in p10 binary pass rate.

**5. Calibration (before trusting the judge, then monthly).**
- Two or three in-house designers label 150–200 pairs from real runs. Include near-ties: Luera shows that judges fail most on small gaps.
- Measure inter-designer agreement first. If designers agree on less than about 75%, the criterion is too vague, so rewrite it.
- For the judge, measure agreement with the majority label (target within about 10 points of human-to-human). For each binary check, measure TPR and TNR on a held-out test split (target ≥ 85%, minimum 80%).
- Read every disagreement. A judge that is too lenient needs a sharper Fail definition, one that is too strict needs a clearer Pass definition (Husain, Anthropic).
- Put 4–6 labelled pairs with written reasons into the judge prompt as few-shot examples, and rotate them so none gets copied.
- Re-run calibration whenever the judge model or the rubric changes.

**6. Human review cadence.**
- **Weekly:** a designer blind-reviews 20 random pairs from the nightly run, plus 20 random production pages, and logs issues by category.
- **Per release:** 10 full pages on desktop and mobile, sign-off by design.
- **Quarterly:** a 30-brief human pairwise session (UI-Bench style) between our current pipeline and two competitors' output on the same briefs. This is our "are we premium?" benchmark.

**7. Production signals (the ground truth that matters):**
- the percentage of generated sections kept unchanged after 24h
- the "change layout" and "regenerate" rate per recipe
- time to publish, and the publish rate of AI pages
- thumbs up or down
- the share of custom sections

Low keep rates on a recipe point to a design or copy problem in that recipe.

**8. Cost (rough, Oct 2026 list prices; check the pricing pages):**
- **Judging:** one pairwise judgment is about 8–12 image tiles plus about 3k tokens of tree, roughly 12–20k input and 1k output tokens. On a mid-price vision model (about $2–3 per M input, $10–15 per M output) that's about $0.05. Both orders double it to about $0.10.
  - Core run (120 pairs): about $12. Full run (300 pairs): about $30. Smoke run: under $1.
  - The 5 graded scores on top add about 30%.
- **Generation:** this dominates. At about $0.10–0.40 per page, a core run (240 pages for A and B) costs $25–100.
- **Total** is about $50–150 per core comparison, cheap next to designer time. Cache the baseline renders, since A rarely changes.

### C3. Improving quality with the eval in place

1. Fix hard-gate failures in code (recipes, linter, repair) before tuning prompts.
2. Improve recipes and presets where production keep rates are low. One recipe fix lifts every page.
3. Tune prompts and the plan stage and compare pairwise; keep only wins.
4. In the review loop, compare candidate revisions pairwise against the current version (keep the best, never just the latest).
5. Test new models on the core tier as soon as they ship (next section).

---

## Part D. Model leaderboards (Oct 2026)

These are snapshots from aggregators, because the official pages render with JS. Check designarena.ai and arena.ai/leaderboard/webdev before deciding anything.

**Arena WebDev** (LMArena / arena.ai, human pairwise votes on web apps; snapshot 23 Oct 2026, via BenchLeader):

| # | Model | Score |
|---|---|---|
| 1 | Claude Opus 5.5 (max) | 1807 |
| 2 | **GPT-6 Astra (max)** | 1774 |
| 3 | Claude Sonnet 5.5 (xhigh) | 1768 |
| 4 | **GPT-6.1 Sol (max)** | 1753 |
| 5 | Claude Fable 5.1 (max) | 1743 |
| 6 | Muse Wonder Full (max) | 1726 |
| 9 | GPT-6 Sol (max) | 1683 |
| 10 | Gemini 4 Argon (high) | 1678 |
| 26 | GPT-5.6 Sol (xhigh) | 1616 |
| 56 | GPT-5.5 (xhigh) | 1513 |

Earlier snapshot: in Aug 2026, Claude Opus 5 led at about 1704.

**Design Arena: Website** (single-file HTML, 4-model blind tournaments, Bradley-Terry, refreshed every 2h; snapshot 20 Oct 2026, via BenchLM):

| # | Model | Elo |
|---|---|---|
| 1 | Muse Wonder | 1360 |
| 2 | Muse Spark 1.3 | 1356 |
| 3 | Kimi K3 | 1336 |
| 4 | Claude Opus 5.5 | 1335 |
| 5 | Claude Sonnet 5.5 | 1324 |
| 6 | DeepSeek V4.1 Flash 1017 | 1323 |
| 7 | **GPT-6.1 Sol** | 1321 |
| 8 | Gemini 4 Argon | 1315 |
| 41 | GPT-5.5 | 1257 |
| 56 | **GPT-5.4 (ours today)** | 1221 |

Earlier snapshots:
- **7 Oct:** Muse Spark 1.3, then Kimi K3, then Claude Opus 5.5.
- **Late July:** Kimi K3 led, followed by GPT-5.6 Sol, Claude Opus 5, GLM 5.2 and Claude Fable 5.

Design Arena has website sub-categories, including **Landing Page**, Corporate and E-commerce, but no separate public table was found.

**LLM Stats Website Arena** (React sites, conservative TrueSkill; 8 Oct 2026): GPT-5.6 Sol led (1415, 416 votes). Its voter pool is small and its ranking differs from the boards above.

What this means for us:
- **The generator is probably our biggest lever after recipes.**
  - GPT-6.1 Sol (released at DevDay on 29 Sep 2026, API id `gpt-6.1-sol`, $2/$10 per M tokens, reportedly near Astra quality at a fifth of the price) sits about 100 Elo above `gpt-5.4` on Design Arena.
  - That is about a 64% expected head-to-head win rate on freeform HTML.
  - GPT-6 Astra ($10/$50) leads OpenAI on WebDev, but costs 5x more.
  - Run both against `gpt-5.4` on the core tier, per stage: plan, fill, critique.
- **Leaderboards measure freeform single-file code, not filling slots in a catalog.** With recipes, much of a model's "taste" moves into our library. Model choice then matters most for **plan** (choosing recipes and presets), **copy**, **custom sections** and **critique**. Our own pairwise eval decides, not Elo.
- Several leaders are from other providers (Claude Opus/Sonnet 5.5, Muse, Kimi K3). Keep the pipeline provider-agnostic at the critic stage. A non-OpenAI judge is also what removes self-preference.
- Leaderboard caveats:
  - Design Arena leaves sampling and token limits to each provider's settings, and doesn't discuss style bias.
  - "The Leaderboard Illusion" (2025) documents selection effects on Arena-style boards.
  - Treat a gap under about 20–30 Elo as noise.

---

## Sources

### Products
- Shopify section schema: https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema | Shopify input settings: https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings
- Shopify theme blocks / schema / static blocks: https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks ; https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema ; https://shopify.dev/storefronts/themes/architecture/blocks/theme-blocks/static-blocks | Shopify preset categories (May 2025): https://shopify.dev/changelog/posts/categories-for-section-and-block-presets.md ; reference theme: https://github.com/shopify/reference-theme
- Shopify Horizon / AI blocks (secondary): https://tympanus.net/codrops/2025/05/21/shopify-summer-25-edition-introduces-horizon-a-new-standard-for-creative-control/ ; https://www.digismoothie.com/de/blog/sidekick-ai-vibe-coding | Webflow props and slots: https://developers.webflow.com/devlink/docs/component-export/design-guidelines/props-slots ; slot restrictions: https://webflow.com/updates/introducing-slot-restrictions ; variants: https://help.webflow.com/hc/en-us/articles/51307110086547-Component-variants ; https://developers.webflow.com/code-components/reference/prop-types/variant ; AI code components: https://webflow.com/updates/ai-code-components
- Framer: https://www.framer.com/dictionary/breakpoint-variant ; https://www.framer.com/dictionary/variant ; https://www.framer.com/updates/february-update-2024 ; https://www.framer.com/solutions/ai-landing-pages/ ; review: https://www.itechguides.com/framer-review-2026-ai-wireframes-and-design-control/ | Relume: https://www.relume.ai/relume-library-mcp ; https://www.relume.io/whats-new/november-2025-release ; detach issue: https://community.relume.io/swapping-out-components-in-figma-after-detaching-them-zsHXkj3jLHSb
- Wix Harmony: https://support.wix.com/en/article/wix-harmony-editor-adding-and-customizing-sections ; https://support.wix.com/en/article/about-the-new-wix-harmony-editor ; https://www.wix.com/blog/wix-ai-tools ; review: https://durable.com/ai-tools/wix-harmony-review | Squarespace Fluid Engine: https://support.squarespace.com/hc/articles/6421525446541 ; https://www.will-myers.com/articles/fixing-the-tablet-spacing-problem-in-squarespace-fluid-engine ; https://www.bigcatcreative.com/blog/squarespace-customize-mobile
- Puck AI: https://puckeditor.com/blog/puck-ai-08 ; https://puckeditor.com/docs/ai/getting-started | Builder.io: https://www.builder.io/c/docs/input-types ; https://builder.io/blog/ai-components ; https://forum.builder.io/t/forcing-the-visual-editor-ai-to-use-only-custom-components/15822
- Canva Magic Design (secondary): https://beginnersinai.org/canva-ai-guide/ ; Gamma cards: https://gamma.app/explore/content/guides/ai-presentation-tool-card-based-layouts

### Evaluation research and practice
- WebDevJudge (ICLR 2026): https://arxiv.org/abs/2510.18560 ; https://arxiv.org/html/2510.18560 | Judge scores vs best-of-N (2026): https://arxiv.org/abs/2603.12520
- Reliability without validity (2026): https://arxiv.org/abs/2606.19544 | MLLM as a UI Judge (Adobe, 2025): https://arxiv.org/html/2510.08783v1
- WiserUI-Bench (A/B-test pairs, position bias): https://arxiv.org/html/2505.05026v4 | ArtifactsBench: https://arxiv.org/abs/2507.04952 ; https://github.com/Tencent-Hunyuan/ArtifactsBenchmark
- OpenDesign / code aesthetics: https://arxiv.org/html/2510.23272v1 | UI-Bench: https://arxiv.org/abs/2508.20410 ; leaderboard via https://benchmarklist.com/benchmarks/ui_bench/
- UICrit: https://arxiv.org/abs/2407.08850 ; PerceptUI (2026): https://arxiv.org/abs/2606.05697 | Hamel Husain validate-evaluator: https://skills.sh/hamelsmu/evals-skills/validate-evaluator
- Gamma + Patronus: https://patronus.ai/case-studies/gamma-scaling-ai-performance-with-automated-evals-and-rigorous-experimentation | Braintrust eval guide: https://braintrust.dev/articles/how-to-eval
- Leaderboard Illusion: https://arxiv.org/pdf/2504.20879

### Leaderboards and models
- Design Arena methodology: https://notes.designarena.ai/methodology/ ; https://www.designarena.ai/about ; https://www.designarena.ai/leaderboard | Design Arena Website snapshot (20 Oct 2026): https://benchlm.ai/benchmarks/designarenawebsite ; https://modelgrep.com/best/design ; https://pub.towardsai.net/which-ai-model-is-best-for-web-design-5-picks-for-2026-6b7b5abfb937 ; https://shaffaybajwa.com/design-arena-ai-guide/
- Arena WebDev snapshot (23 Oct 2026): https://www.benchleader.com/benchmarks/lmarena_webdev ; https://metatext.io/benchmarks/lmarena-webdev ; https://ainexhub.com/benchmarks/webdev-arena/ | LLM Stats Website Arena: https://llm-stats.com/best-ai-for-ui-design
- GPT-6.1 Sol: https://www.deeplearning.ai/the-batch/sol-nearly-eclipses-astra ; https://techenclave.com/news/items/openai-releases-gpt-6-1-sol-for-codex-chatgpt-work-and-the-api ; GPT-6 Astra pricing: https://www.eesel.ai/blog/gpt-6-astra-pricing
