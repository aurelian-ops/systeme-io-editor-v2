import { useSyncExternalStore } from 'react'
import { cloneFresh, uid } from './blocks'
import { setState, toast, update } from './store'
import { find } from './tree'
import { createMaster, deleteMaster, getMasters, makeInstance } from './masters'
import type { Node, SavedBlock } from './types'

/** "My blocks": anything saved with the floppy icon, kept across pages in this browser. */

const KEY = 'sio-editor-v2-blocks'
let blocks: SavedBlock[] = load()
const subs = new Set<() => void>()

function load(): SavedBlock[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedBlock[]
  } catch {
    return []
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(blocks))
  } catch {
    /* storage full or blocked */
  }
  subs.forEach((f) => f())
}

/** Opens the save dialog (name + Block / Master block). */
/** Where the last click happened, so "save as a block" can open right next to the button that was pressed. */
let lastPress: DOMRect | null = null
if (typeof window !== 'undefined')
  window.addEventListener(
    'pointerdown',
    (e) => {
      const b = (e.target as HTMLElement | null)?.closest?.('button')
      lastPress = b ? b.getBoundingClientRect() : null
    },
    true,
  )

export function saveBlock(node: Node) {
  setState({ saveBlockFor: node.id, saveBlockAt: lastPress ? { x: lastPress.x, y: lastPress.y, w: lastPress.width, h: lastPress.height } : null })
}

export function commitSaveBlock(node: Node, name: string, master: boolean) {
  const id = uid('blk')
  blocks = [{ id, name, node: structuredClone(node), master }, ...blocks]
  persist()
  if (master) {
    createMaster(id, name, node)
    // the element you saved becomes the first instance
    update((d) => {
      const n = find(d, node.id)
      if (n) n.props.masterId = id
    })
    toast(`Saved “${name}” as a master block`)
  } else toast(`Saved “${name}” to My blocks`)
}

export function deleteBlock(id: string) {
  blocks = blocks.filter((b) => b.id !== id)
  persist()
  // copies already on pages stay; they simply stop syncing
  if (getMasters()[id]) deleteMaster(id)
}

export function instantiate(b: SavedBlock): Node {
  const def = b.master ? getMasters()[b.id] : undefined
  return def ? makeInstance(def) : cloneFresh(b.node)
}

export function useSavedBlocks() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => blocks,
  )
}
