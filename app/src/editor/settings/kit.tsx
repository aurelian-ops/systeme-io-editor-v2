import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  Copy,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  Search,
  Upload,
  X,
  Square,
  AudioLines,
} from 'lucide-react'
import { Button, Field, IconButton, NumberField, Popover, Scrim, Segmented, Select, Stepper, TextField, Toggle, Tooltip, cx, useScrub, type FieldState } from '../../ui/kit'
import { setProps as storeSetProps, setStyle, setStyleMany, resetStyle, toast, update, useEditor } from '../store'
import { find } from '../tree'
import { EDGE } from '../theme'
import type { Resolved } from '../responsive'
import type { Corners, Device, Node, Props, Sides, Style, StyleKey } from '../types'
import { ColorPicker, parseColor, toCss } from './ColorPicker'
import { GOOGLE_FONTS, WEB_SAFE_FONTS, addCustomFont, customFonts, ensureFont } from '../fonts'
import { allIconNames, iconLibraryLoaded, ICONS, iconsVersion, iconTags, loadIconLibrary, POPULAR_ICONS, subscribeIcons } from '../icons'

/* ---------------- Context: which node and device the controls edit ---------------- */

export interface InspectorValue {
  node: Node
  device: Device
  r: Resolved
  /** when set, every change applies to all of these elements (a form's fields share one design, like V1) */
  targets?: string[]
}
export const InspectorCtx = createContext<InspectorValue | null>(null)
export function useInspector() {
  const c = useContext(InspectorCtx)!
  const { node, device, r } = c
  return {
    ...c,
    s: r.style,
    p: node.props,
    state: (k: StyleKey): FieldState => (device === 'desktop' ? undefined : (r.source[k] as FieldState)),
    set: <K extends StyleKey>(k: K, v: Style[K] | undefined) => (c.targets ? setStyleMany(c.targets, k, v, device) : setStyle(node.id, k, v, device)),
    reset: (k: StyleKey) => (c.targets ? setStyleMany(c.targets, k, undefined, device) : resetStyle(node.id, k, device)),
    setProps: (patch: Partial<Props>, coalesce = true) => storeSetProps(node.id, patch, coalesce),
  }
}

/* ---------------- Group with V1's reset icon ---------------- */

