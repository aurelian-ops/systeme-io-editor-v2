import { Check, ChevronDown, RotateCcw } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { dematerialize, exitGhost, materialize, pushDepth, rubberband } from './motion'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------------- Buttons ---------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'brand' | 'danger'
  size?: 'sm' | 'md'
  tip?: string
  kbd?: string
}

export function Button({ variant = 'secondary', size = 'md', className, tip, kbd, children, ...rest }: BtnProps) {
  const base =
    'press inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium rounded-[8px] disabled:opacity-40 disabled:pointer-events-none select-none'
  const sizes = size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]'
  const variants: Record<string, string> = {
    primary: 'bg-[var(--ink)] text-[var(--inv)] hover:bg-[var(--ink-hover)]',
    brand: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]',
    secondary: 'bg-[var(--raised)] text-[var(--t1)] shadow-[var(--shadow-card)] hover:bg-[var(--raised-hover)]',
    ghost: 'text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]',
    danger: 'bg-[var(--dng)] text-white hover:bg-[var(--dng-hover)]',
  }
  const btn = (
    <button className={cx(base, sizes, variants[variant], className)} {...rest}>
      {children}
    </button>
  )
  return tip ? (
    <Tooltip label={tip} kbd={kbd}>
      {btn}
    </Tooltip>
  ) : (
    btn
  )
}

