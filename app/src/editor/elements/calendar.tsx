import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Globe, RotateCcw } from 'lucide-react'
import { calendarFields, el } from '../blocks'
import { cssColor } from '../theme'
import { border, padding, radius, shadow } from '../render/css'
import { useRender } from '../render/PageView'
import { Field, Segmented, Select } from '../../ui/kit'
import { BorderGroup, G, PChoice, PText, ShadowRow, SizePosition, useInspector } from '../settings/kit'
import type { Device, Node, Style } from '../types'
import type { ElementDef } from './types'
import { CanvasNote, InfoNote, WideColor } from './input'

/* ---------------- Which step the editor shows: follows the inspector tab ---------------- */

type Step = 'calendar' | 'form' | 'thanks'
const tabs = new Map<string, Step>()
const subs = new Set<() => void>()
function setTab(id: string, t: Step) {
  tabs.set(id, t)
  subs.forEach((f) => f())
}
function useTab(id: string) {
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => tabs.get(id) ?? 'calendar',
  )
}

/* ---------------- Sample availability ---------------- */

const SAMPLE_EVENT = { value: 'sample', label: 'Discovery call (30 min) · sample', name: 'Discovery call', minutes: 30 }
const BASE_SLOTS = [540, 570, 600, 660, 690, 840, 900, 930, 990] // minutes from midnight

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