export function G({ title, keys, children, defaultOpen = true }: { title: string; keys?: StyleKey[]; children: ReactNode; defaultOpen?: boolean }) {
  const { node, device, targets } = useContext(InspectorCtx)!
  const [open, setOpen] = useState(defaultOpen)
  const resettable = keys?.length
  return (
    <div className="border-b border-[var(--line)] px-4 py-3">
      <div className="flex h-7 items-center justify-between">
        <button onClick={() => setOpen((o) => !o)} className="press flex items-center gap-1.5 text-[12px] font-semibold text-[var(--t1)]">
          <ChevronDown size={13} className="text-[var(--t3)]" style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform 160ms var(--ease-out)' }} />
          {title}
        </button>
        {resettable ? (
          <Tooltip label="Reset this group">
            <button
              aria-label={`Reset ${title}`}
              onClick={() =>
                update((d) => {
                  for (const id of targets ?? [node.id]) {
                    const n = find(d, id)
                    if (!n) continue
                    const bucket = (device === 'desktop' ? n.style.desktop : n.style[device]) as Record<string, unknown> | undefined
                    if (bucket) for (const k of keys!) delete bucket[k]
                  }
                })
              }
              className="press rounded-[6px] p-1 text-[var(--t4)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]"
            >
              <RotateCcw size={13} />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 220ms var(--ease-out)' }}>
        <div className={cx('min-h-0', open ? 'overflow-visible' : 'overflow-hidden')}>
          <div className="flex flex-col gap-2.5 pt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Style controls ---------------- */

export function Num({ k, label, min = 0, max = 100, step = 1, unit = 'px', fallback, floor, ceiling }: { k: StyleKey; label: string; min?: number; max?: number; step?: number; unit?: string; fallback?: number; floor?: number; ceiling?: number }) {
  const { s, state, set, reset } = useInspector()
  return (
    <Field label={label} state={state(k)} onReset={() => reset(k)}>
      <NumberField value={(s[k] as number | undefined) ?? fallback ?? min} onChange={(v) => set(k, v as never)} min={min} max={max} step={step} unit={unit} floor={floor} ceiling={ceiling} />
    </Field>
  )
}

export function LineHeight({ fallback = 1.5 }: { fallback?: number }) {
  const { s, state, set, reset } = useInspector()
  const fs = s.fontSize ?? 16
  const lh = s.lineHeight ?? fallback
  const px = Math.round(lh > 4 ? lh : lh * fs)
  return (
    <Field label="Line height" state={state('lineHeight')} onReset={() => reset('lineHeight')}>
      <NumberField value={px} onChange={(v) => set('lineHeight', v)} min={8} max={140} unit="px" />
    </Field>
  )
}

/* ---------------- The colour an element really shows (for colour settings left on their default) ---------------- */

const BG_KEYS = new Set(['background', 'contentBackground', 'textBackground', 'answerBackground', 'markerBg'])
let probe: CanvasRenderingContext2D | null = null
/** Any CSS colour as "#rrggbb" or "rgba(r,g,b,a)" (null when fully see-through). */
function solid(css: string): string | null {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!probe) return null
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000'
  probe.fillStyle = css
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data
  if (a < 8) return null
  return a > 250 ? '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('') : `rgba(${r},${g},${b},${Math.round((a / 255) * 100) / 100})`
}
function readShown(id: string, k: StyleKey): string | undefined {
  const host = document.querySelector<HTMLElement>(`.page-root[data-device] [data-node="${id}"]`)
  if (!host || k === 'overlay') return undefined
  // this element's own boxes (not the elements nested inside it)
  const own = [host, ...host.querySelectorAll<HTMLElement>('*')].slice(0, 600).filter((e) => e === host || e.closest('[data-node]') === host)
  const textLeaves = own.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
  if (BG_KEYS.has(k)) {
    for (const e of own) {
      const c = solid(getComputedStyle(e).backgroundColor)
      if (c) return c
    }
    return undefined
  }
  if (k === 'borderColor') {
    const e = own.find((x) => {
      const cs = getComputedStyle(x)
      return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'
    })
    return e ? (solid(getComputedStyle(e).borderTopColor) ?? undefined) : undefined
  }
  if (k === 'iconColor') {
    const svg = own.find((e) => e.tagName.toLowerCase() === 'svg')
    return svg ? (solid(getComputedStyle(svg).color) ?? undefined) : undefined
  }
  if (k === 'placeholderColor') {
    const f = own.find((e) => e.tagName === 'INPUT' || e.tagName === 'TEXTAREA')
    return f ? (solid(getComputedStyle(f, '::placeholder').color) ?? undefined) : undefined
  }
  // a second, smaller line of text (a button's subtext, a label under a number)
  const leaf = k === 'subtextColor' ? textLeaves[textLeaves.length - 1] : (textLeaves[0] ?? host)
  return leaf ? (solid(getComputedStyle(leaf).color) ?? undefined) : undefined
}
/** Follows what the element shows on the canvas for this colour, as it changes. */
export function useShownColor(id: string | null, k: StyleKey) {
  const [c, setC] = useState<string>()
  useEffect(() => {
    if (!id) return setC(undefined)
    const read = () => setC(readShown(id, k))
    read()
    const t = setInterval(read, 500)
    return () => clearInterval(t)
  }, [id, k])
  return c
}
/** A colour setting's default: the given one, else what the canvas really shows (else none). */
export function useAuto(k: StyleKey, auto?: Auto): Auto | undefined {
  const { node } = useInspector()
  const live = useShownColor(auto ? null : node.id, k)
  return auto ?? (live ? { hex: live, token: 'ink', label: '' } : undefined)
}

export function Color({ k, label, allowNone = true, auto: given }: { k: StyleKey; label: string; allowNone?: boolean; auto?: Auto }) {
  const { s, state, set, reset } = useInspector()
  const auto = useAuto(k, given)
  return (
    <WideRow label={label} state={state(k)} onReset={() => reset(k)}>
      <ColorButton value={s[k] as string | undefined} onChange={(v) => set(k, v as never)} allowNone={allowNone} auto={auto} />
    </WideRow>
  )
}

/** Label takes the free width, control sits right (colour swatches, toggles): long V1 labels never get cut. */
export function WideRow({ label, state, onReset, children }: { label: string; state?: FieldState; onReset?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <Field label={label} state={state} onReset={onReset} stack>
        <span />
      </Field>
      <div className="flex flex-none items-center">{children}</div>
    </div>
  )
}

/** What a colour falls back to when none is set (a theme colour, maybe softened), so the setting shows what you see. */
export type Auto = { token: string; label: string; mix?: number; /** a fixed default instead of the theme colour */ hex?: string }


/** A colour as people read it: "#808080" or, when see-through, "#808080 · 50%". */
function hexLabel(css: string) {
  const m = css.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i)
  if (!m) return css.toUpperCase()
  const hex = '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()
  const a = m[4] === undefined ? 1 : Number(m[4])
  return a < 1 ? `${hex} · ${Math.round(a * 100)}%` : hex
}

export function ColorButton({ value, onChange, allowNone = true, auto }: { value?: string; onChange: (v: string | undefined) => void; allowNone?: boolean; auto?: Auto }) {
  const theme = useEditor((s) => s.doc.theme)
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const tokens: Record<string, string> = { ink: theme.ink, muted: theme.muted, primary: theme.primary, 'on-primary': theme.onPrimary, bg: theme.bg, surface: theme.surface }
  const autoBase = auto ? (auto.hex ?? tokens[auto.token]) : undefined
  const autoColor = auto ? (auto.mix && !auto.hex ? `color-mix(in srgb, ${autoBase} ${auto.mix}%, transparent)` : autoBase) : undefined
  const shown = value ? (tokens[value] ?? value) : autoColor
  // nothing set but something is used: show that colour's hex (and its strength when it is a soft tint)
  const autoLabel = auto ? `${hexLabel(toCss(parseColor(autoBase, tokens)))}${auto.mix && !auto.hex ? ` · ${auto.mix}%` : ''}` : 'None'
  // always the colour's hex (a theme swatch too), like the defaults: one way to read every colour
  const label = value ? hexLabel(toCss(parseColor(tokens[value] ?? value, tokens))) : autoLabel
  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen((o) => !o)}
        className="press flex h-7 items-center gap-2 rounded-[6px] pl-1 pr-2 text-[12px] text-[var(--t2)] hover:bg-[var(--fill-1)]"
      >
        <span
          className="relative h-5 w-5 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.14)]"
          style={{ background: shown ? `linear-gradient(${shown}, ${shown}), repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 6px 6px` : '#fff' }}
        >
          {!shown && <span className="absolute left-1/2 top-[-2px] h-[24px] w-[1.5px] -translate-x-1/2 rotate-45 bg-[var(--dng)]" />}
        </span>
        <span className="tnum max-w-[96px] truncate">{label}</span>
      </button>
      {open && btn.current && <ColorPicker value={value} shown={value ? undefined : autoColor} onChange={onChange} anchor={btn.current} onClose={() => setOpen(false)} allowNone={allowNone} />}
    </>
  )
}

