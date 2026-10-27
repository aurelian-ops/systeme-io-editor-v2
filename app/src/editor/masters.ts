import { cloneFresh } from './blocks'
import type { Node, PageDoc } from './types'

/**
 * Master blocks: one shared definition, used on any number of pages.
 * A page holds instances (a node whose props.masterId points to the definition).
 * Editing any instance updates the definition and every other instance.
 * Definitions live in this browser's storage; another page/tab picks them up on focus.
 */

const KEY = 'sio-editor-v2-masters'
export interface MasterDef {
  id: string
  name: string
  node: Node
  updatedAt: number
}

let masters: Record<string, MasterDef> = load()
const subs = new Set<() => void>()

function load(): Record<string, MasterDef> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, MasterDef>
  } catch {
    return {}
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(masters))
  } catch {
    /* storage full or blocked */
  }
  subs.forEach((f) => f())
}

export const getMasters = () => masters
export const subscribeMasters = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
export function reloadMasters() {
  masters = load()
  subs.forEach((f) => f())
}

export function createMaster(id: string, name: string, node: Node) {
  masters = { ...masters, [id]: { id, name, node: strip(structuredClone(node)), updatedAt: Date.now() } }
  persist()
}
export function deleteMaster(id: string) {
  const next = { ...masters }
  delete next[id]
  masters = next
  persist()
}

/** Content without ids, so two instances of the same master compare equal. */
function shape(n: Node): string {
  return JSON.stringify(n, (k, v) => (k === 'id' ? undefined : v))
}
function strip(n: Node): Node {
  const { masterId: _m, ...props } = n.props as Node['props'] & { masterId?: string }
  return { ...n, props, children: n.children?.map(strip) }
}

function instances(list: Node[], out: Node[] = []): Node[] {
  for (const n of list) {
    if ((n.props as { masterId?: string }).masterId) out.push(n)
    else if (n.children) instances(n.children, out)
  }
  return out
}

/** Build an instance from the definition, keeping the instance's own root id. */
function fill(target: Node, def: MasterDef) {
  const fresh = cloneFresh(def.node)
  target.props = { ...fresh.props, masterId: def.id } as Node['props']
  target.style = fresh.style
  target.children = fresh.children
  target.type = fresh.type
}

/**
 * Called after every page change. An instance that changed becomes the new definition
 * and the other instances follow; instances that did not change pull the latest definition.
 */
export function syncMasters(prev: PageDoc, next: PageDoc) {
  const nextInst = instances(next.sections)
  if (!nextInst.length) return
  const prevById = new Map(instances(prev.sections).map((n) => [n.id, shape(n)]))
  const written = new Set<string>()
  for (const inst of nextInst) {
    const mid = (inst.props as { masterId?: string }).masterId!
    const def = masters[mid]
    if (!def) continue
    const before = prevById.get(inst.id)
    const now = shape(inst)
    if (before !== undefined && before !== now && !written.has(mid)) {
      masters = { ...masters, [mid]: { ...def, node: strip(structuredClone(inst)), updatedAt: Date.now() } }
      written.add(mid)
    }
  }
  if (written.size) persist()
  for (const inst of nextInst) {
    const mid = (inst.props as { masterId?: string }).masterId!
    const def = masters[mid]
    if (!def) continue
    if (shape({ ...inst, props: { ...inst.props, masterId: undefined } as Node['props'] }) !== shape(def.node)) fill(inst, def)
  }
}

/** Pull definitions edited elsewhere (another page or tab) into this page. */
export function refreshInstances(doc: PageDoc): boolean {
  let changed = false
  for (const inst of instances(doc.sections)) {
    const def = masters[(inst.props as { masterId?: string }).masterId!]
    if (def && shape({ ...inst, props: { ...inst.props, masterId: undefined } as Node['props'] }) !== shape(def.node)) {
      fill(inst, def)
      changed = true
    }
  }
  return changed
}

export function makeInstance(def: MasterDef): Node {
  const n = cloneFresh(def.node)
  n.props = { ...n.props, masterId: def.id } as Node['props']
  return n
}

export function masterOf(doc: PageDoc, path: Node[]): MasterDef | undefined {
  for (const n of path) {
    const mid = (n.props as { masterId?: string }).masterId
    if (mid && masters[mid]) return masters[mid]
  }
  void doc
  return undefined
}