export function IconButton({
  tip,
  kbd,
  active,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tip: string; kbd?: string; active?: boolean }) {
  return (
    <Tooltip label={tip} kbd={kbd}>
      <button
        aria-label={tip}
        className={cx(
          'press inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)] disabled:opacity-35 disabled:pointer-events-none',
          active && 'bg-[var(--fill-2)] text-[var(--t1)]',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-[var(--fill-1)] px-1 font-sans text-[11px] font-medium text-[var(--t3)]">
      {children}
    </kbd>
  )
}

/* ---------------- Tooltip (warm, macOS-like) ---------------- */

let lastClosed = 0
export function Tooltip({ label, kbd, children, side = 'bottom' }: { label: string; kbd?: string; children: ReactNode; side?: 'bottom' | 'top' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(undefined)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const show = () => {
    const warm = Date.now() - lastClosed < 500
    timer.current = window.setTimeout(
      () => {
        const r = ref.current?.firstElementChild?.getBoundingClientRect()
        if (!r) return
        setAnchor(r)
        setPos(null)
        setOpen(true)
      },
      warm ? 0 : 160,
    )
  }
  // placed once its real size is known: centred on what it explains, flipped or shifted so it always stays on screen
  useLayoutEffect(() => {
    if (!open || !anchor || !tip.current) return
    const w = tip.current.offsetWidth
    const h = tip.current.offsetHeight
    const m = 8
    const clampX = (x: number) => Math.max(m, Math.min(x, window.innerWidth - w - m))
    let left: number
    let top: number
    if (side === 'right') {
      left = anchor.right + 8
      if (left + w > window.innerWidth - m) left = anchor.left - 8 - w
      top = Math.max(m, Math.min(anchor.top + anchor.height / 2 - h / 2, window.innerHeight - h - m))
    } else {
      left = clampX(anchor.left + anchor.width / 2 - w / 2)
      const above = anchor.top - 8 - h
      const below = anchor.bottom + 8
      top = side === 'top' ? (above < m ? below : above) : below + h > window.innerHeight - m ? above : below
    }
    setPos({ left, top })
  }, [open, anchor, side, label])
  const hide = () => {
    window.clearTimeout(timer.current)
    if (open) lastClosed = Date.now()
    setOpen(false)
  }
  return (
    <span ref={ref} className="contents" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
      {children}
      {open &&
        createPortal(
          <div
            ref={tip}
            data-side={side}
            className="tip-in pointer-events-none fixed z-[1000] flex max-w-[260px] items-center gap-1.5 rounded-[6px] bg-[color-mix(in_srgb,var(--hud)_94%,transparent)] px-2 py-1 text-[12px] font-medium leading-[17px] text-white shadow-[var(--shadow-pop)] backdrop-blur-md"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? undefined : 'hidden' }}
          >
            {label}
            {kbd ? <span className="text-white/55">{kbd}</span> : null}
          </div>,
          document.body,
        )}
    </span>
  )
}

/* ---------------- Segmented with one sliding indicator ---------------- */

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  full,
}: {
  value: T | undefined
  options: { value: T; label?: ReactNode; icon?: ReactNode; tip?: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  full?: boolean
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null)
  const idx = options.findIndex((o) => o.value === value)
  useLayoutEffect(() => {
    const el = wrap.current?.querySelectorAll<HTMLElement>(':scope button')[idx]
    if (!el) return setInd(null)
    setInd({ x: el.offsetLeft, w: el.offsetWidth })
  }, [idx, options.length])
  const h = size === 'sm' ? 'h-7' : 'h-8'
  return (
    <div ref={wrap} className={cx('relative flex rounded-[8px] bg-[var(--fill-1)] p-[2px]', full && 'w-full')}>
      <span
        className="absolute top-[2px] bottom-[2px] rounded-[6px] bg-[var(--seg-on)] shadow-[0_0_0_1px_var(--line-2),0_1px_2px_rgba(0,0,0,.08)]"
        style={{
          left: ind?.x ?? 0,
          width: ind?.w ?? 0,
          opacity: ind ? 1 : 0,
          transition: 'left 320ms var(--ease-spring), width 320ms var(--ease-spring), opacity 120ms',
        }}
      />
      {options.map((o) => {
        const btn = (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            aria-pressed={o.value === value}
            aria-label={o.tip}
            className={cx(
              'press relative z-[1] flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-1.5 text-[12px] font-medium',
              h,
              o.value === value ? 'text-[var(--t1)]' : 'text-[var(--t3)] hover:text-[var(--t1)]',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
        return o.tip ? (
          <Tooltip key={String(o.value)} label={o.tip}>
            {btn}
          </Tooltip>
        ) : (
          btn
        )
      })}
    </div>
  )
}

/* ---------------- Number: slider + field ---------------- */

export function NumberField({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  slider = true,
  floor,
  ceiling,
}: {
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  slider?: boolean
  /** lowest value the arrows and typing allow, when it is below where the slider starts (e.g. negative letter spacing) */
  floor?: number
  /** highest value the arrows and typing allow (default: four times the slider's end) */
  ceiling?: number
}) {
  const low = floor ?? min
  const high = ceiling ?? max * 4
  const v = value ?? min
  const pct = ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex w-full items-center gap-2.5">
      {slider && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, v))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1"
          style={{ ['--p' as string]: `${pct}%` }}
        />
      )}
      <label className="group/num flex h-7 w-[78px] flex-none items-center rounded-[6px] bg-[var(--fill-1)] pr-0.5 focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
        <input
          type="number"
          className="tnum w-full min-w-0 bg-transparent pl-2 text-[12px] font-medium text-[var(--t1)] outline-none"
          value={draft ?? String(Math.round(v * 100) / 100)}
          onChange={(e) => {
            // the page follows as you type (like V1); half-typed values like "-" or "" wait
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && !Number.isNaN(n)) onChange(n)
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step)
              onChange(Math.min(high, Math.max(low, v + d)))
              setDraft(null)
            }
          }}
        />
        {unit ? <span className="mr-0.5 text-[11px] text-[var(--t4)]">{unit}</span> : null}
        <Stepper value={v} onChange={(x) => (setDraft(null), onChange(x))} step={step} min={low} max={high} />
      </label>
    </div>
  )
}

/**
 * Small up / down arrows inside a number field (like V1). Click steps once,
 * press and hold repeats, Shift steps by 10.
 */
