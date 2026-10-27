import { ELEMENT_DEFAULTS, el, faqOf, formChildren } from './blocks'
import { ICONS } from './icons'
import { ALL_ITEMS } from './library'
import { RECIPE_META, recipeCatalogue } from './recipeMeta'
import type { FieldType, Node, Style, Theme } from './types'

/**
 * Recipes: premium, proven section structures with knobs (not fixed templates). The AI picks the one that fits each
 * section's job and turns its knobs for the brand; the brand's theme, photos and words do the rest. Everything they
 * build is ordinary, editable elements, and every overlap stacks cleanly on phones.
 *
 * One design language for all of them (so a page reads as one piece): big type with real contrast between sizes,
 * generous space, hairlines instead of boxes, photos large and edge to edge, cards only where they carry meaning.
 */

export interface RecipeCopy {
  eyebrow?: string
  headline: string
  sub?: string
  cta: string
  /** the reassurance line under the button */
  note?: string
  /** "img:<description>" (created or left for the user) or a URL */
  photo?: string
  photoAlt?: string
  /** a small floating card: a big line and a small one ("300+" / "professionals coached") */
  card?: { big: string; small?: string }
  /** a byline next to a small portrait, or a proof line */
  byline?: string
  bullets?: string[]
  /** event facts shown as chips ("Nov 12", "7pm CET", "Live on Zoom") */
  facts?: string[]
  /** things to show as rows, cards or steps: a title, a line, an optional photo ("img:…") and an optional icon name */
  items?: { title: string; text?: string; photo?: string; icon?: string }[]
  /** the logo's url (header and footer) */
  logo?: string
  /** navigation link names (header, footer) */
  links?: string[]
  /** a footer's link columns: a title and its links */
  groups?: { title: string; links: string[] }[]
  /** social networks shown as icons in a footer (icon names: facebook, instagram, youtube, linkedin, x) */
  social?: string[]
  /** names shown as logos ("Trusted by") */
  logos?: string[]
  /** several short testimonials */
  quotes?: { text: string; author: string; role?: string; photo?: string }[]
  /** plans of a pricing table */
  plans?: { name: string; price: string; period?: string; features?: string[]; cta?: string; featured?: boolean }[]
  /** a written passage (story, about) */
  paragraphs?: string[]
  /** a video link the user gave */
  video?: string
  /** short labels an element needs in the page's language (the calendar's titles and buttons) */
  labels?: string[]
  /** the form's field labels in the page's language, in the knob's order ("Prénom", "Adresse e-mail") */
  placeholders?: string[]
  /** real numbers with a short label */
  stats?: { value: string; label: string }[]
  /** one testimonial */
  quote?: { text: string; author: string; role?: string; photo?: string }
  /** the offer's price block */
  price?: { amount: string; period?: string; plan?: string; includes?: string[] }
  /** who it is for and not for */
  fit?: { yes: string[]; no: string[]; yesTitle?: string; noTitle?: string }
  /** questions and answers */
  faqs?: { q: string; a: string }[]
}

export interface RecipeKnobs {
  side?: 'left' | 'right'
  shape?: 'arch' | 'rounded' | 'circle'
  block?: 'tint' | 'accent' | 'dark' | 'none'
  tone?: 'light' | 'dark' | 'tint'
  size?: 'big' | 'huge'
  align?: 'left' | 'center'
  /** the form's fields, in order: "email", "name+email", "name+email+phone" (also lastname, company, website, city, country) */
  fields?: string
  /** offer-price: "card" puts a payment button (lock icon, small reassurance line from card.small) in the button's place */
  pay?: 'card'
  /** cards per row (features-grid) */
  columns?: '2' | '3'
  /** this section's own background colour (#hex), when the style asks for colour */
  bg?: string
  /** the buttons of this section: the accent (default), white with dark text, or the ink with light text */
  button?: 'primary' | 'white' | 'ink'
}

interface Recipe {
  label: string
  /** what it is and when to use it, for the AI */
  use: string
  knobs: string
  build: (c: RecipeCopy, k: RecipeKnobs) => Node
}

/* ---------------- the shared design language ---------------- */

const TINT = 'color-mix(in srgb, var(--c-primary) 12%, var(--c-bg))'
const blockColor = (b: RecipeKnobs['block']) => (b === 'accent' ? 'primary' : b === 'dark' ? 'dark' : b === 'none' ? undefined : TINT)

const H1 = (text: string, size: number, extra: Style = {}, mobile = Math.max(40, Math.round(size * 0.5))) => {
  const h = el('headline', { text, level: 1 }, { fontSize: size, lineHeight: size >= 80 ? 0.98 : 1.03, ...extra })
  h.style.mobile = { fontSize: mobile }
  return h
}
const H2 = (text: string, extra: Style = {}) => {
  const h = el('headline', { text, level: 2 }, { fontSize: 56, lineHeight: 1.04, maxWidth: 780, ...extra })
  h.style.mobile = { fontSize: 34 }
  return h
}
const H3 = (t: string, extra: Style = {}) => el('headline', { text: t, level: 3 }, { fontSize: 26, lineHeight: 1.2, ...extra })
const lead = (text: string, extra: Style = {}) => el('text', { text }, { fontSize: 21, lineHeight: 1.6, color: 'muted', maxWidth: 560, ...extra })
const body = (t?: string, extra: Style = {}) => (t ? [el('text', { text: t }, { fontSize: 18, lineHeight: 1.6, color: 'muted', ...extra })] : [])
const small = (text: string, extra: Style = {}) => el('text', { text }, { fontSize: 15, color: 'muted', ...extra })
const eyebrow = (text?: string, extra: Style = {}) => (text ? [el('text', { text }, { fontSize: 16, fontWeight: 600, color: 'primary', ...extra })] : [])
// a button outside a form is a link (its settings show "Go to URL" with the address to fill in)
const button = (text: string, extra: Style = {}) => {
  const b = el('button', { text, href: '#', action: 'url', url: '#', variant: 'primary' }, { fontSize: 17, paddingY: 18, paddingX: 32, ...extra })
  b.style.mobile = { fullWidth: true }
  return b
}
// a photo still to be described: a scene, never the headline's words (an image model would paint them into the picture)
const SCENE = 'a candid photo of the person or product this page is about, natural light, no words or signs in the picture'
const photo = (c: RecipeCopy, aspect: number, style: Style = {}) =>
  el('image', { src: c.photo || `img:${SCENE}`, alt: c.photoAlt ?? c.headline, aspect }, { width: 100, ...style })
const col = (children: Node[], style: Style = {}) => el('column', {}, { gap: 20, ...style }, children)
const row = (cols: Node[], style: Style = {}, props: Node['props'] = {}) => el('row', { minCol: 300, ...props }, { gap: 64, vAlign: 'center', ...style }, cols)
const sectionOf = (tone: 'light' | 'dark', children: Node[], style: Style = {}, kind = 'hero') => {
  const s = el('section', { kind, tone }, { paddingY: 144, paddingX: 32, maxWidth: 1180, gap: 56, ...style }, children)
  s.style.mobile = { paddingY: 88, paddingX: 20, gap: 40 }
  return s
}
/** an edge-to-edge section (no side padding, no width limit): for halves and photo bands */
const bleed = (tone: 'light' | 'dark', children: Node[], style: Style = {}, kind = 'hero') => {
  const s = el('section', { kind, tone }, { paddingY: 0, paddingX: 0, maxWidth: 100000, gap: 0, ...style }, children)
  s.style.mobile = { paddingY: 0, paddingX: 0 }
  return s
}
const hairline: Style = { borderType: 'top', borderColor: 'line', borderWidth: 1 }
/** a thin line over a column's content, as a real Horizontal line you can click (a column's own border can't be reached) */
const rule = (space: number): Node => el('divider', {}, { pad: [0, 0, space, 0], borderColor: 'line', borderWidth: 1 })
const toneOf = (k: RecipeKnobs) => (k.tone === 'dark' ? 'dark' : 'light')
const tintIf = (k: RecipeKnobs): Style => (k.tone === 'tint' ? { background: TINT } : {})

/** The copy side of a hero: label, headline, lead, button and the line under it, with one calm entrance. */
function copyColumn(c: RecipeCopy, size: number, extra: { center?: boolean; after?: Node[] } = {}) {
  const align: Style = extra.center ? { textAlign: 'center' } : {}
  const kids = [
    ...eyebrow(c.eyebrow, align),
    H1(c.headline, size, { ...align, ...(extra.center ? { maxWidth: 940 } : { maxWidth: 660 }) }),
    ...(c.sub ? [lead(c.sub, { ...align, ...(extra.center ? { maxWidth: 620 } : {}) })] : []),
    ...(extra.after ?? []),
    ...(c.cta ? [button(c.cta, extra.center ? { textAlign: 'center' } : {})] : []),
    ...(c.note ? [small(c.note, align)] : []),
  ]
  const column = col(kids, { gap: 24, ...(extra.center ? { textAlign: 'center' } : {}) })
  column.props.motion = { enter: 'fade-up', stagger: true, speed: 'slow' }
  return column
}

/** The title of a section: optional label, one big headline, an optional line. */
function head(c: RecipeCopy, center = false, extra: Style = {}) {
  const a: Style = center ? { textAlign: 'center' } : {}
  // (a section written without a title has no empty headline sitting on the page)
  const kids = [...eyebrow(c.eyebrow, a), ...(c.headline?.trim() ? [H2(c.headline, { ...a, ...(center ? { maxWidth: 860 } : {}), ...extra })] : []), ...(c.sub ? [lead(c.sub, { ...a, fontSize: 20, ...(center ? { maxWidth: 640 } : {}) })] : [])]
  return col(kids, { gap: 20, ...(center ? { textAlign: 'center' } : {}) })
}

/**
 * A small card that floats over a photo (a number, a date, a name). It is a Content box (no title bar), so you can
 * click it and change its colour, corners, shadow, padding and position like any element.
 */
