import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  CornerLeftUp,
  Italic,
  Link2,
  MessageSquareText,
  Plus,
  Shuffle,
  Strikethrough,
  Trash2,
  Underline,
  ChevronDown,
  Save as SaveIcon,
  Settings2,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  StretchVertical,
  Square,
} from 'lucide-react'
import { MAX_COLUMNS, setColumnCount, duplicateNode, labelOf, moveNode, askDelete, setProps, setState, setStyle, toast, update, useEditor } from '../store'
import { find, insert, parentOf, path, ROOT, visibleParentId } from '../tree'
import { cssColor } from '../theme'
import { ALL_ITEMS } from '../library'
import type { Device } from '../types'
import type { DropHint } from './Canvas'
import { cx, Tooltip } from '../../ui/kit'
import { startDrag, endDrag, markAdded } from '../dnd'
import { saveBlock } from '../blocksStore'
import { ColumnResizer } from './ColumnResizer'
import { LinkPanel, offsetOf, pointAt } from './LinkPanel'
import { ColorPicker } from '../settings/ColorPicker'
import { getState } from '../store'
import { materialize, onLayoutFrame, spring, type Spring } from '../../ui/motion'

/** the doc at the moment of a click (read in handlers, not a hook) */
const currentDoc = () => getState().doc

interface R {
  x: number
  y: number
  w: number
  h: number
  /** on-screen corner radii (top-left, top-right, bottom-right, bottom-left), so outlines follow the real shape */
  rad?: [number, number, number, number]
  /** the box it sits in (its column, row or section): an element's outline never reaches outside it */
  clip?: { x: number; y: number; w: number; h: number }
  /** free space to the element just above / below it: the outline takes at most half, so close neighbours never touch */
  room?: { top: number; bottom: number }
}

/** How tall a text's letters really are compared with the room its font reserves (measured on a canvas). */
let glyphCanvas: CanvasRenderingContext2D | null = null
function glyphBox(el: HTMLElement) {
  const text = el.textContent?.trim()
  const host = (el.querySelector('h1,h2,h3,h4,h5,h6,p,span,li') as HTMLElement | null) ?? el
  if (!text) return null
  glyphCanvas ??= document.createElement('canvas').getContext('2d')
  if (!glyphCanvas) return null
  const cs = getComputedStyle(host)
  glyphCanvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const m = glyphCanvas.measureText(text)
  if (!m.fontBoundingBoxAscent) return null
  return { ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, fontAscent: m.fontBoundingBoxAscent, fontDescent: m.fontBoundingBoxDescent, area: m.fontBoundingBoxAscent + m.fontBoundingBoxDescent }
}

/** The element's corners as drawn: its own radius, or the page's rounded corner where it touches it. */
function cornersOf(el: HTMLElement, r: DOMRect): [number, number, number, number] {
  const frame = el.closest<HTMLElement>('[data-page-frame]')
  const z = frame ? parseFloat(frame.style.zoom || '1') || 1 : 1
  const cs = getComputedStyle(el)
  const own = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => Math.min(parseFloat(v) || 0, 999) * z)
  if (!frame) return own as [number, number, number, number]
  const f = frame.getBoundingClientRect()
  const fr = (parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0) * z
  const near = (a: number, b: number) => Math.abs(a - b) < 1.5
  const at = [
    near(r.left, f.left) && near(r.top, f.top),
    near(r.right, f.right) && near(r.top, f.top),
    near(r.right, f.right) && near(r.bottom, f.bottom),
    near(r.left, f.left) && near(r.bottom, f.bottom),
  ]
  const half = Math.min(r.width, r.height) / 2
  return own.map((v, i) => Math.min(half, at[i] ? Math.max(v, fr) : v)) as [number, number, number, number]
}
const radius = (r: R) => (r.rad ? r.rad.map((v) => `${v}px`).join(' ') : undefined)

/** Outlines around an element leave it a little air (4px); sections and rows keep theirs on the edge, flush with the page. */
const AIR = 4

/**
 * How a selection is drawn (prototypes in selection-*.html). 'apple' (chosen): one accent, the systeme.io blue,
 * means "selected"; the level shows in the line's weight (element 2px, row 1.5px, section 1px) and the
 * name and actions live in one glass capsule. 'corners' / 'focus' are the earlier options.
 */
const SEL_STYLE: 'apple' | 'corners' | 'focus' = 'apple'

/** Whether the outline glides from the last selection to the new one (off: it simply appears there). */
const RING_TRAVEL = false

/** Like V1, each level has its colour: green section, blue row, orange element. */
type Level = 'section' | 'row' | 'el'
const levelOf = (type: string | undefined): Level => (type === 'section' ? 'section' : type === 'row' || type === 'column' ? 'row' : 'el')
const LEVEL_COLOR: Record<Level, string> =
  SEL_STYLE === 'apple' ? { section: 'var(--brand)', row: 'var(--brand)', el: 'var(--brand)' } : { section: 'var(--sel-section)', row: 'var(--sel-row)', el: 'var(--sel-el)' }

/** The element's own icon (the one in the Elements panel), shown in the capsule. */
function TypeIcon({ type }: { type: string }) {
  const Icon = ALL_ITEMS.find((i) => i.id === (type === 'row' ? 'row1' : type))?.icon ?? Square
  return (
    <span className="sel-ic">
      <Icon size={12} strokeWidth={2.2} />
    </span>
  )
}

