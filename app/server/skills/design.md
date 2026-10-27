# Design skill

Distilled from research/design-research.md (Refactoring UI, Apple HIG, Laws of UX, Linear / Vercel / Stripe, Emil Kowalski, Material motion, WCAG) and the owner's apple-design.md + premium-ui-playbook.md. Each "## " part is sent only when it fits; parts starting with "Always" are always sent.

## Always: what makes a page look premium

Premium = few decisions, held everywhere: one font pairing, one spacing rhythm, one accent, one radius family, one motion personality, real content. A template look comes from defaults nobody chose.
Commit to the page's visual direction (its fonts, colours, radius, density, image style, motion) before building, apply it with one theme op, and never change it per section.

Type (the biggest lever):
- At most 2 font families and 3 weights. A distinctive heading font; a calm, readable body font.
- Hero headline 56–80px desktop (38–48px on mobile via a mobile setStyle), line-height 1.0–1.08, negative tracking. Section titles 40–48px. Card titles 20–24px. Lead text 19–22px. Body 16–18px, line-height 1.55–1.65. Never body under 16px.
- Hero headline about 14–18 characters per line (maxWidth 640–760px), 2–3 lines. Body paragraphs 55–70 characters (maxWidth 620–680px). Centre only blocks of 3 lines or fewer; longer text is left-aligned.
- Sentence case for headings and buttons. No ALL CAPS headlines (except the Kinetic direction). At most one italic or coloured word in a headline per page, and only in directions that use it.
- De-emphasise with the muted colour, not with tiny sizes.

Space and layout:
- Spacing from 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160. Space inside a group is always smaller than between groups: heading to its text 16–24, text to its button 32, block to block 64+.
- Section paddingY 96–160 desktop (default 120), 64–80 on mobile; the hero may go 128–176 at the top.
- Containers: section maxWidth 1120–1200; text columns 640–720; forms 400–480.
- Uneven splits read designed: 7/5, 8/4, 60/40 (row style.colWidths [7,5]). Avoid 50/50 for hero splits.
- Vary the rhythm down the page: contained → split → full-bleed image → contained → dark band. Seven identical centred sections read as a template.
- Backgrounds: at most two light tones (bg + surface) plus at most one dark band (usually the final call to action or a proof section). Don't stripe every section.
- Cards: padding 24–32 (40 for large), gap 16–24. Nested radii are concentric (inner = outer − padding). Depth by tone (bg → surface) or a ring + soft shadow ("soft"), never a grey border and a heavy shadow together.
- Buttons: 48px tall desktop, 52 mobile (paddingY 15–17), padding sides 20–28, label 15–16px 500–600. One filled primary per view; the secondary is ghost or outline.

Colour:
- 60-30-10: background ~60%, ink + surfaces ~30%, the accent ≤ 10%: buttons, links, one highlight per section, key numbers. If the accent is everywhere it points nowhere.
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1, button label vs button ≥ 4.5:1. Muted text must still pass. Never grey text on a coloured band: use white at 70–80% or a tint of the band's hue.
- Dark: bg #0A0A0A–#121212 (not pure black except Premiere), ink #EDEDED–#F4F4F5, the accent lighter and less saturated.
- Gradients only as a subtle tonal shift within one hue, or an image scrim. No purple-to-blue gradients, no gradient text, no gradient buttons, no colour blobs, no glows.

Images:
- Real photos of the actual person or product beat stock and illustration. One art direction per page: same light, temperature and grade; one image radius.
- Aspect ratios: 4:5 portraits and split heroes (aspect 0.8), 3:2 product (1.5), 1:1 avatars, 16:9 video (1.78), 21:9 cinematic bands (2.33).
- Text over a photo only with a scrim (section overlay rgba(0,0,0,.35–.55)).
- Screenshots of a course or product sit in a card (radius 12–16, shadow "mid"), cropped to what matters.
- Icons: one set, used sparingly; prefer numbers, small photos or product crops to generic line icons.

Composition:
- The hero passes the 5-second test (who, what they get, what to do). One primary + at most one secondary action.
- The strongest proof right after the hero; the strongest call to action block last (peak-end).
- Exactly one thing per section stands out (the recommended plan, the key number).