function floatCard(card: NonNullable<RecipeCopy['card']>, mar: [number, number, number, number], dark = false) {
  const c = el(
    'contentbox',
    { headerVisible: false },
    {
      background: dark ? 'rgba(17,17,19,.82)' : '#FFFFFF',
      radius: 18,
      paddingY: 20,
      paddingX: 24,
      shadow: 'mid',
      mar,
      layer: 2,
      ...(dark ? { borderType: 'full', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1 } : {}),
    },
    [el('column', {}, { gap: 6 }, [el('headline', { text: card.big, level: 3 }, { fontSize: 34, lineHeight: 1.05, ...(dark ? {} : { color: '#171717' }) }), ...(card.small ? [small(card.small, { fontSize: 15, ...(dark ? {} : { color: '#5C6370' }) })] : [])])],
  )
  // on phones it sits just under the photo, slightly overlapping, never off the screen
  c.style.mobile = { mar: [-40, 24, 0, 16] }
  c.props.motion = { enter: 'fade-up', speed: 'slow' }
  c.style.desktop.delay = 0.35
  return c
}

/** A block of colour behind something (a photo, a cover): a Content box, so it has its own settings. */
function colourBlock(children: Node[], background: string, pad: [number, number, number, number], mobilePad: [number, number, number, number]) {
  const b = el('contentbox', { headerVisible: false }, { background, radius: 32, pad, borderType: 'none', shadow: 'none' }, [el('column', {}, { gap: 0 }, children)])
  b.style.mobile = { pad: mobilePad }
  return b
}

/** A soft card: no border, one radius, the page's surface colour. Only where a box carries meaning. */
const card = (children: Node[], style: Style = {}) =>
  el('contentbox', { headerVisible: false }, { background: 'surface', radius: 24, paddingY: 32, paddingX: 32, shadow: 'none', borderType: 'none', ...style }, [el('column', {}, { gap: 14 }, children)])

/* ---------------- heroes ---------------- */

export const RECIPES: Record<string, Recipe> = {
  'hero-split': {
    label: 'Half photo, half words, edge to edge',
    use: 'The first screen split in two: a tall photo fills one half to the edge of the screen, the headline, line and button sit in the other half with lots of air. The most premium default for coaches, wellness, creators, courses and products.',
    knobs: 'side (photo left|right), tone (light|tint|dark), size (big|huge)',
    build: (c, k) => {
      const right = (k.side ?? 'right') === 'right'
      // a real Image (click it to replace it) that fills its half of the screen
      const img = photo({ ...c, photo: c.photo || `img:${SCENE}, tall editorial framing` }, -1, { minHeight: 760 })
      img.style.mobile = { minHeight: 420 }
      const pic = col([img], { gap: 0 })
      pic.props.motion = { enter: 'zoom', speed: 'slow' }
      const words = copyColumn(c, k.size === 'big' ? 72 : 84)
      words.style.desktop.vAlign = 'center'
      words.style.desktop.background = k.tone === 'tint' ? TINT : undefined
      // the air round the words is a Content box you can click (a column's own padding can't be reached)
      const wordsBox = el('contentbox', { headerVisible: false }, { pad: right ? [96, 72, 96, 96] : [96, 96, 96, 72], borderType: 'none', shadow: 'none' }, [words])
      wordsBox.style.mobile = { pad: [56, 20, 64, 20] }
      return bleed(toneOf(k), [row(right ? [col([wordsBox], { gap: 0, vAlign: 'center' }), pic] : [pic, col([wordsBox], { gap: 0, vAlign: 'center' })], { colWidths: [1, 1], gap: 0, vAlign: 'stretch' })])
    },
  },

  'hero-fullbleed': {
    label: 'Full-bleed photo, giant headline over it',
    use: 'A photo fills the whole first screen; a giant headline sits over its darker side; an optional glass card holds a date or a fact. For events, launches, fitness, retreats, premium programmes.',
    knobs: 'side (text left|right), size (big|huge), card (copy.card or none)',
    build: (c, k) => {
      const left = (k.side ?? 'left') === 'left'
      const copy = copyColumn(c, k.size === 'big' ? 84 : 104, {})
      copy.style.desktop.maxWidth = 780
      const cardCol = c.card ? col([floatCard(c.card, [0, 0, 0, 0], true)], { vAlign: 'end', gap: 0 }) : null
      if (cardCol) cardCol.children![0].style.mobile = { mar: [0, 0, 0, 0] }
      const cols = cardCol ? (left ? [copy, cardCol] : [cardCol, copy]) : [copy]
      const s = sectionOf('dark', [row(cols, { colWidths: cardCol ? (left ? [7, 4] : [4, 7]) : undefined, vAlign: 'end', gap: 48 })], {
        backgroundImage: c.photo || `img:${SCENE}, cinematic wide framing with room for text on the ${left ? 'left' : 'right'}`,
        overlay: `linear-gradient(${left ? '90deg' : '270deg'}, rgba(0,0,0,.84) 0%, rgba(0,0,0,.6) 42%, rgba(0,0,0,.05) 78%)`,
        bgPosition: left ? 'right center' : 'left center',
        minHeight: 800,
        paddingY: 120,
      })
      s.style.mobile = { overlay: 'rgba(0,0,0,.62)', minHeight: 640, paddingY: 80, paddingX: 20 }
      s.props.motion = { scroll: 'parallax' }
      return s
    },
  },

  'hero-bigtype': {
    label: 'Huge headline, cinematic photo strip',
    use: 'The words are the design: one huge headline over two or three lines, a calm line, the button, then a wide cinematic photo strip below (or a small round portrait with a byline when there is no photo). For experts with a strong message: consultants, authors, coaches, B2B.',
    knobs: 'align (left|center), tone (light|tint|dark), size (big|huge)',
    build: (c, k) => {
      const center = k.align === 'center'
      const portrait =
        c.byline && !c.photo
          ? [
              row(
                [col([el('text', { text: c.byline }, { fontSize: 17, color: 'ink' })], { gap: 0 })],
                { gap: 0, ...hairline, pad: [20, 0, 0, 0], maxWidth: 520 },
              ),
            ]
          : []
      const copy = copyColumn(c, k.size === 'big' ? 96 : 120, { center })
      copy.children!.push(...portrait)
      const h = copy.children!.find((n) => n.type === 'headline')!
      h.style.desktop.maxWidth = center ? 1080 : 1100
      h.style.desktop.lineHeight = 0.95
      const strip = c.photo ? [photo(c, 2.4, { radius: 28 })] : []
      if (strip[0]) strip[0].props.motion = { enter: 'clip', speed: 'slow' }
      const s = sectionOf(toneOf(k), [row([copy], {}), ...strip], { paddingY: 160, gap: 96, ...tintIf(k), ...(center ? { textAlign: 'center' } : {}) })
      s.style.mobile = { paddingY: 88, paddingX: 20, gap: 48 }
      return s
    },
  },

  'hero-breakout': {
    label: 'Photo breaking out of a colour block',
    use: 'Split hero: copy on one side, a portrait or product photo that breaks out of a soft colour block, with a small floating card (a number, a promise, a date). For coaches, creators, courses, wellness.',
    knobs: 'side (photo left|right), shape (arch|rounded|circle), block (tint|accent|dark|none), size (big|huge), card (copy.card or none)',
    build: (c, k) => {
      const shape = k.shape ?? 'rounded'
      const right = (k.side ?? 'right') === 'right'
      const img = photo(c, shape === 'circle' ? 1 : 0.8, {
        ...(shape === 'arch' ? { radii: [999, 999, 28, 28] } : shape === 'circle' ? { radius: 999 } : { radius: 24 }),
        // the photo sits inside its block with air all round (the block's own corners never cut it)
        mar: [0, 40, 0, 40],
        shadow: 'far',
        layer: 1,
      })
      img.style.mobile = { mar: [0, 0, 0, 0] }
      const inner = [img, ...(c.card ? [floatCard(c.card, right ? [-96, 200, 0, 8] : [-96, 8, 0, 200])] : [])]
      // the colour block is a Content box: click it to change its colour, corners and padding
      const block = blockColor(k.block)
      const box = block ? colourBlock(inner, block, [56, 0, 56, 0], [28, 20, 28, 20]) : null
      const visual = col(box ? [box] : inner, { gap: 0 })
      visual.props.motion = { enter: 'zoom', speed: 'slow' }
      const copy = copyColumn(c, k.size === 'huge' ? 84 : 70)
      return sectionOf('light', [row(right ? [copy, visual] : [visual, copy], { colWidths: right ? [6, 5] : [5, 6], gap: 88 })])
    },
  },

  'hero-showcase': {
    label: 'Centred promise, big product shot below',
    use: 'A centred headline, line and button, then a large framed visual of the product (the course, the book, the app, the box). For digital products, courses, software, physical products.',
    knobs: 'tone (light|dark|tint), size (big|huge)',
    build: (c, k) => {
      const copy = copyColumn(c, k.size === 'huge' ? 92 : 76, { center: true })
      // two product shots side by side when the items carry photos, else the one big shot
      const two = (c.items ?? []).filter((x) => x.photo).length >= 2 ? shotsUnder(c) : []
      const shot = photo(c, 1.7, { radius: 24, shadow: 'far', maxWidth: 1080 })
      shot.props.motion = { enter: 'scale', speed: 'slow' }
      shot.style.desktop.delay = 0.2
      return sectionOf(toneOf(k), [row([copy], {}), ...(two.length ? two : [shot])], { paddingY: 136, gap: 80, textAlign: 'center', ...tintIf(k) })
    },
  },

  'hero-optin': {
    label: 'Lead magnet and form',
    use: 'For opt-in pages: the freebie shown as a cover or mock-up on a colour block, beside a specific headline, 3 benefit bullets and the form (email, or first name + email) with a privacy line.',
    knobs: 'side (visual left|right), block (tint|accent|dark|none), fields (email|name+email)',
    build: (c, k) => {
      const right = (k.side ?? 'left') === 'right'
      const cover = photo(c, 0.78, { radius: 10, shadow: 'far', maxWidth: 380 })
      const block = blockColor(k.block)
      const visual = col(block ? [colourBlock([cover], block, [72, 56, 72, 56], [32, 32, 32, 32])] : [cover], { gap: 0, vAlign: 'center' })
      visual.props.motion = { enter: 'zoom', speed: 'slow' }
      const form = optinForm(c, { ...k, fields: k.fields ?? 'name+email' })
      const list = c.bullets?.length ? [el('list', { items: c.bullets.slice(0, 4), icon: 'check' }, { fontSize: 18, gap: 12 })] : []
      const copy = col([...eyebrow(c.eyebrow), H1(c.headline, 64, { maxWidth: 580 }), ...(c.sub ? [lead(c.sub, { fontSize: 20 })] : []), ...list, form, ...(c.note ? [small(c.note)] : [])], { gap: 22 })
      copy.props.motion = { enter: 'fade-up', stagger: true, speed: 'slow' }
      return sectionOf('light', [row(right ? [copy, visual] : [visual, copy], { colWidths: right ? [6, 5] : [5, 6], gap: 80 })], { paddingY: 120 })
    },
  },

  'hero-event': {
    label: 'Event hero: facts as chips, host portrait',
    use: 'For webinars, masterclasses, live launches, workshops: a label, the big outcome, the date / time / place as chips, the register button, and a round host portrait with a name card.',
    knobs: 'tone (light|dark), side (portrait left|right), card (copy.card for the host name)',
    build: (c, k) => {
      const dark = k.tone !== 'light'
      const right = (k.side ?? 'right') === 'right'
      const chips = c.facts?.length
        ? [
            row(
              c.facts.slice(0, 3).map((f) => col([el('text', { text: f }, { fontSize: 16, fontWeight: 600 })], { gap: 0, background: dark ? 'rgba(255,255,255,.1)' : 'surface', radius: 999, pad: [10, 18, 10, 18], ...(dark ? {} : { shadow: 'soft' }) })),
              { gap: 10, noStack: true, colWidths: [1, 1, 1, 1].slice(0, Math.max(3, c.facts.length)) },
              { minCol: 90 },
            ),
          ]
        : []
      const copy = copyColumn(c, 78, { after: chips })
      const host = photo(c, 1, { radius: 999, shadow: 'far', maxWidth: 440, layer: 1 })
      const visual = col([host, ...(c.card ? [floatCard(c.card, [-70, 200, 0, 40], dark)] : [])], { gap: 0 })
      visual.props.motion = { enter: 'zoom', speed: 'slow' }
      return sectionOf(dark ? 'dark' : 'light', [row(right ? [copy, visual] : [visual, copy], { colWidths: right ? [7, 5] : [5, 7], gap: 80 })], { paddingY: 136 })
    },
  },
}