export function Stepper({ value, onChange, step = 1, min = -Infinity, max = Infinity }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  const latest = useRef(value)
  latest.current = value
  const timer = useRef<number>(undefined)
  const stop = () => {
    window.clearTimeout(timer.current)
    window.clearInterval(timer.current)
  }
  useEffect(() => stop, [])
  const bump = (dir: 1 | -1, big: boolean) => {
    const n = Math.round((latest.current + dir * (big ? step * 10 : step)) * 100) / 100
    const c = Math.min(max, Math.max(min, n))
    latest.current = c
    onChange(c)
  }
  const press = (dir: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault()
    bump(dir, e.shiftKey)
    stop()
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => bump(dir, e.shiftKey), 60)
    }, 380)
  }
  const btn = 'flex h-[13px] w-4 items-center justify-center rounded-[3px] text-[var(--t4)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]'
  return (
    <span className="flex flex-none flex-col" onPointerUp={stop} onPointerLeave={stop}>
      <button type="button" tabIndex={-1} aria-label="Increase" className={btn} onPointerDown={press(1)}>
        <ChevronDown size={11} strokeWidth={2.2} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button type="button" tabIndex={-1} aria-label="Decrease" className={btn} onPointerDown={press(-1)}>
        <ChevronDown size={11} strokeWidth={2.2} />
      </button>
    </span>
  )
}

/** Drag left / right on a field's icon or label to change its value (Shift = ×10). */
export function useScrub(value: number, onChange: (v: number) => void, step = 1, min = -Infinity, max = Infinity) {
  return (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const x0 = e.clientX
    const v0 = value
    // past the limit the field gives a little, then springs back on release
    const field = ((e.currentTarget as HTMLElement).closest('label') ?? e.currentTarget) as HTMLElement
    const move = (ev: PointerEvent) => {
      const d = Math.round((ev.clientX - x0) / 3) * (ev.shiftKey ? step * 10 : step)
      const raw = Math.round((v0 + d) * 100) / 100
      const v = Math.min(max, Math.max(min, raw))
      onChange(v)
      const over = raw > max ? ((raw - max) / step) * 3 : raw < min ? ((raw - min) / step) * 3 : 0
      field.style.transform = over ? `translateX(${rubberband(over, 60, 0.3)}px)` : ''
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      if (field.style.transform) {
        field.style.transition = 'transform 420ms var(--ease-spring)'
        field.style.transform = ''
        window.setTimeout(() => (field.style.transition = ''), 440)
      }
    }
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
}

/* ---------------- Dialogs: the editor steps back, the dialog rises ---------------- */

export function Scrim({ onClose, children, className }: { onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const pop = pushDepth()
    const el = ref.current
    return () => {
      pop()
      exitGhost(el, [{ opacity: 1 }, { opacity: 0 }], 180)
    }
  }, [])
  // Esc closes a modal, like clicking outside it
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // a code editor's open suggestions or find bar take Esc first
      const own = (e.target as HTMLElement | null)?.closest?.('[data-escape-own]')
      if (own?.querySelector('.cm-tooltip-autocomplete, .sio-find')) return
      e.stopPropagation()
      close.current()
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [])
  return createPortal(
    <div ref={ref} className={cx('scrim fixed inset-0 z-[800] flex items-center justify-center bg-black/25', className)} onPointerDown={onClose}>
      {children}
    </div>,
    document.body,
  )
}

/* ---------------- Text inputs ---------------- */

