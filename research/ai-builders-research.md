# How the best AI site builders avoid "sloppy" output, and what we should copy

Research date: 23 Oct 2026. Scope: AI site/page builders, Anthropic and OpenAI design guidance, prompt techniques, anti-slop checklists, user complaints. Written for our case: an OpenAI model (currently `gpt-5.4`, see `app/server/ai.ts`) that edits a section > row > column > element tree through JSON ops, with plan / build / review stages already in place.

Reliability note: vendor internals are rarely published. Where a claim comes from the vendor's own docs, prompts, or engineering posts it is marked (primary). Leaked system prompts (v0, Lovable, Same.dev, Orchids) come from the community archive `x1xhlol/system-prompts-and-models-of-ai-tools`. They show real production prompts, but they may be out of date. Review-site claims are marked (secondary).

---

## 0. TL;DR (the five findings that matter most)

1. **The builders with the best output do not let the model design freely.** Relume, Figma First Draft, Webflow, Squarespace, Wix, Durable, Hostinger, Unicorn and Mixo all have the model choose and fill sections or components that human designers made and maintain. The model plans, picks and writes. Designers own the pixels. Relume says it plainly: "The AI doesn't write raw code. It selects from components that Relume's designers built and maintain." Freeform generators (v0, Lovable, Bolt) instead depend on a design-token system plus heavy prompt rules, and they are the ones users call "samey".
2. **Tokens first, then layout.** Every serious tool sets up a small design system before it builds anything: Webflow uses global colour variables, text styles and spacing rules; Lovable puts semantic tokens in `index.css`/`design-system.json` and bans raw colours; v0 allows 3–5 colours and 2 fonts; OpenAI recommends `background/surface/primary text/muted text/accent` plus `display/headline/body/caption`. Components then use only tokens, and a checker flags anything off-token.
3. **Offer a choice of directions before building.** Lovable shows three design directions or asks about palette, type and layout, with swatches and wireframes. Anthropic's docs: "propose 4 distinct visual directions… ask the user to pick one." Stitch shows "multiple design directions." OpenAI suggests a mood board first. This is the most reliable way to break a model's single "house style".
4. **A separate, skeptical critic with a rubric and caps beats self-review.** Anthropic found that "agents reliably skew positive when grading their own work". A standalone evaluator that is tuned to be skeptical, calibrated with few-shot score breakdowns, and that weights *design quality + originality* above craft, steadily pushed output toward distinctive work. Academic work shows the same: a vision critic gave +17.8% over 3 refinement rounds on WebDev Arena.
5. **Bans only move the default.** Banning purple gradients produced cream, serif and terracotta (Anthropic's own docs now list that as a tell), then near-black with acid green, then "broadsheet cosplay". A procedure ("derive the direction from the subject", "deal from a vetted library") holds up better than a list of banned products. Removing tells also leaves an empty page unless something specific to the subject replaces them.

---

## 1. Product by product: what each does that matters

### Relume (relume.ai): library-first planning
- Pipeline: **brief > sitemap > wireframe > style guide > export**. Its page says it can "turn a sitemap into wireframes in one click, generating real components un-styled with copy." (primary)
- Output is assembled from **1,000+ human-designed components** (React/Tailwind/shadcn, Figma, Webflow). "The AI doesn't write raw code. It selects from components that Relume's designers built and maintain." Sites are "responsive, accessible, and SEO/AEO ready by construction." Library improvements reach every site already built on it. (primary)
- The style guide is a separate step: fonts and colours are set once and applied site-wide. (secondary)
- Example briefs on its page list business, audience, goal, trust points, tone, colours and pages. That is a good model for a brief. 2026 additions: a Library MCP, and a design system available inside Claude Design.
- **Lesson:** quality comes from the library plus structure plus a style step that is kept apart from layout. The model's job is to choose the right section for each job and write copy that fits it.

### Figma First Draft (formerly "Make Designs"): curated system plus off-the-shelf LLM
- Built from "off-the-shelf AI models (like OpenAI's GPT-4 and Amazon Titan)" plus Figma's **proprietary design systems with numerous components and assembly examples**. "The AI then selects, arranges, and customizes design system components." Users choose one of 4 libraries, from lo-fi to high-fi. (primary)
- Failure lesson (July 2024): the feature kept producing copies of Apple Weather. The cause was example screens added shortly before launch that "we simply didn't vet carefully enough". **Few-shot and assembly examples get copied closely, so every example must be vetted and varied.** (primary, via 9to5mac)
- First Draft has since been folded into Figma's design agent, which supports re-prompting and bulk edits.

### Webflow AI site builder: design system as output
- Flow: prompt > editable structure (sitemap: add, remove, reorder sections and pages) > "Generate design" > full pages. Multi-page sites are supported since 2026. More than 60,000 sites published. (primary)
- "You're not just generating layouts — you're establishing a design system… Colors are created as global variables, typography is defined through reusable text styles, and layout spacing follows consistent rules." Built on **Flowkit**, Webflow's modular CSS framework, so that "expanding your site doesn't introduce design drift." It also ships baseline animations that can be edited. (primary)
- **Lesson:** two stages (structure first, then design) and a framework of vetted utilities and components.

### Framer (Wireframer, Workshop, Framer Agents)
- Wireframer produces "responsive, purpose-driven but neutral layouts" from a prompt or preset, **creates all breakpoints automatically**, and is restyled afterwards. Workshop generates custom code components "keeping the site's style in mind". (primary or near-primary)
- Framer Agents use **the project's content, structure and styles as context**: "using the project's existing design system". You select a frame, page or component (or attach a screenshot) to scope the change. It can generate layout variations and hero variations "while preserving your styles", produce light and dark themes automatically, and save design-system instructions as reusable "Skills". For responsive work: "ask for an inspection before any edits". Big changes go on a branch for review. (primary/secondary)
- **Lesson:** scoped context (the selection) plus inheriting existing styles plus variations generated on request.

### v0 (Vercel): freeform plus a strict pipeline
- Composite model: retrieval (docs, **UI examples**, project files) > frontier base model (Claude Sonnet 4 in v0-1.5) > **Quick Edit model** for small changes > **AutoFix model** (`vercel-autofixer-01`, RFT-trained) that runs both during and after streaming, plus a linter. (primary)
- Jan 2026 post: they optimise for "% successful generations". LLM code has errors "as often as 10% of the time". They use a **dynamic system prompt** that injects topic knowledge when embeddings or keywords detect intent, keeping the injection stable so it hits the prompt cache. **"LLM Suspense"** rewrites output *while it streams* (for example, invalid icon names are swapped for the nearest real icon via embedding search in under 100 ms). Autofixers finish in under 250 ms. (primary)
- Design rules from its leaked prompt: **"ALWAYS use exactly 3-5 colors total"** (1 primary, 2–3 neutrals, 1–2 accents); "NEVER use purple or violet prominently"; "Avoid gradients entirely unless explicitly asked for"; when gradients are used, analogous colours with 2–3 stops only; **max 2 font families**; body line-height 1.4–1.6; nothing smaller than 14px; mobile-first; `text-balance`/`text-pretty` on titles; **"NEVER generate abstract shapes like gradient circles, blurry squares, or decorative blobs as filler"**; "NEVER use emojis as icons"; icons at 16/20/24px; semantic tokens only ("DO NOT use direct colors like text-white"). Final rule: "Ship something interesting rather than boring, but never ugly." It is told to call a **`GenerateDesignInspiration` tool before any design work**, which returns a design brief: "If you generate a design brief, you MUST follow it."
- **Lesson:** a separate design-brief step whose output is binding, hard numeric limits, and deterministic repair of the model's output.

### Lovable: semantic tokens, design questions, enforcement
- Leaked prompt: "CRITICAL: The design system is everything. You should never write custom styles in components… USE SEMANTIC TOKENS FOR COLORS, GRADIENTS, FONTS". Its first-message procedure: "write what it evokes and what existing beautiful designs you can draw inspiration from", list colours, gradients, animations and fonts, **"Start with the design system"**, then build. It generates images rather than leaving placeholders. A known failure it calls out: "white text on white background".
- Docs (primary, 2026): **Design guidance**. When a prompt leaves the look open, Lovable asks up to 3 design questions, shown visually: palettes as swatches grouped by mood, font pairs each set in its own fonts, and layouts as wireframes (hero grid, split, bento, zigzag, asymmetric and so on). It derives "spacing, corner radius, and animation intensity" from those choices. Earlier versions showed "three lightweight design directions". It skips the questions when the brief is already specific or a design system or template is attached.
- **Design systems** feature: a machine-readable `design-system.json` (tokens, component catalog with variants, props and examples, constraints) that is "read on every generation", plus **"Adherence enforcement… Lovable catches raw colors, custom or customized components, and other deviations."** Design templates copy an approved project. "Knowledge" stores fonts, colours and style keywords so later prompts stay consistent.
- **Lesson:** pick visually, generate from tokens, and enforce the tokens automatically.

### Bolt (bolt.new)
- Freeform code generator in WebContainers. Its open-source prompt contains no design rules. Its quality levers are product features: **Figma frame import** at any point in a project ("spacing, layout, components… all intact", Jan 2026) and Team Templates. Reviewers describe the output as "a recognizable AI-app look that needs a separate design pass". (primary/secondary)
- **Lesson:** without a design system and references, freeform output converges on the shadcn look.

### Same.dev and Orchids (leaked prompts; same patterns)
- Same.dev: "NEVER stay with default shadcn/ui components… **edit** each one of them" before building; "Avoid using purple, indigo, or blue colors unless specified. If an image is attached, use the colors from the image"; "analyze the design of screenshots… and reflect on how to improve". Orchids: a "design system reference" is passed in, and when none is given the agent must first read the existing UI to infer one.

### Wix (AI site generator, Harmony + Aria agent)
- A conversational brief (business, goals) produces a site, theme and layout. You can regenerate the **theme and the layout separately** ("shuffle a layout to apply a different variation") and use "Alternative Layouts" for one-click redesigns of sections. Harmony (Jan 2026) combines vibe-coding with the visual editor. The Aria agent knows the whole site's context. Wix ADI (2016) learned what good sites look like from strong examples and used separate models per layer (colour, layout). Mobile-friendly by design. (primary/secondary)
- **Lesson:** keep theme and layout as independent axes so users can re-roll one without losing the other.

### Squarespace Blueprint AI: curated choices matched to a "personality"
- Flow: brand name plus **personality** (professional, quirky, creative, bold) > pick homepage sections (Intro, Products, Services and so on, with layout variants) > accept suggested pages > **palette chosen from pre-built palettes matched to the personality** > **curated font pairing matched to the personality** > optional copy prompt and writing style > editor. (secondary, consistent across reviews)
- **Lesson:** a personality maps to designer-made palettes and font pairs. The user picks from options, which keeps every result within good taste.

### Durable
- Answers to a few questions (type, name, location) produce a template the AI selects, customised and filled with copy, images and a contact form in about 30 seconds. Any section can be regenerated. Includes an AI brand builder for logos. Reviewers say "design control stops at colors, fonts and section swaps." (secondary)
- **Lesson:** good minimum quality, low ceiling. Speed and safety come from templates, and the output looks generic.

### Hostinger AI builder
- Questionnaire: brand name (a name of 20 characters or fewer gets a generated SVG wordmark logo), site type (decides pages), description of up to 700 characters (drives copy), **style plus three colours (light, dark, accent)**. One review says the AI "maps out a sitemap of the site's pages and sections, then selects the best version for each part." Criticised for limited control and no per-section regeneration. (primary support doc + secondary)
- **Lesson:** a three-colour role model (light, dark, accent) is a simple, robust token input from users.

### 10Web
- Questions produce a multi-page WordPress/Elementor site. It can also **recreate the design of an existing site** from a URL. Reviewer verdict: "perfectly ordinary… overwhelmingly generic", similar to importing a demo, and AI-added pages "don't match the generated site's style." (secondary)
- **Lesson:** pages added later drift from the rest of the site unless a shared token system is enforced.

### Gamma
- Card-based blocks that the AI "pre-assembles" (CEO Grant Lee). The team uses many models (OpenAI, Anthropic, Google, Perplexity) and runs model tests to pick the best output per task. Evals come from 10K+ user feedback samples, LLM judges grading against ground-truth datasets, and Braintrust. Job posts mention "diagnosing failure patterns in AI-generated… websites." (secondary)
- **Lesson:** build an eval set from real user feedback, grade with LLM judges, and choose models per stage based on that evidence.

### Unicorn Platform, Mixo, Dora
- Unicorn: block-based. AI fills a template with copy, CTAs and forms and "suggests content blocks based on page goals". Mixo: a description produces a full site in seconds from templates, with "limited creative freedom". Dora: prompt plus **style choice**, then it shows **two versions to pick from**, with a focus on 3D and animation (alpha). (vendor/secondary)
- **Lesson:** cheap tools use templates and copy filling. Dora's "show 2 versions, pick one" is the only notable quality lever here.

### Google Stitch (bonus, highly relevant)
- "Vibe design": the user describes goals and feelings, and Stitch generates **multiple design directions**. **DESIGN.md** captures tokens, spacing and component rules, can be **extracted from any URL or brand asset**, and is passed to coding agents over MCP. (secondary)

### Cross-product summary

| Lever | Who does it |
|---|---|
| Curated, designer-made section/component library that the AI picks from | Relume, Figma First Draft, Webflow (Flowkit), Squarespace, Wix, Durable, Hostinger, Unicorn, Mixo |
| Freeform generation plus token system plus rules | v0, Lovable, Bolt, Same, Orchids |
| Tokens created before layout | Webflow, Lovable, v0, Relume (style guide), OpenAI and Anthropic guidance |
| Multi-stage pipeline (brief > sitemap > wireframe > style > content) | Relume, Webflow, Squarespace, Hostinger, Anthropic harness (planner) |
| Directions or options shown before building | Lovable, Stitch, Dora, Squarespace (palettes and fonts), Anthropic docs, OpenAI (mood board) |
| Independent axes to re-roll (theme vs layout vs section) | Wix, Durable (section), Framer (hero/layout variations) |
| Deterministic repair or linting of model output | v0 (Suspense, AutoFix), Lovable (adherence enforcement), impeccable/taste-skill (detectors) |
| Screenshot or browser critique loop | v0 (preview success metric), GPT-5.4 plus Playwright, Anthropic evaluator, Same.dev |
| Automatic responsive breakpoints | Framer, Relume ("by construction"), Webflow, Wix |
| Brand assets (logo, colours, URL) | Same (colours from image), 10Web/Stitch (from URL), Hostinger (wordmark), Durable (logo builder), Lovable (design system), Bolt (Figma import) |

---

## 2. Anthropic guidance on frontend design (close to verbatim)

### 2.1 Blog: "Improving frontend design through Skills" (Nov 12, 2025)
- Diagnosis: **"Distributional convergence."** "Safe design choices… dominate web training data. Without direction, Claude samples from this high-probability center." The default is "Inter fonts, purple gradients on white backgrounds, and minimal animations."
- "Claude is highly steerable… Tell Claude to 'avoid Inter and Roboto' or 'use atmospheric backgrounds instead of solid colors,' and results improve immediately."
- **"Prompt at the right altitude"**: avoid both "low-altitude hardcoded logic like specifying exact hex codes" and "vague high-altitude guidance". Map aesthetics to things that can be implemented: typography, themes, motion, backgrounds.
- Typography block (verbatim):
  ```
  <use_interesting_fonts>
  Typography instantly signals quality. Avoid using boring, generic fonts.
  Never use: Inter, Roboto, Open Sans, Lato, default system fonts
  Here are some examples of good, impactful choices:
  - Code aesthetic: JetBrains Mono, Fira Code, Space Grotesk
  - Editorial: Playfair Display, Crimson Pro
  - Technical: IBM Plex family, Source Sans 3
  - Distinctive: Bricolage Grotesque, Newsreader
  Pairing principle: High contrast = interesting. Display + monospace, serif + geometric sans, variable font across weights.
  Use extremes: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.
  Pick one distinctive font, use it decisively. Load from Google Fonts.
  </use_interesting_fonts>
  ```
  "Interestingly, the mandate to use more interesting fonts seems to encourage the model to improve other aspects of the design as well."
- Themes: naming a well-known aesthetic (their example is an RPG theme with palette, borders, textures and typography) works because the model knows these aesthetics in depth.
- The general ~400-token prompt (verbatim, also in the Claude docs):
  ```
  <frontend_aesthetics>
  You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.
  Focus on:
  - Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
  - Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
  - Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
  - Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.
  Avoid generic AI-generated aesthetics:
  - Overused font families (Inter, Roboto, Arial, system fonts)
  - Clichéd color schemes (particularly purple gradients on white backgrounds)
  - Predictable layouts and component patterns
  - Cookie-cutter design that lacks context-specific character
  Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
  </frontend_aesthetics>
  ```
  The ending exists "to prevent Claude from converging to a different local maximum."
- The method generalises: "identify convergent defaults, provide concrete alternatives, structure guidance at the right altitude, and make it reusable."

### 2.2 The original `frontend-design` SKILL.md (v1, Dec 2025): "commit to a BOLD aesthetic direction"
- "Before coding, understand the context and commit to a BOLD aesthetic direction: **Purpose** (what problem, who uses it); **Tone**: pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian…; **Constraints**; **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?"
- "**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity."
- Typography: "Pair a distinctive display font with a refined body font." Spatial composition: "Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density." Backgrounds: "gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays."
- "No design should be the same… NEVER converge on common choices (Space Grotesk, for example) across generations."
- "Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code… Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details."

### 2.3 Current `frontend-design` SKILL.md (rewritten Jun and Sep 2026; anthropics/skills and the claude-code plugin are identical)
Key rules, close to verbatim:
- **Persona:** "Approach this as the design lead at a design studio known for giving every client a distinct visual identity… This client has already rejected proposals that felt cliché or templated… make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take aesthetic risk if justified."
- **Ground in the subject:** identify "one concrete subject, the design's audience, and the design's primary job". "The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from." "Build with the brief's real content."
- **Hero:** "Open with the most characteristic thing in the subject's world… a big number with a small label, supporting stats, and a gradient accent is the default treatment, so only use it if that's truly the best option."
- **Type:** "Typography carries the personality of the page." One or two families, "clearly distinct". "Choose your typefaces deliberately, not the default families you would reach for on any other project." Set a clear type scale following *The Elements of Typographic Style*. "Use the type treatment itself as an active part of the design." **Line length under 80 characters**. Serif body text gets more line-height.
- **Typographic tells to avoid:** "Accenting just a single word or phrase in a headline (italic/bold/different color)"; "Using all caps for labels"; "Adding unnecessary typographic labels above content."
- **"Visual structure is information."** Borders, numbering, eyebrows and dividers must encode something. Use 01/02/03 "only if the content actually is a sequence".
- **Motion:** "A single orchestrated moment… lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated." Motion in response to user actions is welcome.
- **The calibration list of today's AI clusters** (important, because it names the *second wave*): (1) warm cream (#F4F1EA) plus high-contrast serif plus terracotta (#D97757); (2) near-black plus a single acid-green or vermilion accent; (3) broadsheet layout with hairline rules, zero radius and dense columns; (4) **the SaaS-card kit**: identical rounded cards, one radius everywhere, the same rgba(0,0,0,.1) shadow, gradient washes; (5) template chrome: a tracked ALL-CAPS eyebrow above every heading, "A · B · C" meta strings, "WORD — fragment" labels, #0B0B0B in place of black, mono for small labels, "→" appended to links and buttons. "Where the brief pins down a visual direction, follow it exactly… Where it leaves an axis free, don't spend that freedom on one of these defaults."
- **Two-pass process:** first a compact token plan: **Color = 4–6 named hex values; Type = typefaces and roles; Layout = a one-sentence concept plus ASCII wireframes, with alignment guidance; Principles.** "Then review that plan against the brief… if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar)… revise that part, say what you changed and why." Only then build.
- **Restraint:** "Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet." Quality floor: responsive down to mobile, visible focus, reduced motion respected, accessible contrast. "Critique your own work as you build, taking screenshots… a picture is worth 1000 tokens." "Chanel's advice: …remove one accessory." Keep notes on what has been tried so later passes don't repeat it.
- **Copy:** "Words… are design content, not decoration." Write from the user's perspective. Use active voice: "Save changes," not "Submit". Keep one name for an action throughout. "Errors don't apologize." Sentence case, no filler, "each written element do exactly one job."

### 2.4 Claude model docs (Opus 4.8 / Sonnet 5 prompting pages)
- Models have a "consistent default house style". "Generic instructions ('don't use that color,' 'make it clean and minimal') tend to shift the model to a different fixed palette rather than producing variety." Two methods work reliably:
  1. **Specify a concrete alternative** (their example spells out atmosphere, structure, 4px radius everywhere, type character and tracking, a section list, button hover `160ms ease out`, and 5 hex values). "The model follows explicit specs precisely."
  2. **"Before building, propose 4 distinct visual directions tailored to this brief (each as: bg hex / accent hex / typeface, plus a one-line rationale). Ask the user to pick one, then implement only that direction."** This is the recommended way to get variety now that temperature is not available.

### 2.5 Anthropic Engineering: "Harness design for long-running application development" (2026)
- "When asked to evaluate work they've produced, agents tend to respond by confidently praising the work… particularly pronounced for subjective tasks like design." "Tuning a standalone evaluator to be skeptical turns out to be far more tractable than making a generator critical of its own work."
- "'Is this design beautiful?' is hard to answer consistently, but 'does this follow our principles for good design?' gives Claude something concrete to grade against."
- **Four criteria given to both the generator and the evaluator:** *Design quality* ("a coherent whole rather than a collection of parts… a distinct mood and identity"); *Originality* ("evidence of custom decisions… Unmodified stock components — or telltale signs of AI generation like purple gradients over white cards — fail here"); *Craft* (hierarchy, spacing consistency, colour harmony, contrast; "a competence check"); *Functionality*. **Design and originality are weighted higher**, because craft and functionality were already fine by default.
- "I calibrated the evaluator using **few-shot examples with detailed score breakdowns**… reduced score drift."
- The evaluator used Playwright to navigate and screenshot. 5–15 iterations per run. After each evaluation the generator made **"a strategic decision… refine the current direction if scores were trending well, or pivot to an entirely different aesthetic."** A middle iteration was sometimes better than the last one, so keep the best-scoring version, not the latest. The wording of the criteria shapes the output: "museum quality" pushed toward one particular look. "Even on the first iteration, outputs were noticeably better… the criteria and associated language themselves steered the model away from generic defaults."
- Out of the box the evaluator "talk[s] itself into deciding [issues] weren't a big deal". The fix was to read its logs, find where its judgement diverged from a human's, and update the evaluator prompt. Repeat. Use **hard thresholds per criterion**: if any criterion fails, the whole iteration fails.
- "The evaluator is… worth the cost when the task sits beyond what the current model does reliably solo."

---

## 3. OpenAI guidance (our model family; apply directly)

### 3.1 "Designing delightful frontends with GPT-5.4" (OpenAI developers blog)
- "When prompts are underspecified, models often fall back to high-frequency patterns… generic structure, weak visual hierarchy."
- Quickstart: (1) **"Select low reasoning level to begin with"** ("low and medium reasoning levels often lead to stronger front-end results"); (2) **define the design system and constraints upfront**; (3) **provide visual references or a mood board**; (4) **define a narrative/content strategy upfront**.
- Hard rules (verbatim excerpts): "**One composition:** The first viewport must read as one composition." "**Brand first:** …the brand or product name must be a hero-level signal." "**Brand test:** If the first viewport could belong to another brand after removing the nav, the branding is too weak." "**Hero budget:** …only the brand, one headline, one short supporting sentence, one CTA group, and one dominant image." "**No hero overlays:** no detached labels, floating badges, promo stickers, info chips." "**Cards: Default: no cards.** Never use cards in the hero… If removing a border, shadow, background, or radius does not hurt interaction or understanding, it should not be a card." "**One job per section.**" "**Real visual anchor:** …Decorative gradients and abstract backgrounds do not count." "**Reduce clutter:** Avoid pill clusters, stat strips, icon rows, boxed promos." "Ship at least 2-3 intentional motions." "No purple bias or dark mode bias." "Exception: If working within an existing website or design system, preserve the established patterns."
- Principles as numbers: "one H1 headline, no more than six sections, two typefaces maximum, one accent color, and one primary CTA above the fold."
- Narrative: Hero > Supporting imagery > Product detail > Social proof > Final CTA.
- Tokens: `background, surface, primary text, muted text, accent` and roles `display, headline, body, caption`.
- "Keep fixed or floating UI elements from overlapping text, buttons, or other key content across screen sizes."
- "Providing the model with real copy, product context, or a clear project goal is one of the simplest ways to improve front-end results."
- Use Playwright to "inspect rendered pages, test multiple viewports… verify its work visually".

### 3.2 OpenAI `frontend-skill` (in that post; openai/skills)
- **Before building, write three things:** "visual thesis: one sentence describing mood, material, and energy; content plan: hero, support, detail, final CTA; interaction thesis: 2-3 motion ideas." "Each section gets one job, one dominant visual idea, and one primary takeaway or action."
- "Start with composition, not components." "Make the brand or product name the loudest text." "Use whitespace, alignment, scale, cropping, and contrast before adding chrome." "Two typefaces max, one accent color by default." "Default to cardless layouts." **"Treat the first viewport as a poster, not a document."**
- "Headlines roughly 2-3 lines on desktop." "Keep the text column narrow and anchored to a calm area of the image." "If the first viewport still works after removing the image, the image is too weak."
- Imagery: "Imagery must do narrative work… Prefer in-situ photography over abstract gradients or fake 3D objects… Choose or crop images with a stable tonal area for text… If multiple moments are needed, use multiple images, not one collage."
- Copy: "Let the headline carry the meaning. Supporting copy should usually be one short sentence… **If deleting 30 percent of the copy improves the page, keep deleting.**" "Do not include prompt language or design commentary into the UI."
- Litmus checks: brand unmistakable in the first screen; one strong visual anchor; understandable from headlines alone; one job per section; cards actually needed; motion improves hierarchy; "**Would the design still feel premium if all decorative shadows were removed?**"

### 3.3 OpenAI "Frontend prompt instructions" (GPT-5.5 docs page)
- Fit the domain: SaaS and CRM tools should be "quiet, utilitarian"; games can be expressive.
- "Never use a split text/media layout where a card is one side… never put hero text… in a card, never use a gradient/SVG hero page." "For landing-page heroes, make the H1 the brand/product/place/person name or a literal offer/category; put descriptive value props in supporting copy." "Hero content must leave a hint of the next section's content visible."
- "Do not put UI cards inside other cards. Do not style page sections as floating cards… Page sections must be full-width bands or unframed layouts with constrained inner content." "Cards… 8px border radius or less."
- "You do not add discrete orbs, gradient orbs, or bokeh blobs."
- "**Text fits within its parent UI element on all mobile and desktop viewports**… Text must also not occlude preceding or subsequent content." "Match display text to its container."
- "You do not scale font size with viewport width. **Letter spacing must be 0, not negative.**"
- "**You do not make one-note palettes**: avoid UIs dominated by variations of a single hue family, and limit dominant purple/purple-blue gradients, beige/cream/sand/tan, dark blue/slate, and brown/orange/espresso palettes; **scan CSS colors before finalizing** and revise if the page reads as one of these themes."
- "UI elements and on-screen text do not overlap… This is extremely important."

### 3.4 GPT-5 coding cheatsheet and prompting guide
- "Be precise and avoid conflicting information": GPT-5-class models "struggle when asked to follow vague or conflicting instructions." Use XML-like sections. **"Avoid overly firm language"** (ALL-CAPS "be THOROUGH" makes the model overdo it).
- `<self_reflection>`: "think of a rubric… 5-7 categories… do not show this to the user… use the rubric to internally think and iterate… if your response is not hitting the top marks across all categories, you need to start again."
- `<ui_ux_best_practices>` (Cursor-tuned): "Limit typography to 4–5 font sizes and weights"; "1 neutral base and up to 2 accent colors"; "Always use multiples of 4 for padding and margins."

---

## 4. Prompt-engineering techniques that measurably help design

| Technique | Evidence | Note for us |
|---|---|---|
| **Concrete spec over adjectives** ("4px radius everywhere, wide-tracked angular sans, 5 hexes") | Anthropic model docs: "The model follows explicit specs precisely"; generic "make it clean" just moves to another fixed palette | Directions must be token tables, not mood words |
| **Propose N directions, user picks** | Anthropic docs (4 directions), Lovable (3 directions, swatches, wireframes), Stitch, Dora (2 versions), OpenAI mood board | Best fix for one house style; also gives the user control |
| **Plan, then review the plan against the brief, then build** | Anthropic SKILL.md two-pass; v0 binding design brief; Lovable "start with the design system" | The "would a similar prompt arrive here?" check is cheap and effective |
| **Separate critic with a rubric, caps and few-shot calibration** | Anthropic harness; arXiv 2604.05839 (+17.8% over 3 critic rounds on WebDev Arena; fine-tuning got 25% of that gain); ReLook (accept only improving revisions) | Self-review skews positive. Keep the best version, not the last |
| **Screenshot or browser verification** | GPT-5.4 + Playwright; Anthropic ("a picture is worth 1000 tokens"); Same.dev | Desktop and mobile both. Measure overlaps mechanically |
| **Reference-driven generation** (screenshots, mood boards, URL extraction) | OpenAI quickstart #3; Bolt Figma import; Stitch DESIGN.md from URL; Lovable screenshot redesigns | Attached refs become a token sheet first, then a build |
| **Curated few-shot of good sections** | Figma First Draft "assembly examples"; v0 retrieval of "UI examples"; v0 hand-curated example dirs "designed for LLM consumption" | Vet examples (the Apple Weather lesson); rotate them so none gets copied wholesale |
| **Persona with stakes** | Anthropic SKILL.md "design lead… client has already rejected proposals that felt cliché" | Works when combined with concrete rules; on its own it is weak |
| **Ground in real content** | OpenAI ("one of the simplest ways"); Anthropic ("Build with the brief's real content"); taste-skill "write the argument first" | Write copy before layout. A claim per section, each with its proof |
| **Structured outputs / schema-constrained ops** | A2UI and json-render (catalog validation); v0 AutoFix; Lovable design-system.json | Validate against the element catalog; repair deterministically |
| **Low reasoning effort for build** | OpenAI: "low and medium reasoning levels often lead to stronger front-end results" | Spend effort on plan and critique, not build |
| **Dynamic context injection** | v0 dynamic system prompt; Anthropic skills (load only when relevant) | Already done (skill slices); keep the injected text stable for prompt caching |
| **Randomised "dealing" from a vetted library** | taste-skill: "Asked to invent a look, a model picks the category default every time… a script deals three of twenty researched directions" | Choose the shortlist in code, not in the model |

---

## 5. Anti-slop checklists (consolidated from Anthropic, OpenAI, impeccable, taste-skill, practitioners)

### 5.1 Visual tells by "wave" (each ban spawned the next default)
- **Wave 1 (2023–24):** Inter/system fonts; violet or indigo gradients (also on headline text); glowing gradient "Get started" button; glass panels; the same soft grey shadow under every card; three identical icon-in-rounded-square feature cards; emoji as icons; centred headline, subtitle, two buttons, screenshot below; blobs, orbs and bokeh.
- **Wave 2 (2025):** tracked ALL-CAPS eyebrow/kicker above every heading; pill badge above the hero ("New", "Introducing"); one word of the headline in italic, colour or underline; bento grid as the feature section; near-black with one neon accent and a glow; floating blurred pill nav; fake dashboard hero made of grey bars and donuts; pulsing "live" dots; the same fade-and-rise on every section.
- **Wave 3 (2025–26), the "fix" that became the look:** cream plus serif plus terracotta; oversized italic serif as shorthand for "premium"; broadsheet cosplay (hairlines, zero radius, dense columns); performative labels ("Field notes", "Quietly trusted by").
- **Gallery chrome (also generic):** mono micro-labels; 01/02/03 index numbers; hairline boxes everywhere; design-tool ornaments (crop marks, crosshairs); agency meta (local time, coordinates, "©2026 — Scroll", middle-dot strings); tiny scattered uppercase captions. (taste-skill data: tiny tracked caps appear on 16% of top sites vs 57% of weak ones.)

### 5.2 Structural tells
- Hero headline as a full sentence of 3–4 lines (rule: **two lines or fewer at every viewport**; median hero headline is about 5 words).
- Stock section order every time (hero, logos, features, testimonial, pricing, CTA). Fix: "the order of the argument is the order of the page."
- Every section uses the same layout family (rule: no layout word twice in a row, or three times on a page).
- Everything centred (warn when over 72% of text is centred; prefer a left anchor with one centred moment).
- One medium radius (12–16px) on everything; too many font sizes (more than 9 is a warning; target 5, far apart).
- **Everything in threes**: three features, three stats, three steps. "Use the number the content has."
- Invented social proof (logos, quotes, star rows, "10,000+ teams"). Delete any number you can't source.
- Grey boxes, or text where a picture belongs. Fewer than about 4 real images on a visual page.
- Cards nested in cards; page sections styled as floating cards; a coloured `border-left` above 1px on cards; a 1px border plus a wide soft shadow (the "ghost card").
- Gradient text; glass as decoration; zero-offset coloured halos used as "depth".

### 5.3 Copy tells
- Genre words: unlock, unleash, supercharge, elevate, empower, streamline, seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one, blazing fast.
- Mad-lib headlines: "The AI-powered [X] for modern [Y]"; "not just X, it's Y"; tricolon headlines ("Save time. Work smarter. Grow faster.").
- Vague CTAs: "Get started", "Learn more", "Submit". Name the action instead.
- Em dashes as a habit (more than one or two per page reads as a model); captions that describe the design; "Step 1"/"Phase 02" labels; lorem ipsum.
- Micro-typography: curly quotes, a real ellipsis, en dash for ranges, a non-breaking space to prevent orphaned last words, tabular numbers for prices, `text-wrap: balance` on headings, nothing under 13–14px, no centred paragraphs longer than 3 lines.

### 5.4 Motion tells
- An identical fade-up on every block; a dozen staggered hero entrances; hover lift on every card; bounce easing; meaningless infinite loops; reveals that fail and leave a blank band. Use **one** authored moment, exponential ease-out, from a default state that is already visible.

### 5.5 "Removal is not enough"
- "A page with every tell removed and nothing put in their place is an empty page with good manners" (taste-skill). In their blind tests, "a richer page full of template devices beat a cleaner page that was thin, every time." The cure is an idea from the subject, real pictures, committed type and complete content.

### 5.6 What users complain about (reviews, practitioner posts)
- "All look the same": generators "lean on the same default Tailwind and shadcn/ui components… samey 'purple' aesthetic"; "a recognizable AI-app look that needs a separate design pass" (Lovable/Bolt comparisons).
- Generic content: 10Web is "perfectly ordinary… overwhelmingly generic"; Leadpages says AI layouts and copy "based on pre-existing templates… bland, generic pages"; Durable's "AI-generated content may not always be accurate".
- Low control and coarse regeneration: Hostinger "cannot regenerate specific sections"; Durable's control "stops at colors, fonts and section swaps"; content is lost when switching templates.
- Drift: pages added later don't match the style of the generated site (10Web).
- Tells from a YC partner's review of 12 startup sites: purple gradients, floating particles, scroll-hijacked heroes, fade-in on every element.
- Unwanted autonomy: v0's autofix "editing code and creating new versions without consent" (Vercel forum). Auto-repair should be invisible and limited to fixes, never design changes.
- Practitioner advice: **don't re-roll the whole page** ("a longer prompt usually gives another average page"). Critique first (4 or more tells means average), fix **one section at a time** with a specific constraint, and generate variants per section, then pick.

---

## 6. Ranked techniques for our case (AI editing an element tree, OpenAI model)

Ranked by expected impact on "sloppy / not premium / not intelligent", given what `server/ai.ts` already does: 8 directions in `skills/design.md`, plan > build > review stages, one same-model review on a desktop screenshot, build at `low` effort, `json_object` output for plan/check, 14 templates.

**1. Build from a vetted section library ("recipes"), not freeform trees.**
Why: this is the single biggest difference between Relume, Figma, Webflow and Squarespace (premium baseline) and v0/Lovable/Bolt (samey). Our element tree is ideal for it.
How: create 40–80 **section recipes** as JSON subtrees (hero-fullbleed-photo, hero-split-product, proof-quote-wall, offer-stack, comparison, faq-two-col, and so on), each with 2–4 layout variants, designed by us at desktop *and* mobile, token-bound (no raw colours or sizes), with named content slots and limits (headline at most N characters, 3–6 items). Plan picks `recipeId+variant` per section. Build fills slots and may adjust within declared knobs. Allow freeform only for a "custom" section, and only after review. The 14 templates become seeds for this library.

**2. Make tokens the only way to style, and enforce it in code.**
How: a page-level `theme` op (4–6 named colours with roles bg/surface/ink/muted/accent/accent-ink; 1–2 fonts with roles display/body; a type scale of 5 steps with a ratio of at least 3x from body to display; a radius scheme; a spacing scale in multiples of 4 or 8). Elements reference `color:"accent"`, `size:"display"`, never hex or px. A **post-op linter** rejects or repairs raw values, more than 5 colours, more than 2 fonts, negative tracking below −0.02em, body under 14px, and too many distinct font sizes (Lovable's "adherence enforcement", v0's 3–5 colours).

**3. Show 3–4 distinct directions before the first build, rendered on the user's real hero.**
How: in the plan stage the model returns 4 direction cards (bg hex / accent hex / typefaces / one-line rationale / hero recipe), and we render each as a live mini hero with the brief's real headline. Per our "options must look different" rule, check that the directions differ (different bg lightness, type class and hero recipe). One tap picks. Skip when a brand kit exists (Lovable's rule). This is the documented way to break the model's single house style.

