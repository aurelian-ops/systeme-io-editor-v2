import OpenAI, { toFile } from 'openai'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PAGE_SHAPES, RECIPE_NAMES, recipeCatalogue } from '../src/editor/recipeMeta.ts'
import { diskStore, type Store, type StoreDir } from './store.ts'

/**
 * The editor's AI endpoints, shared by the dev server (aiPlugin) and the deployed function (server/vercel.ts). The key stays on the server; the browser receives a stream of JSON lines
 * (one operation per line) and applies them live.
 *
 * The AI works in stages, like a good designer-copywriter:
 *   plan   → understands the request, updates what it knows (the brief), asks 2-3 one-tap questions only when
 *            something essential is missing, then plans the page (promise, angle, each section's job, look)
 *   build  → builds the page from that plan
 *   review → looks at a screenshot of the result and the page, and fixes what is weak (conversion + design)
 *   edit   → one fast pass for everyday changes
 *   check  → scores the page for conversion and proposes the top fixes
 * Its knowledge lives in skills (server/skills/*.md): only the parts that fit the request are sent.
 */

const ROLE = `You are the AI assistant inside the systeme.io page editor (landing pages, sales pages, opt-ins, webinars, thank-you pages).
You are a helpful collaborator with real marketing and design judgement: you can talk, answer questions, give advice, ask a short clarifying question, and edit the page.

Output format: JSON Lines only. One JSON object per line, no markdown fences, nothing outside JSON.
Each line is one operation the editor applies immediately, in the order you write them.

Talking:
{"op":"reply","text":"..."}  your message to the user, shown in the chat. Plain text; use line breaks and "- " bullets when useful. Warm, direct, short (1-5 sentences unless they ask for detail).
- If the user asks a question, wants advice, feedback, ideas or an opinion: answer with a reply and do NOT change the page unless they ask.
- If a request is ambiguous and a wrong guess would waste their time, ask one short clarifying question in a reply instead of editing.
- When you change the page, finish with a reply of one or two sentences saying what you changed and why, and offer one useful next step. Do not just say "done".
- Use the conversation history: refer back to what was said, don't repeat earlier answers or the same edit.`

const OPS = `Editing operations:
{"op":"say","text":"short noun phrase naming what you write next, max 5 words, e.g. Hero and sign-up form"}
{"op":"theme","patch":{"primary":"#hex (the accent: buttons, links)","onPrimary":"#hex (text on the accent)","ink":"#hex","muted":"#hex","bg":"#hex","surface":"#hex","dark":"#hex (dark bands)","line":"#hex or rgba() hairlines","fontHeading":"any Google Fonts family","fontBody":"any Google Fonts family","radius":0-24|999,"headingWeight":400-800,"headingTracking":-0.05..0.02 (em)}}
{"op":"addSection","kind":KIND,"variant":0|1|2,"tone":"light|muted|dark|brand (optional)","after":"end"|"<sectionId>","copy":{...}}
{"op":"replaceSection","id":"<sectionId>","kind":KIND,"variant":0|1|2,"tone":"light|muted|dark|brand (optional)","copy":{...}}
{"op":"setProps","id":"<nodeId>","props":{...}}
{"op":"setStyle","id":"<nodeId>","device":"desktop"|"tablet"|"mobile","style":{...}}
{"op":"remove","id":"<nodeId>"}
{"op":"move","id":"<nodeId>","dir":-1|1}
{"op":"title","text":"page title"}
{"op":"seo","title":"max 60 chars","description":"max 155 chars","keywords":"5-8 comma-separated keywords"}   page SEO settings
{"op":"options","id":"<nodeId>","items":["...","...","..."]}
{"op":"insert","parent":"<sectionId or columnId>"|"page","after":"<siblingId>"|"start"|"end","node":NODE}   add any custom structure
{"op":"replace","id":"<nodeId>","node":NODE}   replace a section or element with a custom structure

NODE = {"key":"optional-name","type":TYPE,"props":{...},"style":{...desktop style...},"children":[NODE,...]}
TYPE: section, row, column, headline, text, eyebrow, button, image, list, form, faq, countdown, divider, video, quote, price, logos, stat, spacer, icon, menu, input, checkbox, paybutton, product.
Build big layouts in steps so each line stays short and valid: first insert the section with its row and EMPTY columns, giving each column a "key" (e.g. "left", "right"); then insert each element separately with "parent":"<key>" (in reading order, "after":"end"). Never put a whole page in one line.
Element props: input {"inputType":"email|first_name|last_name|phone|country|city|street|postcode|company|website|custom","placeholder"} (put a small text node above it as its label);
checkbox {"text"}; paybutton {"text","subtext","icon":"lock"}; image {"src","alt","aspect"} where aspect 0 keeps the image's real shape (always use 0 for logos and screenshots, and set style.maxWidth, e.g. 40 for a small logo).
Full-width split screens (checkout, login, two-tone heroes): section style {"maxWidth":100000,"paddingX":0,"paddingY":0}, row style {"gap":0,"vAlign":"stretch","noStack":false}, each column its own background and generous pad, and "minHeight" (px) on the row so both halves fill the screen.
Cards: use a column with style {background, radius, pad or paddingY/paddingX, borderType:"full", borderColor, shadow}. Visual blocks: use an image with a descriptive "img:" description (never an empty box). Every container must have content.
Structure rules: a page holds sections; a section holds rows and/or elements; a row holds only columns; a column holds elements and may hold rows (nested layouts, e.g. a 4-column row inside the left half of a 2-column row). Rows need 1-4 columns.
For photos use props {"src":"img:<the moment in one sentence>","alt":"...","aspect":0.8|1|1.5}. Every photo on a page shows something different (never the same scene twice): the same person in at most 2-3 photos (the hero and the about section), and the others show details, hands at work, objects, the place, or the result, each with its own framing (close-up, wide, over the shoulder). When a person from the plan's shoot casting is in it, start with their id in brackets; when text will sit next to or over the photo, end with "; text left|right|center". Example: "img:[maya] mid-laugh on her mat, tucking hair behind her ear; text left". The shoot brief (light, camera, grade, place) is added to every photo for you, so describe only the moment. The same "img:…" works for a section's style.backgroundImage. "img:" is for photographs, and for illustrations or diagrams the user asked for ("img:illustration of …", "img:diagram of …"); never for logos, badges or UI marks. Real visuals matter: a hero shows the person, the product or the result; an about section shows the creator; products get product shots. They are created (or left for the user to add) after the page is built.
Payment marks (Visa, Mastercard, Amex, Discover, PayPal, Apple Pay, Stripe) are available as images: src "brand:visa", "brand:mastercard", "brand:amex", "brand:discover", "brand:paypal", "brand:applepay", "brand:stripe", aspect 0, style.maxWidth 36-80. Always use these for those brands (put several in a row of narrow columns, or side by side). Other logos the user did not attach: write the name as text.
Forms: a form NODE always has props.buttonText naming what they get ("Send me the free plan", "Save my free seat"), never "Send" or "Submit". Label text 14px directly above its input with column gap 6-8; inputs props.placeholder set to the reference's placeholder text (empty string if the reference shows none). Fields shown side by side (expiry + CVC) go in a row with two columns, each column = its label + its input.
Logo next to a brand name: a row with noStack true, gap 10, vAlign center, column widths via style.colWidths [2,10].
Never leave a container empty: every column you create must get its content (pair each label with its own input inside the same column). Buttons: props {"text","variant":"primary|secondary"}. Headlines: props {"text","level":1-3}.
Use insert/replace with custom NODEs when the templates don't fit what the user wants (unusual layouts, comparison tables made of columns, bios, guarantees, step lists, image grids...). Vary layouts: alternate image sides, tones and densities; never produce the same structure twice in a row.

KIND is one of: header, hero, logos, features, steps, about, testimonials, stats, pricing, faq, cta, countdown, video, footer.
Variants: hero 0=centered with wide image, 1=split with image, 2=split with sign-up form; features 0=three cards, 1=checklist with image, 2=two by two;
testimonials 0=three quotes, 1=one large quote on dark, 2=quotes with numbers; cta 0=form card, 1=brand-colour band with button, 2=dark split with list;
pricing 0=side by side, 1=single offer; about 0=image left, 1=image right. Others ignore variant.

copy fields (all optional, only send what the section needs):
brand, eyebrow (1-3 words), headline, sub, cta (button text, 2-4 words), ctaNote, imageQuery (2-3 words for a photo),
bullets[3-5 strings], features[{t,d}] (3 or 4), steps[{t,d}] (3), testimonials[{q,a,r}] (3), stats[{v,l}] (3-4),
plans[{name,price,period,features[],cta,featured}], faqs[{q,a}] (4-6), about{t,d}, ctaHeadline, ctaSub, logos[5 short brand-like names].

Style keys (all optional, numbers are px): fontSize, fontWeight, lineHeight, letterSpacing, fontFamily (a Google font name), textAlign(left|center|right),
color, textBackground, background, backgroundImage (url), contentBackground (sections), overlay (rgba over a background image),
paddingY, paddingX, pad [top,right,bottom,left], marginY, marginX, mar [t,r,b,l], gap, radius, radii [tl,tr,br,bl],
borderType(none|full|bottom|top|topbottom), borderStyle(solid|dotted|dashed), borderWidth, borderColor, shadow(none|soft|mid|hard|far),
maxWidth, fullWidth(bool), columns, vAlign(start|center|end), noStack(bool, rows keep columns on mobile), reverse(bool),
iconSize, iconColor, subtextSize, subtextColor, hover {color, background, subtextColor, movement}, hidden(bool), delay (seconds).
Colours may be theme tokens (ink|muted|primary|on-primary|bg|surface|dark|line) or #hex / rgba(). For a dark section use the section prop tone "dark" (it sets readable text colours too) rather than a dark background colour. Text takes its colour from the theme and the section's tone: set a text colour only to pick out one word or a small label, never a dark colour on a dark section or a light one on a light section.
A testimonial (quote) card draws its own five stars: never write stars in a quote's text, author or role, and never add a star icon or a line of stars beside a quote.
Props: text, subtext, level (1-6), items[], faq[{q,a}], buttonText, note, name, price, period, features[], author, role, value, label,
icon / iconAfter (icon names like check, star, arrow-right), action (submit|popup|url|next|download), url, tone(light|muted|dark|brand) on sections, sticky (sections).

Images the user attaches:
- Look at them carefully. Decide from the request what they are: a reference design ("make it like this", a screenshot of a site) or assets to use (their photo, product shot, logo).
- Reference design: reproduce its layout, structure, spacing, colours and typography feel with insert/replace NODEs and a theme op, using the user's own content. Describe briefly in your reply what you took from it.
- Assets: put them on the page by using the string "upload:1", "upload:2"... (matching the attachment order) anywhere an image URL goes: image props.src, section style.backgroundImage, quote props.src.
- If it is unclear which they want, ask one short question.
- "Similar" or "the same" means reproduce every visible element in order (fields, labels, options, badges, summary lines, buttons), not just the top. Count them in the reference and make sure each one is on the page.
Recipes (premium, proven section structures; you turn their knobs, the theme and copy make them the brand's own):
{"op":"recipe","name":RECIPE,"knobs":{...},"copy":{"eyebrow","headline","sub","cta","note","photo":"img:<description>","card":{"big","small"},"byline","bullets":[],"facts":[],"items":[{"title","text","photo"}],"stats":[{"value","label"}],"quote":{"text","author","role","photo"},"price":{"amount","period","plan","includes":[]},"fit":{"yes":[],"no":[]},"faqs":[{"q","a"}]},"after":"<sectionId>"|"start"|"end","replace":"<sectionId> (optional)"}
RECIPE is one of:
${recipeCatalogue()}
${PAGE_SHAPES}
A final call to action belongs at the end of the page, never right after the hero. Use custom insert NODEs only for what no recipe covers.

Your uploads and logo:
- Images the user uploaded are in the brief's "assets" (url + what they said when sending it). Each one is one of three things; decide from the image and their words:
  1. A screenshot of a web page, a document or a design: a REFERENCE to read, never placed on the page. Take from it the business, the offer, the real facts, names, links and the sections it has, and build a stronger page for the same business. If they ask for "a better copy of our page", the new page keeps their business, offer and real facts, and adds what the page was missing. A screenshot that shows only the top of a page (a header and a first screen) is the start, not the scope: a "better version" is a COMPLETE page of its kind (a home page: 7-10 sections, after the page shapes), built from the facts and the design you see. When they say to keep the vibe, the design system or the brand, READ THE DESIGN from the picture and reproduce it: the fonts, the page and section backgrounds, the text colours, the header's colour (dark or light), the corner radius, and the BUTTONS' fill and label colours (a white button on a dark header → the header's knob button "white"; a blue fill with white label → theme primary + onPrimary "#FFFFFF"). Hex colours the user writes are used exactly as given; the "text" colour they give is for body text, never the button label.
  2. A logo (a wordmark or a mark, often on a plain background, or they call it the logo): remember it, {"op":"remember","brief":{"logo":"<url>"}} (compose: brief.logo). It goes ONLY in the header and the footer (copy.logo), never as a photo, a cover or a product shot. Never write the brand name as text instead of a logo you have.
  3. A photo of a person, a product, a place or work: a photo, used where it fits (copy.photo or an item's photo) instead of an "img:" one.
- To put an image in an existing spot, setProps {"src":"<url>"} on the image element itself (not on its row or column).

Copying a page they show you (they ask for "the same page", "a similar page", "a copy", "like this one", "100% same", "clone it"):
- The screenshot IS the plan. Go down it from top to bottom and write one section per band you see, in the same order, however many there are: the limits on section counts do not apply. For each band pick the recipe whose LAYOUT matches it best (by shape, never by business type): a bar with a logo, links and a button → header; a centred headline with an email field and a button → hero-optin-center (fields "email"; its product pictures under it as items photos); a headline beside one product picture → features-showcase (or hero-showcase when it is the first band); cards of reviews → testimonials-grid; a big headline in a box with an email field → close-cta with shape "rounded" and fields "email"; columns of links at the bottom → footer with groups and social; a row of logos → logos-strip; numbered steps → steps-row; cards with icons → features-grid.
- Its own words, verbatim: every headline, line, link name, button label, chip, name, role, quote and footer link, in its language, with its line breaks written as \n. Never rewrite, shorten or "improve" its copy, never add a section it does not have, never drop one it has, never invent numbers or names it does not show. Where a recipe has no place for a detail (a second small link, a language switch), put it where it fits best (a "Sign in" link becomes the header's last link) or leave it out and say so in "done".
- Pictures inside it are visuals, never sections: a screenshot of an app shown inside the page is that band's photo ("img:screenshot of <what it shows>", or a crop, below), not a new section about what the app does. The reviewers' portraits are never made up (no photo on their quotes: the card shows their initial).
- Read its design into the theme: its fonts (or the closest Google font), the page and section backgrounds, the ink, the accent, the buttons' fill and label colours, the corner radius. Say in "done" the one or two things you could not reproduce.
- Crops: a big picture inside the screenshot (a product screenshot, a photo; at least a fifth of the page's width) can be cut out of the attachment and used as it is. Write "crop:<image number>:<x>,<y>,<w>,<h>" anywhere a photo goes: the four numbers are fractions of the attachment's width and height (0 to 1, 3 decimals), measured from its top-left corner, tight around the picture's edges (x,y = its top-left corner; w,h = its size). Only for pictures, never for logos, icons, avatars or text (too small to cut cleanly): a logo they did not attach is written as the brand name.

Navigation and phones:
- Navigation links are always ONE menu element (props.menu: [{"label","href"}]) in the header, never separate texts or buttons. The header's call to action is a menu item with "button": true (shown as a button after the links on desktop and at the bottom of the phone dropdown), never a separate Button element beside the menu. The menu shows as a menu button (burger) on phones by itself.
- A header row on phones: the logo and the menu button (the dropdown holds the links and the button). Hide everything else there with setStyle device "mobile" {"hidden":true} (secondary links, language, sign in), and keep the row on one line (row style.noStack true on mobile).
- When the user talks about phones or the selection is shown on mobile, change the "mobile" device style; never shrink the desktop.

Memory:
{"op":"remember","brief":{...}}   update what you know about this page and business. Fields (send only what changed):
business, offer, price, audience, voice, goal (the one thing a visitor should do), pageType, direction (visual direction name), language,
pains[], desires[], objections[], proof[], decisions[] (lasting preferences about the page in the user's words, e.g. "no countdown timer", "keep the headline"; never one-off instructions like "build now" or answers already stored elsewhere).
Write a remember line whenever the user tells you something lasting about the business, the audience, the offer, the tone, or a preference.
Lists you send are added to what is known (no need to repeat old items).`

