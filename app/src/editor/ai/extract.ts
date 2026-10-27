import { buildSection, VARIANTS, type Copy, type SectionHeading, type SectionKind } from '../blocks'
import { walk } from '../tree'
import type { Node } from '../types'
import { pageCopy } from '../dnd'

const plain = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '')

/** Read the user's current content back out of a section, so a new layout keeps their words. */
export function extractCopy(section: Node): { copy: Copy; heading: SectionHeading } {
  const c = pageCopy()
  const all: Node[] = []
  walk(section.children ?? [], (n) => void all.push(n))
  const of = (t: Node['type']) => all.filter((n) => n.type === t)
  const heads = of('headline')
  const texts = of('text')
  const kind = section.props.kind as SectionKind
  const heading: SectionHeading = {}

  const eyebrow = of('eyebrow')[0]?.props.text
  const btn = of('button')[0]?.props.text ?? of('form')[0]?.props.buttonText
  const list = of('list')[0]?.props.items
  const image = of('image')[0]?.props.src
  const note = of('form')[0]?.props.note
  if (note) c.ctaNote = note

  if (kind === 'hero') {
    if (eyebrow) c.eyebrow = plain(eyebrow)
    if (heads[0]) c.headline = plain(heads[0].props.text)
    if (texts[0]) c.sub = plain(texts[0].props.text)
    if (btn) c.cta = plain(btn)
    if (list) c.bullets = list
    if (image) c.heroImage = image
  } else if (kind === 'cta') {
    if (heads[0]) c.ctaHeadline = plain(heads[0].props.text)
    if (texts[0]) c.ctaSub = plain(texts[0].props.text)
    if (btn) c.cta = plain(btn)
    if (list) c.bullets = list
  } else if (kind === 'about') {
    c.about = { t: plain(heads[0]?.props.text) || c.about.t, d: plain(texts[0]?.props.text) || c.about.d, img: image ?? c.about.img }
  } else {
    if (eyebrow) heading.eyebrow = plain(eyebrow)
    if (heads[0]) heading.headline = plain(heads[0].props.text)
  }

  if (kind === 'features') {
    const cards = heads.slice(1).map((h, i) => ({ t: plain(h.props.text), d: plain(texts[i]?.props.text) }))
    if (cards.length >= 3) c.features = cards
    else if (list?.length) c.features = list.map((l) => {
      const [t, ...d] = plain(l).split('. ')
      return { t, d: d.join('. ') }
    })
    if (image) c.about = { ...c.about, img: image }
  }
  if (kind === 'testimonials') {
    const qs = of('quote').map((q) => ({ q: q.props.text ?? '', a: q.props.author ?? '', r: q.props.role ?? '' }))
    if (qs.length) c.testimonials = [...qs, ...c.testimonials].slice(0, 3)
    const st = of('stat').map((s) => ({ v: s.props.value ?? '', l: s.props.label ?? '' })).filter((s) => s.l)
    if (st.length) c.stats = st
  }
  if (kind === 'pricing') {
    const ps = of('price').map((p) => ({
      name: p.props.name ?? '',
      price: p.props.price ?? '',
      period: p.props.period ?? '',
      features: p.props.features ?? [],
      cta: p.props.buttonText ?? '',
      featured: p.props.featured,
    }))
    if (ps.length) c.plans = ps.length > 1 ? ps : [...ps, ...c.plans.filter((x) => x.name !== ps[0].name)].slice(0, 2)
  }
  if (kind === 'faq') {
    const f = of('faq')[0]
    // each answer's own words: the text elements in it
    const plain = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const answer = (col: Node): string => (col.children ?? []).flatMap((k) => (k.type === 'text' ? [plain(k.props.text)] : [answer(k)])).filter(Boolean).join(' ')
    if (f?.children?.length) c.faqs = f.children.map((col) => ({ q: col.props.question ?? '', a: answer(col) }))
    else if (f?.props.faq) c.faqs = f.props.faq
  }
  return { copy: c, heading }
}

export function variationsFor(section: Node): { label: string; node: Node }[] {
  const kind = section.props.kind as SectionKind
  const labels = VARIANTS[kind]
  if (!labels) return []
  const { copy, heading } = extractCopy(section)
  return labels.map((label, i) => {
    const node = buildSection(kind, copy, i, heading)
    node.id = `${section.id}-v${i}`
    return { label, node }
  })
}
