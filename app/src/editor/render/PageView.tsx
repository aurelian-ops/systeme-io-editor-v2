import { useFaqOpen } from '../faqOpen'
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { contentWidth, fitColumns, resolveStyle } from '../responsive'
import { contrast, cssColor, isDarkColor, luminance, readableVars, rgbOf, themeVars, toneVars } from '../theme'
import { DEVICE_LABEL, type Device, type Node, type PageDoc, type Style } from '../types'
import { setProps, setState, useEditor as useEditorStore } from '../store'
import { sanitize } from './sanitize'
import { elementDomId } from './domIds'
import { background, border, box, font, lineHeight, margin, padding, radius, shadow, softRadius } from './css'
import { ensureIcons, ICONS, iconsVersion, subscribeIcons } from '../icons'
import { ensureFont } from '../fonts'
import { labelOf } from '../store'
import { REGISTRY } from '../elements'
import { contains, path } from '../tree'
import { dragBridge } from '../dragBridge'
import { cx } from '../../ui/kit'
import { motionAttrs, useMotion } from './motion'
import { SquareDashedMousePointer } from 'lucide-react'

export interface RenderCtxValue {
  doc: PageDoc
  device: Device
  editable: boolean
  editingId: string | null
  building: string[]
  /** the element being typed in and its ancestors: not draggable, so text selection works */
  lockedIds: Set<string>
}
const RenderCtx = createContext<RenderCtxValue | null>(null)
const ColsCtx = createContext<number>(1200)
/** The row's own alignment, used by its columns that have none of their own (like V1: set on the row or per column). */
const RowAlignCtx = createContext<Style['vAlign']>(undefined)
/** Inside a form: its fields are not dragged on the page (like V1, they are reordered from the form's settings). */
const InFormCtx = createContext(false)
/** a column of a row set to Stretch, holding one thing: that thing fills the column's height (cards line up) */
const FillCtx = createContext(false)
const FILLERS = new Set(['contentbox', 'row', 'quote', 'price'])
/** The colour variables in force here (the section's, then a card's), so a card can keep its own text readable. */
const ToneCtx = createContext<Record<string, string> | null>(null)
export const useRender = () => useContext(RenderCtx)!

/** Section content widths, named as in V1. */
export const CONTENT_WIDTHS = [
  { value: 100000, label: 'Full page' },
  { value: 1200, label: 'Wide' },
  { value: 960, label: 'Medium' },
  { value: 760, label: 'Small' },
  { value: 560, label: 'Extra small' },
]

const NONE: string[] = []

/**
 * Memoised, with a stable context value: hovering the canvas re-renders the overlay only,
 * never the whole page (that is what made pointing at elements on big pages feel sticky).
 */
