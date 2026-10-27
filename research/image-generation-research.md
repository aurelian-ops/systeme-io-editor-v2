# Image generation for AI-built landing pages: research and recommendations

October 2026. Covers model choice, prompting, consistency across a page, the image types a page needs, stock and hybrid options, and cost and latency.

Prices and Elo scores change every month. Unless a line says otherwise, figures come from vendor rate cards or calculators checked on 23 Oct 2026. Figures marked (3p) come from third parties.

---

## 0. TL;DR

1. **Our model is two generations old.** We call `gpt-image-1` at `quality: "low"` (`app/server/ai.ts:286`). That costs $0.016 per portrait and is about 10th on today's quality boards. `gpt-image-2.5-flare` at `medium` costs about $0.010 per portrait (3p estimate), so it's cheaper, and it ranks #2 on the Artificial Analysis arena. `gpt-image-2` at `medium` costs $0.041 per portrait (official calculator).
2. **"Generic" is mostly a prompt problem, not a model problem.** Today each prompt is a single sentence plus a style line, with no camera, light, composition, casting or palette, so the model falls back on its average look: glossy and centred. A structured prompt fixes most of this.
3. **"Inconsistent" is an architecture problem.** Each photo is generated on its own. The fix has three parts:
   - one **shoot brief** per page that goes word-for-word into every prompt
   - an **anchor image** (the hero) that is passed as a reference image when the same person appears again
   - a **deterministic post-grade** (the same tone curve and grain via `sharp`) applied to every output
4. **Don't generate UI or text-heavy assets as photos.** Build dashboards, phone screens and ebook covers in HTML from real or rendered UI and the real title, then composite them into a generated device or scene. Generate a cover with text only when the model can do it reliably (GPT Image 2.x or Nano Banana Pro), and check the spelling afterwards.
5. **Use stock only where real places matter** (cities, venues, food, nature), and only when the user picks the image, not auto-fill (Unsplash guidelines). Everything person- or brand-specific should be generated or uploaded.
6. **Compliance.** EU AI Act Art. 50 deployer labelling has applied since 2 Aug 2026. Keep the C2PA/SynthID metadata, offer an optional "AI image" label, and never generate faces for testimonials.

---

## 1. Model landscape (Oct 2026)

Artificial Analysis text-to-image arena, from a live snapshot. Elo comes from blind human votes, and price is per 1,000 images at 1024x1024 with default settings.

| # | Model | Elo | $/1k | Released |
|---|---|---|---|---|
| 1 | GPT Image 2.5 Sunburst (max) | 1222 | $211 | Sep 2026 |
| 2 | GPT Image 2.5 Flare (max) | 1207 | $211 | Sep 2026 |
| 3 | GPT Image 2 (high) | 1186 | $211 | Apr 2026 |
| 4 | Nano Banana 2.1 (Gemini) | 1176 | $34 | Oct 2026 |
| 5 | MAI-Image-2.6 (Microsoft) | 1166 | $39 | Aug 2026 |
| 7 | Nano Banana 2 (Gemini 3.1 Flash Image) | 1140 | $67 | Feb 2026 |
| 9 | GPT Image 1.5 (high) | 1123 | $133 | Dec 2025 |
| 11 | Nano Banana Pro (Gemini 3 Pro Image) | 1118 | $134 | Nov 2025 |
| 13 | FLUX 3 Image | 1117 | $48 | Oct 2026 |

`gpt-image-1`, which we use now, isn't in the top 15.

Status changes since the models named in the brief:
- **Imagen 4** is shut down; Google's docs call Imagen "legacy, shut down".
- **Gemini 2.5 Flash Image** (the original "nano banana") was shut down on 2 Oct 2026. Google points to 3.1 Flash Image and Nano Banana 2.1 instead.
- **Midjourney v7/v8** still has no official API, and its terms forbid automation (3p). It isn't an option for a product pipeline.
- **Flux 1.1 Pro / Kontext** has been replaced by FLUX.2 (pro, flex, max) and, since 1 Oct 2026, by FLUX 3.
- **Recraft v3** has been joined by **V4 Styles**, which takes a reusable `style_id`.

### Comparison for our use (portrait about 1024x1536, or the nearest size)

