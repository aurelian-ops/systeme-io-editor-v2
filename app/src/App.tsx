import { useEffect, useLayoutEffect, useRef } from 'react'
import { exitGhost, installPress, installScrollEdges, rubberband, spring, velocityTracker } from './ui/motion'
import { TopBar } from './editor/TopBar'
import { LeftPanel } from './editor/panels/LeftPanel'
import { Canvas } from './editor/canvas/Canvas'
import { CommandPalette } from './editor/CommandPalette'
import { Preview } from './editor/Preview'
import { SaveBlockDialog } from './editor/panels/SaveBlockDialog'
import { ConfirmDelete } from './editor/panels/ConfirmDelete'
import { askAI, duplicateNode, getState, redo, askDelete, save, setState, undo, useEditor } from './editor/store'
import { visibleParentId } from './editor/tree'

installPress()
installScrollEdges()

export default function App() {
  useShortcuts()
  return (
    <div className="flex h-full flex-col">
      <div className="app-scene relative flex min-h-0 flex-1 flex-col overflow-clip">
        <TopBar />
        <div className="relative flex min-h-0 flex-1">
          <Canvas />
          <LeftPanel />
        </div>
      </div>
      <Toasts />
      <CommandPalette />
      <Preview />
      <SaveBlockDialog />
      <ConfirmDelete />
    </div>
  )
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const t = e.target as HTMLElement
      const typing = t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)
      const s = getState()
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setState({ palette: !s.palette })
        return
      }
      if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        if (s.threadOpen && !(document.activeElement as HTMLElement | null)?.closest('aside')) askAI()
        else if (s.threadOpen) setState({ threadOpen: false })
        else askAI()
        return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
        return
      }
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setState({ preview: true })
        return
      }
      if (typing) return
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd' && s.selectedId) {
        e.preventDefault()
        duplicateNode(s.selectedId)
        return
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && s.selectedId) {
        e.preventDefault()
        askDelete(s.selectedId)
        return
      }
      if (e.key === 'Escape' && s.selectedId) {
        setState({ selectedId: visibleParentId(s.doc, s.selectedId), editingId: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function Toasts() {
  const toasts = useEditor((s) => s.toasts)
  return (
    // toasts sit left of the AI panel when it is open (never over its buttons)
    <div className="pointer-events-none fixed bottom-5 z-[700] flex flex-col items-end gap-2" style={{ right: 'calc(var(--right-inset, 0px) + 20px)' }}>
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} text={t.text} undoable={!!t.undo} onUndo={t.onUndo} count={t.count ?? 1} />
      ))}
    </div>
  )
}

const dismiss = (id: string) => setState({ toasts: getState().toasts.filter((x) => x.id !== id) })

/** Rises from the bottom; flick it to the right to send it away. */
function Toast({ id, text, undoable, onUndo, count }: { id: string; text: string; undoable: boolean; onUndo?: () => void; count: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    return () => exitGhost(el, [{ opacity: Number(el?.style.opacity || 1) }, { opacity: 0, transform: `${el?.style.transform || ''} translateY(8px) scale(0.97)` }], 200)
  }, [])
  const drag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || e.button !== 0) return
    e.preventDefault()
    const el = ref.current!
    const x0 = e.clientX
    const vt = velocityTracker()
    let dx = 0
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      dx = ev.clientX - x0
      vt.add(ev.timeStamp, dx)
      // free to the right, resists to the left
      const x = dx > 0 ? dx : rubberband(dx, 120)
      el.style.transform = `translateX(${x}px)`
      el.style.opacity = String(1 - Math.max(0, x) / 260)
    }
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      // a cancelled gesture always goes back; only a real release can send it away
      const cancelled = ev.type === 'pointercancel'
      const v = cancelled ? 0 : vt.get()
      const from = dx > 0 ? dx : rubberband(dx, 120)
      const away = !cancelled && dx + v * 0.2 > 90
      spring({
        from,
        to: away ? 420 : 0,
        velocity: v,
        response: away ? 0.3 : 0.35,
        onUpdate: (x) => {
          el.style.transform = `translateX(${x}px)`
          el.style.opacity = String(Math.max(0, 1 - Math.max(0, x) / 300))
        },
        onDone: () => (away ? dismiss(id) : ((el.style.transform = ''), (el.style.opacity = ''))),
      })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  return (
    <div
      ref={ref}
      onPointerDown={drag}
      className="toast-rise material-dark pointer-events-auto flex cursor-grab touch-none select-none items-center gap-3 rounded-[10px] py-2 pl-3.5 pr-2 text-[13px] text-white shadow-[var(--shadow-pop)] active:cursor-grabbing"
    >
      {text}
      {undoable ? (
        <button
          onClick={() => {
            // "Duplicated Section ×3": Undo takes back all three
            if (onUndo) onUndo()
            else for (let i = 0; i < count; i++) undo()
            dismiss(id)
          }}
          className="press rounded-[6px] px-2 py-0.5 text-[12px] font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          Undo
        </button>
      ) : (
        <span className="w-1" />
      )}
    </div>
  )
}
