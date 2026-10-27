# Design research for the AI page builder

Research base for a "design skill" that the systeme.io AI page builder reads before it designs a landing page, opt-in, sales page, webinar registration, thank-you page or checkout. Target: pages that read as premium modern websites (2024-2026), not templates.

Sources: web research (section 5) plus the product owner's own rules in `apple-design.md` and `premium-ui-playbook.md`. Those two files were written for the editor UI. Their principles carry over to pages: consistency + calm + motion that answers the hand, one accent, ring-plus-soft shadows, size-specific tracking, no ornaments, show named options, no invented numbers.

Notes on the numbers: values marked "(ref)" were measured or reconstructed from a named site and are approximate. Everything else is a house default chosen for this builder. All palettes below were checked for WCAG 2.x contrast (ratios given).

---

## 1. Core principles: what makes a page look premium

### 1.1 The one-line idea

Premium = **few decisions, held everywhere**. One type pairing, one spacing scale, one accent, one radius family, one motion personality, real content. Template-y = many defaults that nobody chose (font, purple gradient, three icon cards, same fade on everything, filler copy).

Before generating any section, the builder must commit to a **direction brief** (section 2): heading font, body font, 4-6 named colours with roles, radius, density, image style, motion personality. Generate inside it. Never change it per section.

### 1.2 Typography (the biggest single lever)

**Fonts**
- Max **2 families** per page (display + body). A third only for numbers/mono, and only if the niche needs it (finance, tech).
- Max **3 weights** in use on a page (e.g. 400 / 500 / 600). Avoid 300 for body and 800+ outside sports/creator directions.
- A distinctive display face carries brand. Body face is neutral and very readable. A neutral sans for both is fine only when the spacing and scale are exceptional (Linear/Vercel style).
- Never default to Inter/Roboto/system for *headings* without a reason. Inter as body under a chosen display face is fine.

**Scale** (desktop, 16px root; ratio ~1.25 at body sizes, opening to ~1.333-1.5 at display sizes)

| Role | Desktop | Mobile (390) | Line-height | Tracking | Weight |
|---|---|---|---|---|---|
| Display (hero H1) | 56-80px | 38-48px | 1.0-1.08 | -0.025 to -0.04em | 500-600 (serif 400) |
| H2 (section title) | 40-48px | 30-34px | 1.1 | -0.02em | 500-600 |
| H3 (card/feature title) | 20-24px | 18-20px | 1.25-1.3 | -0.01em | 600 |
| Lead (hero sub, intros) | 19-22px | 17-18px | 1.45-1.5 | 0 | 400 |
| Body | 16-18px | 16-17px | 1.55-1.65 | 0 | 400 |
| Small / meta | 13-14px | 13-14px | 1.45 | +0.005em | 500 |
| Eyebrow / overline | 12-13px | 12px | 1.3 | +0.06 to +0.1em (caps only) | 500-600 |

- Use `clamp()` for display and H2 so they scale fluidly: `font-size: clamp(2.375rem, 1.6rem + 3.2vw, 4.5rem)`. Use a smaller ratio on mobile (1.2) than desktop (1.333): the Utopia fluid-scale approach.
- References (ref): Stripe display 56px / 1.03 / -0.025em, H2 48px / 1.03 / -0.02em, body 16-18px; Linear H1 72/80 at -3%, H2 48/56 at -2%; Vercel max H1 ~56/64 with heavy negative tracking.
- **Tracking is size-specific** (Apple): tighten large type (-0.02 to -0.04em), body at 0, small caps/eyebrows positive. One fixed letter-spacing for all sizes is always wrong somewhere.
- **Leading inverse to size**: 1.0-1.1 on display, 1.5-1.65 on body.
- Hierarchy = size + weight + colour together. De-emphasise with colour (muted ink), not by shrinking below 14px.
- Body never under 16px on any device. Butterick: 15-25px on the web; line spacing 120-145% of size.

**Measure (line length)**
- Body paragraphs: **55-70 characters** (`max-width: 62ch` is a safe default; hard limits 45-90).
- Hero sub-headline: **max 52ch**, 2-3 lines.
- Hero H1: **max 12-14ch per line at desktop** (`max-width: 14ch` to 18ch), 2-3 lines. Use `text-wrap: balance` on all headings and `text-wrap: pretty` on paragraphs to avoid orphans.
- Centered text only for blocks of 3 lines or fewer. Anything longer is left-aligned.

**Details that read as craft**
- `font-variant-numeric: tabular-nums` for prices, stats, countdowns.
- Curly quotes, real ellipsis, non-breaking space between number and unit ("30&nbsp;days").
- Sentence case for headings and buttons. No Title Case Every Word, no ALL CAPS headlines (except the athletic direction).
- Variable fonts with `opsz` (Fraunces, Newsreader, Bricolage) should use optical sizing: display cut at large sizes, text cut at body.
- Preload the 1-2 font files used above the fold; `font-display: swap`; subset to the page's language.

### 1.3 Spacing and layout

**Scale** (4pt base, 8pt rhythm): `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160`. Nothing off-scale. Line-heights resolve to multiples of 4px where possible.

**Rules**
- Proximity does the grouping (Law of Proximity): space *inside* a group is always smaller than space *between* groups. Heading to its paragraph 16-24px; paragraph to its button 32px; block to next block 64px+.
- **Section padding** (vertical): desktop **96-160px**, tablet 80-96px, mobile **64-80px**. Default 120px desktop / 72px mobile. Hero can be 128-176px top. Premium pages err generous: start with too much whitespace, then cut.
- Section title block to section content: 48-64px desktop, 32-40px mobile.
- **Content widths**: page container **1120-1280px** (default 1200px) with **24px** gutters on mobile, 32-48px tablet, auto on desktop. Text column 640-720px. Hero text block 560-720px. Forms 400-480px. Pricing 3 cards ~1040-1120px total.
- **Grid**: 12 columns, 24px gutter (32px at >=1280). Use uneven splits: **7/5, 8/4, 5/7**, not 6/6. Split heroes 60/40 or 55/45.
- **Card padding** 24-32px (40px for feature/large cards). Gap between cards 16-24px (bento) or 24-32px (pricing).
- **Nested radii are concentric**: inner radius = outer radius - padding (e.g. card 24px, padding 8px, image 16px).
- Vary the rhythm down the page: full-width -> contained -> split -> full-bleed image -> contained. Seven sections in identical containers with identical padding read as a template.
- Alternate section backgrounds *sparingly*: max two background tones (bg + surface) plus at most one inverted (dark) band per page, usually for the final CTA or a proof section. Do not stripe every section.

**Buttons and hit targets**
- Primary button height **48px** desktop, **52px** mobile; horizontal padding 20-28px; label 15-16px / 500-600. Secondary = outline or ghost, same height. One filled primary per view.
- Hit targets min 44px on touch.
- Button labels name the outcome: "Get the free guide", "Save my seat", "Start the 7-day plan". Never "Submit", "Learn more" as the main CTA, "Get started" only if nothing better exists.

