import type { FaqItem, Node, NodeType, Props, SectionTone, Style } from './types'

let seq = 0
export const uid = (p = 'n') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function el(type: NodeType, props: Props = {}, style: Style = {}, children?: Node[]): Node {
  return { id: uid(type.slice(0, 2)), type, props, style: { desktop: style }, ...(children ? { children } : {}) }
}

export function cloneFresh(n: Node): Node {
  return {
    ...structuredClone(n),
    id: uid(n.type.slice(0, 2)),
    children: n.children?.map(cloneFresh),
  }
}

/* ---------------- Elements (the library) ---------------- */

export const ELEMENT_DEFAULTS: Partial<Record<NodeType, () => Node>> = {
  headline: () => el('headline', { text: 'A clear headline that says what you offer', level: 2 }, { fontSize: 40 }),
  text: () =>
    el('text', { text: 'Write one or two sentences that explain who this is for and what changes for them.' }, { fontSize: 18 }),
  eyebrow: () => el('eyebrow', { text: 'New' }),
  button: () => el('button', { text: 'Get started', href: '#', variant: 'primary' }, { fontSize: 16, paddingY: 14, paddingX: 26 }),
  list: () => el('list', { items: ['First benefit', 'Second benefit', 'Third benefit'], icon: 'check' }, { fontSize: 17, gap: 10 }),
  image: () => el('image', { src: img('workspace', 1200, 800), alt: 'Image', aspect: 1.5 }, { radius: 12, width: 100 }),
  video: () => el('video', { src: 'https://www.youtube.com/embed/aqz-KE-bpKQ', aspect: 16 / 9 }, { radius: 12 }),
  // like V1, a new form comes with its fields, a consent checkbox and the submit button (nothing below it)
  form: () => {
    const f = el(
      'form',
      {
        fields: [
          { type: 'first_name', label: 'First name' },
          { type: 'email', label: 'Email address' },
        ],
        buttonText: 'Send it to me',
      },
      { gap: 10, fontSize: 16, paddingY: 10, paddingX: 10 },
    )
    f.children = formChildren(f)
    const col = f.children[0].children!
    col.splice(
      col.findIndex((c) => c.type === 'button'),
      0,
      el('checkbox', { text: 'Yes, I agree to receive emails from you', optional: false, message: '' }, {}),
    )
    for (const k of ['fields', 'buttonText'] as const) delete f.props[k]
    return f
  },
  faq: () =>
    // like V1: questions to rename, answers empty for you to drag elements into
    faqOf([
      { q: 'How does it work?', a: '' },
      { q: 'Can I cancel any time?', a: '' },
    ]),
  countdown: () => el('countdown', { endsAt: Math.ceil((Date.now() + 1000 * 60 * 60 * 54) / 3600000) * 3600000 }, { fontSize: 40 }),
  divider: () => el('divider', {}, { paddingY: 8 }),
  quote: () =>
    el('quote', {
      text: 'I had my first 40 sign-ups in a week. The page took me an afternoon.',
      author: 'Lena Moreau',
      role: 'Yoga teacher',
    }),
  stat: () => el('stat', { value: '12,400+', label: 'Students enrolled' }),
  spacer: () => el('spacer', {}, { height: 48 }),
}

