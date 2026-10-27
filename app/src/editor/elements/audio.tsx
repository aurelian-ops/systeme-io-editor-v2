import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AudioLines, Info, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { el } from '../blocks'
import { Field, Select } from '../../ui/kit'
import { FilePick, G, PText, SizePosition, useInspector } from '../settings/kit'
import type { Device, Node } from '../types'
import type { ElementDef } from './types'

const SAMPLE = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

export const def: ElementDef = {
  type: 'audio',
  label: 'Audio',
  icon: AudioLines,
  group: 'Media',
  make: () => el('audio', { src: SAMPLE, kind: 'direct' }, {}),
  render: ({ node, editable, device }) => <AudioPlayer key={audioSrc(node) ?? ''} node={node} editable={editable} device={device} />,
  settings: () => <AudioSettings />,
}

/** What plays: the uploaded file, or the direct link (V1's two sources). */
const audioSrc = (node: Node) => (node.props.kind === 'upload' ? node.props.audioFile : node.props.src)

const fmt = (t: number) => {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const sec = Math.floor(t % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * The player (Overcast / Apple Podcasts row): back 15 s, a round brand play, forward 30 s, the bar, the time,
 * volume (the speaker follows the level, click to mute) and speed, in one thin outlined row.
 */
function AudioPlayer({ node, editable, device }: { node: Node; editable: boolean; device: Device }) {
  const src = audioSrc(node)
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [failed, setFailed] = useState(false)
  const [box, width] = useWidth<HTMLDivElement>()

  useEffect(() => {
    if (editable) ref.current?.pause()
  }, [editable])

  const a = () => (editable ? null : ref.current)
  const toggle = () => {
    const el = a()
    if (!el) return
    if (el.paused) el.play().catch(() => setFailed(true))
    else el.pause()
  }
  const seekTo = (t: number) => {
    const el = a()
    if (!el || !dur) return
    el.currentTime = Math.max(0, Math.min(dur, t))
    setTime(el.currentTime)
  }
  const setVolume = (v: number) => {
    const el = a()
    if (!el) return
    el.volume = v
    el.muted = v === 0
    setVol(v)
    setMuted(v === 0)
  }
  const toggleMute = () => {
    const el = a()
    if (!el) return
    const next = !muted
    el.muted = next
    // unmuting from silence brings back a usable level
    if (!next && vol === 0) (el.volume = 0.6), setVol(0.6)
    setMuted(next)
  }
  const nextRate = () => {
    const el = a()
    if (!el) return
    const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    el.playbackRate = r
    setRate(r)
  }

  // narrow columns keep what matters: the volume slider goes first, then the skips
  const narrow = device === 'mobile' || (width > 0 && width < 460)
  const tiny = width > 0 && width < 340
  const level = muted ? 0 : vol
  const VolIcon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2
  const off: CSSProperties = editable ? { pointerEvents: 'none' } : {}

  if (!src)
    return (
      <div style={{ ...row, padding: '10px 14px' }}>
        <span style={note}>
          <Info size={14} style={{ flex: 'none', marginTop: 2 }} /> {node.props.kind === 'upload' ? 'Upload an audio file in the settings.' : 'Add the link to an audio file in the settings.'}
        </span>
      </div>
    )

  return (
    <div ref={box} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...row, ...off }}>
        <audio
          ref={ref}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDur(e.currentTarget.duration)
            setFailed(false)
          }}
          onDurationChange={(e) => setDur(e.currentTarget.duration)}
          onError={() => setFailed(true)}
        />
        {!tiny && (
          <IconBtn label="Back 15 seconds" editable={editable} onClick={() => seekTo(time - 15)}>
            <Skip n={15} back />
          </IconBtn>
        )}
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} tabIndex={editable ? -1 : 0} className="sio-audio-play" style={playBtn}>
          {playing ? <Pause size={13} fill="currentColor" strokeWidth={0} /> : <Play size={13} fill="currentColor" strokeWidth={0} style={{ marginLeft: 1 }} />}
        </button>
        {!tiny && (
          <IconBtn label="Forward 30 seconds" editable={editable} onClick={() => seekTo(time + 30)}>
            <Skip n={30} />
          </IconBtn>
        )}
        <Bar value={dur ? time / dur : 0} onChange={(x) => seekTo(x * dur)} label="Seek" disabled={editable || !dur} knob style={{ margin: '0 8px' }} />
        <span style={timeStyle}>
          {fmt(time)} / {dur ? fmt(dur) : '–:––'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, margin: '0 2px 0 6px', flex: 'none' }}>
          <IconBtn label={level === 0 ? 'Unmute' : 'Mute'} editable={editable} onClick={toggleMute}>
            <VolIcon size={18} />
          </IconBtn>
          {!narrow && <Bar value={level} onChange={setVolume} label="Volume" disabled={editable} soft grow style={{ width: 64, flex: 'none' }} />}
        </div>
        <button type="button" onClick={nextRate} aria-label="Playback speed" tabIndex={editable ? -1 : 0} className="sio-audio-speed" style={speedBtn}>
          {rate}×
        </button>
      </div>
      {failed && (
        <span style={note}>
          <Info size={14} style={{ flex: 'none', marginTop: 2 }} /> This audio file could not be loaded. Check the link.
        </span>
      )}
    </div>
  )
}