/** One glass capsule for a selection's name and actions; it materialises when it appears (a new selection). */
function Capsule({ children, style, ref, right, origin = '100% 100%' }: { children: React.ReactNode; style?: React.CSSProperties; ref?: React.Ref<HTMLDivElement>; right?: number; origin?: string }) {
  const own = useRef<HTMLDivElement>(null)
  // `right`: the capsule ends there (it is measured, not transformed, so the entrance animation never shifts it)
  useLayoutEffect(() => {
    if (own.current && right !== undefined) own.current.style.left = `${right - own.current.offsetWidth}px`
  })
  useLayoutEffect(() => {
    if (own.current) materialize(own.current, origin)
  }, [])
  return (
    <div
      ref={(el) => {
        own.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = el
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="sel-cap pointer-events-auto absolute flex items-center before:absolute before:-inset-2 before:-z-10 before:content-['']"
      style={style}
    >
      {children}
    </div>
  )
}
function outset(r: R, type: string | undefined): R {
  if (type === 'section' || type === 'row' || type === 'column') return r
  // the air stops at the edge of the box it sits in, so the outline stays inside its column;
  // opposite sides take the same air (the smaller), so the outline is never tight on one side and loose on the other
  const c = r.clip
  const up = Math.min(AIR, r.room ? r.room.top / 2 : AIR, c ? Math.max(0, r.y - c.y) : AIR)
  const down = Math.min(AIR, r.room ? r.room.bottom / 2 : AIR, c ? Math.max(0, c.y + c.h - r.y - r.h) : AIR)
  const left = c ? Math.min(AIR, Math.max(0, r.x - c.x)) : AIR
  const rightAir = c ? Math.min(AIR, Math.max(0, c.x + c.w - r.x - r.w)) : AIR
  const ax = Math.min(left, rightAir)
  const ay = Math.min(up, down)
  const x = r.x - ax
  const y = r.y - ay
  const right = r.x + r.w + ax
  const bottom = r.y + r.h + ay
  return { x, y, w: right - x, h: bottom - y, rad: (r.rad ?? [0, 0, 0, 0]).map((v) => (v ? v + Math.min(ax, ay) : 3)) as R['rad'] }
}

const TEXT_TYPES = ['headline', 'text', 'eyebrow', 'button']

export function Overlay({
  contentRef,
  hover,
  drop,
  tick,
}: {
  contentRef: RefObject<HTMLDivElement | null>
  hover: { id: string; device: Device } | null
  drop: DropHint | null
  tick: number
}) {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedId)
  const [resizing, setResizing] = useState<string | null>(null)
  const editingId = useEditor((s) => s.editingId)
  const view = useEditor((s) => s.view)
  const focusDevice = useEditor((s) => s.focusDevice)
  const aiBusy = useEditor((s) => s.aiBusy)
  const [, force] = useState(0)
  // while you carry an element, its outline and toolbar step aside; they come back at the new spot
  const [carrying, setCarrying] = useState(false)
  const [settled, setSettled] = useState(0)
  // when the last drop happened: only the outline that comes back right after it fades in, later selections are instant
  const settledAt = useRef(0)

  useLayoutEffect(() => {
    force((x) => x + 1)
  }, [doc, selectedId, view, tick, hover, editingId])

  // stay glued to elements while they glide to a new place
  useEffect(() => onLayoutFrame(() => force((x) => x + 1)), [])

  // the selected element can change size or place without the page's own size telling us (its content redraws, the
  // canvas scroll is clamped when the page gets shorter): follow it directly, so the outline never lags behind
  useEffect(() => {
    const root = contentRef.current
    if (!root || !selectedId) return
    let raf = 0
    const again = () => (cancelAnimationFrame(raf), (raf = requestAnimationFrame(() => force((x) => x + 1))))
    const ro = new ResizeObserver(again)
    root.querySelectorAll(`[data-node="${selectedId}"]`).forEach((el) => ro.observe(el))
    const scroller = root.closest('[data-canvas-scroller]')
    scroller?.addEventListener('scroll', again, { passive: true })
    // and once more after the page settles (a scroll clamped before this effect ran sends no event)
    again()
    const late = window.setTimeout(again, 160)
    return () => (ro.disconnect(), scroller?.removeEventListener('scroll', again), cancelAnimationFrame(raf), window.clearTimeout(late))
  }, [selectedId, doc, contentRef])

  // "quiet focus" (selection style D only): the rest of the page's content steps back while something is selected
  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root) return
    const focusOn = SEL_STYLE === 'focus' ? selectedId : null
    const lit = [selectedId, hover?.id].filter(Boolean) as string[]
    const keep = lit.flatMap((id) => [...root.querySelectorAll<HTMLElement>(`.page-root [data-node="${id}"]`)])
    root.querySelectorAll<HTMLElement>('.page-root [data-node]').forEach((el) => {
      const t = el.dataset.type
      const structure = t === 'section' || t === 'row' || t === 'column'
      const dim =
        !!focusOn &&
        !carrying &&
        !structure &&
        !keep.some((k) => k.contains(el) || el.contains(k)) &&
        !el.parentElement?.closest('[data-dim]')
      if (dim) el.setAttribute('data-dim', '')
      else el.removeAttribute('data-dim')
    })
  })
  useEffect(() => () => contentRef.current?.querySelectorAll('[data-dim]').forEach((el) => el.removeAttribute('data-dim')), [contentRef])
  const carryingNow = useRef(false)
  useEffect(() => {
    const onCarry = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail
      if (on === carryingNow.current) return
      carryingNow.current = on
      setCarrying(on)
      if (!on) {
        settledAt.current = performance.now()
        setSettled((n) => n + 1)
      }
    }
    window.addEventListener('editor:carry', onCarry)
    return () => window.removeEventListener('editor:carry', onCarry)
  }, [])

  const measure = (id: string, device: Device): R | null => {
    const root = contentRef.current
    if (!root) return null
    const el = root.querySelector(`[data-node="${id}"][data-device="${device}"]`) as HTMLElement | null
    if (!el) return null
    const b = root.getBoundingClientRect()
    let r = el.getBoundingClientRect()
    // text: the outline hugs the letters top and bottom (not the line-height space a font leaves above them),
    // so the space inside it is the same above and below
    if (el.dataset.type === 'text' || el.dataset.type === 'headline' || el.dataset.type === 'eyebrow') {
      // the lines of text only (a range over the whole element would also return the paragraph's own box)
      const lines: DOMRect[] = []
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let t = walk.nextNode(); t; t = walk.nextNode()) {
        if (!t.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(t)
        lines.push(...[...range.getClientRects()].filter((x) => x.width > 0 && x.height > 0))
      }
      if (lines.length) {
        // the letters' own top and bottom inside each line (fonts like Oswald leave a lot of room above capitals)
        const g = glyphBox(el)
        const first = lines.reduce((m, x) => (x.top < m.top ? x : m))
        const last = lines.reduce((m, x) => (x.bottom > m.bottom ? x : m))
        const k = g ? first.height / g.area : 0
        const top = Math.max(r.top, first.top + (g ? (g.fontAscent - g.ascent) * k : 0))
        const bottom = Math.min(r.bottom, last.bottom - (g ? (g.fontDescent - g.descent) * k : 0))
        if (bottom > top) r = new DOMRect(r.left, top, r.width, bottom - top)
      }
    }
    // while a dialog is open the canvas is pushed back (scaled down a little): measure in its own unscaled pixels,
    // so the outline is already in the right place when it comes forward again
    const k = b.width / (root.offsetWidth || b.width) || 1
    const box = el.parentElement?.closest<HTMLElement>('[data-node]')?.getBoundingClientRect()
    const clip = box ? { x: (box.left - b.left) / k, y: (box.top - b.top) / k, w: box.width / k, h: box.height / k } : undefined
    // only a real element next to it counts (not a style tag or an empty drop box)
    const sib = (e: Element | null) => ((e as HTMLElement | null)?.dataset?.node ? (e as HTMLElement) : null)
    const prev = sib(el.previousElementSibling)?.getBoundingClientRect()
    const next = sib(el.nextElementSibling)?.getBoundingClientRect()
    const room = {
      top: prev && prev.bottom <= r.top + 1 ? (r.top - prev.bottom) / k : Infinity,
      bottom: next && next.top >= r.bottom - 1 ? (next.top - r.bottom) / k : Infinity,
    }
    return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k, rad: cornersOf(el, r), clip, room }
  }

  // the row bar (column tabs, row actions) appears when you point at a row, and stays while the pointer is anywhere
  // inside that row, so you can reach the tabs even when they sit over an element
  const stickyRow = useRef<string | null>(null)
  {
    const hn = hover ? find(doc, hover.id) : undefined
    const direct = hn?.type === 'row' ? hn.id : hn?.type === 'column' ? parentOf(doc, hn.id)?.parentId : undefined
    if (direct) stickyRow.current = direct
    else if (!hn || !stickyRow.current || !path(doc, hn.id).some((n) => n.id === stickyRow.current)) stickyRow.current = null
  }
  const stickyRowId = stickyRow.current

  const dev: Device = view === 'all' ? focusDevice : view
  const devices: Device[] = view === 'all' ? ['desktop', 'tablet', 'mobile'] : [view]
  const sel = find(doc, selectedId)
  const hoverNode = hover ? find(doc, hover.id) : undefined
  // the section's own toolbar only shows when the pointer is on the section itself (its padding / empty space), not on a row or element inside it
  const hoverSectionId = hover && hoverNode?.type === 'section' ? hover.id : undefined
  const sectionForBar = sel?.type === 'section' ? sel : hoverSectionId ? find(doc, hoverSectionId) : undefined

  return (
    <div data-overlay className="pointer-events-none absolute inset-0 z-10">
      {/* hover outline */}
      {hover && hover.id !== selectedId && hoverNode && !drop && (() => {
        const m = measure(hover.id, hover.device)
        if (!m) return null
        const r = outset(m, hoverNode.type)
        // the name label never sits on the current selection (its outline, handles or capsule): then only the line shows
        const label = { x: r.x, y: r.y - 23, w: labelOf(hoverNode).length * 7 + 14, h: 20 }
        const sm = sel && selectedId !== hover.id ? measure(sel.id, hover.device) : null
        const so = sm ? outset(sm, sel!.type) : null
        const hits = !!so && label.x < so.x + so.w + 10 && label.x + label.w > so.x - 10 && label.y < so.y + so.h + 10 && label.y + label.h > so.y - 46
        return (
          <>
            <div className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: radius(r), boxShadow: SEL_STYLE === 'apple' ? 'inset 0 0 0 1px color-mix(in srgb, var(--brand) 60%, transparent)' : `inset 0 0 0 1px ${LEVEL_COLOR[levelOf(hoverNode.type)]}` }} />
            {hoverNode.type !== 'section' && !hits && (
              <div
                className={cx('absolute px-1.5 text-[11px] font-medium leading-[18px]', SEL_STYLE === 'apple' ? 'material rounded-[6px] text-[var(--t1)] shadow-[var(--shadow-pop)]' : 'rounded-[4px] text-white')}
                style={{ left: r.x, top: Math.max(0, r.y - (SEL_STYLE === 'apple' ? 23 : 19)), background: SEL_STYLE === 'apple' ? undefined : LEVEL_COLOR[levelOf(hoverNode.type)] }}
              >
                {labelOf(hoverNode)}
              </div>
            )}
          </>
        )
      })()}

      {/* selection outline on every visible device: it travels from the last selection to the new one */}
      {sel &&
        !carrying &&
        devices.map((d) => {
          const m = measure(sel.id, d)
          if (!m) return null
          const r = outset(m, sel.type)
          return <SelectionRing key={d + settled} id={sel.id} r={r} level={levelOf(sel.type)} strong={d === dev} fresh={settled > 0 && performance.now() - settledAt.current < 400} />
        })}

      {/* section bar: hovered or selected section */}
      {!drop && !aiBusy && (sel?.type === 'section' ? sel : sectionForBar) && !(sel && sel.type !== 'section' && path(doc, sel.id)[0]?.id === sectionForBar?.id) && (() => {
        const s = (sel?.type === 'section' ? sel : sectionForBar)!
        const r = measure(s.id, dev)
        if (!r) return null
        return <SectionBar key={s.id} id={s.id} r={r} />
      })()}

      {/* element toolbar */}
      {sel && sel.type !== 'section' && !drop && !carrying && (() => {
        const m = measure(sel.id, dev)
        if (!m) return null
        // a form's fields sit close together: their capsule goes on the form's edge, never over the field above
        const form = path(doc, sel.id).find((x) => x.type === 'form' && x.id !== sel.id)
        const fr = form ? measure(form.id, dev) : null
        return <ElementBar key={sel.id} id={sel.id} r={outset(m, sel.type)} editing={editingId === sel.id} edge={fr ? { top: fr.y, bottom: fr.y + fr.h } : undefined} />
      })()}

      {/* + on the row's right edge: one click adds a column (up to 6) */}
      {!drop && !aiBusy && (() => {
        const rowNode = hoverNode?.type === 'row' ? hoverNode : hoverNode?.type === 'column' ? find(doc, parentOf(doc, hoverNode.id)?.parentId) : sel?.type === 'row' ? sel : undefined
        if (!rowNode || rowNode.type !== 'row' || (rowNode.children?.length ?? 1) >= MAX_COLUMNS) return null
        const r = measure(rowNode.id, dev)
        if (!r) return null
        return <AddColumn key={`add-col-${rowNode.id}`} id={rowNode.id} count={rowNode.children?.length ?? 1} r={r} />
      })()}

      {/* V1 row bar: shown when the pointer is on a row or between its columns */}
      {!drop && !aiBusy && stickyRowId && (() => {
        const rowNode = find(doc, stickyRowId)
        if (!rowNode || rowNode.type !== 'row' || rowNode.id === selectedId) return null
        const r = measure(rowNode.id, dev)
        if (!r) return null
        // something inside this row is selected: its own capsule is in charge, the row's would sit on top of it
        const selInside = !!selectedId && path(doc, selectedId).some((n) => n.id === rowNode.id)
        // the row's own outline and capsule only while the pointer is on the row itself (its padding, the gap between
        // columns); on an element inside it, only the column tabs stay, so you can still reach them
        const onRow = hoverNode?.type === 'row' || hoverNode?.type === 'column'
        return <RowBar key={rowNode.id} id={rowNode.id} r={r} measure={(cid) => measure(cid, dev)} bar={!selInside && onRow} frame={onRow} />
      })()}

      {/* column resize handles for the row under the pointer (or the selected row / its column) */}
      {!drop && !aiBusy && (() => {
        const rowOf = (id?: string) => {
          if (!id) return undefined
          const trail = path(doc, id)
          return [...trail].reverse().find((n) => n.type === 'row' && (n.children?.length ?? 0) > 1)
        }
        // only when you're on the row itself (its columns / gaps) or the row is selected, never on an element inside it
        const onRow = hoverNode && (hoverNode.type === 'row' || hoverNode.type === 'column') ? rowOf(hover!.id)?.id : undefined
        const selRow = sel?.type === 'row' || sel?.type === 'column' ? rowOf(sel.id)?.id : undefined
        const rowId = resizing ?? onRow ?? selRow
        if (!rowId) return null
        return <ColumnResizer key={rowId + tick} rowId={rowId} origin={() => contentRef.current?.getBoundingClientRect() ?? null} onDragging={(v) => setResizing(v ? rowId : null)} />
      })()}

      {/* add-section buttons between sections */}
      {!drop && !aiBusy && hoverSectionId && (() => {
        const i = doc.sections.findIndex((s) => s.id === hoverSectionId)
        const r = measure(hoverSectionId, dev)
        if (!r || i < 0) return null
        return <AddBetween key={hoverSectionId + i} r={r} index={i + 1} />
      })()}

      {/* drop target: the column or section it will land in */}
      {drop?.box && (
        <div
          className="absolute rounded-[3px]"
          style={{
            left: drop.box.x,
            top: drop.box.y,
            width: drop.box.w,
            height: drop.box.h,
            background: 'color-mix(in srgb, var(--brand) 9%, transparent)',
            outline: '1.5px dashed color-mix(in srgb, var(--brand) 75%, transparent)',
            outlineOffset: -1,
          }}
        />
      )}

      {/* an empty column: its own dashed box lights up (the line runs through it) */}
      {drop?.slot && (
        <div
          className="absolute rounded-[4px]"
          style={{
            left: drop.slot.x,
            top: drop.slot.y,
            width: drop.slot.w,
            height: drop.slot.h,
            background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
            outline: '1.5px dashed var(--brand)',
            outlineOffset: -1,
            transition: 'opacity 120ms var(--ease-out)',
          }}
        />
      )}

      {/* drop indicator */}
      {drop && (
        <div className="absolute" style={{ left: drop.rect.x, top: drop.rect.y - 2, width: drop.rect.w, height: 4 }}>
          <div className="h-full rounded-full bg-[var(--brand)] shadow-[0_0_0_2px_white]" />
          <span className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--brand)] bg-white" />
        </div>
      )}
    </div>
  )
}