### 1.4 Colour

- **60-30-10**: ~60% background neutral, ~30% ink + surface (text, cards, secondary bands), **<=10% accent**. The accent appears on: primary buttons, links, one highlight per section at most, key numbers. If the accent is everywhere it stops pointing anywhere.
- Build each palette as **named roles**, 4-6 colours: `bg`, `surface`, `ink`, `muted`, `line`, `accent` (+ optional `accent-ink` for text on accent, `inverse` for dark bands). Never generate shades on the fly with lighten/darken.
- Neutrals: 8-10 greys in a scale (Refactoring UI). Slightly warm or cool greys to match the direction; but in dark mode keep surfaces close to neutral (no strongly hued greys) unless the direction is defined by that hue (finance navy).
- **Contrast (WCAG 2.2 AA)**: body text >= **4.5:1**; large text (>=24px regular or >=18.66px bold) >= **3:1**; UI boundaries, icons, input borders, focus rings >= **3:1**. Aim for 7:1 on body ink. Muted text must still hit 4.5:1 at its size.
- Never put grey text on a coloured background: tint the text toward the background hue instead (white at 70-80% opacity, or a light tint of that hue).
- Dark mode: background `#0A0A0A`-`#121212`, not pure `#000` except for the cinematic direction; ink `#EDEDED`-`#F4F4F5` (not pure white for long text); elevate with lighter surfaces (+4-8% lightness), not shadows. Desaturate and lighten the accent ~10-20% so it does not vibrate.
- Gradients: allowed only as (a) a subtle 2-stop tonal shift within one hue on a large surface (<8% lightness delta), or (b) an image scrim. **No purple-to-blue gradients, no gradient text, no gradient buttons, no colour blobs.**
- Depth: prefer tone shifts (bg -> surface) over borders. Where a card needs an edge: **ring + soft shadow** = `0 0 0 1px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)`; floating elements `0 0 0 1px rgba(0,0,0,.08), 0 4px 8px -2px rgba(0,0,0,.08), 0 16px 32px -8px rgba(0,0,0,.16)` (playbook tokens). Never a solid grey border *and* a heavy shadow.

### 1.5 Images and media

- **Real photography of the actual person/product beats illustration and stock** for every niche in this audience. A coach's face, a real course screen, the real product.
- One consistent **art direction** per page: same colour temperature, same light (soft natural window light is the safe default), same crop logic, same grade. Mixing studio, stock and AI images in one page is the fastest way to look cheap.
- **Aspect ratios** from a small set: 4:5 (portraits, split heroes), 3:2 or 16:10 (product, landscape), 1:1 (avatars, grids), 16:9 (video), 21:9 (cinematic bands). Never stretch; use `object-fit: cover` with a deliberate `object-position` (faces in the top third).
- **Text over images**: only with a scrim. Bottom gradient `linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0) 60%)` or a 30-45% flat overlay. Check contrast on the lightest part of the image.
- **Product/course screenshots**: show them in a frame (device or a simple 1px-ring card with 12-16px radius and the "float" shadow), slightly tilted only in creator/pop direction. Crop to the meaningful part; real UI, never lorem.
- **Radius on images** matches the direction's card radius (or 0 in editorial/gallery). All images on a page share the same radius.
- Avatars in testimonials: 40-56px circles, real faces. No initials-on-colour circles if a photo is possible.
- Video: `autoplay muted loop playsinline` only for short ambient loops <=10s with a poster image; any talking-head video is click-to-play with a custom poster (face + play button + duration "4:12").
- Performance: hero image <=200KB (AVIF/WebP), explicit width/height, `fetchpriority="high"` for the LCP image, lazy-load everything below the fold.
- Icons: one set, one stroke width (1.5px at 24px), 20-24px. Prefer no icons over generic line icons; use small photos, numbers, or product crops instead.

### 1.6 Page-level composition (conversion + craft)

- **One page, one goal, one primary CTA verb** repeated (hero, middle, end). Opt-ins: one form, 1-2 fields (email, first name).
- **The 5-second hero test**: who it is for, what they get, what to do. H1 = outcome in the visitor's words (6-12 words). Sub = how/what, one sentence (15-25 words). CTA + one line of risk-reversal or proof under it ("Free. 12 minutes. 4,200 coaches watched it this month." only if true).
- **Hick's law**: 1 primary + max 1 secondary action in the hero. No nav on opt-in/sales/webinar pages (or logo-only).
- **Serial position + peak-end**: strongest proof right after the hero, strongest CTA block last.
- **Von Restorff**: exactly one thing per section stands out (the recommended plan, the key number).
- **Fitts**: CTA large and near the end of the reading path; sticky mobile CTA bar on long sales pages (appears after the hero CTA scrolls out).
- **Doherty threshold**: everything that responds to input responds within 100ms (press state), finishes within 400ms.
- **Proof belongs near the claim and near the CTA**, not as a decorative hero badge. Testimonials: name + role/context + photo + a specific result. 3-6 strong ones beat 20 weak ones.
- Copy: short declarative sentences, numbers when true, plain words. No filler ("Elevate", "Unlock", "Seamless", "Revolutionize", "Game-changer"), no em dashes in UI copy (owner preference).

### 1.7 Anti-patterns: what makes a page look AI-made or template-y

The builder must actively check its output against this list (generate -> name the tells -> fix).

**Wave 1: the default look**
1. Inter/Roboto/system font on headings with no chosen display face.
2. Indigo/violet gradient (Tailwind `indigo-500` heritage), gradient headline text, gradient buttons, glow blobs behind the hero.
3. Stock page order: centred hero + pill badge ("New") + two buttons + logo row + **three identical icon cards** + pricing + CTA. Lead instead with the most characteristic thing in this creator's world (their face, their result, the product).
4. Same `rounded-2xl` + same soft shadow on everything; cards nested in cards; boxes inside boxes.
5. Reflexive glassmorphism (`backdrop-blur` panels) and neon glows. Glass only for a sticky nav over content.
6. The same fade-and-slide-up on every block, bounce easing, count-up stats on every number, marquee for 4 logos.
7. Filler copy ("Elevate your journey", "Unlock your potential", "Transform your life today") and **invented numbers** ("10,000+ happy students", "98% satisfaction") the user never supplied. Use placeholders the user must fill, clearly marked, never fake proof.
8. Sparkle emoji/icons, emoji bullets, rocket icons, "✨ AI-powered".

