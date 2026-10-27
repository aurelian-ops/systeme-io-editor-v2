import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Globe, Search } from 'lucide-react'
import { countriesNow, detectCountry, flagSvg, guessCountry, loadCountries, type Country } from './countries'

const subs = new Set<() => void>()
let ver = 0
const useCountries = () => {
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => ver,
  )
  return countriesNow()
}
const ensure = () => {
  if (!countriesNow())
    void loadCountries().then(() => {
      ver++
      subs.forEach((f) => f())
    })
}

/** A small SVG flag (3:2), with a hairline so white flags read on white. */
export function Flag({ code, w = 22 }: { code: string; w?: number }) {
  useCountries()
  const svg = flagSvg(code)
  // until the flags have arrived (a moment on first load): a quiet globe, never an empty box
  if (!svg) return <Globe size={Math.round(w * 0.8)} strokeWidth={1.8} style={{ display: 'block', opacity: 0.55, flex: 'none', margin: `0 ${Math.round(w * 0.1)}px` }} aria-hidden />
  return (
    <span
      aria-hidden
      style={{ display: 'block', width: w, height: Math.round((w * 2) / 3), borderRadius: 2, overflow: 'hidden', boxShadow: '0 0 0 0.5px rgba(0,0,0,.18)', flex: 'none' }}
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="100%" height="100%" preserveAspectRatio="none" ') }}
    />
  )
}

/**
 * The country picker at the start of a phone field: a flag that opens a searchable list of countries with their dial
 * codes. In the editor it only shows (the default country).
 */
export function PhoneCountry({ editable, value, onChange, fontSize, left = 14 }: { editable: boolean; value?: string; onChange: (code: string) => void; fontSize: number; left?: number }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  // the list is drawn above the page (a short section or the page frame would cut it off), under the flag,
  // or above it when there is no room below
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number; max: number } | null>(null)
  useLayoutEffect(() => {
    if (!open || !box.current) return
    const place = () => {
      const r = box.current!.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - 12
      const above = r.top - 12
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 288))
      setAt(below >= 220 || below >= above ? { left, top: r.bottom + 4, max: Math.min(300, below) } : { left, bottom: window.innerHeight - r.top + 4, max: Math.min(300, above) })
    }
    place()
    const close = (e: Event) => !list.current?.contains(e.target as globalThis.Node) && setOpen(false)
    window.addEventListener('resize', place)
    document.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', close, true)
    }
  }, [open])
  const all = useCountries()
  // the visitor's own country by default (their IP country, else their time zone), never assumed to be the US
  const [home, setHome] = useState(guessCountry)
  useEffect(() => {
    let live = true
    void detectCountry().then((c) => live && setHome(c))
    return () => {
      live = false
    }
  }, [])
  const code = value ?? home
  // flags (and the list) load as soon as a phone field is on screen, in the editor too
  useEffect(() => ensure(), [])
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => !box.current?.contains(e.target as globalThis.Node) && !list.current?.contains(e.target as globalThis.Node) && setOpen(false)
    window.addEventListener('pointerdown', down, true)
    return () => window.removeEventListener('pointerdown', down, true)
  }, [open])
  const shown = useMemo(() => {
    const w = q.trim().toLowerCase()
    return (all ?? []).filter((c: Country) => !w || c.name.toLowerCase().includes(w) || c.dial.includes(w) || c.code.toLowerCase() === w)
  }, [all, q])
  const row: CSSProperties = { all: 'unset', display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }
  return (
    <div ref={box} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingLeft: left, zIndex: 2 }}>
      {/* sent with the form: the country the number belongs to (the visitor's own, or the one they picked) */}
      {!editable && <input type="hidden" name="phone_country" value={code} />}
      <button
        type="button"
        aria-label="Country code"
        tabIndex={editable ? -1 : 0}
        onClick={() => !editable && setOpen((o) => !o)}
        style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 4, cursor: editable ? 'default' : 'pointer', height: '100%' }}
      >
        <Flag code={code} w={Math.round(fontSize * 1.35)} />
        <ChevronDown size={Math.round(fontSize * 0.8)} style={{ opacity: 0.55 }} />
      </button>
      {open && at && createPortal(
        <div
          ref={list}
          style={{
            position: 'fixed',
            top: at.top,
            bottom: at.bottom,
            left: at.left,
            width: 280,
            maxHeight: at.max,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            color: '#171717',
            borderRadius: 10,
            boxShadow: '0 0 0 1px rgba(0,0,0,.08), 0 12px 32px -8px rgba(0,0,0,.25)',
            fontFamily: 'Geist, Inter, system-ui, sans-serif',
            zIndex: 2000,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 8, padding: '0 10px', height: 34, borderRadius: 7, background: 'rgba(0,0,0,.05)', color: '#6b6b6b' }}>
            <Search size={14} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search countries" style={{ all: 'unset', flex: 1, fontSize: 14, color: '#171717' }} />
          </label>
          <div style={{ overflowY: 'auto', padding: '0 4px 6px' }}>
            {shown.map((c) => (
              <button
                type="button"
                key={c.code}
                onClick={() => {
                  onChange(c.code)
                  setOpen(false)
                  setQ('')
                }}
                style={{ ...row, background: c.code === code ? 'rgba(0,0,0,.05)' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.code === code ? 'rgba(0,0,0,.05)' : '')}
              >
                <Flag code={c.code} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ color: '#6b6b6b', fontVariantNumeric: 'tabular-nums' }}>{c.dial}</span>
              </button>
            ))}
            {!all && <div style={{ padding: 10, fontSize: 13, color: '#6b6b6b' }}>Loading…</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** All countries as options for the Country field (loaded on demand). */
export function useCountryOptions(load: boolean) {
  const all = useCountries()
  useEffect(() => {
    if (load) ensure()
  }, [load])
  return all
}