function isAvailable(d: Date, today: Date) {
  const wd = d.getDay()
  const diff = (startOfDay(d).getTime() - today.getTime()) / 86400000
  return wd !== 0 && wd !== 6 && diff >= 1 && diff <= 45
}
function slotsFor(d: Date) {
  const n = d.getDate()
  return BASE_SLOTS.filter((_, i) => (i + n) % 4 !== 0)
}
function firstAvailable(today: Date) {
  const d = new Date(today)
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() + 1)
    if (isAvailable(d, today)) return new Date(d)
  }
  return today
}
function fmtTime(min: number, h12: boolean) {
  const h = Math.floor(min / 60)
  const m = String(min % 60).padStart(2, '0')
  if (!h12) return `${String(h).padStart(2, '0')}:${m}`
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`
}
const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/* ---------------- Element ---------------- */

export const def: ElementDef = {
  type: 'calendar',
  label: 'Calendar',
  icon: CalendarDays,
  group: 'Form',
  make: () =>
    el(
      'calendar',
      {
        text: 'Set up your booking details',
        subtext: 'Pick a day and a time that suits you.',
        buttonText: 'Next step',
        timeFormat: '24',
        event: SAMPLE_EVENT.value,
        headline2: 'Fill in the form',
        subheadline2: 'We will send the confirmation to your email.',
        submitText: 'Confirm booking',
        finalText: 'The invite is in your inbox. See you then.',
        redirect: 'none',
      },
      { borderType: 'full', borderWidth: 1, paddingY: 32, paddingX: 32 },
      [calendarFields()],
    ),
  render: ({ node, s, device, editable, children }) => <Calendar node={node} s={s} device={device} editable={editable} fields={children()} />,
  settings: () => <CalendarSettings />,
}

const CAL_CSS = `
.sio-cal{container:sio-cal/inline-size}
.sio-cal-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:28px}
.sio-cal-names{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.sio-cal-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
@container sio-cal (min-width: 600px){
  .sio-cal-grid{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:36px}
  .sio-cal-slots{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@container sio-cal (min-width: 440px){.sio-cal-names{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.sio-cal-btn{transition-property:background-color,color,box-shadow,transform,opacity;transition-duration:120ms;transition-timing-function:var(--ease-out,ease)}
.sio-cal-live .sio-cal-btn:not(:disabled):active{transform:scale(0.97)}
.sio-cal-live .sio-cal-pick:not(:disabled):hover{box-shadow:inset 0 0 0 1.5px var(--c-primary)}
.sio-cal-in{transition-property:border-color,box-shadow;transition-duration:120ms;transition-timing-function:var(--ease-out,ease)}
.sio-cal-in::placeholder{color:color-mix(in srgb,currentColor 48%,transparent);opacity:1}
.sio-cal-in:focus{outline:none;border-color:var(--c-primary)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--c-primary) 18%,transparent)}
@keyframes sio-cal-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.sio-cal-step{animation:sio-cal-in 220ms var(--ease-out,ease) backwards}
@media (prefers-reduced-motion: reduce){.sio-cal-step{animation:none}.sio-cal-btn{transition:none}}
`

function Calendar({ node, s, device, editable, fields }: { node: Node; s: Style; device: Device; editable: boolean; fields: ReactNode }) {
  const { doc } = useRender()
  const p = node.props
  const tab = useTab(node.id)
  const today = useMemo(() => startOfDay(new Date()), [])
  const first = useMemo(() => firstAvailable(today), [today])
  const [view, setView] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1))
  const [day, setDay] = useState<Date>(first)
  const [slot, setSlot] = useState<number | null>(null)
  const [liveStep, setLiveStep] = useState<Step>('calendar')
  // the first name they typed, to greet them on the thank-you
  const [guest, setGuest] = useState('')
  const h12 = p.timeFormat === '12'
  const pill = doc.theme.radius >= 999
  const slots = slotsFor(day)
  // the editor previews the selected state so its colours can be styled
  const shownSlot = editable ? slots[1] : slot
  const step = editable ? tab : liveStep
  const nextMonth = new Date(view.getFullYear(), view.getMonth() + 1, 1)
  const canPrev = view.getFullYear() > today.getFullYear() || view.getMonth() > today.getMonth()
  const canNext = (nextMonth.getTime() - today.getTime()) / 86400000 <= 45

  useEffect(() => {
    if (step !== 'thanks' || editable || p.redirect !== 'url' || !p.redirectUrl) return
    const t = window.setTimeout(() => window.location.assign(p.redirectUrl!), 1600)
    return () => window.clearTimeout(t)
  }, [step, editable, p.redirect, p.redirectUrl])

  const title = cssColor(s.titleColor) ?? 'var(--c-heading, var(--c-ink))'
  const text = cssColor(s.color)
  const slotBg = cssColor(s.slotBackground) ?? 'color-mix(in srgb, var(--c-primary) 11%, var(--c-bg))'
  const activeBg = cssColor(s.slotActiveBackground) ?? 'var(--c-primary)'
  const btnRadius = pill ? '999px' : 'var(--r)'
  const cellRadius = pill ? '999px' : 'min(var(--r), 12px)'
  const mobile = device === 'mobile'
  // phones get a tighter card unless the user set mobile padding themselves
  const own = node.style.mobile
  const cardPad =
    mobile && !s.pad && own?.paddingX === undefined && own?.paddingY === undefined
      ? `${Math.min(s.paddingY ?? 32, 22)}px ${Math.min(s.paddingX ?? 32, 18)}px`
      : padding(s, [32, 32])
  const summary = `${fmtDay(day)} · ${fmtTime(shownSlot ?? slots[0], h12)} to ${fmtTime((shownSlot ?? slots[0]) + SAMPLE_EVENT.minutes, h12)}`

  const primaryBtn = (disabled: boolean): CSSProperties => ({
    font: 'inherit',
    fontSize: 16,
    fontWeight: 600,
    width: '100%',
    minHeight: 50,
    padding: '14px 24px',
    border: 0,
    borderRadius: btnRadius,
    background: 'var(--c-primary)',
    color: 'var(--c-on-primary)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  })

  const heading = (h: string | undefined, sub: string | undefined, n: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {n ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: text ?? 'var(--c-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>Step {n} of 2</span>
          <span style={{ display: 'flex', gap: 4, flex: 1, maxWidth: 120 }}>
            {[1, 2].map((i) => (
              <span key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= n ? 'var(--c-primary)' : 'var(--c-line)', transition: 'background-color 200ms var(--ease-out, ease)' }} />
            ))}
          </span>
        </div>
      ) : null}
      {h ? (
        <h3 style={{ margin: 0, fontFamily: 'var(--f-heading)', fontWeight: 'var(--h-weight)' as unknown as number, letterSpacing: 'var(--h-track)', fontSize: mobile ? 21 : 24, lineHeight: 1.2, color: title, textWrap: 'balance' }}>{h}</h3>
      ) : null}
      {sub ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: text ?? 'var(--c-muted)', textWrap: 'pretty' }}>{sub}</p> : null}
    </div>
  )

  const fieldStyle: CSSProperties = {
    font: 'inherit',
    fontSize: 16,
    padding: '13px 16px',
    minHeight: 48,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: radius(s) ?? btnRadius,
    background: 'var(--c-bg)',
    color: cssColor(s.fieldColor) ?? 'var(--c-ink)',
    border: s.borderType === 'none' ? 0 : undefined,
    ...(s.borderType ? border(s) : { border: '1px solid var(--c-edge)' }),
    pointerEvents: editable ? 'none' : undefined,
  }
  const field = (name: string, placeholder: string, type = 'text', auto?: string) => (
    <input className="sio-cal-in" name={name} type={type} autoComplete={auto} placeholder={placeholder} aria-label={placeholder} required={name !== 'phone'} readOnly={editable} tabIndex={editable ? -1 : undefined} style={fieldStyle} />
  )

  const chip = (action?: ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: cellRadius, background: slotBg, color: 'var(--c-ink)', fontSize: 14, lineHeight: 1.4 }}>
      <CalendarDays size={16} style={{ flex: 'none', color: 'var(--c-primary)' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600 }}>{SAMPLE_EVENT.name}</span>
        <span style={{ display: 'block', color: text ?? 'var(--c-muted)', fontVariantNumeric: 'tabular-nums' }}>{summary}</span>
      </span>
      {action}
    </div>
  )

  /* ---------- step 1: month + slots ---------- */
  const monthCells = () => {
    const lead = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null)
    for (let i = 1; i <= count; i++) cells.push(new Date(view.getFullYear(), view.getMonth(), i))
    return cells
  }
  const navBtn = (dir: -1 | 1, enabled: boolean) => {
    const I = dir < 0 ? ChevronLeft : ChevronRight
    return (
      <button
        type="button"
        className="sio-cal-btn"
        aria-label={dir < 0 ? 'Previous month' : 'Next month'}
        disabled={!editable && !enabled}
        tabIndex={editable ? -1 : undefined}
        onClick={() => !editable && enabled && setView(new Date(view.getFullYear(), view.getMonth() + dir, 1))}
        style={{ all: 'unset', boxSizing: 'border-box', width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: cellRadius, boxShadow: 'inset 0 0 0 1px var(--c-line)', color: 'var(--c-ink)', opacity: enabled ? 1 : 0.35, cursor: !enabled ? 'default' : 'pointer' }}
      >
        <I size={16} />
      </button>
    )
  }

  const calendarStep = (
    <div key="calendar" className="sio-cal-step" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {heading(p.text, p.subtext, 1)}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: text ?? 'var(--c-muted)' }}>
          <Clock size={14} style={{ flex: 'none' }} /> {SAMPLE_EVENT.name} · {SAMPLE_EVENT.minutes} min
        </span>
      </div>
      <div className="sio-cal-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: title }}>{view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {navBtn(-1, canPrev)}
              {navBtn(1, canNext)}
            </span>
          </div>
          <div role="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: mobile ? 4 : 6 }}>
            {WEEKDAYS.map((w) => (
              <span key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: text ?? 'var(--c-muted)', paddingBottom: 4 }}>
                {w}
              </span>
            ))}
            {monthCells().map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const avail = isAvailable(d, today)
              const sel = avail && dayKey(d) === dayKey(day)
              const isToday = dayKey(d) === dayKey(today)
              return (
                <button
                  key={d.getDate()}
                  type="button"
                  className={avail ? 'sio-cal-btn sio-cal-pick' : 'sio-cal-btn'}
                  disabled={!avail}
                  aria-pressed={sel}
                  aria-label={fmtDay(d)}
                  tabIndex={editable ? -1 : undefined}
                  onClick={() => {
                    if (editable || !avail) return
                    setDay(d)
                    setSlot(null)
                  }}
                  style={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    position: 'relative',
                    aspectRatio: '1',
                    maxHeight: 46,
                    width: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: cellRadius,
                    fontSize: mobile ? 14 : 15,
                    fontWeight: avail ? 600 : 400,
                    fontVariantNumeric: 'tabular-nums',
                    background: sel ? activeBg : avail ? slotBg : 'transparent',
                    color: sel ? 'var(--c-on-primary)' : avail ? 'var(--c-ink)' : text ?? 'var(--c-muted)',
                    opacity: avail ? 1 : 0.5,
                    cursor: avail && !editable ? 'pointer' : 'default',
                  }}
                >
                  {d.getDate()}
                  {isToday ? <span style={{ position: 'absolute', bottom: '14%', left: '50%', width: 4, height: 4, marginLeft: -2, borderRadius: 999, background: 'currentColor' }} /> : null}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: title }}>{fmtDay(day)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: text ?? 'var(--c-muted)' }}>
              <Globe size={12} style={{ flex: 'none' }} /> {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
            </div>
          </div>
          <div className="sio-cal-slots">
            {slots.map((m) => {
              const sel = m === shownSlot
              return (
                <button
                  key={m}
                  type="button"
                  className="sio-cal-btn sio-cal-pick"
                  aria-pressed={sel}
                  tabIndex={editable ? -1 : undefined}
                  onClick={() => !editable && setSlot(m)}
                  style={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    height: 42,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: cellRadius,
                    fontSize: 14,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    background: sel ? activeBg : slotBg,
                    color: sel ? 'var(--c-on-primary)' : 'var(--c-ink)',
                    cursor: 'pointer',
                  }}
                >
                  {fmtTime(m, h12)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <button type="button" className="sio-cal-btn" disabled={!editable && slot === null} tabIndex={editable ? -1 : undefined} onClick={() => !editable && slot !== null && setLiveStep('form')} style={primaryBtn(!editable && slot === null)}>
        {p.buttonText || 'Next step'}
      </button>
    </div>
  )

  /* ---------- step 2: form ---------- */
  const formStep = (
    <form
      key="form"
      className="sio-cal-step"
      onSubmit={(e) => {
        e.preventDefault()
        if (editable) return
        setGuest(((e.currentTarget.querySelector('input[name="first_name"]') as HTMLInputElement | null)?.value.trim() ?? '').split(/\s+/)[0] ?? '')
        setLiveStep('thanks')
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24, margin: 0 }}
    >
      {heading(p.headline2, p.subheadline2, 2)}
      {chip(
        <button
          type="button"
          className="sio-cal-btn"
          tabIndex={editable ? -1 : undefined}
          onClick={() => !editable && setLiveStep('calendar')}
          style={{ all: 'unset', flex: 'none', fontSize: 13, fontWeight: 600, color: 'var(--c-primary)', cursor: 'pointer', padding: '4px 2px' }}
        >
          Change
        </button>,
      )}
      {node.children?.length ? (
        fields
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="sio-cal-names">
            {field('first_name', 'First name', 'text', 'given-name')}
            {field('last_name', 'Last name', 'text', 'family-name')}
          </div>
          {field('email', 'Email', 'email', 'email')}
          {field('phone', 'Phone', 'tel', 'tel')}
        </div>
      )}
      <button type="submit" className="sio-cal-btn" tabIndex={editable ? -1 : undefined} style={primaryBtn(false)}>
        {p.submitText || 'Confirm booking'}
      </button>
    </form>
  )

  /* ---------- thank you ---------- */
  // the booked time, for the thank-you and the calendar file
  const at = shownSlot ?? slots[0]
  const name = editable ? 'Anna' : guest
  const addToCalendar = () => {
    if (editable) return
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(at / 60), at % 60)
    const end = new Date(start.getTime() + SAMPLE_EVENT.minutes * 60000)
    const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//systeme.io//booking//EN', 'BEGIN:VEVENT', `UID:${z(start)}-${node.id}@systeme.io`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${SAMPLE_EVENT.name}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = `${SAMPLE_EVENT.name}.ics`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const secondaryBtn: CSSProperties = { all: 'unset', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: btnRadius, fontSize: 14, fontWeight: 600, cursor: editable ? 'default' : 'pointer' }
  /* ---------- thank you (the same voice as the form's: stamp, warm greeting, what happens next) ---------- */
  const thanksStep = (
    <div key="thanks" className="sio-cal-step sio-thanks" style={{ padding: '4px 0' }}>
      <span className="sio-thanks-stamp" style={{ background: 'var(--c-primary)', color: 'var(--c-on-primary)' }}>
        <Check size={22} strokeWidth={2.8} />
      </span>
      <div className="sio-thanks-title" style={{ color: title }}>
        {name ? (
          <>
            You&rsquo;re booked, <em>{name}.</em>
          </>
        ) : (
          <>
            You&rsquo;re <em>booked.</em>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 15, color: text ?? 'var(--c-ink)', fontVariantNumeric: 'tabular-nums', animation: 'sio-rise 360ms var(--ease-out) 260ms backwards' }}>
        <span>{fmtDay(day)}</span>
        <span aria-hidden style={{ width: 4, height: 4, borderRadius: 9, background: 'currentColor', opacity: 0.35 }} />
        <span>{fmtTime(at, h12)}</span>
        <span aria-hidden style={{ width: 4, height: 4, borderRadius: 9, background: 'currentColor', opacity: 0.35 }} />
        <span>{SAMPLE_EVENT.minutes} min</span>
      </div>
      {p.finalText ? <div className="sio-thanks-text" style={{ color: text }}>{p.finalText}</div> : null}
      {p.redirect === 'url' && p.redirectUrl ? (
        <span style={{ fontSize: 13, color: text ?? 'var(--c-muted)' }}>Taking you to the next page…</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, animation: 'sio-rise 360ms var(--ease-out) 360ms backwards' }}>
          <button type="button" className="sio-cal-btn" tabIndex={editable ? -1 : undefined} onClick={addToCalendar} style={{ ...secondaryBtn, background: 'var(--c-primary)', color: 'var(--c-on-primary)' }}>
            <CalendarPlus size={16} />
            Add to calendar
          </button>
          <button type="button" className="sio-cal-btn" tabIndex={editable ? -1 : undefined} onClick={() => !editable && setLiveStep('calendar')} style={{ ...secondaryBtn, background: 'color-mix(in srgb, var(--c-ink) 6%, transparent)', color: 'var(--c-ink)' }}>
            <RotateCcw size={15} />
            Reschedule
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div
      className="sio-cal"
      style={{
        width: '100%',
        maxWidth: s.maxWidth ?? 820,
        // where the calendar sits in its column (centred by default); its own text stays left-aligned
        marginLeft: s.textAlign === 'left' ? 0 : 'auto',
        marginRight: s.textAlign === 'right' ? 0 : 'auto',
        textAlign: 'left',
        fontFamily: 'var(--f-body)',
      }}
    >
      <style>{CAL_CSS}</style>
      <div
        className={editable ? undefined : 'sio-cal-live'}
        style={{
          background: cssColor(s.contentBackground) ?? 'var(--c-bg)',
          color: 'var(--c-ink)',
          borderRadius: 'var(--r-card)',
          boxShadow: s.shadow ? shadow(s.shadow) : '0 0 0 1px var(--c-edge), 0 1px 2px rgba(0,0,0,.04), 0 12px 32px -16px rgba(0,0,0,.12)',
          padding: cardPad,
          boxSizing: 'border-box',
        }}
      >
        {step === 'calendar' ? calendarStep : step === 'form' ? formStep : thanksStep}
      </div>
      {editable ? <CanvasNote>Sample event. Choose your event in the settings to show real availability.</CanvasNote> : null}
    </div>
  )
}

/* ---------------- Inspector ---------------- */

/** Where the calendar sits in its column: left, centre (default) or right. */
function CalendarAlign() {
  const { s, set } = useInspector()
  return (
    <Field label="Alignment">
      <Segmented
        full
        size="sm"
        value={s.textAlign ?? 'center'}
        onChange={(v) => set('textAlign', v)}
        options={[
          { value: 'left', icon: <AlignLeft size={14} />, tip: 'Left' },
          { value: 'center', icon: <AlignCenter size={14} />, tip: 'Center' },
          { value: 'right', icon: <AlignRight size={14} />, tip: 'Right' },
        ]}
      />
    </Field>
  )
}

function CalendarSettings() {
  const { node, setProps } = useInspector()
  const id = node.id
  const tab = useTab(id)
  const p = node.props
  // the step you were on stays on the page when you click away (and is the one you come back to)
  return (
    <>
      <div className="px-4 pb-1 pt-1">
        <Segmented
          full
          value={tab}
          onChange={(t) => setTab(id, t)}
          options={[
            { value: 'calendar', label: 'Calendar' },
            { value: 'form', label: 'Form' },
            { value: 'thanks', label: 'Thank you' },
          ]}
        />
      </div>
      {tab === 'calendar' && (
        <>
          <G title="Calendar">
            <PText p="text" label="Headline" />
            <PText p="subtext" label="Sub-headline" />
            <PText p="buttonText" label="Next step button text" stack />
            <PChoice
              p="timeFormat"
              label="Time format"
              seg
              options={[
                { value: '24', label: '24-hour' },
                { value: '12', label: '12-hour' },
              ]}
            />
            <Field label="Event" stack>
              <Select value={p.event ?? SAMPLE_EVENT.value} onChange={(v) => setProps({ event: v }, false)} options={[{ value: SAMPLE_EVENT.value, label: SAMPLE_EVENT.label }]} />
            </Field>
            <InfoNote>This is a sample event. Your own events appear in this list.</InfoNote>
          </G>
          <G title="Layout" keys={['textAlign']}>
            <CalendarAlign />
          </G>
          <G title="Color" keys={['fieldColor', 'titleColor', 'color', 'slotBackground', 'slotActiveBackground']}>
            <WideColor k="fieldColor" label="Form field text color" />
            <WideColor k="titleColor" label="Titles color" />
            <WideColor k="color" label="Text color" />
            <WideColor k="slotBackground" label="Available slot background color" />
            <WideColor k="slotActiveBackground" label="Selected slot background color" />
          </G>
          <G title="Card" keys={['contentBackground', 'shadow']}>
            <WideColor k="contentBackground" label="Card background color" />
            <ShadowRow />
          </G>
          <SizePosition />
        </>
      )}
      {tab === 'form' && (
        <>
          <G title="Form">
            <InfoNote>The fields are elements: click one on the page to edit it, or drag elements in and out of the form.</InfoNote>
            <PText p="headline2" label="Headline" />
            <PText p="subheadline2" label="Sub-headline" />
            <PText p="submitText" label="Form submit button text" stack />
          </G>
          <BorderGroup />
        </>
      )}
      {tab === 'thanks' && (
        <G title="Thank you">
          <PText p="finalText" label="Message under the time" multiline />
          <PChoice
            p="redirect"
            label="Redirect after booking"
            stack
            options={[
              { value: 'none', label: 'No redirection' },
              { value: 'url', label: 'To a custom URL' },
            ]}
          />
          {p.redirect === 'url' && <PText p="redirectUrl" label="URL" placeholder="https://" />}
        </G>
      )}
    </>
  )
}
