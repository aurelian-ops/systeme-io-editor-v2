/**
 * The catalogue of designed sections (recipes), shared by the editor (which builds them) and the AI server (which
 * reads it to choose and fill them). Pure data, no imports: the server bundles it too.
 *
 * `use`: what it is and when to use it. `knobs`: the settings the AI can turn. `copy`: the copy fields it reads.
 */

export interface RecipeMeta {
  use: string
  knobs: string
  copy: string
}

export const RECIPE_META = {
  /* ---- first screens ---- */
  'hero-split': {
    use: 'The first screen split in two: a tall photo fills one half to the edge of the screen, the headline, line and button sit in the other half with lots of air. The most premium default for coaches, wellness, creators, courses and products.',
    knobs: 'side (photo left|right), tone (light|tint|dark), size (big|huge)',
    copy: 'eyebrow, headline, sub, cta, note, photo',
  },
  'hero-fullbleed': {
    use: 'A photo fills the whole first screen; a giant headline sits over its darker side; an optional glass card holds a date or a fact. For events, launches, fitness, retreats, premium programmes.',
    knobs: 'side (text left|right), size (big|huge)',
    copy: 'eyebrow, headline, sub, cta, note, photo, card {big, small}',
  },
  'hero-bigtype': {
    use: 'The words are the design: one huge headline over two or three lines, a calm line, the button, then a wide cinematic photo strip below. For experts with a strong message: consultants, authors, coaches, B2B, software.',
    knobs: 'align (left|center), tone (light|tint|dark), size (big|huge)',
    copy: 'eyebrow, headline, sub, cta, note, photo, byline',
  },
  'hero-breakout': {
    use: 'Split hero: copy on one side, a portrait or product photo that breaks out of a soft colour block, with a small floating card (a number, a promise, a date). For coaches, creators, courses, wellness.',
    knobs: 'side (photo left|right), shape (arch|rounded|circle), block (tint|accent|dark|none), size (big|huge)',
    copy: 'eyebrow, headline, sub, cta, note, photo, card {big, small}',
  },
  'hero-showcase': {
    use: 'A centred headline, line and button, then a large framed visual of the product (the app, the course, the book, the box). For software, digital products, courses, physical products.',
    knobs: 'tone (light|dark|tint), size (big|huge)',
    copy: 'eyebrow, headline, sub, cta, note, photo (the product shot) or items (2 {title, photo}: two product shots side by side)',
  },
  'hero-optin': {
    use: 'For opt-in pages: the freebie shown as a cover or mock-up on a colour block, beside a specific headline, 3 benefit bullets and the form (email, or first name + email) with a privacy line.',
    knobs: 'side (visual left|right), block (tint|accent|dark|none), fields (the form\'s fields in order: email | name+email | name+email+phone; also lastname, company, website, city, country)',
    copy: 'eyebrow, headline, sub, cta, note, photo (the cover), bullets (3)',
  },
  'hero-optin-center': {
    use: 'Centred: label, headline, line, the form on one row (email field + button), a reassurance line, up to 3 checks; optionally one wide product shot or two side by side under it. For opt-in pages, and for home pages whose first screen is a sign-up (software with a free plan).',
    knobs: 'tone (light|tint|dark), fields (email | name+email | name+email+phone…, the same words as hero-optin)',
    copy: 'eyebrow, headline, sub, cta (the form button), note (the line under the form), bullets (up to 3, never the note\'s words again), and one of: photo (one wide picture under the form: a screenshot-style mock of the thing they get, a product shot, or the illustration they asked for) or items (2 {title, photo} pictures side by side under the form). One of the two is required: a first screen never stands on words alone.',
  },
  'hero-optin-card': {
    use: 'For opt-in pages with a strong photo: the photo fills the first screen, the headline sits over its calm side, and the form lives in a white card on the other side. Feels premium and editorial.',
    knobs: 'side (card left|right), fields (email | name+email | name+email+phone…, the same words as hero-optin)',
    copy: 'eyebrow, headline, sub, cta, note, photo (wide, room for text), bullets (3, shown in the card)',
  },
  'hero-event': {
    use: 'For webinars, masterclasses, live launches, workshops: a label, the big outcome, the date / time / place as chips, the register button, and a round host portrait with a name card.',
    knobs: 'tone (light|dark), side (portrait left|right)',
    copy: 'eyebrow, headline, sub, cta, note, photo (the host), facts (3 chips), card {big: host name, small: role}',
  },

  /* ---- top and bottom ---- */
  header: {
    use: 'The top bar of a website or home page: the logo (or the brand name), 3-5 navigation links and one button (the menu\'s last item, shown as a button; on phones it sits at the bottom of the dropdown). Only for home pages, websites and pages that need navigation; not for a single opt-in, sales or thank-you page.',
    knobs: 'tone (light|dark), button (primary|white|ink: the button\'s colour, white on a dark bar when the brand does that)',
    copy: 'headline (the brand name, used when there is no logo), links (3-5 short link names; a "Sign in" or language link goes last), cta (the button\'s words)',
  },
  footer: {
    use: 'The bottom of a website: the logo or brand name, one line about the business, then either 3-6 links in a row or 2-5 columns of links (groups) like a bigger site; social icons and the copyright line under a thin line. Last on home pages and websites.',
    knobs: 'tone (light|dark|tint)',
    copy: 'headline (brand name), sub (one line), links (3-6) or groups (2-5 {title, links (3-10)} as columns), social (the networks shown as icons, from: facebook, instagram, youtube, linkedin, x), note (copyright or legal line)',
  },

  /* ---- proof ---- */
  'proof-quote': {
    use: 'Proof as the hero of a section: one testimonial set very large in the heading font. With a photo of the person it becomes a split (photo edge to edge on one half); without one, the quote stands alone, centred. Right after the hero, or before the offer.',
    knobs: 'tone (light|tint|dark), side (photo left|right), size (big|huge)',
    copy: 'quote {text, author, role, photo}',
  },
  'proof-numbers': {
    use: 'Three or four real numbers from the brief (students, results, years, rating), very big, each under a thin line, with a short label. Never invented numbers.',
    knobs: 'tone (light|tint|dark)',
    copy: 'headline (optional), stats (3-4 {value, label}; value a real number with at most a short unit, never 0)',
  },
  'testimonials-grid': {
    use: 'Three to six short testimonials as quiet cards, each with the words, the name and the role (and a small portrait when there is one). For pages with several real reviews. Only from the brief\'s proof; otherwise mark them as samples.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, quotes (3-6 {text, author, role, photo})',
  },
  'logos-strip': {
    use: 'A quiet band of names or logos: "Trusted by", "As seen in", "Works with", "Taught at". 4-8 names from the brief. For software, agencies, B2B, press mentions.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow (the short label), logos (4-8 names)',
  },

  /* ---- what it is ---- */
  'features-list': {
    use: 'What they get or what they learn, as a calm editorial list: the section title stays on the left while 3-6 items run down the right, each a big title and a line, separated by thin lines. No boxes. The quiet default for benefits, modules, features.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, items (3-6 {title, text})',
  },
  'features-grid': {
    use: 'Three or six benefits as a grid of soft cards, each with an icon, a short title and one line. For software, services, agencies and anything with clear, parallel features.',
    knobs: 'tone (light|tint|dark), columns (3|2)',
    copy: 'eyebrow, headline, sub, items (3 or 6 {title, text, icon}; icon one of: check, star, heart, zap, flame, target, trophy, award, gift, shield, lock, mail, send, bell, calendar, clock, users, user, globe, book, briefcase, laptop, smartphone, code, settings, search, camera, video, music, activity, dumbbell, leaf, coffee, sun, moon, smile, sparkle, rocket, lightbulb, wallet, package, truck)',
  },
  'features-rows': {
    use: 'Two or three big photo-and-text rows that alternate sides, each telling one part of the story (the problem, the method, the result; or three key benefits). Each item needs a photo. For pages that should feel visual and story-like.',
    knobs: 'tone (light|tint), side (first photo left|right)',
    copy: 'eyebrow, headline, sub, items (2-3 {title, text, photo})',
  },
  'features-showcase': {
    use: 'One big product visual (a screenshot, the dashboard, the app, the box) beside 3-4 short points with small icons. For software and products: shows the thing and says what it does.',
    knobs: 'side (visual left|right), tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, photo (the product shot), items (3-4 {title, text, icon})',
  },
  'offer-bento': {
    use: 'What they get, as a bento: one big photo card for the most important thing, one bold accent card, then up to four quiet cards. Courses, programmes, products, memberships. Use when the items are things (modules, bonuses, tools); otherwise prefer features-list.',
    knobs: 'tone (light|tint)',
    copy: 'eyebrow, headline, sub, items (3-6 {title, text, photo on the first})',
  },
  'offer-stack': {
    use: 'Everything included, stacked as one list with a value next to each line and the total at the bottom ("Total value $740, today $149"). For sales pages with bonuses and a clear price.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, items (4-8 {title, text: its value like "$97 value"}), price {amount, period: "total value $740"}, cta, note',
  },
  'offer-steps': {
    use: 'A real sequence (how it works, the weeks of a programme, 3-5 steps), numbered, beside a tall photo that stays in view while the steps scroll. Only for things that really happen in order.',
    knobs: 'side (photo left|right), tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, photo, items (3-5 {title, text})',
  },
  'steps-row': {
    use: 'How it works in 3 or 4 numbered steps side by side, no photo: big numbers, short titles, one line each. For software sign-ups, services, booking flows, "what happens next".',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, items (3-4 {title, text})',
  },
  story: {
    use: 'A written passage: the problem, the turning point, the method, in 2-4 short paragraphs under one headline, with a pull line. For sales pages and about pages where the words carry the argument.',
    knobs: 'tone (light|tint), align (left|center)',
    copy: 'eyebrow, headline, paragraphs (2-4), byline (a pull line or signature)',
  },
  about: {
    use: 'The person or team behind it: a portrait, the name and role, 2-3 short paragraphs, and 2-3 facts as numbers. For coaches, experts, founders, small studios.',
    knobs: 'side (portrait left|right), tone (light|tint|dark), shape (rounded|arch|circle)',
    copy: 'eyebrow, headline (the name or the line), sub (role), paragraphs (2-3), photo (the portrait), stats (2-3)',
  },
  gallery: {
    use: 'Four to six photos as a grid with short captions: the place, the product, the work, the results. For retreats, studios, products, portfolios, events.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, items (4-6 {title: caption, photo})',
  },
  team: {
    use: 'The people: 3-4 portraits with the name, the role and one line. For agencies, clinics, studios, firms, small teams: ALWAYS this recipe when the request names the people (partners, founders, the team), never a plain list.',
    knobs: 'tone (light|tint)',
    copy: 'eyebrow, headline, sub, items (3-4 {title: name, text: role and one line, photo: their picture when the user gave it, otherwise leave photo EMPTY: the card shows a spot to add it; never an AI-made face for a real, named person})',
  },
  video: {
    use: 'One video, large, under a headline: a demo, a welcome, a lesson, a video sales letter. Whenever the user asks for a video: with the link they gave, or with video left EMPTY when they gave none (the frame says where to paste it; never a made-up link, never dropped).',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, video (the link the user gave, or empty)',
  },

  /* ---- the offer ---- */
  'offer-price': {
    use: 'Everything they get with the price, the payment option, the button and the guarantee, on a band that stands out (dark by default). For sales pages with one offer, and for checkout / order pages (knob pay "card").',
    knobs: 'tone (dark|tint|light), pay (card: a payment button with a lock icon and a small reassurance line takes the button\'s place; the payment itself is connected in its settings)',
    copy: 'eyebrow, headline, sub, cta, note, price {amount, period, plan, includes (4-7)}, card.small (with pay "card": the line under the button\'s label, e.g. "Secure card payment")',
  },
  'pricing-table': {
    use: 'Two or three plans side by side, one marked as the popular one, each with its name, price, period, 4-6 features and a button. For software, memberships, services with tiers.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, plans (2-3 {name, price, period, features (4-6), cta, featured: true on the one plan you want people to choose, a paid one, never the free plan}), note',
  },
  compare: {
    use: 'Two columns, the old way against this way ("Doing it alone" vs "With the programme", "Before" vs "After"), 4-6 lines each with crosses and checks, the second column in the accent colour. Makes the difference obvious.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, fit {noTitle: the old way, no (4-6), yesTitle: this way, yes (4-6)}',
  },
  guarantee: {
    use: 'The risk reversal, calm and honest: a round badge with the big number ("30 days"), the headline, one paragraph, and optionally the button. Right before or after the price.',
    knobs: 'tone (light|tint|dark)',
    copy: 'card {big: "30 days", small: "money back"}, headline, sub, cta (optional)',
  },
  'fit-list': {
    use: 'Two honest lists side by side under one headline: "This is for you if" and "This is not for you if", 3-5 lines each, with thin lines, no boxes. Builds trust and qualifies buyers on sales and book-a-call pages.',
    knobs: 'tone (light|tint|dark)',
    copy: 'eyebrow, headline, fit {yesTitle, yes (3-5), noTitle, no (3-5)}',
  },
  'book-call': {
    use: 'Booking: the headline, what the call is and is not, 3 short points, and the calendar to pick a time. For book-a-call and consultation pages, as the main action.',
    knobs: 'side (calendar left|right), tone (light|tint)',
    copy: 'eyebrow, headline, sub, bullets (3), note, labels (7 short strings in the page\'s language, in this order: calendar title, calendar intro, next-step button, form title, form intro, confirm button, confirmation line), placeholders (4 field labels in the page\'s language: first name, last name, email, phone)',
  },
  countdown: {
    use: 'A deadline band: the headline, the countdown and the button. When a real date exists (a launch, a cart close, a live event), or when the offer runs for a set time after the visitor arrives (an upsell "for the next 15 minutes", an evergreen deadline). Always when the user asks for a countdown.',
    knobs: 'tone (dark|tint|light)',
    copy: 'eyebrow, headline, sub, cta, note: the ISO date (e.g. 2026-11-12T19:00:00+01:00), or a duration after arrival ("15 minutes", "2 hours", "3 days")',
  },

  /* ---- questions and the close ---- */
  'faq-split': {
    use: 'The FAQ: the title and one line stay on the left, 5-8 questions open and close on the right, written as buyers ask them. Answers start with yes or no.',
    knobs: 'tone (light|tint)',
    copy: 'headline, sub, faqs (5-8 {q, a})',
  },
  'faq-center': {
    use: 'The FAQ centred in one column under its headline, 4-6 questions. Calmer and shorter than the split; for opt-in, webinar and short pages.',
    knobs: 'tone (light|tint|dark)',
    copy: 'headline, sub, faqs (4-6 {q, a})',
  },
  'photo-band': {
    use: 'A breathing moment between sections or the closing band: one wide photo, one strong line over its calm side, and an optional button. Use once per page.',
    knobs: 'side (text left|center)',
    copy: 'headline, sub, cta (optional), photo (wide, room for text)',
  },
  'cta-split': {
    use: 'The closing call to action with a photo beside the words: headline, line, button and reassurance on one side, a photo edge to edge on the other. An alternative to the centred close when the page has few photos.',
    knobs: 'side (photo left|right), tone (light|tint|dark)',
    copy: 'eyebrow, headline, sub, cta, note, photo',
  },
  'close-cta': {
    use: 'The end of the page: the outcome restated in one very big headline, one line, the button (or an email form) and the reassurance line, centred on a calm tinted band, or on an inset rounded box. Exactly once, last (before a footer if there is one).',
    knobs: 'tone (tint|dark|light), shape (rounded: an inset rounded box on the page background instead of a full band), fields (email | name+email | name+email+phone…, the same words as hero-optin: a form takes the button\'s place; cta is its button. Required on sign-up pages, so the last screen converts on its own)',
    copy: 'headline, sub, cta, note',
  },
} satisfies Record<string, RecipeMeta>