/**
 * The outline sits exactly on the selected element, also while it glides. Only when you pick a
 * different element does it travel there, on four springs (x, y, width, height).
 */
function SelectionRing({ id, r, level, strong, fresh }: { id: string; r: R; level: Level; strong: boolean; fresh: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const cur = useRef<R | null>(null)
  const lastId = useRef(id)
  const anims = useRef<Spring[]>([])
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    // the outline sits right on the element's edge and its ring is drawn outward, like a border around it
    const to = { x: r.x, y: r.y, w: r.w, h: r.h }
    node.style.borderRadius = radius(r) ?? ''
    const draw = () => {
      const c = cur.current!
      node.style.transform = `translate(${c.x}px, ${c.y}px)`
      node.style.width = `${c.w}px`
      node.style.height = `${c.h}px`
    }
    const from = cur.current
    // a new selection appears in place at once (no sliding from the last one); set RING_TRAVEL to bring the glide back
    const travel = RING_TRAVEL && from && lastId.current !== id
    lastId.current = id
    if (!travel) {
      // same element: follow it exactly (unless it is already travelling to it)
      if (!anims.current.length || !from) {
        cur.current = { ...to }
        draw()
      } else anims.current.forEach((a, i) => a.retarget(to[(['x', 'y', 'w', 'h'] as const)[i]]))
      return
    }
    anims.current.forEach((a) => a.stop())
    const keys = ['x', 'y', 'w', 'h'] as const
    let left = keys.length
    anims.current = keys.map((k) =>
      spring({
        from: from[k],
        to: to[k],
        response: 0.3,
        onUpdate: (v) => {
          cur.current![k] = v
          draw()
        },
        onDone: () => {
          if (--left === 0) anims.current = []
        },
      }),
    )
  }, [id, r.x, r.y, r.w, r.h, r.rad?.join()])
  useLayoutEffect(() => () => anims.current.forEach((a) => a.stop()), [])
  const color = LEVEL_COLOR[level]
  // "precise corners": a thin outline with solid corner marks, like crop marks; it frames the element without boxing it in
  const k = level === 'section' ? 22 : 15
  const rad = r.rad ?? [0, 0, 0, 0]
  return (
    <div
      ref={el}
      className={cx('absolute left-0 top-0', fresh && 'ring-in')}
      style={{
        boxShadow:
          SEL_STYLE === 'apple'
            ? strong
              ? `0 0 0 ${level === 'el' ? 2 : level === 'row' ? 1.5 : 1}px ${color}, 0 0 0 ${level === 'el' ? 3 : level === 'row' ? 2.5 : 2}px rgba(255, 255, 255, 0.55)`
              : `0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`
            : SEL_STYLE === 'focus'
            ? strong
              ? `0 0 0 2px ${color}, 0 0 0 3px rgba(255, 255, 255, 0.6)`
              : `0 0 0 1.5px color-mix(in srgb, ${color} 55%, transparent)`
            : `0 0 0 1px color-mix(in srgb, ${color} ${strong ? 75 : 45}%, transparent)`,
      }}
    >
      {strong &&
        SEL_STYLE === 'corners' &&
        ([
          ['top', 'left', 0],
          ['top', 'right', 1],
          ['bottom', 'right', 2],
          ['bottom', 'left', 3],
        ] as const).map(([v, h, i]) => (
          <span
            key={i}
            className="sel-mark"
            style={{
              [v]: -2,
              [h]: -2,
              width: k,
              height: k,
              [`border${v === 'top' ? 'Top' : 'Bottom'}`]: `3px solid ${color}`,
              [`border${h === 'left' ? 'Left' : 'Right'}`]: `3px solid ${color}`,
              [`border${v === 'top' ? 'Top' : 'Bottom'}${h === 'left' ? 'Left' : 'Right'}Radius`]: rad[i] ? rad[i] + 2 : 0,
            }}
          />
        ))}
    </div>
  )
}


