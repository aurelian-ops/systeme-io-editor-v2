import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PageView } from '../render/PageView'
import { BadgeLink } from '../render/SioBadge'
import { getState, select, setCompare, setState, useEditor } from '../store'
import { DEVICE_LABEL, DEVICE_WIDTH, DEVICES, type Device } from '../types'
import { Overlay } from './Overlay'
import { BuildingSkeleton, EmptyState } from './EmptyState'
import { InkWait } from './InkWait'
import { dragPayload, dropAt, endDrag, isSectionPayload } from '../dnd'
import { find, ROOT } from '../tree'
import { askForCode } from '../elements/rawhtml'
import { AiThread } from '../ai/AiThread'
import { VariationsPopover } from './Variations'
import { TextOptionsPopover } from './TextOptions'
import { AskPopover } from './AskPopover'
import { PopupCanvasLayer } from '../panels/PopupsPanel'
import { spring } from '../../ui/motion'
import { useTheme } from '../../ui/theme'
import { useJourney } from '../ai/journeyState'
import { JourneyList, JourneyStage } from '../ai/Journey'
import { usePanelView } from '../ai/ChatsUI'

/**
 * The AI panel slides in from the right. A CSS transition (spring curve) is interruptible by itself,
 * so there is no animation state to get out of step: what you see always follows the AI button.
 */
function ThreadDock({ open }: { open: boolean }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  if (open && !mounted) setMounted(true)
  useEffect(() => {
    if (!open) return setShown(false)
    // one frame off-screen first, so it slides in instead of popping
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [open])
  if (!mounted) return null
  // floats over the canvas like the left panel, so the page's reflection shows through its glass
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 top-12 z-30 flex w-[340px] justify-end overflow-clip">
      <div
        className="flex h-full"
        style={{ transform: shown ? 'none' : 'translateX(356px)', transition: 'transform 340ms var(--ease-spring)' }}
        onTransitionEnd={(e) => e.target === e.currentTarget && !open && setMounted(false)}
      >
        <AiThread />
      </div>
    </div>
  )
}

/**
 * The page, softly reflected under the floating panels: each section's colour and each large photo,
 * blurred, at the same height as on the page. It scrolls with the page, so the glass panels always
 * have the page's own colours moving behind them (like Apple Music picking up the album art).
 */
function Reflection({ contentRef, device, tick, doc }: { contentRef: React.RefObject<HTMLDivElement | null>; device: Device; tick: number; doc: unknown }) {
  const theme = useTheme()
  const [shapes, setShapes] = useState<{ top: number; height: number; bg: string }[]>([])
  useLayoutEffect(() => {
    const root = contentRef.current
    const frame = root?.querySelector(`.page-root[data-device="${device}"]`)
    if (!root || !frame) return setShapes([])
    const base = root.getBoundingClientRect()
    const out: { top: number; height: number; bg: string }[] = []
    // in dark mode only colour and photos glow; a white or beige section would wash the panels out to grey
    const dark = theme === 'dark'
    frame.querySelectorAll<HTMLElement>(':scope > [data-node]').forEach((sec) => {
      const r = sec.getBoundingClientRect()
      const cs = getComputedStyle(sec)
      if (cs.backgroundImage === 'none' && dark && isLight(cs.backgroundColor)) return
      out.push({ top: r.top - base.top, height: r.height, bg: cs.backgroundImage !== 'none' ? `${cs.backgroundImage} center / cover` : cs.backgroundColor })
    })
    const add = (el: Element, src: string | null | undefined) => {
      const r = el.getBoundingClientRect()
      if (!src || r.width < 120 || r.height < 80) return
      out.push({ top: r.top - base.top, height: r.height, bg: `url("${src}") center / cover` })
    }
    frame.querySelectorAll<HTMLImageElement>('img').forEach((im) => add(im, im.currentSrc))
    // videos can't be read from the page, so they reflect their thumbnail (what you see before play)
    frame.querySelectorAll<HTMLIFrameElement>('iframe').forEach((f) => add(f, videoThumb(f.src)))
    frame.querySelectorAll<HTMLVideoElement>('video').forEach((v) => add(v, v.poster || videoFrame(v)))
    setShapes((cur) => (JSON.stringify(cur) === JSON.stringify(out) ? cur : out))
  }, [contentRef, device, tick, doc, theme])
  if (!shapes.length) return null
  const strip = (side: 'left' | 'right') => (
    <div className="reflection" style={{ [side]: 0, width: `calc(var(--${side}-inset, 0px) + 200px)` }}>
      {shapes.map((s, i) => (
        <span key={i} style={{ top: s.top, height: s.height, background: s.bg }} />
      ))}
    </div>
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {strip('left')}
      {strip('right')}
    </div>
  )
}

