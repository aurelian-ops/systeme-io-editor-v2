# AI page builder audit (editor V2)

23 Oct 2026. Read-only audit of `app/server/ai.ts`, `app/server/skills/*.md`, `app/src/editor/ai/*`, `recipes.ts`, `structure.ts`, `render/*`, the selection code (`canvas/Canvas.tsx`, `canvas/Overlay.tsx`, `tree.ts`, `panels/Inspector.tsx`), checked against `research/*.md`. No code was changed. Line numbers are as of today.

Short verdict: the pipeline looks right on paper (plan, recipes, a separate critic, measured facts, a shoot brief). Three things undo it in practice:
1. The recipes and the prompt store meaning in places the editor cannot reach (column styles, motion, gradients).
2. The critic judges a page drawn without its fonts and without its photos.
3. The instructions are about 11-12k tokens per stage. They contradict themselves and still teach the old template and freeform paths next to the recipe path.

---

## 1. Architecture as it is

```
Composer ──runAI(opts)──────────────────────────────────── client: ai/run.ts
  │  upload attachments → /api/upload → brief.assets[{url,note}]         (run.ts:191-205)
  │  route: generate | planned | bigChange(regex, English only) → PIPELINE, else EDIT  (run.ts:103-106, 284)
  │
  ├─ PIPELINE (sequential; each box is one POST /api/ai = one OpenAI Responses call)
  │   [plan]  json_object, effort medium ──► remember + plan(+shoot) + ask(questions/4 directions)
  │      │       └─ questions? stop; answer → runAI(planned) → plan AGAIN (unless only "photos")  (run.ts:289-295)
  │   [build] JSONL stream, effort low ──► say/title/theme/recipe/insert/setProps… applied live
  │   fillPhotos() starts (4 parallel /api/photo; first photo of each person first)   (run.ts:853-911)
  │   lookAt(desktop) ‖ lookAt(mobile): offscreen PageView, wait 900ms, DOM facts, JPEG  (inspect.tsx:20-47)
  │   [critique] json_schema strict, effort low, 2 screenshots ──► scores + ≤8 fixes   (ai.ts:473-486)
  │   total ≥ 7.5 and no facts? skip : [review] JSONL stream, effort low, 2 screenshots + critique
  │
  ├─ EDIT  [edit] JSONL stream, effort low (medium if images attached)           (ai.ts:460)
  ├─ CHECK [check] json_object, effort medium + desktop pageShot                  (run.ts:280-283)
  └─ VARIATIONS [variations] JSONL, effort low → options for selected text

finish(): tidy → fixStructure + keepOrder + cleanCopy → fillPhotos → pending Before/After  (run.ts:339-360, 798-842)

server: ai.ts  instructions = ROLE + OPS + RULES + STAGE[stage] + skillsFor(stage)   (ai.ts:459)
               context      = stage, stepType, brief JSON, plan JSON, device, selection, compact page JSON,
                              MEASURED FACTS, critique, request; + last 16 history messages; + images (detail auto)
               /api/photo   = photoPrompt(shoot brief + "img:" moment) → gpt-image-2.5-flare medium, cached by hash
```

What each stage actually does:

| Stage | Model / effort | Input it really gets | Output | Notes |
|---|---|---|---|---|
| plan | gpt-5.4 (default, `ai.ts:309`), medium | ~11k-token instructions; brief; empty or compact page | brief, questions, 4 directions, plan (pageType, look, shoot, leads, sections with recipe/job/claim) | Not streamed: the user sees "Understanding your request" for the whole call. With answers it often runs a second time. |
| build | low | ~12k tokens; plan JSON; page | JSONL ops. The prompt asks for recipes, but OPS also teaches `addSection` templates and freeform NODEs | Copy, layout and theme in one long stream. This is the longest call. |
| critique | same model, low | ~10.5k tokens, **including OPS/ROLE (edit-op syntax and "JSON Lines only")**; page JSON; 2 JPEGs; facts | scores, total, leads, fixes[id,device,problem,fix] | Same model as the builder; only the prompt differs. No few-shot calibration. Effort is low, though the research says medium. |
| review | low | ~12.7k tokens; critique; same 2 JPEGs | JSONL fixes + final reply | One pass. No re-score, no keep-best. Almost always runs, because the bar is 7.5 from a critic told to be strict. |
| edit | low | ~11.8k tokens for any edit, even "make it bigger" | JSONL | No verification at all. |
| photo | gpt-image-2.5-flare, medium | structured prompt; optional anchor via `images.edit` | one JPEG | Column backgrounds are always asked for at aspect 1.5 (`run.ts:859`). |

Timings: the code does not store any. The server logs `[editor-ai] <stage> Xs` (`ai.ts:469`), but nothing persists them. Estimates from the call shapes:
- plan: 30-70s
- build: 60-150s (4-8k output tokens)
- lookAt: about 2-3s
- critique: 20-40s
- review: 30-90s
- photos: 6-12 images at about 20-45s each, 4 at a time, overlapping review. Anchor photos run as a first wave before the rest start (`run.ts:909-910`).