function Tool({ tip, onClick, children, active, kbd, deleteFor }: { tip: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; active?: boolean; kbd?: string; deleteFor?: string }) {
  return (
    <Tooltip label={tip} kbd={kbd} side="top">
      <button
        aria-label={tip}
        aria-pressed={active}
        data-active={active ? '' : undefined}
        data-delete-for={deleteFor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cx('press flex h-7 min-w-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-1.5 text-[12px] font-medium text-white/80 hover:bg-white/12 hover:text-white', active && 'bg-white/15 text-white')}
      >
        {children}
      </button>
    </Tooltip>
  )
}

const Sep = () => <span className="sel-sep mx-0.5 h-4 w-px flex-none bg-white/15" />

function openPopover(kind: 'layouts' | 'rewrite' | 'ask', id: string, el: HTMLElement | null) {
  const r = el?.closest('button')?.getBoundingClientRect()
  if (!r) return
  setState({ popover: { kind, id, rect: { x: r.left, y: r.top, w: r.width, h: r.height } } })
}

function SectionBar({ id, r }: { id: string; r: R }) {
  const doc = useEditor((s) => s.doc)
  const s = find(doc, id)!
  const askRef = useRef<HTMLSpanElement>(null)
  // inside the section's top-left corner; short sections (headers) get it just above so it never covers their content
  const top = r.h < 150 && r.y > 46 ? r.y - 42 : r.y + 10
  return (
    <Capsule right={r.x + r.w - 10} origin="100% 0" style={{ top }}>
      <span
        draggable
        onDragStart={(e) => startDrag({ kind: 'move', id }, e)}
        onDragEnd={endDrag}
        onClick={() => setState({ selectedId: id, editingId: null })}
        className="sel-name cursor-grab active:cursor-grabbing"
        title="Drag to move"
      >
        <TypeIcon type="section" />
        {labelOf(s)}
        {s.props.masterId && <span className="rounded-[4px] bg-[var(--fill-2)] px-1 text-[10px] font-semibold uppercase tracking-wide">Master</span>}
      </span>
      <Sep />
      {/* ask right here: a small box under the capsule, what you ask changes only this section */}
      <Tool
        tip="Ask AI about this section"
        onClick={() => {
          setState({ selectedId: id, editingId: null })
          openPopover('ask', id, askRef.current)
        }}
      >
        <span ref={askRef} className="flex items-center gap-1.5">
          <MessageSquareText size={15} />
          Ask AI
        </span>
      </Tool>
      <Sep />
      <Tool tip="Move up" onClick={() => moveNode(id, -1)}>
        <ArrowUp size={15} />
      </Tool>
      <Tool tip="Move down" onClick={() => moveNode(id, 1)}>
        <ArrowDown size={15} />
      </Tool>
      <Tool tip="Duplicate" kbd="⌘D" onClick={() => duplicateNode(id)}>
        <Copy size={15} />
      </Tool>
      <Tool tip="Save as a block" onClick={() => saveBlock(find(currentDoc(), id)!)}>
        <SaveIcon size={15} />
      </Tool>
      <Tool tip="Delete" kbd="⌫" deleteFor={id} onClick={(e) => askDelete(id, e.currentTarget)}>
        <Trash2 size={15} />
      </Tool>
    </Capsule>
  )
}

