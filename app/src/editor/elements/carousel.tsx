import { Children, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, GalleryHorizontal, Pause, Play, Plus, SquareDashedMousePointer, Trash2 } from 'lucide-react'
import { carouselSlide, el } from '../blocks'
import { cssColor } from '../theme'
import { padding } from '../render/css'
import { Button, IconButton, cx } from '../../ui/kit'
import { Color, G, PFlag, SizePosition, useInspector } from '../settings/kit'
import { toast, update, useEditor } from '../store'
import { contains, find } from '../tree'
import { shownSlide } from '../slides'
import type { Device, Node, Style } from '../types'
import type { ElementDef } from './types'

const AUTOPLAY_MS = 5000

/** Fixed default colours (never the page's): dark arrows on white buttons and dark dots, readable on any picture. */
const C = { ink: '#171717', button: 'rgba(255,255,255,.94)' }

/* ---------------- The slide the editor shows: follows the slide opened in the settings ---------------- */

// a counter with the index, so opening the same slide again (after browsing with the arrows) still moves to it
const asked = new Map<string, { i: number; n: number }>()
const subs = new Set<() => void>()
function showSlide(id: string, i: number) {
  asked.set(id, { i, n: (asked.get(id)?.n ?? 0) + 1 })
  subs.forEach((f) => f())
}
function useAskedSlide(id: string) {
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => asked.get(id),
  )
}

export const def: ElementDef = {
  type: 'carousel',
  label: 'Carousel',
  icon: GalleryHorizontal,
  group: 'Media',
  make: () =>
    el(
      'carousel',
      { arrows: true },
      // 10px of room on every side by default
      { paddingY: 10, paddingX: 10 },
      // like V1, every slide holds any elements you drag in; a new carousel starts with three empty slides (no row yet)
      [carouselSlide(), carouselSlide(), carouselSlide()],
    ),
  render: ({ node, s, editable, device, children }) => <Carousel node={node} s={s} editable={editable} device={device} slides={Children.toArray(children())} />,
  settings: () => <CarouselSettings />,
}

/* ---------------- Page ---------------- */

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!m) return
    const on = () => setReduce(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduce
}