export const PageView = memo(function PageView({
  doc,
  device,
  editable = false,
  editingId = null,
  building = NONE,
  only,
}: {
  doc: PageDoc
  device: Device
  editable?: boolean
  editingId?: string | null
  building?: string[]
  only?: Node[]
}) {
  const ps = doc.settings
  useEffect(() => {
    ensureFont(doc.theme.fontHeading)
    ensureFont(doc.theme.fontBody)
  }, [doc.theme.fontHeading, doc.theme.fontBody])
  const vars = {
    ...themeVars(doc.theme),
    // the page's own background colour (Settings → Background) is the background everything sits on
    ...(ps?.background ? { '--c-bg': ps.background } : {}),
    ...(ps?.textColor ? { '--c-ink': ps.textColor } : {}),
    ...(ps?.headingColor ? { '--c-heading': ps.headingColor } : {}),
    ...(ps?.linkColor ? { '--c-link': ps.linkColor } : {}),
  } as CSSProperties
  const blur = ps?.backgroundImage && ps.backgroundBlur ? ps.backgroundBlur : 0
  const pageBg: CSSProperties = ps?.backgroundImage && !blur ? { backgroundImage: `url("${ps.backgroundImage}")`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : {}
  // icons from the full library load on demand; when they arrive the page draws them (a new context re-renders it)
  const iconsV = useSyncExternalStore(subscribeIcons, iconsVersion)
  useEffect(() => {
    const names: (string | undefined)[] = []
    const walk = (n: Node) => {
      names.push(n.props.icon, n.props.iconAfter)
      n.children?.forEach(walk)
    }
    doc.sections.forEach(walk)
    ensureIcons(names)
  }, [doc])
  const ctx = useMemo(
    () => ({ doc, device, editable, editingId, building, lockedIds: new Set(editingId ? path(doc, editingId).map((n) => n.id) : []), iconsV }),
    [doc, device, editable, editingId, building, iconsV],
  )
  const rootRef = useRef<HTMLDivElement>(null)
  // Arabic, Hebrew, Persian or Urdu pages read right to left (from the page language, or its headlines' script)
  const rtl = useMemo(() => {
    if (/^(ar|he|fa|ur)\b/i.test(ps?.language ?? '')) return true
    let text = ''
    const walk = (n: Node) => {
      if (text.length > 400) return
      if ((n.type === 'headline' || n.type === 'text') && typeof n.props.text === 'string') text += n.props.text.replace(/<[^>]+>/g, '')
      n.children?.forEach(walk)
    }
    doc.sections.forEach(walk)
    const rtlChars = (text.match(/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g) ?? []).length
    const letters = (text.match(/\p{L}/gu) ?? []).length
    return letters > 20 && rtlChars / letters > 0.5
  }, [doc.sections, ps?.language])
  useMotion(rootRef, !editable && doc.settings?.animations !== false, doc)
  return (
    <RenderCtx.Provider value={ctx}>
      <div
        ref={rootRef}
        className="page-root"
        style={{ ...vars, ...pageBg, position: 'relative', isolation: 'isolate', background: ps?.background ?? (pageBg.backgroundImage || blur ? undefined : 'var(--c-bg)'), fontSize: ps?.fontSize, textAlign: ps?.align }}
        data-device={device}
        lang={ps?.language}
        dir={rtl ? 'rtl' : undefined}
      >
        {blur ? (
          <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: -blur * 2, backgroundImage: `url("${ps!.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: `blur(${blur}px)` }} />
          </div>
        ) : null}
        {(only ?? doc.sections).map((s) => (
          <NodeView key={s.id} node={s} />
        ))}
      </div>
    </RenderCtx.Provider>
  )
})

export const NodeView = memo(function NodeView({ node }: { node: Node }) {
  const ctx = useContext(RenderCtx)!
  const avail = useContext(ColsCtx)
  const rowAlign = useContext(RowAlignCtx)
  const inForm = useContext(InFormCtx)
  const fill = useContext(FillCtx) && FILLERS.has(node.type)
  const smart = ctx.doc.smartResponsive
  let cols: number | undefined
  if (node.type === 'row') {
    const n = node.children?.length ?? 1
    const gap = node.style.desktop.gap ?? 20
    const pre = resolveStyle(node, ctx.device, smart).style
    if (ctx.device === 'desktop' || pre.noStack) cols = ctx.device === 'desktop' ? undefined : n
    else if (smart) cols = fitColumns(n, avail, node.props.minCol ?? 280, ctx.device === 'mobile' ? Math.min(gap, 24) : gap * 0.7)
    else cols = ctx.device === 'mobile' ? 1 : n
  }
  const resolved = resolveStyle(node, ctx.device, smart, { cols }).style
  useEffect(() => ensureFont(resolved.fontFamily), [resolved.fontFamily])
  // a card with its own colour inside a section (a light card on a dark band, a dark card on a bright one): its text
  // and buttons switch to colours that read on the card, like a section's do
  const toneHere = useContext(ToneCtx)
  // a text colour that would vanish on the colour behind it (dark on a dark band, light on a light card) is not used:
  // the element takes the readable ink of where it sits instead
  const s = useMemo(() => {
    const here = toneHere?.['--here']
    // a button's label sits on the button's own colour, not on the band's: the colour you set is the colour you get
    if (!resolved.color || !here || node.type === 'section' || node.type === 'button' || node.type === 'paybutton') return resolved
    const value = resolved.color.startsWith('#') || resolved.color.startsWith('rgb') ? resolved.color : toneHere?.[`--c-${resolved.color}`]
    const a = value && rgbOf(value)
    const b = rgbOf(here)
    return a && b && contrast(a, b) < 2.6 ? { ...resolved, color: undefined } : resolved
  }, [resolved, toneHere, node.type])
  const cardVars = useMemo(() => {
    if (!toneHere || node.type === 'section' || !s.background || s.backgroundImage) return null
    const raw = s.background.startsWith('#') || s.background.startsWith('rgb') ? s.background : toneHere[`--c-${s.background}`]
    // a see-through tint (a glass chip on a dark band) takes the colours of what is behind it
    const alpha = raw?.match(/rgba\([^)]*,\s*([0-9.]+)\s*\)/)?.[1]
    if (alpha && Number(alpha) < 0.5) return null
    const out = raw ? readableVars(raw, toneHere) : {}
    // words and icons "on the accent" inside an accent card read on the card's real colour (which may be the ink
    // where the accent would have vanished on the band): never the accent's own label colour on itself
    if (raw && s.background === 'primary') {
      const rgb = rgbOf(raw)
      if (rgb) out['--c-on-primary'] = luminance(rgb) > 0.4 ? (toneHere['--c-ink'] && rgbOf(toneHere['--c-ink']) && luminance(rgbOf(toneHere['--c-ink'])!) < 0.2 ? toneHere['--c-ink'] : '#171717') : '#ffffff'
    }
    return raw && rgbOf(raw) ? { ...out, '--here': raw } : Object.keys(out).length ? out : null
  }, [toneHere, node.type, s.background, s.backgroundImage])
  const hidden = !!s.hidden
  if (hidden && !ctx.editable) return null

  // grab any element (not only its handle) to move it, unless you are typing in it
  const movable = ctx.editable && !ctx.lockedIds.has(node.id) && node.type !== 'column' && !inForm
  const common = {
    // the id shown in its settings (a field's and a button's sit on the field / button itself)
    ...(node.type === 'input' || node.type === 'checkbox' || node.type === 'button' ? {} : { id: elementDomId(node) }),
    'data-node': node.id,
    'data-type': node.type,
    'data-device': ctx.device,
    className: ctx.building.includes(node.id) ? (node.type === 'section' ? 'ai-building ai-arrived' : 'ai-building') : undefined,
    ...(movable
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.stopPropagation()
            dragBridge.start(node.id, e)
          },
          onDragEnd: (e: React.DragEvent) => {
            e.stopPropagation()
            dragBridge.end()
          },
        }
      : {}),
  }
  // how it moves on the live page (an entrance takes over the plain "delay before displaying")
  const motion = ctx.editable || ctx.doc.settings?.animations === false ? null : motionAttrs(node, s.delay)
  const delayed: CSSProperties = motion ? motion.style : !ctx.editable && s.delay ? { animation: `sio-delay 400ms var(--ease-out) ${s.delay}s backwards` } : {}
  if (motion) Object.assign(common, motion.attrs)
  const def = REGISTRY[node.type]
  const body = def
    ? def.render({ node, s, device: ctx.device, doc: ctx.doc, editable: ctx.editable, children: () => node.children?.map((c) => <NodeView key={c.id} node={c} />) })
    : // a card whose colour came from a theme name keeps that exact colour (its own readable variables must not re-colour it)
      renderBody(node, cardVars?.['--here'] && s.background && !s.background.startsWith('#') && !s.background.startsWith('rgb') ? { ...s, background: cardVars['--here'] } : s, ctx, cols, avail, rowAlign)
  if (hidden) {
    // hidden on this device: a small chip in its place (never the element itself, which would cover its neighbours);
    // in a column folded to nothing (a header's button on phones) it folds away too
    return (
      <div {...common} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 13, background: 'rgba(0,0,0,.06)', color: 'rgba(0,0,0,.5)', font: '500 12px/1 Geist, Inter, sans-serif', letterSpacing: 0, maxWidth: '100%', minWidth: 0, overflow: 'hidden' }} title={`Hidden on ${DEVICE_LABEL[ctx.device]}. Select it to show it again.`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.2M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a10.9 10.9 0 0 0 5.4-1.4M3 3l18 18" /></svg>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelOf(node)} hidden</span>
      </div>
    )
  }
  if (node.type === 'section') return renderSection(node, s, ctx, common, motion?.css ? <><style>{motion.css}</style>{body}</> : body, motion?.style)
  const view = (
    <div {...common} style={{ minWidth: 0, width: widthWithMargin(s), margin: margin(s), boxSizing: 'border-box', ...((node.type === 'image' && node.props.aspect === -1) || fill ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}), ...(hangul(node) ? { wordBreak: 'keep-all', overflowWrap: 'break-word' } : {}), ...delayed, ...(cardVars ? { ...cardVars, color: 'var(--c-ink)' } : {}), ...(ctx.editable && node.props.sample ? { position: 'relative' } : {}), ...(s.layer ? { position: 'relative', zIndex: s.layer } : {}) }}>
      {motion?.css && <style>{motion.css}</style>}
      {body}
      {/* editor only: proof the AI made up for the look, to replace with a real one before publishing */}
      {ctx.editable && node.props.sample && (
        <span className="sio-sample" title="The AI wrote this as an example. Replace it with a real one before you publish.">
          Sample
        </span>
      )}
    </div>
  )
  return cardVars ? <ToneCtx.Provider value={{ ...toneHere!, ...cardVars }}>{view}</ToneCtx.Provider> : view
})

/** Korean words are kept whole at line ends (browsers otherwise break between any two syllables). */
function hangul(node: Node) {
  const p = node.props
  const words = [p.text, p.author, p.buttonText, p.placeholder, ...(Array.isArray(p.items) ? p.items.map((x) => (typeof x === 'string' ? x : '')) : [])].filter(Boolean).join(' ')
  return /[가-힯]/.test(words)
}

/** Full width minus side margins, so a margin never pushes an element out of its box. */
function widthWithMargin(s: Style) {
  const l = s.mar ? s.mar[3] : (s.marginX ?? 0)
  const r = s.mar ? s.mar[1] : (s.marginX ?? 0)
  return l || r ? `calc(100% - ${l + r}px)` : '100%'
}

function renderSection(node: Node, s: Style, ctx: RenderCtxValue, common: Record<string, unknown>, body: ReactNode, motionStyle?: CSSProperties) {
  const t = ctx.doc.theme
  const ps = ctx.doc.settings
  const toned: Record<string, string> = {
    ...themeVars(t),
    ...(ps?.background ? { '--c-bg': ps.background } : {}),
    ...(ps?.textColor ? { '--c-ink': ps.textColor } : {}),
    ...toneVars(node.props.tone, t),
  }
  // a block's own colours win over the page's while the section keeps a background colour (No colour = follow the page)
  const palette = node.props.palette && s.background ? node.props.palette : undefined
  if (palette) Object.assign(toned, palette)
  // the colour actually behind this section's content (its own, or the page's: colour, image or theme background)
  // a background photo the AI planned but that is not there yet does not count as one
  if (s.backgroundImage?.startsWith('img:')) s = { ...s, backgroundImage: undefined }
  const bgToken = s.background && !s.backgroundImage ? s.background : undefined
  const pageImage = !ps?.background && !!ps?.backgroundImage
  const bg = bgToken ? (bgToken.startsWith('#') || bgToken.startsWith('rgb') ? bgToken : toned[`--c-${bgToken}`]) : s.backgroundImage || (pageImage && !node.props.tone) ? undefined : toned['--c-bg']
  const tone = {
    ...toneVars(node.props.tone, t),
    ...palette,
    ...readableVars(bg, toned, { ink: !!ps?.textColor || !!palette, heading: !!ps?.headingColor || !!palette }),
  } as CSSProperties
  const width = contentWidth(node, ctx.device, ctx.doc.smartResponsive)
  const sticky: CSSProperties =
    node.props.sticky && !ctx.editable ? { position: 'sticky', [node.props.stickyPosition === 'bottom' ? 'bottom' : 'top']: 0, zIndex: 30 } : {}
  const delayed: CSSProperties = motionStyle ?? (!ctx.editable && s.delay ? { animation: `sio-delay 400ms var(--ease-out) ${s.delay}s backwards` } : {})
  return (
    <section
      {...common}
      style={{
        ...tone,
        ...sticky,
        ...delayed,
        // like V1, a section with no colour of its own is see-through: the page's background shows (a tone paints its own)
        backgroundColor: node.props.tone ? 'var(--c-bg)' : undefined,
        ...background(s),
        ...border(s),
        // rounded corners (a section with side margins reads as a card); its background and image follow them
        borderRadius: radius(s),
        overflow: s.radius || s.radii ? 'hidden' : undefined,
        boxShadow: shadow(s.shadow),
        color: 'var(--c-ink)',
        padding: padding(s, [64, 24]),
        margin: margin(s),
        minHeight: s.minHeight,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: s.maxWidth ?? 1120,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: s.gap ?? 32,
          background: cssColor(s.contentBackground),
          padding: s.contentBackground ? 24 : undefined,
          // the content background follows the section's own corners (same radius), else a soft default
          borderRadius: s.contentBackground ? (radius(s) ?? 'var(--r-card)') : undefined,
        }}
      >
        <ToneCtx.Provider value={{ ...toned, ...(tone as Record<string, string>), ...(bg ?? (s.backgroundImage ? undefined : toned['--c-bg']) ? { '--here': (tone as Record<string, string>)['--c-bg'] ?? bg ?? toned['--c-bg'] } : {}) }}>
          <ColsCtx.Provider value={width}>{body}</ColsCtx.Provider>
        </ToneCtx.Provider>
      </div>
    </section>
  )
}

const gap = (s: Style) => s.gap ?? 20
const colAlign = (v: Style['vAlign']) => (v === 'center' ? 'center' : v === 'end' ? 'flex-end' : 'flex-start')
const colSpace = (avail: number, g: number, cols: number, share: number) => Math.max(0, (avail - g * (cols - 1)) * share)

const radiusOr = (s: Style, theme: string) => radius(s) ?? theme

function renderBody(node: Node, s: Style, ctx: RenderCtxValue, cols?: number, avail = 1200, rowAlign?: Style['vAlign']): ReactNode {
  const p = node.props
  const align = s.textAlign
  const color = cssColor(s.color)
  const pill = ctx.doc.theme.radius >= 999
  switch (node.type) {
    case 'section':
      // like V1: an empty section shows where to drop things instead of collapsing to nothing
      return node.children?.length ? node.children.map((c) => <NodeView key={c.id} node={c} />) : ctx.editable ? <EmptyDrop /> : null

    case 'row': {
      const n = node.children?.length ?? 1
      const c = s.columns ?? cols ?? n
      const kids = node.children ?? []
      const ordered = c === 1 && s.reverse ? [...kids].reverse() : kids
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              c === n && s.colWidths?.length === n ? s.colWidths.map((w) => `minmax(0, ${w}fr)`).join(' ') : `repeat(${Math.max(1, c)}, minmax(0, 1fr))`,
            gap: s.gap ?? 20,
            // like V1: columns are always as tall as the row; each column then places its content top, middle or bottom
            alignItems: 'stretch',
            maxWidth: s.maxWidth,
            margin: s.maxWidth ? '0 auto' : undefined,
            width: '100%',
            boxSizing: 'border-box',
            minHeight: s.minHeight,
            // a row that is the one thing in a stretched column fills it (a card built from a row)
            flex: '1 1 auto',
            ...box(s),
          }}
        >
          {ordered.map((k, i) => (
            // a row nested in this column only has this column's width to fit its own columns into
            <ColsCtx.Provider key={k.id} value={colSpace(avail, gap(s), c, c === n && s.colWidths?.length === n ? s.colWidths[i] / s.colWidths.reduce((a, b) => a + b, 0) : 1 / c)}>
              <RowAlignCtx.Provider value={s.vAlign}>
                <NodeView node={k} />
              </RowAlignCtx.Provider>
            </ColsCtx.Provider>
          ))}
        </div>
      )
    }

    case 'column':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: s.gap ?? 16,
            textAlign: align,
            alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'stretch',
            justifyContent: colAlign(s.vAlign ?? rowAlign),
            height: '100%',
            ...box(s),
            borderRadius: softRadius(s),
            maxWidth: s.maxWidth,
            width: '100%',
            boxSizing: 'border-box',
            margin: s.maxWidth ? '0 auto' : undefined,
            minHeight: s.minHeight ?? (node.children?.length ? undefined : 64),
          }}
        >
          {/* a column that is a photo (its background) is complete without content: no drop box drawn over it */}
          {node.children?.length ? (
            <FillCtx.Provider value={(s.vAlign ?? rowAlign) === 'stretch' && node.children.length === 1}>{node.children.map((k) => <NodeView key={k.id} node={k} />)}</FillCtx.Provider>
          ) : ctx.editable && node.style.desktop.backgroundImage?.startsWith('img:') ? (
            // a photo still to come: the same placeholder as an image, filling the column
            <div style={{ flex: 1, display: 'grid', minHeight: '100%' }}>
              <EmptyMedia kind="image" planned={node.style.desktop.backgroundImage.slice(4).trim()} creating={ctx.doc.brief?.photos === 'ai'} />
            </div>
          ) : ctx.editable && !s.backgroundImage ? (
            <EmptyDrop />
          ) : null}
        </div>
      )

    case 'headline': {
      const Tag = `h${Math.min(6, p.level ?? 2)}` as 'h1'
      const fs = s.fontSize ?? 36
      return (
        <EditableText
          node={node}
          as={Tag}
          style={{
            fontFamily: 'var(--f-heading)',
            fontWeight: s.fontWeight ?? ('var(--h-weight)' as unknown as number),
            letterSpacing: 'var(--h-track)',
            fontSize: fs,
            lineHeight: lineHeight(s, fs >= 40 ? 1.06 : fs >= 26 ? 1.15 : 1.3),
            textAlign: align ?? ctx.doc.settings?.headingAlign,
            color: color ?? 'var(--c-heading, var(--c-ink))',
            textWrap: 'balance',
            padding: padding(s),
            ...font(s, true),
          }}
        />
      )
    }

    case 'text':
      return (
        <EditableText
          node={node}
          as="p"
          style={{
            fontSize: s.fontSize ?? ctx.doc.settings?.fontSize ?? 17,
            lineHeight: lineHeight(s, ctx.doc.settings?.lineHeight ?? 1.6),
            textAlign: align,
            // the page's Text color (Settings) is the colour of every text, like V1; otherwise the theme's softer body ink
            color: color ?? (ctx.doc.settings?.textColor ? 'var(--c-ink)' : 'var(--c-muted)'),
            fontWeight: s.fontWeight,
            textWrap: 'pretty',
            maxWidth: align === 'center' ? '42em' : undefined,
            marginInline: align === 'center' ? 'auto' : undefined,
            padding: padding(s),
            ...font(s),
          }}
        />
      )

    case 'eyebrow':
      return (
        <EditableText
          node={node}
          as="p"
          style={{ fontSize: s.fontSize ?? 14, fontWeight: s.fontWeight ?? 600, letterSpacing: '0.01em', textAlign: align, color: color ?? 'var(--c-primary)', ...font(s) }}
        />
      )

    case 'button': {
      const variant = p.variant ?? 'primary'
      const Before = p.icon ? ICONS[p.icon] : undefined
      const After = p.iconAfter ? ICONS[p.iconAfter] : undefined
      const fs = s.fontSize ?? 16
      const hv = s.hover ?? {}
      const hoverVars = {
        '--h-color': cssColor(hv.color),
        '--h-bg': cssColor(hv.background),
        '--h-sub': cssColor(hv.subtextColor),
        '--h-move': hv.movement ? `${-hv.movement}px` : undefined,
      } as CSSProperties
      const normalBg = variant === 'primary' ? (cssColor(s.background) ?? 'var(--c-primary)') : (cssColor(s.background) ?? 'transparent')
      const normalColor = variant === 'primary' ? (color ?? 'var(--c-on-primary)') : (color ?? 'var(--c-ink)')
      Object.assign(hoverVars, { '--n-bg': normalBg, '--n-color': normalColor, '--n-sub': cssColor(s.subtextColor) })
      return (
        <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
          <a
            id={elementDomId(node)}
            className={ctx.editable ? undefined : 'sio-btn'}
            href={ctx.editable ? undefined : p.action === 'url' ? p.url : undefined}
            target={p.newWindow ? '_blank' : undefined}
            onClick={(e) => {
              if (ctx.editable) return e.preventDefault()
              // a submit button inside a form sends that form (its fields are checked first)
              const form = p.action === 'submit' ? (e.currentTarget as HTMLElement).closest('form') : null
              if (form) {
                e.preventDefault()
                form.requestSubmit()
                return
              }
              if (p.action !== 'url') {
                e.preventDefault()
                window.dispatchEvent(new CustomEvent('sio:action', { detail: p }))
              }
            }}
            style={{
              ...hoverVars,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: s.fullWidth ? '100%' : undefined,
              boxSizing: 'border-box',
              // a short label ("Join now") stays on one line; long ones may wrap
              whiteSpace: (p.text ?? '').length <= 24 ? 'nowrap' : undefined,
              flexShrink: 0,
              padding: padding(s, [14, 24]),
              fontSize: fs,
              lineHeight: lineHeight(s, 1.2),
              fontWeight: 600,
              borderRadius: radiusOr(s, pill ? '999px' : 'var(--r)'),
              textDecoration: 'none',
              background: normalBg,
              color: normalColor,
              boxShadow: variant === 'secondary' && !s.borderType ? 'inset 0 0 0 1px var(--c-edge), 0 1px 2px rgba(0,0,0,.04)' : shadow(s.shadow),
              ...border(s),
              cursor: 'pointer',
              ...font(s),
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
              {Before ? <Before size={fs * 1.05} strokeWidth={2.2} /> : null}
              <EditableText node={node} as="span" style={{}} />
              {After ? <After size={fs * 1.05} strokeWidth={2.2} /> : null}
            </span>
            {p.subtext ? (
              <span className="sio-sub" style={{ fontSize: s.subtextSize ?? Math.round(fs * 0.75), fontWeight: 400, opacity: s.subtextColor ? 1 : 0.85, color: cssColor(s.subtextColor), marginTop: 4 }}>
                {p.subtext}
              </span>
            ) : null}
          </a>
        </div>
      )
    }

    case 'image': {
      const fill = s.fullWidth !== false && s.maxWidth === undefined
      // "img:<description>": a photo the AI planned, being created (or left for you to add)
      const planned = p.src?.startsWith('img:') ? p.src.slice(4).trim() : null
      if ((!p.src || planned !== null) && !ctx.editable) return null
      // "Fill the space": the photo takes the whole height of its column (a half-screen hero photo), cropped to fit
      const fillSpace = p.aspect === -1
      const img = (
        <div
          style={{
            ...(fillSpace ? { height: '100%', minHeight: s.minHeight ?? 420, display: 'grid' } : {}),
            position: 'relative',
            width: fill ? `${s.width ?? 100}%` : '100%',
            maxWidth: fill ? undefined : s.maxWidth,
            marginInline: align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : undefined,
            marginLeft: align === 'right' ? 'auto' : undefined,
            borderRadius: softRadius(s),
            overflow: 'hidden',
            boxShadow: shadow(s.shadow),
            ...border(s),
          }}
        >
          {!p.src || planned !== null ? (
            <EmptyMedia kind="image" ratio={fillSpace ? undefined : p.aspect || 1.5} planned={planned} creating={planned !== null && ctx.doc.brief?.photos === 'ai'} />
          ) : (
          <FadeImg
            src={p.src}
            alt={p.alt ?? ''}
            fallback={ctx.editable ? <EmptyMedia kind="image" ratio={p.aspect || 1.5} /> : null}
            style={{ width: '100%', aspectRatio: p.aspect === 0 || fillSpace ? undefined : String(p.aspect ?? 1.5), height: fillSpace ? '100%' : p.aspect === 0 ? 'auto' : undefined, position: fillSpace ? 'absolute' : undefined, inset: fillSpace ? 0 : undefined, objectFit: p.aspect === 0 ? 'contain' : 'cover', display: 'block', background: p.aspect === 0 ? 'transparent' : 'var(--c-surface)', filter: s.blur ? `blur(${s.blur}px)` : undefined }}
          />
          )}
          {s.overlay && p.src ? <div style={{ position: 'absolute', inset: 0, background: cssColor(s.overlay) }} /> : null}
        </div>
      )
      if (!ctx.editable && p.action === 'url' && p.url)
        return (
          <a href={p.url} target={p.newWindow ? '_blank' : undefined} style={{ display: 'block' }}>
            {img}
          </a>
        )
      if (!ctx.editable && p.action === 'popup')
        return (
          <div style={{ cursor: 'pointer' }} onClick={() => window.dispatchEvent(new CustomEvent('sio:action', { detail: p }))}>
            {img}
          </div>
        )
      return img
    }

    case 'video': {
      const ratio = String(p.aspect ?? 16 / 9)
      const wrap: CSSProperties = { position: 'relative', aspectRatio: ratio, borderRadius: radius(s, 12), overflow: 'hidden', background: '#000', boxShadow: shadow(s.shadow), ...border(s) }
      // a direct link plays YouTube / Vimeo in their player, any other address as a video file
      const hosted = !!p.src && /youtube(-nocookie)?\.com\/embed|player\.vimeo\.com/.test(p.src)
      const asFile = p.videoType === 'upload' || (!hosted && p.videoType !== 'embed')
      const fileSrc = p.videoType === 'upload' ? p.videoFile : p.src
      // nothing to play yet (no file, no code): an empty frame that says where to add it, only in the editor
      const empty = p.videoType === 'upload' ? !p.videoFile : p.videoType === 'embed' ? !p.html?.trim() : !p.src?.trim()
      if (empty)
        return ctx.editable ? (
          <div style={{ ...wrap, background: 'transparent' }}>
            <EmptyMedia kind="video" />
          </div>
        ) : null
      if (p.videoType === 'embed')
        return (
          <div style={wrap}>
            <iframe
              title="Video"
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}body>*{width:100%!important;height:100%!important;max-width:none!important}iframe,video{width:100%;height:100%;border:0;display:block}</style></head><body>${p.html}</body></html>`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: ctx.editable ? 'none' : 'auto' }}
            />
          </div>
        )
      if (asFile)
        return (
          // black sits on the video itself, so a file that fails shows the empty frame, not a black box
          <div style={{ ...wrap, background: 'transparent' }}>
            <VideoFile
              src={fileSrc}
              poster={p.videoType === 'upload' ? p.poster : undefined}
              controls={p.controls !== false}
              autoPlay={!ctx.editable && p.autoplay}
              muted={p.autoplay}
              editable={ctx.editable}
            />
          </div>
        )
      const q = new URLSearchParams()
      if (p.autoplay && !ctx.editable) (q.set('autoplay', '1'), q.set('mute', '1'))
      if (p.controls === false) q.set('controls', '0')
      const src = p.src ? `${p.src}${p.src.includes('?') ? '&' : '?'}${q.toString()}` : undefined
      return (
        <div style={wrap}>
          <iframe src={src} title="Video" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: ctx.editable ? 'none' : 'auto' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )
    }

    case 'list': {
      const Icon = ICONS[p.icon ?? 'check'] ?? ICONS.check
      const isz = s.iconSize ?? Math.round((s.fontSize ?? 17) * 1.1)
      const nsz = s.iconSize ?? Math.round((s.fontSize ?? 17) * 1.35)
      // the marker's backing shape: a soft accent circle by default; colour and shape can be changed, or removed
      // no shape by default: just the icon or number; a circle / square behind it is a choice
      const shape = s.markerShape ?? 'none'
      const mRadius = shape === 'square' ? 0 : shape === 'rounded' ? '30%' : 999
      const accent = cssColor(s.iconColor) ?? 'var(--c-primary)'
      const mBg = shape === 'none' ? 'transparent' : (cssColor(s.markerBg) ?? `color-mix(in srgb, ${accent} 14%, transparent)`)
      // icons: an own icon colour used to mean "no circle" (kept for older pages unless a marker style is set)
      const iconBacked = shape !== 'none'
      return (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: s.gap ?? 10,
            fontSize: s.fontSize ?? 17,
            lineHeight: lineHeight(s, 1.5),
            ...box(s),
            ...font(s),
            // aligned as one block: it takes its own width and moves left / centre / right, bullets stay lined up
            ...(s.textAlign === 'center' || s.textAlign === 'right'
              ? { width: 'fit-content', maxWidth: '100%', marginLeft: 'auto', marginRight: s.textAlign === 'center' ? 'auto' : undefined }
              : {}),
          }}
        >
          {(p.items ?? []).map((_, i) => (
            <li key={i} style={{ display: 'flex', gap: s.markerGap ?? 12, alignItems: 'flex-start', textAlign: 'left', color: color ?? 'var(--c-ink)' }}>
              {/* the marker sits in a box exactly one text line tall and is centred in it, so it lines up with the
                  item's first line whatever the line height (like V1) */}
              <span style={{ flex: 'none', height: '1lh', display: 'flex', alignItems: 'center' }}>
              {p.marker === 'number' ? (
                // numbered: the same soft circle as the icons, with the item's number (it follows adds and removals)
                <span
                  style={{
                    flex: 'none',
                    // a touch larger than an icon so the digit reads
                    minWidth: nsz,
                    height: nsz,
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    borderRadius: mRadius,
                    display: 'grid',
                    placeItems: 'center',
                    background: mBg,
                    // a deeper shade of the accent so a number stays readable on its pale circle (an own colour is used as is)
                    color: s.iconColor ? accent : `color-mix(in srgb, ${accent} 62%, var(--c-ink))`,
                    // without a shape the number reads like text (its own size); inside one it fits the shape
                    fontSize: shape === 'none' ? (s.iconSize ? Math.round(s.iconSize * 0.9) : '1em') : Math.round(nsz * 0.56),
                    fontWeight: 650,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {/* the digit itself (its cap height) is centred, not its line box, so it sits in the middle of the shape */}
                  <span style={{ display: 'block', ...({ textBox: 'trim-both cap alphabetic' } as CSSProperties) }}>{i + 1}</span>
                </span>
              ) : (
                <span style={{ flex: 'none', width: isz, height: isz, borderRadius: mRadius, display: 'grid', placeItems: 'center', background: iconBacked ? mBg : undefined }}>
                  <Icon size={iconBacked ? isz * 0.64 : isz} strokeWidth={2.4} color={accent} />
                </span>
              )}
              </span>
              <ListItemText node={node} index={i} />
            </li>
          ))}
        </ul>
      )
    }

    case 'form': {
      // a form made of real elements (inputs, checkboxes, a button): each one is selected and edited on its own
      if (node.children) return <FormView node={node} s={s} />
      const fstyle = p.fieldStyle ?? {}
      const bstyle = p.btnStyle ?? {}
      const r = pill ? 999 : undefined
      const inline = p.layout === 'inline'
      const pos = p.buttonPosition ?? 'full'
      const field = (f: NonNullable<typeof p.fields>[number], i: number) => (
        <input
          key={i}
          readOnly={ctx.editable}
          tabIndex={ctx.editable ? -1 : 0}
          placeholder={f.label + (f.optional ? '' : '')}
          type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
          required={!f.optional}
          style={{
            font: 'inherit',
            fontSize: fstyle.fontSize ?? s.fontSize ?? 16,
            padding: '14px 16px',
            borderRadius: radius(fstyle) ?? (r ? `${r}px` : 'var(--r)'),
            border: `1px solid ${cssColor(fstyle.borderColor) ?? 'var(--c-edge, rgba(128,128,128,.75))'}`,
            background: cssColor(fstyle.background) ?? 'var(--c-bg)',
            color: cssColor(fstyle.color) ?? 'var(--c-ink)',
            outline: 'none',
            minHeight: 48,
            boxSizing: 'border-box',
            width: '100%',
            flex: inline ? '1 1 160px' : undefined,
          }}
        />
      )
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('sio:action', { detail: { action: 'submit', ...p } }))
          }}
          style={{
            display: 'flex',
            flexDirection: inline ? 'row' : 'column',
            flexWrap: inline ? 'wrap' : undefined,
            gap: s.gap ?? 10,
            width: '100%',
            // like systeme.io, a form takes the full width of where it sits (Width in its settings narrows it)
            maxWidth: s.maxWidth,
            marginInline: 'auto',
            textAlign: 'left',
            boxSizing: 'border-box',
            ...box(s),
            borderRadius: softRadius(s),
          }}
        >
          {(p.fields ?? []).map(field)}
          <div style={{ display: 'flex', justifyContent: pos === 'left' ? 'flex-start' : pos === 'right' ? 'flex-end' : 'center', flex: inline ? '0 0 auto' : undefined }}>
            <button
              type="submit"
              style={{
                font: 'inherit',
                fontSize: bstyle.fontSize ?? s.fontSize ?? 16,
                fontWeight: 600,
                padding: '15px 24px',
                minHeight: 50,
                border: 0,
                width: pos === 'full' && !inline ? '100%' : undefined,
                borderRadius: radius(bstyle) ?? (r ? `${r}px` : 'var(--r)'),
                background: cssColor(bstyle.background) ?? 'var(--c-primary)',
                color: cssColor(bstyle.color) ?? 'var(--c-on-primary)',
                cursor: 'pointer',
              }}
            >
              {p.buttonText}
            </button>
          </div>
          {p.note ? <p style={{ fontSize: 13, color: 'var(--c-muted)', textAlign: 'center', width: '100%' }}>{p.note}</p> : null}
        </form>
      )
    }

    case 'faq':
      return <Faq node={node} s={s} editable={ctx.editable} />

    case 'countdown':
      return <Countdown node={node} s={s} editable={ctx.editable} />

    case 'divider':
      return (
        <div style={{ padding: padding(s, [8, 0]) }}>
          <div style={{ borderTop: `${s.borderWidth ?? 1}px ${s.borderStyle ?? 'solid'} ${cssColor(s.borderColor) ?? 'var(--c-edge, rgba(128,128,128,.75))'}`, borderRadius: radius(s) }} />
        </div>
      )

    case 'spacer':
      return <div style={{ height: s.height ?? 40 }} />

    case 'quote':
      if (p.kind === 'large')
        return (
          <figure style={{ margin: 0, textAlign: align ?? 'center' }}>
            <blockquote style={{ margin: 0, fontFamily: 'var(--f-heading)', fontSize: s.fontSize ?? 32, lineHeight: 1.3, letterSpacing: 'var(--h-track)', fontWeight: 500, textWrap: 'balance', color: color }}>“{p.text}”</blockquote>
            <figcaption style={{ marginTop: 24, fontSize: 15, color: 'var(--c-muted)' }}>
              <strong style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{p.author}</strong> · {p.role}
            </figcaption>
          </figure>
        )
      return (
        <figure
          style={{
            margin: 0,
            background: cssColor(s.background) ?? 'var(--c-bg)',
            borderRadius: radius(s) ?? 'var(--r-card)',
            padding: padding(s) ?? 28,
            // the thin outline is the default border; Border settings change or remove it
            boxShadow: shadow(s.shadow) ?? (s.borderType === undefined ? '0 0 0 1px var(--c-edge)' : undefined),
            ...border(s),
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Stars />
          <blockquote style={{ margin: 0, fontSize: s.fontSize ?? 17, lineHeight: 1.6, color: color ?? 'var(--c-ink)', flex: 1, whiteSpace: 'pre-line' }}>“{p.text}”</blockquote>
          <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
            {p.src && !p.src.startsWith('img:') ? (
              <img src={p.src} alt="" style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover' }} />
            ) : (
              <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--c-surface)', display: 'grid', placeItems: 'center', fontWeight: 600, color: 'var(--c-ink)', boxShadow: '0 0 0 1px var(--c-line)' }}>{(p.author ?? '?').slice(0, 1)}</span>
            )}
            <span>
              <span style={{ display: 'block', fontWeight: 600, color: 'var(--c-ink)' }}>{p.author}</span>
              <span style={{ color: 'var(--c-muted)' }}>{p.role}</span>
            </span>
          </figcaption>
        </figure>
      )

    case 'price':
      return (
        <div
          style={{
            background: cssColor(s.background) ?? (p.featured ? 'var(--c-bg)' : 'var(--c-surface)'),
            borderRadius: radius(s) ?? 'var(--r-card)',
            padding: padding(s) ?? 32,
            boxShadow: s.borderType !== undefined ? shadow(s.shadow) : p.featured ? '0 0 0 2px var(--c-primary), 0 12px 32px -12px rgba(0,0,0,.18)' : '0 0 0 1px var(--c-edge, rgba(128,128,128,.75))',
            ...border(s),
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            textAlign: 'left',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 17 }}>{p.name}</span>
            {p.featured ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>Most popular</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--f-heading)', fontWeight: 'var(--h-weight)' as unknown as number, fontSize: 48, letterSpacing: 'var(--h-track)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
            <span style={{ color: 'var(--c-muted)', fontSize: 15 }}>{p.period}</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
            {(p.features ?? []).map((f, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <svg viewBox="0 0 16 16" width="16" height="16" style={{ flex: 'none', marginTop: 3 }} fill="none" stroke="var(--c-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          {/* no button text: no button (never an empty outline) */}
          {p.buttonText?.trim() ? (
            <span style={{ marginTop: 'auto', display: 'block', textAlign: 'center', padding: '14px 20px', fontWeight: 600, borderRadius: pill ? 999 : 'var(--r)', background: p.featured ? 'var(--c-primary)' : 'transparent', color: p.featured ? 'var(--c-on-primary)' : 'var(--c-ink)', boxShadow: p.featured ? undefined : 'inset 0 0 0 1px var(--c-line)' }}>{p.buttonText}</span>
          ) : null}
        </div>
      )

    case 'logos':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 48, rowGap: 16 }}>
          {(p.items ?? []).map((l, i) => (
            <span key={i} style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, fontSize: s.fontSize ?? 20, letterSpacing: '-0.02em', color: color ?? 'var(--c-ink)', opacity: 0.45 }}>
              {l}
            </span>
          ))}
        </div>
      )

    case 'stat':
      return (
        <div style={{ textAlign: align, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--f-heading)', fontWeight: 'var(--h-weight)' as unknown as number, fontSize: s.fontSize ?? 40, letterSpacing: 'var(--h-track)', lineHeight: 1.1, color: color ?? 'var(--c-ink)', fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
          {p.label ? <span style={{ fontSize: 15, color: 'var(--c-muted)' }}>{p.label}</span> : null}
        </div>
      )
    default:
      return null
  }
}