/* ---------------- the rest of the page ---------------- */

Object.assign(RECIPES, {
  'proof-quote': {
    label: 'One big quote',
    use: 'Proof as the hero of a section: one testimonial set very large in the heading font. With a photo of the person it becomes a split (photo edge to edge on one half); without one, the quote stands alone, centred. Right after the hero, or before the offer.',
    knobs: 'tone (light|tint|dark), side (photo left|right), size (big|huge)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const q = c.quote ?? { text: c.headline, author: c.byline ?? '' }
      const words0 = destar(q.text).trim().replace(/^["“”«»„'‘’]+|["“”«»„'‘’]+$/g, '').trim()
      const by = [el('text', { text: q.author }, { fontSize: 18, fontWeight: 600, color: 'ink' }), ...(q.role ? [small(q.role, { fontSize: 16 })] : [])]
      if (q.photo) {
        const right = k.side === 'right'
        const big = el('headline', { text: `“${words0}”`, level: 2 }, { fontSize: k.size === 'big' ? 40 : 48, lineHeight: 1.15, maxWidth: 620 })
        big.style.mobile = { fontSize: 28 }
        const inner = col([big, col([rule(16), ...by], { gap: 4, maxWidth: 620 })], { gap: 40 })
        inner.props.motion = { enter: 'fade', speed: 'slow' }
        const box = el('contentbox', { headerVisible: false }, { pad: right ? [112, 72, 112, 96] : [112, 96, 112, 72], borderType: 'none', shadow: 'none', ...tintIf(k) }, [inner])
        box.style.mobile = { pad: [56, 20, 64, 20] }
        const words = col([box], { gap: 0, vAlign: 'center' })
        const img = photo({ ...c, photo: q.photo, headline: q.author }, -1, { minHeight: 640 })
        img.style.mobile = { minHeight: 380 }
        const pic = col([img], { gap: 0 })
        return bleed(toneOf(k), [row(right ? [words, pic] : [pic, words], { colWidths: [1, 1], gap: 0, vAlign: 'stretch' })], {}, 'testimonials')
      }
      const big = el('headline', { text: `“${words0}”`, level: 2 }, { fontSize: k.size === 'big' ? 48 : 60, lineHeight: 1.1, maxWidth: 1000, textAlign: 'center' })
      big.style.mobile = { fontSize: 30 }
      const words = col([big, col(by, { gap: 4, textAlign: 'center' })], { gap: 40, textAlign: 'center' })
      words.props.motion = { enter: 'fade', speed: 'slow' }
      return sectionOf(toneOf(k), [row([words])], { paddingY: 160, textAlign: 'center', ...tintIf(k) }, 'testimonials')
    },
  },

  'proof-numbers': {
    label: 'A strip of real numbers',
    use: 'Three or four real numbers from the brief (students, results, years, rating), very big, each under a thin line, with a short label. Never invented numbers.',
    knobs: 'tone (light|tint|dark), headline (copy.headline or empty for numbers only)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // only real numbers: "0" or a word in the number's place reads as a broken number
      const stats = (c.stats ?? []).filter((st) => /[1-9]/.test(st.value)).slice(0, 4)
      // all the numbers at one size: the longest one still fits on one line
      const longest = Math.max(0, ...stats.map((st) => st.value.length))
      const size = longest > 9 ? 48 : longest > 6 ? 60 : 80
      const cols = stats.map((st) => {
        const v = el('headline', { text: st.value, level: 3 }, { fontSize: size, lineHeight: 1, letterSpacing: -2 })
        v.style.mobile = { fontSize: Math.round(size * 0.65) }
        return col([rule(14), v, small(st.label, { fontSize: 17, maxWidth: 260 })], { gap: 14 })
      })
      const strip = row(cols, { gap: 40, vAlign: 'start' }, { minCol: 180 })
      strip.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(toneOf(k), [...(c.headline ? [row([head(c)], { gap: 0 })] : []), strip], { paddingY: 128, gap: 72, ...tintIf(k) }, 'stats')
    },
  },

  'features-list': {
    label: 'Editorial list (no cards)',
    use: 'What they get or what they learn, as a calm editorial list: the section title stays on the left while 3-6 items run down the right, each a big title and a line, separated by thin lines. No boxes. The quiet default for benefits, modules, features.',
    knobs: 'tone (light|tint|dark)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const items = (c.items ?? []).slice(0, 6).map((x) => col([rule(22), H3(x.title), ...body(x.text)], { gap: 10, pad: [0, 0, 32, 0] }))
      const list = col(items, { gap: 0 })
      list.props.motion = { enter: 'fade-up', stagger: true }
      const left = head(c)
      left.props.motion = { scroll: 'sticky' }
      return sectionOf(toneOf(k), [row([left, list], { colWidths: [5, 7], gap: 96, vAlign: 'start' })], { ...tintIf(k) }, 'features')
    },
  },

  'features-rows': {
    label: 'Alternating photo rows',
    use: 'Two or three big photo-and-text rows that alternate sides, each telling one part of the story (the problem, the method, the result; or three key benefits). Each item needs a photo. For pages that should feel visual and story-like.',
    knobs: 'tone (light|tint), side (first photo left|right)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const first = (k.side ?? 'left') === 'left'
      const rows = (c.items ?? []).slice(0, 3).map((x, i) => {
        const pic = col([photo({ ...c, photo: x.photo, headline: x.title }, 1.1, { radius: 28 })], { gap: 0 })
        const words = col([el('text', { text: String(i + 1).padStart(2, '0') }, { fontSize: 16, fontWeight: 600, color: 'primary' }), H2(x.title, { fontSize: 44, maxWidth: 520 }), ...body(x.text, { fontSize: 19, maxWidth: 480 })], { gap: 20, vAlign: 'center' })
        words.children![1].style.mobile = { fontSize: 30 }
        const left = (i % 2 === 0) === first
        const r = row(left ? [pic, words] : [words, pic], { colWidths: left ? [7, 5] : [5, 7], gap: 96 })
        // on phones every row reads the same way: the photo, then its words
        if (!left) r.style.mobile = { reverse: true }
        r.props.motion = { enter: 'fade-up', speed: 'slow' }
        return r
      })
      return sectionOf('light', [...(c.headline ? [row([head(c, true)], { gap: 0 })] : []), ...rows], { gap: 128, ...tintIf(k) }, 'features')
    },
  },

  'offer-bento': {
    label: 'Bento of what\'s inside',
    use: 'What they get, as a bento: one big photo card for the most important thing, one bold accent card, then up to four quiet cards. Courses, programmes, products, memberships. Use when the items are things (modules, bonuses, tools); otherwise prefer features-list.',
    knobs: 'tone (light|tint), items 3-6 (the first gets the photo)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const items = (c.items ?? []).slice(0, 6)
      const [a, b, ...more] = items
      const big = a
        ? card([...(a.photo ? [photo({ ...c, photo: a.photo, headline: a.title }, 1.45, { radius: 16 })] : []), H3(a.title, { fontSize: 28 }), ...body(a.text)], { paddingY: 20, paddingX: 20 })
        : null
      const accentInner = b ? el('column', {}, { gap: 14, vAlign: 'end', minHeight: 300 }, [H3(b.title, { fontSize: 34, color: 'on-primary' }), ...body(b.text, { color: 'on-primary' })]) : null
      // the tall accent card is a desktop shape: on phones it is as tall as its words
      if (accentInner) accentInner.style.mobile = { minHeight: 0 }
      const accent = accentInner ? el('contentbox', { headerVisible: false }, { background: 'primary', radius: 24, paddingY: 40, paddingX: 36, borderType: 'none', shadow: 'none' }, [accentInner]) : null
      const small = (x: { title: string; text?: string }) => card([H3(x.title, { fontSize: 22 }), ...body(x.text, { fontSize: 17 })])
      // three things: the big card, with the accent and the third stacked beside it (a lone card on its own row looks lost)
      const side = more.length === 1 ? [...(accent ? [accent] : []), small(more[0])] : accent ? [accent] : []
      const top = row([col(big ? [big] : [], { gap: 0 }), col(side, { gap: 20 })], { colWidths: [7, 5], gap: 20, vAlign: 'stretch' })
      const bottom = more.length > 1 ? [row(more.map((x) => col([small(x)], { gap: 0 })), { gap: 20, vAlign: 'stretch' }, { minCol: 220 })] : []
      top.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf('light', [row([head(c)], { gap: 0 }), top, ...bottom], { gap: 56, ...tintIf(k) }, 'features')
    },
  },

  'offer-steps': {
    label: 'Steps beside a photo that stays',
    use: 'A real sequence (how it works, the weeks of a programme, 3-5 steps), numbered, beside a tall photo that stays in view while the steps scroll. Only for things that really happen in order.',
    knobs: 'side (photo left|right), tone (light|tint|dark)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'left') === 'right'
      const steps = (c.items ?? []).slice(0, 5).map((x, i) =>
        row(
          [
            col([el('text', { text: String(i + 1).padStart(2, '0') }, { fontSize: 16, fontWeight: 600, color: 'primary' })], { gap: 0 }),
            col([H3(x.title, { fontSize: 24 }), ...body(x.text, { fontSize: 17 })], { gap: 8 }),
          ],
          { colWidths: [1, 9], gap: 16, noStack: true, vAlign: 'start', pad: [28, 0, 28, 0], ...hairline },
          { minCol: 30 },
        ),
      )
      const list = col([head(c), col(steps, { gap: 0 })], { gap: 48 })
      const pic = col([photo(c, 0.78, { radius: 28 })], { gap: 0 })
      pic.props.motion = { scroll: 'sticky' }
      return sectionOf(toneOf(k), [row(right ? [list, pic] : [pic, list], { colWidths: right ? [6, 5] : [5, 6], gap: 96, vAlign: 'start' })], { ...tintIf(k) }, 'steps')
    },
  },

  'offer-price': {
    label: 'The offer and its price',
    use: 'Everything they get with the price, the payment option, the button and the guarantee, on a band that stands out (dark by default). For sales pages.',
    knobs: 'tone (dark|tint|light)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const pr = c.price ?? { amount: '' }
      const includes = pr.includes?.length ? [el('list', { items: pr.includes.slice(0, 7), icon: 'check' }, { fontSize: 18, gap: 14 })] : []
      const left = col([...eyebrow(c.eyebrow), H2(c.headline, { maxWidth: 580 }), ...(c.sub ? [lead(c.sub, { fontSize: 20 })] : []), ...includes], { gap: 24 })
      const amount = el('headline', { text: pr.amount, level: 3 }, { fontSize: 88, lineHeight: 1, color: '#171717', letterSpacing: -3 })
      amount.style.mobile = { fontSize: 64 }
      const priceCard = el('contentbox', { headerVisible: false }, { background: '#FFFFFF', radius: 28, paddingY: 44, paddingX: 40, shadow: 'far', borderType: 'none' }, [
        col(
          [
            ...(pr.plan ? [el('text', { text: pr.plan }, { fontSize: 17, fontWeight: 600, color: '#171717' })] : []),
            amount,
            ...(pr.period ? [el('text', { text: pr.period }, { fontSize: 17, color: '#5C6370' })] : []),
            // a checkout: the payment button (a lock, a small reassurance line) in the plain button's place
            k.pay === 'card' ? el('paybutton', { text: c.cta, subtext: c.card?.small ?? '', icon: 'lock' }, { textAlign: 'center', fontSize: 17, paddingY: 18, paddingX: 32, fullWidth: true }) : button(c.cta, { fullWidth: true }),
            ...(c.note ? [el('text', { text: c.note }, { fontSize: 15, color: '#5C6370', textAlign: 'center' })] : []),
          ],
          { gap: 16 },
        ),
      ])
      priceCard.props.motion = { enter: 'scale', speed: 'slow' }
      return sectionOf(k.tone === 'light' || k.tone === 'tint' ? 'light' : 'dark', [row([left, col([priceCard], { gap: 0 })], { colWidths: [7, 5], gap: 88 })], { ...tintIf(k) }, 'pricing')
    },
  },

  'fit-list': {
    label: 'Who it is for, and who it is not for',
    use: 'Two honest lists side by side under one headline: "This is for you if" and "This is not for you if", 3-5 lines each, with thin lines, no boxes. Builds trust and qualifies buyers on sales and book-a-call pages.',
    knobs: 'tone (light|tint|dark)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const f = c.fit ?? { yes: [], no: [] }
      const side = (title: string, items: string[], icon: string) =>
        col([rule(8), H3(title, { fontSize: 24 }), el('list', { items: items.slice(0, 6), icon }, { fontSize: 18, gap: 16, lineHeight: 1.5 })], { gap: 24 })
      const two = row([side(f.yesTitle ?? 'This is for you if', f.yes, 'check'), side(f.noTitle ?? 'This is not for you if', f.no, 'x')], { gap: 72, vAlign: 'start' })
      two.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(toneOf(k), [row([head(c)], { gap: 0 }), two], { gap: 64, ...tintIf(k) }, 'fit')
    },
  },

  'faq-split': {
    label: 'Questions, title on the side',
    use: 'The FAQ: the title and one line (with a way to ask) stay on the left, 5-8 questions open and close on the right, written as buyers ask them. Answers start with yes or no.',
    knobs: 'tone (light|tint)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const left = head(c)
      left.props.motion = { scroll: 'sticky' }
      const faq = faqOf(realFaqs(c).slice(0, 8))
      faq.style.desktop = { ...faq.style.desktop, gap: 12, fontSize: 19 }
      return sectionOf('light', [row([left, col([faq], { gap: 0 })], { colWidths: [5, 7], gap: 96, vAlign: 'start' })], { ...tintIf(k) }, 'faq')
    },
  },

  'photo-band': {
    label: 'Full-bleed photo with one line',
    use: 'A breathing moment between sections or the closing band: one wide photo, one strong line over its calm side, and an optional button. Use once per page.',
    knobs: 'side (text left|center), button (copy.cta or empty)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const center = k.side !== 'left'
      const a: Style = center ? { textAlign: 'center' } : {}
      const line = H2(c.headline, { ...a, fontSize: 64, ...(center ? { maxWidth: 940 } : { maxWidth: 660 }) })
      line.style.mobile = { fontSize: 36 }
      const words = col([line, ...(c.sub ? [lead(c.sub, { ...a, ...(center ? { maxWidth: 600 } : {}) })] : []), ...(c.cta ? [button(c.cta, a)] : [])], { gap: 28, ...a })
      words.props.motion = { enter: 'fade-up', speed: 'slow' }
      const s = sectionOf('dark', [row([words])], {
        backgroundImage: c.photo || `img:${SCENE}, wide calm framing with space for text${center ? ' in the middle' : ' on the left'}`,
        overlay: center ? 'rgba(0,0,0,.45)' : 'linear-gradient(90deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,.05) 100%)',
        paddingY: 220,
        ...(center ? { textAlign: 'center' } : {}),
      }, 'cta')
      s.style.mobile = { paddingY: 120, paddingX: 20, overlay: 'rgba(0,0,0,.55)' }
      s.props.motion = { scroll: 'parallax' }
      return s
    },
  },

  'close-cta': {
    label: 'The closing call to action',
    use: 'The end of the page: the outcome restated in one very big headline, one line, the button and the reassurance line, centred on a calm tinted band. Exactly once, last.',
    knobs: 'tone (tint|dark|light), shape (rounded: an inset rounded box instead of a full band), fields (email|name+email: a form instead of the button)',
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // with fields, the form takes the button's place (the note stays under it)
      const form = k.fields ? [col([optinForm(c, k, fieldsOf(k).length === 1), ...(c.note ? [small(c.note, { textAlign: 'center' })] : [])], { gap: 12, maxWidth: 560 })] : []
      const words = copyColumn(k.fields ? { ...c, cta: '', note: undefined } : c, 80, { center: true, after: form })
      words.children!.find((n) => n.type === 'headline')!.style.mobile = { fontSize: 40 }
      const dark = k.tone === 'dark'
      if (k.shape === 'rounded') {
        // the band as a box on the page background: its colour, corners and padding are the box's own settings
        // (the surface colour, so the accent button still stands out on it; a tint when the surface is the page colour)
        const box = el('contentbox', { headerVisible: false }, { background: dark ? 'dark' : 'surface', radius: 32, paddingY: 96, paddingX: 48, borderType: 'none', shadow: 'none' }, [col([words], { gap: 0 })])
        box.style.mobile = { paddingY: 56, paddingX: 20, radius: 24 }
        const s = sectionOf(dark ? 'dark' : 'light', [row([col([box], { gap: 0 })], { gap: 0 })], { paddingY: 96, textAlign: 'center', background: 'bg' }, 'cta')
        s.style.mobile = { paddingY: 48, paddingX: 20, gap: 0 }
        return s
      }
      return sectionOf(dark ? 'dark' : 'light', [row([words])], { paddingY: 176, textAlign: 'center', ...(k.tone === 'tint' || !k.tone ? { background: TINT } : {}) }, 'cta')
    },
  },
} as Record<string, Recipe>)