The first screen is a poster, not a document (OpenAI): the brand or offer, one headline of 2-3 lines, one short sentence, one button group and one dominant, real visual (the person, the product, the result). No badges, chips, stat strips or logo clouds in it. Leave a hint of the next section visible. Brand test: if a competitor's name fits the first screen, there is no idea yet.
Cards are not the default: use one only when removing its border, background or shadow would hurt understanding. Never cards inside cards, never sections styled as floating cards. Spend boldness in one place: one element is memorable, everything around it quiet. Visual structure is information: borders, numbers, eyebrows and dividers must mean something. If deleting 30% of the copy improves the page, keep deleting.
Never a one-note palette (everything in one hue family: purple-blue, cream/sand/tan, slate, espresso): check the theme colours before you finish.

Tells that make a page look AI-made (check your output and fix every hit):
1. A default font on headings with no chosen display face.
2. Indigo/violet gradients, gradient text or buttons, glow blobs.
3. The stock order: centred hero + "New" pill + two buttons + logo row + three identical icon cards. Lead with what is most characteristic of this business (the person, the result, the product).
4. The same radius and shadow on everything; cards inside cards.
5. Glassmorphism and neon glows.
6. The same fade on every block, counters on every number, a marquee for 4 logos.
7. Filler copy ("Elevate your journey") and invented proof presented as real.
8. Sparkles, rockets, emoji as icons.
9. Cream + serif + terracotta for every brief; near-black + acid green for anything "tech".
10. Newspaper cosplay (hairlines and zero radius) on non-editorial content.
11. A tracked all-caps eyebrow above every heading.
12. An italic or coloured word in every headline.
13. 01 / 02 / 03 numbering on things that are not a sequence.
14. Uniform rhythm: every section centred with the same padding and width.
15. Several accents competing; huge soft shadows on flat cards; stock photos of handshakes and laptops.

## Always: your own palette and fonts for each business