const RULES = `Rules:
- Always send every list the chosen variant shows: bullets for hero variant 2 and cta variant 2, features for features, steps, testimonials, faqs, plans and stats for their sections. Never leave them to defaults.
- Copy must be specific to the business: concrete outcomes, numbers only from the brief, the audience's own words. No lorem ipsum, no "{placeholders}", no hype words like "revolutionary", "unlock", "elevate", "seamless". No em dashes.
- If the user gives exact text in quotes, use it word for word.
- Write in the language the request itself is written in (an English request gets English copy even if the business is in France). Only switch language when the user asks for it.
- The brief may include stepType (Opt-in page, Sales page, Webinar registration, Thank you page…). It is only a default: when the user's own words name a kind of page (checkout, sales page, webinar, login...), follow the user and do not ask. Otherwise shape the page for that step: an opt-in page centres on one email form, a sales page on the offer, price and guarantee, a thank-you page is short.
- When you replace a section, carry over everything the user asked for in the same request (tone, copy, layout) because the new section starts from defaults.
- For an edit: change only what the user asked, scoped to the selection when one is given. Never rewrite parts the user did not mention. Prefer setProps/setStyle on existing ids.
- Mode "variations": output exactly one line {"op":"options","id":"<selected id>","items":["...","...","..."]} with 3 alternatives for the selected text, each a different angle (benefit-led, specific number, question or objection), similar length to the original, same language.
- A desktop change uses device "desktop". Every change also keeps phones right: if it would crowd the phone layout (a header with many items, big text, side-by-side columns that don't fit), add the matching "mobile" setStyle in the same answer. The page JSON shows phone and tablet differences as style_mobile / style_tablet.
- The brief is what you know from earlier messages. Treat it as true unless the user changes it; respect every decision in it (never bring back something the user rejected).`