| Model | $ / image | Latency (measured) | Reference images | Text in image | Best for us |
|---|---|---|---|---|---|
| **gpt-image-2.5-flare** | low $0.005 · med $0.010 · high $0.041 · xhigh $0.074 · max $0.165 (3p) | about 50% faster than gpt-image-2 (vendor claim) | yes, multi-image edits; identity preservation improved over 2.0 | excellent | **default for every photo** |
| gpt-image-2.5-sunburst | same token rates | slower | yes, best edit precision | excellent | final hero re-renders, product edits that must keep the label |
| gpt-image-2 | low $0.005 · med $0.041 · high $0.165 | low 14.5 s · med 38 s · high 105 s (3p, 1536x1024) | up to 10–16 (sources disagree), fidelity always high | excellent | fallback |
| gpt-image-1.5 | low $0.013 · med $0.05 · high $0.20 | — | `input_fidelity: high` keeps the first 5 inputs | very good | none (migrate) |
| gpt-image-1 *(current)* | low $0.016 · med $0.063 · high $0.25 | — | `input_fidelity` | ok | retire |
| gpt-image-1-mini | low $0.006 · med $0.015 · high $0.052 | fast | yes | weak | cheap drafts and previews only |
| **Nano Banana 2.1** | 1K $0.034 · 2K $0.050 · 4K $0.113 (batch half price) | 16–65 s (3p, one review) | up to 14 in total; about 4 characters and 10 objects kept consistent | very good | **second provider**: multi-reference consistency and cheap 2K |
| Nano Banana 2 (3.1 Flash) | 1K $0.067 · 2K $0.101 | 12 s (1K) – 18 s (2K) (3p) | up to 14; 4 characters | good | — |
| Nano Banana Pro | 1K/2K $0.134 · 4K $0.24 | about 20 s | 5 characters, 6 objects, 3 style refs | best of the Gemini family | text-heavy covers (alternative) |
| Nano Banana 2 Lite | 1K $0.034 | about 3–4 s | not built for multi-reference | ok | instant placeholders |
| FLUX.2 [pro] | $0.03 for the first MP, then $0.015 per MP, plus $0.015 per reference MP (3p) | fast | up to 8 at 1 MP output | good | backup; JSON prompts and hex colours |
| FLUX 3 Image | about $0.048 at 1K (3p, new) | — | — | — | watch |
| Ideogram 3.0 | Turbo $0.03 · Default $0.06 · Quality $0.09; with character reference $0.10–0.20 | — | character and style reference | strong typography | poster or cover typography if needed |
| Recraft V4 Styles | $0.035 (Pro 2K $0.10) plus $0.005 per style | — | up to 10 style references, giving a `style_id` | good | **illustrations, abstract backgrounds and patterns in a fixed house style** |
| Midjourney v7/v8 | subscription | — | `--oref`, `--sref` | ok (v8) | **no API, so excluded** |

**OpenAI API notes** (cookbook and image guide):
- **Quality:** `quality` is low, medium or high; 2.5 adds `xhigh` and `max`. Use medium or higher for close-up portraits, identity-sensitive edits and small text.
- **Size on gpt-image-2+:** any size works if the long edge is under 3840 px, both edges are multiples of 16, the ratio is at most 3:1, and the total is 0.65–8.3 MP. We can stop snapping a 4:5 slot to 2:3: ask for `1024x1280` for 4:5 or `1536x864` for 16:9.
- **Fidelity and transparency:** `input_fidelity` exists only on 1.x and is always high on 2.x; passing it to 2.x errors. `background: "transparent"` needs png or webp output.
- **Output and streaming:** `output_format: jpeg` is the fastest format. `partial_images: 0–3` streams previews, at about $0.003 per partial on 2.5.
- **Reference costs:** reference images on gpt-image-2 are processed at full fidelity whatever the quality setting, which adds input tokens at $8 per 1M.

---

## 2. Why our photos look generic or AI-made today

Current code:

```ts
// ai.ts:280
const prompt = `${q}. ${look} A real, natural photograph (editorial quality, natural light, realistic people and skin), no text, no letters, no logos, no watermark, no frames.`
// ai.ts:286  model gpt-image-1, quality 'low', size snapped to 1024x1536 / 1536x1024 / 1024x1024
// run.ts:777 fillPhotos(): every img: marker generated independently, 3 at a time
```

| Symptom | Cause | Fix |
|---|---|---|
| Glossy, waxy, "stock-AI" look | `low` quality on a legacy model; nothing tells the model which camera, light or lens to use, so it falls back on its average (diffusion tends toward heavily retouched training data) | Newer model at medium or higher, plus explicit camera, light and realism lines (§4) |
| Same centred, symmetric framing everywhere | No composition instruction | Give each shot a framing, subject placement and negative space (§4, §6) |
| Text doesn't fit over the hero | The model doesn't know where the headline goes | Pass the recipe knob (`side`) through and specify "left 45% of frame is calm, uncluttered …" |
| Different person, light and colour in every section | Independent prompts with no shared casting or grade | Shoot brief, anchor reference and post-grade (§5) |
| Wrong crop | A 4:5 slot gets 2:3 and the CSS crops it | Request the exact slot ratio (2.x custom sizes) |
| Fake dashboards and gibberish covers | We ask for UI or text inside a photo, or forbid text everywhere | Composite real UI; render covers in HTML (§6) |
| Buzzwords ("editorial quality") | Quality adjectives use up attention and push toward the glossy look | Describe the moment and the camera instead |

---

## 3. Anti-AI-look rules (bake these into the prompt builder)

**Words to drop:** "8K", "ultra-realistic", "hyper-detailed", "masterpiece", "award-winning", "stunning", "cinematic masterpiece", "perfect". Multiple 2026 guides agree these push the model toward the glossy AI look.