/* ---------------- more sections: the top and bottom, proof, software, the offer, the close ---------------- */

const ICON_OK = new Set(Object.keys(ICONS))
/** a small icon in the accent colour (a name the icon set knows, else a check) */
const iconOf = (name?: string, size = 24) => el('icon', { icon: name && ICON_OK.has(name) ? name : 'check', action: 'none' }, { iconSize: size, textAlign: 'left', color: 'primary' })
/** the logo as an image that keeps its shape, else the brand name as a small headline */
const brandMark = (c: RecipeCopy, width: number, size: number) =>
  c.logo ? el('image', { src: c.logo, alt: c.headline, aspect: 0, action: 'url', url: '#' }, { maxWidth: width, width: 100 }) : el('headline', { text: c.headline, level: 3 }, { fontSize: size, lineHeight: 1 })
/** the fields a form can ask for, by the plain word the AI writes in the knob ("name+email+phone") */
const FIELD_WORDS: Record<string, { type: FieldType; label: string }> = {
  email: { type: 'email', label: 'Email address' },
  name: { type: 'first_name', label: 'First name' },
  firstname: { type: 'first_name', label: 'First name' },
  lastname: { type: 'last_name', label: 'Last name' },
  surname: { type: 'last_name', label: 'Last name' },
  phone: { type: 'phone', label: 'Phone number' },
  tel: { type: 'phone', label: 'Phone number' },
  company: { type: 'company', label: 'Company name' },
  website: { type: 'website', label: 'Website' },
  city: { type: 'city', label: 'City' },
  country: { type: 'country', label: 'Country' },
}
/** the form's fields from the knob, in the order written ("email", "name+email", "name+email+phone"…); email alone by default */
export const fieldsOf = (k: RecipeKnobs) => {
  const seen = new Set<FieldType>()
  const out = (k.fields ?? 'email')
    .toLowerCase()
    .split(/[^a-z_]+/)
    .map((w) => FIELD_WORDS[w.replace(/_/g, '')] ?? FIELD_WORDS[w])
    .filter((f): f is { type: FieldType; label: string } => !!f && !seen.has(f.type) && !!seen.add(f.type))
  return out.length ? out : [FIELD_WORDS.email]
}
/** a form for an opt-in with the fields the knob asks for and the button's words; inline puts the field and the button on one row */
const optinForm = (c: RecipeCopy, k: RecipeKnobs, inline = false) => {
  const form = ELEMENT_DEFAULTS.form!()
  form.props.buttonText = c.cta
  // the labels in the page's language when the copy gives them (the defaults are English)
  form.props.fields = fieldsOf(k).map((f, i) => (c.placeholders?.[i]?.trim() ? { ...f, label: c.placeholders[i].trim() } : f))
  if (inline) form.props.layout = 'inline'
  form.children = formChildren(form)
  // on one row the button keeps its own width (the field takes the rest)
  if (inline) walkNodes(form, (n) => void (n.type === 'button' && delete n.style.desktop.fullWidth))
  form.style.desktop.paddingX = 0
  return form
}
/** one or two product shots side by side (items with photos), else the one wide shot, else nothing */
const shotsUnder = (c: RecipeCopy) => {
  const shots = (c.items ?? []).filter((x) => x.photo).slice(0, 2)
  if (shots.length) {
    const r = row(
      shots.map((x) => col([el('image', { src: x.photo!, alt: x.title, aspect: shots.length === 2 ? 1.35 : 1.9 }, { width: 100, radius: 18, shadow: 'far' })], { gap: 0 })),
      { gap: 24, vAlign: 'start' },
      { minCol: 280 },
    )
    r.props.motion = { enter: 'fade-up', speed: 'slow', stagger: true }
    return [r]
  }
  if (!c.photo) return []
  const shot = photo(c, 1.9, { radius: 20, shadow: 'far', maxWidth: 1080 })
  shot.props.motion = { enter: 'scale', speed: 'slow' }
  return [shot]
}
/** a video link as the player wants it (a YouTube or Vimeo page link becomes its embed link) */
const embedOf = (url?: string) => {
  const u = (url ?? '').trim()
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return u
}
/** questions with an answer (an empty answer would show as an empty line) */
const realFaqs = (c: RecipeCopy) => (c.faqs ?? []).filter((f) => f.q?.trim() && f.a?.trim())
const realStats = (c: RecipeCopy, n: number) => (c.stats ?? []).filter((st) => /[1-9]/.test(st.value)).slice(0, n)
const META = RECIPE_META

