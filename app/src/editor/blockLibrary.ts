import { el, img, row, section, stack, type Copy } from './blocks'
import { THEMES, themeVars, toneVars } from './theme'
import type { FormField, MenuItem, Node, Props, Style, Theme } from './types'

/**
 * The Blocks tab, organised like V1: categories, each with ready-made sections.
 * Every block is built from the page's copy and theme, so it lands looking like the page.
 * Names are V1's descriptions, shown under each preview.
 */

export interface BlockDef {
  id: string
  name: string
  make: (c: Copy, t: Theme) => Node
}
export interface BlockCategory {
  id: string
  name: string
  /** used in the toast after inserting ("Added Opt-in form") */
  single: string
  blocks: BlockDef[]
}

/* ---------------- Small builders ---------------- */

type Lvl = 1 | 2 | 3
const H = (text: string, level: Lvl, size: number, extra: Style = {}) => el('headline', { text, level }, { fontSize: size, ...extra })
const P = (text: string, size = 18, extra: Style = {}) => el('text', { text }, { fontSize: size, color: 'muted', ...extra })
const EB = (text: string, extra: Style = {}) => el('eyebrow', { text }, { ...extra })
const BTN = (text: string, variant: Props['variant'] = 'primary', extra: Style = {}) =>
  el('button', { text, href: '#', variant }, { fontSize: 16, paddingY: 15, paddingX: 28, ...extra })
const IMG = (src: string, aspect: number, extra: Style = {}) => el('image', { src, alt: '', aspect }, { radius: 16, width: 100, ...extra })
const ICON = (icon: string, size: number, extra: Style = {}) => el('icon', { icon, action: 'none' }, { iconSize: size, iconColor: 'primary', ...extra })
const TINT = 'color-mix(in srgb, var(--c-primary) 12%, transparent)'
const C = { textAlign: 'center' } as const
const mobile = (n: Node, s: Style) => ((n.style.mobile = { ...n.style.mobile, ...s }), n)

/** Real people for team and testimonial photos. */
const face = (n: number, size = 600) => `https://i.pravatar.cc/${size}?img=${n}`
const FACES = [47, 12, 32, 68, 15, 5]
const avatar = (n: number, size: number, align: Style['textAlign'] = 'center') =>
  el('image', { src: face(n, size * 2), alt: '', aspect: 1 }, { radius: 999, maxWidth: size, textAlign: align })

const field = (type: FormField['type'], label: string): FormField => ({ type, label })
const EMAIL = [field('email', 'Email address')]
const NAME_EMAIL = [field('first_name', 'First name'), field('email', 'Email address')]
function FORM(c: Copy, fields: FormField[], style: Style = {}, props: Props = {}) {
  return el('form', { fields, buttonText: c.cta, note: c.ctaNote, ...props }, { gap: 10, fontSize: 16, ...style })
}

const MENU: MenuItem[] = [
  { label: 'Home', href: '#' },
  { label: 'About', href: '#' },
  { label: 'Pricing', href: '#' },
  { label: 'Contact', href: '#' },
]
const menu = (align: Style['textAlign'], extra: Style = {}) => el('menu', { menu: MENU }, { fontSize: 15, textAlign: align, ...extra })

const SOCIAL = ['facebook', 'instagram', 'linkedin', 'youtube', 'x-twitter']
/** A row of social icons. Centered rows shrink to fit; left-aligned rows keep a fixed track so icons sit together. */
function socials(align: 'left' | 'center') {
  const icons = SOCIAL.map((i) => [
    el('icon', { icon: i, action: 'url', url: '#', newWindow: true }, { iconSize: 18, iconColor: 'ink', background: 'surface', textAlign: 'center' }),
  ])
  const r = row(icons, { minCol: 32 }, { gap: 10, noStack: true, ...(align === 'center' ? { maxWidth: SOCIAL.length * 42 + (SOCIAL.length - 1) * 10 } : { columns: 9 }) }, { gap: 0 })
  if (align === 'left') r.style.tablet = r.style.mobile = { columns: 7 }
  return r
}

