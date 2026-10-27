import { createLucideIcon } from 'lucide-react'

/**
 * Headline: an H drawn in the same language as Lucide's "type" T (the Text tile),
 * two stems with the same short end bars top and bottom, so the pair reads as one family.
 */
export const HeadingSerif = createLucideIcon('heading-serif', [
  ['path', { d: 'M7 4v16', key: 'l' }],
  ['path', { d: 'M17 4v16', key: 'r' }],
  ['path', { d: 'M7 12h10', key: 'bar' }],
  ['path', { d: 'M4.5 4h5', key: 'tl' }],
  ['path', { d: 'M14.5 4h5', key: 'tr' }],
  ['path', { d: 'M4.5 20h5', key: 'bl' }],
  ['path', { d: 'M14.5 20h5', key: 'br' }],
])
