# Making the editor AI reliable: valid edits, assets, mobile, memory, depth

Research date: October 2026. Scope: the systeme.io Editor V2 AI (`app/server/ai.ts`, `app/src/editor/ai/run.ts`), which streams JSON Lines of operations from gpt-5.x through the OpenAI Responses API.

---

## 0. The short version (ranked by impact for us)

| # | Change | Fixes | Effort |
|---|---|---|---|
| 1 | **Persistent asset library** (`doc.assets` with stable ids, roles, colours) that goes into every request. Stop using `upload:N`, which only works for the current turn | Logo sent twice, ignored images | S-M |
| 2 | **Let the model see devices**: add tablet/mobile overrides, `hidden` and menu props (`burger`) to the page JSON, and teach the menu/burger and device rules in the prompt | Desktop nav never becomes a burger, crowded mobile header | S |
| 3 | **Strict tool calls instead of free JSON lines**: one function tool per op, `strict: true`, and a recursive schema whose containment rules match the editor (section > row/element, row > 1-4 columns, column > row/element) | Structures the editor can't edit | M |
| 4 | **Validator results go back to the model.** Each tool call returns `{ok, error, hint}`, and the model repairs inside the same loop. Today bad lines are dropped silently | Invalid edits, half-applied edits | M |
| 5 | **Verify on three devices**: render 1280/820/390, run cheap DOM checks (overflow, tap targets, header height, font sizes, overlap), then one vision check with a rubric on mobile and desktop. Allow at most 2 fix passes | Weak mobile results, broken layouts | M |
| 6 | **Responsive baseline in code** (stack rows, scale type and spacing, burger above 3 links), with the model handling only the exceptions | Mobile quality, fewer tokens | M |
| 7 | **Page state doc** (brief + brand + decisions + rejected + change log with ids), plus a rolling summary of older turns | Forgets context in long chats | S-M |
| 8 | **Route by request type** (answer / quick / structural / multi-section / new page), with reasoning effort matched to each: low for quick edits, medium for structural ones, plus a short plan and a verify pass | Shallow edits | S |
| 9 | **Detail in layers**: the whole page as an outline, the selection in full detail, and `get_nodes` for anything else | Tokens, wrong-id edits, selection scoping | M |
| 10 | **Regression evals** built from real failures (logo, burger, crowded header…), graded by the same lints | Stops regressions | S |

---

## 1. What the code does today (why the symptoms happen)

- **Free JSON Lines with silent repair.** `ai.ts` streams `output_text.delta`. `run.ts` repairs each line with `parseLoose` and skips anything malformed (`/* skip a malformed line */`). `normalizeNode` fixes structure after the fact: it drops unknown types, wraps row children in columns, and filters out a section inside a section. The model never hears that an op was rejected or changed, so it can't repair it, and the structure it thinks it built differs from what exists.
- **Images live for one turn only.** `upload:N` maps only to `opts.images` of the current request. `historyFor` tells later turns "[attached 1 image]" with no id, role or content. Images are removed from saved turns (`store.ts:319`), and are re-sent only when the previous turn was `answered`. That is exactly the "send the logo twice" bug.
- **The model can't see mobile.** `compact()` sends only desktop `fontSize, textAlign, color, background, paddingY`. It leaves out `tablet`/`mobile` overrides, `hidden`, layout props, image src, and menu props. The prompt never mentions the menu's `burger` prop (`types.ts:308`). The RULES even say "Only target tablet or mobile when the user talks about that device." The review screenshot is desktop only (`pageShot` grabs `[data-device="desktop"]`).
- **Edits get little reasoning and no check.** `EFFORT.edit = 'low'`. The review/verify pass runs only after a full build. Rules like "change only what they asked… never rewrite" with no "finish the knock-on changes" rule push the model to the smallest possible edit.
- **Memory.** The `brief` + `remember` design is the right base. But history is the last 8 turns as text, and the steps hold labels, not node ids, so older decisions fall away.

---

## 2. Making invalid output impossible

### 2.1 What OpenAI strict mode guarantees and where it stops (current docs)