**What to describe instead:**
1. **A moment, not a pose.** Mid-action and candid: mid-sentence, laughing at something off-frame, adjusting a sleeve, looking away, hands busy with a real object.
2. **A real camera.** Name the body, lens, aperture and distance, for example "35mm lens at f/2, waist-up, eye level, photographer 2 m away". OpenAI and BFL both say camera terms guide composition more than optics. FLUX.2 explicitly responds to camera bodies and film stocks ("shot on Kodak Portra 400").
3. **A real light source with a direction.** "Soft window light from camera-left, gentle falloff, shadows on the right cheek" is good. "Natural light" is too vague.
4. **Texture and imperfection.** Visible pores, fine lines, faint redness, flyaway hairs, creased linen, a slightly scuffed floor, real clutter at the edges.
5. **True-to-life colour.** "Natural colour, gentle contrast, no HDR, no oversaturation", then a named grade (§5).
6. **Asymmetry.** The subject sits on a third and the horizon is not dead centre. A little foreground or background clutter is fine.
7. **The word "photorealistic" or "real photograph".** OpenAI's cookbook says gpt-image-2 responds most reliably to these. "iPhone photo" works for a candid, UGC feel.
8. **Exclusions** (OpenAI models handle "no …" fine; FLUX.2 ignores negatives, so phrase them positively there): no text, letters, logos or watermarks; no beauty retouching, skin smoothing or "AI glow"; no lens flare or bokeh balls; no extra fingers.

**Checks after generation:** a cheap vision pass with a mini model on every output. Regenerate once if any check fails, then accept.
- hands and fingers
- any stray text or garbled glyphs
- the face in the reference matches (when a reference was used)
- the negative-space side is actually empty
- no watermark-like artefacts

**People:** use varied, specific casting instead of the default "attractive 30-year-old". Name age, build, hair, skin tone and wardrobe from the brief. When no other casting is given, cast to the user's stated audience.

---

## 4. Prompt template

Write it as prose in a fixed order: **use → shot → casting → setting → light → camera → grade and palette → composition → realism → exclusions**. This follows OpenAI's guidance (scene, then subject, then details, then constraints, and state the intended use) and BFL's (most important first; 30–80 words for most work, longer for complex scenes). Gemini's own templates follow the same order: "A photorealistic [shot] of [subject] in [setting], [lighting], [camera/lens]…".

```
{USE}: Photograph for the {SECTION} of a landing page for {BRAND_ONE_LINER}. Aspect {W}:{H}.
SHOT: {subject + action/moment, 1–2 sentences}.
CASTING: {from brief.casting, verbatim; omitted for product/texture shots}.
SETTING: {from brief.location + shot-specific props}.
LIGHT: {from brief.light}.
CAMERA: {brief.camera + shot lens/framing/angle}.
GRADE: {brief.grade}. Palette in the scene: {map 2–3 brand hexes to real objects/surfaces}.
COMPOSITION: Subject on the {right|left} third; the {left|right} {40–50}% of the frame is calm,
  uncluttered {surface} in {neutral hex} for headline text. {Horizon/eye-line placement}.
REALISM: Photorealistic, a real photograph. Natural skin texture with pores and fine lines,
  flyaway hairs, real fabric creases; candid and slightly imperfect framing; true-to-life colour,
  gentle contrast, no HDR.
EXCLUDE: No text, letters, logos or watermark. No retouched/plastic skin, no CGI gloss,
  no lens flare, no bokeh balls, no extra fingers.
```

With a reference image, used for every shot after the anchor:

```
Image 1 is the reference of {NAME_ROLE}. Keep the same person: face, hair, skin tone, age and build.
Do not redesign the person. New photo: {rest of the template}.
```

OpenAI's cookbook says to label each input by index and role, and to repeat the preserve list on every call.

### 4a. Filled example: yoga coach hero (hero-breakout, photo on the right, 4:5)

`gpt-image-2.5-flare`, `quality: high` (the hero is worth $0.04), `size: 1024x1280`, `output_format: jpeg`.

```
Photograph for the hero of a landing page for a 6-week online yoga programme for busy mothers. Aspect 4:5.
SHOT: The teacher sits cross-legged on a mat, mid-laugh, one hand resting on her knee, the other
tucking hair behind her ear, glancing just past the camera as if someone off-frame said something funny.
CASTING: Maya, a woman of about 38, South Asian, shoulder-length dark wavy hair loosely tied back,
natural freckles, no visible makeup, oat-coloured ribbed long-sleeve top and charcoal leggings.
SETTING: A real, lived-in living room: pale oak floor, a cream linen sofa edge at frame left, one
trailing pothos on a shelf, a folded wool blanket, a mug on the floor.
LIGHT: Soft morning window light from camera-left, warm, gentle falloff; soft shadow on her right side.
CAMERA: Full-frame, 50mm lens at f/2.2, seated eye level, about 2.5 m away, waist-up and a little room above her head.
GRADE: Warm, low-contrast, slightly faded film look (Kodak Portra 400), creamy highlights, lifted blacks.
Palette in the scene: sage #8FA58A on the blanket, terracotta #C9785A on the mug, walls warm off-white #F3EDE4.
COMPOSITION: Maya on the right third; the left 45% of the frame is a calm, uncluttered off-white wall
with soft light for headline text. Eye-line at the upper third.
REALISM: Photorealistic, a real photograph. Natural skin texture with pores and fine lines, flyaway hairs,
real fabric creases; candid, slightly imperfect framing; true-to-life colour, no HDR.
EXCLUDE: No text, letters, logos or watermark. No retouched or plastic skin, no CGI gloss, no lens flare,
no studio backdrop, no extra fingers.
```

