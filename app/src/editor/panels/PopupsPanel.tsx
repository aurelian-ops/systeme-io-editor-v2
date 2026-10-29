import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, MoveHorizontal, MoveVertical, Plus, Trash2 } from 'lucide-react'
import { getState, toast, update, useEditor } from '../store'
import { uid } from '../blocks'
import { DEVICE_WIDTH, type Popup, type ShadowPreset, type Style } from '../types'
import { ColorButton } from '../settings/kit'
import { PopupCard } from '../render/PopupView'
import { Button, Field, Group, IconButton, NumberField, Select, TextField, Toggle, Tooltip } from '../../ui/kit'
import { Dialog, PanelHeader, Row } from './SettingsPanel'

/* ---------------- Which popup is open in the panel (shown on the canvas) ---------------- */

let editing: string | null = null
const subs = new Set<() => void>()
function setEditing(id: string | null) {
  if (editing === id) return
  editing = id
  subs.forEach((l) => l())
}
export function useEditingPopup() {
  return useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => editing,
  )
}

/* ---------------- Model helpers ---------------- */

export function newPopup(n: number): Popup {
  return {
    id: uid('pop'),
    name: n > 1 ? `Popup ${n}` : 'Popup',
    enabled: true,
    closeButton: true,
    auto: false,
    delay: 5,
    exitIntent: false,
    width: 600,
    headline: 'Get the free guide',
    text: 'Join the list and the guide lands in your inbox in a minute.',
    buttonText: 'Send me the guide',
    note: 'No spam. Unsubscribe in one click.',
    style: { background: 'bg', paddingY: 40, paddingX: 40, radius: 16, shadow: 'far' },
  }
}

function setPopup(id: string, patch: Partial<Popup>, coalesce?: string) {
  update(
    (d) => {
      const p = d.popups?.find((x) => x.id === id)
      if (p) Object.assign(p, patch)
    },
    coalesce ? { coalesce: `popup:${id}:${coalesce}` } : {},
  )
}

function setPopupStyle<K extends keyof Style>(id: string, k: K, v: Style[K] | undefined, coalesce = true) {
  update(
    (d) => {
      const p = d.popups?.find((x) => x.id === id)
      if (!p) return
      p.style ??= {}
      if (v === undefined) delete p.style[k]
      else p.style[k] = v
    },
    coalesce ? { coalesce: `popup:${id}:style:${k}` } : {},
  )
}

function triggerLine(p: Popup) {
  const parts: string[] = []
  if (p.auto) parts.push(`Opens after ${p.delay} s`)
  if (p.exitIntent) parts.push('On exit intent')
  if (!parts.length) parts.push('Opens from a button')
  return parts.join(' · ')
}

/* ---------------- Panel ---------------- */