/** A light colour (white, cream, pale grey), by perceived brightness. */
function isLight(c: string) {
  const m = c.match(/\d+(\.\d+)?/g)
  if (!m || (m[3] !== undefined && Number(m[3]) < 0.1)) return true
  const [r, g, b] = m.map(Number)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

/** YouTube and Vimeo thumbnails for an embed URL. */
function videoThumb(src: string) {
  const yt = src.match(/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`
  const vm = src.match(/player\.vimeo\.com\/video\/(\d+)/)
  if (vm) return `https://vumbnail.com/${vm[1]}.jpg`
  return null
}

/** The current frame of an uploaded video (skipped when the file comes from another site). */
function videoFrame(v: HTMLVideoElement) {
  if (v.readyState < 2 || !v.videoWidth) return null
  try {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = Math.round((160 * v.videoHeight) / v.videoWidth)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

/** While comparing: a quiet label so nobody edits the old version by mistake. */
function CompareLabel() {
  return (
    <div className="fade-in pointer-events-none absolute inset-x-0 top-[60px] z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--hud)] py-1.5 pl-3 pr-1.5 text-[12px] font-medium text-white shadow-[var(--shadow-pop)]">
        Before the AI change
        <button onClick={() => setCompare(false)} className="press rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] hover:bg-white/25">
          Show after
        </button>
      </div>
    </div>
  )
}

function CanvasPopovers() {
  const p = useEditor((s) => s.popover)
  if (!p) return null
  const r = p.rect
  const anchor = { getBoundingClientRect: () => new DOMRect(r.x, r.y, r.w, r.h), contains: () => false } as unknown as HTMLElement
  const close = () => setState({ popover: null })
  return p.kind === 'layouts' ? (
    <VariationsPopover key={p.id} sectionId={p.id} anchor={anchor} onClose={close} />
  ) : p.kind === 'ask' ? (
    <AskPopover key={p.id} nodeId={p.id} anchor={anchor} onClose={close} />
  ) : (
    <TextOptionsPopover key={p.id} nodeId={p.id} anchor={anchor} onClose={close} />
  )
}
import { Monitor, Smartphone, Tablet } from 'lucide-react'

export interface DropHint {
  parentId: string
  index: number
  rect: { x: number; y: number; w: number }
  /** the column or section it will land in, lit up while you drag (like V1) */
  box?: { x: number; y: number; w: number; h: number }
  /** an empty column's dashed box: it lights up as the exact spot (no line) */
  slot?: { x: number; y: number; w: number; h: number }
  device: Device
}

// like V1, a button's text is written in its settings (left panel), not on the page
const TEXT_TYPES = ['headline', 'text', 'eyebrow', 'list']

/** A bullet list opens for typing with the caret in the bullet you clicked, where you clicked. */
function caretWhereClicked(type: string, x: number, y: number) {
  if (type !== 'list') return
  requestAnimationFrame(() => {
    const r = document.caretRangeFromPoint?.(x, y)
    const li = (r?.startContainer.nodeType === 3 ? r.startContainer.parentElement : (r?.startContainer as HTMLElement | undefined))?.closest<HTMLElement>('[data-li][contenteditable="true"]')
    if (!r || !li) return
    li.focus({ preventScroll: true })
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
  })
}
const NO_BUILD: string[] = []

export function Canvas() {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const editingId = useEditor((s) => s.editingId)
  const building = useEditor((s) => s.building)
  const focusDevice = useEditor((s) => s.focusDevice)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  const [hover, setHover] = useState<{ id: string; device: Device } | null>(null)
  const [drop, setDrop] = useState<DropHint | null>(null)
  const [tick, setTick] = useState(0)
  const [emptyOver, setEmptyOver] = useState(false)

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // re-measure overlays whenever frame content resizes (images loading, typing)
  useEffect(() => {
    const el = content.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTick((t) => t + 1))
    })
    el.querySelectorAll('.page-root').forEach((f) => ro.observe(f))
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [view, doc.sections.length])

  // scroll a node into view when the AI or the library adds it
  useEffect(() => {
    const reveal = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      requestAnimationFrame(() => {
        const dev = getState().view === 'all' ? getState().focusDevice : getState().view
        const el = content.current?.querySelector(`[data-node="${id}"][data-device="${dev}"]`) as HTMLElement | null
        if (!el || !scroller.current) return
        const r = el.getBoundingClientRect()
        const s = scroller.current.getBoundingClientRect()
        if (r.top < s.top + 88 || r.bottom > s.bottom - 120) {
          scroller.current.scrollTo({ top: scroller.current.scrollTop + r.top - s.top - 128, behavior: 'smooth' })
        }
      })
    }
    const clear = () => setDrop(null)
    window.addEventListener('editor:reveal', reveal)
    window.addEventListener('editor:dragend', clear)
    return () => {
      window.removeEventListener('editor:reveal', reveal)
      window.removeEventListener('editor:dragend', clear)
    }
  }, [])

  // switching device: the frame springs from its old width to the new one and the page reflows as it goes
  const frame = useRef<HTMLDivElement>(null)
  const lastFrame = useRef<{ view: string; w: number } | null>(null)
  useLayoutEffect(() => {
    const el = frame.current
    const prev = lastFrame.current
    if (view === 'all' || !el) return void (lastFrame.current = null)
    const z = parseFloat(el.style.zoom) || 1
    const target = DEVICE_WIDTH[view]
    lastFrame.current = { view, w: target * z }
    if (!prev || prev.view === view) return
    const s = spring({
      from: prev.w / z,
      to: target,
      response: 0.38,
      onUpdate: (w) => (el.style.width = `${w}px`),
    })
    return () => s.stop()
  }, [view])

  const devices: Device[] = view === 'all' ? DEVICES : [view]
  const pad = view === 'all' ? 32 : 40
  const chatsList = usePanelView() === 'list'
  // while a new page is decided and built, the outline on the left is the whole interface: the chat waits until it is ready
  const journeyPhase = useJourney().phase
  const inJourney = journeyPhase !== null && journeyPhase !== 'ready'
  const dockOpen = useEditor((s) => s.threadOpen && !inJourney && (chatsList || s.aiTurns.length > 0 || s.doc.sections.length > 0 || (s.aiTurns[s.aiTurns.length - 1]?.directions?.length ?? 0) > 0 || (s.aiBusy && !!s.pending && s.pending.base.sections.length === 0)))
  // the room the AI panel takes springs open and shut, and the page's zoom follows it frame by frame (no jump)
  const [right, setRight] = useState(dockOpen ? 340 : 0)
  const rightAnim = useRef<ReturnType<typeof spring> | null>(null)
  const rightNow = useRef(right)
  useEffect(() => {
    rightAnim.current?.stop()
    rightAnim.current = spring({
      from: rightNow.current,
      to: dockOpen ? 340 : 0,
      response: 0.34,
      onUpdate: (v) => {
        rightNow.current = v
        document.documentElement.style.setProperty('--right-inset', `${v}px`)
        setRight(v)
      },
    })
    return () => rightAnim.current?.stop()
  }, [dockOpen])
  const inset = useEditor((s) => s.leftInset) + right
  const zoomFor = (d: Device) => {
    if (view === 'all') {
      const total = DEVICES.reduce((a, x) => a + DEVICE_WIDTH[x], 0)
      return Math.max(0.28, Math.min(0.62, (width - inset - pad * 2 - 100) / total))
    }
    return Math.min(1, (width - inset - pad * 2) / DEVICE_WIDTH[d])
  }

  const nodeAt = (target: EventTarget | null) => {
    let el = (target as HTMLElement | null)?.closest?.('[data-node]') as HTMLElement | null
    // like V1, a row and its columns are one element: the empty part of a column picks the row
    if (el?.dataset.type === 'column') el = el.parentElement?.closest('[data-node]') as HTMLElement | null
    if (!el) return null
    return { id: el.dataset.node!, device: el.dataset.device as Device, type: el.dataset.type!, el }
  }

  // toolbars sit just outside their element: give the pointer a moment to cross the gap before they go away
  const leaveTimer = useRef<number>(undefined)
  const clearHoverSoon = () => {
    if (leaveTimer.current) return
    leaveTimer.current = window.setTimeout(() => {
      leaveTimer.current = undefined
      setHover(null)
    }, 350)
  }
  const keepHover = () => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = undefined
  }
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])
  // a new selection (a duplicate, a move, a click) drops the old hover outline, so only one thing looks picked;
  // the next pointer move brings hover back
  const selectedNow = useEditor((s) => s.selectedId)
  useEffect(() => setHover(null), [selectedNow])

  const onPointerMove = (e: React.PointerEvent) => {
    if (getState().compareBefore) return
    if (dragPayload) return
    // keep the current hover while the pointer is on a toolbar
    if ((e.target as HTMLElement).closest('[data-overlay] .pointer-events-auto')) return keepHover()
    const n = nodeAt(e.target)
    if (!n) return clearHoverSoon()
    keepHover()
    if (hover?.id !== n.id || hover.device !== n.device) setHover({ id: n.id, device: n.device })
  }

  const lastClick = useRef<{ t: number; x: number; y: number } | null>(null)
  const onClick = (e: React.MouseEvent) => {
    if (getState().compareBefore) return
    const n = nodeAt(e.target)
    if (!n) {
      if (!(e.target as HTMLElement).closest('[data-overlay]')) select(null)
      return
    }
    e.preventDefault()
    if (view === 'all' && n.device !== focusDevice) setState({ focusDevice: n.device })
    // an empty Raw HTML opens its code editor straight away
    if ((e.target as HTMLElement).closest('[data-code-add]')) askForCode(n.id)
    const s = getState()
    // a double-click on a linked word: select the whole link and open its settings. The first click can redraw the
    // text for typing, which resets the browser's own double-click, so two quick clicks on the same spot are timed here
    const onLink = (e.target as HTMLElement).closest<HTMLAnchorElement>('.page-root a:not(.sio-btn)')
    const prev = lastClick.current
    lastClick.current = { t: e.timeStamp, x: e.clientX, y: e.clientY }
    const twice = !!prev && e.timeStamp - prev.t < 450 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 6
    const link = onLink && (twice || e.detail >= 2) ? onLink : null
    if (link && TEXT_TYPES.includes(n.type)) {
      // which link of this text it is: starting to type redraws the text, so it is found again by its position
      const nth = [...n.el.querySelectorAll('a:not(.sio-btn)')].indexOf(link)
      if (s.editingId !== n.id) setState({ selectedId: n.id, editingId: n.id })
      requestAnimationFrame(() => {
        const host = document.querySelector<HTMLElement>(`[data-canvas-content] [data-node="${n.id}"][data-device="${n.device}"]`)
        const now = (link.isConnected ? link : host?.querySelectorAll<HTMLAnchorElement>('a:not(.sio-btn)')[nth]) ?? link
        const r = document.createRange()
        r.selectNodeContents(now)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
        window.dispatchEvent(new CustomEvent('editor:edit-link'))
      })
      return
    }
    if (s.editingId === n.id) return
    if (TEXT_TYPES.includes(n.type) && (s.selectedId === n.id || e.detail >= 2)) {
      setState({ selectedId: n.id, editingId: n.id })
      caretWhereClicked(n.type, e.clientX, e.clientY)
      return
    }
    setState({ selectedId: n.id, editingId: TEXT_TYPES.includes(n.type) ? n.id : null })
    caretWhereClicked(n.type, e.clientX, e.clientY)
  }

  /* ---------------- Drag and drop ---------------- */

  const computeDrop = useCallback((e: React.DragEvent): DropHint | null => {
    const p = dragPayload
    if (!p || !content.current) return null
    const base = content.current.getBoundingClientRect()
    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const frame = under?.closest('.page-root') as HTMLElement | null
    if (!frame) return null
    const device = frame.dataset.device as Device
    const rel = (r: DOMRect) => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height })

    const between = (container: HTMLElement | null, kids: HTMLElement[], parentId: string, frameRect?: DOMRect): DropHint => {
      let index = kids.length
      for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect()
        if (e.clientY < r.top + r.height / 2) {
          index = i
          break
        }
      }
      const cr = rel(frameRect ?? container!.getBoundingClientRect())
      let y: number
      if (!kids.length) y = cr.y + cr.h / 2
      else if (index < kids.length) y = rel(kids[index].getBoundingClientRect()).y - (index === 0 ? 0 : 0)
      else {
        const r = rel(kids[kids.length - 1].getBoundingClientRect())
        y = r.y + r.h
      }
      const empty = !kids.length ? (container?.querySelector(':scope > [data-empty-drop]') as HTMLElement | null) : null
      if (empty) {
        // the line goes through the middle of the empty column's dashed box, the exact spot it lands in
        const sr = rel(empty.getBoundingClientRect())
        return { parentId, index, device, rect: { x: sr.x, y: sr.y + sr.h / 2, w: sr.w }, slot: sr }
      }
      return { parentId, index, device, rect: { x: cr.x, y, w: cr.w }, box: parentId === ROOT ? undefined : cr }
    }

    const sections = Array.from(frame.children) as HTMLElement[]
    if (isSectionPayload(p)) return between(null, sections, ROOT, frame.getBoundingClientRect())

    // the nearest section or column under the pointer; like V1, rows can go inside a column (nested layouts)
    const moving = p.kind === 'move' ? p.id : null
    // like V1, a form is closed: nothing is dropped into it, and its fields only move within it (to reorder them)
    const formOf = (x: Element | null | undefined) => (x?.closest('[data-type="form"]') as HTMLElement | null) ?? null
    const movingForm = moving ? formOf(frame.querySelector(`[data-node="${moving}"]`)?.parentElement) : null
    let el = under?.closest('[data-node]') as HTMLElement | null
    while (el) {
      const t = el.dataset.type
      // never into the thing being moved
      const inside = moving && el.closest(`[data-node="${moving}"]`)
      const closed = t === 'column' && formOf(el) !== movingForm
      if (!inside && !closed && (t === 'section' || t === 'column')) break
      el = el.parentElement?.closest('[data-node]') as HTMLElement | null
    }
    if (movingForm && formOf(el) !== movingForm) return null
    if (!el) return between(null, sections, ROOT, frame.getBoundingClientRect())
    const parentId = el.dataset.node!
    const inner = el.dataset.type === 'section' ? (el.firstElementChild as HTMLElement) : (el.firstElementChild as HTMLElement)
    let kids = Array.from(inner.children).filter((k) => (k as HTMLElement).dataset?.node) as HTMLElement[]
    // like V1, nothing goes below a form's submit button: the last place offered is just above it
    if (formOf(el)) {
      const btn = kids.findIndex((k) => k.dataset.type === 'button')
      if (btn >= 0) kids = kids.slice(0, btn)
    }
    return between(inner, kids, parentId)
  }, [])

  // while dragging, the canvas scrolls by itself when the pointer nears its top or bottom edge (faster the closer it
  // gets), so an element can be carried anywhere on a long page
  const dragY = useRef<number | null>(null)
  const autoScroll = useRef(0)
  const stopAutoScroll = () => {
    cancelAnimationFrame(autoScroll.current)
    autoScroll.current = 0
    dragY.current = null
  }
  const runAutoScroll = () => {
    const el = scroller.current
    const y = dragY.current
    if (!el || y === null || !dragPayload) return stopAutoScroll()
    const r = el.getBoundingClientRect()
    const EDGE = 80
    const top = y - r.top
    const bottom = r.bottom - y
    const speed = top < EDGE ? -Math.ceil(((EDGE - Math.max(0, top)) / EDGE) * 22) : bottom < EDGE ? Math.ceil(((EDGE - Math.max(0, bottom)) / EDGE) * 22) : 0
    if (speed) el.scrollTop += speed
    autoScroll.current = requestAnimationFrame(runAutoScroll)
  }
  useEffect(() => {
    const end = () => stopAutoScroll()
    window.addEventListener('dragend', end)
    window.addEventListener('drop', end)
    return () => (window.removeEventListener('dragend', end), window.removeEventListener('drop', end), stopAutoScroll())
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    if (!dragPayload) return
    e.preventDefault()
    dragY.current = e.clientY
    if (!autoScroll.current) autoScroll.current = requestAnimationFrame(runAutoScroll)
    if (getState().doc.sections.length === 0) return setEmptyOver(true)
    const h = computeDrop(e)
    setDrop((d) => (d && h && d.parentId === h.parentId && d.index === h.index && d.device === h.device ? d : h))
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const p = dragPayload
    const h = computeDrop(e)
    setDrop(null)
    setEmptyOver(false)
    endDrag()
    if (p && getState().doc.sections.length === 0) return dropAt(p, ROOT, 0)
    if (!p || !h) return
    if (h.parentId !== ROOT && !find(getState().doc, h.parentId)) return
    dropAt(p, h.parentId, h.index)
  }

  const comparing = useEditor((s) => s.compareBefore && !!s.pending)
  const before = useEditor((s) => s.pending?.base)
  const shown = comparing && before ? before : doc
  const generating = useEditor((s) => s.aiBusy && !!s.pending && s.pending.base.sections.length === 0)
  // the AI asked its questions before building a new page: the chat shows them (with the answers to tap)
  const asking = useEditor((st) => { const t = st.aiTurns[st.aiTurns.length - 1]; return !!(t?.questions?.length || t?.directions?.length) && t.status === 'answered' })
  // while the AI waits for your answers the page stays in its "being built" state (never back to the first screen)
  const empty = doc.sections.length === 0 && !generating && !asking
  // a new page being decided (looks, then the plan): the canvas shows the looks instead of the page
  // the canvas shows the looks only when there are looks to pick (a direct build shows the page being made)
  const hasLooks = useEditor((s) => !!s.aiTurns[s.aiTurns.length - 1]?.directions?.length)
  const journey = journeyPhase === 'looks' || (journeyPhase === 'writing' && hasLooks)

  return (
    <div className="relative flex min-w-0 flex-1">
    <div className="relative flex min-w-0 flex-1 flex-col bg-[var(--canvas)]">
      <div
        ref={scroller}
        data-canvas-scroller
        className="scroll-thin relative flex-1 overflow-auto"
        onPointerMove={onPointerMove}
        onPointerLeave={clearHoverSoon}
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!scroller.current?.contains(e.relatedTarget as globalThis.Node)) {
            setDrop(null)
            setEmptyOver(false)
          }
        }}
        onDrop={onDrop}
      >
        {journey ? (
          <div
            className="relative mx-auto min-w-full"
            style={{ padding: `${pad + 48}px ${pad}px 180px`, paddingLeft: `calc(var(--left-inset, 0px) + ${pad}px)`, paddingRight: `calc(var(--right-inset, 0px) + ${pad}px)` }}
          >
            <JourneyStage z={zoomFor('desktop')} avail={width - inset - pad * 2} />
          </div>
        ) : empty ? (
          <EmptyState dropping={emptyOver} />
        ) : (
          <div
            ref={content}
            data-canvas-content
            className="relative mx-auto flex w-max min-w-full items-start justify-center gap-12"
            // the panel floats over the canvas: centre the page in the part you can see
            style={{
              padding: `${pad + 48}px ${pad}px 180px`,
              paddingLeft: `calc(var(--left-inset, 0px) + ${pad}px)`,
              paddingRight: `calc(var(--right-inset, 0px) + ${pad}px)`,
            }}
          >
            <Reflection contentRef={content} device={view === 'all' ? focusDevice : view} tick={tick} doc={shown} />
            {devices.map((d) => {
              const z = zoomFor(d)
              const page = (
                <div className="relative">
                  <PageView doc={shown} device={d} editable={!comparing} editingId={comparing ? null : editingId} building={comparing ? NO_BUILD : building} />
                  {/* while a new page is written: ink in water to stir, under the sections as they arrive (a question pending keeps the quiet skeleton) */}
                  {generating && !asking && <InkWait height={doc.sections.length ? 440 : 760} />}
                  {asking && <BuildingSkeleton count={Math.max(1, 3 - doc.sections.length)} />}
                </div>
              )
              return (
                <div key={view === 'all' ? d : 'single'} className="relative z-[1] flex flex-none flex-col gap-2.5">
                  {view === 'all' && (
                    <button
                      onClick={() => setState({ focusDevice: d })}
                      className={`press flex items-center gap-1.5 self-start rounded-[6px] px-1.5 py-0.5 text-[12px] font-medium ${focusDevice === d ? 'text-[var(--t1)]' : 'text-[var(--t3)] hover:text-[var(--t1)]'}`}
                    >
                      {d === 'desktop' ? <Monitor size={13} /> : d === 'tablet' ? <Tablet size={13} /> : <Smartphone size={13} />}
                      {DEVICE_LABEL[d]}
                      <span className="tnum text-[var(--t4)]">{DEVICE_WIDTH[d]}</span>
                    </button>
                  )}
                  <div
                    ref={view === 'all' ? undefined : frame}
                    data-page-frame
                    className="overflow-hidden bg-white"
                    style={{
                      width: DEVICE_WIDTH[d],
                      zoom: z,
                      borderRadius: d === 'mobile' ? 28 : 10,
                      boxShadow: view === 'all' && focusDevice === d ? '0 0 0 2px var(--brand), var(--shadow-frame)' : 'var(--shadow-frame)',
                      transition: 'box-shadow 160ms var(--ease-out), border-radius 300ms var(--ease-out)',
                    }}
                  >
                    {page}
                  </div>
                </div>
              )
            })}
            {!comparing && <Overlay contentRef={content} hover={hover} drop={drop} tick={tick} />}
          </div>
        )}
      </div>
      {/* like V1, the affiliate badge shows while editing too: pinned to the canvas's bottom-right corner,
          outside the page so it never covers your work (Preview and the live page keep it sticky on the page) */}
      {shown.settings?.affiliateBadge && (
        <div className="pointer-events-none absolute z-[5]" style={{ bottom: 20, right: 'calc(var(--right-inset, 0px) + 20px)' }}>
          <BadgeLink editor />
        </div>
      )}
      <PopupCanvasLayer />
      <JourneyList />
      {comparing && <CompareLabel />}
      <CanvasPopovers />
    </div>
    <ThreadDock open={dockOpen} />
    </div>
  )
}