The same person in the About section is an edit on the hero, passed as image 1:

```
Image 1 is the reference of Maya, the yoga teacher. Keep the same person: face, freckles, hair, skin tone,
age and build. Do not redesign her. New photo for the About section, aspect 4:5: Maya standing at a
kitchen counter in the same home, pouring tea, wearing a cream linen shirt, ... [same LIGHT/CAMERA(85mm f/2)/GRADE/REALISM/EXCLUDE]
```

### 4b. Filled example: SaaS dashboard on a laptop (features or product section, 3:2)

**Don't let the model draw the UI.** It produces plausible-looking fake data and garbled labels, and a fake screenshot misrepresents the product. Do this instead:

1. Generate the scene with a blank screen.
2. Composite the real UI onto the screen: a screenshot the user uploaded, or one of our HTML sections rendered to PNG.
3. The simplest path: no generated photo at all, just a CSS device frame ("Screenshots … sit in a card, radius 12–16", per our design skill).

```
Photograph for the product section of a landing page for an invoicing app for freelance designers. Aspect 3:2.
SHOT: A modern silver 14-inch laptop open on a light oak desk, screen facing the camera at a slight
three-quarter angle, the display showing a plain uniform mid-grey (#808080) screen with no content.
A designer's hand rests near the trackpad, out of focus.
SETTING: A bright, tidy studio: a ceramic cup, a closed notebook with a pencil, a small plant at the far right edge,
a white wall with soft daylight.
LIGHT: Diffused daylight from a large window camera-right, soft shadows to the left, no reflections on the screen.
CAMERA: 35mm lens at f/4, slightly above desk height, the laptop screen sharp and the background softly out of focus.
GRADE: Clean, cool-neutral, gentle contrast; whites slightly cool. Palette: the cup in brand blue #2F5BEA,
everything else neutral greys and oak.
COMPOSITION: The laptop occupies the centre-right 60%; screen edges are fully visible and not cropped, so the screen
can be replaced later. Left third is calm wall and desk.
REALISM: Photorealistic, a real photograph, true-to-life materials (anodised aluminium, oak grain), slight dust on the desk.
EXCLUDE: No text, UI, icons, logos, stickers or watermark anywhere, including the screen. No glowing screen.
```

For the composite, detect the grey quad with a simple threshold, then do a perspective warp with `sharp` plus a small canvas/WebGL step, or take corner points from a quick vision call. An alternative is the edit endpoint: pass the scene as image 1 and the real screenshot as image 2, with "Place image 2 exactly onto the laptop screen of image 1, preserving every pixel of image 2's text; change nothing else." On 2.x this works fairly well, but **always** verify the result (with OCR or a vision diff).

### 4c. Filled example: face-oil product shot (shop or product section, 4:5)

If the user uploaded a real bottle, use **edit with reference**. Image 1 is the product, and the prompt says "keep the bottle, label text and logo exactly as in image 1; change only the scene". Use 2.5-sunburst for this. Without an upload:

```
Photograph for the product section of a landing page for a small-batch botanical skincare brand. Aspect 4:5.
SHOT: A single 30 ml amber glass dropper bottle of face oil standing on a rough travertine stone slab,
the dropper resting beside it with one golden drop of oil about to fall.
SETTING: Seamless warm sand backdrop (#E9DCC9) matching the page surface; a sprig of dried chamomile and
a small pool of oil catching light on the stone; nothing else.
LIGHT: One hard sunlight source from upper-left through a window, crisp long shadow of the bottle to the right,
warm highlight glinting through the amber glass; soft fill from the right.
CAMERA: 100mm macro lens at f/5.6, camera slightly below the bottle's shoulder line, bottle tack sharp,
the stone grain visible, background smooth.
GRADE: Warm, natural, slightly sun-bleached; rich amber, no orange push.
COMPOSITION: Bottle on the left third, its shadow leading right; the upper 35% is clean backdrop for a headline.
REALISM: Photorealistic studio product photograph, real glass refraction and fingerprints-free but not CGI-perfect,
tiny dust specks on the stone, true-to-life colour.
EXCLUDE: No label text, no logo, no letters, no watermark on the bottle or anywhere (the brand label
is added from the real product photo). No floating objects, no water splashes, no 3D render look.
```

The design skill's Shop direction asks for one angle and one shadow for the whole set. Put that into `brief.light` and `brief.camera` so every product tile shares it.

---

## 5. Consistency across a page: the "shoot brief" approach

Real brand shoots have one art director, one location, one light and one grade, and that's why they look coherent. We should copy that.