/** First screens that can stand in for each other: a look may swap the layout only within the family (an opt-in keeps its form) */
export const HERO_FAMILIES: Record<'optin' | 'event' | 'general', string[]> = {
  optin: ['hero-optin', 'hero-optin-center', 'hero-optin-card'],
  event: ['hero-event', 'hero-fullbleed'],
  general: ['hero-split', 'hero-bigtype', 'hero-breakout', 'hero-fullbleed', 'hero-showcase'],
}
export const heroFamily = (name?: string): keyof typeof HERO_FAMILIES | null =>
  !name ? null : HERO_FAMILIES.optin.includes(name) ? 'optin' : name === 'hero-event' ? 'event' : HERO_FAMILIES.general.includes(name) ? 'general' : null

export type RecipeName = keyof typeof RECIPE_META
export const RECIPE_NAMES = Object.keys(RECIPE_META) as RecipeName[]

/** The catalogue as the AI reads it. */
export function recipeCatalogue() {
  return RECIPE_NAMES.map((n) => `- ${n}: ${RECIPE_META[n].use} Knobs: ${RECIPE_META[n].knobs}. Copy: ${RECIPE_META[n].copy}.`).join('\n')
}

/**
 * How pages are shaped, by kind: the sections in a good order (each at most once). The AI picks within these,
 * drops what the brief has nothing for, and keeps a page short when the goal is one action.
 */
