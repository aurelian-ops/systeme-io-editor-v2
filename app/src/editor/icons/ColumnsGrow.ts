import { createLucideIcon } from 'lucide-react'

/**
 * The Columns tile: one column inside a dashed frame with a + in the free space,
 * "one column, with room to grow" (drawn in the same style as the other tiles).
 */
export const ColumnsGrow = createLucideIcon('columns-grow', [
  ['rect', { x: '2.5', y: '4', width: '19', height: '16', rx: '2', strokeDasharray: '2 2.2', opacity: '.55', key: 'frame' }],
  ['rect', { x: '2.5', y: '4', width: '8', height: '16', rx: '2', key: 'col' }],
  ['path', { d: 'M16 10v4', key: 'v' }],
  ['path', { d: 'M14 12h4', key: 'h' }],
])