export function TextField({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string | undefined
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const cls =
    'w-full rounded-[6px] bg-[var(--fill-1)] px-2.5 text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)] press'
  return multiline ? (
    <textarea className={cx(cls, 'min-h-[64px] resize-y py-2 leading-[19px]')} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className={cx(cls, 'h-8')} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  )
}

/* ---------------- Toggle ---------------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('press relative h-[18px] w-[30px] flex-none rounded-full', checked ? 'bg-[var(--brand)]' : 'bg-[var(--fill-2)]')}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)]"
        style={{ left: checked ? 14 : 2, transition: 'left 200ms var(--ease-spring)' }}
      />
    </button>
  )
}

/* ---------------- Select (custom menu) ---------------- */

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  render,
}: {
  value: T | undefined
  options: { value: T; label: string; style?: React.CSSProperties }[]
  onChange: (v: T) => void
  render?: (o: { value: T; label: string }) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const cur = options.find((o) => o.value === value)
  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen((o) => !o)}
        className="press flex h-8 w-full items-center justify-between gap-2 rounded-[6px] bg-[var(--fill-1)] px-2.5 text-left text-[13px] text-[var(--t1)] hover:bg-[var(--fill-2)]"
      >
        <span className="truncate" style={cur?.style}>
          {cur ? (render ? render(cur) : cur.label) : 'Choose'}
        </span>
        <ChevronDown size={14} className="flex-none text-[var(--t3)]" />
      </button>
      {open && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} width={btn.current?.offsetWidth}>
          <div className="scroll-thin max-h-[280px] overflow-auto p-1">
            {options.map((o) => (
              <button
                key={String(o.value)}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className="press flex h-8 w-full items-center justify-between gap-2 rounded-[6px] px-2 text-left text-[13px] hover:bg-[var(--fill-1)]"
              >
                <span style={o.style}>{render ? render(o) : o.label}</span>
                {o.value === value ? <Check size={14} className="text-[var(--t2)]" /> : null}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  )
}

/* ---------------- Popover ---------------- */

export function Popover({
  anchor,
  onClose,
  children,
  width,
  align = 'start',
  side = 'bottom',
}: {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  width?: number
  align?: 'start' | 'end' | 'center'
  side?: 'bottom' | 'top' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; origin: string } | null>(null)
  const place = useRef(() => {})
  const [maxH, setMaxH] = useState<number | undefined>(undefined)
  const made = useRef(false)
  place.current = () => {
    if (!anchor) return
    let r = anchor.getBoundingClientRect()
    const w = width ?? ref.current?.offsetWidth ?? 240
    const h = ref.current?.scrollHeight ?? 200
    // opening downwards and short of room: the first time, scroll what holds the button up just enough to make room
    if (side === 'bottom' && !made.current && r.bottom + 6 + h > window.innerHeight - 8) {
      made.current = true
      let sc = anchor.parentElement
      while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
      if (sc) {
        // never so far that the button itself leaves the top of what scrolls
        const room = r.top - sc.getBoundingClientRect().top - 8
        sc.scrollTop += Math.max(0, Math.min(room, r.bottom + 6 + h - (window.innerHeight - 8)))
        r = anchor.getBoundingClientRect()
      }
    }
    let left = align === 'end' ? r.right - w : align === 'center' ? r.left + r.width / 2 - w / 2 : r.left
    let top = side === 'top' ? r.top - h - 6 : side === 'right' ? r.top : r.bottom + 6
    if (side === 'right') left = r.right + 8
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    // below stays below (never flips on top of the panel); if it is still too tall it scrolls inside
    if (side === 'bottom') {
      const fit = window.innerHeight - 8 - top
      setMaxH((m) => (h > fit ? Math.max(160, fit) : m === undefined ? m : undefined))
    } else if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 8 - h)
    // grow out of the thing that opened it, and shrink back into it
    const ox = Math.max(0, Math.min(w, r.left + r.width / 2 - left))
    const oy = side === 'right' ? Math.max(0, Math.min(h, r.top + r.height / 2 - top)) : side === 'top' ? h : 0
    setPos((p) => (p && p.left === left && p.top === top ? p : { left, top, origin: side === 'right' ? `0px ${oy}px` : `${ox}px ${oy}px` }))
  }
  useLayoutEffect(() => place.current(), [anchor, width, align, side])
  // it stays attached to what opened it: scrolling moves it along, and it closes once that has scrolled out of view
  useEffect(() => {
    if (!anchor) return
    let raf = 0
    const follow = (e: Event) => {
      const t = e.target as globalThis.Node | null
      if (t && ref.current?.contains(t)) return // scrolling inside the popover itself
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = anchor.getBoundingClientRect()
        const box = t instanceof HTMLElement ? t.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
        if (!anchor.isConnected || r.bottom < box.top || r.top > box.bottom) return onClose()
        place.current()
      })
    }
    const resize = () => place.current()
    document.addEventListener('scroll', follow, { capture: true, passive: true })
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('scroll', follow, { capture: true })
      window.removeEventListener('resize', resize)
    }
  }, [anchor, onClose])
  const shown = useRef(false)
  useLayoutEffect(() => {
    if (!pos || shown.current || !ref.current) return
    shown.current = true
    materialize(ref.current, pos.origin)
  }, [pos])
  useLayoutEffect(() => {
    const el = ref.current
    return () => exitGhost(el, dematerialize, 150)
  }, [])
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as globalThis.Node) || anchor?.contains(e.target as globalThis.Node)) return
      // a menu opened from inside this one (a dropdown in a panel) doesn't close it
      const other = (e.target as HTMLElement | null)?.closest?.('[data-popover]')
      if (other && other !== ref.current) return
      onClose()
    }
    // Esc closes only the popover (it is caught first, so the canvas does not also change the selection)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose())
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key, true)
    }
  }, [anchor, onClose])
  return createPortal(
    <div
      ref={ref}
      data-popover
      className={cx('material fixed z-[900] rounded-[10px] shadow-[var(--shadow-pop)]', maxH !== undefined && 'scroll-thin overflow-y-auto')}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width, maxHeight: maxH, transformOrigin: pos?.origin }}
    >
      {children}
    </div>,
    document.body,
  )
}