That adds up to the reported **3-6 minutes**. A question round adds a user wait plus another plan. Every LLM call is strictly sequential.

---

## 2. Root causes of each complaint

### 2.1 "Fine but not wow / template-y SaaS"
- **One house style for every brand.** All 17 recipes hard-code one design language: `sectionOf` paddingY 144 (`recipes.ts:93`), H2 56px (`:74`), lead 21px muted (`:79`), the button (`:83-87`), hairlines, and a 12% primary tint (`:65`). The knobs only flip side, tone and size. Direction density, radius and type scale (e.g. Kinetic "paddingY 80-112, radius 0-4", `design.md:122`) never reach a recipe. Only the theme op changes between pages, so pages differ by fonts and colours, not by composition.
- **The plan defaults every coach/course/wellness page to `hero-split`** (`ai.ts:95`, `ai.ts:113`), and that hero is a 50/50 split (`recipes.ts:178`), which `design.md:21` itself calls the template look ("Avoid 50/50 for hero splits").
- **Recipes build in the tells the critic penalises.**
  - `features-rows` hard-codes 01/02/03 on non-sequences (`recipes.ts:389`; tell #13, `design.md:62`).
  - The recipe copy schema puts `eyebrow` first for every section (`ai.ts:93`), which gives "an eyebrow above every heading" (`design.md:60`, critic cap at `ai.ts:184`).
  - Every recipe adds motion (`recipes.ts:119,172,201,227,254,267,290,314,337,362,374,393,417,467,481,509,517`), which gives "the same fade on every block" (`design.md:55`).
- **Direction text pushes the banned palettes.** Soft Ritual = Fraunces + oat/sand + clay (`design.md:110`) and Quiet Editorial = serif + warm off-white (`design.md:100`). These are exactly the "cream + serif + terracotta" tell that caps originality at 4 (`design.md:58`, `ai.ts:184`).
- **No dealt shortlist, no variety memory, no few-shot pool.** The model picks the direction, fonts and hero itself every time (plan prompt `ai.ts:150-160`), so it converges on its favourites.
- **The critic's design and originality scores come from a screenshot with fallback fonts** (`skipFonts: true`, `inspect.tsx:37`). The single biggest premium lever (type) is invisible to the loop that is meant to raise quality (see 2.9).

### 2.2 Duplicate photos / the same photo reused
- **The shoot brief over-constrains every photo** to "one real place for the whole shoot", one light and one camera (`ai.ts:158`, applied word for word in `ai.ts:264-271`). Same person, same room, same lens and same grade come out looking like the same picture.
- **Later photos of a person are `images.edit` calls on the first photo** (`ai.ts:380-382`). Image edit keeps composition strongly, and the "do not copy its pose…" line (`ai.ts:263`) is weak against that. A coach page puts `[maya]` in most photos, so most photos are edits of one image.
- **Framing variety is a fixed six-item rotation by index** (`run.ts:874,884`), not planned per slot. The first photo gets none.
- **Markers are de-duplicated by exact string** (`run.ts:856-858`). Two slots with the same `img:` text share one file, and the model often reuses a description (hero and about).
- **The server cache is global** (hash of prompt|size|anchor, `ai.ts:373`). A new page with a similar brief can get last week's file.
- Nothing checks the output: no perceptual hash, no "two photos too similar" fact.

### 2.3 English template text on an Arabic page
Fixed English strings live in the code paths the live AI uses:
- **normalizeNode defaults:** form fields "First name"/"Email address", `buttonText` "Get instant access", button "Get started" (`run.ts:959-962`).
- **formChildren:** placeholders = English labels, "Submit" (`blocks.ts:485,491`).
- **Recipes:** fit-list "This is for you if" / "This is not for you if" (`recipes.ts:480`), hero-optin form labels (`recipes.ts:285`), and the photo alt fallback (`:89`).
- **addSection / replaceSection are still accepted live** whenever `copy` exists (`run.ts:579`). The section merges the model's partial copy over `ctx.copy` = `makeCopy(...)`, the **English offline copy** (`run.ts:179,675`), so every missing list (features, testimonials, faqs, plans) comes back in English. OPS still documents these ops in full (`ai.ts:39-40,66-74`) and RULES still demands their lists (`ai.ts:134`). Only BUILD forbids them (`ai.ts:174`), so the edit and review stages use them freely.
- **cleanCopy replaces placeholder names with English names** ("Maya R.", "Daniel S.", `run.ts:827`). Its detectors are English-only regexes (`run.ts:828-829`).
- **Routing is English-only.** `bigChange` (`run.ts:105`) means an Arabic or French "redesign the page" goes to the one-pass low-effort edit stage: no plan, no recipes, no critic.

### 2.4 Wrong ordering
- **`insert` never updates `ctx.lastSectionId`** (`run.ts:421-453`), but `recipe` places itself after `ctx.lastSectionId` by default (`run.ts:492`).
  - Build sequence: recipe A, custom FAQ appended at the end, recipe B. B lands after A, i.e. **before** the FAQ.
  - In edit and review stages, `lastSectionId` starts at the last section, often the footer (`run.ts:180`), so new recipes land after the footer.
- `keepOrder` only repairs `close-cta` (`run.ts:817-825`). The plan's order is never enforced in code, even though the plan holds it.

### 2.5 Placeholder names and unflagged invented proof
- `conversion.md:26` asks for illustrative proof "with natural names … `sample: true`". The `sample` flag is only set automatically for template sections (`run.ts:583`).
- **Recipe proof (`proof-quote`, `proof-numbers`) is built from headline/text nodes, never `quote`/`stat`**, so invented testimonials and numbers ship **unflagged as real**. That is a trust and legal risk (FTC rule, cited in `conversion.md:25`).
- RULES says "real-sounding numbers" (`ai.ts:135`), which invites invention.

### 2.6 Nested cards
- **OPS tells the model to make cards as styled columns** (`ai.ts:57`). The design.md bento recipe nests "a nested row of two stacked cards" inside a card column (`design.md:187`).
- The flattening only handles `quote` and `price` inside a boxed parent (`run.ts:438-441,970-973`). Any other card in a card survives.
- `normalizeNode` turns a model's `contentbox` back into a column (`run.ts:946`). `fixColumns` then re-boxes card-looking columns outside rows (`structure.ts:29-33`), which can create a contentbox inside a card column.
- **Contentbox always draws a 1px edge ring when it has no border** (`elements/contentbox.tsx:41`). "Soft, borderless" recipe cards (`recipes.ts:158-159`) render outlined, so a card on a tinted block reads as a box in a box.

### 2.7 Low-contrast sections
- **No contrast check exists anywhere:**
  - `sanitizeTheme` validates colour syntax only (`run.ts:996-1008`).
  - The model-declared `onAccent` "4.5:1" is trusted (`ai.ts:150`).
  - `measure()` has no contrast fact (`inspect.tsx:51-94`), although the research lists it (agent-reliability §3).
- **RTL inverts the scrims.** Page direction flips automatically for Arabic (`PageView.tsx:100-122`), so grid columns swap. The hero-fullbleed and photo-band gradients are hard-coded "dark on the left" (`recipes.ts:195,512`), so the text sits on the light side of the photo. The breakout margins `[0,-44,0,44]` (`recipes.ts:244`) push the wrong way.
- The critic never sees the photos behind text (2.9), so it cannot catch any of this.

### 2.8 Structures the user cannot select or edit
See section 3. In short: rows act as one (an approved V1 behaviour), so **columns are never selectable**. Yet the recipes and OPS put meaning in column styles: the photo, the colour block, chips, hairlines, minHeight and sticky.

### 2.9 The plan/critic loop sometimes makes things worse
- **What the critic sees is not the page:**
  - The offscreen render uses `editable` (`inspect.tsx:26`), so planned photos show grey "Creating photo…" boxes with their prompt text (`PageView.tsx:1190-1205`, not filtered at `inspect.tsx:38`).
  - Section background photos are stripped (`PageView.tsx:255`).
  - Fonts are skipped (`inspect.tsx:37`).
  - The critique runs while the photos are still being made (`run.ts:301-305`).
- **The critic's page JSON leaves out the layout:** `compact()` keeps only fontSize, textAlign, color, background and paddingY, plus props (`run.ts:64-80`). No colWidths, backgroundImage, motion, minHeight, overlay or column styles. Fixes aim at a page the model cannot see.
- **The review applies up to 8 fixes at low effort with no re-score and no keep-best** (`ai.ts:189-192`, `run.ts:312`). A worse result is kept.
- **Review is told two opposite things:** "never replace or remove recipe sections" and "remove repetition … delete the weaker one", and "if total < 5, rebuild … with a different structure" (`ai.ts:190-191`). That is a freeform rebuild from a low score that was caused by missing fonts and photos.
- **Misrouted image fixes:** a `setProps {src}` aimed at a photo column creates a new 160px image at the top of that column (`run.ts:616-631`) instead of changing the background.
- The 7.5 skip bar (`run.ts:309`) is rarely met by a critic told models "praise their own work, be strict" (`ai.ts:180`). So the risky pass nearly always runs.

### 2.10 Slow builds (3-6 min)
- Four sequential calls, each with 10-13k instruction tokens (section 5), plus page JSON and two images for critique and review.
- **Plan and build both write the copy.** The plan already holds every section's recipe, job and claim, then build re-writes all of it as long JSONL.
- Plan is not streamed. A question round re-plans.
- Photos start only after build. Anchors run as a separate first wave (`run.ts:909`). `quality:'medium'` at 1.3 MP (`ai.ts:369-383`).
- The edit stage carries the whole skill set (Patterns + Motion + Copy toolkit) for a one-word change.

### 2.11 Weak mobile decisions
- **Recipes stack the visual first on phones when `side` is left:**
  - `hero-optin` defaults to visual first (`recipes.ts:278,291`), so the cover plus padding (~550px) sits above the headline and **the opt-in form falls below the first phone screen**, against `conversion.md:61`.
  - The same happens in `hero-split`/`proof-quote` with side left (`recipes.ts:178,340`) and `offer-steps` (default left, `:427,441`).
  - No `reverse` is set.
- **Mobile H1 sizes are explicit overrides, so the smart cap is bypassed.** `H1` sets mobile = max(40, size/2) (`recipes.ts:68-70`), giving 60px for hero-bigtype huge (`:221`) and 52px for fullbleed. `responsive.ts` would cap a level-1 headline at 40, but only when no override exists.
- **Mobile is only verified after a full pipeline build.** Edits never get a mobile check. Header checks only run if the first section holds a menu (`inspect.tsx:87-88`). There is no tablet check.

### 2.12 Logo not reused
- No header or footer recipe exists. The logo is placed only if the model chooses to build a custom header **and** remembers `brief.logo`, which needs a `remember` op (`ai.ts:118`). `logo` is not in the plan's memory field list (`ai.ts:128-129`).
- Uploads are stored as `{url, note}` with no role (`run.ts:204`). On later turns the model sees URLs, not pixels, so it cannot tell which one is the logo.
- The Memory panel shows a "Logo" tag but has no way to set it (`Memory.tsx:123-132`).
- Funnel guidance says "no navigation" (`conversion.md:7`), so plans often skip the header, and the logo with it.

### 2.13 Recipes underused
- **The prompt sells three paths at once:**
  - OPS: "Use insert/replace with custom NODEs when the templates don't fit … Vary layouts" (`ai.ts:64`).
  - BUILD: "Prefer custom structures … when they serve the section's job better" (`ai.ts:177`).
  - Against those: "Every plan section that names a recipe is built with op recipe" (`ai.ts:169`) and "custom only for what no recipe covers" (`ai.ts:114`).
- **The plan lists FAQ and "for / not for" as custom examples** (`ai.ts:160`), but `faq-split` and `fit-list` exist.
- **`design.md` Patterns re-teaches the same sections as freeform trees** (split hero, bento, zig-zag, sticky steps, fit list, number strip; `design.md:179-199`). It is sent to build, review and edit.
- **A recipe op without a string `headline` is silently dropped** (`run.ts:476`), and the model never hears about it.
- The catalogue lacks header, footer, about/founder, testimonial wall, pricing tiers, guarantee, comparison, form band and thank-you steps, so most pages need 2-4 freeform sections anyway.

---

## 3. Editability audit

How selection works today:
- A click on a column picks its row (`Canvas.tsx:298-301`).
- "Select parent" and Esc skip columns (`tree.ts:107-111`).
- Breadcrumbs hide columns (`tree.ts:103-105`, `TopBar.tsx:42`).
- The column corner tabs only set vertical align (`Overlay.tsx:818-860`).
- There is no Layers panel (`LeftPanel.tsx:149-170`).

So `ColumnSettings` (`Inspector.tsx:521-546`) is reachable only by accident (an AI step link, the command palette). **Any style on a column is, for the user, uneditable.** `fixStructure` keeps columns inside rows untouched (`structure.ts:13`), so it does not help.

| Pattern the AI or recipes produce | Where | What the user experiences | Editable equivalent |
|---|---|---|---|
| Photo as a column `backgroundImage` (+ minHeight 760) | `recipes.ts:170` hero-split, `:338` proof-quote; OPS allows it (`ai.ts:59`) | Cannot click, replace or crop the photo. The "Add image" placeholder selects the row. Row Inspector "Background image" sets the row, not the column. With "I'll add my own", the live page shows an empty 760px half (`PageView.tsx:384-389`, `css.ts:62`). | An `image` element with a new **fill mode** (height 100% of the row, object-fit cover, focal point), plus the minHeight on the row. |
| Colour block behind a visual (column background + radius + pad) | hero-breakout `recipes.ts:249-252`, hero-optin `:280` | The block colour, radius and padding cannot be reached. | A Content box (no header) holding the image, or a row background. |
| Chips as styled columns (pill background) | hero-event `recipes.ts:305` | Only the text inside is selectable. The pill look is stuck. | Chip/badge element, or a list with a "chips" style. |
| Hairline dividers and padding on columns | proof-numbers `:359`, features-list `:372`, fit-list `:479`, proof-quote byline `:335` | Lines and spacing cannot be changed or removed. `hasLook` wraps them in a one-column row (`structure.ts:36`), but the look stays on the unreachable column. | A `divider` element above each item, or the border on the row. |
| Cards as styled columns inside rows | OPS `ai.ts:57`; design.md bento `:187`, comparison `:189`, pricing `:195` | The card background, border, shadow and radius cannot be edited. Clicking empty card space selects the row. | Content box (as `floatCard`/`card` already do, `recipes.ts:134-159`). Make it the only card primitive the AI may emit. |
| Tinted words column (`background: TINT`) | hero-split `recipes.ts:176`, proof-quote `:335` | Cannot change or remove. | Section background, or a Content box. |
| Column `minHeight`, section `minHeight` | `recipes.ts:170,197`; OPS split screens `ai.ts:56` | No minHeight control in any Inspector group (grep finds none). | Expose "Min height" in Size and position for section and row. |
| Overlay as a CSS **gradient** | hero-fullbleed `recipes.ts:195`, photo-band `:512` | The Inspector "Image overlay" is a solid colour picker (`Inspector.tsx:375`). A gradient cannot be shown or edited, and picking a colour destroys it. It is also wrong in RTL. | An overlay control with "Even / Darker on one side" + side (logical start/end) + strength. |
| `props.motion` (enter, stagger, parallax, sticky, custom keyframes) | every recipe; design.md Motion `:203-225` | **No UI** ("there is no animation panel", `design.md:203`). Nothing shows on the canvas (`PageView.tsx:203`). The user cannot see, change or remove it except by asking the AI. | A small Motion group in the Inspector: preset, off, speed, plus a page-level "motion: calm/off". |
| `scroll: 'sticky'` on columns | features-list `:376`, offer-steps `:440`, faq-split `:492` | Unreachable on a column. Three sticky recipes on one page break "never two sticky sections" (`design.md:181`). | A row-level "keep side in view" option. Recipes may use it once per page. |
| `style.layer` (z-index) and `style.delay` | floatCard `recipes.ts:145,153`, breakout image `:246` | No control. | Hide them as internal details, or add "Bring forward" in the element menu. |
| Negative margins (breakout, floating card) | `recipes.ts:151,244,249`; design.md `:183-184` | Editable (Spacing allows negatives, `settings/kit.tsx:309-310`) but fragile: in RTL they point the wrong way, and the mobile override can be lost. | Keep, but make RTL-aware (logical start/end) or replace with an "overlap" knob. |
| Section `sticky` (props) | OPS `ai.ts:84` | Editable (Inspector Sticky group). | OK. |
| `img:` markers on images | everywhere | Editable: the image is selectable and the upload replaces it. On a column or section background, see the first row. | OK for images. Never use `img:` on column backgrounds. |
| `upload:N` and `brand:visa` src | `run.ts:742-751`, `ai.ts:60` | Resolved before insert, so editable. `upload:N` only works for the current turn. | `asset:<id>` references (agent-reliability #1). |
| Recipe identity (`props.recipe`) | `run.ts:538` | Not shown. "Layouts" variations exist (`canvas/Variations.tsx`) but have no button. If wired, they would rebuild recipe sections with the old English templates (`ai/extract.ts:82-92`, `dnd.ts:56-58`). | Variations should re-deal recipe knobs and variants, keeping the copy. |
| Column-in-column, section-in-section, contentbox from the model | `run.ts:946,965-968`, `structure.ts:21-41` | Repaired silently. The model's ids and keys no longer match what exists. | Strict schema plus validator feedback (agent-reliability #3/#4). |

---

## 4. Gaps against the research

### ai-builders-research.md §6

| # | Technique | Status | Evidence |
|---|---|---|---|
| 1 | Vetted section library | **Partly** | 17 recipes; knobs only, no visual variants; token-free px and hex (`recipes.ts:453-462` #FFFFFF/#171717); no header, footer, about, testimonials, pricing tiers or guarantee; freeform still taught (`ai.ts:64,177`, `design.md:179-199`). |
| 2 | Tokens enforced in code | **Not done** | No linter. Any hex or px passes. `sanitizeTheme` checks format only. |
| 3 | 3-4 directions before building | **Done (mostly)** | Plan returns 4 (`ai.ts:150`). Shown as LookCards with a sample headline (`AiThread.tsx:234-260`), not on the real hero. |
| 4 | Deal the shortlist in code | **Not done** | The model picks freely. |
| 5 | Separate skeptical critic | **Partly** | Separate call, rubric and caps (`ai.ts:180-188`). Same model, low effort, no few-shot, one round, no keep-best or accept-if-better. "Pivot" exists only as a prompt line. |
| 6 | Desktop + mobile with measured geometry | **Partly** | Overlap, overflow, H1 lines, <14px text, header height, sideways scroll (`inspect.tsx:51-94`). Missing: contrast, tap targets, empty bands, first-screen CTA, image similarity. The screenshots lack fonts and photos. |
| 7 | Argument before layout | **Done** | Plan sections have job, claim, proof (`ai.ts:160`). |
| 8 | Copy linter | **Not done** | `cleanCopy` handles English placeholders only. |
| 9 | Tell detectors in code | **Not done** | Prompt only, and recipes create tells. |
| 10 | Effort split, short prompts, no conflicts | **Partly** | Effort split done (`ai.ts:305`), but the critic is low. Prompts are long and conflicting (section 5). |
| 11 | Strict structured output everywhere | **Partly** | Only critique is strict. Plan and check use `json_object`. Build is free JSONL. |
| 12 | Brand kit from assets | **Not done** | |
| 13 | Real imagery strategy | **Partly** | Shoot brief, casting, anchors, framing. Missing: post-grade, similarity check, HTML covers and UI (hero-optin and showcase generate text-less "covers" and "apps" as photos, `recipes.ts:279,266`). `proof-quote` with a photo generates a testimonial face, which the image research says never to do. |
| 14 | Section-level variations | **Not done** | Text rewrites only. The layout variations popover is unwired and template-based. |
| 15 | Automatic mobile per recipe | **Partly** | Recipes carry mobile overrides and `responsive.ts` auto-adapts. Order and sizes are wrong in places (2.11). |
| 16 | Hero is a poster | **Partly** | In prompt and critic. `hero-event` chips and floating cards contradict it. |
| 17 | One motion moment | **Not done** | Motion on every recipe. Up to 3 sticky and 2 parallax per page. |
| 18 | Boldness in one place (plan field) | **Done** | `plan.leads`, critic `leads`. |
| 19 | Variety memory | **Not done** | |
| 20 | Rotated few-shot pool | **Not done** | `recipeDemo.ts` exists but is not used as an example. |
| 21 | Eval set gating changes | **Not done** | No eval harness in the repo. |
| 22 | Theme and layout as separate re-roll axes | **Not done** | |
| 23 | Name aesthetics by reference | **Done** | "References:" in each direction. |

### agent-reliability-research.md §0

| # | Change | Status | Evidence |
|---|---|---|---|
| 1 | Persistent asset library | **Partly** | `brief.assets{url,note}`, max 20 (`run.ts:778-782`). No ids, roles, intake or colours. `upload:N` is still used. |
| 2 | Model sees devices | **Partly** | `style_mobile`/`style_tablet`, menu `burger` (`run.ts:73-77`). Layout styles are missing from `compact()`. |
| 3 | Strict tool calls | **Not done** | Free JSONL plus `parseLoose` (`run.ts:706-739`). |
| 4 | Validator results back to the model | **Not done** | Bad lines are skipped silently (`run.ts:264-266`). Recipes are dropped silently (`:476`). Repairs are invisible. |
| 5 | Verify on 3 devices, at most 2 passes, keep best | **Partly** | 2 devices, 1 pass, no keep-best. Only after a pipeline build, never after edits. |
| 6 | Responsive baseline in code | **Partly** | `responsive.ts` smart engine, bypassed by explicit recipe overrides. |
| 7 | Page state doc + rolling summary | **Partly** | Brief with decisions. No `rejected`, no change log with ids, no summary (last 8 turns as text, `run.ts:754-764`). |
| 8 | Router by request type | **Partly** | English regex plus `mode`. No medium-effort structural-edit class. |
| 9 | Detail in layers + `get_nodes` | **Not done** | The whole compact page goes to every stage. |
| 10 | Regression evals | **Not done** | |

---

## 5. Contradictions, duplication and prompt bloat

### Contradictions
GPT-5-class models resolve these unpredictably. Each one below is sent together in at least one stage.
1. **Output format.** ROLE "JSON Lines only" (`ai.ts:26`) goes to every stage. Plan and check say "Return one JSON object" (`ai.ts:146,196`), and critique runs under a strict schema.
2. **Recipe vs freeform:**
   - `ai.ts:114` and `:169` say recipes first.
   - `ai.ts:64` and `:177` say prefer custom NODEs and "Vary layouts".
   - `design.md:179-199` teaches the freeform builds of the same sections.
   - `ai.ts:160` names FAQ and for/not-for as custom.
3. **Templates:** BUILD says "Never use addSection" (`ai.ts:174`). OPS documents addSection, replaceSection, KIND, variants and copy fields (`ai.ts:39-40,66-74`). RULES says "Always send every list the chosen variant shows" (`ai.ts:134`). BUILD itself says "addSection templates fill every copy field…" (`ai.ts:171`).
4. **Hero size:**
   - Headline: `design.md:12` says 56-80px; recipes use 72-120px (`recipes.ts:173,188,221,265`).
   - Split: `design.md:21` says avoid 50/50; hero-split is [1,1] (`recipes.ts:178`).
   - Section titles: `design.md:12` says 40-48; `H2` is 56 (`recipes.ts:74`).
   - Buttons: `design.md:25` says 48px with a 15-16px label; recipe buttons are about 56px with 17px (`recipes.ts:84`).
5. **First screen:** `design.md:45` "no badges, chips, stat strips" vs `conversion.md:9` "a one-line proof" in the first screen vs hero-event chips (`recipes.ts:302-310`) vs Premiere "date + time" chips.
6. **Motion:** "one orchestrated moment" (`ai.ts:176`, `design.md:204`), "never two sticky, more than one parallax" (`design.md:181,224`), Quiet Editorial "no parallax" (`design.md:104`). All of these are broken by the recipe defaults.
7. **Tells the system itself prescribes:**
   - 01/02/03 is banned (`design.md:62`), but `features-rows` and `offer-steps` hard-code it.
   - Eyebrows above every heading is a tell, but the recipe copy schema leads with eyebrow.
   - Cream + serif + terracotta is a tell, but Soft Ritual and Quiet Editorial defaults point there.
8. **Em dashes** are banned (`ai.ts:135`, `conversion.md:22`). conversion.md examples use them (`:33,79,99,112,145-147`).
9. **Proof:** "real-sounding numbers" (`ai.ts:135`) vs "never invented numbers" (`ai.ts:103`, `conversion.md:26`).
10. **Review:** "never replace or remove recipe sections" vs "delete the weaker one" vs "rebuild with a different structure if < 5" (`ai.ts:190-191`).
11. **Cards:** "Cards: use a column with style {background…}" (`ai.ts:57`) vs "Cards are not the default … never cards inside cards" (`design.md:46`) vs the editor's "only Content boxes are reachable cards".
12. **Small text:** "Reassurance 12-14px" (`conversion.md:35`) vs "never body under 16px" (`design.md:15`) vs the critic cap "text under 14px" (`ai.ts:186`).
13. **Language:** "Write in the language the request is written in" (`ai.ts:137`). The code then injects English defaults (2.3).

### Duplication
- The recipe catalogue is typed twice: `ai.ts:94-112` and `recipes.ts` `use`/`knobs`. `recipeGuide()` (`recipes.ts:543-547`) exists but is unused, so they will drift.
- The variations rule appears twice in the variations stage (`ai.ts:141` and `:200`).
- "One card, no card in card" appears in OPS, BUILD, design Always, design Patterns and the critic. Hero and poster rules appear in design Always, conversion Always, the critic and the plan.

### Bloat
Instructions only. Context (page JSON, plan, critique, images) comes on top. Figures assume pageType sales and the Quiet Editorial direction, at about 4 characters per token.

| Stage | ROLE+OPS+RULES | Stage text | Skills | Total |
|---|---|---|---|---|
| plan | 21.4k chars | 4.7k | 17.9k | **~11.0k tok** |
| build | 21.4k | 2.1k | 25.5k | **~12.3k tok** |
| critique | 21.4k (irrelevant op syntax) | 2.0k | 18.8k | **~10.5k tok** |
| review | 21.4k | 0.9k | 28.4k | **~12.7k tok** |
| edit (any tweak) | 21.4k | 0.4k | 25.5k | **~11.8k tok** |
| check | 21.4k | 0.6k | 19.9k (design "Always" sent too) | **~10.5k tok** |
| variations (3 rewrites) | 21.4k | 0.3k | 6.2k | **~7.0k tok** |

OPS alone is 18k characters (~4.5k tokens), sent to every stage. A new page spends about 46k instruction tokens before any context. Prompt caching helps only the shared ~5.4k-token prefix.

---

## 6. The 10 most important problems, ranked
Ranked by impact on premium + intelligent + editable + fast.

**1. Meaning is stored where users can't reach it (column styles, motion, gradient overlays, minHeight).**
- Impact: editable (it breaks trust), and premium, because users cannot fix the 10% the AI got wrong.
- Fix direction: write an **editability contract**. The AI and recipes may only emit what the Inspector can show and change.
  - Add an image "fill" mode and move the hero-split and proof-quote photos into image elements.
  - Make Content box the only card and block primitive. Replace column hairlines with dividers or row borders.
  - Add a Min height control and a side-aware overlay control.
  - Add a small Motion group, or remove motion from recipes.
  - Enforce the contract in `fixNode`: reject column backgrounds, column backgroundImage and column borders and convert them deterministically. Add a unit test that every recipe passes "every visible style is reachable from a click".

**2. The critic judges a page drawn without fonts or photos, then a low-effort, no-rollback review acts on it.**
- Impact: intelligent and premium (the loop makes pages worse).
- Fix direction:
  - Render the critic's view in non-editable mode with fonts embedded (load the Google Fonts CSS as a data URL for html-to-image) and wait for the photos (or a neutral tone, never "Creating photo…" text).
  - Send layout styles in the page JSON.
  - Effort medium for the critic. Cap fixes at 3-5, ranked.
  - **Re-score after the review and keep the better version.** Forbid structural rebuilds from the review; route them to a recipe swap instead.

**3. One house style in the recipes.**
- Impact: premium and wow.
- Fix direction:
  - Make recipes read direction tokens (density, radius family, type scale, image radius, motion personality) from the theme, so Kinetic and Quiet Editorial differ in composition, not just colour.
  - Give each recipe 2-3 *visually distinct* variants (per the "options must look different" rule).
  - Remove built-in tells: no automatic 01/02, eyebrow optional and rare, motion off by default with one page-level signature moment.
  - Grow the library to cover header (with logo), footer, founder, testimonial wall, pricing tiers, guarantee, comparison, opt-in band and thank-you steps, so freeform is truly rare.

**4. The prompt teaches three generators at once, at ~12k tokens a stage.**
- Impact: intelligent (conflicts degrade GPT-5) and fast.
- Fix direction:
  - Build instructions per stage from parts. The critic and check get no OPS.
  - Delete addSection, replaceSection and template docs from live prompts, and the Patterns section from design.md.
  - Generate the recipe list from `recipeGuide()`.
  - Resolve the 13 contradictions in section 5 (one source of truth for sizes: the recipe code).
  - Target ≤4-5k instruction tokens for build and edit and ≤2k for variations. Keep the stable prefix first for caching.

**5. Slow sequential pipeline with double copywriting.**
- Impact: fast.
- Fix direction:
  - Have the plan output **recipe + knobs + final copy per section**, streamed. The client builds recipe sections deterministically as each arrives, with no build call for them.
  - Run one small parallel call per custom section only.
  - Start photos as soon as each section's markers exist.
  - Stream the plan's reply line. Skip the second plan when an answer only changes the look or photos (already partly done).
  - Run critique on desktop and mobile in parallel with photo creation, but only after the hero photo lands.
  - Expected: under 90s to a complete first page.

**6. English leaks and English-only logic.**
- Impact: premium and intelligent for non-English users (systeme.io is heavily FR, ES, PT and AR).
- Fix direction:
  - Never merge `makeCopy` into live output. Refuse addSection live, or make it fail closed.
  - Move every fixed UI string (form labels, placeholders, fit titles, default buttons) to a locale table keyed by `brief.language`, or require it from the model.
  - Use locale-aware name pools and placeholder detectors.
  - Replace the `bigChange` regex with the model's own routing (or a cheap classifier).
  - Make RTL-aware recipes (logical start/end for gradients, margins and photo "text side").
  - Use Arabic-capable fonts in directions.

**7. No deterministic quality gates, and the model never hears what was repaired or dropped.**
- Impact: intelligent and editable.
- Fix direction:
  - Add linters after each op, with results fed back (tool results or one repair turn):
    - WCAG contrast for theme pairs and rendered text-over-background (including scrims)
    - nested cards
    - duplicate or near-duplicate photos (perceptual hash)
    - unflagged proof: set `sample` on recipe quotes and numbers when `brief.proof` is empty
    - copy tells (em dash, hype words, wrong-language strings, placeholders)
    - dropped recipes
  - Then move to strict function tools per op (agent-reliability #3/#4).

**8. Section order is not enforced.**
- Impact: intelligent (visible sloppiness).
- Fix direction:
  - Every op that creates a section carries the plan's section index (or name). Code places it by plan order.
  - `insert` updates `lastSectionId` like `recipe` does.
  - Edit and review default to "after the selection" or "before the footer", never "after the last section".

**9. Photos repeat and fight their slots.**
- Impact: premium.
- Fix direction:
  - The plan assigns each photo slot a distinct shot type and sub-location ("hands on keyboard, kitchen table, close-up"), not one place for all.
  - Use the anchor only for identity, and only for 1-2 portraits; detail and object shots must not be edits of the anchor.
  - Generate at the slot's real aspect (column photo ≈ 0.85, not 1.5), and compute it from the rendered box.
  - Run a similarity check with one regeneration.
  - Make the cache key page-scoped.
  - No generated faces for testimonials. Build covers and UI in HTML with the real title.

**10. Assets and logo are not first-class.**
- Impact: intelligent (the user's own brand is ignored).
- Fix direction:
  - Use `doc.assets` with id and role, plus an intake call on upload (role, description, colours) and a "Set as logo" action in Memory.
  - Add a deterministic header recipe (logo + optional single button) that the plan includes whenever `brief.logo` exists, even on funnel pages. Footer the same.
  - Add a turn-end check: an attached asset that is neither used nor mentioned triggers one follow-up.
  - Gate all of this with a 30-50 brief eval set (including Arabic and French, logo in turn 1 and used in turn 3, opt-in on mobile). Measure time, tells, contrast failures, unreachable styles and critic score per change.