/* ---------------- Inline text editing ---------------- */

/* ---------------- Form (made of real elements) ---------------- */

const SUCCESS_TEXT = 'Everything you need is on its way to your inbox.'

/**
 * What a visitor sees right after signing up (option D, "the thank-you"): a brand stamp that settles in, a warm
 * heading in the page's own font (it greets them by the first name they typed), then what happens next.
 */
function FormSuccess({ p, name }: { p: Node['props']; name: string }) {
  const { doc } = useContext(RenderCtx)!
  const t = doc.theme
  // a theme colour ("ink", "primary"…) is read as the real colour, to know if text on it must be light
  const token: Record<string, string> = { ink: t.ink, muted: t.muted, primary: t.primary, 'on-primary': t.onPrimary, bg: t.bg, surface: t.surface }
  const bg = p.successBg ? (token[p.successBg] ?? p.successBg) : undefined
  const heading = p.successHeading
  return (
    <div
      role="status"
      className="sio-thanks"
      style={{
        // its background colour fills the whole form (see FormView): the spacing is the form's own padding;
        // on a dark background with no text colour chosen, the text turns light so it stays readable
        color: cssColor(p.successTextColor) ?? (isDarkColor(bg) ? '#ffffff' : 'var(--c-ink)'),
      }}
    >
      <span className="sio-thanks-stamp" style={{ background: cssColor(p.successIconColor) ?? 'var(--c-primary)', color: 'var(--c-on-primary)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div className="sio-thanks-title">
        {heading ? (
          heading
        ) : name ? (
          <>
            Welcome, <em>{name}.</em>
          </>
        ) : (
          <>
            You&rsquo;re <em>in.</em>
          </>
        )}
      </div>
      <div className="sio-thanks-text">{p.successText ?? SUCCESS_TEXT}</div>
    </div>
  )
}

function FormView({ node, s }: { node: Node; s: Style }) {
  const ctx = useContext(RenderCtx)!
  const p = node.props
  const inlineF = p.layout === 'inline'
  const [done, setDone] = useState<string | null>(null)
  const preview = useEditorStore((st) => st.successPreview === node.id)
  // after a sign-up without redirection (or while you edit that message), the thank-you takes the form's place
  const success = ctx.editable ? preview : done !== null
  return (
    <form
      className={inlineF ? 'sio-form sio-form-inline' : 'sio-form'}
      noValidate={ctx.editable}
      onSubmit={(e) => {
        e.preventDefault()
        if (ctx.editable) return
        window.dispatchEvent(new CustomEvent('sio:action', { detail: { action: 'submit', ...p } }))
        const first = (e.currentTarget.querySelector('input[name="first_name"]') as HTMLInputElement | null)?.value.trim() ?? ''
        // the thank-you shows when the form keeps people on the page ("No redirection"), as the setting says
        if (p.redirect === 'none') setDone(first.split(/\s+/)[0] ?? '')
      }}
      style={{
        position: 'relative',
        width: '100%',
        // like systeme.io, a form takes the full width of where it sits (Width in its settings narrows it)
        maxWidth: s.maxWidth,
        marginInline: 'auto',
        textAlign: 'left',
        boxSizing: 'border-box',
        ...box(s),
        borderRadius: softRadius(s),
        // the thank-you's background fills the form's own box, so the form's padding (Design) is its spacing
        ...(success && p.successBg ? { background: cssColor(p.successBg) } : {}),
      }}
    >
      {success ? (
        <FormSuccess p={p} name={ctx.editable ? 'Anna' : (done ?? '')} />
      ) : (
        <InFormCtx.Provider value>
          {node.children!.map((k) => (
            <NodeView key={k.id} node={k} />
          ))}
        </InFormCtx.Provider>
      )}
    </form>
  )
}

/* ---------------- Bullet list: typed straight on the page, like V1 ---------------- */

/** Where the caret goes after Enter / Backspace re-draws the list: item index and character position. */
let listCaret: { id: string; index: number; at: number } | null = null

function caretAt(el: HTMLElement, chars: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let left = chars
  let node: globalThis.Node | null = null
  let off = 0
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.textContent?.length ?? 0
    node = n
    off = Math.min(left, len)
    if (left <= len) break
    left -= len
  }
  const r = document.createRange()
  if (node) r.setStart(node, off)
  else r.setStart(el, 0)
  r.collapse(true)
  el.focus({ preventScroll: true })
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(r)
}

/**
 * One bullet's text. While the list is being edited every bullet is editable in place: Enter starts a new bullet
 * (the text after the caret moves with it), Backspace at the start of a bullet joins it to the one above.
 */
function ListItemText({ node, index }: { node: Node; index: number }) {
  const ctx = useContext(RenderCtx)!
  const ref = useRef<HTMLSpanElement>(null)
  const editing = ctx.editable && ctx.editingId === node.id
  const items = node.props.items ?? []
  const html = sanitize(items[index] ?? '')
  const typed = useRef<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (editing && typed.current === html) return
    if (el.innerHTML !== html) el.innerHTML = html
  }, [html, editing])

  useEffect(() => {
    const el = ref.current
    if (!el || !editing || !listCaret || listCaret.id !== node.id || listCaret.index !== index) return
    const at = listCaret.at
    listCaret = null
    caretAt(el, at)
  })

  const write = (next: string[], focus: { index: number; at: number }) => {
    listCaret = { id: node.id, ...focus }
    setProps(node.id, { items: next })
  }

  return (
    <span
      ref={ref}
      data-li={index}
      contentEditable={editing}
      suppressContentEditableWarning
      style={{ minWidth: '1ch', minHeight: '1lh', outline: 'none', flex: 1 }}
      onInput={(e) => {
        const v = sanitize((e.target as HTMLElement).innerHTML)
        typed.current = v
        const next = [...(node.props.items ?? [])]
        next[index] = v
        setProps(node.id, { items: next })
      }}
      onKeyDown={(e) => {
        const el = e.currentTarget
        const sel = window.getSelection()
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null
        const list = [...(node.props.items ?? [])]
        if (e.key === 'Escape') {
          el.blur()
          setState({ editingId: null })
          return
        }
        if (e.key === 'Enter' && !e.shiftKey && range) {
          // a new bullet below, taking the text after the caret with it
          e.preventDefault()
          range.deleteContents()
          const tail = document.createRange()
          tail.setStart(range.startContainer, range.startOffset)
          tail.setEnd(el, el.childNodes.length)
          const box = document.createElement('div')
          box.appendChild(tail.extractContents())
          list[index] = sanitize(el.innerHTML)
          list.splice(index + 1, 0, sanitize(box.innerHTML))
          write(list, { index: index + 1, at: 0 })
          return
        }
        if (e.key === 'Backspace' && range && range.collapsed && index > 0) {
          const before = document.createRange()
          before.selectNodeContents(el)
          before.setEnd(range.startContainer, range.startOffset)
          if (before.toString().length > 0) return
          // at the very start: join this bullet to the one above
          e.preventDefault()
          const prevText = document.createElement('div')
          prevText.innerHTML = list[index - 1] ?? ''
          const at = prevText.textContent?.length ?? 0
          list[index - 1] = (list[index - 1] ?? '') + sanitize(el.innerHTML)
          list.splice(index, 1)
          write(list, { index: index - 1, at })
        }
      }}
      dangerouslySetInnerHTML={editing ? undefined : { __html: html }}
    />
  )
}