**Wave 2: the look AIs produce once wave 1 is banned** (equally recognisable)
9. "Warm editorial" as a reflex: cream `#F4F1EA` + serif + terracotta `#D97757` for every brief. Use it only when the brand is warm/editorial, and derive the accent from the brand.
10. "Dark signal" reflex: near-black + one acid-green or vermilion accent for anything "techy".
11. Newspaper cosplay: hairline rules, zero radius, dense columns on non-editorial content.
12. Template chrome on every section: tracked all-caps eyebrow above every heading, "A · B · C" meta strings, mono labels, an arrow `->` on every link.
13. One italic or coloured word in every headline ("Grow your *audience*"). Allowed once per page at most, and only in directions that use it (editorial, cinematic).
14. `01 / 02 / 03` numbering on content that is not a sequence.
15. Uniform section rhythm: every section centred, same padding, same width, same heading block.

**Other cheap tells**
- More than one accent colour competing; coloured section backgrounds in rainbow order.
- Text centred in long paragraphs; lines over 90 characters.
- Low-contrast grey body text on off-white (fails 4.5:1).
- Inconsistent radii (pill buttons + 4px cards + 24px images with no logic).
- Stock photos of handshakes/laptops/people pointing at screens; AI images with plastic skin and mixed light.
- Fake urgency: countdown timers that reset, "Only 3 spots left" that never changes.
- Icons from three different sets; emoji used as icons.
- Huge drop shadows (`0 20px 50px rgba(0,0,0,.3)`) on flat cards.

---

## 2. Eight visual directions

Each direction is a complete brief. The builder picks one per page (or offers 3 for the user to choose, rendered live, per the "options must look different" rule). Hexes are starting points: if the user has a brand colour, it replaces `accent` and the builder re-checks contrast.

Common token names: `bg` (page), `surface` (cards/bands), `ink` (text), `muted` (secondary text), `line` (hairlines), `accent` (CTA), `accent-ink` (text on accent).

### 2.1 Quiet Editorial

- **Mood**: calm authority, thoughtful, "a person with a point of view". Reads like a good essay or a book site.
- **Niches**: coaches (executive, leadership, life), consultants, authors, therapists, speakers, newsletter writers, high-ticket advisory.
- **Fonts**: **Newsreader** 400/500 (opsz auto; display 56-72px at 400) + **Hanken Grotesk** 400/500/600. Alt: Instrument Serif 400 + Inter 400/500.
- **Colour (light)**: bg `#F7F5F0`, surface `#FFFFFF`, ink `#1C1A17`, muted `#6B655C` (5.3:1 on bg), line `rgba(28,26,23,.10)`, accent `#24483E` deep forest (white text 10.1:1).
- **Colour (dark)**: bg `#141311`, surface `#1D1B18`, ink `#EDE9E1`, muted `#A39C90` (6.8:1), line `rgba(237,233,225,.10)`, accent `#8FBFA8` with ink text (9:1).
- Avoid the reflex: do not swap the accent to terracotta unless the brand is terracotta.
- **Radius**: 2-4px buttons, 0-4px images, 8px cards. Square, quiet.
- **Density**: airy. Section padding 128-160px, text column 640-680px, generous margins.
- **Images**: one large, honest portrait (4:5) in natural light, muted grade; black-and-white acceptable. Book covers, handwriting, real workspace. No illustrations.
- **Signature patterns**: thesis-statement hero (big serif line, small byline + portrait), long-form letter section with drop cap (once), pull quotes in serif at 32-40px, hairline-divided lists, testimonials as quotes with names (no cards), "About" as a two-column bio with a single photo.
- **Motion**: slow and minimal. Fade only (opacity 0 -> 1, translateY 8px), 600-700ms, `cubic-bezier(0.22, 1, 0.36, 1)`; stagger 80ms; no parallax, no marquee, no counters.
- **References**: every.to, press.stripe.com, kinfolk.com.

### 2.2 Soft Ritual (warm wellness)

- **Mood**: soft, restorative, kind, embodied. Breathing room and warmth without sugar.
- **Niches**: wellness, yoga, meditation, nutrition, women's health, holistic coaching, therapy practices, retreats.
- **Fonts**: **Fraunces** 300-400 (opsz auto, `SOFT` 50-100, `WONK` 0) for headings + **Figtree** 400/500. Alt: Gloock 400 + Manrope 400/500.
- **Colour (light)**: bg `#F3F1EA` oat, surface `#FBFAF6`, tint band `#E4E7DA` sage mist, ink `#23261F`, muted `#6A6D62` (4.7:1), accent `#5E7253` sage (white text 5.2:1).
- **Colour (dark)**: bg `#171915`, surface `#20231E`, ink `#ECEDE6`, muted `#A2A698` (7.1:1), accent `#A9BD99` with ink text (8.8:1).
- **Radius**: large and soft. Buttons pill (999px), cards 24px, images 24-32px; one arched image mask (`border-radius: 999px 999px 24px 24px`) allowed as the signature, used once.
- **Density**: airy. Section padding 112-144px. Body 17-18px, line-height 1.65.
- **Images**: natural light, skin texture visible, hands, plants, water, linen, morning light; warm white balance, low contrast, slight film grain. Never gym or clinical imagery.
- **Signature patterns**: split hero 55/45 with arched portrait, "what you will feel" list with soft dividers, a single full-bleed photo band with one quiet line, programme timeline (week 1/2/3) on a tint band, testimonial carousel of 3 large quotes, FAQ accordion.
- **Motion**: gentle. Fade-up 12px, 700ms, `cubic-bezier(0.25, 1, 0.5, 1)`; stagger 100ms; image soft scale 1.04 -> 1 over 1200ms on reveal; no bounce, no counters, no marquees.
- **References**: calm.com, ouraring.com, ritual.com.

### 2.3 Kinetic (athletic bold)

- **Mood**: energy, discipline, results, sweat. Loud type, hard contrast, momentum.
- **Niches**: fitness coaches, personal trainers, sports programmes, body transformation, martial arts, running clubs, challenges.
- **Fonts**: **Archivo** variable: headings 800, width 62-75 (condensed), UPPERCASE, tracking -0.01em, line-height 0.92; body **Archivo** 400 width 100. Alt: Anton 400 (headings) + Inter 400/500/600.
- **Colour (dark-first)**: bg `#0B0B0C`, surface `#161618`, ink `#F5F5F4`, muted `#9A9A9E` (7:1), line `rgba(255,255,255,.10)`, accent `#FF5A1F` signal orange with **ink text** (6.3:1; white text fails at 3.9:1). Alt accent `#D4FF3F` volt (ink text 17:1) only if it is the brand.
- **Colour (light)**: bg `#F2F2F0`, surface `#FFFFFF`, ink `#0B0B0C`, muted `#5D5D61` (5.9:1), accent `#FF5A1F` with ink text, or `#C2410C` with white text (5.2:1).
- **Radius**: 0-4px. Hard edges. Buttons 4px or square.
- **Density**: punchy and compact. Section padding 80-112px, tight heading-to-body gaps (12-16px), big numbers.
- **Images**: high-contrast action photography, motion blur, sweat, chalk, hard side light, desaturated with the accent as the only saturated colour; full-bleed and cropped tight. Before/after only with real, consented photos.
- **Signature patterns**: full-bleed video/photo hero with giant condensed H1 cropped near the edge, ticker marquee of programme words ("STRENGTH · CONDITIONING · MOBILITY"), big-number results strip (real numbers only), programme cards with week counts, transformation testimonials (photo + result), coach split with stats, pricing with a bold "most popular".
- **Motion**: snappy. Fade-up 24px, 450ms, `cubic-bezier(0.16, 1, 0.3, 1)`; stagger 50ms; marquee linear 30-40s/loop; counters 1200ms ease-out once; a clip-path wipe reveal on the hero headline (500ms) allowed.
- **References**: whoop.com, nike.com (training pages), joinladder.com.