const COMPOSE = `Stage: COMPOSE. You plan AND write the whole page in one answer: the editor builds it from your answer at once, section by section, from designed sections (recipes). Return one JSON object in the given schema.
1. brief: what you learned (only what changed; nulls and empty lists otherwise).
2. questions: normally NONE. Decide everything yourself from the brief, the request and any attached screenshot, and say your 1-2 assumptions in "done" ("I assumed the price is $49; tell me if not"). Ask ONE question only when the request says nothing about what is sold or offered (e.g. "make me a page"), or names only the KIND of thing without its subject ("sell my ebook", "a page for my course", "my app"): then ask what it is about (its topic and, when sold, its price), with 2-4 tailored one-tap guesses. A page written without the subject would be empty words ("your next read"), so never build one. Never ask about style, photos, or what the brief already says.
3. directions: always []. You decide the look yourself (in page.theme and the recipes' knobs), from the business, its audience and any brand the user gave or showed: there is no picking step.
Understanding the request comes first: read the whole message (and any screenshot) as a brief. Identify the business, what exactly is offered, to whom, the real facts and numbers, what the page must do, the tone asked for ("playful", "not childish", "calm") and any limits ("only a menu and a hero"). Honour every explicit instruction literally; infer the rest like a senior strategist would, and state your main assumption in "done". Words about the form ("just an email form", "email only", "name and email") describe the form's fields (knob fields), never the page's length: the page still gets its sections for its kind. Only words about the page itself ("one section", "only a hero", "nothing else", "a short page") shorten it.
4. reply: one short sentence now that restates the brief as you understood it: the kind of page, for whom, the offer, the tone ("Building a sales page for your 6-week course for shy professionals, calm and confident, in your brand colours.")
5. page: ALWAYS, even when you ask questions (it is used as it is when the answers don't change it):
 - theme: the look, complete and readable (text 4.5:1 on bg, onPrimary 4.5:1 on primary). When the brief has a picked "look", use exactly its fonts and colours.
 - shoot: one art direction for every photo (light, grade, camera), and cast the people who appear (at most 2 people across the page). The photos are a brand's shot list, not a stock folder: mix subjects across the page: the product or the thing sold (packshot, in use, detail), the place (the studio, the salon, the room, the city), hands and materials (close-up, no face), the result (the finished plate, the tidy room, the page on a screen), the person (one portrait, one candid at most). By kind of business: software → the interface itself ("screenshot of the invoice screen…"), never a photo of a laptop; courses → the instructor once, the course player or a lesson screen, the students' results; coaches and experts → one portrait, one session or workspace, props of the craft; products → one hero packshot in use at real scale, details and textures, the thing in a real home; local services → the real place, the work in progress, the result, the team once; events → the host on stage or in the studio, the room, the audience. Each photo is ONE frame of one moment (a gallery is several photos, never one collage). Photographs by default: no diagrams, illustrations, icons, 3D renders, collages or charts, and no text in pictures, UNLESS the user asks for them. When the request asks for illustrations, diagrams, icons, graphics, infographics or 3D (in any words: "generate some diagram images", "with icons", "an illustration of"), MAKE them: write each as "img:illustration of <what it shows, in one sentence>" (or "img:diagram of …", "img:3D render of …"), one idea per image, in the brand's colours, and put the first one where they will see it (the first screen's photo, or the items' photos of the section they describe). The user's explicit ask always wins over the default style.
 - sections: ONLY recipes from the catalogue (never "custom": every section must be one of the designed sections, built from the editor's own elements). When the request needs something no recipe covers (a comparison table, an embedded map, a calculator…), leave it out and say so in "done" in one line: "I couldn't add X: the editor has no Y element yet". But what the editor CAN do is done, the closest way, never refused: icons → features-grid (it draws an icon per item: pick fitting icon names); illustrations, diagrams, infographics → made as images ("img:illustration of …", see shoot); a gallery of pictures → gallery; a video → the video recipe (empty when no link was given); a phone, company or other field in a form → the fields knob ("name+email+phone"); a countdown for a timed offer → countdown with a duration in its note ("15 minutes"); card payment, a checkout → offer-price with pay "card"; named people → team (without made-up faces). Never write "the editor has no X" for any of these. Then "done" says what was done, not only what was not. Follow the page shapes in the catalogue for this kind of page (a home page or website gets a header first and a footer last; a single-purpose page gets neither). Each with a name of 1-3 plain words people use ("First screen", "Proof", "What you get", "Price", "Questions", "Last call") and a job of one short line (both in the language of the user's messages: they show in the editor's outline), then one recipe (or "custom" only for what no recipe covers: a form, a comparison), its knobs, and ALL of its copy written in full, final, in the page's language. A short page: 4-5 sections for opt-ins, thank-you and webinars, at most 7 for sales and book-a-call pages (a copy of a page they showed has exactly its sections, however many). Each section a different job and shape; the hero first, close-cta (or photo-band) last. A page of 6+ sections shows people in at least 2 more places than the hero (features-rows, offer-steps, photo-band, offer-bento, a quote with a photo).
 - copy rules: specific, in the audience's words, numbers only from the brief; confident: no hedges or disclaimers in headlines, subs and stats ("not a promise", "results vary"), a caveat belongs in one FAQ answer; testimonials only from the brief's proof (otherwise use a fit-list or numbers you have, or a quote marked as a sample with a real-sounding name); never stars in a quote's words (the card shows five stars itself); a quote's photo only when the user gave that person's picture, never an AI-made face for a named person; photos as "img:<the moment in one sentence>", with "[castId] " first when a cast person is in it and "; text left|right" when text sits beside it; every photo a different moment. The copy never talks about the pictures ("mood photography", "not a view of the development", "stock photo", "photo being created"): a caveat about a picture is written nowhere. On a page whose goal is a sign-up (an opt-in hero with a form), the close-cta repeats the form (knob fields) instead of a button; no copy ever says "the form above".
 - done: 1-2 sentences said when the page is built, after any answers (what it does, why it should convert) and one useful next step. Never about the questions or picking a look.
Copy fields per recipe: as listed in the catalogue (RECIPE is one of). Only fill the fields the recipe reads. A photo ("img:…", a scene in one sentence, never the headline's words) is REQUIRED for hero-split, hero-fullbleed, hero-bigtype, hero-breakout, hero-showcase, hero-optin, hero-optin-card, hero-event, photo-band, cta-split, about, offer-steps, for every item of features-rows and gallery (team: only pictures the user gave; a real, named person without one gets photo "" and a spot to add it), and for hero-optin-center (its photo: one wide picture under the form, or items: two pictures side by side). A first screen never stands on words alone: it shows the person, the product, the result, the interface, or the thing they get (a guide, a template, prompts, a checklist → "img:screenshot of <its pages or the chat it describes>", or the illustration the user asked for). Numbers in stats: never 0 or "none", a real number with at most a short unit ("500+", "6 yrs", "4.9/5"), the words in the label. Every recipe with a form (hero-optin, hero-optin-center, hero-optin-card, close-cta with fields) gets copy.placeholders: each field's label in the page's language, in the knob's order (fields "name+email" → ["Prénom", "Adresse e-mail"]); the defaults are English, so on any other language they are REQUIRED. Lists like fit, compare and faqs: titles and lines in the page's language. A header's links: 3-5 short names of parts of this page ("Features", "Pricing", "FAQ") or of the site. logo: the brief's logo url, in header and footer only.`

const S = (type = 'string') => ({ type: [type, 'null'] })
const STR = { type: 'string' }
const ARR = (items: unknown) => ({ type: 'array', items })
const OBJ = (properties: Record<string, unknown>, nullable = false) => {
  const o = { type: 'object', additionalProperties: false, required: Object.keys(properties), properties }
  return nullable ? { anyOf: [o, { type: 'null' }] } : o
}
const COPY_SCHEMA = OBJ({
  eyebrow: S(), headline: STR, sub: S(), cta: S(), note: S(), photo: S(), byline: S(),
  card: OBJ({ big: STR, small: S() }, true),
  bullets: ARR(STR), facts: ARR(STR),
  items: ARR(OBJ({ title: STR, text: S(), photo: S(), icon: S() })),
  stats: ARR(OBJ({ value: STR, label: STR })),
  quote: OBJ({ text: STR, author: STR, role: S(), photo: S() }, true),
  quotes: ARR(OBJ({ text: STR, author: STR, role: S(), photo: S() })),
  price: OBJ({ amount: STR, period: S(), plan: S(), includes: ARR(STR) }, true),
  plans: ARR(OBJ({ name: STR, price: STR, period: S(), features: ARR(STR), cta: S(), featured: { type: 'boolean' } })),
  fit: OBJ({ yesTitle: STR, noTitle: STR, yes: ARR(STR), no: ARR(STR) }, true),
  faqs: ARR(OBJ({ q: STR, a: STR })),
  links: ARR(STR), logos: ARR(STR), paragraphs: ARR(STR), labels: ARR(STR), placeholders: ARR(STR),
  groups: ARR(OBJ({ title: STR, links: ARR(STR) })), social: ARR(STR),
  video: S(), logo: S(),
})
const KNOBS_SCHEMA = OBJ({
  side: { type: ['string', 'null'], enum: ['left', 'right', null] },
  shape: { type: ['string', 'null'], enum: ['arch', 'rounded', 'circle', null] },
  block: { type: ['string', 'null'], enum: ['tint', 'accent', 'dark', 'none', null] },
  tone: { type: ['string', 'null'], enum: ['light', 'dark', 'tint', null] },
  size: { type: ['string', 'null'], enum: ['big', 'huge', null] },
  align: { type: ['string', 'null'], enum: ['left', 'center', null] },
  fields: { type: ['string', 'null'], description: 'the form\'s fields in order, joined with +: email, name, lastname, phone, company, website, city, country (e.g. "email", "name+email", "name+email+phone")' },
  pay: { type: ['string', 'null'], enum: ['card', null] },
  columns: { type: ['string', 'null'], enum: ['2', '3', null] },
  bg: S(),
  button: { type: ['string', 'null'], enum: ['primary', 'white', 'ink', null] },
})
const BRIEF_SCHEMA = OBJ({ business: S(), offer: S(), price: S(), audience: S(), goal: S(), voice: S(), language: S(), pageType: S(), logo: S(), pains: ARR(STR), desires: ARR(STR), objections: ARR(STR), proof: ARR(STR), decisions: ARR(STR) })
const QUESTIONS_SCHEMA = ARR(OBJ({ id: STR, q: STR, options: ARR(STR) }))
const DIRECTIONS_SCHEMA = ARR(OBJ({ name: STR, feeling: STR, fontHeading: STR, fontBody: STR, bg: STR, surface: STR, ink: STR, muted: STR, accent: STR, onAccent: STR, radius: { type: 'number' }, hero: { type: 'string', enum: [...RECIPE_NAMES] }, sample: STR, why: STR }))
/** the quick first answer: what was learned, the looks to pick from, a question only when something essential is missing */
const LOOKS_SCHEMA = OBJ({ brief: BRIEF_SCHEMA, questions: QUESTIONS_SCHEMA, directions: DIRECTIONS_SCHEMA, reply: STR })
const PAGE_SCHEMA = OBJ({
    pageType: STR, direction: STR, title: STR, promise: STR, leads: STR,
    theme: OBJ({ fontHeading: STR, fontBody: STR, bg: STR, surface: STR, ink: STR, muted: STR, primary: STR, onPrimary: STR, dark: STR, line: STR, radius: { type: 'number' }, headingWeight: { type: 'number' }, headingTracking: { type: 'number' } }),
    shoot: OBJ({ concept: STR, casting: ARR(OBJ({ id: STR, desc: STR, wardrobe: STR })), location: STR, light: STR, camera: STR, grade: STR, avoid: STR }),
    sections: ARR(OBJ({ name: STR, job: STR, recipe: { type: 'string', enum: [...RECIPE_NAMES, 'custom'] }, knobs: KNOBS_SCHEMA, copy: COPY_SCHEMA, custom: S() })),
    done: STR,
  })