export function AlignRow({ k = 'textAlign', label = 'Alignment' }: { k?: StyleKey; label?: string }) {
  const { s, state, set, reset } = useInspector()
  return (
    <Field label={label} state={state(k)} onReset={() => reset(k)}>
      <Segmented
        full
        size="sm"
        value={(s[k] as string | undefined) ?? 'left'}
        onChange={(v) => set(k, v as never)}
        options={[
          { value: 'left', icon: <AlignLeft size={14} />, tip: 'Left' },
          { value: 'center', icon: <AlignCenter size={14} />, tip: 'Center' },
          { value: 'right', icon: <AlignRight size={14} />, tip: 'Right' },
        ]}
      />
    </Field>
  )
}

export function Choice<T extends string | number>({ k, label, options, seg }: { k: StyleKey; label: string; options: { value: T; label: string; icon?: React.ReactNode; tip?: string }[]; seg?: boolean }) {
  const { s, state, set, reset } = useInspector()
  const v = s[k] as T | undefined
  return (
    <Field label={label} state={state(k)} onReset={() => reset(k)}>
      {seg ? <Segmented full size="sm" value={v ?? options[0].value} onChange={(x) => set(k, x as never)} options={options.map((o) => (o.icon ? { value: o.value, icon: o.icon, tip: o.tip ?? o.label } : o))} /> : <Select value={v ?? options[0].value} onChange={(x) => set(k, x as never)} options={options} />}
    </Field>
  )
}

export function Flag({ k, label }: { k: StyleKey; label: string }) {
  const { s, state, set, reset } = useInspector()
  return (
    <WideRow label={label} state={state(k)} onReset={() => reset(k)}>
      <Toggle checked={!!s[k]} onChange={(v) => set(k, v as never)} />
    </WideRow>
  )
}

/* ---------------- Padding / margin: 2 values, expand to 4 (V1 behaviour) ---------------- */

export function Spacing({ kind }: { kind: 'padding' | 'margin' }) {
  const { s, state, reset, node, device, targets } = useInspector()
  const yk: StyleKey = kind === 'padding' ? 'paddingY' : 'marginY'
  const xk: StyleKey = kind === 'padding' ? 'paddingX' : 'marginX'
  const ak: StyleKey = kind === 'padding' ? 'pad' : 'mar'
  const sides = s[ak] as Sides | undefined
  const y = (s[yk] as number | undefined) ?? 0
  const x = (s[xk] as number | undefined) ?? 0
  const fieldState = state(ak) ?? state(yk) ?? state(xk)
  // like Apple Pages: one switch picks how many values you see; it opens on what the element already has
  const [mode, setMode] = useState<'all' | 'axis' | 'sides'>(sides ? 'sides' : y === x ? 'all' : 'axis')
  // like V1, margins can be negative on any side (overlap a neighbour); padding can't
  const min = kind === 'margin' ? -2000 : 0
  /** Write the spacing (one undo step, on every element the panel edits). */
  const write = (next: { y?: number; x?: number; sides?: Sides | null }, coalesce = true) =>
    update(
      (d) => {
        for (const id of targets ?? [node.id]) {
          const n = find(d, id)
          if (!n) continue
          const b = (device === 'desktop' ? n.style.desktop : (n.style[device] ??= {})) as Record<string, unknown>
          if (next.y !== undefined) b[yk] = next.y
          if (next.x !== undefined) b[xk] = next.x
          if (next.sides === null) delete b[ak]
          else if (next.sides) b[ak] = next.sides
        }
      },
      coalesce ? { coalesce: `${node.id}:${device}:${kind}:${mode}` } : {},
    )
  const pick = (m: 'all' | 'axis' | 'sides') => {
    const [t, r] = sides ?? [y, x]
    if (m === 'all') write({ y: t, x: t, sides: null }, false)
    if (m === 'axis') write({ y: t, x: r, sides: null }, false)
    if (m === 'sides') write({ sides: sides ?? [y, x, y, x] }, false)
    setMode(m)
  }
  const sideVals = sides ?? [y, x, y, x]
  return (
    <Field
      label={kind === 'padding' ? 'Padding' : 'Margin'}
      stack
      state={fieldState}
      onReset={() => {
        reset(ak)
        reset(yk)
        reset(xk)
      }}
    >
      <div className="flex w-full flex-col gap-1.5">
        <Segmented
          full
          size="sm"
          value={mode}
          onChange={pick}
          options={[
            { value: 'all', label: 'All' },
            { value: 'axis', label: 'Axis' },
            { value: 'sides', label: 'Sides' },
          ]}
        />
        {mode === 'all' && <MiniNum icon={<Square size={12} />} tip="All sides" value={y} onChange={(v) => write({ y: v, x: v })} min={min} />}
        {mode === 'axis' && (
          <div className="grid grid-cols-2 gap-1.5">
            <MiniNum icon={<MoveVertical size={12} />} tip="Top and bottom" value={y} onChange={(v) => write({ y: v })} min={min} />
            <MiniNum icon={<MoveHorizontal size={12} />} tip="Left and right" value={x} onChange={(v) => write({ x: v })} min={min} />
          </div>
        )}
        {mode === 'sides' && (
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                [ArrowUpToLine, 'Top'],
                [ArrowRightToLine, 'Right'],
                [ArrowDownToLine, 'Bottom'],
                [ArrowLeftToLine, 'Left'],
              ] as const
            ).map(([Icon, l], i) => (
              <MiniNum
                key={l}
                icon={<Icon size={12} />}
                tip={l}
                value={sideVals[i]}
                onChange={(v) => {
                  const next = [...sideVals] as Sides
                  next[i] = v
                  write({ sides: next })
                }}
                min={min}
              />
            ))}
          </div>
        )}
      </div>
    </Field>
  )
}