- **Two ways in.** `text.format: {type:"json_schema", strict:true, schema}` shapes the reply itself. Function tools with `strict:true` shape the tool arguments. OpenAI's guidance: use function calling when the model is acting on your system. The Responses API *tries* to make tool schemas strict when `strict` is omitted, but falls back silently to non-strict if it can't. **Always set `strict: true` explicitly.**
- **Supported:** string, number, boolean, integer, object, array, enum, `anyOf`, `const`, `$defs` + `$ref`. **Recursion is supported**, either `"$ref": "#"` or `#/$defs/x`. Also `pattern`, `format` (date-time, email, uuid…), `minimum/maximum/multipleOf`, and `minItems/maxItems`.
- **Hard rules:**
  - The root must be an object, not `anyOf`. A Zod discriminated union at the root is rejected, so wrap it: `{ops:[…]}`.
  - Every object needs `additionalProperties:false` and must list **every** property in `required`. "Optional" means the type includes `null`.
  - Unsupported: `allOf`, `not`, `if/then/else`, `dependentRequired`, `patternProperties`. Sending an unsupported schema with `strict:true` is a hard error.
- **Limits:**
  - 5,000 object properties in total and 10 levels of nesting.
  - 120,000 characters across all property names, def names, enum and const values.
  - 1,000 enum values in total. A single enum with more than 250 values may not exceed 15,000 characters.
- **Key order follows the schema.** Put `op` first, then ids, then content. That way a streamed op can be routed early.
- **Latency:** the first request with a *new* schema pays a one-off compile cost, and later identical schemas are cached. So keep schemas static. Per-request enums of real node ids are possible, but every distinct schema pays that cost again.
- **When the output may not match the schema anyway:** refusals (a `refusal` content part) and `status: incomplete` (max_output_tokens). Check both before parsing.
- **Streaming:** with `text.format`, you receive the one JSON object as deltas and need an incremental parser to act on each op as it arrives. With function tools, each call arrives as `response.output_item.added` → `response.function_call_arguments.delta` → `...done`. **A finished function call is a complete, schema-valid op that can be applied right away.** That is the same live-build feel we have today, with no repair parser.
- **Tool count:** aim for fewer than 20 active functions. Use `tool_choice: {type:"allowed_tools"}` to narrow tools per stage without breaking the prompt cache. Tool search / `defer_loading` is available on gpt-5.4+.
- **Alternative: grammar-constrained custom tools.** GPT-5.x custom tools take a Lark or regex grammar, so the output must match a DSL. This is useful if we wanted to keep a compact line format. But JSON Schema tools give typed args and are better documented. Community threads question whether CFG conformance is fully guaranteed. **Recommendation: function tools with JSON Schema.**

### 2.2 The pattern the strong products use

- **tldraw agent starter kit.** Each action is a Zod schema with a `_type`, a title and a description. The model sees a screenshot plus simplified shapes ("Blurry" for the viewport, "Focused" in full detail for shapes in focus, clusters for off-screen shapes). Every action passes through `sanitizeAction()` before it is applied, which can fix it or cancel it (`return null`). Helpers like `ensureShapeIdExists` / `ensureShapeIdIsUnique` catch made-up ids. Streamed actions are applied only once `action.complete`. Modes (for example a "reviewing" mode) swap the available actions, and `schedule()` queues follow-up steps.
- **Vercel v0.** Composite pipeline: retrieval, a frontier model, an **AutoFix model that checks the stream mid-flight**, a final pass, and a linter. Even then the best error-free rate is about 94% (v0-1.5-md), against 59-78% for raw frontier models. Lesson: **schema + validator + repair**, never one layer alone. Small edits go to a fast "Quick Edit" model.
- **Figma First Draft / Make.** The model *selects, arranges and customises design-system components* rather than drawing freely. Make kits and attachments bring in the design system and project context. Builder.io Visual Copilot / Fusion map output onto your existing components. Google Stitch exports to Figma with Auto Layout intact. Common thread: **the output vocabulary is the editor's own components, so every result is editable.**
- **JSON Whisperer (EMNLP 2025).** When LLMs edit JSON with patches, they miss related updates and get array index arithmetic wrong. Keying arrays by **stable ids** instead of indices fixes it, with 31% fewer tokens than regenerating and quality within 5%. For us: never ask the model for "index 3". Use `after: <siblingId>` / `parent + position`, which we mostly do already.

### 2.3 Recommended design for us

1. **One strict function tool per op.** Use `parallel_tool_calls: true` so it can emit many in one turn. Apply each call on `function_call_arguments.done`. Then send back a `function_call_output` per call, and let the model continue in the same response loop (`previous_response_id` keeps reasoning across tool calls, as OpenAI recommends for GPT-5).
2. **Containment rules in the schema** (expressible with `$defs`):
   - section → row | element
   - row → 1-4 columns (`minItems 1, maxItems 4`)
   - column → row | element (`minItems 1`, so no empty containers)
   - elements are leaves

   That makes "a structure the editor can't edit" impossible to emit.