Object.assign(RECIPES, {
  'hero-optin-center': {
    label: 'Centred opt-in, form on its own',
    use: META['hero-optin-center'].use,
    knobs: META['hero-optin-center'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // the note already says it: the same words are not listed again as checks
      const bullets = (c.bullets ?? []).filter((b) => !(c.note ?? '').toLowerCase().includes(b.trim().toLowerCase())).slice(0, 3)
      const checks = bullets.length ? [col([el('list', { items: bullets, icon: 'check' }, { fontSize: 16, gap: 8, color: 'muted', textAlign: 'left' })], { gap: 0, maxWidth: 440, textAlign: 'left' })] : []
      // one field: the email and the button on one row; more fields stack
      const inline = fieldsOf(k).length === 1
      const words = col(
        [
          ...eyebrow(c.eyebrow, { textAlign: 'center' }),
          H1(c.headline, 72, { textAlign: 'center', maxWidth: 900 }),
          ...(c.sub ? [lead(c.sub, { textAlign: 'center', maxWidth: 620 })] : []),
          col([optinForm(c, k, inline), ...(c.note ? [small(c.note, { textAlign: 'center' })] : [])], { gap: 12, maxWidth: inline ? 560 : 520 }),
          ...checks,
        ],
        { gap: 28, textAlign: 'center' },
      )
      words.props.motion = { enter: 'fade-up', stagger: true, speed: 'slow' }
      const shots = shotsUnder(c)
      const s = sectionOf(toneOf(k), [row([words]), ...shots], { paddingY: 150, textAlign: 'center', gap: 80, ...tintIf(k) })
      if (shots.length) s.style.desktop.paddingY = 120
      return s
    },
  },

  'hero-optin-card': {
    label: 'Photo first screen, form in a card',
    use: META['hero-optin-card'].use,
    knobs: META['hero-optin-card'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'right') === 'right'
      const list = c.bullets?.length ? [el('list', { items: c.bullets.slice(0, 3), icon: 'check' }, { fontSize: 16, gap: 10, color: '#4D4D4D' })] : []
      const box = el('contentbox', { headerVisible: false }, { background: '#FFFFFF', radius: 24, paddingY: 36, paddingX: 36, shadow: 'far', borderType: 'none' }, [
        el('column', {}, { gap: 18 }, [...list, optinForm(c, k), ...(c.note ? [el('text', { text: c.note }, { fontSize: 14, color: '#5C6370' })] : [])]),
      ])
      box.props.motion = { enter: 'fade-up', speed: 'slow' }
      const words = col([...eyebrow(c.eyebrow), H1(c.headline, 76, { maxWidth: 640 }), ...(c.sub ? [lead(c.sub, { color: 'ink' })] : [])], { gap: 20, vAlign: 'center' })
      words.props.motion = { enter: 'fade-up', stagger: true, speed: 'slow' }
      const s = sectionOf('dark', [row(right ? [words, col([box], { gap: 0 })] : [col([box], { gap: 0 }), words], { colWidths: right ? [7, 5] : [5, 7], gap: 72 })], {
        backgroundImage: c.photo || `img:${SCENE}, wide calm framing with room for text on the ${right ? 'left' : 'right'}`,
        overlay: `linear-gradient(${right ? '90deg' : '270deg'}, rgba(0,0,0,.74) 0%, rgba(0,0,0,.45) 50%, rgba(0,0,0,.18) 100%)`,
        minHeight: 760,
        paddingY: 110,
      })
      s.style.mobile = { overlay: 'rgba(0,0,0,.6)', minHeight: 0, paddingY: 72, paddingX: 20 }
      s.props.motion = { scroll: 'parallax' }
      return s
    },
  },

  header: {
    label: 'Header',
    use: META.header.use,
    knobs: META.header.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const links = (c.links ?? []).slice(0, 5).map((l) => ({ label: l, href: '#' }))
      // the call to action is the menu's last item, shown as a button: at the right of the links on desktop, at the
      // bottom of the dropdown on phones (one element, nothing to hide per device)
      const items = c.cta ? [...links, { label: c.cta, href: '#', button: true }] : links
      const menu = el('menu', { menu: items, burger: true }, { fontSize: 15, textAlign: 'center', gap: 28 })
      menu.style.mobile = { textAlign: 'right' }
      const mark = brandMark(c, 150, 22)
      mark.style.mobile = { maxWidth: 110 }
      // a header with nothing to navigate (an opt-in page that only wants the logo): the logo alone, no empty menu button
      const r = row(items.length ? [col([mark], { gap: 0, vAlign: 'center' }), col([menu], { gap: 0, vAlign: 'center' })] : [col([mark], { gap: 0, vAlign: 'center' })], { colWidths: items.length ? [3, 9] : [12], gap: 24, noStack: true }, { minCol: 60 })
      // phones: logo | menu button, on one line
      r.style.mobile = { noStack: true, gap: 10, colWidths: items.length ? [6, 6] : [12] }
      const s = sectionOf(k.tone === 'dark' ? 'dark' : 'light', [r], { paddingY: 18, gap: 0 }, 'header')
      s.style.mobile = { paddingY: 14, paddingX: 16 }
      return s
    },
  },

  footer: {
    label: 'Footer',
    use: META.footer.use,
    knobs: META.footer.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const left = col([brandMark(c, 130, 20), ...(c.sub ? [small(c.sub, { fontSize: 15, maxWidth: 380 })] : [])], { gap: 14 })
      // (a column may have no title: the continuation of the one before it)
      const groups = (c.groups ?? []).filter((g) => g.links?.length).slice(0, 5)
      const social = (c.social ?? []).map((x) => x.trim().toLowerCase()).filter((x) => ICON_OK.has(x)).slice(0, 6)
      let top: Node
      if (groups.length) {
        // link columns, each a small title over plain links (click one to give it its address)
        const cols = groups.map((g) => col([...(g.title ? [el('headline', { text: g.title, level: 4 }, { fontSize: 16 })] : [el('spacer', {}, { height: 20 })]), ...g.links.slice(0, 10).map((l) => el('text', { text: l }, { fontSize: 15, color: 'ink' }))], { gap: 14, vAlign: 'start' }))
        // the brand column only when there is a logo or a name to show (a footer of links alone has none)
        const brand = c.logo || c.headline ? [left] : []
        top = row([...brand, ...cols], { ...(brand.length ? { colWidths: [3, ...groups.map(() => 9 / groups.length)] } : {}), gap: 32, vAlign: 'start' }, { minCol: 150 })
      } else {
        const menu = el('menu', { menu: (c.links ?? []).slice(0, 6).map((l) => ({ label: l, href: '#' })), burger: false }, { fontSize: 15, textAlign: 'right' })
        top = row([left, col([menu], { gap: 0, vAlign: 'center', textAlign: 'right' })], { colWidths: [6, 6], gap: 40, vAlign: 'center' })
      }
      // the social icons in one tight row, centred under the line
      const icons = social.length
        ? [col([row(social.map((x) => col([el('icon', { icon: x, action: 'url', url: '#' }, { iconSize: 20, textAlign: 'center' })], { gap: 0 })), { gap: 8, noStack: true, vAlign: 'center' }, { minCol: 24 })], { gap: 0, maxWidth: 48 * social.length })]
        : []
      const centred = groups.length > 0 || social.length > 0
      const bottom = row([col([rule(0), ...icons, small(c.note ?? `© ${new Date().getFullYear()} ${c.headline}`, { fontSize: 14, ...(centred ? { textAlign: 'center' } : {}) })], { gap: 20, ...(centred ? { textAlign: 'center' } : {}) })], { gap: 0 })
      const s = sectionOf(k.tone === 'dark' ? 'dark' : 'light', [top, bottom], { paddingY: 56, gap: 40, ...tintIf(k) }, 'footer')
      s.style.mobile = { paddingY: 40, paddingX: 20, gap: 28 }
      return s
    },
  },

  'logos-strip': {
    label: 'Names as logos',
    use: META['logos-strip'].use,
    knobs: META['logos-strip'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const label = c.eyebrow ? [el('text', { text: c.eyebrow }, { fontSize: 14, fontWeight: 600, color: 'muted', textAlign: 'center', letterSpacing: 1 })] : []
      const logos = el('logos', { items: (c.logos ?? []).slice(0, 8) }, { fontSize: 22 })
      const s = sectionOf(toneOf(k), [row([col([...label, logos], { gap: 28, textAlign: 'center' })], { gap: 0 })], { paddingY: 64, gap: 0, ...tintIf(k) }, 'logos')
      s.props.motion = { enter: 'fade' }
      return s
    },
  },

  'testimonials-grid': {
    label: 'Testimonial cards',
    use: META['testimonials-grid'].use,
    knobs: META['testimonials-grid'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // (the card draws its own five stars: any the AI wrote into the words are dropped)
      const cards = (c.quotes ?? []).slice(0, 6).map((q) => col([el('quote', { text: unquote(destar(q.text)), author: destar(q.author), role: q.role ? destar(q.role) : q.role, ...(q.photo ? { src: q.photo } : {}) }, { fontSize: 18 })], { gap: 0 }))
      const rows: Node[] = []
      for (let i = 0; i < cards.length; i += 3) rows.push(row(cards.slice(i, i + 3), { gap: 20, vAlign: 'stretch' }, { minCol: 260 }))
      rows.forEach((r) => (r.props.motion = { enter: 'fade-up', stagger: true }))
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), ...rows], { gap: 56, ...tintIf(k) }, 'testimonials')
    },
  },

  'features-grid': {
    label: 'Cards with icons',
    use: META['features-grid'].use,
    knobs: META['features-grid'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const per = k.columns === '2' ? 2 : 3
      const cards = (c.items ?? []).slice(0, 6).map((x) => col([card([iconOf(x.icon), H3(x.title, { fontSize: 22 }), ...body(x.text, { fontSize: 17 })], { paddingY: 28, paddingX: 28 })], { gap: 0 }))
      const rows: Node[] = []
      for (let i = 0; i < cards.length; i += per) rows.push(row(cards.slice(i, i + per), { gap: 20, vAlign: 'stretch' }, { minCol: 240 }))
      rows.forEach((r) => (r.props.motion = { enter: 'fade-up', stagger: true }))
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), ...rows], { gap: 56, ...tintIf(k) }, 'features')
    },
  },

  'features-showcase': {
    label: 'Product shot with points',
    use: META['features-showcase'].use,
    knobs: META['features-showcase'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'right') === 'right'
      const shot = photo(c, 1.25, { radius: 20, shadow: 'far' })
      shot.props.motion = { enter: 'scale', speed: 'slow' }
      const points = (c.items ?? []).slice(0, 4).map((x) =>
        row([col([iconOf(x.icon)], { gap: 0 }), col([H3(x.title, { fontSize: 22 }), ...body(x.text, { fontSize: 17 })], { gap: 6 })], { colWidths: [1, 11], gap: 14, noStack: true, vAlign: 'start' }, { minCol: 24 }),
      )
      const words = col([head(c), col(points, { gap: 24 })], { gap: 40 })
      words.props.motion = { enter: 'fade-up', stagger: true }
      const pic = col([shot], { gap: 0 })
      return sectionOf(toneOf(k), [row(right ? [words, pic] : [pic, words], { colWidths: right ? [5, 7] : [7, 5], gap: 80 })], { ...tintIf(k) }, 'features')
    },
  },

  'offer-stack': {
    label: 'Everything included, with values',
    use: META['offer-stack'].use,
    knobs: META['offer-stack'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const lines = (c.items ?? []).slice(0, 8).map((x) =>
        row([col([H3(x.title, { fontSize: 20 })], { gap: 0 }), col([el('text', { text: x.text ?? '' }, { fontSize: 17, fontWeight: 600, color: 'primary', textAlign: 'right' })], { gap: 0, vAlign: 'center' })], { colWidths: [8, 4], gap: 16, noStack: true, pad: [18, 0, 18, 0], ...hairline }, { minCol: 80 }),
      )
      const pr = c.price
      const total = pr
        ? [row([col([el('text', { text: pr.period ?? '' }, { fontSize: 16, color: 'muted' })], { gap: 0, vAlign: 'center' }), col([el('headline', { text: pr.amount, level: 3 }, { fontSize: pr.amount.length > 8 ? 34 : 44, lineHeight: 1, textAlign: 'right' })], { gap: 0, vAlign: 'center' })], { colWidths: [5, 7], gap: 16, noStack: true, pad: [24, 0, 0, 0] }, { minCol: 80 })]
        : []
      const box = card([col(lines, { gap: 0 }), ...total, ...(c.cta ? [button(c.cta, { fullWidth: true })] : []), ...(c.note ? [small(c.note, { textAlign: 'center' })] : [])], { paddingY: 36, paddingX: 36 })
      box.props.motion = { enter: 'fade-up', speed: 'slow' }
      return sectionOf(toneOf(k), [row([head(c), col([box], { gap: 0 })], { colWidths: [5, 7], gap: 80, vAlign: 'start' })], { ...tintIf(k) }, 'pricing')
    },
  },

  'steps-row': {
    label: 'Steps side by side',
    use: META['steps-row'].use,
    knobs: META['steps-row'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const steps = (c.items ?? []).slice(0, 4).map((x, i) => {
        const n = el('headline', { text: String(i + 1).padStart(2, '0'), level: 3 }, { fontSize: 56, lineHeight: 1, color: 'primary', letterSpacing: -2 })
        return col([rule(20), n, H3(x.title, { fontSize: 23 }), ...body(x.text, { fontSize: 17 })], { gap: 14 })
      })
      const r = row(steps, { gap: 40, vAlign: 'start' }, { minCol: 200 })
      r.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(toneOf(k), [row([head(c)], { gap: 0 }), r], { gap: 64, ...tintIf(k) }, 'steps')
    },
  },

  story: {
    label: 'A written passage',
    use: META.story.use,
    knobs: META.story.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const center = k.align === 'center'
      const a: Style = center ? { textAlign: 'center' } : {}
      const paras = (c.paragraphs ?? []).slice(0, 4).map((t) => el('text', { text: t }, { fontSize: 20, lineHeight: 1.7, color: 'ink', maxWidth: 680, ...a }))
      const pull = c.byline ? [el('text', { text: c.byline }, { fontSize: 26, lineHeight: 1.35, fontWeight: 600, maxWidth: 680, pad: [8, 0, 0, 0], ...a })] : []
      const words = col([...eyebrow(c.eyebrow, a), H2(c.headline, { ...a, maxWidth: 760 }), ...paras, ...pull], { gap: 24, maxWidth: 760, ...a })
      words.props.motion = { enter: 'fade-up', stagger: true, speed: 'slow' }
      return sectionOf('light', [row([words])], { paddingY: 136, ...tintIf(k), ...(center ? { textAlign: 'center' } : {}) }, 'about')
    },
  },

  about: {
    label: 'The person behind it',
    use: META.about.use,
    knobs: META.about.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'left') === 'right'
      const shape = k.shape ?? 'rounded'
      const img = photo(c, shape === 'circle' ? 1 : 0.85, { ...(shape === 'arch' ? { radii: [999, 999, 28, 28] } : shape === 'circle' ? { radius: 999 } : { radius: 28 }), maxWidth: 480 })
      const pic = col([img], { gap: 0 })
      pic.props.motion = { enter: 'zoom', speed: 'slow' }
      const paras = (c.paragraphs ?? []).slice(0, 3).map((t) => el('text', { text: t }, { fontSize: 18, lineHeight: 1.65, color: 'muted' }))
      const stats = realStats(c, 3)
      const facts = stats.length ? [row(stats.map((st) => col([rule(10), el('headline', { text: st.value, level: 3 }, { fontSize: 36, lineHeight: 1 }), small(st.label, { fontSize: 15 })], { gap: 8 })), { gap: 24, vAlign: 'start', pad: [8, 0, 0, 0] }, { minCol: 110 })] : []
      const words = col([...eyebrow(c.eyebrow), H2(c.headline, { fontSize: 48, maxWidth: 560 }), ...(c.sub ? [el('text', { text: c.sub }, { fontSize: 17, fontWeight: 600, color: 'ink' })] : []), ...paras, ...facts], { gap: 20 })
      words.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(toneOf(k), [row(right ? [words, pic] : [pic, words], { colWidths: right ? [7, 5] : [5, 7], gap: 88 })], { ...tintIf(k) }, 'about')
    },
  },

  gallery: {
    label: 'Photo grid',
    use: META.gallery.use,
    knobs: META.gallery.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const items = (c.items ?? []).slice(0, 6)
      const tiles = items.map((x) => col([photo({ ...c, photo: x.photo, headline: x.title }, 1.25, { radius: 16 }), ...(x.title ? [small(x.title, { fontSize: 15 })] : [])], { gap: 12 }))
      const per = items.length === 4 ? 2 : 3
      const rows: Node[] = []
      for (let i = 0; i < tiles.length; i += per) rows.push(row(tiles.slice(i, i + per), { gap: 20, vAlign: 'start' }, { minCol: 220 }))
      rows.forEach((r) => (r.props.motion = { enter: 'fade-up', stagger: true }))
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), ...rows], { gap: 48, ...tintIf(k) }, 'about')
    },
  },

  team: {
    label: 'The team',
    use: META.team.use,
    knobs: META.team.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // a real, named person without their picture gets a spot to add it, never a made-up face
      const face = (x: { title: string; photo?: string }) => (x.photo ? photo({ ...c, photo: x.photo, headline: x.title }, 0.85, { radius: 20 }) : el('image', { src: '', alt: x.title, aspect: 0.85 }, { width: 100, radius: 20 }))
      const people = (c.items ?? []).slice(0, 4).map((x) => col([face(x), H3(x.title, { fontSize: 21 }), ...body(x.text, { fontSize: 16 })], { gap: 10 }))
      const r = row(people, { gap: 24, vAlign: 'start' }, { minCol: 200 })
      r.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf('light', [row([head(c, true)], { gap: 0 }), r], { gap: 56, ...tintIf(k) }, 'about')
    },
  },

  video: {
    label: 'One video',
    use: META.video.use,
    knobs: META.video.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // no link yet: an empty frame that says where to paste it (the live page shows nothing there until it is set)
      const v = el('video', { src: embedOf(c.video), aspect: 16 / 9 }, { radius: 20, shadow: 'far', maxWidth: 1000 })
      v.props.motion = { enter: 'scale', speed: 'slow' }
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), row([col([v], { gap: 0 })], { gap: 0 })], { gap: 56, textAlign: 'center', ...tintIf(k) }, 'video')
    },
  },

  'pricing-table': {
    label: 'Plans side by side',
    use: META['pricing-table'].use,
    knobs: META['pricing-table'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const cards = (c.plans ?? []).slice(0, 3).map((pl) => col([el('price', { name: pl.name, price: pl.price, period: pl.period, features: (pl.features ?? []).slice(0, 6), buttonText: pl.cta ?? c.cta, featured: !!pl.featured })], { gap: 0 }))
      const r = row(cards, { gap: 20, vAlign: 'stretch' }, { minCol: 260 })
      r.props.motion = { enter: 'fade-up', stagger: true }
      const note = c.note ? [row([col([small(c.note, { textAlign: 'center' })], { gap: 0 })], { gap: 0 })] : []
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), r, ...note], { gap: 56, ...tintIf(k) }, 'pricing')
    },
  },

  compare: {
    label: 'The old way against this way',
    use: META.compare.use,
    knobs: META.compare.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const f = c.fit ?? { yes: [], no: [] }
      const old = card([H3(f.noTitle ?? 'The old way', { fontSize: 22, color: 'muted' }), el('list', { items: f.no.slice(0, 6), icon: 'x' }, { fontSize: 17, gap: 14, color: 'muted', iconColor: 'muted' })], { paddingY: 36, paddingX: 36 })
      const now = el('contentbox', { headerVisible: false }, { background: 'primary', radius: 24, paddingY: 36, paddingX: 36, borderType: 'none', shadow: 'far' }, [
        el('column', {}, { gap: 14 }, [H3(f.yesTitle ?? 'This way', { fontSize: 22, color: 'on-primary' }), el('list', { items: f.yes.slice(0, 6), icon: 'check' }, { fontSize: 17, gap: 14, color: 'on-primary', iconColor: 'on-primary' })]),
      ])
      const two = row([col([old], { gap: 0 }), col([now], { gap: 0 })], { gap: 24, vAlign: 'stretch' })
      two.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), two], { gap: 56, ...tintIf(k) }, 'fit')
    },
  },

  guarantee: {
    label: 'The guarantee',
    use: META.guarantee.use,
    knobs: META.guarantee.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const big = el('headline', { text: c.card?.big ?? '30 days', level: 3 }, { fontSize: 56, lineHeight: 1, letterSpacing: -2 })
      big.style.mobile = { fontSize: 40 }
      const badge = col([iconOf('shield', 40), big, ...(c.card?.small ? [small(c.card.small, { fontSize: 16, fontWeight: 600, color: 'ink' })] : [])], { gap: 12 })
      badge.props.motion = { enter: 'fade-up', speed: 'slow' }
      const words = col([H2(c.headline, { fontSize: 44, maxWidth: 620 }), ...(c.sub ? [el('text', { text: c.sub }, { fontSize: 18, lineHeight: 1.65, color: 'muted', maxWidth: 620 })] : []), ...(c.cta ? [button(c.cta)] : [])], { gap: 20 })
      return sectionOf(toneOf(k), [row([badge, words], { colWidths: [4, 8], gap: 72 })], { paddingY: 112, ...tintIf(k) }, 'cta')
    },
  },

  'book-call': {
    label: 'Pick a time',
    use: META['book-call'].use,
    knobs: META['book-call'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'right') === 'right'
      const cal = ALL_ITEMS.find((i) => i.id === 'calendar')!.make()
      // the calendar's own words in the page's language (its defaults are English)
      const [t1, t2, next, f1, f2, submit, done] = c.labels ?? []
      Object.assign(cal.props, { ...(t1 ? { text: t1 } : {}), ...(t2 ? { subtext: t2 } : {}), ...(next ? { buttonText: next } : {}), ...(f1 ? { headline2: f1 } : {}), ...(f2 ? { subheadline2: f2 } : {}), ...(submit ? { submitText: submit } : {}), ...(done ? { finalText: done } : {}) })
      // the step-2 fields' labels (first name, last name, email, phone) in the page's language too
      if (c.placeholders?.length) {
        let i = 0
        walkNodes(cal, (n) => {
          if (n.type !== 'input') return
          const label = c.placeholders![i++]?.trim()
          if (label) n.props.placeholder = label
        })
      }
      const bullets = c.bullets?.length ? [el('list', { items: c.bullets.slice(0, 4), icon: 'check' }, { fontSize: 18, gap: 12 })] : []
      const words = col([...eyebrow(c.eyebrow), H2(c.headline, { maxWidth: 560 }), ...(c.sub ? [lead(c.sub, { fontSize: 20 })] : []), ...bullets, ...(c.note ? [small(c.note)] : [])], { gap: 22 })
      words.props.motion = { enter: 'fade-up', stagger: true }
      const calCol = col([cal], { gap: 0 })
      return sectionOf('light', [row(right ? [words, calCol] : [calCol, words], { colWidths: [6, 6], gap: 72, vAlign: 'start' })], { ...tintIf(k) }, 'cta')
    },
  },

  countdown: {
    label: 'Deadline band',
    use: META.countdown.use,
    knobs: META.countdown.knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      // the note is a date ("2026-11-28T23:59:00Z"), or a duration after the visitor arrives ("15 minutes", "2 hours", "3 days")
      const span = (c.note ?? '').match(/(\d+)\s*(min|minute|minutes|h|hr|hour|hours|d|day|days)\b/i)
      const at = c.note && !Number.isNaN(Date.parse(c.note)) ? Date.parse(c.note) : Date.now() + 72 * 3600e3
      const timer = span
        ? el(
            'countdown',
            {
              countdownType: 'delay',
              delayDays: /^d/i.test(span[2]) ? Number(span[1]) : 0,
              delayHours: /^h/i.test(span[2]) ? Number(span[1]) : 0,
              delayMinutes: /^m/i.test(span[2]) ? Number(span[1]) : 0,
              delaySeconds: 0,
            },
            { fontSize: 56, textAlign: 'center' },
          )
        : el('countdown', { endsAt: at }, { fontSize: 56, textAlign: 'center' })
      const words = col([...eyebrow(c.eyebrow, { textAlign: 'center' }), H2(c.headline, { textAlign: 'center', maxWidth: 820 }), ...(c.sub ? [lead(c.sub, { textAlign: 'center', maxWidth: 600 })] : []), timer, ...(c.cta ? [button(c.cta, { textAlign: 'center' })] : [])], { gap: 28, textAlign: 'center' })
      words.props.motion = { enter: 'fade-up', stagger: true }
      return sectionOf(k.tone === 'light' || k.tone === 'tint' ? 'light' : 'dark', [row([words])], { paddingY: 120, textAlign: 'center', ...tintIf(k) }, 'countdown')
    },
  },

  'faq-center': {
    label: 'Questions, centred',
    use: META['faq-center'].use,
    knobs: META['faq-center'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const faq = faqOf(realFaqs(c).slice(0, 6))
      faq.style.desktop = { ...faq.style.desktop, gap: 12, fontSize: 19 }
      return sectionOf(toneOf(k), [row([head(c, true)], { gap: 0 }), row([col([faq], { gap: 0, maxWidth: 760 })], { gap: 0 })], { gap: 48, ...tintIf(k) }, 'faq')
    },
  },

  'cta-split': {
    label: 'Closing call, photo beside',
    use: META['cta-split'].use,
    knobs: META['cta-split'].knobs,
    build: (c: RecipeCopy, k: RecipeKnobs) => {
      const right = (k.side ?? 'right') === 'right'
      const img = photo(c, -1, { minHeight: 560 })
      img.style.mobile = { minHeight: 360 }
      const pic = col([img], { gap: 0 })
      pic.props.motion = { enter: 'zoom', speed: 'slow' }
      const words = copyColumn(c, 60)
      words.style.desktop.vAlign = 'center'
      words.style.desktop.background = k.tone === 'tint' ? TINT : undefined
      const wordsBox = el('contentbox', { headerVisible: false }, { pad: right ? [96, 72, 96, 96] : [96, 96, 96, 72], borderType: 'none', shadow: 'none' }, [words])
      wordsBox.style.mobile = { pad: [56, 20, 64, 20] }
      return bleed(k.tone === 'dark' ? 'dark' : 'light', [row(right ? [col([wordsBox], { gap: 0, vAlign: 'center' }), pic] : [pic, col([wordsBox], { gap: 0, vAlign: 'center' })], { colWidths: [1, 1], gap: 0, vAlign: 'stretch' })], {}, 'cta')
    },
  },
} as Record<string, Recipe>)