export function EditableText({ node, as: Tag, style, field = 'text' }: { node: Node; as: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'; style: CSSProperties; field?: 'text' | 'title' | 'subtext' }) {
  const ctx = useContext(RenderCtx)!
  const ref = useRef<HTMLElement>(null)
  const editing = ctx.editable && ctx.editingId === node.id && field === 'text'
  const html = sanitize((node.props[field] as string | undefined) ?? '')

  // what this element last typed itself; anything else (AI, inspector, undo) must show right away
  const typed = useRef<string | null>(null)
  // changing the tag (H2 → H5) gives a brand-new, empty element: it must always be filled
  const filled = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fresh = filled.current !== el
    filled.current = el
    if (!fresh && editing && typed.current === html) return
    if (el.innerHTML !== html) el.innerHTML = html
  }, [html, editing, Tag])

  useEffect(() => {
    if (!editing || !ref.current) return
    const el = ref.current
    el.innerHTML = html
    el.focus()
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
    // only on entering edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  return (
    <Tag
      ref={ref as never}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      onInput={(e) => {
        const v = sanitize((e.target as HTMLElement).innerHTML)
        typed.current = v
        setProps(node.id, { [field]: v })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          ;(e.target as HTMLElement).blur()
          setState({ editingId: null })
        }
        if (e.key === 'Enter' && !e.shiftKey && node.type !== 'text') {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
          setState({ editingId: null })
        }
      }}
      dangerouslySetInnerHTML={editing ? undefined : { __html: html }}
    />
  )
}