3. **Style and props as typed patches.** An open `props:{…}` is impossible in strict mode (`additionalProperties:false`). A full nullable style object would force about 80 `null`s per op. Instead use **lists of key/value entries with an enum of keys** (`StyleKey`), or per-element-type prop objects for the few elements with special props (menu, form, image, button…).
4. **Every node carries `mobile` and `tablet` (required, nullable).** The model has to make a decision for each device on every container it creates. Writing `null` is fine, but forgetting is no longer possible.
5. **The validator stays and talks back.** Keep `normalizeNode`, and also return what it changed, for example `{"ok":true,"id":"n_812","changed":["wrapped 2 elements in columns"]}`. Return errors in words the model can act on: `{"ok":false,"error":"n_44 is a row; rows only hold columns","hint":"insert into n_45 or n_46"}`. Reject made-up ids, ids outside the selection, and assets that don't exist.
6. **Scope with dynamic enums only when the set is small.** For a selection edit, an enum of the selection subtree ids (fewer than 200) makes out-of-scope ids impossible. Don't do this per request for whole pages, because each new schema pays the compile cost. Check in the validator instead.

### 2.4 Example strict schema shape (tool `insert_node`, plus the shared `$defs`)

Notes: `$defs` is shared by all write tools. Enums are trimmed here; the real `StyleKey` enum comes from `types.ts`.

```json
{
  "type": "function",
  "name": "insert_node",
  "description": "Insert a new structure. parent: a section id, column id, or 'page' (then node must be a section). Returns the new ids.",
  "strict": true,
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["parent", "after", "node"],
    "properties": {
      "parent": { "type": "string", "description": "existing section/column id, or 'page'" },
      "after":  { "type": "string", "description": "sibling id, 'start' or 'end'" },
      "node":   { "anyOf": [ { "$ref": "#/$defs/section" }, { "$ref": "#/$defs/row" }, { "$ref": "#/$defs/element" } ] }
    },
    "$defs": {
      "styleEntry": {
        "type": "object", "additionalProperties": false, "required": ["k", "v"],
        "properties": {
          "k": { "type": "string", "enum": ["fontSize","textAlign","color","background","paddingY","paddingX","gap","maxWidth","radius","direction","hidden","width","order"] },
          "v": { "anyOf": [ { "type": "string" }, { "type": "number" }, { "type": "boolean" } ] }
        }
      },
      "styles": {
        "type": "object", "additionalProperties": false, "required": ["desktop", "tablet", "mobile"],
        "properties": {
          "desktop": { "type": "array", "items": { "$ref": "#/$defs/styleEntry" } },
          "tablet":  { "anyOf": [ { "type": "array", "items": { "$ref": "#/$defs/styleEntry" } }, { "type": "null" } ] },
          "mobile":  { "anyOf": [ { "type": "array", "items": { "$ref": "#/$defs/styleEntry" } }, { "type": "null" } ] }
        }
      },
      "section": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "style", "children"],
        "properties": {
          "type": { "const": "section" },
          "key": { "type": ["string", "null"], "description": "temp name to refer to this node later in the turn" },
          "style": { "$ref": "#/$defs/styles" },
          "children": { "type": "array", "minItems": 1, "items": { "anyOf": [ { "$ref": "#/$defs/row" }, { "$ref": "#/$defs/element" } ] } }
        }
      },
      "row": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "style", "children"],
        "properties": {
          "type": { "const": "row" }, "key": { "type": ["string", "null"] }, "style": { "$ref": "#/$defs/styles" },
          "children": { "type": "array", "minItems": 1, "maxItems": 4, "items": { "$ref": "#/$defs/column" } }
        }
      },
      "column": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "style", "children"],
        "properties": {
          "type": { "const": "column" }, "key": { "type": ["string", "null"] }, "style": { "$ref": "#/$defs/styles" },
          "children": { "type": "array", "minItems": 1, "items": { "anyOf": [ { "$ref": "#/$defs/row" }, { "$ref": "#/$defs/element" } ] } }
        }
      },
      "element": { "anyOf": [ { "$ref": "#/$defs/headline" }, { "$ref": "#/$defs/button" }, { "$ref": "#/$defs/image" }, { "$ref": "#/$defs/menu" } ] },
      "headline": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "text", "level", "style"],
        "properties": { "type": { "const": "headline" }, "key": { "type": ["string", "null"] }, "text": { "type": "string" },
          "level": { "type": "integer", "enum": [1, 2, 3, 4] }, "style": { "$ref": "#/$defs/styles" } }
      },
      "button": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "text", "variant", "style"],
        "properties": { "type": { "const": "button" }, "key": { "type": ["string", "null"] }, "text": { "type": "string" },
          "variant": { "type": "string", "enum": ["primary", "secondary"] }, "style": { "$ref": "#/$defs/styles" } }
      },
      "image": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "src", "alt", "aspect", "style"],
        "properties": { "type": { "const": "image" }, "key": { "type": ["string", "null"] },
          "src": { "type": "string", "pattern": "^(asset:[a-z0-9-]+|img:.+|brand:(visa|mastercard|amex|discover|paypal|applepay|stripe))$" },
          "alt": { "type": "string" }, "aspect": { "type": "number", "enum": [0, 0.8, 1, 1.5, 1.78] }, "style": { "$ref": "#/$defs/styles" } }
      },
      "menu": {
        "type": "object", "additionalProperties": false, "required": ["type", "key", "items", "burger", "style"],
        "properties": { "type": { "const": "menu" }, "key": { "type": ["string", "null"] },
          "items": { "type": "array", "maxItems": 7, "items": { "type": "object", "additionalProperties": false, "required": ["label", "href"],
            "properties": { "label": { "type": "string" }, "href": { "type": "string" } } } },
          "burger": { "type": "boolean", "description": "phones: links collapse behind a menu button. true when more than 3 links." },
          "style": { "$ref": "#/$defs/styles" } }
      }
    }
  }
}
```