### 5a. The brief: one JSON per page, written once by the planning LLM

```json
{
  "concept": "Calm, lived-in mornings at home; real, unposed",
  "casting": [{ "id": "maya", "desc": "woman ~38, South Asian, shoulder-length dark wavy hair loosely tied, freckles, no visible makeup", "wardrobe": "oat, cream, charcoal; natural fabrics" }],
  "location": "a bright, lived-in apartment: pale oak floors, linen, plants, warm off-white walls",
  "light": "soft morning window light from camera-left, warm, gentle falloff",
  "camera": "full-frame, 35–85mm primes, f/2–2.8, eye level, natural distance",
  "grade": "warm, low-contrast, faded film look (Portra 400), lifted blacks, creamy highlights",
  "palette": { "surface": "#F3EDE4", "accent": "#C9785A", "secondary": "#8FA58A" },
  "avoid": "gym, studio backdrop, clinical white, glossy skin",
  "shots": [
    { "slot": "hero", "subject": "maya", "aspect": "4:5", "textSide": "left", "moment": "mid-laugh on the mat" },
    { "slot": "about", "subject": "maya", "aspect": "4:5", "textSide": null, "moment": "pouring tea in the kitchen" },
    { "slot": "feature-1", "subject": null, "aspect": "3:2", "textSide": null, "moment": "close-up of hands rolling a mat" },
    { "slot": "bg-cta", "subject": null, "aspect": "16:9", "textSide": "center", "moment": "linen texture in morning light" }
  ]
}
```

- **Where it comes from:** the per-direction `Images:` lines in `app/server/skills/design.md` become the *seed* for `light`, `grade` and `avoid`. The planner fills in `casting`, `location` and `shots` from the offer and audience, and `palette` comes from the page tokens.
- **How it's used:** `light`, `camera`, `grade` and the casting `desc` go into every prompt **word for word**. Paraphrasing between prompts is what causes drift. BFL's guidance is the same: "repeat detailed character descriptions in every panel".
- **Where it lives:** store it in `doc.brief.shoot` so later "make another photo of her" edits reuse it.

### 5b. Anchor and reference: the same person across photos

1. **Generate the anchor first**, alone. That's the hero, or a neutral waist-up casting portrait when the hero has no person.
2. Wait for it, then generate every shot with the same `subject` **as an edit with the anchor as image 1** (the §4 prefix). Both OpenAI 2.x and Nano Banana handle multiple subjects: about 4 consistent characters and up to 14 references in total. Shots without the person run in parallel with no reference.
3. If the user uploaded their own photo, it is the anchor. This is the biggest quality lever: "Real photos of the actual person … beat stock" (our design skill).
4. Re-pass the same anchor each time. Don't chain edits of edits, because identity drifts with each step (OpenAI, Leadde).
5. **Optional style anchor:** pass the hero as an extra "match the lighting and colour grade of image 2" reference for shots without a person. It helps on Nano Banana, which takes up to 3 style refs on Pro. Weigh the input-token cost.

### 5c. Post-grade: deterministic consistency

Run every output through one `sharp` pipeline with per-page settings derived from the brief. This guarantees a shared look even when the model drifts:
- **Colour balance:** a small white-balance nudge toward the brief temperature, via `modulate` and `tint`/`recomb` (for example, warm +3–5%).
- **Tone curve:** one consistent curve (`linear` contrast at about 0.92 for "low contrast" grades, lifted blacks).
- **Saturation:** cap with `modulate({ saturation: 0.9 })` to kill AI oversaturation.
- **Grain:** add the same fine grain overlay at 3–5% opacity, which also hides AI over-smoothness.
- **Crop:** crop to the exact slot aspect with attention-based crop, then encode to webp or avif. Keep the C2PA/SynthID metadata where possible.

### 5d. Palette

Name brand hexes **on objects**, not as a "colour scheme". BFL notes that vague colour references give inconsistent results. Gemini and OpenAI accept hexes in prose too. Keep the accent to one prop per photo, matching the 60-30-10 rule.

---

## 6. The image types a page needs