/** Which formats the selected words have (the toolbar shows them as pressed, like Apple's format buttons). */
type Formats = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; link: boolean }
const NO_FORMATS: Formats = { bold: false, italic: false, underline: false, strike: false, link: false }
function useFormats(on: boolean): [Formats, () => void] {
  const [f, setF] = useState<Formats>(NO_FORMATS)
  const read = useRef(() => {})
  read.current = () => {
    const sel = window.getSelection()
    const node = sel?.anchorNode
    const el = (node?.nodeType === 3 ? node.parentElement : (node as HTMLElement | null)) ?? null
    const root = el?.closest<HTMLElement>('[contenteditable="true"]')
    if (!on || !root || !root.closest('.page-root')) return setF((x) => (x === NO_FORMATS ? x : NO_FORMATS))
    const next: Formats = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      // the cursor is in a link, or any part of the selected words is one
      link:
        (!!el?.closest('a') && root.contains(el.closest('a'))) ||
        (!!sel && sel.rangeCount > 0 && !sel.isCollapsed && [...root.querySelectorAll('a')].some((a) => sel.getRangeAt(0).intersectsNode(a))),
    }
    setF((x) => (Object.keys(next) as (keyof Formats)[]).every((k) => x[k] === next[k]) ? x : next)
  }
  useEffect(() => {
    if (!on) return
    const fn = () => read.current()
    fn()
    document.addEventListener('selectionchange', fn)
    document.addEventListener('input', fn, true)
    return () => {
      document.removeEventListener('selectionchange', fn)
      document.removeEventListener('input', fn, true)
    }
  }, [on])
  return [on ? f : NO_FORMATS, () => read.current()]
}