export function PopupsPanel() {
  const popups = useEditor((s) => s.doc.popups) ?? []
  const current = useEditingPopup()
  const open = popups.find((p) => p.id === current)

  // leaving the panel closes the popup on the canvas
  useEffect(() => () => setEditing(null), [])

  const create = () => {
    const p = newPopup((getState().doc.popups?.length ?? 0) + 1)
    update((d) => {
      d.popups = [...(d.popups ?? []), p]
    })
    setEditing(p.id)
    toast(`Created “${p.name}”`, true)
  }

  if (open) return <PopupSettings popup={open} />

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Popups"
        right={
          <IconButton tip="Create a popup" onClick={create}>
            <Plus size={16} />
          </IconButton>
        }
      />
      <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto p-2">
        {popups.length === 0 ? (
          <div className="flex flex-col items-center px-4 pb-10 pt-12 text-center">
            <EmptyArt />
            <div className="mt-5 text-[13px] font-medium">No popups yet</div>
            <p className="mt-1 text-[12px] leading-[18px] text-[var(--t3)]">You haven’t created any popups yet. Click the ‘+’ icon to create your first one.</p>
            <Button className="mt-4" onClick={create}>
              <Plus size={14} />
              Create a popup
            </Button>
          </div>
        ) : (
          popups.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(p.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setEditing(p.id))}
              className="press group flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 hover:bg-[var(--fill-1)]"
            >
              <PopupThumb popup={p} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{p.name || 'Untitled popup'}</div>
                <div className="truncate text-[11px] text-[var(--t4)]">{p.enabled ? triggerLine(p) : 'Inactive'}</div>
              </div>
              <span onClick={(e) => e.stopPropagation()} className="flex items-center">
                <Tooltip label={p.enabled ? 'Active' : 'Inactive'}>
                  <span className="flex">
                    <Toggle checked={p.enabled} label={`${p.name} active`} onChange={(v) => setPopup(p.id, { enabled: v })} />
                  </span>
                </Tooltip>
              </span>
              <ChevronRight size={14} className="flex-none text-[var(--t4)] group-hover:text-[var(--t2)]" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** A tiny neutral drawing: a page with a popup card on top. */
function EmptyArt() {
  return (
    <div className="relative h-[72px] w-[104px] rounded-[8px] bg-[var(--fill-1)] shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="absolute left-2.5 right-2.5 top-2.5 h-1.5 rounded-full bg-[var(--fill-2)]" />
      <div className="absolute left-2.5 top-[22px] h-1.5 w-10 rounded-full bg-[var(--fill-2)]" />
      <div className="absolute left-1/2 top-1/2 flex h-[42px] w-[58px] -translate-x-1/2 -translate-y-[38%] flex-col items-center justify-center gap-1 rounded-[6px] bg-[var(--raised)] shadow-[var(--shadow-pop)]">
        <span className="h-1 w-7 rounded-full bg-[var(--t4)]" />
        <span className="h-1 w-9 rounded-full bg-[var(--fill-2)]" />
        <span className="mt-0.5 h-2 w-9 rounded-[3px] bg-[var(--ink)]" />
      </div>
    </div>
  )
}

function PopupThumb({ popup }: { popup: Popup }) {
  return (
    <span className="relative flex h-8 w-10 flex-none items-center justify-center rounded-[6px] bg-[var(--fill-1)]">
      <span className="flex h-5 w-6 flex-col items-center justify-center gap-[3px] rounded-[3px] bg-[var(--raised)] shadow-[var(--shadow-card)]" style={{ opacity: popup.enabled ? 1 : 0.5 }}>
        <span className="h-[2px] w-3 rounded-full bg-[var(--t4)]" />
        <span className="h-[3px] w-4 rounded-[1px] bg-[var(--t2)]" />
      </span>
    </span>
  )
}

/* ---------------- One popup's settings (V1 order) ---------------- */

const SHADOWS: { value: ShadowPreset; label: string }[] = [
  { value: 'none', label: 'No shadow' },
  { value: 'soft', label: 'Soft shadow' },
  { value: 'mid', label: 'Mid shadow' },
  { value: 'hard', label: 'Hard shadow' },
  { value: 'far', label: 'Far shadow' },
]

function PopupSettings({ popup: p }: { popup: Popup }) {
  const [confirm, setConfirm] = useState(false)
  const s = p.style ?? {}
  const set = (patch: Partial<Popup>, key?: string) => setPopup(p.id, patch, key)
  const st = <K extends keyof Style>(k: K, v: Style[K] | undefined, coalesce = true) => setPopupStyle(p.id, k, v, coalesce)
  const borderStyle = s.borderType && s.borderType !== 'none' ? (s.borderStyle ?? 'solid') : 'none'

  const remove = () => {
    update((d) => {
      d.popups = (d.popups ?? []).filter((x) => x.id !== p.id)
    })
    setConfirm(false)
    setEditing(null)
    toast(`Deleted “${p.name}”`, true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="-ml-0.5 pl-1.5">
          <ChevronLeft size={14} />
          Back
        </Button>
        <IconButton tip="Delete popup" onClick={() => setConfirm(true)} className="hover:!text-[var(--dng)]">
          <Trash2 size={15} />
        </IconButton>
      </div>
      <div className="px-4 pb-3">
        <div className="truncate text-[16px] font-semibold leading-[22px]">{p.name || 'Untitled popup'}</div>
        <div className="mt-0.5 text-[12px] text-[var(--t4)]">Popup · {p.enabled ? triggerLine(p) : 'Off'}</div>
      </div>

      <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto pb-16">
        <Group title="Popup">
          <Field label="Name">
            <TextField value={p.name} onChange={(v) => set({ name: v }, 'name')} />
          </Field>
          <Switch label="Active" checked={p.enabled} onChange={(v) => set({ enabled: v })} />
        </Group>

        <Group title="Settings">
          <Switch label="Show close button" checked={p.closeButton} onChange={(v) => set({ closeButton: v })} />
          <Switch label="Open popup automatically?" checked={p.auto} onChange={(v) => set({ auto: v })} />
          {p.auto && (
            <div className="flex flex-col gap-2 rounded-[8px] bg-[var(--fill-1)] px-2.5 py-2.5">
              <span className="text-[12px] leading-[17px] text-[var(--t3)]">
                Automatically open popup <span className="tnum font-medium text-[var(--t1)]">{p.delay}</span> {p.delay === 1 ? 'second' : 'seconds'} after the page was loaded
              </span>
              <NumberField value={p.delay} onChange={(v) => set({ delay: Math.max(0, Math.round(v)) }, 'delay')} max={60} unit="s" />
            </div>
          )}
          <Switch label="Open on exit intent?" checked={p.exitIntent} onChange={(v) => set({ exitIntent: v })} />
          <Field label="Width">
            <NumberField value={p.width} onChange={(v) => set({ width: Math.max(280, v) }, 'width')} min={280} max={1000} step={10} unit="px" />
          </Field>
        </Group>

        <Group title="Color">
          <Row label="Background color">
            <ColorButton value={s.background ?? 'bg'} onChange={(v) => st('background', v, false)} />
          </Row>
        </Group>

        <Group title="Size and position">
          <Field label="Padding" stack>
            <div className="flex w-full flex-col gap-1.5">
              <AxisRow icon={<MoveVertical size={13} />} tip="Top and bottom">
                <NumberField value={s.paddingY ?? 40} onChange={(v) => st('paddingY', v)} max={120} unit="px" />
              </AxisRow>
              <AxisRow icon={<MoveHorizontal size={13} />} tip="Left and right">
                <NumberField value={s.paddingX ?? 40} onChange={(v) => st('paddingX', v)} max={120} unit="px" />
              </AxisRow>
            </div>
          </Field>
        </Group>

        <Group title="Border">
          <Field label="Corner radius">
            <NumberField value={s.radius ?? 16} onChange={(v) => st('radius', v)} max={60} unit="px" />
          </Field>
          <Field label="Style">
            <Select
              value={borderStyle}
              onChange={(v) =>
                update((d) => {
                  const x = d.popups?.find((y) => y.id === p.id)
                  if (!x) return
                  x.style ??= {}
                  if (v === 'none') x.style.borderType = 'none'
                  else Object.assign(x.style, { borderType: 'full', borderStyle: v, borderWidth: x.style.borderWidth ?? 1 })
                })
              }
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'dashed', label: 'Dashed' },
              ]}
            />
          </Field>
          {borderStyle !== 'none' && (
            <>
              <Field label="Width">
                <NumberField value={s.borderWidth ?? 1} onChange={(v) => st('borderWidth', v)} max={20} unit="px" />
              </Field>
              <Row label="Colour">
                <ColorButton value={s.borderColor} onChange={(v) => st('borderColor', v, false)} />
              </Row>
            </>
          )}
        </Group>

        <Group title="Shadow">
          <Field label="Shadow">
            <Select value={s.shadow ?? 'far'} onChange={(v) => st('shadow', v, false)} options={SHADOWS} />
          </Field>
        </Group>

        <Group title="Content">
          <Field label="Headline" stack>
            <TextField value={p.headline} onChange={(v) => set({ headline: v }, 'headline')} />
          </Field>
          <Field label="Text" stack>
            <TextField multiline value={p.text} onChange={(v) => set({ text: v }, 'text')} />
          </Field>
          <Field label="Button text" stack>
            <TextField value={p.buttonText} onChange={(v) => set({ buttonText: v }, 'buttonText')} />
          </Field>
          <Field label="Note" stack>
            <TextField value={p.note} onChange={(v) => set({ note: v }, 'note')} />
          </Field>
        </Group>

        <div className="px-4 pt-4">
          <Button variant="danger" className="w-full" onClick={() => setConfirm(true)}>
            <Trash2 size={14} />
            Delete popup
          </Button>
        </div>
      </div>

      {confirm && (
        <Dialog
          title="Delete this popup?"
          onClose={() => setConfirm(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} autoFocus>
                Delete popup
              </Button>
            </>
          }
        >
          “{p.name || 'Untitled popup'}” and its settings will be removed. Buttons set to show it will do nothing until you pick another popup.
        </Dialog>
      )}
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] leading-[17px] text-[var(--t2)]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function AxisRow({ icon, tip, children }: { icon: ReactNode; tip: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip label={tip}>
        <span className="flex h-7 w-5 flex-none items-center justify-center text-[var(--t4)]">{icon}</span>
      </Tooltip>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ---------------- Canvas layer: the popup being edited, over a dimmed page ---------------- */

export function PopupCanvasLayer() {
  const id = useEditingPopup()
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const focus = useEditor((s) => s.focusDevice)
  const popup = doc.popups?.find((p) => p.id === id)
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(1000)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [popup?.id])
  if (!popup) return null
  const device = view === 'all' ? focus : view
  const frame = DEVICE_WIDTH[device]
  const zoom = Math.min(1, (w - 80) / frame)
  return (
    // only over the page, between the floating panels, so the popup's settings stay usable while it shows
    <div
      ref={ref}
      className="fade-in absolute bottom-0 top-12 z-[60] flex flex-col"
      style={{ left: 'var(--left-inset, 0px)', right: 'var(--right-inset, 0px)', background: 'rgba(10,10,10,.42)' }}
    >
      <div className="flex flex-none justify-center pt-4">
        <div className="flex h-8 items-center gap-2 rounded-[8px] bg-[var(--hud)] pl-3 pr-1 text-[12px] font-medium text-white shadow-[var(--shadow-pop)]">
          <span>Editing popup</span>
          <span className="max-w-[200px] truncate text-white/55">{popup.name}</span>
          <button onClick={() => setEditing(null)} className="press ml-1 h-6 rounded-[6px] px-2 text-[12px] font-medium text-white/80 hover:bg-white/10 hover:text-white">
            Done
          </button>
        </div>
      </div>
      <div className="scroll-thin flex min-h-0 flex-1 overflow-auto px-4 py-8">
        <div className="pop-in m-auto flex justify-center" style={{ width: frame, zoom }}>
          <div className="flex w-full justify-center px-4">
            <PopupCard doc={doc} popup={popup} editable compact={frame < 600} />
          </div>
        </div>
      </div>
    </div>
  )
}
