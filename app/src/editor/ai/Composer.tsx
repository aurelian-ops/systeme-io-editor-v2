import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Paperclip, Square, X } from 'lucide-react'
import { activeDevice, labelOf, select, useEditor } from '../store'
import { find, path } from '../tree'
import { aiStatus, runAI, stopAI } from './run'
import { cx } from '../../ui/kit'
import { DEVICE_LABEL } from '../types'

export function useScope() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedId)
  const sel = find(doc, selectedId)
  const trail = sel ? path(doc, sel.id) : []
  const label = sel ? (trail.length > 1 ? `${labelOf(trail[0])} › ${labelOf(sel)}` : labelOf(sel)) : 'Whole page'
  const kind = !sel ? 'page' : sel.type === 'section' ? 'section' : ['headline', 'text', 'eyebrow'].includes(sel.type) ? 'text' : sel.type === 'button' ? 'button' : sel.type === 'image' ? 'image' : 'section'
  return { sel, label, kind, selectedId }
}

let model: string | null | undefined
export function useModel() {
  const [m, setM] = useState(model)
  useEffect(() => {
    aiStatus().then((s) => {
      model = s.connected ? s.model : null
      setM(model)
    })
  }, [])
  return m
}

/** The message box at the bottom of the AI panel. Looks like the editor's other inputs. */
export function Composer({ autoFocus }: { autoFocus?: boolean }) {
  const busy = useEditor((s) => s.aiBusy)
  const view = useEditor((s) => s.view)
  const { sel, label, selectedId } = useScope()
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const file = useRef<HTMLInputElement>(null)

  const attach = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    const urls = await Promise.all(list.map((f) => shrink(f)))
    setImages((cur) => [...cur, ...urls].slice(0, 4))
    input.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    // preventScroll: focusing must never scroll the editor (the panel may still be sliding in)
    if (autoFocus) requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
    const f = () => input.current?.focus({ preventScroll: true })
    const draft = (e: Event) => {
      const t = (e as CustomEvent<string>).detail
      setText(t)
      requestAnimationFrame(() => {
        const el = input.current
        if (!el) return
        el.focus({ preventScroll: true })
        el.setSelectionRange(t.length, t.length)
      })
    }
    window.addEventListener('editor:focus-ai', f)
    window.addEventListener('editor:ai-draft', draft)
    return () => {
      window.removeEventListener('editor:focus-ai', f)
      window.removeEventListener('editor:ai-draft', draft)
    }
  }, [autoFocus])

  const send = (p = text) => {
    const prompt = p.trim() || (images.length ? 'Use this image on the page' : '')
    if (!prompt || busy) return
    setText('')
    setImages([])
    runAI({ prompt, scopeId: selectedId, images: images.length ? images : undefined })
  }
  const canSend = !!text.trim() || images.length > 0
  const device = view === 'all' ? activeDevice() : view

  return (
    <div
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setOver(false)
        attach(e.dataTransfer.files)
      }}
      className={cx(
        'relative rounded-[16px] bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]',
        over ? 'shadow-[0_0_0_1.5px_var(--brand),0_0_0_4px_var(--brand-tint)]' : 'shadow-[0_0_0_1px_var(--line-2)]',
      )}
      style={{ transition: 'box-shadow 120ms var(--ease-out)' }}
    >
      {over && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[16px] bg-[var(--brand-tint)]/90 text-[12px] font-medium text-[var(--brand-ink)]">Drop the image here</div>}
      <div className="flex items-center gap-1.5 px-3 pt-2.5">
        <span className="flex h-[22px] max-w-[80%] items-center gap-1 rounded-[6px] bg-[var(--fill-1)] pl-2 pr-1 text-[12px] font-medium text-[var(--t2)]">
          <span className="truncate">{label}</span>
          {sel ? (
            <button aria-label="Ask about the whole page" onClick={() => select(null)} className="press rounded-[4px] p-0.5 text-[var(--t3)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]">
              <X size={12} />
            </button>
          ) : (
            <span className="w-1" />
          )}
        </span>
        {device !== 'desktop' && <span className="text-[12px] text-[var(--t3)]">on {DEVICE_LABEL[device]}</span>}
      </div>
      {images.length > 0 && (
        <div className="flex gap-1.5 px-3 pt-2">
          {images.map((u, i) => (
            <span key={i} className="group relative h-12 w-12 flex-none overflow-hidden rounded-[8px] shadow-[0_0_0_1px_var(--line-2)]">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button
                aria-label="Remove image"
                onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))}
                className="press absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5 pb-2.5 pl-3 pr-2.5 pt-1.5">
        <textarea
          ref={input}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'))
            if (imgs.length) {
              e.preventDefault()
              attach(imgs)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
            if (e.key === 'Escape') input.current?.blur()
          }}
          placeholder={sel ? `Ask about this ${labelOf(sel).toLowerCase()}, or describe a change` : 'Ask anything, or describe a change'}
          className="max-h-[160px] min-h-[40px] flex-1 resize-none bg-transparent text-[13px] leading-[20px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          aria-label="Attach an image"
          title="Attach an image (or paste / drop one)"
          disabled={busy || images.length >= 4}
          onClick={() => file.current?.click()}
          className="press flex h-7 w-7 flex-none items-center justify-center rounded-full text-[var(--t3)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]"
        >
          <Paperclip size={15} />
        </button>
        <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (attach(e.target.files), (e.target.value = ''))} />
        {busy ? (
          <button aria-label="Stop" title="Stop" onClick={stopAI} className="press flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--fill-2)] text-[var(--t1)] hover:bg-[var(--line-2)]">
            <Square size={10} fill="currentColor" />
          </button>
        ) : (
          <button
            aria-label="Send"
            title="Send"
            disabled={!canSend}
            onClick={() => send()}
            className={cx('press flex h-7 w-7 flex-none items-center justify-center rounded-full', canSend ? 'bg-[var(--studio)] text-white hover:bg-[var(--studio-hover)]' : 'bg-[var(--fill-1)] text-[var(--t4)]')}
          >
            <ArrowUp size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Keep uploads light: longest side 1600px, JPEG (PNG kept for transparent logos). */
export async function shrink(f: File): Promise<string> {
  const src = await new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.readAsDataURL(f)
  })
  if (f.type === 'image/svg+xml' || f.type === 'image/gif') return src
  const img = new Image()
  img.src = src
  await img.decode().catch(() => undefined)
  const k = Math.min(1, 1600 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.naturalWidth * k))
  c.height = Math.max(1, Math.round(img.naturalHeight * k))
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  // a PNG stays a PNG (a logo's transparency) unless it is a big screenshot: requests to the AI must stay under 4.5 MB
  const png = f.type === 'image/png' ? c.toDataURL('image/png') : ''
  return png && png.length < 1_200_000 ? png : c.toDataURL('image/jpeg', 0.86)
}
