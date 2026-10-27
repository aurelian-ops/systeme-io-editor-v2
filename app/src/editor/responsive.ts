import { DEVICE_WIDTH, type Device, type Node, type Style, type StyleKey } from './types'

export type Source = 'base' | 'override' | 'auto' | 'inherited'
export interface Resolved {
  style: Style
  source: Partial<Record<StyleKey, Source>>
}

/** Keys the smart-responsive engine is allowed to adapt. */
const AUTO_KEYS: StyleKey[] = ['fontSize', 'paddingY', 'paddingX', 'pad', 'gap', 'fullWidth', 'columns', 'radius']

/**
 * Resolve the style a node actually renders with on a device.
 * Order: desktop base -> tablet override -> mobile override.
 * Where the user has not overridden a value, the smart engine adapts it.
 */
export function resolveStyle(node: Node, device: Device, smart: boolean, ctx?: { cols?: number }): Resolved {
  const base = node.style.desktop
  const tablet = node.style.tablet ?? {}
  const mobile = node.style.mobile ?? {}
  const style: Style = { ...base }
  const source: Resolved['source'] = {}
  for (const k of Object.keys(base) as StyleKey[]) source[k] = 'base'

  if (device === 'desktop') return { style, source }

  const explicit: Style = device === 'tablet' ? tablet : { ...tablet, ...mobile }
  const own: Style = device === 'tablet' ? tablet : mobile

  if (smart) {
    const auto = autoStyle(node, device, base, ctx)
    for (const k of Object.keys(auto) as StyleKey[]) {
      if (explicit[k] !== undefined) continue
      if (auto[k] === base[k]) continue
      ;(style as Record<string, unknown>)[k] = auto[k]
      source[k] = 'auto'
    }
  }
  for (const k of Object.keys(explicit) as StyleKey[]) {
    ;(style as Record<string, unknown>)[k] = explicit[k]
    source[k] = own[k] !== undefined ? 'override' : 'inherited'
  }
  return { style, source }
}

function autoStyle(node: Node, device: Device, b: Style, ctx?: { cols?: number }): Style {
  const m = device === 'mobile'
  const out: Style = {}
  const fs = b.fontSize
  switch (node.type) {
    case 'headline': {
      if (fs) {
        const lvl = node.props.level ?? 2
        const floor = lvl === 1 ? 34 : lvl === 2 ? 28 : 19
        out.fontSize = m ? Math.max(Math.min(fs, floor), Math.round(fs * 0.6)) : Math.round(fs * 0.84)
        if (m && lvl === 1) out.fontSize = Math.min(out.fontSize, 40)
        if (m && lvl === 2) out.fontSize = Math.min(out.fontSize, 32)
      }
      break
    }
    case 'text':
    case 'list':
      if (fs && fs > 16) out.fontSize = m ? Math.max(16, fs - 2) : fs - 1
      if (b.gap) out.gap = m ? Math.round(b.gap * 0.85) : b.gap
      break
    case 'quote':
    case 'countdown':
      // (a small quote card never shrinks below readable size; the scale is meant for the big ones)
      if (fs) out.fontSize = Math.max(15, m ? Math.round(fs * 0.7) : Math.round(fs * 0.86))
      break
    case 'button':
      if (fs && fs < 16) out.fontSize = 16
      if (m) out.fullWidth = true
      if (b.paddingY !== undefined && b.paddingY < 14) out.paddingY = 14
      break
    case 'section':
      if (b.paddingY !== undefined) out.paddingY = m ? Math.max(40, Math.round(b.paddingY * 0.58)) : Math.round(b.paddingY * 0.78)
      if (b.paddingX !== undefined) out.paddingX = m ? 20 : Math.min(b.paddingX, 32)
      if (b.gap) out.gap = m ? Math.round(b.gap * 0.65) : Math.round(b.gap * 0.8)
      if (b.pad) {
        const [t, r, bo, l] = b.pad
        out.pad = m ? [Math.max(32, Math.round(t * 0.58)), Math.min(r, 20), Math.max(32, Math.round(bo * 0.58)), Math.min(l, 20)] : [Math.round(t * 0.78), Math.min(r, 32), Math.round(bo * 0.78), Math.min(l, 32)]
      }
      break
    case 'row':
      if (b.gap) out.gap = m ? Math.min(b.gap, 24) : Math.round(b.gap * 0.7)
      if (ctx?.cols !== undefined) out.columns = ctx.cols
      break
    case 'column':
      if (b.paddingY && b.paddingY > 24) out.paddingY = m ? Math.round(b.paddingY * 0.7) : b.paddingY
      if (b.paddingX && b.paddingX > 20) out.paddingX = m ? Math.max(20, Math.round(b.paddingX * 0.6)) : b.paddingX
      break
    case 'form':
      if (b.paddingX && b.paddingX > 20) out.paddingX = m ? 20 : b.paddingX
      if (b.paddingY && b.paddingY > 20) out.paddingY = m ? 22 : b.paddingY
      break
  }
  return out
}

/**
 * How many columns a row can hold on a device, like CSS auto-fit but
 * avoiding orphans: 3 items never become 2 + 1.
 */
export function fitColumns(n: number, available: number, minCol: number, gap: number) {
  if (n <= 1) return 1
  let fit = Math.max(1, Math.min(n, Math.floor((available + gap) / (minCol + gap))))
  while (fit > 1 && n % fit !== 0) fit--
  return fit
}

export function contentWidth(section: Node, device: Device, smart: boolean) {
  const s = resolveStyle(section, device, smart).style
  const w = DEVICE_WIDTH[device] - 2 * (s.paddingX ?? 0)
  return Math.min(w, s.maxWidth ?? w)
}

export function isAutoKey(k: StyleKey) {
  return AUTO_KEYS.includes(k)
}
