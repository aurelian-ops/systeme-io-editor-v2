import type { SectionTone, Theme } from './types'

export const THEMES: Theme[] = [
  {
    preset: 'Clean',
    primary: '#1499f2',
    onPrimary: '#ffffff',
    ink: '#0f172a',
    muted: '#5b6474',
    bg: '#ffffff',
    surface: '#f4f6f9',
    line: 'rgba(15,23,42,.09)',
    dark: '#0b1220',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    radius: 10,
    headingWeight: 700,
    headingTracking: -0.025,
  },
  {
    preset: 'Editorial',
    primary: '#c2410c',
    onPrimary: '#ffffff',
    ink: '#1c1917',
    muted: '#6b625b',
    bg: '#fffcf7',
    surface: '#f5efe6',
    line: 'rgba(28,25,23,.1)',
    dark: '#1c1917',
    fontHeading: 'Fraunces',
    fontBody: 'Inter',
    radius: 4,
    headingWeight: 600,
    headingTracking: -0.02,
  },
  {
    preset: 'Bold',
    primary: '#111111',
    onPrimary: '#ffffff',
    ink: '#111111',
    muted: '#555555',
    bg: '#ffffff',
    surface: '#f3f3ef',
    line: 'rgba(0,0,0,.1)',
    dark: '#111111',
    fontHeading: 'Bricolage Grotesque',
    fontBody: 'Manrope',
    radius: 999,
    headingWeight: 700,
    headingTracking: -0.035,
  },
  {
    preset: 'Soft',
    primary: '#6d4aff',
    onPrimary: '#ffffff',
    ink: '#1e1b3a',
    muted: '#615e7d',
    bg: '#ffffff',
    surface: '#f5f3ff',
    line: 'rgba(30,27,58,.09)',
    dark: '#17142f',
    fontHeading: 'Plus Jakarta Sans',
    fontBody: 'Plus Jakarta Sans',
    radius: 16,
    headingWeight: 700,
    headingTracking: -0.025,
  },
  {
    preset: 'Studio',
    primary: '#0a0a0a',
    onPrimary: '#ffffff',
    ink: '#0a0a0a',
    muted: '#6b6b6b',
    bg: '#fafaf9',
    surface: '#f0efed',
    line: 'rgba(0,0,0,.09)',
    dark: '#0a0a0a',
    fontHeading: 'Instrument Serif',
    fontBody: 'Inter',
    radius: 2,
    headingWeight: 400,
    headingTracking: -0.01,
  },
  {
    preset: 'Fresh',
    primary: '#15803d',
    onPrimary: '#ffffff',
    ink: '#0c1f14',
    muted: '#53625a',
    bg: '#ffffff',
    surface: '#eff6f1',
    line: 'rgba(12,31,20,.09)',
    dark: '#0c1f14',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    radius: 12,
    headingWeight: 700,
    headingTracking: -0.03,
  },
]

export const FONT_CHOICES = [
  'Inter',
  'Geist',
  'Manrope',
  'Plus Jakarta Sans',
  'Space Grotesk',
  'Bricolage Grotesque',
  'Fraunces',
  'Instrument Serif',
]

/** The default edge of elements: a neutral grey that reads the same on light and dark sections. */
export const EDGE = 'rgba(128,128,128,.75)'

/** CSS variables for the page and for each section tone. */
export function themeVars(t: Theme): Record<string, string> {
  return {
    '--c-primary': t.primary,
    '--c-on-primary': t.onPrimary,
    '--c-ink': t.ink,
    '--c-muted': t.muted,
    '--c-bg': t.bg,
    '--c-surface': t.surface,
    '--c-line': t.line,
    '--c-dark': t.dark,
    // the outline of an element (a card, a field, a survey…): one clearly visible grey on every section
    '--c-edge': EDGE,
    '--f-heading': `"${t.fontHeading}", ui-serif, system-ui, sans-serif`,
    '--f-body': `"${t.fontBody}", ui-sans-serif, system-ui, sans-serif`,
    '--r': `${t.radius}px`,
    '--r-card': `${Math.min(t.radius, 20)}px`,
    '--h-weight': String(t.headingWeight),
    '--h-track': `${t.headingTracking}em`,
  }
}