/* ---------------- Small widgets ---------------- */

/** Like V1: an empty row shows only its dashed outline, so you can see it is there and drop into it. */
export function EmptyDrop() {
  // V1's grey dashes; on dark sections they follow the (light) text colour so they stay visible
  return <div data-empty-drop style={{ minHeight: 68, border: '1px dashed color-mix(in srgb, currentColor 22%, #a3a3a3)' }} />
}

/**
 * An image or video with nothing in it yet (editor only; the published page shows nothing): a quiet placeholder
 * at its real size, one line icon and two words (Squarespace). Clicking it selects it like any element; the upload
 * modal opens by itself only when an image is first added with a click (Elements).
 */
function EmptyMedia({ kind, ratio, planned, creating }: { kind: 'image' | 'video'; ratio?: number; planned?: string | null; creating?: boolean }) {
  return (
    // editor chrome, not page content: neutral greys that read on any section (never the page's own colours,
    // which can be anything, e.g. white text on a white section)
    <div className="sio-media-empty" style={{ position: kind === 'video' ? 'absolute' : 'relative', inset: 0, aspectRatio: ratio ? String(ratio) : undefined }}>
      {kind === 'image' ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <path d="m10 9 5 3-5 3z" />
        </svg>
      )}
      <span>{creating ? 'Creating photo…' : kind === 'image' ? 'Add image' : 'Add video'}</span>
      {/* the photo the AI planned here: what to add (or what is being created) */}
      {/* the photo the AI planned here, in plain words (its casting tags and framing notes stay internal) */}
      {planned ? <span className="sio-media-note">{planned.replace(/^\s*(\[[\w-]+\]\s*)+/, '').replace(/;\s*text (left|right|center|top|bottom)\s*$/i, '').replace(/^[a-z]/, (c) => c.toUpperCase())}</span> : null}
    </div>
  )
}