function MiniNum({ icon, tip, value, onChange, min = 0 }: { icon: ReactNode; tip: string; value: number; onChange: (v: number) => void; min?: number }) {
  const [draft, setDraft] = useState<string | null>(null)
  const scrub = useScrub(value, (v) => (setDraft(null), onChange(v)), 1, min, 2000)
  return (
    <label className="flex h-7 min-w-0 items-center gap-1 rounded-[6px] bg-[var(--fill-1)] pl-1.5 pr-0.5 text-[var(--t4)] focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
      <Tooltip label={`${tip} · drag to adjust`}>
        <span onPointerDown={scrub} className="flex h-5 w-4 flex-none cursor-ew-resize items-center justify-center hover:text-[var(--t1)]">
          {icon}
        </span>
      </Tooltip>
      <input
        type="number"
        aria-label={tip}
        className="tnum w-full min-w-0 bg-transparent text-[12px] font-medium text-[var(--t1)] outline-none"
        value={draft ?? String(value)}
        onChange={(e) => {
          // the page follows as you type (like V1); half-typed values like "-" or "" wait
          setDraft(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && !Number.isNaN(n)) onChange(Math.max(min, n))
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.max(min, value + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)))
            setDraft(null)
          }
        }}
      />
      <Stepper value={value} onChange={(v) => (setDraft(null), onChange(v))} min={min} max={2000} />
    </label>
  )
}

/* ---------------- Corner radius: all corners or each corner ---------------- */