export function toneVars(tone: SectionTone | undefined, t: Theme): Record<string, string> {
  switch (tone) {
    case 'muted':
      return { '--c-bg': t.surface, '--c-surface': t.bg }
    case 'dark':
      return {
        '--c-bg': t.dark,
        '--c-ink': '#ffffff',
        '--c-muted': 'rgba(255,255,255,.68)',
        '--c-surface': 'rgba(255,255,255,.06)',
        '--c-line': 'rgba(255,255,255,.12)',
        ...(isDark(t.primary) ? { '--c-primary': '#ffffff', '--c-on-primary': t.dark } : {}),
      }
    case 'brand':
      return {
        '--c-bg': t.primary,
        '--c-ink': t.onPrimary,
        '--c-muted': `color-mix(in srgb, ${t.onPrimary} 78%, transparent)`,
        '--c-surface': 'rgba(255,255,255,.12)',
        '--c-line': 'rgba(255,255,255,.2)',
        '--c-primary': t.onPrimary,
        '--c-on-primary': t.primary,
      }
    default:
      return {}
  }
}

export function isDark(hex: string) {
  const h = hex.replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 60
}

/** Colour values are either a theme token name or a raw css colour. */
export const COLOR_TOKENS = ['ink', 'muted', 'primary', 'on-primary', 'bg', 'surface', 'dark', 'line'] as const
export function cssColor(v?: string) {
  if (!v) return undefined
  if ((COLOR_TOKENS as readonly string[]).includes(v)) return `var(--c-${v})`
  return v
}

/* ---------------- Readable by default ---------------- */

/** systeme.io blue: the accent used when the theme's own accent would vanish on the background. */
export const SIO_BLUE = '#1499f2'

export function rgbOf(c: string): [number, number, number] | null {
  const v = c.trim()
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join('') : hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null
}
/** True when a colour is dark enough that text on it should be light. */
export function isDarkColor(c: string | undefined) {
  const v = c && rgbOf(c)
  return !!v && luminance(v) < 0.4
}

export function luminance([r, g, b]: [number, number, number]) {
  const f = (x: number) => ((x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function contrast(a: [number, number, number], b: [number, number, number]) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/**
 * When a section's background and the theme's text colour are too close (light text on a white
 * section, dark on dark), elements switch to readable text and the systeme.io blue, so anything
 * you add is always visible. Colours you picked yourself (on the element, or the page's text / heading
 * colour in Settings, listed in `chosen`) always win: only the theme's defaults are adjusted.
 */
export function readableVars(bg: string | undefined, vars: Record<string, string>, chosen: { ink?: boolean; heading?: boolean } = {}): Record<string, string> {
  const b = bg && rgbOf(bg)
  const ink = vars['--c-ink'] && rgbOf(vars['--c-ink'])
  if (!b || !ink) return {}
  const light = luminance(b) > 0.4
  const out: Record<string, string> = {}
  if (contrast(ink, b) < 3 && !chosen.ink) {
    out['--c-ink'] = light ? '#171717' : '#ffffff'
    if (!chosen.heading) out['--c-heading'] = out['--c-ink']
    out['--c-muted'] = light ? '#5c6370' : 'rgba(255,255,255,.72)'
    // fields, cards and lines follow the section, not the opposite theme
    out['--c-bg'] = bg!
    out['--c-surface'] = light ? '#f4f5f7' : 'rgba(255,255,255,.06)'
    out['--c-line'] = light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.14)'
  }
  // the page's own accent, even where a band around this one had to replace it (a white card on a dark band)
  const brand = vars['--c-brand'] ?? vars['--c-primary']
  const primary = brand && rgbOf(brand)
  if (primary && contrast(primary, b) < 2.5) {
    // the accent would vanish here: buttons go ink-on-light or light-on-dark, in the page's own ink (never an off-brand colour)
    const pageInk = vars['--c-ink'] && rgbOf(vars['--c-ink']) && luminance(rgbOf(vars['--c-ink'])!) < 0.2 ? vars['--c-ink'] : '#171717'
    out['--c-primary'] = light ? pageInk : '#ffffff'
    out['--c-on-primary'] = light ? '#ffffff' : pageInk
    out['--c-brand'] = brand
    out['--c-brand-on'] = vars['--c-brand-on'] ?? vars['--c-on-primary'] ?? '#ffffff'
  } else if (vars['--c-brand'] && vars['--c-primary'] !== brand) {
    out['--c-primary'] = brand
    out['--c-on-primary'] = vars['--c-brand-on'] ?? '#ffffff'
  }
  return out
}