/** Placeholder logo: the brand's initials on the primary colour. Users swap it for their own. */
function logo(c: Copy, t: Theme, size = 44, align: Style['textAlign'] = 'left') {
  const initials =
    c.brand
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || 'B'
  const fs = initials.length > 1 ? 30 : 38
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${t.primary}"/><text x="48" y="50" dominant-baseline="central" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" font-size="${fs}" letter-spacing="-1" fill="${t.onPrimary}">${initials.replace(/[<&>"]/g, '')}</text></svg>`
  return el('image', { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), alt: c.brand, aspect: 1 }, { radius: 12, maxWidth: size, textAlign: align })
}
const wordmark = (c: Copy, size = 22, extra: Style = {}) => H(c.brand, 3, size, extra)
const copyright = (c: Copy, extra: Style = {}) => P(`© ${new Date().getFullYear()} ${c.brand}. All rights reserved.`, 14, extra)

const card: Style = { background: 'bg', paddingY: 32, paddingX: 28, radius: 16, shadow: 'soft', gap: 14 }
const photo = (seed: string, w = 1200, h = 900) => img(seed, w, h)
const bgImage = (seed: string, overlay = 'rgba(0,0,0,.5)'): Style => ({ backgroundImage: photo(seed, 1920, 1080), overlay })

function heading(c: { eyebrow?: string; headline: string; sub?: string }, size = 44) {
  return stack([...(c.eyebrow ? [EB(c.eyebrow, C)] : []), H(c.headline, 2, size, C), ...(c.sub ? [P(c.sub, 18, C)] : [])], { ...C, gap: 16, maxWidth: 720 })
}

function threePlans(c: Copy) {
  const [a, b] = c.plans
  return [
    { ...a, featured: false },
    { ...(b ?? a), featured: true },
    { name: 'Premium', price: '€149', period: (b ?? a).period, features: ['Everything in Complete', 'Two 1:1 calls', 'Priority support', 'Early access to new content'], cta: 'Choose Premium', featured: false },
  ]
}

const TEAM = [
  { n: 'Claire Martin', r: 'Founder' },
  { n: 'Hugo Bernard', r: 'Head coach' },
  { n: 'Inès Laurent', r: 'Program lead' },
  { n: 'Tom Garnier', r: 'Client success' },
]

/* ---------------- Categories ---------------- */

const optin: BlockDef[] = [
  {
    id: 'optin-social',
    name: 'Headline, text, form (single input and button), social media buttons',
    make: (c) =>
      section('cta', 'muted', [
        stack([H(c.ctaHeadline, 2, 44, C), P(c.ctaSub, 18, C), FORM(c, EMAIL, { maxWidth: 440 }), socials('center')], { ...C, gap: 20, maxWidth: 560 }),
      ]),
  },
  {
    id: 'optin-form-video',
    name: 'Form on the left, video and bulleted list on the right',
    make: (c) =>
      section('cta', 'muted', [
        row(
          [
            [H(c.ctaHeadline, 2, 32), P(c.ctaSub, 17), FORM(c, NAME_EMAIL)],
            [el('video', { src: 'https://www.youtube.com/embed/aqz-KE-bpKQ', aspect: 16 / 9 }, { radius: 16 }), el('list', { items: c.bullets, icon: 'check' }, { fontSize: 17, gap: 12 })],
          ],
          { minCol: 320 },
          { gap: 56, vAlign: 'start' },
          { gap: 20 },
        ),
      ]),
  },
  {
    id: 'optin-image-social',
    name: 'Image and social media icons on the left, Headline and form on the right',
    make: (c) =>
      section('cta', 'light', [
        row(
          [
            [IMG(c.about.img, 1.05), socials('center')],
            [EB(c.eyebrow), H(c.headline, 2, 40), P(c.sub, 18), FORM(c, NAME_EMAIL)],
          ],
          { minCol: 320 },
          { gap: 64 },
          { gap: 24 },
        ),
      ]),
  },
  {
    id: 'optin-image-simple',
    name: 'Image on the left, simple form on the right',
    make: (c) =>
      section('cta', 'light', [
        row(
          [[IMG(c.heroImage, 1.2)], [H(c.ctaHeadline, 2, 40), FORM(c, EMAIL, {}, { note: '' })]],
          { minCol: 320 },
          { gap: 64 },
          { gap: 24 },
        ),
      ]),
  },
  {
    id: 'optin-bg-single',
    name: 'Headline, text, and single input form on background image',
    make: (c) =>
      section('cta', 'dark', [stack([H(c.headline, 2, 48, C), P(c.sub, 19, C), FORM(c, EMAIL, { maxWidth: 440 })], { ...C, gap: 20, maxWidth: 640 })], {
        ...bgImage('optin-bg-single'),
        paddingY: 128,
      }),
  },
  {
    id: 'optin-bg-horizontal',
    name: 'Headline, text and horizontal form on background image',
    make: (c) =>
      section('cta', 'dark', [stack([H(c.ctaHeadline, 2, 48, C), P(c.ctaSub, 19, C), FORM(c, NAME_EMAIL, {}, { layout: 'inline' })], { ...C, gap: 20, maxWidth: 780 })], {
        ...bgImage('optin-bg-horizontal', 'rgba(0,0,0,.55)'),
        paddingY: 128,
      }),
  },
  {
    id: 'optin-simple',
    name: 'Simple form (title, subtitle, inputs and button)',
    make: (c) =>
      section('cta', 'muted', [
        stack([H(c.ctaHeadline, 2, 34, C), P(c.ctaSub, 17, C), FORM(c, NAME_EMAIL)], { ...C, ...card, paddingY: 44, paddingX: 40, gap: 16, maxWidth: 520 }),
      ]),
  },
  {
    id: 'optin-image-text',
    name: 'Image on the left, form on the right (text, single input, button)',
    make: (c) =>
      section('cta', 'light', [
        row(
          [[IMG(c.about.img, 1.1)], [P(c.sub, 22, { color: 'ink' }), FORM(c, EMAIL)]],
          { minCol: 320 },
          { gap: 64 },
          { gap: 24 },
        ),
      ]),
  },
]

const features: BlockDef[] = [
  {
    id: 'feat-4-images',
    name: 'Four columns of items (Big image, headline and text)',
    make: (c) =>
      section('features', 'light', [
        heading({ eyebrow: 'What you get', headline: 'Everything in one place' }),
        row(
          c.features.slice(0, 4).map((f, i) => [IMG(photo(`feat4-${i}`, 800, 640), 1.25, { radius: 14 }), H(f.t, 3, 20), P(f.d, 16)]),
          { minCol: 200 },
          { gap: 28, vAlign: 'start' },
          { gap: 12 },
        ),
      ], { gap: 56 }),
  },
  {
    id: 'feat-3-images',
    name: 'Three columns of items (big image, headline, text)',
    make: (c) =>
      section('features', 'muted', [
        heading({ headline: 'Built around the result you want', sub: c.sub }),
        row(
          c.features.slice(0, 3).map((f, i) => [IMG(photo(`feat3-${i}`, 900, 640), 1.4, { radius: 16 }), H(f.t, 3, 22), P(f.d, 16)]),
          { minCol: 240 },
          { gap: 32, vAlign: 'start' },
          { gap: 14 },
        ),
      ], { gap: 56 }),
  },
  {
    id: 'feat-2-icons',
    name: 'Two columns with big icons on the left',
    make: (c) => {
      const icons = ['target', 'zap', 'shield-check', 'users']
      const item = (i: number) => {
        const f = c.features[i] ?? c.features[0]
        return el('list', { items: [`${f.t}. ${f.d}`], icon: icons[i] }, { fontSize: 18, iconSize: 56, gap: 0, lineHeight: 1.55 })
      }
      return section('features', 'light', [
        heading({ eyebrow: 'Why it works', headline: 'Four reasons people stay' }),
        row([[item(0), item(2)], [item(1), item(3)]], { minCol: 320 }, { gap: 48, vAlign: 'start' }, { gap: 36 }),
      ], { gap: 56, maxWidth: 1000 })
    },
  },
  {
    id: 'feat-3-icon-button',
    name: 'Three columns of items (icon, headline, text & button)',
    make: (c) => {
      const icons = ['rocket', 'calendar', 'message-circle']
      return section('features', 'muted', [
        heading({ headline: 'Pick where to start' }),
        row(
          c.features.slice(0, 3).map((f, i) => [
            ICON(icons[i], 28, { background: TINT, textAlign: 'left' }),
            H(f.t, 3, 21, { mar: [6, 0, 0, 0] }),
            P(f.d, 16),
            BTN('Learn more', 'secondary', { fontSize: 15, paddingY: 11, paddingX: 18, mar: [6, 0, 0, 0] }),
          ]),
          { minCol: 240 },
          { gap: 20, vAlign: 'start' },
          card,
        ),
      ], { gap: 48 })
    },
  },
  {
    id: 'feat-image-cards',
    name: 'Image on the left, card items on the right (image, title and text)',
    make: (c) =>
      section('features', 'muted', [
        row(
          [
            [IMG(c.about.img, 0.82)],
            [
              EB('What you get'),
              H('Everything you need, nothing you don’t', 2, 38),
              row(
                c.features.slice(0, 2).map((f, i) => [IMG(photo(`featcard-${i}`, 700, 440), 1.6, { radius: 10 }), H(f.t, 3, 18), P(f.d, 15)]),
                { minCol: 200 },
                { gap: 16, vAlign: 'start' },
                { ...card, paddingY: 16, paddingX: 16, gap: 10 },
              ),
            ],
          ],
          { minCol: 320 },
          { gap: 56 },
          { gap: 18 },
        ),
      ]),
  },
  {
    id: 'feat-4-cards',
    name: 'Four card items (icon, title, text, button)',
    make: (c) => {
      const icons = ['lightbulb', 'trending-up', 'heart', 'award']
      return section('features', 'muted', [
        heading({ eyebrow: 'Inside', headline: 'Four parts, one clear plan' }),
        row(
          c.features.slice(0, 4).map((f, i) => [
            ICON(icons[i], 28, { background: TINT }),
            H(f.t, 3, 19, { ...C, mar: [6, 0, 0, 0] }),
            P(f.d, 15, C),
            BTN('Learn more', 'ghost', { ...C, fontSize: 15, paddingY: 8, paddingX: 12, color: 'primary' }),
          ]),
          { minCol: 220 },
          { gap: 20, vAlign: 'start' },
          { ...card, ...C, gap: 10 },
        ),
      ], { gap: 48, maxWidth: 1200 })
    },
  },
  {
    id: 'feat-3-big-icons',
    name: 'Three columns of items (big icon, title, text)',
    make: (c) => {
      const icons = ['clock', 'graduation-cap', 'smile']
      return section('features', 'light', [
        heading({ headline: 'Made for real life' }),
        row(c.features.slice(0, 3).map((f, i) => [ICON(icons[i], 56, C), H(f.t, 3, 22, { ...C, mar: [8, 0, 0, 0] }), P(f.d, 16, C)]), { minCol: 240 }, { gap: 48, vAlign: 'start' }, { ...C, gap: 12 }),
      ], { gap: 56 })
    },
  },
]

const footers: BlockDef[] = [
  {
    id: 'footer-logo-menu',
    name: 'Logo on the left, menu & text on the right',
    make: (c, t) =>
      section('footer', 'light', [
        el('divider', {}, { paddingY: 0 }),
        row([[logo(c, t, 40)], [menu('right'), copyright(c, { textAlign: 'right' })]], { minCol: 200 }, { gap: 24 }, { gap: 8 }),
      ], { paddingY: 40, gap: 32 }),
  },
  {
    id: 'footer-columns',
    name: 'Logo, text in columns, social media icons, menu',
    make: (c, t) =>
      section('footer', 'dark', [
        row(
          [
            [logo(c, t, 44), P(c.sub, 15)],
            [H('Contact', 3, 16), P('hello@' + c.brand.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com<br>Mon to Fri, 9:00 to 18:00', 15)],
            [H('Follow us', 3, 16), socials('left')],
          ],
          { minCol: 220 },
          { gap: 48, vAlign: 'start' },
          { gap: 14 },
        ),
        el('divider', {}, { paddingY: 0 }),
        row([[copyright(c)], [menu('right', { fontSize: 14 })]], { minCol: 200 }, { gap: 16 }),
      ], { paddingY: 64, gap: 40 }),
  },
  {
    id: 'footer-center',
    name: 'Logo, menu and text in the center',
    make: (c, t) =>
      section('footer', 'muted', [stack([logo(c, t, 44, 'center'), menu('center'), copyright(c, C)], { ...C, gap: 20 })], { paddingY: 56 }),
  },
]

const team: BlockDef[] = [
  {
    id: 'team-round',
    name: 'Round images (with name and title)',
    make: () =>
      section('about', 'light', [
        heading({ eyebrow: 'Our team', headline: 'The people behind it' }),
        row(TEAM.map((m, i) => [avatar(FACES[i], 128), H(m.n, 3, 19, { ...C, mar: [8, 0, 0, 0] }), P(m.r, 15, C)]), { minCol: 180 }, { gap: 32, vAlign: 'start' }, { ...C, gap: 4 }),
      ], { gap: 56 }),
  },
  {
    id: 'team-shifted',
    name: 'Title & text on the left, two photos shifted to the center and right',
    make: (c) => {
      const person = (i: number, top: number) => {
        const m = TEAM[i]
        return [mobile(IMG(face(FACES[i]), 0.8, { radius: 18, mar: [top, 0, 0, 0] }), { mar: [0, 0, 0, 0] }), H(m.n, 3, 18), P(m.r, 15)]
      }
      return section('about', 'light', [
        row([[EB('Our team'), H('Small team, real attention', 2, 40), P(c.about.d, 17)], person(0, 0), person(1, 72)], { minCol: 240 }, { gap: 40, vAlign: 'start' }, { gap: 8 }),
      ])
    },
  },
  {
    id: 'team-columns',
    name: 'Headline in the center, subtitle & text in columns',
    make: (c) =>
      section('about', 'muted', [
        heading({ headline: 'Who we are' }),
        row(
          [
            [H('Where we started', 3, 22), P(c.about.d, 17)],
            [H('How we work', 3, 22), P(`Everything at ${c.brand} is built with the people who use it. We keep things short, clear and kind, and we answer every message ourselves.`, 17)],
          ],
          { minCol: 300 },
          { gap: 56, vAlign: 'start' },
          { gap: 12 },
        ),
      ], { gap: 48, maxWidth: 1000 }),
  },
]

const welcome: BlockDef[] = [
  {
    id: 'hero-logo-bg',
    name: 'Logo, headline, text & button on the left (on background image)',
    make: (c, t) =>
      section('hero', 'dark', [row([[logo(c, t, 52), H(c.headline, 1, 56, { mar: [12, 0, 0, 0] }), P(c.sub, 19), BTN(c.cta)]], { minCol: 320 }, { columns: 2 }, { gap: 22 })], {
        ...bgImage('hero-logo-bg', 'rgba(0,0,0,.5)'),
        paddingY: 128,
      }),
  },
  {
    id: 'hero-video',
    name: 'Big headline, text, button and video',
    make: (c) =>
      section('hero', 'light', [
        stack([H(c.headline, 1, 64, C), P(c.sub, 20, C), BTN(c.cta, 'primary', C)], { ...C, gap: 22, maxWidth: 820 }),
        el('video', { src: 'https://www.youtube.com/embed/aqz-KE-bpKQ', aspect: 16 / 9 }, { radius: 20 }),
      ], { paddingY: 104, maxWidth: 960, gap: 48 }),
  },
  {
    id: 'hero-card-bg',
    name: 'Card item (title, text and button) on background image',
    make: (c) =>
      section('hero', 'light', [stack([EB(c.eyebrow, C), H(c.headline, 1, 44, C), P(c.sub, 18, C), BTN(c.cta, 'primary', C)], { ...C, ...card, shadow: 'lg', paddingY: 48, paddingX: 44, gap: 16, maxWidth: 600 })], {
        ...bgImage('hero-card-bg', 'rgba(0,0,0,.2)'),
        paddingY: 140,
      }),
  },
  {
    id: 'hero-two-images',
    name: 'Two images, headline, text and button',
    make: (c) => {
      const second = mobile(IMG(photo('hero2-b', 800, 1000), 0.78, { mar: [56, 0, 0, 0] }), { mar: [0, 0, 0, 0] })
      return section('hero', 'light', [
        row(
          [
            [EB(c.eyebrow), H(c.headline, 1, 52), P(c.sub, 19), BTN(c.cta)],
            [row([[IMG(photo('hero2-a', 800, 1000), 0.78)], [second]], { minCol: 120 }, { gap: 16, vAlign: 'start', noStack: true })],
          ],
          { minCol: 320 },
          { gap: 64 },
          { gap: 22 },
        ),
      ], { paddingY: 104 })
    },
  },
  {
    id: 'hero-big-bg',
    name: 'Big headline, text and button on background image',
    make: (c) =>
      section('hero', 'dark', [stack([H(c.headline, 1, 72, C), P(c.sub, 21, C), BTN(c.cta, 'primary', { ...C, fontSize: 17, paddingY: 17, paddingX: 32 })], { ...C, gap: 24, maxWidth: 880 })], {
        ...bgImage('hero-big-bg', 'rgba(0,0,0,.52)'),
        paddingY: 168,
      }),
  },
  {
    id: 'hero-center',
    name: 'Hero in the center (headline, description, button)',
    make: (c) =>
      section('hero', 'light', [
        stack([EB(c.eyebrow, C), H(c.headline, 1, 64, C), P(c.sub, 20, C), BTN(c.cta, 'primary', C), P(c.ctaNote, 14, C)], { ...C, gap: 20, maxWidth: 820 }),
      ], { paddingY: 128 }),
  },
]

const pricing: BlockDef[] = [
  {
    id: 'price-three',
    name: 'Three card items, highlighted middle card',
    make: (c) =>
      section('pricing', 'light', [
        heading({ headline: 'Choose your plan', sub: 'Start today. Upgrade or cancel whenever you like.' }),
        row(threePlans(c).map((p) => [el('price', { name: p.name, price: p.price, period: p.period, features: p.features, buttonText: p.cta, featured: p.featured })]), { minCol: 260 }, { gap: 20, vAlign: 'center' }),
      ], { gap: 56, maxWidth: 1120 }),
  },
  {
    id: 'price-card-left',
    name: 'Price card on the left, big title and text on the right',
    make: (c) => {
      const p = c.plans.find((x) => x.featured) ?? c.plans[0]
      return section('pricing', 'muted', [
        row(
          [
            [el('price', { name: p.name, price: p.price, period: p.period, features: p.features, buttonText: p.cta, featured: true })],
            [EB('One simple price'), H('Everything included, nothing to add later', 2, 48), P(c.sub, 18), el('list', { items: ['Instant access after payment', 'Every future update included', '30-day money-back guarantee'], icon: 'check' }, { fontSize: 17, gap: 10 })],
          ],
          { minCol: 320 },
          { gap: 64 },
          { gap: 20 },
        ),
      ], { maxWidth: 1040 })
    },
  },
  {
    id: 'price-two-columns',
    name: 'Two column plans (name, price, details and button)',
    make: (c) => {
      const plans = c.plans.slice(0, 2)
      return section('pricing', 'light', [
        heading({ headline: 'Two ways to join' }),
        row(
          plans.map((p) => [
            H(p.name, 3, 20),
            H(p.price, 2, 52, { lineHeight: 1 }),
            P(p.period, 15),
            el('divider', {}, { paddingY: 6 }),
            el('list', { items: p.features, icon: 'check' }, { fontSize: 16, gap: 10 }),
            BTN(p.cta, p.featured ? 'primary' : 'secondary', { fullWidth: true, mar: [8, 0, 0, 0] }),
          ]),
          { minCol: 280 },
          { gap: 24, vAlign: 'start', maxWidth: 840 },
          { ...card, background: 'surface', shadow: 'none', borderType: 'full', paddingY: 36, paddingX: 32, gap: 8 },
        ),
      ], { gap: 48 })
    },
  },
  {
    id: 'price-list',
    name: 'List of cards (price on the left, description on the right)',
    make: (c) =>
      section('pricing', 'muted', [
        heading({ headline: 'Plans and prices' }),
        ...threePlans(c).map((p) =>
          row(
            [
              [H(p.price, 2, 44, { lineHeight: 1 }), P(p.period, 15)],
              [H(p.name, 3, 20), P(p.features.join(' · '), 16), BTN(p.cta, p.featured ? 'primary' : 'secondary', { fontSize: 15, paddingY: 11, paddingX: 20, mar: [6, 0, 0, 0] })],
            ],
            { minCol: 200 },
            { gap: 32, background: 'bg', paddingY: 28, paddingX: 32, radius: 16, shadow: 'soft', vAlign: 'center' },
            { gap: 8 },
          ),
        ),
      ], { gap: 16, maxWidth: 820 }),
  },
]

const headers: BlockDef[] = [
  {
    id: 'header-name-menu',
    name: 'Company name on the left, menu on the right',
    make: (c) =>
      section('header', 'light', [row([[wordmark(c)], [menu('right')]], { minCol: 120 }, { gap: 16, noStack: true })], { paddingY: 22, maxWidth: 1180 }),
  },
  {
    id: 'header-logo-menu',
    name: 'Logo on the left, menu on the right',
    make: (c, t) =>
      section('header', 'light', [row([[logo(c, t, 40)], [menu('right')]], { minCol: 120 }, { gap: 16, noStack: true })], { paddingY: 18, maxWidth: 1180 }),
  },
]

const testimonials: BlockDef[] = [
  {
    id: 'testi-cards-round',
    name: 'Card items with round images',
    make: (c) =>
      section('testimonials', 'muted', [
        heading({ headline: 'What people say' }),
        row(
          c.testimonials.slice(0, 3).map((t, i) => [avatar(FACES[i + 2], 72), P(`“${t.q}”`, 17, { ...C, color: 'ink', mar: [6, 0, 0, 0] }), H(t.a, 3, 16, { ...C, mar: [4, 0, 0, 0] }), P(t.r, 14, C)]),
          { minCol: 260 },
          { gap: 20, vAlign: 'start' },
          { ...card, ...C, paddingY: 36, gap: 10 },
        ),
      ], { gap: 48 }),
  },
  {
    id: 'testi-short',
    name: 'Short testimonials with round images',
    make: (c) =>
      section('testimonials', 'light', [
        heading({ headline: 'Loved by people like you' }),
        row(
          c.testimonials.slice(0, 3).map((t, i) => [avatar(FACES[i], 64), P(`“${t.q.split(/(?<=[.!?])\s/)[0]}”`, 18, { ...C, color: 'ink' }), P(`${t.a} · ${t.r}`, 14, C)]),
          { minCol: 240 },
          { gap: 40, vAlign: 'start' },
          { ...C, gap: 14 },
        ),
      ], { gap: 56 }),
  },
  {
    id: 'testi-quote',
    name: 'Quote icon, text, client info (image, name and title)',
    make: (c) => {
      const t = c.testimonials[0]
      return section('testimonials', 'light', [
        stack(
          [
            H('“', 2, 96, { ...C, color: 'primary', lineHeight: 0.6, mar: [24, 0, 0, 0] }),
            H(t.q, 2, 30, { ...C, fontWeight: 500, lineHeight: 1.35 }),
            avatar(FACES[3], 64),
            H(t.a, 3, 17, { ...C, mar: [-8, 0, 0, 0] }),
            P(t.r, 15, { ...C, mar: [-14, 0, 0, 0] }),
          ],
          { ...C, gap: 22, maxWidth: 820 },
        ),
      ], { paddingY: 104 })
    },
  },
  {
    id: 'testi-cards-bottom',
    name: 'Card items with round image at the bottom',
    make: (c) =>
      section('testimonials', 'muted', [
        heading({ headline: 'Results that speak' }),
        row(
          c.testimonials.slice(0, 3).map((t, i) => [el('quote', { text: t.q, author: t.a, role: t.r, src: face(FACES[(i + 3) % FACES.length], 96) })]),
          { minCol: 260 },
          { gap: 20, vAlign: 'start' },
        ),
      ], { gap: 48 }),
  },
]

/* ---------------- A block's own colours ---------------- */

/** Like V1, a block brings its own design: these colours (systeme.io's Clean palette), whatever the page's settings are. */
const BLOCK_COLORS: Pick<Theme, 'primary' | 'onPrimary' | 'ink' | 'muted' | 'bg' | 'surface' | 'line' | 'dark'> = (({ primary, onPrimary, ink, muted, bg, surface, line, dark }) => ({ primary, onPrimary, ink, muted, bg, surface, line, dark }))(THEMES[0])
const PALETTE_KEYS = ['--c-bg', '--c-ink', '--c-muted', '--c-primary', '--c-on-primary', '--c-surface', '--c-line']

/**
 * Writes the block's colours into it: each section gets a real background colour and its colour set,
 * so it lands exactly as designed and the page's settings don't overwrite it. Set the section's
 * Background color to No colour and the block follows the page again.
 */
/** The colour each element shows by default, so its settings show the real colour (not None). */
const OWN: Record<string, [keyof Style, string][]> = {
  headline: [['color', '--c-heading']],
  text: [['color', '--c-muted']],
  eyebrow: [['color', '--c-primary']],
  list: [['color', '--c-ink'], ['iconColor', '--c-primary']],
  icon: [['iconColor', '--c-primary']],
  quote: [['color', '--c-ink']],
  stat: [['color', '--c-ink']],
  logos: [['color', '--c-ink']],
  menu: [['color', '--c-ink']],
  divider: [['borderColor', '--c-line']],
}
const COLOR_KEYS: (keyof Style)[] = ['color', 'background', 'iconColor', 'borderColor', 'subtextColor']

function ownColors(n: Node, t: Theme): Node {
  let palette: Record<string, string> = {}
  // a token ("muted", "primary") becomes the block's real colour
  const real = (v: string) => (/^(#|rgb|hsl|var|color-mix)/.test(v) ? v : (palette[`--c-${v}`] ?? v))
  const fill = (st: Style, pairs: [keyof Style, string][]) => {
    for (const k of COLOR_KEYS) if (typeof st[k] === 'string') (st as Record<string, unknown>)[k] = real(st[k] as string)
    for (const [k, v] of pairs) if (st[k] === undefined && palette[v]) (st as Record<string, unknown>)[k] = palette[v]
  }
  const walk = (x: Node) => {
    if (x.type !== 'section' && x.type !== 'row' && x.type !== 'column') {
      // its own copy: builders share style objects (like the centred one), colours must never leak between elements
      const st = (x.style.desktop = { ...x.style.desktop })
      if (x.type === 'button') fill(st, x.props.variant === 'primary' || !x.props.variant ? [['background', '--c-primary'], ['color', '--c-on-primary']] : [['color', '--c-ink']])
      else fill(st, OWN[x.type] ?? [])
      if (x.type === 'form') {
        x.props.fieldStyle = { ...x.props.fieldStyle }
        fill(x.props.fieldStyle, [['borderColor', '--c-line'], ['background', '--c-bg'], ['color', '--c-ink']])
        x.props.btnStyle = { ...x.props.btnStyle }
        fill(x.props.btnStyle, [['background', '--c-primary'], ['color', '--c-on-primary']])
      }
    }
    if (x.type === 'section') {
      x.style.desktop = { ...x.style.desktop }
      const vars = { ...themeVars(t), ...toneVars(x.props.tone, t) }
      palette = Object.fromEntries(PALETTE_KEYS.filter((k) => vars[k]).map((k) => [k, vars[k]]))
      palette['--c-heading'] = palette['--c-ink']
      const bg = x.style.desktop.background
      // a token background ("surface") becomes the real colour
      x.style.desktop.background = !bg ? palette['--c-bg'] : /^(#|rgb|hsl|var|color-mix)/.test(bg) ? bg : (vars[`--c-${bg}`] ?? bg)
      x.props.palette = palette
      delete x.props.tone
    }
    x.children?.forEach(walk)
  }
  walk(n)
  return n
}
const own = (blocks: BlockDef[]): BlockDef[] => blocks.map((b) => ({ ...b, make: (c, t) => ownColors(b.make(c, { ...t, ...BLOCK_COLORS }), { ...t, ...BLOCK_COLORS }) }))

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { id: 'optin', name: 'Opt-in forms', single: 'Opt-in form', blocks: own(optin) },
  { id: 'features', name: 'Features', single: 'Features', blocks: own(features) },
  { id: 'footers', name: 'Page footers', single: 'Page footer', blocks: own(footers) },
  { id: 'team', name: 'Team presentation', single: 'Team presentation', blocks: own(team) },
  { id: 'welcome', name: 'Welcome', single: 'Welcome section', blocks: own(welcome) },
  { id: 'pricing', name: 'Price plans', single: 'Price plans', blocks: own(pricing) },
  { id: 'headers', name: 'Page headers', single: 'Page header', blocks: own(headers) },
  { id: 'testimonials', name: 'Testimonials', single: 'Testimonials', blocks: own(testimonials) },
]

/** Saved blocks can be any node; at page level they need a section around them. */
export function asSection(n: Node): Node {
  if (n.type === 'section') return n
  if (n.type === 'row') return section('blank', 'light', [n], { paddingY: 40, paddingX: 40 })
  if (n.type === 'column') return section('blank', 'light', [el('row', { minCol: 200 }, { gap: 20, paddingY: 10, paddingX: 10 }, [n])], { paddingY: 40, paddingX: 40 })
  return section('blank', 'light', [stack([n])], { paddingY: 40, paddingX: 40, gap: 24 })
}