export function CornerRadius({ label = 'Corner radius', max = 60 }: { label?: string; max?: number }) {
  const { s, state, set, reset } = useInspector()
  const radii = s.radii as Corners | undefined
  const r = s.radius ?? 0
  return (
    <Field
      label={label}
      stack
      state={state('radii') ?? state('radius')}
      onReset={() => {
        reset('radii')
        reset('radius')
      }}
    >
      <div className="flex w-full items-start gap-1.5">
        {radii ? (
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            {['Top left', 'Top right', 'Bottom right', 'Bottom left'].map((l, i) => (
              <MiniNum
                key={l}
                tip={l}
                icon={<span className="h-2 w-2 border-[var(--t3)]" style={{ borderStyle: 'solid', borderWidth: i === 0 ? '1.5px 0 0 1.5px' : i === 1 ? '1.5px 1.5px 0 0' : i === 2 ? '0 1.5px 1.5px 0' : '0 0 1.5px 1.5px', borderRadius: i === 0 ? '3px 0 0 0' : i === 1 ? '0 3px 0 0' : i === 2 ? '0 0 3px 0' : '0 0 0 3px' }} />}
                value={radii[i]}
                onChange={(v) => {
                  const n = [...radii] as Corners
                  n[i] = v
                  set('radii', n)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1">
            <NumberField value={r} onChange={(v) => set('radius', v)} max={max} />
          </div>
        )}
        <IconButton
          tip={radii ? 'Same on every corner' : 'Set each corner'}
          className="h-7 w-7"
          onClick={() => {
            if (radii) {
              set('radius', radii[0])
              reset('radii')
            } else set('radii', [r, r, r, r])
          }}
        >
          {radii ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </IconButton>
      </div>
    </Field>
  )
}

/* ---------------- Border group ---------------- */

export function BorderGroup({ withType = true, title = 'Border', radius = true }: { withType?: boolean; title?: string; radius?: boolean }) {
  const { s } = useInspector()
  const type = s.borderType ?? (s.border ? 'full' : 'none')
  return (
    <G title={title} keys={['borderType', 'borderStyle', 'borderWidth', 'borderColor', 'radius', 'radii', 'border']}>
      {withType && (
        <Choice
          k="borderType"
          label="Type"
          options={[
            { value: 'none', label: 'None' },
            { value: 'full', label: 'Full border' },
            { value: 'bottom', label: 'Bottom only' },
            { value: 'top', label: 'Top only' },
            { value: 'topbottom', label: 'Top and bottom' },
          ]}
        />
      )}
      {(type !== 'none' || !withType) && (
        <>
          <Choice
            k="borderStyle"
            label="Style"
            seg
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dotted', label: 'Dotted' },
              { value: 'dashed', label: 'Dashed' },
            ]}
          />
          <Num k="borderWidth" label="Width" max={20} fallback={1} />
          <Color k="borderColor" label="Colour" auto={{ hex: EDGE, token: 'ink', label: '' }} />
        </>
      )}
      {radius && <CornerRadius />}
    </G>
  )
}

export function ShadowRow() {
  return (
    <Choice
      k="shadow"
      label="Shadow"
      options={[
        { value: 'none', label: 'No shadow' },
        { value: 'soft', label: 'Soft shadow' },
        { value: 'mid', label: 'Mid shadow' },
        { value: 'hard', label: 'Hard shadow' },
        { value: 'far', label: 'Far shadow' },
      ]}
    />
  )
}

/* ---------------- Font type (same groups as V1) ---------------- */

export function FontType({ k = 'fontFamily' }: { k?: StyleKey }) {
  const { s, state, set, reset } = useInspector()
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const v = s[k] as string | undefined
  return (
    <Field label="Font type" state={state(k)} onReset={() => reset(k)}>
      <button ref={btn} onClick={() => setOpen((o) => !o)} className="press flex h-8 w-full items-center justify-between gap-2 rounded-[6px] bg-[var(--fill-1)] px-2.5 text-left text-[13px] hover:bg-[var(--fill-2)]">
        <span className="truncate" style={{ fontFamily: v }}>
          {v ?? 'Same font as the page'}
        </span>
        <ChevronDown size={14} className="flex-none text-[var(--t3)]" />
      </button>
      {open && btn.current && (
        <FontMenu
          anchor={btn.current}
          value={v}
          onClose={() => setOpen(false)}
          onPick={(f) => {
            ensureFont(f)
            set(k, f as never)
            setOpen(false)
          }}
        />
      )}
    </Field>
  )
}

export function FontMenu({ anchor, value, onPick, onClose }: { anchor: HTMLElement; value?: string; onPick: (f: string | undefined) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const match = (f: string) => f.toLowerCase().includes(q.toLowerCase())
  const groups: [string, string[]][] = [
    ['Custom fonts', [...customFonts.keys()].filter(match)],
    ['Google fonts', GOOGLE_FONTS.filter(match)],
    ['Web safe fonts', WEB_SAFE_FONTS.filter(match)],
  ]
  return (
    <Popover anchor={anchor} onClose={onClose} width={260}>
      <div className="p-1.5">
        <label className="mb-1 flex h-8 items-center gap-2 rounded-[6px] bg-[var(--fill-1)] px-2 text-[var(--t3)]">
          <Search size={13} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" className="w-full bg-transparent text-[13px] text-[var(--t1)] outline-none" />
        </label>
        <div className="scroll-thin max-h-[300px] overflow-auto">
          <FontItem label="Same font as the page" active={!value} onClick={() => onPick(undefined)} />
          {groups.map(([g, list]) =>
            list.length ? (
              <div key={g}>
                <div className="px-2 pb-1 pt-2 text-[11px] font-medium text-[var(--t4)]">{g}</div>
                {list.map((f) => (
                  <FontItem key={f} label={f} font={f} active={value === f} onClick={() => onPick(f)} />
                ))}
              </div>
            ) : null,
          )}
        </div>
        <div className="mt-1 border-t border-[var(--line)] pt-1">
          <button onClick={() => file.current?.click()} className="press flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-[12px] font-medium text-[var(--t2)] hover:bg-[var(--fill-1)]">
            <Upload size={13} /> Upload a custom font
          </button>
          <input
            ref={file}
            type="file"
            accept=".woff,.woff2,.ttf,.otf"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                onPick(await addCustomFont(f))
                toast(`Added ${f.name}`)
              } catch {
                toast('That file is not a font we can read')
              }
            }}
          />
        </div>
      </div>
    </Popover>
  )
}

function FontItem({ label, font, active, onClick }: { label: string; font?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onMouseEnter={() => ensureFont(font)}
      onClick={onClick}
      className="press flex h-8 w-full items-center justify-between rounded-[6px] px-2 text-left text-[13px] hover:bg-[var(--fill-1)]"
      style={{ fontFamily: font }}
    >
      {label}
      {active && <Check size={13} className="text-[var(--t2)]" />}
    </button>
  )
}

/* ---------------- Props controls ---------------- */

export function PText({ p, label, multiline, placeholder, stack }: { p: keyof Props; label: string; multiline?: boolean; placeholder?: string; stack?: boolean }) {
  const { node, setProps } = useInspector()
  const v = node.props[p]
  return (
    <Field label={label} stack={stack ?? multiline}>
      <TextField multiline={multiline} value={typeof v === 'string' ? v.replace(/<[^>]+>/g, '') : v === undefined ? '' : String(v)} onChange={(x) => setProps({ [p]: x })} placeholder={placeholder} />
    </Field>
  )
}

export function PNum({ p, label, min = 0, max = 100, unit, fallback }: { p: keyof Props; label: string; min?: number; max?: number; unit?: string; fallback?: number }) {
  const { node, setProps } = useInspector()
  return (
    <Field label={label}>
      <NumberField value={(node.props[p] as number | undefined) ?? fallback ?? min} onChange={(v) => setProps({ [p]: v })} min={min} max={max} unit={unit} />
    </Field>
  )
}

export function PFlag({ p, label, hint }: { p: keyof Props; label: string; hint?: string }) {
  const { node, setProps } = useInspector()
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="text-[12px] leading-[17px] text-[var(--t2)]" title={hint}>
        {label}
      </span>
      <Toggle checked={!!node.props[p]} onChange={(v) => setProps({ [p]: v }, false)} />
    </label>
  )
}

export function PChoice<T extends string | number>({ p, label, options, seg, stack }: { p: keyof Props; label: string; options: { value: T; label: string }[]; seg?: boolean; stack?: boolean }) {
  const { node, setProps } = useInspector()
  const v = (node.props[p] as T | undefined) ?? options[0].value
  return (
    <Field label={label} stack={stack}>
      {seg ? <Segmented full size="sm" value={v} onChange={(x) => setProps({ [p]: x }, false)} options={options} /> : <Select value={v} onChange={(x) => setProps({ [p]: x }, false)} options={options} />}
    </Field>
  )
}

/* ---------------- Icon picker ---------------- */

export function IconPick({ p, label, allowNone = true }: { p: keyof Props; label: string; allowNone?: boolean }) {
  const { node, setProps } = useInspector()
  const v = node.props[p] as string | undefined
  return (
    <Field label={label} stack>
      <IconSelect value={v} onChange={(x) => setProps({ [p]: x }, false)} allowNone={allowNone} />
    </Field>
  )
}

export function IconSelect({ value, onChange, allowNone = true }: { value?: string; onChange: (v: string | undefined) => void; allowNone?: boolean }) {
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const Icon = value ? ICONS[value] : undefined
  // the whole library (about 1,600 icons) arrives when the picker opens; search matches names and keywords
  const v = useSyncExternalStore(subscribeIcons, iconsVersion)
  useEffect(() => {
    if (open) void loadIconLibrary()
  }, [open])
  const list = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!words.length) return allIconNames()
    const hit = (n: string) => words.every((w) => n.includes(w) || iconTags(n).some((t) => t.includes(w)))
    // names that match come first, then keyword matches
    const all = allIconNames().filter(hit)
    return [...all.filter((n) => words.every((w) => n.includes(w))), ...all.filter((n) => !words.every((w) => n.includes(w)))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, v])
  // big grids fill in as you scroll, so the picker opens instantly
  const [limit, setLimit] = useState(160)
  useEffect(() => setLimit(160), [q])
  return (
    <div className="flex w-full items-center gap-1.5">
      <button ref={btn} onClick={() => setOpen((o) => !o)} className="press flex h-8 flex-1 items-center gap-2 rounded-[6px] bg-[var(--fill-1)] px-2 text-[13px] hover:bg-[var(--fill-2)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-[var(--raised)] shadow-[var(--shadow-card)]">{Icon ? <Icon size={13} /> : null}</span>
        <span className="flex-1 truncate text-left">{value ?? 'None'}</span>
        <ChevronDown size={14} className="text-[var(--t3)]" />
      </button>
      {allowNone && value && (
        <IconButton tip="Remove icon" className="h-8 w-8" onClick={() => onChange(undefined)}>
          <X size={14} />
        </IconButton>
      )}
      {open && btn.current && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} width={272}>
          <div className="p-2">
            <label className="mb-2 flex h-8 items-center gap-2 rounded-[6px] bg-[var(--fill-1)] px-2 text-[var(--t3)]">
              <Search size={13} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons…" className="w-full bg-transparent text-[13px] text-[var(--t1)] outline-none" />
            </label>
            {!q && <div className="px-1 pb-1 text-[11px] font-medium text-[var(--t4)]">Popular icons</div>}
            {!q && <IconGrid names={POPULAR_ICONS} value={value} onPick={(n) => (onChange(n), setOpen(false))} />}
            <div className="px-1 pb-1 pt-2 text-[11px] font-medium text-[var(--t4)]">
              {q ? (list.length ? `${list.length} icons` : 'No icons match') : `All icons${iconLibraryLoaded() ? ` · ${list.length}` : ''}`}
            </div>
            <div
              className="scroll-thin max-h-[240px] overflow-auto"
              onScroll={(e) => {
                const el = e.currentTarget
                if (el.scrollTop + el.clientHeight > el.scrollHeight - 120 && limit < list.length) setLimit((l) => l + 160)
              }}
            >
              <IconGrid names={list.slice(0, limit)} value={value} onPick={(n) => (onChange(n), setOpen(false))} />
              {!iconLibraryLoaded() && <div className="px-1 py-2 text-[11px] text-[var(--t4)]">Loading more icons…</div>}
            </div>
          </div>
        </Popover>
      )}
    </div>
  )
}