### 2.4 Ledger (private wealth / trust)

- **Mood**: trustworthy, precise, quietly expensive. "Your money is safe here."
- **Niches**: finance educators, investing courses, financial advisors, real estate investing, accountants, insurance, crypto education (serious tone), legal.
- **Fonts**: **Instrument Serif** 400 for display only (>=40px) + **Geist** 400/500/600 for everything else, `tabular-nums` on. Alt: Source Serif 4 600 + IBM Plex Sans 400/500.
- **Colour (light)**: bg `#FAFAF8`, surface `#FFFFFF`, ink `#0E1B2C` deep navy, muted `#5A6576` (5.7:1), line `rgba(14,27,44,.08)`, accent `#0F5C4D` deep money-green (white text 7.9:1), detail gold `#8A6A2B` for small labels only (4.8:1).
- **Colour (dark)**: bg `#0B1220`, surface `#121A2B`, ink `#E8ECF2`, muted `#8D98AA` (6.4:1), accent `#5FC2A8` with navy text (8.7:1).
- **Radius**: 8px buttons, 12px cards, 12px images. Precise, not soft.
- **Density**: medium. Section padding 104-128px; data-dense blocks (tables, charts) allowed with clear structure.
- **Images**: restrained. Portrait of the advisor in a calm office, architecture, real dashboards/charts (clean, real), paper and pen. Cool-neutral grade. No coins, piggy banks, money piles, arrows going up.
- **Signature patterns**: split hero with a real chart/product card floating on the right (ring + float shadow), credential strip (certifications, media logos, regulator notes), "how it works" 3 numbered steps (a real sequence), comparison table (you vs. typical), case study with real figures, disclaimer footer set small but legible.
- **Motion**: measured. Fade-up 12px, 500ms, `cubic-bezier(0.23, 1, 0.32, 1)`; stagger 60ms; numbers count up once (900ms) only for real figures; chart lines draw in (stroke-dashoffset, 1000ms ease-out) once.
- **References**: mercury.com, wealthsimple.com, ramp.com.

### 2.5 Swiss Precision (B2B / consulting)

- **Mood**: sharp, competent, efficient, modern product company. Content does the talking.
- **Niches**: B2B consultants, agencies, SaaS, tech courses, marketing services, operations/productivity coaches, freelancers selling services.
- **Fonts**: **Geist** 600 headings (tracking -0.035em at display, -0.02em at H2) + **Geist** 400/500 body; Geist Mono for small labels if technical. Alt: Inter Tight 600 + Inter 400/500.
- **Colour (light)**: bg `#FFFFFF`, surface `#FAFAFA`, ink `#0A0A0A`, muted `#666666` (5.7:1), line `#EAEAEA`, accent `#2F5BFF` cobalt (white text 5.2:1) or the brand colour.
- **Colour (dark)**: bg `#0A0A0A`, surface `#111111`, ink `#EDEDED`, muted `#A1A1A1` (7.7:1), line `rgba(255,255,255,.08)`, accent `#5B86FF` with black text (6.3:1).
- **Radius**: 6-8px buttons, 12px cards, 12px screenshots.
- **Density**: medium-compact. Section padding 96-128px; 16px body; tight, well-aligned grids.
- **Images**: real product UI and diagrams, team photos in consistent grade; screenshots in ring-framed cards. No 3D blobs, no abstract gradients.
- **Signature patterns**: left-aligned hero with H1 + sub + 2 CTAs + product screenshot below (full container width), logo row (static if <6 logos), bento grid of 5-7 cells with real UI crops, sticky-scroll feature walkthrough, metrics strip, case-study cards, 3-tier pricing with feature table, FAQ two-column.
- **Motion**: crisp. Fade-up 8px, 400ms, `cubic-bezier(0.23, 1, 0.32, 1)`; stagger 40ms; screenshot rises 24px + scale 0.98 -> 1; tab/segmented indicators slide (250ms spring); hover lifts none, ring darkens instead.
- **References**: linear.app, vercel.com, stripe.com, attio.com.

### 2.6 Studio Pop (creator)

- **Mood**: playful, confident, internet-native, maker energy. Colourful but organised.
- **Niches**: YouTubers, influencers, digital product sellers (templates, presets, ebooks), newsletter creators, community builders, younger audiences, design/creative courses.
- **Fonts**: **Bricolage Grotesque** 700/800 (opsz auto, tracking -0.03em) + **Instrument Sans** 400/500. Alt: Unbounded 600 (sparingly) + DM Sans 400/500.
- **Colour (light)**: bg `#FFFFFF`, surface tints as block colours `#FFE8D6` peach, `#E3F0FF` sky, `#EAF7D9` lime (one per block, max 3), ink `#111111`, muted `#5C5C5C` (6.7:1), accent `#D4006F` hot pink (white text 5.2:1).
- **Colour (dark)**: bg `#121212`, surface `#1C1C1C`, ink `#F7F7F7`, muted `#A8A8A8` (7.9:1), accent `#FF4FA3` with ink text (6.2:1); block tints become 12% opacity of the hue.
- **Radius**: 12-16px cards, pill buttons or 10px; optional neo-brutal edge: `2px solid #111` + hard offset shadow `4px 4px 0 #111` (choose one: soft-rounded OR neo-brutal, never both).
- **Density**: medium, lively; section padding 96-120px; bigger type contrasts (display 72-96px).
- **Images**: the creator's own face with personality (direct gaze, bright natural colour), product mockups slightly rotated (-3 to 3 deg), stickers/hand-drawn marks used once or twice, real screenshots of their content (YouTube thumbnails, newsletter issues).
- **Signature patterns**: big-type hero with face cut-out on a colour block, "what's inside" bento of product previews, creator stats strip (subscribers etc., only real numbers), testimonial wall (masonry of short posts/tweets with avatars), product cards with price tags, playful FAQ, footer with social links.
- **Motion**: bouncy but quick. Spring `{ duration: 0.5, bounce: 0.25 }` for cards entering; hover tilt/lift 2-4px (pointer devices only); marquee of testimonials 40-60s, pause on hover; stagger 60ms.
- **References**: gumroad.com, figma.com, lu.ma.

