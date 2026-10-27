import { buildSection, row, section, type SectionKind } from './blocks'
import { makeCopy } from './ai/copy'
import { ALL_ITEMS } from './library'
import { getState, setState, toast, update, labelOf } from './store'
import { contains, find, insert, parentOf, remove, ROOT } from './tree'
import type { Node } from './types'
import { dragBridge } from './dragBridge'
import { appear, captureLayout, carry, playLayout, withLayout } from '../ui/motion'

export type DragPayload =
  | { kind: 'item'; itemId: string }
  | { kind: 'block'; block: SectionKind; variant: number }
  | { kind: 'move'; id: string }
  /** a prebuilt node (Blocks tab, My blocks); `section` drops between sections, `layout` drops into a section */
  | { kind: 'node'; make: () => Node; section?: boolean; layout?: boolean }

/** dataTransfer can't be read during dragover, so the payload lives here. */
export let dragPayload: DragPayload | null = null
export function startDrag(p: DragPayload, e: React.DragEvent) {
  dragPayload = p
  e.dataTransfer.effectAllowed = p.kind === 'move' ? 'move' : 'copy'
  e.dataTransfer.setData('text/plain', 'sio')
  setState({ editingId: null })
  // the element lifts out of the page while it travels (after the browser took its drag image)
  if (p.kind === 'move') carry(true)
  if (p.kind === 'move') requestAnimationFrame(() => document.querySelectorAll(`.page-root [data-node="${p.id}"]`).forEach((el) => el.classList.add('is-lifted')))
}
export function endDrag() {
  if (dragPayload?.kind === 'move') carry(false)
  document.querySelectorAll('.page-root .is-lifted').forEach((el) => el.classList.remove('is-lifted'))
  dragPayload = null
  window.dispatchEvent(new CustomEvent('editor:dragend'))
}

/** A small label follows the pointer instead of a ghost of the whole element. */
let chip: HTMLDivElement | null = null
function dragChip(text: string) {
  if (!chip) {
    chip = document.createElement('div')
    chip.style.cssText =
      'position:fixed;top:-100px;left:-100px;padding:5px 10px;border-radius:8px;background:#171717;color:#fff;font:600 12px Geist,Inter,sans-serif;box-shadow:0 8px 20px -6px rgba(0,0,0,.35);pointer-events:none;white-space:nowrap'
    document.body.appendChild(chip)
  }
  chip.textContent = text
  return chip
}

dragBridge.start = (id, e) => {
  const n = find(getState().doc, id)
  if (!n) return
  startDrag({ kind: 'move', id }, e)
  e.dataTransfer.setDragImage(dragChip(`Move ${labelOf(n)}`), -12, -12)
}
dragBridge.end = endDrag

export function pageCopy() {
  const d = getState().doc
  return makeCopy(d.title + ' ' + d.sections.map((s) => s.props.kind).join(' '), brandOf())
}
function brandOf() {
  const header = getState().doc.sections.find((s) => s.props.kind === 'header')
  const h = header && findType(header, 'headline')
  return h?.props.text
}
function findType(n: Node, t: Node['type']): Node | undefined {
  if (n.type === t) return n
  for (const c of n.children ?? []) {
    const f = findType(c, t)
    if (f) return f
  }
}

export function makeFromPayload(p: DragPayload): Node | null {
  if (p.kind === 'item') return ALL_ITEMS.find((i) => i.id === p.itemId)?.make() ?? null
  if (p.kind === 'block') return buildSection(p.block, pageCopy(), p.variant)
  if (p.kind === 'node') return p.make()
  return null
}

export function isSectionPayload(p: DragPayload) {
  if (p.kind === 'block') return true
  if (p.kind === 'node') return !!p.section
  if (p.kind === 'item') return !!ALL_ITEMS.find((i) => i.id === p.itemId)?.section
  return find(getState().doc, p.id)?.type === 'section'
}
export function isLayoutPayload(p: DragPayload) {
  if (p.kind === 'item') return !!ALL_ITEMS.find((i) => i.id === p.itemId)?.layout
  if (p.kind === 'node') return !!p.layout
  if (p.kind === 'move') return find(getState().doc, p.id)?.type === 'row'
  return false
}

/**
 * The untouched row a new section starts with (one empty column, nothing else in the section),
 * when the drop lands in that section or in that row's column.
 */
function starterRow(parentId: string) {
  const doc = getState().doc
  const target = find(doc, parentId)
  const sec = target?.type === 'section' ? target : target?.type === 'column' ? doc.sections.find((x) => contains(x, target.id)) : undefined
  const only = sec?.children?.length === 1 ? sec.children[0] : undefined
  // only the row the section came with counts, not an empty Row someone added on purpose
  const empty = only?.type === 'row' && !!only.props.starter && only.children?.length === 1 && !only.children[0].children?.length
  if (!empty || (target!.type === 'column' && target!.id !== only!.children![0].id)) return null
  return only!.id
}

/** The element added last, so click-to-add keeps going after it while nothing is selected. */
export let lastAdded: string | null = null
export const markAdded = (id: string) => (lastAdded = id)

/** Insert or move into a parent at an index. */
export function dropAt(p: DragPayload, parentId: string, index: number, ownRow = false) {
  if (p.kind === 'move') {
    const doc = getState().doc
    const n = find(doc, p.id)
    if (!n) return
    if (parentId !== ROOT) {
      const target = find(doc, parentId)
      if (target && contains(n, target.id)) return
    }
    const from = parentOf(doc, p.id)
    captureLayout()
    update((d) => {
      let moved = remove(d, p.id)!
      const adj = from && from.parentId === parentId && from.index < index ? index - 1 : index
      if (parentId === ROOT && moved.type !== 'section')
        moved = section('blank', 'light', moved.type === 'row' ? [moved] : [row([[moved]], { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 })], { paddingY: 40, paddingX: 40, gap: 24 })
      insert(d, parentId, adj, moved)
    })
    setState({ selectedId: p.id })
    playLayout(p.id)
    return
  }
  const made = makeFromPayload(p)
  if (!made) return
  // like V1: anything dropped outside a section gets its own Section > Row > Column
  let node = made
  // an element added with a click comes in its own row (V1), never inside the row next to it
  if (ownRow && made.type !== 'row' && made.type !== 'section') node = row([[made]], { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 })
  if (parentId === ROOT && made.type !== 'section') {
    const inner = made.type === 'row' ? [made] : [row([[made]], { minCol: 200 }, { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 })]
    node = section('blank', 'light', inner, { paddingY: 40, paddingX: 40, gap: 24 })
  }
  // like V1: the first layout you add to a fresh section replaces the empty row it came with
  const placeholder = made.type === 'row' ? starterRow(parentId) : null
  withLayout(() =>
    update((d) => {
      if (placeholder) {
        const at = parentOf(d, placeholder)!
        at.list.splice(at.index, 1, node)
      } else insert(d, parentId, index, node)
    }),
  )
  appear(node.id)
  // like V1: adding keeps you in the Elements panel; the next click-add goes after this one
  lastAdded = made.id
  if (node !== made) {
    setState({ selectedId: null, editingId: null })
    toast(`Added ${labelOf(made)}`, true)
    window.dispatchEvent(new CustomEvent('editor:reveal', { detail: made.id }))
    return
  }
  setState({ selectedId: null, editingId: null })
  toast(`Added ${labelOf(node)}`, true)
  window.dispatchEvent(new CustomEvent('editor:reveal', { detail: node.id }))
}