/* ---------------- Inspector layout ---------------- */

const GroupCtx = createContext(false)

export function Group({ title, children, action, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <GroupCtx.Provider value>
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex h-7 items-center justify-between">
          <button onClick={() => setOpen((o) => !o)} className="press flex items-center gap-1.5 text-[12px] font-semibold text-[var(--t1)]">
            <ChevronDown size={13} className="text-[var(--t3)]" style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform 160ms var(--ease-out)' }} />
            {title}
          </button>
          {action}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 220ms var(--ease-out)' }}>
          <div className={cx('min-h-0', open ? 'overflow-visible' : 'overflow-hidden')}>
            <div className="flex flex-col gap-2.5 pt-2">{children}</div>
          </div>
        </div>
      </div>
    </GroupCtx.Provider>
  )
}

export type FieldState = 'base' | 'auto' | 'override' | 'inherited' | undefined

export function Field({
  label,
  children,
  state,
  onReset,
  stack,
  hint,
}: {
  label: string
  children: ReactNode
  state?: FieldState
  onReset?: () => void
  stack?: boolean
  hint?: string
}) {
  const mark =
    state === 'override' ? (
      <Tooltip label="Changed for this device. Click to reset">
        <button onClick={onReset} className="press group flex items-center gap-1 rounded-[4px] px-1 text-[11px] font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-tint)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] group-hover:hidden" />
          <RotateCcw size={11} className="hidden group-hover:block" />
        </button>
      </Tooltip>
    ) : state === 'auto' ? (
      <Tooltip label="Adapted automatically for this device">
        <span className="rounded-[4px] px-1 text-[11px] font-medium text-[var(--t4)]">Auto</span>
      </Tooltip>
    ) : null
  return (
    <div className={cx('flex gap-2', stack ? 'flex-col' : 'items-center')}>
      <div className={cx('flex min-w-0 items-center gap-1', stack ? '' : 'w-[84px] flex-none')}>
        <span className={cx('text-[12px] leading-[16px] text-[var(--t3)]', stack ? '' : 'truncate')} title={hint ?? label}>
          {label}
        </span>
        {mark}
      </div>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  )
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="animate-spin" style={{ animationDuration: '700ms' }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function useGroup() {
  return useContext(GroupCtx)
}