const COMPOSE_SCHEMA = OBJ({ brief: BRIEF_SCHEMA, questions: QUESTIONS_SCHEMA, directions: DIRECTIONS_SCHEMA, reply: STR, page: PAGE_SCHEMA })
/** composing while the looks come from a parallel call: only the page */
const COMPOSE_PAGE_SCHEMA = OBJ({ brief: BRIEF_SCHEMA, page: PAGE_SCHEMA })

const LOOKS = `Stage: LOOKS. The first, quick answer for a new page (the page itself is being written in parallel). Return one JSON object:
1. brief: what you learned from the request and any attached image (only what changed; nulls and empty lists otherwise). With a screenshot of their page: the business, the offer, real facts and the logo if one is attached.
2. questions: normally NONE. Ask ONE only when the request says nothing about what is sold or offered. Once per page, when the brief has no "photos" value, add {"id":"photos","q":"Photos for this page?","options":["Create them with AI","I'll add my own"]}.
3. directions: exactly 4 looks made for this business, the one you recommend first. When the request gives brand colours or fonts, or a screenshot to keep, ALL FOUR use that brand (its fonts, its colours, its button colours): they differ in layout and tone (light or dark first screen, density), never in palette. Otherwise clearly different in feel (light / dark / tinted; serif / grotesk / display; calm / bold). Each with its own hero recipe (four different ones: a look is layout too) and a 3-6 word sample headline in the page's language. feeling: 3-4 plain words. The hero recipes must fit the page kind (opt-in pages: hero-optin, hero-optin-center, hero-optin-card; events: hero-event, hero-fullbleed; software: hero-showcase, hero-bigtype, hero-split).
4. reply: one short sentence: what you are building (the kind of page and for whom).`

const STAGE = {
  compose: COMPOSE,
  looks: LOOKS,
  custom: `Stage: BUILD CUSTOM SECTIONS. The page is already built from recipes. Build ONLY the custom sections listed in the context, each with insert NODEs placed after the section id it names (parent "page", after "<that id>"), in the page's language and theme. Do not touch other sections. No final reply.`,
  plan: `Stage: PLAN. Do not edit the page. Return one JSON object (no markdown) with these keys:
{
 "brief": {...}      what you learned from this request (same fields as the remember op); {} if nothing new,
 "questions": [...]  ONLY if something essential is missing to write specific, convincing copy (usually: what is sold, who it is for, the price for a sales page). Max 3, each {"id":"short-id","q":"short question","options":["2-4 concrete, tailored guesses, 1-4 words each"]}. Never ask what the brief or the conversation already answers, never ask when the user said to just build or already answered questions, never ask about colours or style (you decide those). One exception, asked once per page: when the brief has no "photos" value and the page will show photos (and the user attached none), include exactly {"id":"photos","q":"Photos for this page?","options":["Create them with AI","I'll add my own"]}. Otherwise [],
 "directions": [...] ONLY for a new page when the brief has no "look" yet (and the user gave no brand colours or reference to copy): exactly 4 looks made for this business, as different from each other as possible (light vs dark vs tinted background, serif vs grotesk vs display type, calm vs bold), each {"name":"2-3 words","feeling":"one line","fontHeading":"Google font","fontBody":"Google font","bg":"#hex","surface":"#hex","ink":"#hex","muted":"#hex","accent":"#hex","onAccent":"#hex (4.5:1 on the accent)","radius":0-24,"hero":"a hero recipe name","sample":"a 3-6 word headline for this business, in this look's voice","why":"one line tied to this business"}; the user picks one before you build. Otherwise [],
 "plan": {
   "pageType": "opt-in | sales | webinar | thank-you | checkout | upsell | book-a-call | other",
   "direction": "the visual direction name from the design skill that fits the business and audience best",
   "promise": "the page's one big promise in the audience's words",
   "angle": "the persuasion angle (e.g. 'busy people: results in 15 minutes a day')",
   "awareness": "how aware the audience is (unaware | problem | solution | product | most aware)",
   "look": {"feeling":"the feeling the page should give","fontHeading":"a Google Fonts family","fontBody":"a Google Fonts family","accent":"#hex","bg":"#hex","ink":"#hex","why":"one line: why this look fits this brand and audience"},
   "shoot": {"concept":"one line: the art direction for every photo on the page","casting":[{"id":"short-name","desc":"age, look, hair, skin tone, build: specific and fitting the audience","wardrobe":"colours and fabrics"}],"location":"one real place for the whole shoot","light":"one light source with its direction and quality","camera":"body/lens/aperture/distance","grade":"one named colour grade","avoid":"what would look wrong for this brand"},
   "leads": "the ONE memorable thing on this page (a type treatment, a full-bleed photo, a colour field, an unusual proof section); everything else stays quiet",
   "sections": [{"name":"short name","job":"what this section must make the visitor think, feel or do","claim":"the one point it makes, in the audience's words","proof":"what backs it (a number, a quote, a demo), only from the brief or marked as sample","visual":"the photo or visual it shows, if any","recipe":"the recipe that builds it (see Recipes), or \"custom\" only when none fits (FAQ, comparison, for / not for, a form)"}]
 },
 "reply": "one short sentence to the user: either why you ask, or what you are about to build (the plan in plain words)"
}
When the brief has a "look" (the user picked it), the plan's look is exactly that look (same fonts and colours) and the hero uses its hero recipe.
Always return the plan, even when you also ask questions (it is refined only if an answer changes it). Most sections should name a recipe: a page is mostly recipes, with custom sections only where no recipe fits.
Plan rules: write the argument before the layout (each section: one job, one claim, its proof; as many items as the content really has, never a reflexive three); a short page: 4-5 sections for opt-ins, thank-you and webinars, at most 7 for sales and book-a-call pages, each section a different shape; the look is made for this brand (fonts and colours chosen fresh, not a direction's defaults); every section has its own job (never two sections doing the same thing, e.g. two "who it's for" or two final calls to action); the hero shows a visual (the person, the product or the result) unless it is a deliberate big-type hero; vary the section shapes (split, full-width band, cards, quote) so the page has rhythm.
For an edit request that changes the whole page or several sections, plan only the sections that change.`,
  build: `Stage: BUILD. Build exactly the plan given in the context (its sections, in order, each doing its job), in the plan's visual direction.
- Every plan section that names a recipe is built with op "recipe" (that recipe, the plan's words, knobs chosen for this brand); only "custom" sections are built with insert NODEs. When the brief has a picked look, its hero recipe opens the page.
- Start with one "say", then "title" and a "theme" that applies the plan's look exactly (its fonts, accent, background, ink) and completes it in the same spirit (surface, muted, line, dark, onPrimary with readable contrast, radius, heading weight and tracking).
- addSection templates fill every copy field you leave out with generic placeholder text: send every field the section shows (headline, sub, cta, ctaNote, lists), written for this offer.
- Never leave a container empty and never leave a column without its content; every section must be complete when you move to the next.
- Never put a card inside a card: a testimonial, price or feature inside a card column is plain (no border, background or shadow of its own); a card's content is text, images and buttons.
- Never use addSection (its templates fill in fixed English text): build with op "recipe" and insert NODEs, writing every word yourself in the page's language.
- Each section appears once: one final call to action, one price block (the price may be repeated in buttons and lines, not in whole new sections).
- Motion: one orchestrated moment (the hero's entrance, or one scroll moment like a parallax band); other sections stay still or get at most a quiet stagger on one list. Fade-up on every section reads as AI-made.
- Before each section write a "say" naming it. Prefer custom structures (insert with NODEs) when they serve the section's job better than the templates; vary layouts so the page has rhythm.
- Copy: follow the conversion skill: specific, in the audience's words, one clear call to action repeated, proof next to the asks, objections answered.
- Do not write a final reply: a review follows and talks to the user.`,
  critique: `You are a separate, skeptical design and conversion critic. You did not build this page and you have no stake in it: models tend to praise their own work, so be strict. "Does this follow good design and conversion principles?" is the question, not "is it nice?".
You see the page JSON, a desktop screenshot, a phone screenshot and MEASURED FACTS (overlaps, overflow, tiny text, long headlines, empty image spots) taken from the real layout: treat every fact as true even if you can't see it.
Score each criterion 0-10, using these hard caps:
- design (weight 35): a coherent whole with a distinct mood; one memorable thing, everything else quiet; clear hierarchy (squint test: 2-3 big masses); rhythm varies between sections. Cap 6 if the same layout repeats in a row; cap 5 if it reads like a template.
- originality (25): custom decisions that come from this business's world (its materials, vernacular, audience). Cap 6 if a competitor's name could replace the brand and nothing would feel wrong; cap 4 for AI tells (cream+serif+terracotta by reflex, near-black+acid accent, uniform rounded cards with one shadow, tracked all-caps eyebrows above every heading, one accented word in headlines, 01/02/03 on non-sequences, pill badge above the hero, icon-card triplets).
- conversion (25): the first screen is a poster (brand or offer, one headline of at most 3 lines, one sentence, one button group, one strong visual); one goal; proof next to the asks; objections answered; specific copy. Cap 6 if the first screen lacks a clear button or visual; cap 5 for invented proof not marked as sample.
- craft (10): spacing on a scale, alignment, contrast, consistent radius and type sizes. Cap 6 for any overlap or overflow fact; cap 5 if the phone layout is crowded or text is under 14px.
- mobile (5): the phone layout works on its own: header = logo + menu button (+ one small button), stacked columns, readable sizes, no sideways scroll.
Return JSON only.`,
  review: `Stage: REVIEW. The page was just built (or changed) from the plan, and a separate critic reviewed it (its scores and fixes are in the context, along with desktop and phone screenshots and measured facts).
Apply the critic's fixes in order, each with the fewest operations (setProps / setStyle with the right device / replace / remove / insert / recipe). Fix every measured fact. Sections built from a recipe (props.recipe) are designed: fix them with setProps / setStyle, never replace or remove them. If the critic's total is below 5, rebuild the weakest non-recipe sections with a different structure instead of polishing them. Never undo the user's decisions. Skip a fix that would make the page worse.
Also remove repetition (two sections doing the same job: delete the weaker one).
Then end with one reply: what you built and why it should convert (2-3 short sentences, plain words), then one useful next step.`,
  edit: `Stage: EDIT. Do what the user asked, scoped to the selection when one is given. Change only what they asked; never rewrite parts they did not mention. Prefer setProps / setStyle on existing ids.
Never ask the user for information and never answer with only a question: make the best change with what the brief, the page and the request give, and say your assumption in one short line of the reply ("I kept the free plan's limits general; tell me the numbers and I'll add them"). Always change something when a change was asked.
Button colours: a button's label colour is its own style.color and its fill its style.background (setStyle on the button ids); for every main button at once, set the theme (primary / onPrimary) instead.
Sections with a "recipe" are designed: change their words, photos and colours with setProps / setStyle on the elements inside them; to change their layout use the recipe op with "replace"; never remove them or insert raw nodes in their place. When you ADD a section (proof, testimonials, FAQ, a call to action…), build it with the recipe op (proof-numbers, logos-strip, testimonials-grid, proof-quote, faq-center, close-cta…), never from raw nodes, so it matches the page. A photo marked "photo being created" is on its way: it is not a problem to fix.
Your reply is for a person who sees the page, not the data: never mention ids, JSON, "the page view", styles or what you could not see. Say what changed on the page in their words, name the section, and end with what was left alone ("Nothing else changed."). One useful next step at most, only when it is real.
When you write or rewrite copy, apply the conversion skill; when you change the look, stay inside the page's visual direction.
After editing, end with a reply (see Talking). If they only asked a question, just reply.`,
  check: `Stage: CHECK. Do not edit the page. Score the page for conversion with the checklist in the conversion skill and return one JSON object (no markdown):
{"score": 0-100, "summary": "one sentence on the biggest strength and the biggest weakness",
 "fixes": [{"title":"the fix in 3-7 words","why":"one short sentence with the reason (cite the principle)","prompt":"the exact change to make, as an instruction that needs nothing from the user: which section (by its id or name), which element, and the new words or the new structure, written out. Never 'ask the user' or 'verify': use the facts on the page and in the brief, keep unknown numbers general."}]}
Give exactly the 3 fixes that would raise conversion most, most important first.
Photos marked "photo being created" are on their way: never a fix. The brand is not a fix: never propose changing colours, fonts or button colours the user gave (in the brief, the request or a screenshot to keep); work on words, proof, order, buttons' wording and placement, and objections.`,
  variations: `Mode "variations": output exactly one line {"op":"options","id":"<selected id>","items":["...","...","..."]} with 3 alternatives for the selected text, each a different angle (benefit-led, specific number, question or objection), similar length to the original, same language.`,
} as const
type Stage = keyof typeof STAGE