function Carousel({ node, s, editable, device, slides }: { node: Node; s: Style; editable: boolean; device: Device; slides: ReactNode[] }) {
  const n = slides.length
  const [raw, setIdx] = useState(0)
  const idx = n ? Math.min(raw, n - 1) : 0
  const [hover, setHover] = useState(false)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  const wanted = useAskedSlide(node.id)
  useEffect(() => {
    if (editable && wanted) setIdx(wanted.i)
  }, [editable, wanted])
  // selecting something inside a slide (Layers, Tab, a search) brings that slide into view
  const selectedIn = useEditor((st) => (editable && st.selectedId ? (node.children ?? []).findIndex((c) => contains(c, st.selectedId!)) : -1))
  useEffect(() => {
    if (selectedIn >= 0) setIdx(selectedIn)
  }, [selectedIn])
  useEffect(() => void shownSlide.set(node.id, idx), [node.id, idx])
  // which empty slide an element is being dragged over (enter / leave counted, as they fire for every child)
  const [over, setOver] = useState<{ i: number; depth: number } | null>(null)
  useEffect(() => {
    const clear = () => setOver(null)
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => (window.removeEventListener('dragend', clear), window.removeEventListener('drop', clear))
  }, [])
  const auto = !editable && !reduce && n > 1
  const running = auto && !paused && !hover

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setIdx((i) => (i + 1) % n), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [running, n])

  const go = (d: number) => setIdx((i) => (Math.min(i, n - 1) + d + n) % n)
  const small = device === 'mobile'
  const arrowColor = cssColor(s.color) ?? C.ink
  const ctrl = cssColor(s.iconColor) ?? C.ink

  if (!n) return null

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1)
        if (e.key === 'ArrowRight') go(1)
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--f-body)', padding: padding(s) }}
    >
      <div style={frame}>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            transform: `translateX(-${idx * 100}%)`,
            transition: reduce ? undefined : 'transform 320ms var(--ease-drawer)',
          }}
        >
          {slides.map((slide, i) => {
            const empty = editable && !node.children?.[i]?.children?.length
            return (
              <div
                key={i}
                className="sio-slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
                aria-hidden={i !== idx}
                inert={i !== idx || undefined}
                onDragEnter={empty ? () => setOver((o) => ({ i, depth: o?.i === i ? o.depth + 1 : 1 })) : undefined}
                onDragLeave={empty ? () => setOver((o) => (o?.i === i && o.depth > 1 ? { i, depth: o.depth - 1 } : null)) : undefined}
                style={{ position: 'relative', flex: '0 0 100%', minWidth: 0 }}
              >
                {slide}
                {/* an empty slide (editor only): V1's drop box made calmer; the slide's own column under it takes the drop */}
                {empty && (
                  <div className={cx('sio-slide-empty', over?.i === i && 'over')} aria-hidden>
                    <SquareDashedMousePointer size={16} strokeWidth={1.75} />
                    {over?.i === i ? `Drop to add to slide ${i + 1}` : 'Drag elements here'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {node.props.arrows !== false && n > 1 && (
          <>
            <Arrow side="left" small={small} color={arrowColor} editable={editable} onClick={() => go(-1)}>
              <ChevronLeft size={small ? 18 : 20} strokeWidth={2.2} />
            </Arrow>
            <Arrow side="right" small={small} color={arrowColor} editable={editable} onClick={() => go(1)}>
              <ChevronRight size={small ? 18 : 20} strokeWidth={2.2} />
            </Arrow>
          </>
        )}
      </div>

      {n > 1 && (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 24 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === idx}
                tabIndex={editable ? -1 : 0}
                onClick={() => setIdx(i)}
                style={{ all: 'unset', cursor: 'pointer', padding: '8px 0', display: 'flex' }}
              >
                <span
                  style={{
                    display: 'block',
                    height: 6,
                    width: i === idx ? 20 : 6,
                    borderRadius: 999,
                    background: ctrl,
                    opacity: i === idx ? 1 : 0.28,
                    transitionProperty: 'width, opacity',
                    transitionDuration: '200ms',
                    transitionTimingFunction: 'var(--ease-out)',
                  }}
                />
              </button>
            ))}
          </div>
          {auto && (
            <button
              type="button"
              aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
              onClick={() => setPaused((x) => !x)}
              style={{ all: 'unset', position: 'absolute', right: 0, width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 999, color: ctrl, opacity: 0.7, cursor: 'pointer' }}
            >
              {paused ? <Play size={14} fill="currentColor" strokeWidth={0} /> : <Pause size={14} fill="currentColor" strokeWidth={0} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const frame: CSSProperties = {
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
  borderRadius: 'var(--r-card)',
}

function Arrow({ side, small, color, editable, onClick, children }: { side: 'left' | 'right'; small: boolean; color: string; editable: boolean; onClick: () => void; children: ReactNode }) {
  const size = small ? 34 : 40
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      tabIndex={editable ? -1 : 0}
      // on the canvas the click still bubbles, so browsing a slide also selects the carousel
      onClick={onClick}
      style={{
        all: 'unset',
        position: 'absolute',
        top: '50%',
        [side]: small ? 10 : 16,
        marginTop: -size / 2,
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 999,
        cursor: 'pointer',
        color,
        background: C.button,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 0 0 1px rgba(0,0,0,.06), 0 2px 8px -2px rgba(0,0,0,.18)',
        transitionProperty: 'transform, background-color',
        transitionDuration: '120ms',
        transitionTimingFunction: 'var(--ease-out)',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = '')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
    >
      {children}
    </button>
  )
}

/* ---------------- Inspector ---------------- */

function CarouselSettings() {
  return (
    <>
      <G title="Slides">
        <SlideList />
      </G>
      <G title="Settings" keys={['iconColor', 'color']}>
        <PFlag p="arrows" label="Display arrow navigation" />
        <Color k="iconColor" label="Controls color" auto={{ hex: C.ink, token: 'ink', label: '' }} />
        <Color k="color" label="Arrow color" auto={{ hex: C.ink, token: 'ink', label: '' }} />
      </G>
      <SizePosition />
    </>
  )
}

/** The slides as one inset list (iOS Settings): move up / down and delete always on every row; the open one is blue. */
function SlideList() {
  const { node } = useInspector()
  const slides = node.children ?? []
  const [open, setOpenRaw] = useState<number>(() => shownSlide.get(node.id) ?? 0)
  // opening a slide here shows it on the canvas
  const setOpen = (i: number) => {
    setOpenRaw(i)
    showSlide(node.id, i)
  }
  const edit = (f: (list: Node[]) => void) =>
    update((d) => {
      const c = find(d, node.id)
      if (c?.children) f(c.children)
    })
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= slides.length) return
    edit((list) => void ([list[i], list[j]] = [list[j], list[i]]))
    setOpen(j)
  }
  return (
    <div className="flex flex-col gap-2.5">
      {slides.length > 0 && (
        <div className="overflow-hidden rounded-[12px] bg-[var(--raised)] shadow-[var(--shadow-card)]">
          {slides.map((sl, i) => {
            const on = i === open
            return (
              <div
                key={sl.id}
                role="button"
                tabIndex={0}
                aria-current={on}
                onClick={() => setOpen(i)}
                onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && setOpen(i)}
                className={cx('flex h-10 cursor-pointer items-center gap-1 pl-3 pr-1 outline-none hover:bg-[var(--fill-1)] focus-visible:bg-[var(--fill-1)]', i > 0 && 'shadow-[inset_0_1px_0_var(--line)]')}
              >
                <span className="w-4 flex-none text-[var(--brand)]">{on && <Check size={15} strokeWidth={2.4} />}</span>
                <span className={cx('min-w-0 flex-1 truncate text-[13px] font-medium', on ? 'text-[var(--brand)]' : 'text-[var(--t1)]')}>Slide {i + 1}</span>
                <IconButton tip="Move up" className="h-7 w-7 flex-none" disabled={i === 0} onClick={(e) => (e.stopPropagation(), move(i, -1))}>
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton tip="Move down" className="h-7 w-7 flex-none" disabled={i === slides.length - 1} onClick={(e) => (e.stopPropagation(), move(i, 1))}>
                  <ArrowDown size={14} />
                </IconButton>
                <IconButton
                  tip="Delete slide"
                  className="h-7 w-7 flex-none hover:text-[var(--dng)]"
                  disabled={slides.length === 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    edit((list) => void list.splice(i, 1))
                    toast(`Deleted slide ${i + 1}`)
                    setOpen(Math.max(0, Math.min(open > i ? open - 1 : open, slides.length - 2)))
                  }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            )
          })}
        </div>
      )}
      <Button
        size="sm"
        className="self-start"
        onClick={() => {
          edit((list) => void list.push(carouselSlide()))
          setOpen(slides.length)
        }}
      >
        <Plus size={13} /> Add new slide
      </Button>
    </div>
  )
}