| Type | Approach | Model / settings |
|---|---|---|
| **Hero portrait with room for text** | Casting plus a `textSide` from the recipe knob (hero-breakout `side`, hero-fullbleed text side). Specify an exact %-of-frame empty zone with its surface and hex. For full-bleed heroes, ask for "darker, low-detail tones on the text side". We still add the overlay scrim | 2.5-flare `high` for the hero only; 1024x1280 (4:5) or 1536x864 / 1920x1088 (16:9) |
| **About / creator** | Edit with the anchor reference. Different moment and lens, same light and grade | 2.5-flare `medium` (or Nano Banana 2.1 2K) |
| **Lifestyle / feature** | Hands, details and environment close-ups. Avoid faces when possible, since they're cheaper and safer for consistency | `medium` |
| **Product shot** | User upload → edit with reference ("keep label exactly"). Otherwise a generic unbranded product, and the label comes later. One angle and one shadow per set | 2.5-sunburst for label-preserving edits |
| **Course dashboard / app screen on laptop or phone** | **Composite, don't generate.** Use a blank-screen scene plus the real screenshot, or a CSS device frame around our own rendered section. Label anything illustrative as such | scene: `medium`; UI: real |
| **Ebook / course cover** | **Preferred:** generate the cover *art* without text, typeset the title and author in HTML (exact, editable, any language), then put it into a generated or CSS 3D book mockup. **If generated directly:** quote the title verbatim, spell hard words letter by letter, and give the font style, size, colour and placement (OpenAI). Use gpt-image-2.x `high`, or Nano Banana Pro, which Google recommends for text assets. Always OCR-check and regenerate on a mismatch | text-capable models only |
| **Abstract backgrounds / textures** | Photographic textures (linen, paper, stone, water, light through a window) fit our "real photos" rule better than gradients or blobs, which the design skill bans. For illustration directions, Recraft V4 Styles with one `style_id` per brand gives a uniform look | `low`/`medium` is fine; it's cheap |
| **Testimonial avatars** | **Never generate.** Fake faces on testimonials are deceptive and an EU AI Act Art. 50 risk. Use initials or the user's uploads | — |

---

## 7. Stock photos and how other builders source images

### Stock APIs

| | Licence | API rules that matter for us |
|---|---|---|
| **Unsplash** | Free commercial use; can't sell unaltered photos | **Must hotlink** `photo.urls`. **Must ping** `download_location` when a user picks a photo. **Attribution** to the photographer and Unsplash with utm links. No numeric limit published (3p: 50/h in demo, 1,000/h after approval). The guidelines say the API is for **"non-automated, high-quality, and authentic experiences"**, so an AI silently auto-filling every page from Unsplash is a grey area. A user-picked photo in a search panel is fine. Built into Wix (Media Manager) and Framer (official plugin) |
| **Pexels** | Free commercial use, no attribution required by licence | API users must show a prominent link to Pexels and credit photographers when possible. 200 requests/h and 20k/month by default, raised free on request. Can't copy Pexels' core functionality |
| **Pixabay** | Free commercial use, no attribution | About 100 requests/60 s. Reportedly CDN URLs expire and hotlinking is forbidden, so images must be downloaded and re-hosted (3p, verify) |

**When stock beats generation:**
- real, recognisable places (a city, a venue, a landmark for a local business or event)
- food that has to look edible
- nature, landscapes and architecture
- real-world documentary moments
- when the user explicitly distrusts AI images (Getty VisualGPS: 98% say authentic imagery matters for trust, and acceptance of AI images drops once people learn they're AI; TUI: AI images spark curiosity but aren't more persuasive)

**When generation wins:**
- a specific persona in a specific context
- the same person across sections
- brand-palette props
- exact framing with negative space
- niches with poor stock (a mum doing yoga in a small flat, not a model on a beach)

**Recommendation:** add an Unsplash/Pexels search tab in the image panel for users to choose from. Optionally, the planner can mark a shot `"source": "stock"` with a query, which shows suggestions the user confirms, with attribution handled. Don't auto-insert stock without that confirmation.

### How AI builders do it

- **Wix:** Media Manager offers free Wix and Unsplash images, Shutterstock for a fee, and an "AI Image Creator" powered by Stability AI that offers several styles to pick from.
- **Squarespace Blueprint AI:** homepages come with AI-generated images and palettes; Squarespace says its design team curates the imagery and copy. Users are told to swap in their own photos.
- **Hostinger AI builder:** sites ship with AI-generated images by default. A built-in generator asks for a description plus a style, and the image credit system was reportedly removed in Sept 2025 (3p).
- **Durable:** sites come with industry-relevant **stock** images.
- **Framer:** an official Unsplash plugin, plus marketplace AI-image plugins (PhotoBase, Framegen, Lummi AI stock).

**Pattern:** most builders give you stock or AI placeholders, then make swapping in your own photos easy. Nobody visibly does a per-page shoot brief with a consistent person. That's a real differentiator for us.

---

## 8. Cost and latency

Per page, with about 6 photos (1 hero, 1 about, 3 lifestyle or feature, 1 texture):

| Setup | Cost / page | Notes |
|---|---|---|
| Today: gpt-image-1 low ×6 | about $0.10 | legacy quality |
| 2.5-flare: hero `high` + 5× `medium` | **about $0.09** (+ about $0.01–0.02 of reference input tokens) | **recommended default** (3p estimate) |
| 2.5-flare all `high` | about $0.25 | premium tier |
| gpt-image-2: hero high + 5× medium | about $0.37 | if 2.5 isn't on our account yet |
| Nano Banana 2.1 2K ×6 | about $0.30 (batch $0.15) | strong multi-reference; 2K is sharper on retina |
| gpt-image-1-mini low | about $0.04 | previews only |