### 2.7 Atelier (gallery commerce)

- **Mood**: curated, tactile, product-as-hero, boutique. The product photo is the design.
- **Niches**: e-commerce (beauty, fashion, home, food), physical + info product bundles, books, templates/presets sold as objects, premium courses sold like products.
- **Fonts**: **Bodoni Moda** 400/500 (opsz auto, display 48-72px) + **Jost** 400/500 (uppercase micro-labels at +0.12em). Alt for a modern store: Schibsted Grotesk 500 + Schibsted Grotesk 400.
- **Colour (light)**: bg `#FFFFFF`, surface `#F5F3F0` product backdrop, ink `#141414`, muted `#6E6A65` (5.4:1 on white, 4.9:1 on surface), line `rgba(20,20,20,.08)`, accent = ink black buttons (`#141414`, white text 18:1); a product colour may appear in one band only.
- **Colour (dark)**: bg `#0E0E0E`, surface `#1A1918`, ink `#F2F0ED`, muted `#A39E97` (7.3:1), buttons ink-inverted (`#F2F0ED` with `#0E0E0E` text).
- **Radius**: 0px images, 0-2px buttons. Square, gallery-like.
- **Density**: airy around products, dense in product details. Section padding 96-128px; product grids with 16-24px gaps.
- **Images**: studio product shots on seamless backdrops matching `surface`, consistent angle and shadow; macro texture shots; lifestyle in the same grade. 4:5 product tiles. Always same background tone across products.
- **Signature patterns**: full-bleed product hero with small left-aligned headline, editorial split (image 60 / text 40) alternating sides, product grid with hover second image, ingredients/inside-the-box list with macro shots, reviews with star rating + verified tag, sticky add-to-cart bar, guarantee + shipping strip.
- **Motion**: slow and luxurious. Image reveal via `clip-path: inset(100% 0 0 0) -> inset(0)` 900ms `cubic-bezier(0.77, 0, 0.175, 1)`; text fade 600ms; hover image swap crossfade 400ms; zero bounce.
- **References**: aesop.com, glossier.com, apple.com (product pages).

### 2.8 Premiere (cinematic dark)

- **Mood**: event, anticipation, high stakes, "this is a show". Big media, dark room, spotlight.
- **Niches**: webinars, masterclasses, live launches, high-ticket programmes, online course launches, summits, challenges' registration pages.
- **Fonts**: **Schibsted Grotesk** 700/800 headings (tracking -0.04em, line-height 1.0) + **Inter** 400/500 body. Optional serif accent for one line: Instrument Serif italic.
- **Colour (dark)**: bg `#070708`, surface `#111113`, ink `#F4F4F5`, muted `#8E8E93` (6.2:1 on bg, 5.8:1 on surface), line `rgba(255,255,255,.08)`, accent `#F2C14E` warm gold with ink text (12:1) or `#D93A3F` red with white text (4.5:1, use at >=16px/600).
- **Colour (light variant, for thank-you/replay pages)**: bg `#F7F6F3`, surface `#FFFFFF`, ink `#111113`, muted `#5E5E63`, same accent.
- **Radius**: 12-16px for video and cards, 10px buttons.
- **Density**: dramatic. Hero 100svh max (never taller), section padding 120-160px, few elements per screen.
- **Images**: cinematic 16:9/21:9 stills of the host on stage or in studio, low-key lighting, shallow depth of field, teal/amber grade; speaker portraits in one consistent treatment (b/w or same grade). One soft vignette on hero media is allowed; no colour glows.
- **Signature patterns**: event hero (date + time with timezone + countdown to a real date + single "Save my seat" CTA + host photo), "what you'll learn" 3-5 numbered lessons (real sequence), host credibility split, agenda/timeline, speaker grid (summits), replay/bonus stack, FAQ, final CTA repeating the date. Sticky mobile bar with date + CTA.
- **Motion**: theatrical but restrained. Hero media fades + scales 1.06 -> 1 over 1400ms `cubic-bezier(0.22, 1, 0.36, 1)`; headline lines stagger 120ms, 800ms each; countdown digits flip/slide 300ms; one sticky-scroll storytelling section allowed.
- **References**: masterclass.com, apple.com (event and Pro pages), raycast.com.

### 2.9 Direction picker (default mapping)

| Page brief signal | First pick | Second pick |
|---|---|---|
| Life/exec coach, consultant, author | Quiet Editorial | Swiss Precision |
| Wellness, yoga, nutrition, therapy | Soft Ritual | Quiet Editorial |
| Fitness, sports, challenge | Kinetic | Premiere |
| Finance, investing, real estate | Ledger | Swiss Precision |
| B2B, agency, SaaS, freelancer | Swiss Precision | Ledger |
| Creator, digital products, templates | Studio Pop | Atelier |
| E-commerce, physical products, beauty | Atelier | Soft Ritual |
| Webinar, launch, masterclass, summit | Premiere | the niche's direction |
| Thank-you page | same direction as the funnel, lighter density | |
| Checkout | same direction, Swiss-level restraint (no motion except press/validation) | |

---

## 3. Section and layout pattern library

Use 2-4 distinctive patterns per page, not all of them. Do not combine: bento + broken grid; sticky stack + horizontal scroll; sticky stack + parallax; two full-screen heroes.

### Heroes
1. **Thesis hero** - one huge headline (2-3 lines, 64-96px), small sub, one CTA, no image or a small byline portrait. Use when the message is strong and the brand is personal (editorial, consulting).
2. **Asymmetric split hero (60/40 or 55/45)** - copy left, portrait or product right (4:5), CTA under copy. The default for coaches and creators; avoid 50/50.
3. **Product-below hero** - centred or left H1 + sub + CTAs, then a full-width product/course screenshot overlapping into the next section by 80-120px. For courses, SaaS, membership areas.
4. **Full-bleed media hero** - photo/video covers the viewport (max 100svh), headline bottom-left over a scrim. Fitness, retreats, events.
5. **Event hero** - title + date/time/timezone + countdown (to a real date) + registration form or button + host photo. Webinars, live launches, challenges.
6. **Opt-in hero (form-first)** - split: lead-magnet mockup (ebook/checklist cover, slight perspective) + headline + 1-2 field inline form + privacy line. Lead magnets.
7. **Video sales letter hero** - headline above a 16:9 video with custom poster, CTA under the video, appears after N seconds only if the user requested it. Sales pages with VSL.