/** An image that fades in once loaded; if its file cannot load, `fallback` takes its place (else it stays blank). */
export function FadeImg(props: { src?: string; alt: string; style: CSSProperties; fallback?: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState<string | undefined>()
  // one quiet retry before giving up (a photo that was still being saved a moment ago)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!failed || failed !== props.src || retry) return
    const t = window.setTimeout(() => (setRetry(1), setFailed(undefined)), 1500)
    return () => window.clearTimeout(t)
  }, [failed, props.src, retry])
  if (failed === props.src && props.fallback !== undefined && retry) return <>{props.fallback}</>
  return (
    <img
      key={retry}
      src={props.src}
      alt={props.alt}
      draggable={false}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(props.src)}
      style={{ ...props.style, opacity: loaded ? 1 : 0, transition: 'opacity 240ms var(--ease-out)' }}
    />
  )
}

/** A video file (direct link or upload); a file that cannot load shows the empty frame in the editor, nothing live. */
function VideoFile({ src, poster, controls, autoPlay, muted, editable }: { src?: string; poster?: string; controls: boolean; autoPlay?: boolean; muted?: boolean; editable: boolean }) {
  const [failed, setFailed] = useState<string | undefined>()
  if (failed === src) return editable ? <EmptyMedia kind="video" /> : null
  return (
    <video
      src={src}
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      preload="metadata"
      onError={() => setFailed(src)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', pointerEvents: editable ? 'none' : 'auto' }}
    />
  )
}

function Faq({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const p = node.props
  const answers = node.children ?? []
  const [live, setOpen] = useState(0)
  // in the editor a click only selects the FAQ: the answer shown open is the one picked in its settings (it stays open
  // while you go and drag elements into it), or the one holding what is selected
  const picked = useFaqOpen(node.id)
  const inside = useEditorStore((st) => (editable && st.selectedId ? answers.findIndex((c) => c.id === st.selectedId || contains(c, st.selectedId!)) : -1))
  const open = editable ? (inside >= 0 ? inside : picked) : live
  // which empty answer an element is being dragged over (enter / leave fire for every child, so they are counted)
  const [over, setOver] = useState<{ i: number; depth: number } | null>(null)
  useEffect(() => {
    const clear = () => setOver(null)
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => (window.removeEventListener('dragend', clear), window.removeEventListener('drop', clear))
  }, [])
  // soft cards (Linear / Vercel): a chevron that turns over when open, unless icons were picked for each state
  const picks = !!(p.icon || p.iconAfter)
  const Open = ICONS[p.icon ?? 'minus'] ?? ICONS.minus
  const Closed = ICONS[p.iconAfter ?? 'plus'] ?? ICONS.plus
  const Chevron = ICONS['chevron-down']
  const iconColor = cssColor(s.iconColor) ?? 'currentColor'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: s.gap ?? 10, ...font(s) }}>
      {answers.map((col, i) => {
        const empty = editable && !col.children?.length
        return (
          <div
            key={col.id}
            // each question its own soft card: a light tint of the text colour, so it reads on light and dark sections
            style={{ background: cssColor(s.background) ?? 'color-mix(in srgb, var(--c-ink) 5%, transparent)', borderRadius: radius(s, 14), boxShadow: shadow(s.shadow), ...border(s), overflow: 'hidden' }}
          >
            <button
              type="button"
              aria-expanded={open === i}
              onClick={editable ? undefined : () => setOpen(open === i ? -1 : i)}
              style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: padding(s) ?? '18px 20px', cursor: editable ? 'inherit' : 'pointer', fontWeight: 600, fontSize: s.fontSize ?? 17, color: cssColor(s.color) ?? 'var(--c-ink)' }}
            >
              {col.props.question || 'Question'}
              {p.showIcons !== false &&
                (picks ? (
                  open === i ? <Open size={18} color={iconColor} style={{ flex: 'none' }} /> : <Closed size={18} color={iconColor} style={{ flex: 'none' }} />
                ) : (
                  <Chevron size={18} color={iconColor} style={{ flex: 'none', transform: open === i ? 'rotate(180deg)' : undefined, transition: 'transform 260ms var(--ease-out)' }} />
                ))}
            </button>
            <div style={{ display: 'grid', gridTemplateRows: open === i ? '1fr' : '0fr', transition: 'grid-template-rows 240ms var(--ease-out)' }}>
              {/* the answer: a column of any elements, like V1 (closed answers are out of reach, so nothing drops into them) */}
              <div style={{ overflow: 'hidden', minHeight: 0 }} inert={open !== i || undefined}>
                <div style={{ padding: '0 20px 18px' }}>
                  <div
                    onDragEnter={empty ? () => setOver((o) => ({ i, depth: o?.i === i ? o.depth + 1 : 1 })) : undefined}
                    onDragLeave={empty ? () => setOver((o) => (o?.i === i && o.depth > 1 ? { i, depth: o.depth - 1 } : null)) : undefined}
                    className="sio-faq-answer"
                    style={{ position: 'relative' }}
                  >
                  <NodeView node={col} />
                  {/* an empty answer (editor only): the same calm drop box as an empty carousel slide, over the column */}
                  {empty && (
                    <div className={cx('sio-slide-empty', over?.i === i && 'over')} style={{ inset: 0 }} aria-hidden>
                      <SquareDashedMousePointer size={16} strokeWidth={1.75} />
                      {over?.i === i ? 'Drop to add to this answer' : 'Drag elements here'}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Countdown({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const p = node.props
  const [now, setNow] = useState(Date.now())
  const [start] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  // the visitor's first view of this countdown (a delay counts from it, on their next visits too)
  const [first] = useState(() => {
    if (editable) return start
    try {
      const k = `sio-cd-${node.id}`
      const t = Number(localStorage.getItem(k))
      if (t) return t
      localStorage.setItem(k, String(start))
    } catch {
      /* private mode: count from now */
    }
    return start
  })
  let end = p.endsAt ?? now
  if (p.countdownType === 'daily') {
    // ends every day at the chosen time (midnight on older pages); once passed, the next day's
    const [h, m] = (p.dailyTime ?? '24:00').split(':').map(Number)
    const d = new Date(now)
    d.setHours(h, m || 0, 0, 0)
    if (d.getTime() <= now) d.setDate(d.getDate() + 1)
    end = d.getTime()
  } else if (p.countdownType === 'delay') {
    const ms = ((p.delayDays ?? 0) * 86400 + (p.delayHours ?? 1) * 3600 + (p.delayMinutes ?? 0) * 60 + (p.delaySeconds ?? 0)) * 1000
    end = first + ms
  } else if (p.countdownType === 'minutes') end = first + (p.minutes ?? 15) * 60000
  // the funnel step's deadline (a sample in the prototype: three days from the first view)
  else if (p.countdownType === 'funnel') end = first + 3 * 86400000
  const left = Math.max(0, end - now)
  useEffect(() => {
    if (!editable && left === 0 && p.expireAction === 'redirect' && p.url) window.location.href = p.url
  }, [left, editable, p.expireAction, p.url])
  const size = s.fontSize ?? 40
  const parts = [
    [Math.floor(left / 86400000), 'days'],
    [Math.floor(left / 3600000) % 24, 'hours'],
    [Math.floor(left / 60000) % 60, 'minutes'],
    [Math.floor(left / 1000) % 60, 'seconds'],
  ] as const
  return (
    <div style={{ display: 'flex', gap: size * 0.4, justifyContent: s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center', ...font(s) }}>
      {parts.map(([v, l]) => (
        <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: size * 1.3 }}>
          <span style={{ fontFamily: s.fontFamily ? undefined : 'var(--f-heading)', fontWeight: 'var(--h-weight)' as unknown as number, fontSize: size, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: cssColor(s.color) }}>
            {String(v).padStart(2, '0')}
          </span>
          <span style={{ fontSize: s.subtextSize ?? 13, color: cssColor(s.subtextColor) ?? 'var(--c-muted)' }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

function Stars() {
  return (
    <span style={{ display: 'flex', gap: 2 }} aria-label="5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" width="15" height="15" fill="var(--c-primary)">
          <path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.4L8 11.2 4.1 13.4 5 9 1.7 6l4.4-.5z" />
        </svg>
      ))}
    </span>
  )
}