The other tools are small, flat and strict:
- `set_style {id, device, entries[]}`
- `set_props {id, entries[]}` (prop-key enum)
- `set_text {id, text}`
- `replace_node {id, node}`
- `remove_node {id}`
- `move_node {id, parent, after}`
- `add_section {kind, variant, tone|null, after, copy}`
- `set_theme {…}`
- `place_asset {assetId, target, role}`
- `update_brief {…}`
- `reply {text}`, `ask {questions[]}`, `finish {summary}`

Schema notes: `const` and `["string","null"]` are both supported. The `pattern` on `src` makes `upload:N` and random URLs impossible. Test the depth of the recursive defs against the 10-level limit with a real call; the limit applies to the schema definition, and recursion through `$ref` is allowed.

---

## 3. Verification loops (looking at the result on several devices)

**Evidence:**
- *Vision-Guided Iterative Refinement* (Amazon/Bristol, ICLR 2026 workshop): a VLM critic gives structured feedback on rendered pages, for **+17.8% over three refinement cycles** on WebDev Arena requests. Fine-tuning recovered only about a quarter of that gain, so the loop itself matters.
- *WebGen-Agent* (2025): a VLM scores screenshots plus GUI-agent tests, with backtracking and "select best". Claude-3.5-Sonnet went from 26.4% to 51.9% accuracy and appearance from 3.0 to 3.9.
- *ReLook* (2025): the screenshot critic is used in training, and at inference a light self-edit loop remains; invalid renders score zero.
- OpenAI's GPT-5.5 guide tells the model to render visual output, inspect layout, clipping, spacing and missing content, and revise. Its frontend prompt says "verify with Playwright screenshots… across desktop/mobile viewports".

**Recommended loop:**
1. **Render offscreen at 1280 / 820 / 390.** These are our `DEVICE_WIDTH` values, rendered with the same `PageView` and a `data-device` root per device. Capture tiles one viewport tall (390×844 for mobile) for the first 2-3 screens and the edited section, not one huge strip.
2. **Deterministic checks first** (milliseconds, free). Read DOM metrics from each device root:
   - horizontal overflow (`scrollWidth > clientWidth`) and clipped text (`scrollHeight > clientHeight + 2`)
   - overlapping sibling boxes
   - tap targets under 44×44 px and gaps under 8 px
   - mobile body text under 16 px or H1 over 44 px
   - header taller than 72 px on mobile, or nav links on one line wider than the screen
   - a menu with more than 3 links and `burger:false`
   - an image wider than the viewport
   - empty containers
   - text/background contrast below 4.5:1
   - attached assets not used and not mentioned
   - the first mobile screen missing the headline or the main button
