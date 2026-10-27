import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Device, Node, NodeType, PageDoc, Style } from '../types'

/** What an element's render function receives. `s` is already resolved for the device being drawn. */
export interface RenderArgs {
  node: Node
  s: Style
  device: Device
  doc: PageDoc
  /** true on the editor canvas, false in Preview / published output */
  editable: boolean
  /** render this node's children (for containers such as Content box) */
  children: () => ReactNode
}

export type LibraryGroup = 'Text' | 'Column layout' | 'Form' | 'Payment' | 'Media' | 'Social' | 'Other'

export interface ElementDef {
  type: NodeType
  /** label used in the library tile, toolbars, breadcrumb and Layers */
  label: string
  icon: LucideIcon
  group: LibraryGroup
  /** a fresh node with sensible defaults */
  make: () => Node
  render: (a: RenderArgs) => ReactNode
  /** inspector body; use the controls in settings/kit.tsx (they read the selected node from context) */
  settings: () => ReactNode
  /** shared groups appended by the inspector shell; all default to true */
  common?: { delay?: boolean; visibility?: boolean; htmlId?: boolean }
  /** placed only inside a form (e.g. Form input) */
  formOnly?: boolean
}