**4. Deal the shortlist in code, then let the model choose.**
How: the server samples 3–4 candidate directions from our 8 (plus future ones), weighted by page type and industry fit, with a per-account "recently used" penalty so repeat users don't always get "Quiet Editorial". The model chooses among them and justifies the choice against the subject (taste-skill's "the script deals, you choose"). This prevents convergence without using temperature.

**5. Replace same-model review with a separate skeptical critic: rubric, caps, few-shot calibration.**
How: a dedicated `critique` call (vision, medium effort) with its own system prompt and no access to the build reasoning. Score: design quality 35, originality 25, usability/conversion 25, craft 10, content 5. Add **hard caps** (any overlap means usability ≤ 6; hero headline over 2 lines means overall ≤ 6.5; placeholder or fake proof means content ≤ 5; "could belong to a competitor" means originality ≤ 6; the same layout twice in a row lowers design). Calibrate with 4–6 of our own scored screenshots (good, mediocre, bad) and detailed breakdowns. Output a **ranked list of specific fixes, each tied to an element id**. Build applies them. Up to 2–3 rounds; **keep the best-scoring version**, accept only revisions that improve the score (ReLook). If round 1 scores below 6, **pivot** to a different direction or recipe instead of polishing.

**6. Critique desktop AND mobile, and measure geometry rather than trusting the eye.**
How: send the 1280 desktop and 390 mobile screenshots (several sheets for long pages). Before the critic runs, compute deterministic DOM checks: bounding-box overlaps of text and buttons, text overflowing its parent, headline line count per viewport, contrast ratios, number of distinct left edges, empty bands taller than half a viewport, images that fail to load. Feed the failures to the critic as facts. OpenAI calls overlap "extremely important", and the model is poor at spotting it by eye.