3. **Vision check only when needed.** Send the screenshots plus the list of failing checks to a `verify` stage with a rubric (below). Return fixes as the same strict tools.
4. **Stopping rule:** stop when there are no blocking checks and the rubric scores at least 4/5 on every axis. At most 2 fix passes, because gains flatten after about 3 cycles in the papers. Keep the best version if a pass makes things worse (WebGen-Agent's "select best").
5. **Cost and latency.**
   - The checks are free. A verify call is one extra model call at low effort with 2-4 images.
   - On gpt-5.5+, `detail:auto` means "original" resolution, which is the most expensive. Use `detail:"low"` for an overview and `"high"` (capped at 2048px) only for tiles that failed checks.
   - Measure with the `/v1/responses/input_tokens` endpoint.
   - Run verify after the user already sees the result, as a calm step ("Checking on mobile"). Do it on every build and on edits that touch layout. Skip it for text-only edits.

**Rubric prompt sketch** (verify stage):
> Score 1-5 each, for the DESKTOP and MOBILE screenshots separately: (1) first screen: brand, promise and button readable without scrolling; (2) nothing clipped, overlapping, empty or overflowing; (3) mobile header: logo + burger + at most one compact button, under 72px tall; (4) reading order on mobile makes sense (text before supporting image unless the image is the product); (5) type scale and spacing calm and consistent; (6) attached brand assets used where expected. For every score under 4: name the node id and give one tool call that fixes it. Do not touch anything that scores 4 or more.

---

## 4. Responsive design intelligence

**What others do:**
- **Framer's agent** generates tablet (810) and phone (390) breakpoints by "adjusting stacks, type sizes, spacing, and image crops". It recommends making desktop flexible first; device edits become overrides, and every generated breakpoint still needs review.
- **Wix** builds the mobile view automatically from desktop and auto-hides elements that don't work on phones (hover effects, some apps).
- Users report better results when "make it responsive" is scoped section by section.

**Navigation evidence:**
- NN/g findings, quoted second-hand: hidden navigation loses about 20% of discoverability. Common guidance is visible links when there are 4 or fewer, a menu above that, and never a hamburger on desktop.
- Tap targets: Apple 44 pt, Material 48 dp, 8 px spacing. WCAG 2.2 sets 24 px (AA) and 44 px (AAA).

**Rules worth encoding.** Put them in a `## Always: devices` part of `design.md` *and* in a code baseline:

| Area | Rule (mobile 390 unless noted) |
|---|---|
| Header / nav | More than 3 links, or links wider than about 60% of 390 px → `menu.burger = true`. Header = logo (max height 32-36, max width about 120) + burger, optionally one compact primary button. Height at most 64-72 px. Never wrap nav onto two lines. Tablet 820: keep links visible if 4 or fewer, otherwise burger. Desktop: never burger. |
| Rows | Stack to 1 column (text/image splits, cards, forms). Small repeated items (stats, logos, payment marks, icons) go 2-3 per row. Comparison tables become stacked cards. |
| Order | In a split hero, text and button come first and the image after (for an opt-in, the form must be in the first screen). Zig-zag sections become one consistent order on mobile. |
| Type | H1 about 32-40 px (roughly 0.55-0.65 of desktop), H2 26-30, body at least 16, line height 1.4-1.6. Fixed sizes per device, no viewport-width scaling (OpenAI frontend guide). |
| Spacing | Section padding-y 88 → 48-64. Padding-x 20-24 (16 minimum). Gaps × about 0.6-0.75. |
| Buttons / forms | Hero and form buttons full width, at least 48 px tall. Fields in a single column (short pairs like expiry + CVC may stay side by side). |
| Images | Wide 16:9 → 4:3 or 1:1. Set `bgPosition` on the subject. Text over a photo needs an overlay or gets moved off the photo. |
| Hide (sparingly) | Decorative images, duplicate links, secondary badges, oversized background art. **Never** hide the main button, price, form fields, guarantee or legal text. Prefer reflowing over hiding. |
| First screen | Headline + one-line lead + button visible within 844 px, with a hint of the next section. |

**How to apply it:**
- (a) A deterministic **"auto-mobile" pass** in code after each build/insert, like Wix: it writes mobile/tablet overrides only where the model left `null`.
- (b) The model gets the device rules plus the real mobile state, and handles exceptions.
- (c) The checks in §3 catch what slips through.
- Remove the rule "Only target tablet or mobile when the user talks about that device". Replace it with: "Desktop edits stay desktop. But any structure you create or restructure gets mobile/tablet decisions (`null` = inherit is a decision)."

---

## 5. User assets that stick (logo, colours, photos)

**What others do:**
- **Canva Brand Kit** holds logos, colours, fonts, icons, imagery and guidelines (up to 100 brands per account). Magic Design output can be switched to brand colours and fonts in one click.
- **Lovable** sends a project "Knowledge" file (vision, design system, exact brand colours) with every prompt, and recommends giving the real logo and images before prompting. Figma Make adds kits (design system) and attachments (project files).
- The common pattern: **assets are part of the project, not a chat message.**

**Recommended design:**
1. **`doc.assets`**, saved with the page, never stripped from history. Each entry:
   ```
   {id:"logo-1", url, role:"logo|photo|product|portrait|screenshot|reference|other",
    description, w, h, aspect, transparent, colours:["#..."], addedTurn, usedIn:[nodeIds]}
   ```
   Upload once to storage, not as a data URL in every request. For the model, either pass the image URL or upload once to the OpenAI Files API (`purpose:"vision"`) and reference it by `file_id` in `input_image`. Images are still billed as tokens every time they are sent.
2. **Intake step on upload.** A small, fast call (low effort, `detail:"low"`) classifies the image's role, writes a one-line description, pulls out dominant colours, and decides "content to place" vs "reference to imitate". For a logo, it also suggests theme colours (`primary`, `ink`) and records `brief.brand.logo = "asset:logo-1"`. This fixes the confusion between "here's my logo" and "make it look like this screenshot".
3. **Every request carries an asset list as text** (about 20 tokens per asset):
   ```
   asset:logo-1 (logo, 3.1:1, transparent, #0E3B43/#F2B705, used in header)
   ```
   Image pixels are sent only when (a) attached this turn, (b) the model calls `view_asset(id)`, or (c) the task is about that asset.
4. **References become `asset:<id>`** (enforced by the schema pattern). Replace `upload:N`. `historyFor` writes "attached asset:logo-1 (logo)".
5. **Guarantee in the loop.** When an attached asset is neither placed nor mentioned in the reply by the end of the turn, the check fails, and the agent gets one follow-up: place it, or ask where. Prompt rule: "A newly attached logo replaces the text/placeholder logo in the header and footer unless the user says otherwise."
6. A brand panel (Logo, colours, fonts, photos) is the user-facing version of the same data. This fits "keep UX 95% same": it can live in the existing Theme/settings panel.

---

## 6. Long-session memory and compact page state

**What others do:**
- **Claude Code** re-reads CLAUDE.md from disk after every auto-compaction, and anything that lived only in chat can be lost to the summary.
- **Cursor** uses rules files (and had auto-extracted "memories", reportedly removed in 2.1.x).
- **ChatGPT** keeps explicit saved memories plus a looser reference to chat history.
- **Lovable** keeps the knowledge file and sends it with every prompt.
- **v0** sends recent messages plus *summaries of older messages* plus retrieval.
- **OpenAI** offers server-side compaction (`context_management:[{type:"compaction",compact_threshold:N}]`) and `/responses/compact`. Both are encrypted, opaque items to pass on unchanged.
- **Anthropic's context-engineering guidance:** context is a "finite resource with diminishing marginal returns". Use compaction (keep the most important facts first, then trim), structured notes outside the window, and just-in-time retrieval via ids. The GPT-5.5 guide says a compaction should keep "completed actions, active assumptions, IDs, tool outcomes, unresolved blockers, and the next concrete goal".

**Recommended design:**
1. **Page state doc**: the `brief` grown into a structured, schema-checked object saved in the doc. The model updates it with `update_brief`, and code merges it as `mergeBrief` does now. Sections:
   - `business` (offer, audience, price, language)
   - `brand` (asset ids, colours, fonts, tone)
   - `decisions` (user-confirmed: "nav = Home/Pricing/FAQ", "no countdown")
   - `rejected` (never bring back)
   - `open` (asked but not done)
   - `log` (last ~15 changes: `{turn, what, nodeIds}`)

   It is sent at the top of every request (the "CLAUDE.md that survives compaction").
2. **Turns:** keep the last 6 verbatim. Fold older ones into a rolling summary of at most about 300 tokens, written by a cheap call whenever more than 6 turns exist. We already rebuild context per stage on the client, so our own summary fits better than OpenAI's opaque compaction. Use `previous_response_id` *within* one request's tool loop, so reasoning carries across tool calls.
3. **Page detail in layers** (tldraw's Blurry / Focused / Peripheral idea):
   - *Outline* of the whole page: section id, kind, first headline, element counts, and which devices have overrides. About 30-60 tokens per section.
   - *Focused*: the selection subtree, or the sections the plan names, with all props, all three device styles, `hidden`, and asset refs.
   - Everything else on demand via `get_nodes(ids, devices)`.
4. **Selection scope:** the selected subtree is the default edit area. The validator rejects writes outside it, except `reply`/`ask`/`update_brief`, with the hint "outside the selection, ask first". The ancestors' styles are included read-only for context.
5. **Prompt caching:** order requests as static ROLE/OPS/tool schemas → stage instructions → skills → brief → page → request. Use a stable `prompt_cache_key` per stage, and watch `cached_tokens`. Today the skills vary per request inside `instructions`; keep the stable part first.

---

## 7. Agent loop design (plan → act → verify), and why edits feel shallow

**Router** (code heuristics first, otherwise the model's first call decides):

| Class | Example | Reasoning effort | Loop |
|---|---|---|---|
| Answer | "is this headline good?" | low | reply only (writes disabled via `allowed_tools`) |
| Quick edit | change text, colour, one style | low / none | act, then a light check |
| Structural edit | "make the header work on mobile", "add a pricing table" | **medium** | short plan (1-3 targets) → act → lint + screenshot verify → ≤2 fixes → reply |
| Multi-section / restyle | "make it more premium" | medium | plan → act per section → verify |
| New page | empty page | medium plan, low/medium build | plan → build → verify (desktop + mobile) → reply |

GPT-5.5 guidance: `medium` is the default, try `low` before `none` when tools or planning matter, and raise to `high` only when evals show a gain (overthinking regressions are real).

**Tool set** (fewer than 20 active; narrowed per stage with `allowed_tools`):
- Read: `get_outline`, `get_nodes(ids, devices)`, `screenshot(device, sectionId|null)`, `run_checks(devices)`, `list_assets`, `view_asset(id)`
- Write: `insert_node`, `replace_node`, `set_props`, `set_style`, `set_text`, `remove_node`, `move_node`, `add_section`, `set_theme`, `place_asset`
- Meta: `update_brief`, `ask`, `reply`, `finish`

**Fixing shallow edits:**
- Raise edits from `low` to `medium` when they are structural.
- Add a "finish the intent" rule: an edit includes its knock-on changes, such as mobile/tablet overrides of what you touched, matching siblings (all cards, not one), the same spacing rhythm, and the footer when the header logo changes.
- Keep "don't rewrite what the user didn't mention".
- Verify edits that touch layout.
- In `log`, record what changed by id, so the next turn can refer to it.

**Progress UX** (calm, per our motion rules):
- The model's short preambles / `phase:"commentary"` messages map to our existing "say" steps ("Header on mobile").
- Ops apply live as each tool call completes.
- Verification shows as one quiet step ("Checking on mobile"), then the reply.
- Repair passes are shown only as "Fixed 2 things on mobile" in the reply.
- Each request keeps its own Before/After + Undo (already implemented via `pending`).

---

## 8. Evals (so this keeps working)

- Build 40-60 scripted scenarios, starting with the reported failures:
  - logo attached in turn 1, used in turn 3
  - desktop nav with 5 links
  - "make the header nicer" on a crowded header
  - a 20-turn chat that refers back to turn 2
  - "change the hero image" with a selection
  - a reference screenshot vs a content photo
- Grade with the §3 checks plus counts:
  - invalid/rejected ops per turn
  - repairs needed
  - unused assets
  - mobile check failures per page
  - out-of-scope writes
  - turns-to-success
  - latency p50/p90
  - tokens
- Run on every prompt or skill change, and when switching models (gpt-5.4 → 5.5/5.6).

---

## 9. Implementation order (suggested)

1. **Day-size fixes:**
   - add device overrides, `hidden` and menu `burger` to `compact()`
   - add the `## Always: devices` rules and the burger rule to the prompt
   - replace the "only target mobile when asked" rule
   - send a mobile screenshot to review
   - turn assets into `asset:id` with `doc.assets` and an asset list in every request
2. **Validator feedback:** turn `normalizeNode` / theme sanitising into results the model receives. Stop dropping lines silently; log rejections.
3. **Strict function tools**, migrating op by op: start with `set_style`/`set_props`/`set_text`, then `insert_node`/`replace_node` with the recursive schema. Keep JSON Lines as a fallback until evals pass.
4. **DOM checks + verify stage** on 3 devices; the auto-mobile baseline in code.
5. **Page state doc + rolling summary + detail in layers + `get_nodes`.**
6. **Router + effort per class + evals.**

---

## Sources

**OpenAI**
- Structured Outputs guide (supported schemas, limits, recursion, streaming, refusals): https://developers.openai.com/api/docs/guides/structured-outputs
- Function calling (strict default in Responses, parallel calls, allowed_tools, streaming events, custom grammar tools, tool search): https://developers.openai.com/api/docs/guides/function-calling
- GPT-5.5 guide (reasoning effort, preambles/phase, vision detail, caching, compaction contents, render-and-inspect): https://developers.openai.com/api/docs/guides/latest-model/gpt-5.5
- GPT-5.2 guide (CFG / Lark custom tools): https://developers.openai.com/api/docs/guides/latest-model/gpt-5.2
- Frontend prompt guide (mobile/desktop verification, no viewport-width font scaling): https://developers.openai.com/api/docs/guides/frontend-prompt
- GPT-5 prompting guide (eagerness, reasoning persistence via Responses): https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide
- Compaction / context management: https://developers.openai.com/api/docs/guides/compaction and https://developers.openai.com/api/docs/guides/context-management
- Images and vision (file_id inputs, detail levels): https://developers.openai.com/api/docs/guides/images-vision
- Community thread on CFG conformance: https://community.openai.com/t/gpt-5-custom-lark-tool-outputs-are-not-guaranteed-to-conform-to-the-cfg/1337673
- Community thread on streaming with structured output in the Responses API: https://community.openai.com/t/streaming-mode-with-structured-output-in-responses-api/1368545

**Tree-edit agents and builders**
- tldraw agent starter kit (actions, sanitize, Blurry/Focused shapes, modes, schedule): https://tldraw.dev/starter-kits/agent and https://tldraw.dev/docs/ai
- Vercel v0 composite model (AutoFix mid-stream, Quick Edit, error-free rates): https://vercel.com/blog/v0-composite-model-family
- Figma First Draft (component selection/assembly): https://www.figma.com/blog/figma-ai-first-draft
- Figma Make kits and attachments: https://www.figma.com/blog/introducing-make-kits-and-make-attachments/
- Builder.io Visual Copilot / Fusion: https://www.builder.io/blog/visual-copilot and https://www.builder.io/fusion
- Google Stitch overview (third-party): https://uithings.com/what-is-google-stitch
- JSON Whisperer, LLM JSON editing with stable ids (EMNLP 2025): https://arxiv.org/abs/2510.04717

**Verification research**
- Vision-Guided Iterative Refinement for Frontend Code Generation (+17.8% over 3 cycles): https://arxiv.org/abs/2604.05839
- WebGen-Agent (screenshot + GUI-agent feedback, backtracking): https://arxiv.org/abs/2509.22644v1
- ReLook (vision-grounded critic for web coding): https://arxiv.org/html/2510.11498v1

**Responsive**
- Framer, making a site responsive with agents: https://www.framer.com/academy/lessons/making-a-site-responsive-using-agents
- Framer agent per-breakpoint generation (third-party): https://www.createwith.com/tool/framer/updates/framer-agent-now-generates-responsive-layouts-for-every-breakpoint-automatically
- Wix automatic mobile layout and auto-hidden elements: https://support.wix.com/en/article/wix-editor-fixing-layout-issues-on-your-mobile-site
- Mobile navigation patterns (Smashing Magazine): https://smashingmagazine.com/2017/05/basic-patterns-mobile-navigation
- Target sizes and WCAG 2.5.5 / 2.5.8: https://adrianroselli.com/2019/06/target-size-and-2-5-5.html
- Shopify tap target guidance: https://shopify.dev/docs/storefronts/themes/best-practices/performance/increase-tap-target-size

**Assets, memory and context**
- Canva Brand Kit: https://www.canva.com/pro/brand-kit/ and https://www.canva.com/help/apply-brand-kit-colors/
- Canva Magic Design (apply brand kit in one click): https://www.canva.com/magic-design/
- Lovable Knowledge: https://lovable.dev/faq/development/knowledge and https://docs.lovable.dev/tips-tricks/best-practice
- Anthropic, Effective context engineering for AI agents: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- ChatGPT memory FAQ: https://help.openai.com/en/articles/8590148-memory-faq
- Cursor rules vs memories (forum): https://forum.cursor.com/t/rules-vs-memories-and-global-vs-project/137149
- Claude Code auto-compact behaviour (third-party): https://www.morphllm.com/claude-code-auto-compact

How reliable these sources are:
- NN/g hamburger figures are quoted second-hand.
- The Stitch, Framer per-breakpoint, Cursor memories and Claude Code compaction details come from third-party write-ups.
- OpenAI limits are from the current docs (October 2026). Re-check the recursive-schema depth against a real call.