function ElementBar({ id, r, editing, edge }: { id: string; r: R; editing: boolean; edge?: { top: number; bottom: number } }) {
  const doc = useEditor((s) => s.doc)
  const n = find(doc, id)!
  const anchorRef = useRef<HTMLSpanElement>(null)
  const askRef = useRef<HTMLSpanElement>(null)
  const isText = TEXT_TYPES.includes(n.type)
  const inForm = path(doc, id).some((x) => x.type === 'form' && x.id !== id)
  // the capsule floats just above the outline (clear of the handles), or below when there is no room above
  const topEdge = edge?.top ?? r.y
  const above = topEdge > 46
  const top = above ? topEdge - 42 : (edge?.bottom ?? r.y + r.h) + 10
  const [fmt, refresh] = useFormats(editing)
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg)
    refresh()
  }
  const ref = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState<number | null>(null)
  useLayoutEffect(() => {
    const bar = ref.current
    const sc = document.querySelector('[data-canvas-scroller]') as HTMLElement | null
    const root = bar?.offsetParent as HTMLElement | null
    if (!bar || !sc || !root) return
    // the floating panels cover the canvas edges: keep the capsule in the part you can see
    const inset = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0
    const base = root.getBoundingClientRect().left
    const limit = sc.getBoundingClientRect().right - inset('--right-inset') - base - 8
    const minLeft = sc.getBoundingClientRect().left + inset('--left-inset') - base + 8
    // it ends on the element's right edge (wider than the element: it grows to the left)
    const x = Math.max(minLeft, Math.min(r.x + r.w - bar.offsetWidth, limit - bar.offsetWidth))
    if (left === null || Math.abs(left - x) > 0.5) setLeft(x)
  })
  return (
    <Capsule ref={ref} style={{ left: left ?? r.x, top, visibility: left === null ? 'hidden' : undefined }}>
      {/* a form's fields are reordered from the form's settings (like V1), not dragged on the page */}
      <span
        draggable={!inForm}
        onDragStart={(e) => !inForm && startDrag({ kind: 'move', id }, e)}
        onDragEnd={endDrag}
        className={cx('sel-name', !inForm && 'cursor-grab active:cursor-grabbing')}
        title={inForm ? undefined : 'Drag to move'}
      >
        <TypeIcon type={n.type} />
        {labelOf(n)}
      </span>
      {visibleParentId(doc, id) && (
        <Tool tip="Select parent" kbd="Esc" onClick={() => setState({ selectedId: visibleParentId(currentDoc(), id), editingId: null })}>
          <CornerLeftUp size={15} />
        </Tool>
      )}
      <Sep />
      <Tool tip="Ask AI to change this" kbd="⌘J" onClick={() => openPopover('ask', id, askRef.current)}>
        <span ref={askRef} className="flex items-center gap-1.5">
          <MessageSquareText size={15} />
          Ask AI
        </span>
      </Tool>
      {isText && (
        <Tool tip="Three other ways to say it" onClick={() => openPopover('rewrite', id, anchorRef.current)}>
          <span ref={anchorRef} className="flex items-center gap-1.5">
            <Shuffle size={15} />
            Rewrite
          </span>
        </Tool>
      )}
      {n.type === 'headline' && (
        <>
          <Sep />
          <HeadingLevel id={id} level={n.props.level ?? 2} />
        </>
      )}
      {editing && n.type !== 'button' && (
        <>
          <Sep />
          <Tool tip="Bold" kbd="⌘B" active={fmt.bold} onClick={() => exec('bold')}>
            <Bold size={15} />
          </Tool>
          <Tool tip="Italic" kbd="⌘I" active={fmt.italic} onClick={() => exec('italic')}>
            <Italic size={15} />
          </Tool>
          <Tool tip="Underline" kbd="⌘U" active={fmt.underline} onClick={() => exec('underline')}>
            <Underline size={15} />
          </Tool>
          <Tool tip="Strikethrough" active={fmt.strike} onClick={() => exec('strikeThrough')}>
            <Strikethrough size={15} />
          </Tool>
          <TextColor id={id} />
          <LinkTool on={fmt.link} />
        </>
      )}
      <Sep />
      <Tool tip="Move up" onClick={() => moveNode(id, -1)}>
        <ArrowUp size={15} />
      </Tool>
      <Tool tip="Move down" onClick={() => moveNode(id, 1)}>
        <ArrowDown size={15} />
      </Tool>
      <Tool tip="Duplicate" kbd="⌘D" onClick={() => duplicateNode(id)}>
        <Copy size={15} />
      </Tool>
      <Tool tip="Save as a block" onClick={() => saveBlock(find(currentDoc(), id)!)}>
        <SaveIcon size={15} />
      </Tool>
      <Tool tip="Delete" kbd="⌫" deleteFor={id} onClick={(e) => askDelete(id, e.currentTarget)}>
        <Trash2 size={15} />
      </Tool>
    </Capsule>
  )
}