**Latency plan:**
- **gpt-image-2 timings:** low about 15 s, medium about 40 s, high up to about 105 s (3p). 2.5-flare claims about half that.
- **Critical path:** hero first (about 20–50 s), then the reference shots and the rest in parallel. Total is about 1–1.5 min per page.
- **Show progress calmly:** use `partial_images: 1` so a soft preview appears in place. Stream it and fade it in, in line with the calm-motion rule.
- **Concurrency:** raise it from 3 to about 6. Watch rate limits; on 2.5, Tier 1 allows only 5 images/minute.
- **Batch:** half-price batch APIs (OpenAI, Gemini) fit only regenerations or offline template libraries, not live building (turnaround up to 24 h).
- **Caching:** hash on (brief + shot + model + size), as now.

---

## 9. Recommended pipeline

```
PLAN (LLM, existing plan stage)
  └─ writes doc.brief.shoot  (concept, casting[], location, light, camera, grade, palette, avoid, shots[])
     each shot: slot, subject|null, aspect, textSide, moment, source: "generate"|"composite"|"stock"|"upload"

ROUTE per shot
  ├─ upload  → user's photo (also becomes the anchor if it shows the person)
  ├─ stock   → suggestions in the image panel; user confirms; attribution + download ping
  ├─ composite (UI, covers) → generate blank-screen/blank-book scene + real screenshot / HTML-typeset cover
  └─ generate ↓

GENERATE
  1. anchor = hero shot (or casting portrait) → gpt-image-2.5-flare, quality high, exact slot size
  2. in parallel:
       person shots → images.edit, image[0]=anchor, "keep the same person…" + template
       other shots  → images.generate + template
     quality medium; size = slot aspect (1024x1280, 1536x1024, 1536x864…); jpeg; partial_images 1
  3. fallback provider on error/refusal: Nano Banana 2.1 (same prompt + anchor as reference)

POST (sharp)
  white-balance nudge → contrast/curve → saturation cap → shared grain → attention crop → webp/avif
  keep provenance metadata

QA (vision mini-model, ~$0.001)
  hands, stray/garbled text, identity match vs anchor, text-side emptiness, watermark artefacts
  → one automatic retry with the failed check appended as a fix line, then accept

STORE
  public/ai-photos (as now) keyed by hash; doc.brief.shoot persisted for later "another photo of her"
```

### Concrete changes in our code

1. **Model and size:** in `app/server/ai.ts` `/api/photo`, make the default model `gpt-image-2.5-flare` (or `gpt-image-2`) and quality `medium`, with `high` for `slot === 'hero'`. Compute the exact size from the slot aspect, rounded to multiples of 16, as shown in the sketch after this list.
2. **Request shape:** change it from `{ q, aspect, direction }` to `{ shot, brief, anchorUrl? }`, and build the prompt from the §4 template on the server.
3. **Client order:** in `fillPhotos()` (`app/src/editor/ai/run.ts:777`), run the anchor first, then the others in parallel with `anchorUrl`.
4. **Planner output:** extend the planner prompt (the `"visual"` field and the `img:` instructions at `ai.ts:59`) to output the shoot brief and per-shot `textSide`/`subject`, instead of a single free sentence.
5. **Remove the blanket ban:** drop "no text, no letters" from cover/mockup shots, which follow the composite route instead.
6. **Post-grade:** add the `sharp` post-grade step.
7. **Image panel:** later, add a stock-search tab (Unsplash and Pexels) to the image panel.

The size calculation for change 1:

```ts
const W = aspect >= 1 ? 1536 : Math.round(1280 * aspect / 16) * 16
const H = Math.round(W / aspect / 16) * 16
```

Check that the total is at least 655,360 px.

---

## 10. Compliance and trust

- **EU AI Act Art. 50(4):** since 2 Aug 2026, *deployers* must visibly disclose deepfake-type image content. Commentators expect much AI ad and creative imagery to be in scope. Machine-readable marking is the provider's job, and that deadline was reportedly moved to 2 Dec 2026. Fines go up to €15M or 3%.
  - **For us:** keep the provider metadata (C2PA, SynthID), keep an `aiGenerated` flag per image in the doc, and offer users a one-click small "AI image" caption or icon. Get a legal review before making it the default.
- **Things we never generate:** real named people, the user's own face without their upload, testimonial or "customer" faces, and fake product UI presented as real screenshots.
- **Trust data:** authentic imagery still wins on trust (Getty VisualGPS, TUI). So we should always nudge "replace with your own photo", and the upload, once given, becomes the anchor for every later generation.

---

## Sources

**OpenAI**
- Image models prompting guide (cookbook): https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- Image generation guide (sizes, costs, partial images, transparency): https://developers.openai.com/api/docs/guides/image-generation
- API pricing (token rates): https://developers.openai.com/api/docs/pricing
- GPT Image 2.5 Flare vs Sunburst (3p): https://docs.kanaries.net/articles/gpt-image-2-5
- GPT Image 2.5 launch (3p): https://docs.apiyi.com/en/news/gpt-image-2-5-launch
- gpt-image-2 overview (3p): https://apiframe.ai/guides/gpt-image-2-guide
- gpt-image-1.5 parameters (3p): https://fal.ai/models/fal-ai/gpt-image-1.5/llms.txt
- GPT Image 2 essentials, reference images (3p): https://help.scenario.com/articles/8473821828-gpt-image-2-the-essentials
- Character drift in GPT Image 2.5 (3p): https://leadde.ai/blog/how-to-keep-characters-consistent-in-gpt-image-2-5-fix-face-and-pose-drift
- Prompting GPT Image 2 (3p): https://runware.ai/docs/models/openai-gpt-image-2/guides/prompting