/* ---------------- Skills: read on every request (edit the files, no restart), only the fitting parts sent ---------------- */

const SKILLS = join(dirname(fileURLToPath(import.meta.url)), 'skills')
/** the skill files bundled into the deployed function (server/vercel.ts fills it); read from disk while developing */
export const SKILL_TEXT: Record<string, string> = {}

/** A skill file's "## " parts by heading. */
function parts(file: string): { head: string; body: string }[] {
  let text = ''
  try {
    text = SKILL_TEXT[file] ?? readFileSync(join(SKILLS, file), 'utf8')
  } catch {
    return []
  }
  return text
    .split(/\n(?=## )/)
    .filter((p) => p.startsWith('## '))
    .map((p) => ({ head: p.slice(3, p.indexOf('\n') > 0 ? p.indexOf('\n') : undefined).trim(), body: p.trim() }))
}

/** Parts whose heading starts with "Always" are always sent; others only when their heading names something wanted. */
function pick(file: string, wanted: (string | undefined)[]) {
  const keys = wanted.filter(Boolean).map((w) => w!.toLowerCase())
  return parts(file)
    .filter((p) => p.head.toLowerCase().startsWith('always') || keys.some((k) => p.head.toLowerCase().includes(k)))
    .map((p) => p.body)
    .join('\n\n')
}

function skillsFor(stage: Stage, plan: { pageType?: string; direction?: string } | undefined, brief: { pageType?: string; direction?: string } | undefined) {
  const pageType = plan?.pageType ?? brief?.pageType
  const direction = plan?.direction ?? brief?.direction
  if (stage === 'variations') return pick('conversion.md', ['copy'])
  // composing a page: the looks to choose from (and the chosen one), the page type's playbook and the copy toolkit
  if (stage === 'looks') return `# Design skill\n\n${pick('design.md', ['index'])}`
  if (stage === 'compose') return [`# Design skill\n\n${pick('design.md', ['index', direction])}`, `# Conversion skill\n\n${pick('conversion.md', ['index', pageType, 'copy'])}`].join('\n\n')
  if (stage === 'critique') return [`# Design skill\n\n${pick('design.md', [direction])}`, `# Conversion skill\n\n${pick('conversion.md', [pageType, 'checklist'])}`].join('\n\n')
  // the plan chooses the direction and the page type: it sees the index of both
  const design = pick('design.md', stage === 'plan' ? ['index'] : stage === 'check' ? [] : [direction, 'patterns', 'motion'])
  const conversion = pick('conversion.md', stage === 'plan' ? ['index', pageType] : stage === 'check' ? [pageType, 'checklist', 'copy'] : [pageType, 'copy', stage === 'review' ? 'checklist' : undefined])
  return [design && `# Design skill\n\n${design}`, conversion && `# Conversion skill\n\n${conversion}`].filter(Boolean).join('\n\n')
}

/* ---------------- Photos: one art direction per page, a structured prompt for each (research/image-generation-research.md) ---------------- */

interface Shoot {
  concept?: string
  casting?: { id: string; desc: string; wardrobe?: string }[]
  location?: string
  light?: string
  camera?: string
  grade?: string
  avoid?: string
}

function photoPrompt(q: string, aspect: number, shoot: Shoot | undefined, palette: string[] | undefined, look: string, withRef: boolean, framing?: string) {
  // "[maya] pouring tea…; text left": who is in it, the moment, and which side stays calm for the headline
  const who = q.match(/^\s*\[([\w-]+)\]\s*/)?.[1]
  let shot = q.replace(/^\s*\[[\w-]+\]\s*/, '')
  const side = shot.match(/;\s*text (left|right|center|top|bottom)\s*$/i)?.[1]?.toLowerCase()
  shot = shot.replace(/;\s*text (left|right|center|top|bottom)\s*$/i, '')
  const cast = who ? shoot?.casting?.find((c) => c.id === who) : undefined
  const ratio = aspect >= 1 ? `${Math.round(aspect * 10) / 10}:1` : `1:${Math.round((1 / aspect) * 10) / 10}`
  // an illustration or a diagram the user asked for: drawn flat in the brand's colours, one piece with the page
  if (/^\s*(an?\s+)?(flat\s+)?(illustration|diagram|infographic|icon set|icons|graphic|vector|3d render|isometric)\b/i.test(shot) || /\b(illustration of|diagram of|infographic of|icon set of|3d render of|isometric (view|scene) of)\b/i.test(shot)) {
    const three = /\b(3d|isometric)\b/i.test(shot)
    return [
      `Illustration for a landing page, ${ratio}.`,
      `Style: ${three ? 'clean soft 3D render, matte materials, rounded forms, one soft key light, gentle shadows' : 'flat vector illustration, clean geometric shapes, 2-3 flat tones and one accent, even line weight or no outlines, no gradients, no texture'}${palette?.length ? `; colours: ${palette.slice(0, 3).join(', ')} with white` : ''}. A plain ${palette?.[1] ?? 'white'} background that reads as one piece with the page it sits on.`,
      `Subject: ${shot}.`,
      'Details: generous whitespace, balanced composition, every element purposeful; flags, symbols and icons drawn in the same simplified style; arrows and connectors thin and clear.',
      'Constraints: no readable text except at most 3 short, correctly spelled labels; no photographic elements, no device frames, no watermark, no border.',
    ].join('\n')
  }
  // an interface (a screen, a dashboard, an app): described as if it already existed, in a clean frame
  if (/\b(screenshot|dashboard|app screen|interface|mock-?up|ui of|software screen|web app|the app showing|invoice screen|admin panel|editor screen|course player)\b/i.test(shot))
    return [
      `Product visual for a landing page, ${ratio}.`,
      `Scene: a clean ${palette?.length ? `${palette[1]} or ${palette[2]}` : 'light neutral'} background, soft even light, one floating window or device frame with a light shadow.`,
      `Subject: the interface of ${shot}, as if it already exists: a real layout with clear hierarchy, generous whitespace, realistic density, one accent colour${palette?.length ? ` (${palette[0]})` : ''}.`,
      'Details: short plausible labels, correctly spelled, or neutral placeholder bars where text would be small. No legible small text.',
      'Constraints: no people, no hands, no photographed laptops, no logos of real companies, no watermark.',
    ].join('\n')
  const thing = !cast && /\b(packshot|product|still life|detail|close-up of|texture|the (studio|salon|room|shop|office|kitchen|space|place|city|street|table|desk)|interior|exterior|flat lay|ingredients|materials|candle|bottle|jar|box|plate|dish)\b/i.test(shot) && !/\b(person|woman|man|people|hands|portrait|she|he|they|couple|client|student)\b/i.test(shot)
  // scene first, then the subject, then the details, then a short list of constraints (the order the models read best)
  const lines = [
    withRef && cast ? `Image 1 shows ${cast.id}: use it ONLY for who the person is (face, hair, skin tone, age, build). Do not copy its pose, framing, background, objects, clothes or light: this is a different moment in a different spot.` : '',
    `Use: a website photo for a landing page, ${ratio}.${shoot?.concept ? ` Concept: ${shoot.concept}.` : ''}`,
    `Scene: ${shoot?.location ?? 'a real place that fits the subject'}. ${shoot?.light ?? 'Soft natural window light from one side, gentle falloff, real shadows'}.`,
    `Subject: ${shot}.${cast ? ` The person: ${cast.desc}${cast.wardrobe ? `, wearing ${cast.wardrobe}` : ''}; candid, not looking at the camera.` : ''}${thing ? ' Nobody in the frame.' : ''}`,
    `Details: ${framing ?? 'natural distance, eye level, the subject on a third with breathing room'}. ${shoot?.camera ?? 'Full-frame camera, 35-85mm lens, shallow depth of field'}. Natural texture and small imperfections: real fabric creases, fingerprints, dust, flyaway hair.`,
    /\b(product|packshot|bottle|jar|box|candle|book|package|label)\b/i.test(shot) ? 'Product: do not restyle the product; keep its proportions and any label legible but unbranded.' : '',
    side ? `Composition: the subject away from the ${side} side; the ${side} 40-45% of the frame stays calm and uncluttered for headline text.` : '',
    // the style contract, the same words on every photo of the page, so the set reads as one shoot
    `Grade (the same on every photo of this page): ${shoot?.grade ?? look ?? 'true-to-life colour, gentle contrast, light grain'}.${palette?.length ? ` Colours in the scene: ${palette.slice(0, 3).join(', ')} on real objects, used sparingly.` : ''} Change only the scene, subject and crop between photos.`,
    `Constraints: one single real, unretouched photograph, one frame (never a collage, grid, split screen or multi-panel). No text, signage, logos, charts, diagrams, illustration or readable screens. No watermark.${shoot?.avoid ? ` Avoid: ${shoot.avoid}.` : ''}`,
  ]
  return lines.filter(Boolean).join('\n')
}

const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'total', 'leads', 'fixes'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: ['design', 'originality', 'conversion', 'craft', 'mobile'],
      properties: { design: { type: 'number' }, originality: { type: 'number' }, conversion: { type: 'number' }, craft: { type: 'number' }, mobile: { type: 'number' } },
    },
    total: { type: 'number', description: 'weighted 0-10' },
    leads: { type: 'string', description: 'the one memorable thing on the page, or "nothing" if no element leads' },
    fixes: {
      type: 'array',
      description: 'the changes that would raise the score most, most important first (max 8)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'device', 'problem', 'fix'],
        properties: { id: { type: 'string', description: 'element or section id, or "page"' }, device: { type: 'string', enum: ['desktop', 'mobile', 'all'] }, problem: { type: 'string' }, fix: { type: 'string', description: 'exactly what to change, specific (new copy, size, layout, recipe)' } },
      },
    },
  },
} as const

