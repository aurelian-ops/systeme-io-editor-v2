import type { ElementDef } from './types'
import type { NodeType } from '../types'

/**
 * Elements defined as self-contained modules. Each file exports `def: ElementDef`.
 * Built-in elements (section, row, column, headline, text…) render in PageView and
 * get their settings in Inspector; everything listed here plugs in through this map.
 */
const modules = import.meta.glob<{ def: ElementDef }>('./*.tsx', { eager: true })

export const REGISTRY: Partial<Record<NodeType, ElementDef>> = {}
for (const m of Object.values(modules)) if (m.def) REGISTRY[m.def.type] = m.def
