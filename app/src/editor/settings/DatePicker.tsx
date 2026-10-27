import { useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { IconButton, Popover, cx } from '../../ui/kit'

/**
 * Our own date and time picker (Cron / Notion Calendar): a month grid, common end times as one-tap chips and any other
 * time typed in. Days before today cannot be picked.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CHIPS = ['09:00', '12:00', '18:00', '21:00']
const pad = (n: number) => String(n).padStart(2, '0')
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** "18:5", "1859", "6:59 pm" → [18, 59]; null when it is not a time. */
export function parseTime(v: string): [number, number] | null {
  const m = v.trim().toLowerCase().match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  return h < 24 && min < 60 ? [h, min] : null
}

function Field({ label, onClick, open, children }: { label: string; onClick: () => void; open: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cx(
        'press flex h-8 w-full items-center gap-2 rounded-[6px] bg-[var(--fill-1)] px-2.5 text-left text-[13px] text-[var(--t1)]',
        open && 'bg-[var(--raised)] shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]',
      )}
    >
      <span className="tnum min-w-0 flex-1 truncate">{children}</span>
      {label === 'Time' ? <Clock size={14} className="flex-none text-[var(--t3)]" /> : <Calendar size={14} className="flex-none text-[var(--t3)]" />}
    </button>
  )
}

/** The times part: chips and another time typed in. */
function Times({ value, onPick }: { value: string; onPick: (h: number, m: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const t = draft === null ? null : parseTime(draft)
    if (t) onPick(t[0], t[1])
    setDraft(null)
  }
  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {CHIPS.map((t) => (
          <button
            key={t}
            onClick={() => onPick(Number(t.slice(0, 2)), Number(t.slice(3)))}
            className={cx(
              'press tnum h-[30px] rounded-[8px] text-[12.5px] font-medium',
              t === value ? 'bg-[var(--brand-tint)] text-[var(--brand-ink)] shadow-[inset_0_0_0_1.5px_var(--brand)]' : 'bg-[var(--fill-1)] text-[var(--t2)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--t3)]">
        <Clock size={13} className="flex-none" /> Other time
        <input
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-label="Time"
          className="tnum ml-1 h-[30px] w-[72px] rounded-[8px] bg-[var(--fill-1)] text-center text-[13px] font-semibold text-[var(--t1)] outline-none focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand)]"
        />
      </label>
    </>
  )
}

/** A date and a time (Countdown · Ends). `value` is a timestamp. */
export function DateTimeField({ value, onChange }: { value: number; onChange: (t: number) => void }) {
  const btn = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const v = new Date(value)
  const [view, setView] = useState(() => new Date(v.getFullYear(), v.getMonth(), 1))
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const y = view.getFullYear()
  const m = view.getMonth()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - lead + i))
  const set = (d: Date) => onChange(d.getTime())
  return (
    <div ref={btn} className="w-full">
      <Field label="Ends" open={open} onClick={() => (setView(new Date(v.getFullYear(), v.getMonth(), 1)), setOpen((o) => !o))}>
        {DAYS[v.getDay()]} {v.getDate()} {MONTHS[v.getMonth()].slice(0, 3)} {v.getFullYear()} · {hm(v)}
      </Field>
      {open && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} width={284}>
          <div className="p-3">
            <div className="mb-1.5 flex items-center gap-1">
              <span className="flex-1 pl-1 text-[13.5px] font-semibold text-[var(--t1)]">
                {MONTHS[m]} {y}
              </span>
              <IconButton tip="Previous month" disabled={y === today.getFullYear() && m <= today.getMonth()} onClick={() => setView(new Date(y, m - 1, 1))}>
                <ChevronLeft size={15} />
              </IconButton>
              <IconButton tip="Next month" onClick={() => setView(new Date(y, m + 1, 1))}>
                <ChevronRight size={15} />
              </IconButton>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => (
                <span key={i} className="grid h-[22px] place-items-center text-[11px] font-medium text-[var(--t4)]">
                  {w}
                </span>
              ))}
              {days.map((d) => {
                const past = d < today
                const on = sameDay(d, v)
                return (
                  <button
                    key={d.getTime()}
                    disabled={past}
                    onClick={() => {
                      const n = new Date(d)
                      n.setHours(v.getHours(), v.getMinutes(), 0, 0)
                      set(n)
                    }}
                    className={cx(
                      'press tnum relative h-[34px] rounded-[9px] text-[13px]',
                      on ? 'bg-[var(--brand)] font-semibold text-white' : past ? 'text-[var(--t4)] line-through decoration-[color-mix(in_srgb,var(--t4)_60%,transparent)]' : 'hover:bg-[var(--fill-2)]',
                      !on && !past && (d.getMonth() !== m ? 'text-[var(--t4)]' : 'text-[var(--t1)]'),
                    )}
                  >
                    {d.getDate()}
                    {sameDay(d, today) && <span className={cx('absolute bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', on ? 'bg-white' : 'bg-[var(--brand)]')} />}
                  </button>
                )
              })}
            </div>
            <div className="-mx-3 my-2.5 h-px bg-[var(--line)]" />
            <Times
              value={hm(v)}
              onPick={(h, min) => {
                const n = new Date(v)
                n.setHours(h, min, 0, 0)
                set(n)
              }}
            />
          </div>
        </Popover>
      )}
    </div>
  )
}

/** A time of day (Countdown · Daily). `value` is "HH:MM". */
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const btn = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div ref={btn} className="w-full">
      <Field label="Time" open={open} onClick={() => setOpen((o) => !o)}>
        Every day at {value}
      </Field>
      {open && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} width={284}>
          <div className="p-3">
            <Times value={value} onPick={(h, m) => onChange(`${pad(h)}:${pad(m)}`)} />
          </div>
        </Popover>
      )}
    </div>
  )
}