The directions below are starting points, never a cage. Every page gets a look made for that business:
- Start from the feeling the audience should have (calm, confident, energised, safe, delighted, inspired) and the brand's own colour if the user gave one.
- Accent: one colour that carries that feeling and fits the niche, chosen fresh (not the direction's default unless it truly fits). Examples: confident public speaking → a deep, assured blue (#1F3A8A) or warm vermilion (#C2410C); kids' nutrition → a friendly tomato (#E2553D) on cream; meditation → dusty lavender (#6E5BA6) or sage; luxury real estate → near-black with brass (#A07D3B); a bakery → warm crust brown (#8A4B2A).
- Neutrals tinted toward the accent (a blue brand gets cool greys, a terracotta brand warm ones); background, surface and dark band built from them. Check contrast: text 4.5:1, button label on the accent 4.5:1 (use dark text on light accents).
- Fonts: any Google Fonts family (write its exact name). Pick for the voice, pair a characterful heading with a calm body. Good choices by mood:
  - Calm, literate, trusted: Newsreader, Source Serif 4, Literata, Lora, Fraunces (soft), Instrument Serif (display only).
  - Elegant, premium, beauty: Bodoni Moda, Playfair Display, Cormorant Garamond, Gloock, DM Serif Display.
  - Modern, clean, product: Geist, Inter Tight, Manrope, Plus Jakarta Sans, Satoshi-like Outfit, Figtree, Onest.
  - Confident, editorial grotesk: Schibsted Grotesk, Hanken Grotesk, Instrument Sans, Archivo, Space Grotesk.
  - Friendly, warm, approachable: Nunito, Quicksand (body only sparingly), Fredoka, Lexend, Rubik, Urbanist.
  - Loud, sporty, energetic: Archivo (800), Anton, Bebas Neue, Oswald, Big Shoulders Display.
  - Playful creator: Bricolage Grotesque, Syne, Unbounded (sparingly), Sora.
  Body fonts stay readable: Inter, Figtree, Hanken Grotesk, Instrument Sans, Manrope, Source Sans 3, DM Sans, Lexend, Nunito Sans.
- Apply it all with one theme op (fonts, colours, radius, heading weight and tracking). The whole page follows the theme, so don't paint sections or text one by one with colours the theme already gives.
- On a page that already has content, change the whole page's look only when the user asks for it; if a request would need it, ask first with one short question (options "Yes, change the look" / "Keep the current look").

## Index: the visual directions (for planning)

Pick the closest one per page by the business and audience as a starting mood, then make the look your own (see "your own palette and fonts"); a brand colour the user gave is the accent.
- Quiet Editorial: calm authority, a person with a point of view. Coaches (life, executive), consultants, authors, therapists, speakers.
- Soft Ritual: soft, restorative, warm. Wellness, yoga, meditation, nutrition, women's health, retreats.
- Kinetic: energy, discipline, results; loud type, hard contrast. Fitness, personal training, sports, challenges.
- Ledger: trustworthy, precise, quietly expensive. Finance, investing, real estate, accountants, legal.
- Swiss Precision: sharp, efficient, modern product company. B2B, agencies, SaaS, tech courses, freelancers selling services.
- Studio Pop: playful, confident, internet-native. Creators, YouTubers, digital products (templates, presets, ebooks), communities.
- Atelier: curated, tactile, product as hero. E-commerce, beauty, fashion, home, food, products sold as objects.
- Premiere: an event, anticipation, a show. Webinars, masterclasses, launches, summits, high-ticket programmes.
Thank-you pages keep the funnel's direction, lighter. Checkouts keep it with Swiss-level restraint (no motion).

## Direction: Quiet Editorial

Mood: calm authority; reads like a good essay. Fits coaches, consultants, authors, therapists, speakers, high-ticket advisory.
Look: a literate serif for headings (e.g. Newsreader, Source Serif 4, Literata, Instrument Serif) with a calm grotesk body; paper-like warm or cool off-white background, near-black ink, one deep, quiet accent chosen for the brand (forest, ink blue, oxblood, slate…); square-ish radius 2–8.
Radius: buttons 2–4, images 0–4, cards 8. Density: airy (section paddingY 128–160, text column 640–680).
Images: one large honest portrait (4:5) in natural light, muted grade; black-and-white works. Book covers, real workspace. No illustrations.
Patterns: thesis hero (big serif line, small byline and portrait); one long letter section; pull quotes in the serif at 32–40px; hairline-divided lists; testimonials as quotes with names, no cards; two-column bio with one photo.
Motion: slow and minimal: fade only, speed slow; stagger lists; no parallax, no counters, no marquee.
References: every.to, press.stripe.com, kinfolk.com.

## Direction: Soft Ritual

Mood: soft, restorative, kind. Fits wellness, yoga, meditation, nutrition, women's health, holistic coaching, retreats.
Look: a soft serif or rounded display (e.g. Fraunces, Gloock, Lora) with a gentle humanist body (Figtree, Manrope, Nunito Sans); an oat, sand, blush or mist background; a muted natural accent picked for the brand (sage, clay, dusty lavender, sea glass…); large soft radius 20–28, pill buttons.
Radius: pill buttons (999), cards 24, images 24–32; one arched portrait (radii [999,999,24,24]) allowed once as the signature.
Density: airy (paddingY 112–144), body 17–18px, line-height 1.65.
Images: natural light, skin texture, hands, plants, water, linen, morning light; warm, low contrast. Never gym or clinical images.
Patterns: split hero 55/45 with an arched portrait; "what you'll feel" list with soft dividers; one full-bleed photo band with one quiet line; programme timeline (week 1/2/3) on the tint band; 3 large testimonials; FAQ.
Motion: gentle: fade-up, speed slow, stagger cards; no bounce, no counters, no marquee.
References: calm.com, ouraring.com, ritual.com.

## Direction: Kinetic

Mood: energy, discipline, results. Fits fitness coaches, personal trainers, sports programmes, transformations, challenges.
Look: a heavy or condensed display (Archivo 800, Anton, Bebas Neue, Big Shoulders Display, Oswald) with a sturdy body (Inter, Archivo); dark-first or stark light; one hot accent picked for the brand (signal orange, volt, electric red, cobalt…), with dark text on light accents; hard edges, radius 0–6.
Radius 0–4, hard edges. Density: punchy (paddingY 80–112), tight heading-to-text gaps (12–16), big numbers. Headlines may be capitals here.
Images: high-contrast action photography, motion blur, sweat, chalk, hard side light, desaturated; full-bleed, cropped tight. Before/after only with real photos.
Patterns: full-bleed photo hero with a giant headline; a ticker of programme words; a big-number results strip (real numbers only); programme cards with week counts; transformation testimonials (photo + result); coach split with stats; pricing with a bold "most popular".
Motion: snappy: fade-up, speed quick, stagger; counters allowed once on real numbers; hover lift on cards.
References: whoop.com, nike.com training pages, joinladder.com.

## Direction: Ledger

Mood: trustworthy, precise, quietly expensive. Fits finance educators, investing courses, advisors, real estate, accountants, insurance, legal.
Look: a refined serif display (Instrument Serif, Source Serif 4, DM Serif Display) with a precise sans body (Geist, IBM Plex Sans, Inter) and tabular numbers; crisp white or stone background, navy or charcoal ink, a trustworthy accent chosen for the brand (money green, deep teal, ink blue, brass for small labels…); radius 8–12.
Radius: buttons 8, cards and images 12. Density: medium (paddingY 104–128); clear data blocks allowed.
Images: restrained: the advisor in a calm office, architecture, real clean dashboards, paper and pen; cool neutral grade. No coins, piggy banks, money piles, arrows going up.
Patterns: split hero with a real chart or product card floating on the right (shadow mid); credential strip; "how it works" in 3 real steps; comparison table (you vs. the typical way); a case study with real figures; small legible disclaimer footer.
Motion: measured: fade-up, speed normal; counters once on real figures only.
References: mercury.com, wealthsimple.com, ramp.com.

## Direction: Swiss Precision

Mood: sharp, competent, efficient. Fits B2B consultants, agencies, SaaS, tech courses, marketing services, freelancers.
Look: one sharp grotesk family (Geist, Inter Tight, Manrope, Onest) with tight display tracking; white background, true greys; one crisp accent chosen for the brand (cobalt, violet, emerald, the brand colour…); radius 6–12.
Radius: buttons 6–8, cards and screenshots 12. Density: medium-compact (paddingY 96–128), 16px body, tight grids.
Images: real product UI and diagrams, team photos in one grade; screenshots in ring-framed cards. No 3D blobs.
Patterns: left-aligned hero (headline, sub, two buttons) with a full-width product screenshot below it; a static logo row; a bento grid of 5–7 cells with real UI crops; sticky-scroll walkthrough; metrics strip; case-study cards; 3-tier pricing; two-column FAQ.
Motion: crisp: fade-up, speed quick; the screenshot rises (scale); no hover lift (cards just sharpen).
References: linear.app, vercel.com, stripe.com, attio.com.

## Direction: Studio Pop

Mood: playful, confident, maker energy; colourful but organised. Fits creators, YouTubers, digital product sellers, newsletters, communities, younger audiences.
Look: a characterful display (Bricolage Grotesque, Syne, Sora, Unbounded sparingly) with a friendly body (Instrument Sans, DM Sans); white background with up to three pastel block tints; one vivid accent chosen for the brand (hot pink, tangerine, grape, electric blue…); radius 12–16, pill or neo-brutal buttons (not both).
Radius: cards 12–16, buttons pill or 10. Either soft-rounded OR neo-brutal (2px solid #111 border + hard offset look), never both.
Density: lively (paddingY 96–120), big type contrast (display 72–96).
Images: the creator's own face with personality, bright natural colour; product mock-ups; real screenshots of their content.
Patterns: big-type hero with the face on a colour block; "what's inside" bento of product previews; creator stats (real only); a wall of short testimonials with avatars; product cards with price tags; footer with social links.
Motion: lively but quick: scale or fade-up, speed quick, stagger; hover lift on cards; a slow testimonial ticker is allowed.
References: gumroad.com, figma.com, lu.ma.

## Direction: Atelier

Mood: curated, tactile, product as hero, boutique. Fits e-commerce (beauty, fashion, home, food), physical + info bundles, books, premium courses sold like products.
Look: a high-contrast serif (Bodoni Moda, Playfair Display, Cormorant Garamond) or a refined grotesk (Schibsted Grotesk) with a light geometric body (Jost, Inter); white and product-backdrop stone; ink-black buttons, at most one product colour; radius 0–2.
Radius: images 0, buttons 0–2. Density: airy around products, dense in details; product grids with 16–24 gaps.
Images: studio product shots on a seamless backdrop matching the surface colour, one angle and shadow; macro textures; lifestyle in the same grade; 4:5 tiles.
Patterns: full-bleed product hero with a small left-aligned headline; editorial split (image 60 / text 40) alternating sides; product grid; ingredients / what's-in-the-box list with macro shots; reviews with stars; guarantee + shipping strip.
Motion: slow and luxurious: fade or scale, speed slow; no bounce.
References: aesop.com, glossier.com, apple.com product pages.

## Direction: Premiere

Mood: an event, anticipation, a show. Fits webinars, masterclasses, live launches, high-ticket programmes, summits, challenge registrations.
Look: a bold grotesk display with tight tracking (Schibsted Grotesk, Archivo, Inter Tight) with a clean body (Inter); near-black stage background; one spotlight accent chosen for the brand (gold, red, electric blue…) with dark text on light accents; radius 10–16.
Radius: video and cards 12–16, buttons 10. Density: dramatic (hero at most one screen tall, paddingY 120–160), few elements per screen.
Images: cinematic 16:9 / 21:9 stills of the host on stage or in a studio, low-key light, shallow depth of field; speakers in one treatment.
Patterns: event hero (date + time + timezone, a countdown only to a real date, one "Save my seat" button, host photo); 3–5 numbered lessons (a real sequence); host credibility split; agenda; speaker grid (summits); bonus stack; FAQ; final call to action repeating the date.
Motion: theatrical but restrained: the hero photo scales in slowly, headline lines in sequence (custom split), the rest fade-up normal.
References: masterclass.com, apple.com event pages, raycast.com.

## Patterns: building premium sections with the editor's elements

Use 2–4 distinctive patterns per page, not all of them. Don't combine a bento with a broken grid, or two sticky sections, or two full-screen heroes. How to build them:
- Asymmetric split hero: section → row (colWidths [7,5] or [6,4], vAlign center, gap 48–64) → left column: headline, lead text, button (+ one line of reassurance); right column: a 4:5 portrait image (aspect 0.8).
- Photo overlapping a colour block: a row whose right column has a background colour and pad, and the image inside it with negative margin (mar [-48,0,0,-64]) so it breaks out of the block; or an image with a small stat card column overlapping it (the next element with a negative top margin).
- Product-below hero: centred or left headline + sub + buttons, then the screenshot image full width in a card (radius 12–16, shadow mid); the next section pulls up under it with a negative top margin.
- Full-bleed media hero: section with backgroundImage + overlay rgba(0,0,0,.45), minHeight 640–760, content bottom-left, white text.
- Thesis hero: no image; a 64–96px headline over 2–3 lines (maxWidth 760), small sub, one button.
- Bento grid: a row with colWidths [2,1] whose left column holds one big card and whose right column holds a nested row of two stacked cards, then a second row [1,1,1]; each card is a column with background (surface or a tint), radius, pad 24–32, a title 20–24px, one line of text and a real visual crop.
- Zig-zag feature rows: 3–4 rows, colWidths [7,5] then [5,7] (or reverse true), 96–128 between rows.
- Comparison table: a row of 3 columns (label, "us", "the usual way"), each a column of short text lines with matching gaps; the "us" column has the accent ring (borderType full, borderColor primary, radius) and a soft background.
- "Is this for you?": a row of 2 columns: "For you if" / "Not for you if", each a list with check / x markers in the muted ink.
- Big-number strip: a row of 3–4 columns, each a headline 48–64px (tabular) + a 14px muted label; real numbers only.
- Featured quote: one testimonial at 28–40px in the heading font, a 56px photo, name and result.
- Founder split: 4:5 portrait + bio + 3 credentials + a short quote.
- Offer stack: a card column listing what they get with a value per line, a hairline, the total, then the real price and the button.
- Pricing: 2–3 cards, the recommended one raised (shadow mid, accent ring, a small "Most popular" tag).
- Guarantee block: a bold line ("30-day refund, no questions asked"), two sentences, a small signature; no seals.
- Final call to action band: a dark section (tone dark) restating the outcome, one button, one reassurance line.
- Sticky scroll storytelling: a row of 2 columns; the media column has motion {"scroll":"sticky"} while the other column holds 3–5 steps; desktop only (stack on mobile).
Keep elements inside the right containers: a section holds rows/elements, a row holds columns, a column holds elements and rows.

## Motion: animating the page

You are the only way animations get on a page: there is no animation panel in the editor. Add them when you build (in the direction's personality) and whenever the user asks for movement, effects, "alive", "modern", parallax and so on. To remove one, set props.motion to null.
Motion explains or rewards; it never decorates by default. One orchestrated moment per page (usually the hero) + quiet reveals as sections scroll in + hover on clickable cards. Reveals play once. The editor shows the page still; animations play in Preview and on the live page, and visitors who ask for less motion see everything at once.
Set an element's (or a section's) props.motion with setProps, or in a NODE's props:
{"enter":"fade|fade-up|fade-down|slide-left|slide-right|scale|blur|clip|zoom","stagger":true,"speed":"quick|normal|slow","hover":"lift|grow","scroll":"parallax|sticky|marquee","count":true,"typing":true,"custom":{...}}
- enter (plays once as it scrolls into view): fade-up is the default reveal for headings, text blocks and cards; fade for editorial and wellness; scale for a hero screenshot; zoom for a hero or full-bleed photo (settles from slightly closer, slow); clip for gallery or cinematic photo reveals (a wipe from the bottom); blur for one hero subheadline or a featured quote; slide-left / slide-right for split layouts (each side from its own side).
- stagger: on a row, column or list, its items appear one after another (cards, logos, bullets). Use instead of animating each card.
- speed: quick 450ms (Kinetic, Swiss, Studio Pop), normal 700ms, slow 1000ms (Editorial, Soft Ritual, Atelier, Premiere hero).
- hover: lift (−4px) or grow (scale 1.03) on clickable cards only (pricing, products).
- scroll "parallax": on an image, or on a section / column with a background photo, the photo drifts slower than the page (one band per page, never on text).
- scroll "sticky": a media column stays in view while the column next to it scrolls (storytelling steps, desktop).
- scroll "marquee": a row of logos, words or short quotes slides by in an endless line (pauses when pointed at). Only with 8+ items (or a word ticker); fewer logos stay static.
- count: numbers in it count up once (1–4 real metrics; never invented numbers, never prices).
- typing: its words appear as typed (one short line, rarely).
- custom, for anything the presets don't do: {"keyframes":"from{…} to{…}" (or percentages),"duration":900,"easing":"cubic-bezier(0.22,1,0.36,1)","split":"letters|words" (optional: each letter or word in turn),"trigger":"enter|scroll","label":"short name, e.g. Letters drop in"}.
  trigger "enter" plays once as it appears. trigger "scroll" ties the animation to the scroll position: it runs from when the element enters the screen to when it leaves (e.g. a photo that zooms from 1.15 to 1 while you scroll past it, a headline that slides sideways, a section that fades as it leaves). Keyframes may use transform, opacity, filter, clip-path and colours only; at most 1.2s for "enter". Tell the user it is a custom effect they can ask you to change or remove.
Examples:
- Parallax hero: the hero section has backgroundImage + overlay and props.motion {"scroll":"parallax"}; its headline {"enter":"fade-up","speed":"slow"}; its subheadline {"enter":"blur","speed":"slow"} with style.delay 0.15.
- Feature cards: the row gets {"enter":"fade-up","stagger":true}; each clickable card {"hover":"lift"}.
- Logo strip: the row of 8+ logos {"scroll":"marquee"}.
- "Make the photos zoom as I scroll": each photo {"custom":{"keyframes":"from{transform:scale(1.15)} to{transform:scale(1)}","trigger":"scroll","label":"Zoom on scroll"}}.
- "Letters drop in": the headline {"custom":{"keyframes":"from{opacity:0;transform:translateY(-0.6em)} to{opacity:1;transform:none}","duration":600,"split":"letters","label":"Letters drop in"}}.
Never: the same animation on every block, counters on every number, more than one parallax, animation on the checkout. Delay (style.delay) shifts an entrance by seconds; use it for the hero's secondary elements (0.1–0.3s).
Per direction: Editorial and Atelier slow fades and clip/zoom photos only; Soft Ritual slow fade-up; Swiss and Ledger quick fade-up; Kinetic and Studio Pop quick, stagger, hover lift, marquee allowed; Premiere a slow hero (zoom on the media, custom line-by-line headline) and normal reveals.
