import type { Node, PageDoc } from './types'

/** The page is a virtual root whose children are the sections. */
export const ROOT = '__root'

export function children(doc: PageDoc, parentId: string): Node[] | undefined {
  if (parentId === ROOT) return doc.sections
  return find(doc, parentId)?.children
}

export function find(doc: PageDoc, id: string | null | undefined): Node | undefined {
  if (!id) return undefined
  const stack = [...doc.sections]
  while (stack.length) {
    const n = stack.pop()!
    if (n.id === id) return n
    if (n.children) stack.push(...n.children)
  }
}

export function parentOf(doc: PageDoc, id: string): { parentId: string; index: number; list: Node[] } | undefined {
  const i = doc.sections.findIndex((s) => s.id === id)
  if (i >= 0) return { parentId: ROOT, index: i, list: doc.sections }
  const stack = [...doc.sections]
  while (stack.length) {
    const n = stack.pop()!
    if (!n.children) continue
    const j = n.children.findIndex((c) => c.id === id)
    if (j >= 0) return { parentId: n.id, index: j, list: n.children }
    stack.push(...n.children)
  }
}

export function path(doc: PageDoc, id: string | null): Node[] {
  if (!id) return []
  const out: Node[] = []
  const walk = (list: Node[], trail: Node[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        out.push(...trail, n)
        return true
      }
      if (n.children && walk(n.children, [...trail, n])) return true
    }
    return false
  }
  walk(doc.sections, [])
  return out
}

export function sectionOf(doc: PageDoc, id: string | null): Node | undefined {
  return path(doc, id)[0]
}

export function remove(doc: PageDoc, id: string): Node | undefined {
  const p = parentOf(doc, id)
  if (!p) return
  return p.list.splice(p.index, 1)[0]
}

export function insert(doc: PageDoc, parentId: string, index: number, node: Node) {
  const list = children(doc, parentId)
  if (!list) return
  list.splice(Math.max(0, Math.min(index, list.length)), 0, node)
}

export function contains(n: Node, id: string): boolean {
  if (n.id === id) return true
  return !!n.children?.some((c) => contains(c, id))
}

export function walk(list: Node[], fn: (n: Node, parent: Node | null) => void, parent: Node | null = null) {
  for (const n of list) {
    fn(n, parent)
    if (n.children) walk(n.children, fn, n)
  }
}

/** Where a new element should go when the user clicks it in the library. */
export function insertionTarget(doc: PageDoc, selectedId: string | null): { parentId: string; index: number } | undefined {
  const sel = find(doc, selectedId)
  if (sel) {
    if (sel.type === 'column') return { parentId: sel.id, index: sel.children?.length ?? 0 }
    if (sel.type === 'section') {
      const lastRow = [...(sel.children ?? [])].reverse().find((c) => c.type === 'row')
      const col = lastRow?.children?.[lastRow.children.length - 1]
      if (col) return { parentId: col.id, index: col.children?.length ?? 0 }
      return { parentId: sel.id, index: sel.children?.length ?? 0 }
    }
    if (sel.type === 'row') {
      const col = sel.children?.[0]
      if (col) return { parentId: col.id, index: col.children?.length ?? 0 }
    }
    const p = parentOf(doc, sel.id)
    if (p) return { parentId: p.parentId, index: p.index + 1 }
  }
  const last = doc.sections[doc.sections.length - 1]
  if (!last) return undefined
  return insertionTarget(doc, last.id)
}

/** Like V1, columns are not something users see: trails and "select parent" skip them. */
export function visiblePath(doc: PageDoc, id: string | null | undefined): Node[] {
  return path(doc, id ?? null).filter((n, i, all) => n.type !== 'column' || i === all.length - 1)
}

/** The parent people expect when they press Esc or "Select parent": the nearest one that is not a column. */
export function visibleParentId(doc: PageDoc, id: string): string | null {
  const trail = path(doc, id)
  for (let i = trail.length - 2; i >= 0; i--) if (trail[i].type !== 'column') return trail[i].id
  return null
}