export const img = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`

/* ---------------- Layout helpers ---------------- */

export function section(kind: string, tone: SectionTone, rows: Node[], style: Style = {}): Node {
  return el('section', { kind, tone }, { paddingY: 96, paddingX: 32, maxWidth: 1120, ...style }, rows)
}
export function row(cols: Node[][], props: Props = {}, style: Style = {}, colStyle: Style = {}): Node {
  return el(
    'row',
    { minCol: 280, ...props },
    { gap: 48, vAlign: 'center', ...style },
    cols.map((c) => el('column', {}, { gap: 20, ...colStyle }, c)),
  )
}
export function stack(children: Node[], style: Style = {}, props: Props = {}): Node {
  return el('row', { minCol: 200, ...props }, { gap: 0 }, [el('column', {}, { gap: 20, ...style }, children)])
}

/* ---------------- Copy that feeds every block ---------------- */

export interface Copy {
  brand: string
  eyebrow: string
  headline: string
  sub: string
  cta: string
  ctaNote: string
  heroImage: string
  bullets: string[]
  features: { t: string; d: string }[]
  steps: { t: string; d: string }[]
  testimonials: { q: string; a: string; r: string }[]
  stats: { v: string; l: string }[]
  plans: { name: string; price: string; period: string; features: string[]; cta: string; featured?: boolean }[]
  faqs: { q: string; a: string }[]
  about: { t: string; d: string; img: string }
  ctaHeadline: string
  ctaSub: string
  logos: string[]
}

/* ---------------- Section templates ---------------- */

export type SectionKind =
  | 'header'
  | 'hero'
  | 'logos'
  | 'features'
  | 'steps'
  | 'about'
  | 'testimonials'
  | 'stats'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'countdown'
  | 'video'
  | 'footer'

export const SECTION_LABEL: Record<SectionKind, string> = {
  header: 'Header',
  hero: 'Hero',
  logos: 'Logos',
  features: 'Benefits',
  steps: 'How it works',
  about: 'About',
  testimonials: 'Testimonials',
  stats: 'Numbers',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Sign-up',
  countdown: 'Offer timer',
  video: 'Video',
  footer: 'Footer',
}

/** Number of layout variants each section kind supports. */
export const VARIANTS: Partial<Record<SectionKind, string[]>> = {
  hero: ['Centered', 'Split, image right', 'Split, sign-up form'],
  features: ['Three cards', 'Checklist with image', 'Two by two'],
  testimonials: ['Three quotes', 'One large quote', 'Quotes with numbers'],
  cta: ['Form card', 'Centered band', 'Split with list'],
  pricing: ['Side by side', 'Single offer'],
  about: ['Image left', 'Image right'],
}

const H = (text: string, level: 1 | 2 | 3, size: number, extra: Style = {}) => el('headline', { text, level }, { fontSize: size, ...extra })
const P = (text: string, size = 18, extra: Style = {}) => el('text', { text }, { fontSize: size, color: 'muted', ...extra })
const BTN = (text: string, variant: Props['variant'] = 'primary', extra: Style = {}) =>
  el('button', { text, href: '#', variant }, { fontSize: 16, paddingY: 15, paddingX: 28, ...extra })

export interface SectionHeading {
  eyebrow?: string
  headline?: string
  sub?: string
}

function headerBtn(text: string) {
  const b = BTN(text, 'secondary', { fontSize: 14, paddingY: 10, paddingX: 18, textAlign: 'right' })
  b.style.mobile = { fullWidth: false, fontSize: 14, paddingY: 12, paddingX: 14 }
  return b
}

export function buildSection(kind: SectionKind, c: Copy, variant = 0, h: SectionHeading = {}): Node {
  switch (kind) {
    case 'header':
      return section(
        'header',
        'light',
        [
          row(
            [
              [el('headline', { text: c.brand, level: 3 }, { fontSize: 20 })],
              [headerBtn(c.cta)],
            ],
            { minCol: 120 },
            { gap: 16 },
          ),
        ],
        { paddingY: 20, maxWidth: 1180 },
      )

    case 'hero': {
      if (variant === 1 || variant === 2) {
        const right =
          variant === 1
            ? [el('image', { src: c.heroImage, alt: c.headline, aspect: 1.1 }, { radius: 16, width: 100 })]
            : [
                el(
                  'form',
                  {
                    fields: [
                      { type: 'first_name', label: 'First name' },
                      { type: 'email', label: 'Email address' },
                    ],
                    buttonText: c.cta,
                    note: c.ctaNote,
                  },
                  { gap: 10, fontSize: 16, paddingY: 28, paddingX: 28, background: 'surface', radius: 16 },
                ),
              ]
        return section('hero', 'light', [
          row(
            [
              [
                el('eyebrow', { text: c.eyebrow }),
                H(c.headline, 1, 56),
                P(c.sub, 19),
                ...(variant === 1 ? [BTN(c.cta)] : [el('list', { items: c.bullets.slice(0, 3), icon: 'check' }, { fontSize: 17, gap: 10 })]),
              ],
              right,
            ],
            { minCol: 320 },
            { gap: 64 },
          ),
        ], { paddingY: 104 })
      }
      return section(
        'hero',
        'light',
        [
          stack(
            [
              el('eyebrow', { text: c.eyebrow }, { textAlign: 'center' }),
              H(c.headline, 1, 64, { textAlign: 'center' }),
              P(c.sub, 20, { textAlign: 'center' }),
              BTN(c.cta, 'primary', { textAlign: 'center' }),
              ...(c.ctaNote ? [el('text', { text: c.ctaNote }, { fontSize: 14, color: 'muted', textAlign: 'center' })] : []),
            ],
            { textAlign: 'center' },
          ),
          el('image', { src: c.heroImage, alt: c.headline, aspect: 2.1 }, { radius: 20, width: 100 }),
        ],
        { paddingY: 112, maxWidth: 1040, gap: 56 },
      )
    }

    case 'logos':
      return section(
        'logos',
        'light',
        [
          el('text', { text: 'Trusted by people from' }, { fontSize: 14, color: 'muted', textAlign: 'center' }),
          el('logos', { items: c.logos }),
        ],
        { paddingY: 40, gap: 20 },
      )

    case 'features': {
      if (variant === 1) {
        return section('features', 'light', [
          row(
            [
              [el('image', { src: c.about.img, alt: '', aspect: 1 }, { radius: 16, width: 100 })],
              [
                el('eyebrow', { text: h.eyebrow ?? 'What you get' }),
                H(h.headline ?? 'Everything you need, nothing you don’t', 2, 40),
                ...(h.sub ? [P(h.sub, 18)] : []),
                el('list', { items: c.features.map((f) => `${f.t}. ${f.d}`), icon: 'check' }, { fontSize: 17, gap: 14 }),
              ],
            ],
            { minCol: 320 },
            { gap: 64 },
          ),
        ])
      }
      const cols = variant === 2 ? c.features.slice(0, 4) : c.features.slice(0, 3)
      return section('features', 'muted', [
        stack(
          [
            el('eyebrow', { text: h.eyebrow ?? 'What you get' }, { textAlign: 'center' }),
            H(h.headline ?? 'Built around the result you want', 2, 44, { textAlign: 'center' }),
            ...(h.sub ? [P(h.sub, 18, { textAlign: 'center' })] : []),
          ],
          { textAlign: 'center' },
        ),
        row(
          cols.map((f, i) => [
            el('stat', { value: String(i + 1).padStart(2, '0'), label: '' }, { fontSize: 15, color: 'primary' }),
            H(f.t, 3, 22),
            P(f.d, 16),
          ]),
          { minCol: variant === 2 ? 300 : 240 },
          { gap: 20, vAlign: 'start' },
          { gap: 12, background: 'bg', paddingY: 28, paddingX: 28, radius: 16 },
        ),
      ], { gap: 48 })
    }

    case 'steps':
      return section('steps', 'light', [
        stack([H(h.headline ?? 'How it works', 2, 44, { textAlign: 'center' }), ...(h.sub ? [P(h.sub, 18, { textAlign: 'center' })] : [])], { textAlign: 'center' }),
        row(
          c.steps.map((s, i) => [
            el('stat', { value: `Step ${i + 1}`, label: '' }, { fontSize: 14, color: 'primary' }),
            H(s.t, 3, 22),
            P(s.d, 16),
          ]),
          { minCol: 220 },
          { gap: 40, vAlign: 'start' },
        ),
      ], { gap: 48 })

    case 'about': {
      const imgCol = [el('image', { src: c.about.img, alt: c.about.t, aspect: 0.85 }, { radius: 16, width: 100 })]
      const textCol = [el('eyebrow', { text: 'About' }), H(c.about.t, 2, 40), P(c.about.d, 18), BTN(c.cta, 'secondary')]
      return section('about', 'light', [row(variant === 1 ? [textCol, imgCol] : [imgCol, textCol], { minCol: 320 }, { gap: 64 })])
    }

    case 'testimonials': {
      if (variant === 1) {
        const t = c.testimonials[0]
        return section('testimonials', 'dark', [
          stack(
            [
              el('quote', { text: t.q, author: t.a, role: t.r, kind: 'large' }, { textAlign: 'center', fontSize: 32 }),
            ],
            { textAlign: 'center' },
          ),
        ], { maxWidth: 880 })
      }
      const quotes = row(
        c.testimonials.slice(0, 3).map((t) => [el('quote', { text: t.q, author: t.a, role: t.r })]),
        { minCol: 260 },
        { gap: 20, vAlign: 'start' },
      )
      return section('testimonials', 'muted', [
        stack([H(h.headline ?? 'What people say', 2, 44, { textAlign: 'center' }), ...(h.sub ? [P(h.sub, 18, { textAlign: 'center' })] : [])], { textAlign: 'center' }),
        ...(variant === 2
          ? [row(c.stats.map((s) => [el('stat', { value: s.v, label: s.l }, { textAlign: 'center' })]), { minCol: 150 }, { gap: 24 })]
          : []),
        quotes,
      ], { gap: 48 })
    }

    case 'stats':
      return section('stats', 'light', [
        row(c.stats.map((s) => [el('stat', { value: s.v, label: s.l }, { textAlign: 'center' })]), { minCol: 150 }, { gap: 24 }),
      ], { paddingY: 64 })

    case 'pricing': {
      const plans = variant === 1 ? [c.plans.find((p) => p.featured) ?? c.plans[0]] : c.plans
      return section('pricing', 'light', [
        stack([H(h.headline ?? 'Simple pricing', 2, 44, { textAlign: 'center' }), P(h.sub ?? 'Start today. Upgrade or cancel whenever you like.', 18, { textAlign: 'center' })], {
          textAlign: 'center',
        }),
        row(
          plans.map((p) => [
            el('price', { name: p.name, price: p.price, period: p.period, features: p.features, buttonText: p.cta, featured: p.featured }),
          ]),
          { minCol: 280 },
          { gap: 20, vAlign: 'start', maxWidth: variant === 1 ? 460 : undefined },
        ),
      ], { gap: 48, maxWidth: variant === 1 ? 560 : 1120 })
    }

    case 'faq':
      return section('faq', 'light', [
        stack([H(h.headline ?? 'Questions, answered', 2, 40, { textAlign: 'center' })], { textAlign: 'center' }),
        faqOf(c.faqs),
      ], { maxWidth: 760, gap: 40 })

    case 'cta': {
      const form = el(
        'form',
        {
          fields: [
            { type: 'first_name', label: 'First name' },
            { type: 'email', label: 'Email address' },
          ],
          buttonText: c.cta,
          note: c.ctaNote,
        },
        { gap: 10, fontSize: 16 },
      )
      if (variant === 1) {
        return section('cta', 'brand', [
          stack([H(c.ctaHeadline, 2, 48, { textAlign: 'center' }), P(c.ctaSub, 19, { textAlign: 'center' }), BTN(c.cta, 'primary', { textAlign: 'center' })], {
            textAlign: 'center',
          }),
        ], { maxWidth: 820 })
      }
      if (variant === 2) {
        return section('cta', 'dark', [
          row(
            [
              [H(c.ctaHeadline, 2, 44), el('list', { items: c.bullets, icon: 'check' }, { fontSize: 17, gap: 10 })],
              [form],
            ],
            { minCol: 320 },
            { gap: 64 },
          ),
        ])
      }
      return section('cta', 'muted', [
        stack(
          [H(c.ctaHeadline, 2, 40, { textAlign: 'center' }), P(c.ctaSub, 18, { textAlign: 'center' }), form],
          { textAlign: 'center', background: 'bg', paddingY: 48, paddingX: 48, radius: 20, maxWidth: 620 },
        ),
      ])
    }

    case 'countdown':
      return section('countdown', 'dark', [
        stack(
          [
            el('text', { text: 'Launch price ends in' }, { fontSize: 15, color: 'muted', textAlign: 'center' }),
            el('countdown', { endsAt: Date.now() + 1000 * 60 * 60 * 54 }, { fontSize: 44, textAlign: 'center' }),
            BTN(c.cta, 'primary', { textAlign: 'center' }),
          ],
          { textAlign: 'center' },
        ),
      ], { paddingY: 72 })

    case 'video':
      return section('video', 'light', [
        stack([H(h.headline ?? 'See it in two minutes', 2, 40, { textAlign: 'center' }), ...(h.sub ? [P(h.sub, 18, { textAlign: 'center' })] : [])], { textAlign: 'center' }),
        el('video', { src: 'https://www.youtube.com/embed/aqz-KE-bpKQ', aspect: 16 / 9 }, { radius: 16 }),
      ], { maxWidth: 900, gap: 32 })

    case 'footer':
      return section(
        'footer',
        'light',
        [
          el('divider', {}, { paddingY: 0 }),
          row(
            [
              [el('text', { text: `© ${new Date().getFullYear()} ${c.brand}` }, { fontSize: 14, color: 'muted' })],
              [el('text', { text: 'Privacy · Terms · Contact' }, { fontSize: 14, color: 'muted', textAlign: 'right' })],
            ],
            { minCol: 160 },
            { gap: 16 },
          ),
        ],
        { paddingY: 32, gap: 24 },
      )
  }
}

export const BLOCK_KINDS: SectionKind[] = [
  'header',
  'hero',
  'logos',
  'features',
  'steps',
  'about',
  'testimonials',
  'stats',
  'pricing',
  'faq',
  'cta',
  'countdown',
  'video',
  'footer',
]


/* ---------------- Forms are made of real elements (like V1) ---------------- */

/**
 * A form holds real Form input, Button and Text elements inside one column, so each one can be selected and edited
 * on the page. Older forms (a list of fields + button settings on the form itself) are turned into that once.
 */
export function formChildren(form: Node): Node[] {
  const p = form.props
  const s = form.style.desktop
  const fs = p.fieldStyle ?? {}
  const bs = p.btnStyle ?? {}
  const pos = p.buttonPosition ?? 'full'
  const keep = (st: Style) => Object.fromEntries(Object.entries(st).filter(([, v]) => v !== undefined)) as Style
  const inputs = (p.fields ?? []).map((f) =>
    el(
      'input',
      { inputType: f.type, placeholder: f.label, ...(f.optional ? { optional: true } : {}) },
      keep({ fontSize: fs.fontSize ?? s.fontSize ?? 16, borderType: 'full', borderWidth: 1, paddingY: 14, paddingX: 16, borderColor: fs.borderColor, background: fs.background, color: fs.color, radius: fs.radius }),
    ),
  )
  const button = el(
    'button',
    { text: p.buttonText ?? 'Submit', action: 'submit', variant: 'primary' },
    keep({ fontSize: bs.fontSize ?? s.fontSize ?? 16, paddingY: 15, paddingX: 24, fullWidth: pos === 'full' || undefined, textAlign: pos === 'full' ? undefined : pos, background: bs.background, color: bs.color, radius: bs.radius }),
  )
  const note = p.note ? [el('text', { text: p.note }, { fontSize: 13, color: 'muted', textAlign: 'center' })] : []
  return [el('column', {}, { gap: s.gap ?? 10 }, [...inputs, button, ...note])]
}

/**
 * A calendar's step-2 fields are real elements in one column (like V1): select, style, move or delete them, or drop
 * anything in. The step titles, the booking chip and the confirm button stay part of the calendar.
 */
export function calendarFields(): Node {
  const f = (inputType: NonNullable<Props['inputType']>, placeholder: string, optional = false) =>
    el('input', { inputType, placeholder, ...(optional ? { optional: true } : {}) }, { borderType: 'full', borderWidth: 1, paddingY: 13, paddingX: 16 })
  // like everywhere else, they sit in a row (one column), never directly in the calendar
  return el('row', { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 }, [
    el('column', {}, { gap: 10 }, [f('first_name', 'First name'), f('last_name', 'Last name'), f('email', 'Email'), f('phone', 'Phone', true)]),
  ])
}

/** One FAQ answer, like V1: a column of any elements (empty = a new answer to drop content into), with its question. */
export function faqAnswer(question: string, content: Node[] = []): Node {
  return el('column', { question }, { gap: 16 }, content)
}

/** Questions with plain answers (AI copy, older pages) as answers made of elements: each answer becomes a Text. */
export function faqAnswers(items: FaqItem[]): Node[] {
  return items.map(({ q, a }) => faqAnswer(q, a ? [el('text', { text: a }, { fontSize: 16, color: 'muted' })] : []))
}

export function faqOf(items: FaqItem[]): Node {
  // soft cards with rounded corners (the corner setting shows the real value)
  return el('faq', {}, { radius: 14 }, faqAnswers(items.length ? items : [{ q: 'New question', a: '' }]))
}

/** An FAQ from before answers held elements (questions and answers listed on it) gets its answers as columns. */
export function upgradeFaq(n: Node) {
  if (n.type !== 'faq' || n.children?.length) return
  n.children = faqAnswers(n.props.faq?.length ? n.props.faq : [{ q: 'New question', a: '' }])
  delete n.props.faq
}

/** One carousel slide: a column that holds elements directly, like V1 (empty = a new slide to drop content into). */
export function carouselSlide(content: Node[] = []): Node {
  return el('column', {}, { gap: 16 }, content)
}

/** A survey's final step (V1): a row with Email, First name and a button, real elements you can edit or swap. */
export function surveyFinal(): Node {
  const f = (inputType: NonNullable<Props['inputType']>, placeholder: string) => el('input', { inputType, placeholder }, { borderType: 'full', borderWidth: 1, paddingY: 13, paddingX: 16 })
  return el('row', { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 }, [
    el('column', {}, { gap: 10 }, [f('email', 'Email'), f('first_name', 'First name'), el('button', { text: 'Send my answers', action: 'submit', variant: 'primary' }, { paddingY: 15, paddingX: 24, fullWidth: true })]),
  ])
}