**7. Write the argument (copy) before the layout.**
How: the plan outputs, per section, a *claim* plus its *proof* plus the *one job* (taste-skill and OpenAI's "one job per section"). Use the number of items the content actually has (no reflexive threes). Headline budget: at most ~32 characters for 2 lines on mobile at 44px. H1 = brand or a literal offer; the value proposition goes in the subline (OpenAI 5.5). The section order follows the argument, not the stock order.

**8. A copy linter with auto-rewrite.**
How: deterministic checks on all text props for genre words (unlock, elevate, seamless…), "not just X", tricolons, more than 2 em dashes per page, "Get started / Learn more / Submit", lorem, and unsourced numbers or testimonials. Flag them and ask the model to rewrite only the flagged strings in the product's own language. Sample proof is marked as sample (we already flag AI sample proof, so extend that to stats).

**9. Encode the current tell list as hard rules plus detectors (all waves, not just purple).**
How: in `design.md` "Always", add Anthropic's 5 clusters, OpenAI 5.5's one-note palette bans (purple-blue, cream/sand, slate, espresso), no eyebrows/kickers, no 01/02/03 unless sequential, no single accented word, no pill badge above the hero, no cards in the hero or nested cards, no blobs or orbs, no emoji icons, no gradient text, no identical entrance animation on every section. Back each rule with a tree detector where possible (an eyebrow is a small uppercase text above a headline; 01/02 text patterns; three sibling columns with icon + heading + text). Rules that only live in the prompt get forgotten.

**10. Low effort for build, higher effort for plan and critique; keep build prompts short and specific.**
How: we already use build=low (matches OpenAI). Move the critic to medium. Avoid ALL-CAPS "NEVER" piles (GPT-5 overreacts to firm language) and conflicting rules across `ROLE/OPS/RULES/skills`. Audit them for contradictions, since conflicts degrade GPT-5-class models specifically.

**11. Strict structured outputs for every stage.**
How: switch `json_object` to `json_schema` (strict) for plan, critique and check, and validate build ops against a schema of the element catalog (allowed props per element type, enum tokens). Invalid ops are repaired deterministically (snap the nearest token, clamp values, drop unknown props) before they reach the canvas, like v0's AutoFix and LLM Suspense. Never surface a broken intermediate state.

**12. Brand kit extraction from the user's assets.**
How: when a logo, screenshot or URL is provided, run a dedicated step that outputs a token sheet (dominant and accent colours from the logo, type class guess, radius and density from screenshots). Pass it as `--keep palette,type`: the direction then only decides composition. Same.dev: "If an image is attached, use the colors from the image." Store it in the brief memory so later pages don't drift (10Web's failure).

