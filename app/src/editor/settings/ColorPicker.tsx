import { useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Popover, cx } from '../../ui/kit'
import { useEditor } from '../store'
import { COLOR_TOKENS } from '../theme'

/** V1's colour picker, rebuilt: saturation area, hue, opacity, hex + %, brand colours, recent colours, clear. */

interface HSVA {
  h: number
  s: number
  v: number
  a: number
}

/** Saved colours: kept on this computer (in the real editor, on the account), newest first, up to 16. */
const SAVED_KEY = 'sio-saved-colors'
function loadSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 16) : []
  } catch {
    return []
  }
}
function storeSaved(list: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list))
  } catch {
    /* private mode: kept for this visit only */
  }
}
function remember(c: string) {
  const list = loadSaved().filter((x) => x.toLowerCase() !== c.toLowerCase())
  storeSaved([c, ...list].slice(0, 16))
}

export function parseColor(c: string | undefined, theme: Record<string, string>): HSVA {
  let hex = c ?? '#000000'
  if (c && (COLOR_TOKENS as readonly string[]).includes(c)) hex = theme[c] ?? '#000000'
  const m = hex.match(/rgba?\(([^)]+)\)/)
  let r = 0,
    g = 0,
    b = 0,
    a = 1
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x))
    ;[r, g, b] = p
    a = p[3] ?? 1
  } else {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
    r = parseInt(full.slice(0, 2), 16) || 0
    g = parseInt(full.slice(2, 4), 16) || 0
    b = parseInt(full.slice(4, 6), 16) || 0
    if (full.length === 8) a = parseInt(full.slice(6, 8), 16) / 255
  }
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  let hh = 0
  if (d) {
    if (max === r / 255) hh = ((g - b) / 255 / d) % 6
    else if (max === g / 255) hh = (b - r) / 255 / d + 2
    else hh = (r - g) / 255 / d + 4
    hh *= 60
    if (hh < 0) hh += 360
  }
  return { h: hh, s: max ? d / max : 0, v: max, a }
}