**Google**
- Gemini image generation docs (models, references, templates): https://ai.google.dev/gemini-api/docs/image-generation
- Gemini API pricing (Nano Banana 2.1 / 2 / Pro / Lite, deprecations): https://ai.google.dev/gemini-api/docs/pricing
- Nano Banana 2 (DeepLearning.AI): https://www.deeplearning.ai/the-batch/nano-banana-2-aka-gemini-3-1-flash-image-makes-edits-easier-and-faster
- Nano Banana 2.1 price cut: https://aiweekly.co/alerts/googles-nano-banana-21-halves-image-prices-on-gemini-36-flash
- Nano Banana 2.1 timed review (3p): https://www.jxp.com/nano-banana/blog/nano-banana-2-1-review
- Imagen 4 shutdown notice (3p): https://www.rapidevelopers.com/md/ai-api-limits-performance-matrix/imagen-4

**Benchmarks and measured cost and latency**
- Artificial Analysis text-to-image arena: https://artificialanalysis.ai/text-to-image/arena/leaderboard-text
- Segmind measured comparison (NB2, Seedream 5, GPT Image 2): https://blog.segmind.com/ai-image-gen-pricing-compared-nano-banana-2-vs-seedream-5-0-vs-gpt-image-2-2026/

**Other models**
- BFL FLUX.2 prompting guide: https://docs.bfl.ai/guides/prompting_guide_flux2
- FLUX.2 pricing and variants (3p): https://invideo.io/blog/flux-ai-image-generator/
- FLUX 3 Image on OpenRouter: https://openrouter.ai/black-forest-labs/flux-3-image
- FLUX 3 pricing (3p): https://www.layer3labs.io/guides/flux-3-image-pricing
- Ideogram API pricing: https://ideogram.ai/api-pricing/
- Recraft V4 Styles docs: https://www.recraft.ai/docs/api-reference/models/recraft-v4-styles
- Recraft API pricing: https://www.recraft.ai/pricing?tab=api
- Midjourney V8 guide (3p): https://blakecrosley.com/en/guides/midjourney
- No official Midjourney API (3p): https://unifically.com/blogs/midjourney-api

**Avoiding the AI look**
- Claid, fixing AI skin texture: https://claid.ai/blog/article/fix-ai-skin-texture
- Cloudinary, making AI images look real: https://cloudinary.com/guides/image-generation/how-to-make-ai-images-look-real
- Hedra, real-photo prompting: https://mkt.hedra.com/blog/make-ai-images-look-like-real-photos-prompting
- Common prompt mistakes: https://zsky.ai/blog/ai-prompt-mistakes-to-avoid
- Garbled text in AI design: https://www.capcut.com/help/garbled-text-on-ai-design

**Stock and site builders**
- Unsplash API guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
- Pexels API guidelines: https://help.pexels.com/hc/en-us/articles/900005852323
- Free stock photo resources for developers: https://blog.openreplay.com/free-stock-photo-resources/
- Wix, adding and creating images: https://support.wix.com/en/article/studio-editor-adding-creating-and-uploading-images
- Wix AI image tools: https://www.techradar.com/pro/website-building/wix-builds-on-its-ai-offering-with-new-image-tools
- Squarespace AI website examples: https://www.squarespace.com/blog/ai-website-examples
- Hostinger AI image generator: https://support.hostinger.com/en/articles/8670037-website-builder-ai-image-generator
- Hostinger review: https://www.creativebloq.com/web-design/web-hosting-builder/hostinger-2025-review
- B12 comparison (Wix, Framer, Durable): https://www.b12.io/resource-center/ai/b12-vs-wix-vs-framer-vs-durable-which-ai-website-builder-is-best/
- Framer Unsplash plugin: https://framer.com/marketplace/plugins/unsplash

**Trust and compliance**
- Getty VisualGPS findings (via CX Network): https://www.cxnetwork.com/artificial-intelligence/interviews/ai-generated-images-customer-trust-advertising
- TUI study, real or AI imagery: https://ttrweekly.com/site/2025/03/real-or-ai-imagery-can-we-tell-the-difference
- "AI in disguise" (Columbia): https://www.columbia.edu/~on2110/Papers/AI_in_disguise.pdf
- Lewis Silkin, Art. 50 deployer labelling: https://www.lewissilkin.com/insights/2026/07/31/the-new-ai-labelling-rules-for-deployers-in-the-advertising-supply-chain
- Kennedys, draft Code of Practice on labelling: https://kennedyslaw.com/en/thought-leadership/article/2026/the-eu-ai-act-s-draft-code-of-practice-on-marking-and-labelling-of-ai-generated-content-what-providers-and-deployers-need-to-know/