function RowBar({ id, r, measure, bar = true, frame = true }: { id: string; r: R; measure: (id: string) => R | null; bar?: boolean; frame?: boolean }) {
  const doc = useEditor((st) => st.doc)
  const row = find(doc, id)
  if (!row) return null
  return (
    <>
      {frame && <div className="pointer-events-none absolute rounded-[2px]" style={{ left: r.x, top: r.y, width: r.w, height: r.h, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand) 60%, transparent)' }} />}
      {bar && <Capsule right={r.x + r.w} style={{ top: Math.max(0, r.y - 40) }}>
        <span className="sel-name">
          <TypeIcon type="row" />
          Row
        </span>
        <Sep />
        <Tool tip="Move up" onClick={() => moveNode(id, -1)}>
          <ArrowUp size={15} />
        </Tool>
        <Tool tip="Move down" onClick={() => moveNode(id, 1)}>
          <ArrowDown size={15} />
        </Tool>
        <Tool tip="Row settings" onClick={() => setState({ selectedId: id, editingId: null })}>
          <Settings2 size={15} />
        </Tool>
        <Tool tip="Duplicate" onClick={() => duplicateNode(id)}>
          <Copy size={15} />
        </Tool>
        <Tool tip="Save as a block" onClick={() => saveBlock(row)}>
          <SaveIcon size={15} />
        </Tool>
        <Tool tip="Delete" deleteFor={id} onClick={(e) => askDelete(id, e.currentTarget)}>
          <Trash2 size={15} />
        </Tool>
      </Capsule>}
      {/* like V1: a small tab flush in each column's top-left corner moves that column's content */}
      {(row.children?.length ?? 0) > 1 &&
        row.children!.map((c) => {
          const cr = measure(c.id)
          if (!cr) return null
          // the column's own choice, else the row's (a row set to Stretch shows Stretch on each column)
          const v = c.style.desktop.vAlign ?? row.style.desktop.vAlign ?? 'start'
          return (
            <div
              key={c.id}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute flex overflow-hidden rounded-br-[6px] bg-[var(--raised)] text-[var(--t2)] shadow-[var(--shadow-card)]"
              style={{ left: cr.x, top: cr.y }}
            >
              {(
                [
                  ['start', AlignStartHorizontal, 'Align top'],
                  ['center', AlignCenterHorizontal, 'Align middle'],
                  ['end', AlignEndHorizontal, 'Align bottom'],
                  ['stretch', StretchVertical, 'Stretch: the card fills the column'],
                ] as const
              ).map(([val, Icon, tip]) => (
                <Tooltip key={val} label={tip}>
                  <button
                    aria-label={tip}
                    onClick={() => setStyle(c.id, 'vAlign', val, 'desktop')}
                    className={cx('press flex h-7 w-8 items-center justify-center hover:bg-[var(--fill-1)] hover:text-[var(--t1)]', v === val && 'bg-[var(--brand-tint)] text-[var(--brand-ink)]')}
                  >
                    <Icon size={15} />
                  </button>
                </Tooltip>
              ))}
            </div>
          )
        })}
    </>
  )
}

/** Link for the selected words: opens the link panel (no browser prompt). */
function LinkTool({ on = false }: { on?: boolean }) {
  const btn = useRef<HTMLSpanElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  // double-clicking a linked word on the page opens its link settings
  useEffect(() => {
    const open = () => setAnchor(btn.current?.closest('button') ?? null)
    window.addEventListener('editor:edit-link', open)
    return () => window.removeEventListener('editor:edit-link', open)
  }, [])
  return (
    <>
      <Tool tip="Link" active={!!anchor || on} onClick={() => setAnchor(anchor ? null : (btn.current?.closest('button') ?? null))}>
        <span ref={btn} className="flex items-center">
          <Link2 size={14} />
        </span>
      </Tool>
      {anchor && <LinkPanel anchor={anchor} onClose={() => setAnchor(null)} />}
    </>
  )
}

function AddColumn({ id, count, r }: { id: string; count: number; r: R }) {
  return (
    <div className="pointer-events-auto absolute flex items-center" style={{ left: r.x + r.w, top: r.y + r.h / 2, transform: 'translate(-50%, -50%)' }}>
      <Tooltip label={`Add a column (${count + 1} of ${MAX_COLUMNS})`} side="top">
        <button
          aria-label="Add a column"
          onClick={(e) => {
            e.stopPropagation()
            setColumnCount(id, count + 1)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="press flex h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-[0_0_0_2px_white,var(--shadow-pop)] hover:bg-[#2f6fe0]"
        >
          <Plus size={14} />
        </button>
      </Tooltip>
    </div>
  )
}

function HeadingLevel({ id, level }: { id: string; level: number }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <Tool tip="Heading level" active={open} onClick={() => setOpen((o) => !o)}>
        <span className="text-[12px] font-semibold">H{level}</span>
        <ChevronDown size={12} className="-ml-0.5 text-white/60" />
      </Tool>
      {open && (
        <span className="menu-in material-dark absolute left-0 top-9 z-10 flex flex-col rounded-[8px] bg-[var(--hud)] p-1 shadow-[var(--shadow-pop)]">
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <button
              key={l}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setProps(id, { level: l as 1 }, false)
                setOpen(false)
              }}
              className={cx('press flex h-7 w-24 items-center justify-between rounded-[6px] px-2 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white', level === l && 'bg-white/15 text-white')}
            >
              Heading {l}
              <span className="text-white/45">H{l}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

/**
 * Colour for the selected words (or the whole text when nothing is selected), with the
 * full colour picker. The text selection is remembered while you use the picker.
 */
function TextColor({ id }: { id: string }) {
  const theme = useEditor((st) => st.doc.theme)
  // the whole text's colour lives on the element (like its settings), so it shows here and Clear removes it
  const own = useEditor((st) => find(st.doc, id)?.style.desktop.color)
  const btn = useRef<HTMLSpanElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState<string | undefined>(undefined)
  const saved = useRef<[number, number] | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    const read = () => {
      const root = document.querySelector('.page-root [contenteditable="true"]')
      const sel = window.getSelection()
      const node = sel?.anchorNode
      if (!root || !node || !root.contains(node)) return
      const el = (node.nodeType === 3 ? node.parentElement : node) as HTMLElement | null
      // an explicit colour on the words (font colour or inline style) inside this text, else none
      const words = el?.closest('font[color], [style*="color"]')
      // older pages: the whole text wrapped in one colour
      const whole = root.childNodes.length === 1 && root.firstElementChild?.matches('font[color]') ? root.firstElementChild : null
      const pick = words && root.contains(words) && words !== root ? words : whole
      setCurrent(pick ? getComputedStyle(pick).color : null)
    }
    read()
    document.addEventListener('selectionchange', read)
    return () => document.removeEventListener('selectionchange', read)
  }, [])
  const tokens: Record<string, string> = { ink: theme.ink, muted: theme.muted, primary: theme.primary, 'on-primary': theme.onPrimary, bg: theme.bg, surface: theme.surface }

  const editable = () => document.querySelector('.page-root [contenteditable="true"]') as HTMLElement | null
  // the selection is kept as character positions, so it survives the text being redrawn after each change
  const restore = () => {
    const root = editable()
    const sel = window.getSelection()
    if (!root || !sel) return null
    const r = document.createRange()
    if (saved.current) {
      const a = pointAt(root, saved.current[0])
      const b = pointAt(root, saved.current[1])
      r.setStart(a.node, a.offset)
      r.setEnd(b.node, b.offset)
    } else r.selectNodeContents(root) // no words were selected: colour the whole text
    root.focus({ preventScroll: true })
    sel.removeAllRanges()
    sel.addRange(r)
    return root
  }
  const open = () => {
    const sel = window.getSelection()
    const root = editable()
    const range = sel && sel.rangeCount && root && root.contains(sel.anchorNode) ? sel.getRangeAt(0) : null
    saved.current = range && !range.collapsed && root ? [offsetOf(root, range.startContainer, range.startOffset), offsetOf(root, range.endContainer, range.endOffset)] : null
    // every word selected is the same as none: it colours the whole element
    if (saved.current && root && saved.current[0] === 0 && saved.current[1] >= (root.textContent ?? '').length) saved.current = null
    const node = range?.startContainer
    const el = node ? ((node.nodeType === 3 ? node.parentElement : node) as HTMLElement) : root
    setValue(el ? getComputedStyle(el).color : undefined)
    setAnchor(btn.current?.closest('button') ?? null)
  }
  const apply = (c: string | undefined) => {
    const root = restore()
    if (!root) return
    if (!saved.current) {
      // no words selected: the colour is the whole element's, not hidden inline on the words
      const had = root.querySelectorAll('font[color]').length
      root.querySelectorAll('font[color]').forEach((f) => f.replaceWith(...Array.from(f.childNodes)))
      if (had) root.dispatchEvent(new Event('input', { bubbles: true }))
      setStyle(id, 'color', c ? (tokens[c] ?? c) : undefined, 'desktop')
      window.getSelection()?.collapseToEnd()
      setValue(c)
      setCurrent(null)
      return
    }
    if (!c) {
      // remove colour from the selected words, keep bold / italic
      const sel = window.getSelection()!
      const r = sel.getRangeAt(0)
      root.querySelectorAll('font[color]').forEach((f) => {
        if (r.intersectsNode(f)) f.replaceWith(...Array.from(f.childNodes))
      })
      root.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      document.execCommand('styleWithCSS', false, 'false')
      document.execCommand('foreColor', false, tokens[c] ?? c)
    }
    setValue(c)
    setCurrent(c ? (tokens[c] ?? c) : null)
  }
  return (
    <>
      <Tool tip="Text color" active={!!anchor} onClick={() => (anchor ? setAnchor(null) : open())}>
        {/* like V1: a swatch of the selected words' colour, or a red slash when they have none of their own */}
        <span ref={btn} className="flex items-center">
          <Swatch color={current ?? (own ? (tokens[own] ?? cssColor(own) ?? null) : null)} />
        </span>
      </Tool>
      {anchor && <ColorPicker value={value} onChange={apply} anchor={anchor} onClose={() => setAnchor(null)} />}
    </>
  )
}

/** A colour dot like V1's: the colour itself, or white with a red slash for "none". */
function Swatch({ color }: { color: string | null }) {
  return (
    <span
      className="block h-4 w-4 rounded-full"
      style={{
        background: color ?? 'linear-gradient(135deg, #fff 45%, #e5484d 45%, #e5484d 55%, #fff 55%)',
        boxShadow: '0 0 0 1.5px rgba(255,255,255,.85), 0 0 0 2.5px rgba(0,0,0,.25)',
      }}
    />
  )
}

function AddBetween({ r, index }: { r: R; index: number }) {
  return (
    <div className="pointer-events-auto absolute flex items-center justify-center" style={{ left: r.x, top: r.y + r.h - 12, width: r.w, height: 24 }}>
      <Tooltip label="Add a section here" side="top">
        <button
          onClick={(e) => {
            e.stopPropagation()
            const sec = ALL_ITEMS.find((i) => i.id === 'section')!.make()
            update((d) => insert(d, ROOT, index, sec))
            markAdded(sec.children?.[0]?.children?.[0]?.id ?? sec.id)
            setState({ selectedId: null, editingId: null, leftTab: 'elements', panel: null })
            toast('Added a section', true)
            window.dispatchEvent(new CustomEvent('editor:reveal', { detail: sec.id }))
          }}
          className="press flex h-6 items-center gap-1 rounded-full bg-[var(--brand)] pl-1.5 pr-2.5 text-[12px] font-medium text-white shadow-[0_0_0_2px_white,var(--shadow-pop)] hover:bg-[var(--brand-hover)]"
        >
          <Plus size={13} />
          Section
        </button>
      </Tooltip>
    </div>
  )
}
