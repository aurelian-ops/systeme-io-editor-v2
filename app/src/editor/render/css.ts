import type { CSSProperties } from 'react'
import { cssColor } from '../theme'
import type { Style } from '../types'

/** One place that turns the style model into CSS, so every element reads the same values the same way. */

export function padding(s: Style, fallback?: [number, number]): string | undefined {
  if (s.pad) return s.pad.map((v) => `${v}px`).join(' ')
  const y = s.paddingY ?? fallback?.[0]
  const x = s.paddingX ?? fallback?.[1]
  if (y === undefined && x === undefined) return undefined
  return `${y ?? 0}px ${x ?? 0}px`
}

export function margin(s: Style): string | undefined {
  if (s.mar) return s.mar.map((v) => `${v}px`).join(' ')
  if (s.marginY === undefined && s.marginX === undefined) return undefined
  return `${s.marginY ?? 0}px ${s.marginX ?? 0}px`
}

export function radius(s: Style, fallback?: number): string | undefined {
  if (s.radii) return s.radii.map((v) => `${v}px`).join(' ')
  const r = s.radius ?? fallback
  return r === undefined ? undefined : `${r}px`
}

export function shadow(p?: Style['shadow']): string | undefined {
  switch (p) {
    case 'soft':
    case 'sm':
      return '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)'
    case 'mid':
    case 'md':
      return '0 8px 24px -8px rgba(0,0,0,.18)'
    case 'hard':
      return '0 4px 0 rgba(0,0,0,.85)'
    case 'far':
    case 'lg':
      return '0 32px 64px -24px rgba(0,0,0,.32)'
    default:
      return undefined
  }
}

export function border(s: Style): CSSProperties {
  const type = s.borderType ?? (s.border ? 'full' : 'none')
  if (type === 'none') return {}
  const v = `${s.borderWidth ?? 1}px ${s.borderStyle ?? 'solid'} ${cssColor(s.borderColor) ?? 'var(--c-edge, rgba(128,128,128,.75))'}`
  switch (type) {
    case 'full':
      return { border: v }
    case 'bottom':
      return { borderBottom: v }
    case 'top':
      return { borderTop: v }
    case 'topbottom':
      return { borderTop: v, borderBottom: v }
  }
}

export function background(s: Style): CSSProperties {
  const out: CSSProperties = {}
  const bg = cssColor(s.background)
  if (s.backgroundImage && !s.backgroundImage.startsWith('img:')) {
    // an overlay is a flat tint, or a gradient (a photo that darkens toward the text side)
    const tint = s.overlay?.includes('gradient(') ? s.overlay : s.overlay ? `linear-gradient(${cssColor(s.overlay)}, ${cssColor(s.overlay)})` : null
    const layers = [tint, `url("${s.backgroundImage}")`].filter(Boolean)
    out.backgroundImage = layers.join(', ')
    out.backgroundSize = 'cover'
    out.backgroundPosition = s.bgPosition ?? 'center'
  }
  if (bg) out.backgroundColor = bg
  return out
}

/** Box decorations shared by containers and boxed elements. */
export function box(s: Style, opts: { pad?: [number, number]; radius?: number } = {}): CSSProperties {
  return {
    padding: padding(s, opts.pad),
    borderRadius: radius(s, opts.radius),
    boxShadow: shadow(s.shadow),
    ...border(s),
    ...background(s),
  }
}

export function lineHeight(s: Style, fallback: number): number | string {
  const lh = s.lineHeight
  if (lh === undefined) return fallback
  return lh > 4 ? `${lh}px` : lh
}

export function font(s: Style, heading = false): CSSProperties {
  const out: CSSProperties = {}
  if (s.fontFamily) out.fontFamily = `"${s.fontFamily}", ${heading ? 'var(--f-heading)' : 'var(--f-body)'}`
  if (s.letterSpacing !== undefined) out.letterSpacing = `${s.letterSpacing}px`
  if (s.textBackground) out.backgroundColor = cssColor(s.textBackground)
  return out
}

/** Element corners: very large values (999) stay round, everything else is kept in proportion with the theme. */
export function softRadius(s: Style): string | undefined {
  if (s.radii) return radius(s)
  if (s.radius === undefined) return undefined
  return s.radius >= 200 ? '9999px' : `min(${s.radius}px, var(--r-card) * 1.6)`
}