### Proof
8. **Logo row** - 4-6 grayscale logos at 60% opacity, 24-32px tall, one line, static. Marquee only when there are 8+ logos.
9. **Big-number strip** - 3-4 real metrics, numbers 48-64px tabular, label 14px muted, hairline separators. Only user-supplied figures.
10. **Featured quote** - one testimonial at 28-40px in the display font, photo + name + result. Right after the hero or before the final CTA.
11. **Testimonial wall** - masonry of 6-12 short quotes with avatars, varied lengths; optional slow vertical marquee in 2-3 columns with edge fade. Creators, communities.
12. **Case study cards** - before/after or problem/result with a real number, 2-3 cards, link to more. B2B, finance, coaching.
13. **Media/credential strip** - "As seen in" or certifications, small, near the CTA. Experts, finance.

### Explaining the offer
14. **Bento grid** - 5-7 cells, mixed spans (one 2x2 hero cell, two 2x1, rest 1x1) on a 4- or 6-column grid, each cell one idea with a real visual crop. Feature overviews, "what's inside".
15. **Alternating feature rows (zig-zag)** - image and text swap sides each row, 7/5 split, 96-128px between rows. 3-4 rows max. Course modules, benefits.
16. **Sticky scroll storytelling** - left column of 3-5 steps scrolls; right column media is sticky and swaps per step (crossfade 300ms). How-it-works, method, transformation. Desktop only; stack on mobile.
17. **Numbered process (real sequence)** - 3-5 steps horizontal on desktop with a connecting hairline, vertical on mobile. Onboarding, coaching method.
18. **Curriculum / module accordion** - modules with lesson counts and durations, first one open. Course sales pages.
19. **"Is this for you?" two-column** - "For you if" vs "Not for you if" lists, check/cross marks in muted ink. Qualifies high-ticket buyers.
20. **Problem -> agitation -> shift band** - short paragraph block in a narrow column (640px) on a tint band, then a bold one-line turn. Long-form sales letters.
21. **Comparison table** - you vs. alternatives (DIY, agency, other course), 4-8 rows, your column highlighted with the accent ring. B2B, finance, premium offers.
22. **Founder/host split** - large portrait (4:5) + bio + 3 credentials + signature or quote. Every personal brand needs one.

### Offer, price, objections
23. **Offer stack** - "everything you get" list with value per item, total, then the real price and CTA. Info products, launches. Values must come from the user.
24. **Pricing tiers** - 2-3 cards, middle one raised (ring in accent + "Most popular" small tag), monthly/yearly segmented toggle with sliding indicator, feature list max 6-8 per card.
25. **Guarantee block** - seal/icon-free: a bold line ("30-day refund, no questions"), 2 sentences, small signature. Next to pricing.
26. **FAQ** - accordion, 5-8 questions, two-column on desktop (title left, accordion right), plus/minus rotating 200ms.
27. **Final CTA band** - inverted (dark) band or full-bleed image, H2 restating the outcome, single CTA, risk-reversal line. The page's "end" in peak-end.