/** The complete objects of a JSON array still being written, from its "[" (strings and nesting respected). */
function closedObjects(text: string, from: number): string[] {
  const out: string[] = []
  if (from < 0) return out
  let depth = 0
  let str = false
  let start = -1
  for (let i = from + 1; i < text.length; i++) {
    const ch = text[i]
    if (str) {
      if (ch === '\\') i++
      else if (ch === '"') str = false
      continue
    }
    if (ch === '"') str = true
    else if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start >= 0) {
        out.push(text.slice(start, i + 1))
        start = -1
      }
    } else if (ch === ']' && depth === 0) break
  }
  return out
}

/** the brief as the model wrote it, without the nulls and empty lists the strict shape makes it spell */
const cleanBrief = (b?: Record<string, unknown>) => Object.fromEntries(Object.entries(b ?? {}).filter(([, v]) => v !== null && !(Array.isArray(v) && !v.length)))
/** questions worth asking: the photos choice always; another one only when nothing is known about what is sold */
const keepQuestions = (qs: { id?: string }[], known: Record<string, unknown>, request = '') => {
  // a request of a dozen words or more says what it is about: the AI decides the rest itself (photos are never asked:
  // AI photos are on by default, the switch is in the page's settings)
  const words = request.trim().split(/\s+/).length
  // under 8 words ("sell my ebook") the model's own judgement that the subject is missing is kept
  const essentialsMissing = words < 8 || (!known.offer && !known.business && words < 12)
  return qs.filter((q) => q && typeof q === 'object' && q.id !== 'photos' && essentialsMissing).slice(0, 1)
}

// compose at low: the page streams section by section, and low writes the first one 20 s sooner (35 s against 53 s
// measured on the same brief, 57 s against 86 s for the whole page) with no loss seen in the result
const EFFORT: Record<Stage, 'low' | 'medium' | 'high'> = { compose: 'low', looks: 'low', custom: 'low', plan: 'medium', build: 'low', critique: 'low', review: 'low', edit: 'low', check: 'medium', variations: 'low' }

export type Handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => unknown
export interface Log {
  info(msg: string): void
  warn(msg: string): void
  error(msg: string): void
}

/**
 * The AI's routes as [path, handler] pairs. A route answers its path and anything under it (the handler sees the rest
 * of the address), like connect: the dev server mounts them (aiPlugin below), the deployed function routes to them.
 */
