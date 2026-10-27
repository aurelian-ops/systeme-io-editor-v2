import type { DragEvent } from 'react'

/** Lets the page renderer start a move without importing the editor's drag module (avoids an import cycle). */
export const dragBridge: { start: (id: string, e: DragEvent) => void; end: () => void } = {
  start: () => {},
  end: () => {},
}
