import { RecentChats } from '../ai/ChatsUI'
import { MemoryButton } from '../ai/Memory'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUp, Paperclip, X } from 'lucide-react'
import { shrink } from '../ai/Composer'
import { setState, update, useEditor } from '../store'
import { runAI } from '../ai/run'
import { ALL_ITEMS } from '../library'
import { cx } from '../../ui/kit'

/** First screen (direction C, modelled on Lovable / Framer): grain gradient, editorial headline, one floating card. */

const EXAMPLES = [
  'A yoga teacher in Lyon offering a free first class',
  'A free PDF guide for freelancers to land their first 5 clients',
  'A 6-week business coaching program with a free discovery call',
  'An online pottery course for complete beginners',
]

/** Placeholder that types example briefs, pauses, erases. Stops while the user types or prefers less motion. */
function useTypedPlaceholder(active: boolean) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(EXAMPLES[0])
      return
    }
    let i = 0
    let n = 0
    let dir = 1
    let t: number
    const step = () => {
      const full = EXAMPLES[i]
      n += dir
      setText(full.slice(0, n))
      if (dir === 1 && n === full.length) {
        dir = -1
        t = window.setTimeout(step, 2200)
        return
      }
      if (dir === -1 && n === 0) {
        dir = 1
        i = (i + 1) % EXAMPLES.length
        t = window.setTimeout(step, 380)
        return
      }
      t = window.setTimeout(step, dir === 1 ? 34 + Math.random() * 40 : 14)
    }
    t = window.setTimeout(step, 700)
    return () => window.clearTimeout(t)
  }, [active])
  return text
}