export function aiRoutes(env: Record<string, string | undefined>, store: Store, log: Log): [string, Handler][] {
  const key = env.OPENAI_API_KEY
  const model = env.OPENAI_MODEL || 'gpt-6.1-sol'
  const client = key ? new OpenAI({ apiKey: key }) : null
  const routes: [string, Handler][] = []
  const route = (path: string, handler: Handler) => void routes.push([path, handler])

  route('/api/ai/status', (_req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ connected: !!client, model: client ? model : null }))
  })

  // images you attach in the chat are kept (your logo, your photos), so the AI can use them again in any later message
  route('/api/upload', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'POST') return next()
    res.setHeader('content-type', 'application/json')
    const { data } = JSON.parse(await readBody(req)) as { data?: string }
    const m = data?.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/)
    if (!m) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: 'Not an image' }))
    }
    const ext = m[1] === 'svg+xml' ? 'svg' : m[1] === 'jpeg' ? 'jpg' : m[1]
    const buf = Buffer.from(m[2], 'base64')
    const name = `${createHash('sha1').update(buf).digest('hex').slice(0, 16)}.${ext}`
    await store.put('ai-uploads', name, buf, `image/${m[1] === 'jpg' ? 'jpeg' : m[1]}`)
    res.end(JSON.stringify({ url: `/ai-uploads/${name}` }))
  })
  route('/ai-uploads/', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
    const type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' }[name.split('.').pop() ?? '']
    // a hashed upload, or a plain file name with no folder in it (the dev demo's logo)
    if (!/^[a-z0-9][\w.-]*\.(png|jpg|webp|gif|svg)$/i.test(name) || !type) return next()
    const data = await store.read('ai-uploads', name)
    if (!data) return next()
    res.setHeader('content-type', type)
    res.setHeader('cache-control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    // an upload is only ever a picture: an SVG opened on its own never runs code on this site
    res.setHeader('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    res.setHeader('x-content-type-options', 'nosniff')
    res.end(data)
  })

  // the created photos, read from the store (a photo written a moment ago is there at once)
  route('/ai-photos/', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
    if (!/^[a-f0-9]{16}\.jpg$/.test(name)) return next()
    const data = await store.read('ai-photos', name)
    if (!data) return next()
    res.setHeader('content-type', 'image/jpeg')
    res.setHeader('cache-control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    res.end(data)
  })

  // photos the AI planned ("img:<description>"), created once and kept in the store (same request = same file)
  route('/api/photo', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'POST') return next()
    res.setHeader('content-type', 'application/json')
    if (!client) {
      res.statusCode = 503
      return res.end(JSON.stringify({ error: 'AI not configured' }))
    }
    const { q, aspect = 1.5, direction, shoot, anchor, palette, framing } = JSON.parse(await readBody(req)) as { q: string; aspect?: number; direction?: string; shoot?: Shoot; anchor?: string; palette?: string[]; framing?: string }
    // the exact shape of the spot it fills (multiples of 16, about 1.3 megapixels)
    const W = aspect >= 1 ? 1536 : Math.round((1280 * aspect) / 16) * 16
    const H = Math.round(W / aspect / 16) * 16
    const size = `${W}x${H}`
    const prompt = photoPrompt(q, aspect, shoot, palette, direction ? (pick('design.md', [direction]).match(/Images: ([^\n]+)/)?.[1] ?? '') : '', !!anchor, framing)
    const name = `${createHash('sha1').update(`${prompt}|${size}|${anchor ?? ''}`).digest('hex').slice(0, 16)}.jpg`
    const model = env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare'
    try {
      if (!(await store.has('ai-photos', name))) {
        // the same person as in an earlier photo of the page: that photo is passed as the reference
        const ref = anchor?.match(/^\/(ai-photos|ai-uploads)\/([a-f0-9]{16}\.(?:jpg|png|webp))$/)
        const refData = ref ? await store.read(ref[1] as StoreDir, ref[2]) : null
        const r = refData
          ? await client.images.edit({ model, image: await toFile(refData, 'reference.jpg', { type: 'image/jpeg' }), prompt, size, quality: 'medium', output_format: 'jpeg', output_compression: 84 } as Parameters<typeof client.images.edit>[0])
          : await client.images.generate({ model, prompt, size, quality: 'medium', output_format: 'jpeg', output_compression: 84 } as Parameters<typeof client.images.generate>[0])
        const b64 = (r as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json
        if (!b64) throw new Error('no image')
        await store.put('ai-photos', name, Buffer.from(b64, 'base64'), 'image/jpeg')
      }
      res.end(JSON.stringify({ url: `/ai-photos/${name}` }))
    } catch (err) {
      log.error(`[editor-ai] photo: ${String(err)}`)
      res.statusCode = 502
      res.end(JSON.stringify({ error: 'The photo could not be created.' }))
    }
  })

  route('/api/ai', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'POST') return next()
    if (!client) {
      res.statusCode = 503
      return res.end('AI not configured')
    }
    const body = JSON.parse(await readBody(req)) as {
      prompt: string
      stage?: Stage
      mode?: 'generate' | 'edit' | 'variations'
      page?: unknown
      selection?: unknown
      device?: string
      brief?: Record<string, unknown>
      plan?: { pageType?: string; direction?: string }
      stepType?: string
      history?: { role: 'user' | 'assistant'; text: string }[]
      images?: string[]
      screenshot?: string
      screenshots?: { device: string; shot?: string; facts?: string[] }[]
      critique?: unknown
      customs?: unknown
    }
    const stage: Stage = body.stage ?? (body.mode === 'variations' ? 'variations' : 'edit')
    // a model to compare with (dev only), else the configured one
    const useModel = typeof (body as { model?: string }).model === 'string' && /^gpt-[\w.-]+$/.test((body as { model?: string }).model!) ? (body as { model?: string }).model! : model

    const context = [
      `Stage: ${stage}`,
      body.stepType ? `Funnel step type (a default only): ${body.stepType}` : '',
      // a new page: what is known may come from an earlier page about another business; the request wins
      `What you know (brief${!body.page && (stage === 'looks' || stage === 'compose') ? ', from earlier pages and chats: it may be about another business or offer. The request wins: when it names a different business or offer, start from the request and drop what no longer applies' : ''}): ${body.brief && Object.keys(body.brief).length ? JSON.stringify(body.brief) : 'nothing yet'}`,
      body.plan ? `Plan: ${JSON.stringify(body.plan)}` : '',
      body.device ? `User is viewing: ${body.device}` : '',
      body.selection ? `Selected: ${JSON.stringify(body.selection)}` : 'Selected: nothing (whole page)',
      body.page ? `Current page (compact JSON): ${JSON.stringify(body.page)}` : 'Current page: empty',
      (body.screenshots ?? []).some((l) => l.facts?.length) ? `MEASURED FACTS (from the real layout):\n${(body.screenshots ?? []).flatMap((l) => l.facts ?? []).map((f) => `- ${f}`).join('\n')}` : '',
      body.critique ? `Critic's review: ${JSON.stringify(body.critique)}` : '',
      body.customs ? `Custom sections to build: ${JSON.stringify(body.customs)}` : '',
      `Request: ${body.prompt}`,
      stage === 'plan' || stage === 'check' || stage === 'compose' ? 'Answer with one JSON object, as described in your instructions.' : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    // earlier messages, so the conversation reads naturally (lasting facts live in the brief)
    const history = (body.history ?? []).slice(-16).map((m) => ({ role: m.role, content: m.text }))
    const images = (body.images ?? []).filter((u) => typeof u === 'string' && u.startsWith('data:image/')).slice(0, 4)
    if (body.screenshot?.startsWith('data:image/')) images.push(body.screenshot)
    const looks = (body.screenshots ?? []).filter((l) => l.shot?.startsWith('data:image/'))
    for (const l of looks) images.push(l.shot!)
    const current = images.length
      ? [
          {
            type: 'input_text' as const,
            text: [
              context,
              body.screenshot ? 'The last image is a screenshot of the page as it looks now (desktop).' : '',
              looks.length ? `The last ${looks.length} images are the page as it looks now: ${looks.map((l) => l.device).join(', then ')}.` : '',
              images.length - (body.screenshot ? 1 : 0) - looks.length > 0 ? `Attached images: ${images.slice(0, images.length - (body.screenshot ? 1 : 0) - looks.length).map((_, i) => `image ${i + 1}`).join(', ')}.` : '',
            ].filter(Boolean).join('\n\n'),
          },
          // what the user attached is read at full detail (small text and layout in a screenshot); our own page pictures at the usual one
          ...images.map((u, i) => ({ type: 'input_image' as const, image_url: u, detail: i < images.length - (body.screenshot ? 1 : 0) - looks.length ? ('high' as const) : ('auto' as const) })),
        ]
      : context
    const input = [...history, { role: 'user' as const, content: current }]
    // each stage gets only what it needs: composing reads the recipes, not the editing operations
    const recipePart = OPS.slice(OPS.indexOf('Recipes (premium'), OPS.indexOf('Your uploads and logo:'))
    const uploadsPart = OPS.slice(OPS.indexOf('Your uploads and logo:'), OPS.indexOf('Memory:'))
    const instructions = (stage === 'compose' ? [RULES, STAGE.compose, recipePart, uploadsPart] : stage === 'looks' ? [RULES, STAGE.looks, uploadsPart] : [ROLE, OPS, RULES, STAGE[stage]])
      .concat(skillsFor(stage, body.plan, body.brief as { pageType?: string; direction?: string }))
      .filter(Boolean)
      .join('\n\n')
    // dev only: an effort to compare with
    const askedEffort = (body as { effort?: string }).effort
    const effort = askedEffort === 'low' || askedEffort === 'medium' || askedEffort === 'high' ? askedEffort : images.length && stage === 'edit' ? 'medium' : EFFORT[stage]

    res.setHeader('content-type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('cache-control', 'no-cache')
    const abort = new AbortController()
    res.on('close', () => abort.abort())
    const line = (o: unknown) => res.write(JSON.stringify(o) + '\n')
    // how long each stage takes (to keep the whole build fast)
    const t0 = Date.now()
    res.on('finish', () => log.info(`[editor-ai] ${stage} ${((Date.now() - t0) / 1000).toFixed(1)}s, ${images.length} images in`))

    try {
      // composing: the whole page in one answer, in a fixed shape the model can't break
      // the quick first answer for a new page: what was learned and the looks (the page comes from a parallel compose)
      if (stage === 'looks') {
        const stream = await client.responses.create(
          { model: useModel, instructions, input, stream: true, reasoning: { effort }, text: { format: { type: 'json_schema', name: 'looks', strict: true, schema: LOOKS_SCHEMA } } },
          { signal: abort.signal },
        )
        // each look is sent the moment it is written (the first one shows while the others are still coming)
        let text = ''
        let sentLooks = 0
        for await (const ev of stream) {
          if (ev.type !== 'response.output_text.delta') continue
          text += ev.delta
          const at = text.indexOf('"directions"')
          if (at < 0) continue
          const items = closedObjects(text, text.indexOf('[', at))
          for (; sentLooks < items.length; sentLooks++) {
            try {
              line({ op: 'look', direction: JSON.parse(items[sentLooks]), index: sentLooks })
            } catch {
              /* the full answer still comes at the end */
            }
          }
        }
        const out = JSON.parse(text || '{}') as { brief?: Record<string, unknown>; questions?: { id?: string }[]; directions?: unknown[]; reply?: string }
        const brief = cleanBrief(out.brief)
        if (Object.keys(brief).length) line({ op: 'remember', brief })
        const questions = keepQuestions(out.questions ?? [], { ...body.brief, ...brief }, body.prompt ?? '')
        if (questions.length || (out.directions ?? []).length) line({ op: 'ask', questions, directions: out.directions ?? [] })
        if (out.reply) line({ op: 'reply', text: out.reply })
        return res.end()
      }
      if (stage === 'compose') {
        const pageOnly = !!(body as { pageOnly?: boolean }).pageOnly
        // (opened per attempt: the connection itself can fail, and a broken answer is written again)
        const open = () =>
          client.responses.create(
            { model: useModel, instructions, input, stream: true, reasoning: { effort }, text: { format: { type: 'json_schema', name: 'page', strict: true, schema: pageOnly ? COMPOSE_PAGE_SCHEMA : COMPOSE_SCHEMA } } },
            { signal: abort.signal },
          )
        // what comes before the page (what was learned, the questions, the looks) is sent the moment it is written,
        // so you can answer while the page is still being written
        let text = ''
        let early = false
        let sent = false
        let asked = false
        const head = (out: { brief?: Record<string, unknown>; questions?: { id?: string }[]; directions?: unknown[]; reply?: string }) => {
          early = sent = true
          const brief = cleanBrief(out.brief)
          if (Object.keys(brief).length) line({ op: 'remember', brief })
          const questions = pageOnly ? [] : keepQuestions(out.questions ?? [], { ...body.brief, ...brief }, body.prompt ?? '')
          const asks = questions.length || (!pageOnly && (out.directions ?? []).length)
          asked = !!asks
          if (asks) line({ op: 'ask', questions, directions: pageOnly ? [] : (out.directions ?? []) })
          if (out.reply && !pageOnly) line({ op: asks ? 'reply' : 'say', text: out.reply })
        }
        // the first section's words, the moment they are written: the looks you pick from show your real first screen
        let hero = false
        // the sections written so far up to and including the first screen (a header before it comes along),
        // sent once, the moment the first screen is complete
        const firstScreen = () => {
          const at = text.indexOf('"sections"')
          if (at < 0) return null
          const items = closedObjects(text, text.indexOf('[', at))
          const out: string[] = []
          for (const one of items) {
            out.push(one)
            if (/"recipe"\s*:\s*"hero/.test(one)) return out
            if (!/"recipe"\s*:\s*"(header|custom)"/.test(one)) return null
          }
          return null
        }
        type Composed = { brief?: Record<string, unknown>; questions?: { id?: string }[]; directions?: unknown[]; page?: Record<string, unknown>; reply?: string }
        // the page is sent as it is written: the look first, then each section the moment its text is complete,
        // so the editor builds it section by section instead of waiting a minute for the whole answer
        // (held back when the answer asks a question: the page then waits for the reply)
        let themeSent = false
        let sentSections = 0
        const streamWritten = () => {
          if (!sent || asked) return
          if (!themeSent) {
            const ti = text.indexOf('"theme"')
            if (ti < 0) return
            const ob = closedObjects(text, text.indexOf('{', ti) - 1)
            if (!ob.length) return
            try {
              line({ op: 'theme', patch: JSON.parse(ob[0]) })
              const m = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
              if (m) line({ op: 'title', text: JSON.parse(`"${m[1]}"`) })
              themeSent = true
            } catch {
              return
            }
          }
          const at = text.indexOf('"sections"')
          if (at < 0) return
          const items = closedObjects(text, text.indexOf('[', at))
          for (; sentSections < items.length; sentSections++) {
            try {
              line({ op: 'section', index: sentSections, section: JSON.parse(items[sentSections]) })
            } catch {
              return
            }
          }
        }
        const compose = async (s: Awaited<ReturnType<typeof open>>) => {
          text = ''
          hero = false
          themeSent = false
          sentSections = 0
          let why = ''
          let lastCount = 0
          try {
          for await (const ev of s) {
            // a stream that stops before the answer is complete says why (the request failed, the output was cut)
            if (ev.type === 'error' || ev.type === 'response.failed' || ev.type === 'response.incomplete') why = JSON.stringify(ev).slice(0, 300)
            if (ev.type !== 'response.output_text.delta') continue
            text += ev.delta
            // a page is 8-15k characters; an answer that keeps growing, or keeps adding sections, has run away and is cut off
            if (text.length > 36000) { why = 'runaway answer, cut at 36k characters'; break }
            if (text.length > 18000 && text.length - lastCount > 3000) {
              lastCount = text.length
              const at = text.indexOf('"sections"')
              if (at >= 0 && closedObjects(text, text.indexOf('[', at)).length > 14) { why = 'runaway answer, more than 14 sections'; break }
            }
            if (!hero) {
              const some = firstScreen()
              if (some)
                try {
                  hero = true
                  line({ op: 'preview', sections: some.map((x) => JSON.parse(x)) })
                } catch {
                  /* the full page still comes at the end */
                }
            }
            if (early) {
              streamWritten()
              continue
            }
            const at = text.search(/,\s*"page"\s*:/)
            if (at < 0) continue
            try {
              head(JSON.parse(text.slice(0, at) + '}'))
            } catch {
              early = true
            }
          }
          } catch (e) {
            // the connection dropped mid-answer
            why = `stream: ${String(e).slice(0, 160)}`
          }
          try {
            if (why.startsWith('runaway answer')) throw new Error(why)
            return JSON.parse(text || '{}') as Composed
          } catch (e) {
            log.warn(`[editor-ai] compose answer unreadable after ${text.length} chars${why ? ` (${why})` : ''}: ${(e as Error).message}`)
            return null
          }
        }
        // up to three attempts: the connection can fail, the answer can break off or run away, or come back
        // with no page in it (the model stopped at the brief); whatever a broken attempt sent is taken off the page
        let out: Composed | null = null
        for (let attempt = 0; attempt < 3 && !out; attempt++) {
          if (attempt) {
            line({ op: 'say', text: attempt === 1 ? 'The answer broke off, writing it again' : 'Once more' })
            line({ op: 'restart' })
            await new Promise((r) => setTimeout(r, 1200))
          }
          try {
            out = await compose(await open())
          } catch (e) {
            log.warn(`[editor-ai] compose attempt ${attempt + 1} failed: ${String(e).slice(0, 200)}`)
            out = null
          }
          if (out && !asked && !(out.page as { sections?: unknown[] } | undefined)?.sections?.length) {
            log.warn(`[editor-ai] compose attempt ${attempt + 1} came back without sections`)
            out = null
          }
          if (abort.signal.aborted) return
        }
        if (!out) throw new Error('The page could not be written: three attempts broke off')
        if (!sent) head(out)
        if (out.page) line({ op: 'compose', page: out.page })
        return res.end()
      }
      // the critic answers in a fixed shape (strict schema): scores, a total and fixes tied to element ids
      if (stage === 'critique') {
        const r = await client.responses.create(
          {
            model: useModel,
            instructions,
            input,
            reasoning: { effort },
            text: { format: { type: 'json_schema', name: 'critique', strict: true, schema: CRITIQUE_SCHEMA } },
          },
          { signal: abort.signal },
        )
        line({ op: 'critique', review: JSON.parse(r.output_text || '{}') })
        return res.end()
      }
      // plan and check answer with one JSON object, turned here into operations
      if (stage === 'plan' || stage === 'check') {
        const r = await client.responses.create({ model: useModel, instructions, input, reasoning: { effort }, text: { format: { type: 'json_object' } } }, { signal: abort.signal })
        const out = JSON.parse(r.output_text || '{}') as Record<string, unknown>
        if (stage === 'check') {
          line({ op: 'score', score: out.score, summary: out.summary, fixes: out.fixes })
          return res.end()
        }
        if (out.brief && typeof out.brief === 'object' && Object.keys(out.brief).length) line({ op: 'remember', brief: out.brief })
        const qs = Array.isArray(out.questions) ? out.questions.filter((q) => q && typeof q === 'object').slice(0, 3) : []
        const dirs = Array.isArray(out.directions) ? out.directions.filter((d) => d && typeof d === 'object' && typeof (d as { bg?: unknown }).bg === 'string').slice(0, 4) : []
        // the plan comes with the questions too: answers that don't change it (photos, the look) need no second plan
        if (out.plan) line({ op: 'plan', plan: out.plan })
        if (qs.length || dirs.length) line({ op: 'ask', questions: qs, directions: dirs })
        if (typeof out.reply === 'string' && out.reply.trim()) line({ op: qs.length || dirs.length ? 'reply' : 'say', text: out.reply.trim() })
        return res.end()
      }

      const stream = await client.responses.create({ model: useModel, instructions, input, stream: true, reasoning: { effort } }, { signal: abort.signal })
      let buf = ''
      for await (const ev of stream) {
        if (ev.type === 'response.output_text.delta') {
          buf += ev.delta
          let nl: number
          while ((nl = buf.indexOf('\n')) >= 0) {
            const l = buf.slice(0, nl).trim()
            buf = buf.slice(nl + 1)
            if (l.startsWith('{')) res.write(l + '\n')
          }
        }
      }
      if (buf.trim().startsWith('{')) res.write(buf.trim() + '\n')
      res.end()
    } catch (err) {
      if (abort.signal.aborted) return
      const msg = err instanceof OpenAI.APIError ? `${err.status ?? ''} ${err.message}` : String(err)
      log.error(`[editor-ai] ${stage}: ${msg}`)
      if (!res.headersSent) res.statusCode = 502
      // say what actually went wrong, in plain words
      const text = /credits|quota|billing/i.test(msg)
        ? 'The AI account has no credits left, so the AI can’t answer. Add credits to the OpenAI account to continue.'
        : /401|api key|authentication/i.test(msg)
          ? 'The AI key was refused. Check the OPENAI_API_KEY setting.'
          : /429|rate limit/i.test(msg)
            ? 'The AI is busy right now (rate limit). Try again in a minute.'
            : 'The AI service did not respond. Try again.'
      res.end(JSON.stringify({ op: 'error', text }) + '\n')
    }
  })
  return routes
}

/** The routes on the Vite dev server; created photos and uploads are kept on disk in .data/ (not in public/, so a build never ships them). */
export function aiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'editor-ai',
    configureServer(server) {
      const store = diskStore(join(dirname(fileURLToPath(import.meta.url)), '..', '.data'))
      for (const [path, handler] of aiRoutes(env, store, server.config.logger)) server.middlewares.use(path, handler)
    },
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