export const PAGE_SHAPES = `Page shapes (pick within these; drop what you have nothing real for; never pad):
- Home page / website: header, hero (hero-showcase for software, hero-bigtype or hero-split otherwise), logos-strip (if names exist), features-grid or features-showcase, steps-row or features-rows, testimonials-grid or proof-quote, pricing-table (software, memberships) or offer-price, faq-split, close-cta, footer. 7-10 sections.
- Sales page (course, programme, product): hero, proof-numbers or logos-strip, story or features-rows (the problem and the change), offer-bento or offer-stack (what's inside), offer-steps or steps-row (how it works), about, testimonials-grid or proof-quote, compare or fit-list, offer-price, guarantee, faq-split, close-cta or cta-split. 7-11 sections, in this order of persuasion.
- Opt-in page (lead magnet): hero-optin (or hero-optin-center / hero-optin-card for the look), features-list or features-grid (what's inside, 3 items), about or proof-quote, faq-center (3-4), close-cta. 4-5 sections.
- Webinar / event: hero-event or hero-fullbleed, features-list (what you will learn), about (the host), countdown (only with a real date), faq-center, close-cta. 4-6 sections.
- Book-a-call / consultation: hero-split or hero-bigtype, fit-list or compare, steps-row (what happens next), proof-quote or testimonials-grid, book-call, faq-center. 5-6 sections.
- Thank-you page: a short hero (hero-bigtype or hero-optin-center without the form: cta to the next step), steps-row (what happens next), close-cta. 2-3 sections. With a one-time upsell: offer-price (the upgrade and its price), countdown when the offer is timed ("15 minutes" in its note), then close-cta.
- Checkout / order page: hero-showcase or hero-split (the product), offer-price with pay "card" (what's included, the price, the payment button), guarantee, faq-center, 3-5 sections. The payment itself is connected in the button's settings: the editor HAS a payment button.
- Video sales letter: video first (the link, or empty to paste later), then offer-price, guarantee or faq-center only if asked; "nothing else" means exactly those.
- About page: header, hero-split or hero-bigtype, story, team (the named people), features-list or steps-row (how they work), close-cta, footer. 5-7 sections.
- Donation / charity page: hero-split or hero-fullbleed, proof-numbers (the real figures), story or about (the founder, the beginning: a "story about X" is always one of these two, never features-rows), pricing-table (monthly amounts as plans) or offer-price (one gift), faq-center, close-cta. 5-7 sections.
Colour: every recipe takes knob "button" (primary|white|ink) for its buttons' colour and knob "bg" (a hex colour) for its own background. Use it when the request asks for colour, playfulness, variety or boldness, or when the look is colourful: give sections different harmonious colours from the look's palette (3-4 colours, each readable with the ink), not one cream page. Otherwise leave bg out and use tones.
Rhythm: alternate tones so the page breathes (light, tint, light, dark…), never two dark bands in a row, the price band stands out. Each recipe at most once per page.`