**13. Real imagery strategy: at least one strong, real-looking anchor image; no abstract filler.**
How: the hero needs a real visual anchor (product, place, person or result) with a calm tonal area for text. Generate images with the direction's colour grade and one shared light and grade per page. Avoid images with text, UI frames or collages. Avoid gradient or abstract "visuals" as the main idea. Run the "remove the image" test: if the hero still works without it, the image is too weak. Logos and screenshots keep aspect 0, as now.

**14. Section-level regeneration and variations, never a whole-page re-roll for quality fixes.**
How: on a selected section, "Variations" produces 3 recipe or variant alternatives that keep its copy and tokens (Framer hero variations, Wix Alternative Layouts). The critic's fixes are applied per section. Practitioners agree that re-rolling the whole page "gives another average page".

**15. Automatic mobile composition per recipe.**
How: each recipe declares its mobile behaviour (stack order, mobile crop or focal point, a smaller display step, hiding decorative media). The AI never hand-tunes mobile unless asked. Our framed 1280 desktop preview remains the main view, and the critic checks the 390 view. (Framer, Relume and Webflow all generate breakpoints automatically.)

**16. Limit the hero, and make it a poster.**
How: a hero recipe contract with brand or offer, one headline (2 lines or fewer), one sentence, one CTA group, one dominant visual. No stats strip, badges, chips or logo cloud in the first viewport. Leave a hint of the next section visible. "Treat the first viewport as a poster, not a document" (OpenAI). The critic's "cover the logo" test: if a competitor's name fits, there is no idea.

