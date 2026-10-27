import { useState } from 'react'
import { activeDevice, getState, select, setStyle } from '../store'
import { find } from '../tree'
import { resolveStyle } from '../responsive'

/** Equal split in twelfths for n columns (2 → 6/6, 3 → 4/4/4, 4 → 3/3/3/3). */
export function equalWidths(n: number) {
  const base = Math.floor(12 / n)
  return Array.from({ length: n }, (_, i) => base + (i < 12 - base * n ? 1 : 0))
}

/**
 * Handles on the lines between columns (like V1): drag to resize the two neighbours.
 * Widths snap to twelfths, so they stay tidy and line up across rows.
 */
export function ColumnResizer({ rowId, origin, onDragging }: { rowId: string; origin: () => DOMRect | null; onDragging: (v: boolean) => void }) {
  const [live, setLive] = useState<{ i: number; label: string } | null>(null)
  const row = find(getState().doc, rowId)
  const dev = activeDevice()
  const rowEl = document.querySelector(`[data-node="${rowId}"][data-device="${dev}"]`) as HTMLElement | null
  const base = origin()
  if (!row || !rowEl || !base || (row.children?.length ?? 0) < 2) return null
  const cols = row.children!.map((c) => document.querySelector(`[data-node="${c.id}"][data-device="${dev}"]`) as HTMLElement | null)
  if (cols.some((c) => !c)) return null
  const rects = cols.map((c) => c!.getBoundingClientRect())
  // only when the columns sit side by side on this device (stacked columns overlap horizontally)
  if (rects.some((r, i) => i > 0 && r.left < rects[i - 1].right - 2)) return null
  const rowRect = (rowEl.firstElementChild as HTMLElement | null)?.getBoundingClientRect() ?? rowEl.getBoundingClientRect()

  const n = rects.length
  const current = () => {
    const st = resolveStyle(find(getState().doc, rowId)!, dev, getState().doc.smartResponsive).style
    return st.colWidths?.length === n ? [...st.colWidths] : equalWidths(n)
  }

  const start = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDragging(true)
    const left = rects[i].left
    const right = rects[i + 1].right
    // a press that never moves is a click on the line: it opens the row's settings; a held press resizes
    const startX = e.clientX
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < 4) return
      moved = true
      const w = current()
      const pair = w[i] + w[i + 1]
      const t = Math.min(1, Math.max(0, (ev.clientX - left) / (right - left)))
      const a = Math.min(pair - 1, Math.max(1, Math.round(t * pair)))
      if (a !== w[i]) {
        w[i] = a
        w[i + 1] = pair - a
        setStyle(rowId, 'colWidths', w, dev)
      }
      setLive({ i, label: w.map((x) => `${Math.round((x / 12) * 100)}%`).join('  ·  ') })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      setLive(null)
      onDragging(false)
      // releasing the handle is not a click on the row under it
      const swallow = (ev: MouseEvent) => ev.stopPropagation()
      window.addEventListener('click', swallow, true)
      window.setTimeout(() => window.removeEventListener('click', swallow, true), 0)
      if (!moved) select(rowId)
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const top = rowRect.top - base.top
  const h = rowRect.height
  return (
    <>
      {rects.slice(0, -1).map((r, i) => {
        const active = live?.i === i
        // the handle sits on the real edge between the columns, which follow the pointer at once
        const x = (r.right + rects[i + 1].left) / 2 - base.left
        return (
          <div
            key={i}
            className="pointer-events-auto absolute z-[3] flex cursor-col-resize justify-center"
            style={{ left: x - 8, top, width: 16, height: h }}
            onPointerDown={start(i)}
            onClick={(e) => e.stopPropagation()}
            title="Click for the row's settings, drag to resize the columns"
          >
            <span className="h-full w-[2px] rounded-full" style={{ background: active ? 'var(--brand)' : 'color-mix(in srgb, var(--brand) 55%, transparent)' }} />
            <span
              className="absolute top-1/2 flex h-7 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--brand)] shadow-[0_0_0_2px_white,var(--shadow-pop)]"
              aria-hidden
            >
              <span className="h-3 w-[2px] rounded-full bg-white/90" />
            </span>
            {active && (
              <span className="absolute top-[calc(50%+22px)] whitespace-nowrap rounded-[6px] bg-[var(--hud)] px-2 py-1 text-[11px] font-semibold text-white shadow-[var(--shadow-pop)]">{live.label}</span>
            )}
          </div>
        )
      })}
    </>
  )
}