### Utility
28. **Sticky mobile CTA bar** - 64px bar with price/date + button, appears after hero CTA leaves viewport, hides near the footer CTA.
29. **Thank-you next-step page** - big confirmation line, 1-2-3 "what happens next" (check inbox, add to calendar, join community), optional short welcome video. No dead ends.
30. **Checkout trust layout** - two columns: order summary (product image, what's included, price, guarantee, 1 testimonial) on the right/top on mobile, form on the left; one accent, no motion except validation and press.

---

## 4. Motion guidance for landing pages

### 4.1 Principles

- Motion explains or rewards; it never decorates by default. **One orchestrated moment per page** (usually the hero) + quiet scroll reveals + responsive press/hover states.
- Marketing pages may run longer than product UI (Emil Kowalski: product UI < 300ms; explanatory/marketing can be longer). House limits: element reveals **400-700ms**, hero orchestration **<= 1200ms total**, nothing that blocks reading for more than 1s.
- **Ease-out for entering** (fast start, soft landing). Never ease-in for something appearing. Ease-in-out for things moving on screen. Linear only for constant motion (marquee, progress).
- Curves (house set):
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out, default)
  - `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)` (long reveals, editorial/wellness)
  - `--ease-expo: cubic-bezier(0.16, 1, 0.3, 1)` (snappy, kinetic)
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` (wipes, clip-path reveals)
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` (sheets, mobile menus)
  - Material 3 equivalents for reference: emphasized-decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)`, standard `cubic-bezier(0.2, 0, 0, 1)`; durations short 50-200ms, medium 250-400ms, long 450-600ms, extra-long 700-1000ms.
- Springs: critically damped (bounce 0) by default; bounce 0.15-0.25 only in Studio Pop or for things the user flicked/dragged (Apple: overshoot only when the gesture carried momentum).
- **Reveal once.** Scroll reveals play the first time only; never replay on scroll-up.
- **Content is visible without JS.** Hidden-until-revealed state is added by a class only after the script runs, or done in CSS scroll-driven animations inside `@supports (animation-timeline: view())`. A failed script must never leave a blank page.
- Reveal triggers early: when 10-15% of the element is visible, or `rootMargin: 0px 0px -10% 0px`. Content must never be invisible while the user is reading where it should be.
- Above-the-fold content: hero animates on load within 100ms of first paint; never delay the LCP element's visibility (animate opacity from 0.01 or animate secondary elements only, keep the H1 or hero image painted).
- Hover effects only under `@media (hover: hover) and (pointer: fine)`.

### 4.2 Preset library (~22)

| # | Preset | Values | Use when | Avoid when |
|---|---|---|---|---|
| 1 | **Fade-up** | opacity 0->1, translateY 12-24px -> 0, 500-700ms, `--ease-out` | default reveal for section headings, text blocks, cards | on every element in the page; on the LCP element |
| 2 | **Fade** | opacity 0->1, 400-600ms, ease-out | editorial, wellness, reduced-motion fallback | n/a (always safe) |
| 3 | **Stagger children** | 40-120ms between items, max 6 items staggered (rest appear together), total <= 600ms | card rows, lists, logo rows, bento cells | long lists (>8): cap it; text paragraphs |
| 4 | **Headline line reveal** | each line clips up from `translateY(100%)` inside overflow-hidden, 700-900ms, stagger 80-120ms, `--ease-out-soft` | the hero H1 only, premium/cinematic/editorial | body text; more than once per page |
| 5 | **Blur-in** | opacity 0->1 + `filter: blur(8px)->0` + translateY 8px, 600ms | hero sub-headline, featured quote | large areas (blur is costly), low-end mobile, more than 2 per viewport |
| 6 | **Scale-in media** | scale 1.06->1 + opacity, 1000-1400ms, `--ease-out-soft` (image inside a clipped frame) | hero image/video, full-bleed bands | small images; repeated on every image |
| 7 | **Clip-path wipe** | `clip-path: inset(0 0 100% 0)` -> `inset(0)`, 800-1000ms, `--ease-in-out` | gallery commerce, cinematic image reveals | text, UI, Studio Pop |
| 8 | **Screenshot rise** | translateY 40px + scale 0.98 -> 1, 800ms, `--ease-out` | product/course screenshot under a hero | when the screenshot is the LCP element on mobile |
| 9 | **Number counter** | 0 -> value over 900-1400ms ease-out, tabular-nums, starts when 50% visible, runs once | 1-4 real, user-supplied metrics | invented numbers; prices; more than one strip per page |
| 10 | **Logo marquee** | linear, 30-60s per loop (~40px/s), duplicated track, edge fade mask 64px, pause on hover and when off-screen | 8+ logos or a ticker of words | <8 logos (use a static row); reduced motion (static wrap) |
| 11 | **Testimonial marquee (vertical columns)** | 2-3 columns, opposite directions, 40-80s, pause on hover | creator/community walls of 12+ short quotes | <9 quotes; long testimonials |
| 12 | **Sticky scroll storytelling** | sticky media column (`position: sticky; top: 15vh`), steps trigger crossfade 300ms or scroll-linked progress | method/how-it-works, 3-5 steps, desktop >= 1024px | mobile (stack instead); combined with parallax or another sticky section |
| 13 | **Parallax (restrained)** | max 8-15% speed difference, background images only, `transform` only, disabled under reduced motion and on touch | one full-bleed photo band per page | text; multiple layers; with sticky stacks; on mobile |
| 14 | **Scroll progress line** | 2px bar, scaleX tied to scroll, linear | long-form sales letters, articles | short pages |
| 15 | **Typewriter / word cycle** | swap 1 word every 2.5-3s with a 300ms fade/slide, max 3-4 words, stops after 2 cycles | one rotating word in a creator hero ("for coaches / creators / experts") | the main claim (must be readable instantly); screen readers (use `aria-live="off"` + full sentence in hidden text) |
| 16 | **Hover lift** | translateY -2 to -4px + shadow step, 200ms `--ease-out` | clickable cards (pricing, product, blog) | non-clickable cards (implies interactivity); touch devices |
| 17 | **Image hover zoom** | inner image scale 1.03-1.05, 600ms ease-out, frame clips | product grids, blog/case-study cards | portraits in testimonials |
| 18 | **Press feedback** | `scale(0.97)` on `:active`, 120-160ms ease-out | every button and clickable control | whole sections |
| 19 | **Accordion** | height via `grid-template-rows: 0fr -> 1fr`, 250-300ms `--ease-out`; icon rotates 45deg | FAQ, curriculum | n/a |
| 20 | **Segmented toggle indicator** | sliding pill, 250ms spring (bounce 0) or `--ease-out`; prices crossfade + 4px slide 200ms | pricing monthly/yearly | n/a |
| 21 | **Countdown tick** | digit change: old slides up 100% + fades, new slides in, 300ms `--ease-out` | webinar/launch with a real deadline | evergreen fake timers |
| 22 | **Draw-in line/chart** | SVG `stroke-dashoffset` from length to 0, 1000-1500ms ease-out, once | finance charts, process connectors, signatures | decorative squiggles everywhere |
| 23 | **Sticky CTA bar enter** | translateY 100% -> 0, 300ms `--ease-drawer`, exits the same way | long sales pages on mobile | short pages; desktop when the nav already has a CTA |

**Personality presets per direction** (multiply the table defaults):
- Quiet Editorial / Atelier: durations x1.3, distances x0.5, no counters/marquees.
- Soft Ritual: durations x1.2, distances x0.75, no bounce.
- Swiss Precision / Ledger: durations x0.8, distances x0.5.
- Kinetic / Studio Pop: durations x0.8, distances x1.25, marquees allowed.
- Premiere: hero orchestration x1.3, everything else x1.

### 4.3 Performance rules

- Animate **only `transform` and `opacity`** (and `clip-path`/`filter` sparingly). Never animate width/height/top/left/margin/padding/box-shadow on scroll.
- Never `transition: all`; list properties.
- Prefer CSS transitions/animations and scroll-driven animations (`animation-timeline: view()`, supported in Chrome/Edge 115+, Safari 18.4+) inside `@supports`; then WAAPI; JS libraries last. CSS stays smooth when the main thread is busy.
- One shared `IntersectionObserver` for all reveals; unobserve after first reveal.
- `will-change: transform` only during the animation, removed afterwards; never on dozens of elements.
- Pause marquees and loops when off-screen (IntersectionObserver) and when the tab is hidden.
- `backdrop-filter` only on one sticky nav; never on large scrolling panels.
- Videos: compressed (<2-3MB for ambient loops), poster image, `preload="metadata"`, no autoplay with sound.
- Budget: Core Web Vitals "good" = **LCP <= 2.5s, INP <= 200ms, CLS <= 0.1** (75th percentile). Reveals must not cause layout shift (reserve space; animate transform only). Target first-load page weight < 1MB, ideally ~500KB above the fold.
- Test on a 4x CPU-throttled phone; if a reveal janks there, drop it.

### 4.4 Reduced motion and accessibility

- `@media (prefers-reduced-motion: reduce)`: replace all movement (translate, scale, parallax, clip wipes, marquees, sticky-scroll scrubbing, word cycling) with **opacity fades of 150-200ms** or no animation. Keep colour/opacity feedback (it aids comprehension). Reduced motion means gentler, not dead.
- Marquees under reduced motion become a static wrapped row. Counters show the final value. Countdown digits change without slide.
- **WCAG 2.2.2 (A)**: any auto-moving content that lasts > 5s (marquee, carousel, looping video, rotating words) needs pause/stop or must stop on its own; pause on hover and on focus as well. Provide a visible pause control for loops (playbook rule: every endless loop has a pause button).
- **WCAG 2.3.3 (AAA, follow anyway)**: scroll-triggered motion like parallax must be disable-able; honouring the OS setting covers it.
- Avoid full-viewport moving backgrounds, slow oscillations (~0.2Hz), and sudden brightness jumps between sections (fade dark<->light transitions).
- Never flash more than 3 times per second.
- Carousels: no autoplay by default; if used, >= 6s per slide, pause on hover/focus, visible controls.
- Respect `prefers-reduced-transparency` (solid nav) and `prefers-contrast: more` (solid borders, no low-contrast muted text).
- Focus states visible (`:focus-visible`, 2px ring in accent with 2px offset, >= 3:1 contrast).

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-reveal: 600ms; --dist-reveal: 16px; --stagger: 70ms;
}
.js .reveal { opacity: 0; transform: translateY(var(--dist-reveal)); }
.js .reveal.is-in {
  opacity: 1; transform: none;
  transition: opacity var(--dur-reveal) var(--ease-out), transform var(--dur-reveal) var(--ease-out);
  transition-delay: calc(var(--i, 0) * var(--stagger));
}
@media (prefers-reduced-motion: reduce) {
  .js .reveal { transform: none; }
  .js .reveal.is-in { transition: opacity 200ms ease; transition-delay: 0ms; }
  .marquee__track { animation: none; flex-wrap: wrap; }
}
```

---

