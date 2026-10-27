import type { Node, PageDoc, Style, Theme } from './types'

/**
 * Keeps every page buildable by hand: whatever the AI (or an old page) produced, each part ends up somewhere you can
 * click and edit. Run when a page loads and after every AI change.
 *
 * - A column only lives where the editor gives you a way to reach it (a row's column tabs, or inside a Content box,
 *   carousel, FAQ, survey or calendar). A column found anywhere else becomes a Content box when it looks like a card
 *   (colour, border or shadow), or gives its content to its parent when it is only a wrapper.
 * - Colours are values the colour picker can show and edit: a mix or a CSS variable becomes the colour it means.
 */

const HOLDS_COLUMNS = new Set(['row', 'contentbox', 'carousel', 'faq', 'survey', 'calendar', 'form'])
const COLOUR_KEYS = ['color', 'background', 'borderColor', 'iconColor', 'subtextColor', 'placeholderColor', 'titleColor', 'textBackground', 'contentBackground', 'markerBackground', 'buttonBackground', 'buttonColor'] as const

// a box: its own colour, a full outline or a shadow (a thin line on one side is a divider, not a card)
const looksLikeCard = (s?: Style) => !!s && (!!s.background || s.borderType === 'full' || (!!s.shadow && s.shadow !== 'none'))
/** a column with a look of its own worth keeping (padding, a divider, a width, a stay-in-view…) */
const hasLook = (c: Node) => Object.keys(c.style.desktop ?? {}).some((k) => k !== 'gap') || !!c.style.mobile || !!c.props.motion

function fixColumns(n: Node) {
  if (!n.children) return
  // a form keeps its fields in one column (put back if an older pass took them out of it)
  if (n.type === 'form' && n.children.length && !(n.children.length === 1 && n.children[0].type === 'column'))
    n.children = [{ id: `${n.id}-col`, type: 'column', props: {}, style: { desktop: { gap: n.style.desktop.gap ?? 10 } }, children: n.children }]
  if (!HOLDS_COLUMNS.has(n.type)) {
    n.children = n.children.flatMap((c) => {
      if (c.type !== 'column') return [c]
      if (looksLikeCard(c.style.desktop)) {
        // the card's look moves to the Content box; its spacing between items stays on the column inside
        const { gap, vAlign, ...look } = c.style.desktop
        return [{ id: c.id, type: 'contentbox', props: { ...c.props, headerVisible: false }, style: { ...c.style, desktop: { ...look } }, children: [{ id: `${c.id}-in`, type: 'column', props: {}, style: { desktop: { gap: gap ?? 12, vAlign } }, children: c.children ?? [] }] } as Node]
      }
      // a column with its own spacing, divider or width keeps it inside a one-column row (reachable by its row);
      // a bare wrapper gives its content to its parent
      if (hasLook(c)) return [{ id: `${c.id}-row`, type: 'row', props: { minCol: 200 }, style: { desktop: { gap: 0 } }, children: [c] } as Node]
      return c.children ?? []
    })
  }
  n.children.forEach(fixColumns)
}

/**
 * A thin line on top of a column (a divider drawn by its border) can't be reached: columns act as one with their
 * row. It becomes a real Horizontal line at the top of the column, which you can click, move or delete.
 */
function fixColumnLines(n: Node) {
  for (const c of n.children ?? []) {
    const d = c.style.desktop
    if (c.type === 'column' && d?.borderType === 'top' && !d.background) {
      const top = d.pad?.[0] ?? 0
      c.children = [{ id: `${c.id}-line`, type: 'divider', props: {}, style: { desktop: { pad: [0, 0, Math.max(0, top - (d.gap ?? 16)), 0], borderColor: d.borderColor ?? 'line', borderWidth: d.borderWidth ?? 1 } } }, ...(c.children ?? [])]
      const { borderType, borderColor, borderWidth, ...rest } = d
      c.style.desktop = { ...rest, ...(d.pad ? { pad: [0, d.pad[1], d.pad[2], d.pad[3]] as [number, number, number, number] } : {}) }
    }
    fixColumnLines(c)
  }
}

/* ---------------- colours ---------------- */

const TOKEN: Record<string, keyof Theme> = { primary: 'primary', 'on-primary': 'onPrimary', ink: 'ink', muted: 'muted', bg: 'bg', surface: 'surface', dark: 'dark', line: 'line' }

function hexOf(v: string, t: Theme): [number, number, number] | null {
  const m = v.trim().match(/^var\(--c-([a-z-]+)\)$/)
  const val = m ? (t[TOKEN[m[1]]] as string | undefined) : v.trim()
  if (!val) return null
  const h = val.match(/^#([0-9a-f]{6})$/i)
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)) as [number, number, number]
  const r = val.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : null
}
const toHex = (c: number[]) => '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')

/** A colour the picker can show: a theme name, #hex or rgba(); a mix or a variable becomes the colour it means. */
export function plainColour(v: string | undefined, t: Theme): string | undefined {
  if (!v) return v
  const s = v.trim()
  const token = s.match(/^var\(--c-([a-z-]+)\)$/)
  if (token && TOKEN[token[1]]) return token[1]
  const mix = s.match(/^color-mix\(in srgb,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*,\s*([^)]+\)?)\s*\)$/)
  if (mix) {
    const a = hexOf(mix[1], t)
    const b = hexOf(mix[3], t)
    const k = Number(mix[2]) / 100
    return a && b ? toHex(a.map((x, i) => x * k + b[i] * (1 - k))) : undefined
  }
  if (/^(var|color-mix|calc)\(/.test(s)) return undefined
  return v
}

function fixColours(n: Node, t: Theme) {
  for (const st of [n.style.desktop, n.style.tablet, n.style.mobile]) {
    if (!st) continue
    for (const k of COLOUR_KEYS) {
      const v = (st as Record<string, unknown>)[k]
      if (typeof v !== 'string') continue
      const plain = plainColour(v, t)
      if (plain === undefined) delete (st as Record<string, unknown>)[k]
      else (st as Record<string, unknown>)[k] = plain
    }
  }
  n.children?.forEach((c) => fixColours(c, t))
}

/** The same for one new piece (a section or element the AI is about to place), before it ever reaches the page. */
export function fixNode(n: Node, theme: Theme) {
  // the piece's own top level counts too: a bare column is wrapped like any other misplaced one
  const holder: Node = { id: 'tmp', type: 'section', props: {}, style: { desktop: {} }, children: [n] }
  fixColumns(holder)
  fixColumnLines(holder)
  for (const c of holder.children!) fixColours(c, theme)
  return holder.children!
}

/** Make the whole page editable by hand (see above). Changes the page in place. */
export function fixStructure(doc: PageDoc) {
  for (const s of doc.sections) {
    fixColumns(s)
    fixColumnLines(s)
    fixColours(s, doc.theme)
  }
  for (const p of doc.popups ?? []) for (const s of (p as { sections?: Node[] }).sections ?? []) (fixColumns(s), fixColours(s, doc.theme))
  return doc
}