function useComposer() {
  const stepType = useEditor((s) => s.doc.stepType)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [sending, setSending] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [over, setOver] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const attach = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    const urls = await Promise.all(list.map((f) => shrink(f)))
    setImages((cur) => [...cur, ...urls].slice(0, 4))
    ref.current?.focus()
  }
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 500)
    return () => window.clearTimeout(t)
  }, [])
  const placeholder = useTypedPlaceholder(!text)
  const send = () => {
    const prompt = text.trim() || (images.length ? 'Build my page from the attached image' : '')
    if (!prompt || sending) return
    setSending(true)
    const imgs = images.length ? images : undefined
    window.setTimeout(
      () => runAI({ prompt: stepType ? `${prompt}. (Funnel step type: ${stepType})` : prompt, display: text.trim() || undefined, mode: 'generate', brief: stepType ? { stepType } : undefined, label: 'AI built the page', images: imgs }),
      560,
    )
  }
  const scratch = () => {
    const s = ALL_ITEMS.find((i) => i.id === 'section')!.make()
    update((d) => void d.sections.push(s))
    setState({ selectedId: s.children?.[0]?.children?.[0]?.id ?? s.id, leftTab: 'elements' })
  }
  const state: 'idle' | 'focus' | 'busy' = sending ? 'busy' : focused || text ? 'focus' : 'idle'
  // the box grows with what you write (up to about 8 lines, then it scrolls), so text never runs under its buttons
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 232)}px`
    el.style.overflowY = el.scrollHeight > 232 ? 'auto' : 'hidden'
  }, [text])
  const field = (cls: string, rows = 2) => (
    <textarea
      ref={ref}
      value={text}
      rows={rows}
      disabled={sending}
      aria-label="Describe your page"
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
      }}
      className={cx('block w-full resize-none bg-transparent outline-none', cls)}
    />
  )
  const drop = {
    onDragOver: (e: React.DragEvent) => {
      if (![...e.dataTransfer.types].includes('Files')) return
      e.preventDefault()
      e.stopPropagation()
      setOver(true)
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return
      e.preventDefault()
      e.stopPropagation()
      setOver(false)
      attach(e.dataTransfer.files)
    },
  }
  return { stepType, text, state, sending, send, scratch, field, images, setImages, attach, over, drop, canSend: (!!text.trim() || images.length > 0) && !sending }
}


/* ---------------- C · Studio ---------------- */

export function Studio() {
  const c = useComposer()
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="v-studio relative flex min-h-full items-center justify-center overflow-hidden px-6 py-20" style={{ paddingLeft: "calc(var(--left-inset, 0px) + 24px)", paddingRight: "calc(var(--right-inset, 0px) + 24px)", paddingTop: 128 }} data-state={c.state}>
      <div className="v-studio-mesh" aria-hidden />
      <div className="v-grain v-grain-light" aria-hidden />
      <div className={cx('relative w-full max-w-[680px]', c.sending ? 'sio-lift' : 'v-rise')}>
        <h1 className="text-center text-[60px] leading-[60px] tracking-[-0.02em] text-[var(--studio-ink)]">
          <span className="font-['Instrument_Serif']">Build your page,</span>
          <br />
          <span className="font-['Instrument_Serif'] italic text-[var(--studio)]">just by describing it</span>
        </h1>
        <div className="v-studio-card mt-10" data-state={c.state} {...c.drop}>
          {c.over && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-[var(--studio-drop)]/90 text-[14px] font-medium text-[var(--studio)] shadow-[inset_0_0_0_1.5px_#0f7fd6]">
              Drop your image here
            </div>
          )}
          {c.images.length > 0 && (
            <div className="flex gap-2 px-6 pt-5">
              {c.images.map((u, i) => (
                <span key={i} className="group relative h-16 w-16 flex-none overflow-hidden rounded-[12px] shadow-[0_0_0_1px_rgba(14,26,43,.1)]">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button
                    aria-label="Remove image"
                    onClick={() => c.setImages((cur) => cur.filter((_, j) => j !== i))}
                    className="press absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {c.field(cx('scroll-thin px-6 pb-2 text-[17px] leading-[26px] text-[var(--studio-ink)] placeholder:text-[var(--studio-ph)]', c.images.length ? 'pt-3' : 'pt-5'), 2)}
          <div className="flex items-center justify-between px-4 pb-3.5 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                aria-label="Attach an image"
                title="Add an image: a site you like, your photo or logo (or paste / drop it)"
                disabled={c.sending || c.images.length >= 4}
                onClick={() => file.current?.click()}
                className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--studio-sub)] hover:bg-[var(--studio-ink)]/[.06] hover:text-[var(--studio-ink)]"
              >
                <Paperclip size={16} />
              </button>
              <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (c.attach(e.target.files), (e.target.value = ''))} />
              {c.stepType && <span className="rounded-full bg-[var(--studio-ink)]/[.05] px-2.5 py-1 text-[12px] font-medium text-[var(--studio-sub)]">{c.stepType}</span>}
              {/* what the AI knows and your rules, visible (and editable) before you build */}
              <MemoryButton className="h-8 rounded-full px-3 text-[12.5px] text-[var(--studio-sub)] hover:bg-[var(--studio-ink)]/[.06] hover:text-[var(--studio-ink)]" />
            </div>
            <SendButton enabled={c.canSend} onClick={c.send} tone="brand" />
          </div>
        </div>
        <RecentChats />
        <Scratch onClick={c.scratch} className="text-[var(--studio-sub)]" />
      </div>
    </div>
  )
}

/* ---------------- shared bits ---------------- */

function SendButton({ enabled, onClick, tone, square }: { enabled: boolean; onClick: () => void; tone: 'ink' | 'brand'; square?: boolean }) {
  const on = tone === 'brand' ? 'bg-[var(--studio-ink)] text-white' : 'bg-[#0a0a0a] text-white'
  const off = 'bg-black/[.05] text-black/25'
  return (
    <button
      aria-label="Build the page"
      onClick={onClick}
      disabled={!enabled}
      className={cx('press flex h-9 w-9 items-center justify-center', square ? 'rounded-[10px]' : 'rounded-full', enabled ? on : off)}
      style={{ transition: 'background-color 200ms var(--ease-out), color 200ms var(--ease-out), transform 120ms var(--ease-out)' }}
    >
      <ArrowUp size={17} strokeWidth={2.2} />
    </button>
  )
}

function Scratch({ onClick, className }: { onClick: () => void; className?: string }): ReactNode {
  return (
    <div className="mt-6 text-center">
      <button onClick={onClick} className={cx('press text-[13px] font-medium hover:text-[var(--t1)]', className)}>
        or start from scratch
      </button>
    </div>
  )
}