## 5. Builder checklist (run before showing a page)

1. Direction chosen and written down: fonts, 4-6 colours with roles, radius, density, image style, motion personality.
2. Hero passes the 5-second test; one primary CTA verb used consistently.
3. Type: <= 2 families, <= 3 weights, display tracking negative, body 16-18px, measure 55-70ch, headings balanced.
4. Spacing on the 4/8 scale; section padding 96-160 desktop / 64-80 mobile; group spacing < between-group spacing.
5. Accent <= 10% of the page; every text pair >= 4.5:1 (large >= 3:1).
6. Images share one art direction, one radius, set aspect ratios; no stock clichés.
7. Scan against the 15 AI/template tells (section 1.7); fix every hit.
8. No invented proof: every number, logo, testimonial and "spots left" comes from the user or is a marked placeholder.
9. Motion: one orchestrated moment, reveals once, transform/opacity only, reduced-motion fallback, loops pausable.
10. Screenshot at 1440, 1024 and 390, light and dark if offered; fix overlaps and orphans before showing.

---

## 6. Sources

### Owner principles (local)
- `/Users/redmobile/systeme_io_editor_v2/apple-design.md` (Apple WWDC fluid interfaces, typography, materials, reduced motion, design principles)
- `/Users/redmobile/systeme_io_editor_v2/premium-ui-playbook.md` (AI-slop tells, tokens, motion system, process)

### Principles and typography
- Refactoring UI, Building your color palette: https://www.refactoringui.com/previews/building-your-color-palette
- Refactoring UI tactical rules (summary): https://cdn.jsdelivr.net/npm/claude-code-skills@0.5.0/data/skills/ux-ui-design-system/references/refactoring-ui.md
- Butterick, Practical Typography, summary of key rules: https://practicaltypography.com/summary-of-key-rules.html
- Butterick, Line length: https://practicaltypography.com/line-length.html
- Apple HIG, Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Apple HIG, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Laws of UX: https://lawsofux.com/
- Vercel Web Interface Guidelines: https://vercel.com/design/guidelines
- Utopia fluid type and space scales (Smashing): https://smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/
- Google Fonts Knowledge, Pairing typefaces: https://fonts.google.com/knowledge/choosing_type/pairing_typefaces
- Manrope pairings: https://madegooddesigns.com/?p=40182
- DM Sans pairings: https://madegooddesigns.com/?p=40179

### Colour, contrast, spacing
- WCAG 1.4.3 Contrast (Minimum): https://www.disabilityworld.org/toolkit/standards/wcag/1-4-3-contrast-minimum/
- 60-30-10 rule (UX Planet): https://uxplanet.org/the-60-30-10-rule-a-foolproof-way-to-choose-colors-for-your-ui-design-d15625e56d25
- 8-point grid (UX Planet): https://uxplanet.org/everything-you-should-know-about-8-point-grid-system-in-ux-design-b69cb945b18d
- Goodbye 8pt, hello 4pt grid (UX Collective): https://uxdesign.cc/goodbye-8-point-grid-hello-4-point-grid-1aa7f2159051
- Spacing best practices (Cieden): https://cieden.com/book/sub-atomic/spacing/spacing-best-practices
- Radix Colors, scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale

### Reference-site breakdowns
- Stripe style reference (Refero): https://styles.refero.design/style/48e5de76-05d5-4c4e-a269-c7c245b291ec
- Recreating Stripe, Linear, Vercel design systems: https://opendesigner.io/es/blog/recreating-stripe-linear-vercel-design-systems-with-design-md
- Linear, How we redesigned the Linear UI: https://linear.app/now/how-we-redesigned-the-linear-ui
- Vercel Geist typography: https://vercel.com/geist/typography
- Direction references: https://every.to · https://press.stripe.com · https://kinfolk.com · https://calm.com · https://ouraring.com · https://ritual.com · https://whoop.com · https://joinladder.com · https://mercury.com · https://wealthsimple.com · https://ramp.com · https://linear.app · https://vercel.com · https://stripe.com · https://attio.com · https://gumroad.com · https://figma.com · https://lu.ma · https://aesop.com · https://glossier.com · https://apple.com · https://masterclass.com · https://raycast.com

### Trends and galleries
- Web Design Trends 2026 (Line25): https://line25.com/articles/web-design-trends-2026/
- Zoho, landing page design trends 2026: https://www.zoho.com/landingpage/landing-page-design-trends.html
- Studio Meyer, web design trends 2026 reality check: https://studiomeyer.io/en/blog/webdesign-trends-2026
- SaaS Landing Page gallery: https://saaslandingpage.com/
- Land-book: https://land-book.com/ · Lapa Ninja: https://www.lapa.ninja/ (both block automated fetch; used as browsing references)
- Creative arsenal pattern library (split ratios, bento, pairing warnings): https://github.com/Laith0003/ux-skill/wiki/The-creative-arsenal-pattern-library
- Coaching website examples (Hostinger): https://www.hostinger.com/tutorials/?p=102931
- Coaching website design (Seahawk): https://seahawkmedia.com/design/top-coaching-website-design/
- Social proof (UX Planet): https://uxplanet.org/unlock-the-power-of-social-proof-convert-more-visitors-with-testimonials-5efde8468b5a

### AI/template anti-patterns
- How to fix AI slop in web design, tell by tell: https://capitalandcompute.net/blog/fix-ai-slop-design/
- AI slop fonts and gradients (925 Studios): https://www.925studios.co/blog/ai-slop-design-tells
- Why AI keeps building the same purple gradient website: https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website
- Why AI design looks generic (Superdesign): https://www.superdesign.dev/blog/why-ai-design-looks-generic
- AI design slop overused UI patterns (Noqta): https://noqta.tn/en/blog/ai-design-slop-overused-ui-patterns-fix-2026

### Motion
- Emil Kowalski, Great animations: https://emilkowal.ski/ui/great-animations
- Emil Kowalski, 7 practical animation tips: https://emilkowal.ski/ui/7-practical-animation-tips
- Emil Kowalski, design-engineering skill (curves, durations, stagger): https://github.com/emilkowalski/skills
- animations.dev course: https://animations.dev/
- Material motion tokens (Material Components Android): https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md
- Material 3 easing and duration: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
- web.dev Custom easing: https://web.dev/articles/custom-easing
- CSS scroll-driven animations (Flavio Copes): https://flaviocopes.com/css-scroll-driven-animations/
- W3C Understanding SC 2.3.3 Animation from Interactions: https://w3c.github.io/wcag/understanding/animation-from-interactions.html
- Scroll storytelling (Studio Meyer): https://studiomeyer.io/en/blog/scroll-storytelling
- Chrome, entry and exit animations: https://developer.chrome.com/blog/entry-exit-animations

### Performance
- web.dev, defining Core Web Vitals thresholds: https://web.dev/articles/defining-core-web-vitals-thresholds