**17. One authored motion moment per page.**
How: the motion engine (`render/motion.ts`) gets page-level "signature" presets (one hero entrance sequence plus at most one scroll moment); per-section entrance animations default to off. Reduced motion is respected. This fits our "calm AI motion" principle and Anthropic/impeccable's "one orchestrated moment".

**18. "Spend boldness in one place" as an explicit plan field.**
How: the plan names the single memorable element (a type treatment, a full-bleed photo, a colour field, an unusual proof section). Everything else uses quiet recipes. The critic checks that exactly one thing leads (the squint test: 2–3 large masses).

**19. Variety memory: record what was tried.**
How: store direction, hero recipe and font pair used per page and project. The plan avoids repeating them within an account unless the user's brand requires it (Anthropic: "jot down notes about what you've tried").

**20. A vetted few-shot pool, rotated.**
How: 2–3 complete, approved page trees (from the recipe library) per page type serve as examples, and we rotate which ones are sent. Vet them for resemblance to real brands (Figma's Apple Weather failure). Never send the same single example every time, because it will be cloned.

**21. Build an eval set and gate every prompt or model change on it.**
How: 30–50 fixed briefs (varied industries and page types, some with logos or brand kits). Run the pipeline and score with the calibrated critic plus deterministic checks (overlap count, tell count, token violations, headline lines, image count, time and cost). Track mean and p10. Add real user thumbs-down cases to the set (Gamma's approach: user feedback becomes ground truth, LLM judges grade). Human spot-check 10 pages per release. Without this, "quality tuning" is guesswork.

**22. Separate theme and layout as independent re-roll axes in the UI.**
How: "New look" re-deals tokens (palette, type, radius) on the same structure. "New layout" re-deals recipes and variants with the same tokens and copy (Wix, Squarespace). Users get fast, safe exploration, and each re-roll is a deterministic remap, not a new model generation.

**23. Name aesthetics by reference, not adjective, inside each direction.**
How: each direction in `design.md` gets 2–3 short reference descriptions ("Swiss poster, Müller-Brockmann grid", "Aesop store signage") alongside exact tokens. Anthropic notes that themes the model knows well transfer strongly. Never use words like "museum quality" globally, because criterion wording steers every output toward one look.

---

## 7. Sources

### Anthropic
- Improving frontend design through Skills (Nov 12 2025): https://claude.com/blog/improving-frontend-design-through-skills
- frontend-design SKILL.md (current): https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md ; plugin copy: https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
- frontend-design SKILL.md v1 (Dec 2025, commit 00756142): https://raw.githubusercontent.com/anthropics/skills/00756142ab04c82a447693cf373c4e0c554d1005/skills/frontend-design/SKILL.md
- Claude prompting best practices (frontend section): https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Prompting Claude Opus 4.8 / Sonnet 5 ("Design and frontend defaults"): https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8 , https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5
- Harness design for long-running application development: https://www.anthropic.com/engineering/harness-design-long-running-apps

### OpenAI
- Designing delightful frontends with GPT-5.4 (incl. frontend-skill): https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4
- Frontend prompt instructions (GPT-5.5): https://developers.openai.com/api/docs/guides/frontend-prompt
- GPT-5 for coding cheatsheet: https://cdn.openai.com/API/docs/gpt-5-for-coding-cheatsheet.pdf
- GPT-5 prompting guide: https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide
- Frontend with GPT-5 (archived): https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_frontend
- openai/skills frontend-skill: https://github.com/openai/skills/tree/main/skills/.curated/frontend-skill

### Products
- v0: How we made v0 an effective coding agent (Jan 2026): https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent ; v0 composite model family: https://vercel.com/blog/v0-composite-model-family ; Fireworks autofixer: https://fireworks.ai/blog/vercel ; forum complaint: https://community.vercel.com/t/v0-auto-diagnosis-automatically-editing-code-and-creating-new-versions-without-consent/36431/66
- Leaked prompts archive (v0, Lovable, Same.dev, Orchids, Bolt): https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools
- Lovable design guidance: https://docs.lovable.dev/features/design-guidance ; design systems: https://docs.lovable.dev/features/design-systems ; design templates: https://docs.lovable.dev/features/business/design-templates ; visual edits: https://lovable.dev/blog/introducing-visual-edits ; prompting: https://docs.lovable.dev/prompting/prompting-one
- Relume: https://www.relume.ai/ ; https://relume.io/explore ; reviews: https://durable.com/ai-tools/relume-review , https://www.hackdesign.org/toolkit/relume/
- Figma First Draft: https://www.figma.com/blog/figma-ai-first-draft ; https://help.figma.com/hc/en-us/articles/23955143044247 ; Apple Weather incident: https://9to5mac.com/2024/07/19/figma-explains-why-ai-kept-making-copies-of-apples-weather-app/
- Webflow AI site builder: https://webflow.com/blog/ai-site-builder ; https://webflow.com/ai-site-builder ; https://help.webflow.com/hc/en-us/articles/38840145286035
- Framer: https://www.framer.com/academy/lessons/generating-layouts-with-ai-using-wireframer ; https://www.framer.com/academy/lessons/framer-agents-generation-layout-style ; https://framer.university/blog/the-new-ai-workflow-for-building-websites ; https://www.createwith.com/tool/framer/updates/framer-agent-now-generates-new-website-layouts-while-preserving-your-styles
- Bolt: https://bolt.new/blog/import-figma-frames-into-existing-bolt-projects ; https://www.banani.co/blog/bolt-new-ai-review-and-alternatives
- Wix: https://support.wix.com/en/article/wix-editor-creating-an-ai-generated-site ; https://creativebloq.com/web-design/web-hosting-builder/wix-reinvents-web-creation-with-new-harmony-ai-website-builder ; https://www.fastcompany.com/3060934/can-you-teach-ai-to-design-wix-is-trying ; https://openai.com/index/wix/
- Squarespace Blueprint: https://ecomm.design/using-squarespace-blueprint-ai/ ; https://ecommerce-platforms.com/articles/squarespace-blueprint-ai ; https://tech.co/news/how-squarespace-is-changing-ai-with-design-intelligence
- Durable: https://www.techradar.com/pro/software-services/durable ; https://www.websiteplanet.com/website-builders/durable/
- Hostinger: https://support.hostinger.com/en/articles/7266945-how-to-use-hostinger-ai-website-builder ; https://websitebuilderexpert.com/website-builders/hostinger-website-builder-review
- 10Web: https://themeisle.com/blog/10web-ai-builder-review/
- Gamma: https://thenextweb.com/news/gamma-grant-lee-profitable-ai-startup ; https://patronus.ai/case-studies/gamma-scaling-ai-performance-with-automated-evals-and-rigorous-experimentation ; https://careers.gamma.app/research-engineer
- Unicorn Platform: https://unicornplatform.com/blog/unicorn-platform-landing-page-ai-creator ; Mixo: https://www.mixo.io/features/ai-website-builder ; Dora: https://www.toolsforhumans.ai/ai-tools/dora-ai , https://designtrends.beehiiv.com/p/dora-ai-no-code-3d-website-builder
- Google Stitch / DESIGN.md: https://www.abduzeedo.com/vibe-design-google-stitch ; https://noqta.tn/en/blog/google-stitch-vibe-design-ai-ui-tool-2026
- A2UI: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/ ; json-render: https://deepwiki.com/vercel-labs/json-render/4.2-catalog-api

### Research
- Vision-guided iterative refinement for frontend code generation (arXiv 2604.05839, ICLR 2026 workshop): https://arxiv.org/abs/2604.05839
- ReLook: vision-grounded RL with a multimodal critic (arXiv 2510.11498): https://huggingface.co/papers/2510.11498
- Visual prompting with iterative refinement for design critique (arXiv 2412.16829): https://arxiv.org/html/2412.16829v1
- Retrieval-augmented GUI generation (arXiv 2412.11328): https://arxiv.org/html/2412.11328v1

### Practitioner anti-slop checklists and complaints
- impeccable (Paul Bakaus), craft-floor and critique: https://github.com/pbakaus/impeccable
- taste-skill v2 (tells registry, critique passes and caps, copy rules; study of 247 gallery sites): https://github.com/leonxlnx/taste-skill
- How to fix AI slop in web design, tell by tell: https://capitalandcompute.net/blog/fix-ai-slop-design/
- Fix a generic AI landing page: https://superdesign.dev/blog/fix-generic-ai-landing-page
- Lovable vs Bolt vs v0 output look: https://superdesign.dev/blog/lovable-vs-bolt , https://techsy.io/blog/lovable-vs-bolt-vs-v0
- Generic AI landing pages: https://www.leadpages.com/blog/free-ai-landing-page-generator ; https://evartology.substack.com/p/a-complete-guide-5-simple-steps-to-build-awesome-web-apps-sites-that-doesnt-smell-ai