function toRgb({ h, s, v }: HSVA) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return [f(5), f(3), f(1)]
}
export function toCss(c: HSVA) {
  const [r, g, b] = toRgb(c)
  if (c.a < 1) return `rgba(${r}, ${g}, ${b}, ${Math.round(c.a * 100) / 100})`
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function ColorPicker({
  value,
  onChange,
  anchor,
  onClose,
  allowNone = true,
  shown,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  anchor: HTMLElement
  onClose: () => void
  allowNone?: boolean
  /** the colour on screen when none is set (a default): the picker starts from it, not from black */
  shown?: string
}) {
  const theme = useEditor((s) => s.doc.theme)
  const tokens: Record<string, string> = { ink: theme.ink, muted: theme.muted, primary: theme.primary, 'on-primary': theme.onPrimary, bg: theme.bg, surface: theme.surface }
  const [c, setC] = useState<HSVA>(() => parseColor(value ?? shown, tokens))
  const [hex, setHex] = useState<string | null>(null)
  const area = useRef<HTMLDivElement>(null)
  const latest = useRef<string | undefined>(value)

  const [saved, setSaved] = useState<string[]>(loadSaved)
  const save = (c: string) => {
    remember(c)
    setSaved(loadSaved())
  }
  const unsave = (c: string) => {
    const list = loadSaved().filter((x) => x !== c)
    storeSaved(list)
    setSaved(list)
  }

  const commit = (n: HSVA) => {
    setC(n)
    const css = toCss(n)
    latest.current = css
    onChange(css)
  }
  const drag = (e: React.PointerEvent, fn: (x: number, y: number) => void, el: HTMLElement) => {
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect()
      fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
    }
    move(e.nativeEvent)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const [r, g, b] = toRgb(c)

  return (
    <Popover anchor={anchor} onClose={onClose} width={244} align="end">
      {/* pressing or dragging in the picker never touches the page's text selection (word colours keep their words) */}
      <div className="p-3" onMouseDown={(e) => !(e.target as HTMLElement).closest('input, textarea') && e.preventDefault()}>
        <div
          ref={area}
          className="relative h-[140px] cursor-crosshair rounded-[6px]"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${c.h} 100% 50%))` }}
          onPointerDown={(e) => drag(e, (x, y) => commit({ ...c, s: x, v: 1 - y }), area.current!)}
        >
          <span
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.3)]"
            style={{ left: `${c.s * 100}%`, top: `${(1 - c.v) * 100}%`, background: `rgb(${r},${g},${b})` }}
          />
        </div>
        <Slider
          className="mt-3"
          bg="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
          value={c.h / 360}
          onPointer={(e, el) => drag(e, (x) => commit({ ...c, h: x * 360 }), el)}
        />
        <Slider
          className="mt-2"
          bg={`linear-gradient(to right, transparent, rgb(${r},${g},${b})), repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 8px 8px`}
          value={c.a}
          onPointer={(e, el) => drag(e, (x) => commit({ ...c, a: Math.round(x * 100) / 100 }), el)}
        />
        <div className="mt-3 flex gap-1.5">
          <label className="flex h-7 flex-1 items-center gap-1 rounded-[6px] bg-[var(--fill-1)] px-2 text-[12px]">
            <span className="text-[var(--t4)]">#</span>
            <input
              className="tnum w-full bg-transparent uppercase outline-none"
              value={hex ?? toCss({ ...c, a: 1 }).slice(1)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const v = e.target.value.replace('#', '')
                setHex(v)
                // a full hex (typed or pasted) applies at once, no Enter needed
                if (/^[0-9a-f]{6}$/i.test(v)) commit({ ...parseColor('#' + v, tokens), a: c.a })
              }}
              onBlur={() => {
                if (hex && /^[0-9a-f]{6}$/i.test(hex)) commit({ ...parseColor('#' + hex, tokens), a: c.a })
                setHex(null)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
            />
          </label>
          <label className="flex h-7 w-[64px] items-center gap-1 rounded-[6px] bg-[var(--fill-1)] px-2 text-[12px]">
            <input
              type="number"
              className="tnum w-full bg-transparent outline-none"
              value={Math.round(c.a * 100)}
              onChange={(e) => commit({ ...c, a: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
            />
            <span className="text-[var(--t4)]">%</span>
          </label>
        </div>

        <div className="mt-3 text-[11px] font-medium text-[var(--t3)]">Brand colours</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {/* like V1: "no colour" is a swatch too (white with a red slash), the element then follows the page */}
          {allowNone && (
            <button
              title="No colour"
              aria-label="No colour"
              onClick={() => {
                latest.current = undefined
                onChange(undefined)
              }}
              className={cx('press h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]', value === undefined && 'ring-2 ring-[var(--brand)] ring-offset-1')}
              style={{ background: 'linear-gradient(135deg, #fff 45%, #e5484d 45%, #e5484d 55%, #fff 55%)' }}
            />
          )}
          {Object.entries(tokens).map(([k, v]) => (
            <button
              key={k}
              title={k}
              onClick={() => {
                latest.current = k
                setC(parseColor(v, tokens))
                onChange(k)
              }}
              className={cx('press h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]', value === k && 'ring-2 ring-[var(--brand)] ring-offset-1')}
              style={{ background: v }}
            />
          ))}
        </div>
        <div className="mt-2.5 text-[11px] font-medium text-[var(--t3)]">Saved colours</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {saved.map((v) => (
            <span key={v} className="group/sw relative">
              <button
                title={v}
                onClick={() => commit(parseColor(v, tokens))}
                className={cx('press h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]', latest.current === v && 'ring-2 ring-[var(--brand)] ring-offset-1')}
                style={{ background: `linear-gradient(${v}, ${v}), repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 6px 6px` }}
              />
              <button
                aria-label="Remove saved colour"
                title="Remove"
                onClick={() => unsave(v)}
                className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 place-items-center rounded-full bg-[var(--raised)] text-[var(--t2)] shadow-[0_0_0_1px_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.2)] hover:text-[var(--dng)] group-hover/sw:grid"
              >
                <X size={8} strokeWidth={3} />
              </button>
            </span>
          ))}
          {/* saves the colour you are on (it shows up in every colour picker) */}
          <button
            title="Save this colour"
            aria-label="Save this colour"
            onClick={() => save(toCss(c))}
            className="press grid h-5 w-5 place-items-center rounded-full text-[var(--t3)] shadow-[inset_0_0_0_1px_var(--line-2)] hover:text-[var(--t1)] hover:shadow-[inset_0_0_0_1px_var(--t3)]"
          >
            <Plus size={11} strokeWidth={2.4} />
          </button>
        </div>
        {allowNone && (
          <button
            onClick={() => {
              latest.current = undefined
              onChange(undefined)
              onClose()
            }}
            className="press mt-3 flex h-7 w-full items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium text-[var(--t2)] hover:bg-[var(--fill-1)]"
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>
    </Popover>
  )
}

function Slider({ bg, value, onPointer, className }: { bg: string; value: number; onPointer: (e: React.PointerEvent, el: HTMLElement) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className={cx('relative h-3 cursor-pointer rounded-full', className)} style={{ background: bg }} onPointerDown={(e) => onPointer(e, ref.current!)}>
      <span
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,.3),0_1px_3px_rgba(0,0,0,.2)]"
        style={{ left: `${value * 100}%` }}
      />
    </div>
  )
}