const RATES = [1, 1.25, 1.5, 2, 0.75]

/** Fixed colours (they never follow the page): a white row, a clear blue for play and progress, dark text. */
const C = { box: '#FFFFFF', line: 'rgba(0,0,0,.14)', blue: '#1A85E6', onBlue: '#FFFFFF', ink: '#171717', muted: '#5C6370', rail: 'rgba(0,0,0,.10)', volumeRail: 'rgba(0,0,0,.18)', soft: 'rgba(0,0,0,.06)' }

/** Width of the element's own box, so the layout follows the column it sits in, not only the device. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/**
 * A slim track: click or drag anywhere (the pointer is captured, so a drag keeps going outside it), arrow keys
 * step it. `grow` thickens it under the pointer, `knob` shows a dot while hovering or dragging, `soft` is the
 * slimmer volume track (a darker rail).
 */
function Bar({ value, onChange, label, disabled, grow, knob, soft, style }: { value: number; onChange: (x: number) => void; label: string; disabled?: boolean; grow?: boolean; knob?: boolean; soft?: boolean; style?: CSSProperties }) {
  const [drag, setDrag] = useState(false)
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onChange(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
  }
  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={disabled ? -1 : 0}
      className={`sio-audio-bar${grow ? ' grow' : ''}${knob ? ' knob' : ''}${drag ? ' drag' : ''}`}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag(true)
        at(e)
      }}
      onPointerMove={(e) => drag && at(e)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') (e.preventDefault(), onChange(Math.min(1, value + 0.05)))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') (e.preventDefault(), onChange(Math.max(0, value - 0.05)))
      }}
      style={{ position: 'relative', flex: 1, minWidth: 0, height: 24, display: 'flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer', touchAction: 'none', outline: 'none', ...style }}
    >
      <div className="sio-audio-rail" style={{ position: 'relative', width: '100%', height: soft ? 3 : 4, borderRadius: 999, background: soft ? C.volumeRail : C.rail }}>
        <div style={{ position: 'absolute', inset: 0, right: 'auto', width: pct, borderRadius: 999, background: C.blue }} />
        {knob && <div className="sio-audio-knob" style={{ left: pct }} />}
      </div>
    </div>
  )
}

function IconBtn({ label, editable, onClick, children }: { label: string; editable: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} tabIndex={editable ? -1 : 0} onClick={onClick} className="sio-audio-ico">
      {children}
    </button>
  )
}

/** Skip back / forward, with the seconds written inside the arrow (Podcasts). */
function Skip({ n, back }: { n: number; back?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {back ? (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </>
      ) : (
        <>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </>
      )}
      <text x="12" y="15.6" fontSize="7.5" fontWeight="600" fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: 'Geist, Inter, system-ui, sans-serif' }}>
        {n}
      </text>
    </svg>
  )
}

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 10px 6px 6px',
  borderRadius: 14,
  background: C.box,
  boxShadow: `0 0 0 1px ${C.line}, 0 1px 2px rgba(0,0,0,.04)`,
  color: C.ink,
  ['--a-blue' as string]: C.blue,
  ['--a-ink' as string]: C.ink,
  ['--a-muted' as string]: C.muted,
  ['--a-soft' as string]: C.soft,
  fontFamily: 'var(--f-body)',
  textAlign: 'left',
}
const playBtn: CSSProperties = {
  all: 'unset',
  flex: 'none',
  width: 32,
  height: 32,
  margin: '0 2px',
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  background: C.blue,
  color: C.onBlue,
  cursor: 'pointer',
}
const speedBtn: CSSProperties = {
  all: 'unset',
  flex: 'none',
  height: 24,
  padding: '0 7px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: C.muted,
  background: C.soft,
  cursor: 'pointer',
}
const timeStyle: CSSProperties = { flex: 'none', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: C.muted, whiteSpace: 'nowrap' }
const note: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, lineHeight: 1.4, color: C.muted, fontFamily: 'var(--f-body)' }

function AudioSettings() {
  const { p, setProps } = useInspector()
  return (
    <>
      <G title="Audio">
        <Field label="Select audio source" stack>
          <Select
            value={p.kind === 'upload' ? 'upload' : 'direct'}
            onChange={(v) => setProps({ kind: v }, false)}
            options={[
              { value: 'direct', label: 'Direct link' },
              { value: 'upload', label: 'Upload audio file' },
            ]}
          />
        </Field>
        {p.kind === 'upload' ? <FilePick file="audioFile" name="audioName" label="Audio file" kind="audio" hint="MP3, M4A, WAV or OGG" /> : <PText p="src" label="URL" placeholder="https://…/episode.mp3" />}
      </G>
      <SizePosition pad={false} />
    </>
  )
}