/* ---------------- slots: the words and photos of a section, kept when it changes layout ---------------- */

const unquote = (t: string) => t.trim().replace(/^["“”«»„'‘’]+|["“”«»„'‘’]+$/g, '').trim()
/** stars written into a testimonial's words (the card shows its own) */
export const destar = (t: string) => t.replace(/[★☆⭐✩✭✮]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

/** Every piece of the copy as path → value ("headline", "items.1.title", "quote.photo"…). */
function flatten(v: unknown, path = '', out = new Map<string, string>()) {
  if (typeof v === 'string' && v.trim()) out.set(path, v)
  else if (Array.isArray(v)) v.forEach((x, i) => flatten(x, path ? `${path}.${i}` : String(i), out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out)
  return out
}
const walkNodes = (n: Node, f: (n: Node) => void) => (f(n), n.children?.forEach((c) => walkNodes(c, f)))

/** Mark which element holds which part of the copy (its slot), so the content can move to another layout. */
function tagSlots(section: Node, copy: RecipeCopy) {
  const paths = flatten(copy)
  const byText = new Map<string, string>()
  for (const [k, v] of paths) if (!byText.has(unquote(v))) byText.set(unquote(v), k)
  walkNodes(section, (n) => {
    const t = typeof n.props.text === 'string' ? unquote(n.props.text) : undefined
    const src = typeof n.props.src === 'string' ? n.props.src : undefined
    const slot = (t && byText.get(t)) || (src && byText.get(src)) || (n.type === 'list' && n.props.items?.length ? [...paths].find(([, v]) => v === n.props.items![0])?.[0]?.replace(/\.0$/, '') : undefined)
    if (slot) n.props.slot = slot
  })
}

/** The section's copy as it is now: what it was built with, updated with every slot's current words and photo. */
export function slotCopy(section: Node): RecipeCopy {
  const copy = structuredClone(section.props.recipeCopy ?? { headline: "", cta: "" }) as Record<string, unknown>
  const set = (path: string, value: unknown) => {
    const keys = path.split('.')
    let o = copy as Record<string, unknown>
    keys.slice(0, -1).forEach((k, i) => (o = (o[k] ??= /^\d+$/.test(keys[i + 1]) ? [] : {}) as Record<string, unknown>))
    o[keys[keys.length - 1]] = value
  }
  walkNodes(section, (n) => {
    const slot = n.props.slot
    if (!slot) return
    if (n.type === 'image') set(slot, n.props.src)
    else if (n.type === 'list') set(slot, n.props.items)
    else if (typeof n.props.text === 'string') set(slot, slot === 'quote.text' ? unquote(n.props.text) : n.props.text)
  })
  return copy as unknown as RecipeCopy
}

/** Which recipes can show the same content (they read the same slots). */
const GROUPS: string[][] = [
  ['hero-split', 'hero-fullbleed', 'hero-bigtype', 'hero-breakout', 'hero-showcase'],
  ['hero-optin', 'hero-optin-center', 'hero-optin-card'],
  ['hero-event'],
  ['header'],
  ['footer'],
  ['features-list', 'features-rows', 'offer-bento', 'offer-steps', 'features-grid', 'features-showcase', 'steps-row'],
  ['offer-stack'],
  ['proof-quote'],
  ['testimonials-grid'],
  ['proof-numbers'],
  ['logos-strip'],
  ['story', 'about'],
  ['gallery', 'team'],
  ['video'],
  ['offer-price'],
  ['pricing-table'],
  ['fit-list', 'compare'],
  ['guarantee'],
  ['book-call'],
  ['countdown'],
  ['faq-split', 'faq-center'],
  ['photo-band', 'close-cta', 'cta-split'],
]

/** Other versions of a recipe section: the other layouts of its group, then the same layout in another tone or side. */
export function alternativesFor(section: Node, theme?: Pick<Theme, 'radius'>): { label: string; node: Node }[] {
  const name = section.props.recipe
  if (!name || !RECIPES[name]) return []
  const copy = slotCopy(section)
  const knobs = (section.props.recipeKnobs ?? {}) as RecipeKnobs
  const group = GROUPS.find((g) => g.includes(name)) ?? [name]
  const out: { label: string; node: Node }[] = []
  for (const other of group) if (other !== name) out.push({ label: RECIPES[other].label, node: buildRecipe(other, copy, knobs, theme) })
  const flip = { ...knobs, side: knobs.side === 'left' ? 'right' : 'left' } as RecipeKnobs
  if (/side/.test(RECIPES[name].knobs)) out.push({ label: 'Mirrored', node: buildRecipe(name, copy, flip, theme) })
  const tones: RecipeKnobs['tone'][] = ['light', 'tint', 'dark']
  for (const tone of tones) if (tone !== (knobs.tone ?? 'light') && /tone/.test(RECIPES[name].knobs)) out.push({ label: tone === 'dark' ? 'Dark' : tone === 'tint' ? 'Tinted' : 'Light', node: buildRecipe(name, copy, { ...knobs, tone }, theme) })
  return out.slice(0, 6)
}

/** Build a recipe by name (unknown names fall back to the split hero). */
export function buildRecipe(name: string, copy: RecipeCopy, knobs: RecipeKnobs = {}, theme?: Pick<Theme, 'radius'>): Node {
  const key = RECIPES[name] ? name : 'hero-split'
  const n = RECIPES[key].build(copy, knobs)
  // the look's corners: a square brand gets square photos and cards, a soft one softer (round things stay round)
  if (theme && typeof theme.radius === 'number') {
    const k = Math.min(theme.radius, 24) / 10
    const fit = (r: number) => (r >= 200 ? r : Math.max(0, Math.min(40, Math.round(r * k))))
    walkNodes(n, (x) => {
      if (x.type !== 'image' && x.type !== 'contentbox') return
      const d = x.style.desktop
      if (typeof d.radius === 'number') d.radius = fit(d.radius)
      if (d.radii) d.radii = d.radii.map(fit) as typeof d.radii
    })
  }
  // a boxed closing call on a page whose surface is the page colour: the box takes a tint, or it would not show
  const full = theme as Theme | undefined
  let box: Node | undefined
  if (key === 'close-cta' && knobs.shape === 'rounded') walkNodes(n, (x) => void (!box && x.type === 'contentbox' && (box = x)))
  if (box && box.style.desktop.background === 'surface' && full?.surface && full.bg && full.surface.toLowerCase() === full.bg.toLowerCase()) box.style.desktop.background = TINT
  // a colour of its own: the section is painted with it, and its text goes light or dark to stay readable
  if (knobs.bg && /^#[0-9a-f]{6}$/i.test(knobs.bg) && !n.style.desktop.backgroundImage) {
    // a boxed closing call: the colour goes on the box, the section keeps the page background
    ;(box ?? n).style.desktop.background = knobs.bg
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(knobs.bg!.slice(i, i + 2), 16) / 255)
    n.props.tone = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45 ? 'dark' : 'light'
  }
  // the buttons in another colour than the accent (a white button on a dark bar, as many brands do)
  if (knobs.button && knobs.button !== 'primary') {
    const ink = (theme as Theme | undefined)?.ink ?? '#171717'
    walkNodes(n, (x) => {
      // (a menu item shown as a button takes the same colours, through the menu's button settings)
      if (x.type === 'menu' && x.props.menu?.some((i) => i.button)) {
        x.style.desktop.buttonBackground = knobs.button === 'white' ? '#FFFFFF' : ink
        x.style.desktop.buttonColor = knobs.button === 'white' ? ink : '#FFFFFF'
      }
      if (x.type !== 'button') return
      x.style.desktop.background = knobs.button === 'white' ? '#FFFFFF' : ink
      x.style.desktop.color = knobs.button === 'white' ? ink : '#FFFFFF'
    })
  }
  // phones and tablets read it comfortably (the responsive check's own rules), unless the recipe chose its own sizes:
  // body text at most 18px on a phone, headlines at most 40px on a phone and 68px on a tablet
  walkNodes(n, (x) => {
    const d = x.style.desktop
    if ((x.type === 'text' || x.type === 'list') && typeof d.fontSize === 'number' && d.fontSize > 18) x.style.mobile = { fontSize: Math.max(16, Math.min(18, Math.round(d.fontSize * 0.85))), ...x.style.mobile }
    if (x.type === 'headline' && typeof d.fontSize === 'number') {
      if (d.fontSize > 68 && x.style.tablet?.fontSize === undefined) x.style.tablet = { ...x.style.tablet, fontSize: Math.min(68, Math.round(d.fontSize * 0.78)) }
      const m = x.style.mobile?.fontSize
      if (m !== undefined && m > 40) x.style.mobile = { ...x.style.mobile, fontSize: 40 }
      else if (m === undefined && d.fontSize > 40) x.style.mobile = { ...x.style.mobile, fontSize: Math.max(28, Math.min(40, Math.round(d.fontSize * 0.6))) }
    }
  })
  n.props.recipe = key
  // kept so the section can change layout later without losing its words and photos
  n.props.recipeCopy = copy as unknown as Record<string, unknown>
  n.props.recipeKnobs = knobs as unknown as Record<string, unknown>
  tagSlots(n, copy)
  return n
}

/** The recipes as the AI reads them. */
export function recipeGuide() {
  return recipeCatalogue()
}