function IconGrid({ names, value, onPick }: { names: string[]; value?: string; onPick: (n: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {names.map((n) => {
        const I = ICONS[n]
        return (
          <button key={n} title={n} onClick={() => onPick(n)} className={cx('press flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]', value === n && 'bg-[var(--brand-tint)] text-[var(--brand-ink)]')}>
            <I size={15} />
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- File upload (video, audio): picked from the computer, shown by name ---------------- */

export function FilePick({ file, name, label, kind, hint }: { file: keyof Props; name: keyof Props; label: string; kind: 'video' | 'audio'; hint: string }) {
  const { node, setProps } = useInspector()
  const [open, setOpen] = useState(false)
  const value = node.props[file] as string | undefined
  return (
    <Field label={label} stack>
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--t2)]">{value ? ((node.props[name] as string | undefined) ?? 'File') : hint}</span>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Upload size={13} /> {value ? 'Replace' : 'Upload'}
        </Button>
        {value && (
          <IconButton tip="Remove file" onClick={() => setProps({ [file]: undefined, [name]: undefined }, false)}>
            <X size={14} />
          </IconButton>
        )}
      </div>
      {open && <UploadModal kind={kind} onClose={() => setOpen(false)} onInsert={(src, n) => (setProps({ [file]: src, [name]: n }, false), setOpen(false))} />}
    </Field>
  )
}

/* ---------------- Image upload (V1 modal: Upload / Your images) ---------------- */

export function ImagePick({ p, k, label = 'Image file' }: { p?: keyof Props; k?: StyleKey; label?: string }) {
  const ins = useInspector()
  const value = p ? (ins.node.props[p] as string | undefined) : (ins.s[k!] as string | undefined)
  const [open, setOpen] = useState(false)
  const apply = (v: string | undefined) => (p ? ins.setProps({ [p]: v }, false) : ins.set(k!, v as never))
  return (
    <Field label={label} stack state={k ? ins.state(k) : undefined} onReset={k ? () => ins.reset(k) : undefined}>
      <div className="flex w-full items-center gap-2">
        <button onClick={() => setOpen(true)} className="press relative h-12 w-16 flex-none overflow-hidden rounded-[6px] bg-[var(--fill-1)] shadow-[var(--shadow-card)]">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Upload size={14} className="mx-auto text-[var(--t3)]" />}
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <Button size="sm" onClick={() => setOpen(true)} className="self-start">
            <Upload size={13} /> {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <button onClick={() => apply(undefined)} className="press self-start text-[11px] text-[var(--t3)] hover:text-[var(--dng)]">
              Remove
            </button>
          )}
        </div>
      </div>
      {open && <UploadModal onClose={() => setOpen(false)} onInsert={(v) => (apply(v), setOpen(false))} />}
    </Field>
  )
}

type MediaKind = 'image' | 'video' | 'audio'
const KIND_TEXT: Record<MediaKind, { yours: string; formats: string; empty: string; accept: string }> = {
  image: { yours: 'Your images', formats: 'All image formats are supported', empty: 'Images you upload or use on this page show up here.', accept: 'image/*' },
  video: { yours: 'Your videos', formats: 'MP4, WebM or MOV', empty: 'Videos you upload on this page show up here.', accept: 'video/*' },
  audio: { yours: 'Your audio', formats: 'MP3, M4A, WAV or OGG', empty: 'Audio files you upload on this page show up here.', accept: 'audio/*' },
}
const uploaded: { src: string; name?: string; kind: MediaKind }[] = []

/** V1's upload modal (Upload / Your files), the same for images, videos and audio. */
export function UploadModal({ onClose, onInsert, kind = 'image' }: { onClose: () => void; onInsert: (src: string, name?: string) => void; kind?: MediaKind }) {
  const doc = useEditor((s) => s.doc)
  const text = KIND_TEXT[kind]
  const [tab, setTab] = useState<'upload' | 'yours'>('upload')
  const [optimize, setOptimize] = useState(true)
  const [picked, setPicked] = useState<{ src: string; name?: string } | null>(null)
  const [over, setOver] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const yours = useMemo(() => {
    const out = new Map<string, string | undefined>()
    uploaded.filter((u) => u.kind === kind).forEach((u) => out.set(u.src, u.name))
    if (kind === 'image') JSON.stringify(doc).replace(/"(?:src|backgroundImage)":"([^"]+)"/g, (_, u) => (out.has(u) || out.set(u, undefined), ''))
    else
      JSON.stringify(doc).replace(new RegExp(`"${kind}File":"([^"]+)"(?:,"${kind}Name":"([^"]*)")?`, 'g'), (_, u, n) => (out.has(u) || out.set(u, n), ''))
    return [...out].map(([src, name]) => ({ src, name }))
  }, [doc, kind])
  const read = async (f: File) => {
    // small files are kept in the page; bigger videos / audio play for this session (the real editor uploads them)
    const src =
      kind !== 'image' && f.size > 3_000_000
        ? URL.createObjectURL(f)
        : await new Promise<string>((res) => {
            const r = new FileReader()
            r.onload = () => res(String(r.result))
            r.readAsDataURL(f)
          })
    const out = kind === 'image' && optimize ? await downscale(src, 2000) : src
    uploaded.unshift({ src: out, name: f.name, kind })
    setPicked({ src: out, name: f.name })
    setTab('yours')
  }
  return (
    <Scrim onClose={onClose}>
      <div className="pop-in w-[560px] max-w-[calc(100vw-32px)] rounded-[14px] bg-[var(--raised)] shadow-[var(--shadow-pop)]" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="w-[220px]">
            <Segmented
              full
              value={tab}
              onChange={setTab}
              options={[
                { value: 'upload', label: 'Upload' },
                { value: 'yours', label: text.yours },
              ]}
            />
          </div>
          <IconButton tip="Close" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="px-4 pb-4">
          {tab === 'upload' ? (
            <button
              onClick={() => file.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(true)
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) read(f)
              }}
              className={cx('press flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed text-[13px]', over ? 'border-[var(--brand)] bg-[var(--brand-tint)]' : 'border-[var(--line-2)] bg-[var(--fill-1)]')}
            >
              <Upload size={20} className="text-[var(--t3)]" />
              <span className="font-medium">Drag a file or click to upload</span>
              <span className="text-[12px] text-[var(--t3)]">{text.formats}</span>
            </button>
          ) : yours.length ? (
            kind === 'image' ? (
              <div className="scroll-thin grid max-h-[260px] grid-cols-4 gap-2 overflow-auto">
                {yours.map((u) => (
                  <button key={u.src} onClick={() => setPicked(u)} className={cx('press aspect-square overflow-hidden rounded-[8px] shadow-[var(--shadow-card)]', picked?.src === u.src && 'shadow-[0_0_0_2px_var(--brand)]')}>
                    <img src={u.src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="scroll-thin flex max-h-[260px] flex-col gap-1 overflow-auto">
                {yours.map((u) => (
                  <button
                    key={u.src}
                    onClick={() => setPicked(u)}
                    className={cx('press flex h-12 items-center gap-3 rounded-[8px] px-2 text-left text-[13px] hover:bg-[var(--fill-1)]', picked?.src === u.src && 'bg-[var(--brand-tint)] shadow-[inset_0_0_0_1.5px_var(--brand)]')}
                  >
                    {kind === 'video' ? (
                      <video src={u.src} muted preload="metadata" className="h-9 w-14 flex-none rounded-[5px] bg-black object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[6px] bg-[var(--fill-1)] text-[var(--t2)]">
                        <AudioLines size={16} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{u.name ?? (kind === 'video' ? 'Video' : 'Audio file')}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="flex h-[220px] items-center justify-center text-[13px] text-[var(--t3)]">{text.empty}</div>
          )}
          <input
            ref={file}
            type="file"
            accept={text.accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) read(f)
              e.target.value = ''
            }}
          />
          <div className="mt-3 flex items-center justify-between">
            {kind === 'image' ? (
              <label className="flex items-center gap-2 text-[12px] text-[var(--t2)]">
                <Toggle checked={optimize} onChange={setOptimize} />
                Optimize uploaded images
              </label>
            ) : (
              <span />
            )}
            <div className="flex gap-1.5">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={!picked} onClick={() => picked && onInsert(picked.src, picked.name)}>
                Insert
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Scrim>
  )
}

async function downscale(src: string, max: number): Promise<string> {
  const img = new Image()
  img.src = src
  await img.decode().catch(() => undefined)
  const k = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max))
  if (k >= 1 || src.startsWith('data:image/svg')) return src
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.86)
}

/* ---------------- Groups every element shares (V1 order) ---------------- */

export function TypographyGroup({ size = true, lh = true, font = true, spacing = true, sizeMax = 120, children }: { size?: boolean; lh?: boolean; font?: boolean; spacing?: boolean; sizeMax?: number; children?: ReactNode }) {
  return (
    <G title="Typography" keys={['fontSize', 'lineHeight', 'fontFamily', 'letterSpacing', 'fontWeight']}>
      {size && <Num k="fontSize" label="Font size" min={8} max={sizeMax} fallback={16} />}
      {lh && <LineHeight />}
      {font && <FontType />}
      {spacing && <Num k="letterSpacing" label="Letter spacing" min={0} max={20} step={0.5} fallback={0} floor={-Infinity} ceiling={Infinity} />}
      {children}
    </G>
  )
}

export function SizePosition({ pad = true, mar = true, children }: { pad?: boolean; mar?: boolean; children?: ReactNode }) {
  return (
    <G title="Size and position" keys={['paddingY', 'paddingX', 'pad', 'marginY', 'marginX', 'mar']}>
      {pad && <Spacing kind="padding" />}
      {mar && <Spacing kind="margin" />}
      {children}
    </G>
  )
}

export function CopyId({ id }: { id: string }) {
  return (
    <Field label="ID attribute">
      <div className="flex w-full items-center gap-1">
        <span className="tnum flex h-7 flex-1 items-center truncate rounded-[6px] bg-[var(--fill-1)] px-2 text-[12px] text-[var(--t2)]">{id}</span>
        <IconButton
          tip="Copy ID"
          className="h-7 w-7"
          onClick={() => {
            navigator.clipboard?.writeText(id).catch(() => undefined)
            toast('ID copied')
          }}
        >
          <Copy size={13} />
        </IconButton>
      </div>
    </Field>
  )
}

/* ---------------- Form field basics (V1) ---------------- */

/** A small (?) that explains a setting on hover. */
export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip label={text} side="top">
      <span tabIndex={0} aria-label={text} className="inline-flex h-4 w-4 flex-none cursor-help items-center justify-center rounded-full bg-[var(--fill-2)] text-[10px] font-semibold text-[var(--t3)] outline-none hover:bg-[var(--brand)] hover:text-white focus-visible:bg-[var(--brand)] focus-visible:text-white">?</span>
    </Tooltip>
  )
}

/** "Optional" with its explanation, like V1. */
export function OptionalRow({ hint }: { hint: string }) {
  const { node, setProps } = useInspector()
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[12px] leading-[17px] text-[var(--t2)]">
        Optional
        <HelpTip text={hint} />
      </span>
      <Toggle checked={!!node.props.optional} onChange={(v) => setProps({ optional: v }, false)} />
    </div>
  )
}

/** The id a field gets on the published page (for your own scripts or styles), with a copy button. */
export function fieldDomId(node: { id: string; type: string }) {
  return `${node.type === 'checkbox' ? 'checkbox' : 'field'}-${node.id.slice(-8)}`
}
