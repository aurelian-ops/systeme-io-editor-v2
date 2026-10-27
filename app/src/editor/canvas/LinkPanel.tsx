import { useEffect, useRef, useState } from 'react'
import { CircleCheck, Globe, LayoutPanelTop, Link2, Unlink, Upload } from 'lucide-react'
import { Popover, Segmented, Select, Toggle, cx } from '../../ui/kit'
import { toast, useEditor } from '../store'

/**
 * The link panel for selected words (option 4, Apple Mail style): V1's choices (link or popup, URL or an
 * uploaded file, new tab, nofollow) plus a live preview of where the link goes before you confirm.
 */

/** Character position of a DOM point inside a text element (survives the text being redrawn). */
export function offsetOf(root: HTMLElement, node: globalThis.Node, offset: number) {
  const r = document.createRange()
  r.selectNodeContents(root)
  r.setEnd(node, offset)
  return r.toString().length
}

/** The DOM point at a character position inside a text element. */
export function pointAt(root: HTMLElement, chars: number): { node: globalThis.Node; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let left = chars
  let last: globalThis.Node | null = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.textContent?.length ?? 0
    if (left <= len) return { node: n, offset: left }
    left -= len
    last = n
  }
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : { node: root, offset: root.childNodes.length }
}

/** What people type, turned into a real link: domains get https://, emails mailto:, phone numbers tel:. */
export function normalizeUrl(raw: string) {
  const v = raw.trim()
  if (!v) return ''
  if (/^(https?:|mailto:|tel:|data:|\/|#)/i.test(v)) return v
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return `mailto:${v}`
  if (/^\+?[\d\s().-]{6,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, '')}`
  return `https://${v}`
}

function describe(href: string): { ok: boolean; title: string; sub: string; host?: string } {
  if (!href) return { ok: false, title: 'No link yet', sub: 'Paste a URL to see where it goes' }
  if (href.startsWith('mailto:')) return { ok: true, title: href.slice(7), sub: 'Opens the visitor’s email app' }
  if (href.startsWith('tel:')) return { ok: true, title: href.slice(4), sub: 'Calls this number on phones' }
  if (href.startsWith('data:')) return { ok: true, title: 'Uploaded file', sub: 'Opens or downloads the file' }
  if (href.startsWith('/') || href.startsWith('#')) return { ok: true, title: href, sub: 'A page or place on this site' }
  try {
    const u = new URL(href)
    const ok = /\.[a-z]{2,}$/i.test(u.hostname)
    return { ok, title: ok ? u.hostname.replace(/^www\./, '') : 'Not a full address yet', sub: href, host: ok ? u.hostname : undefined }
  } catch {
    return { ok: false, title: 'Not a valid link', sub: href }
  }
}

const NO_POPUPS: never[] = []

interface Existing {
  href: string
  tab: boolean
  nofollow: boolean
  popup?: string
}

export function LinkPanel({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const popups = useEditor((s) => s.doc.popups) ?? NO_POPUPS
  const saved = useRef<[number, number] | null>(null)
  const [existing, setExisting] = useState<Existing | null>(null)
  const [kind, setKind] = useState<'link' | 'popup'>('link')
  const [url, setUrl] = useState('')
  const [tab, setTab] = useState(false)
  const [nofollow, setNofollow] = useState(false)
  const [popup, setPopup] = useState<string | undefined>(popups[0]?.id)
  const input = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)

  // the text being edited is the one holding the selection (a bullet list has one editable text per bullet)
  const root = () => {
    const n = window.getSelection()?.anchorNode
    const own = (n?.nodeType === 3 ? n.parentElement : (n as HTMLElement | null))?.closest<HTMLElement>('.page-root [contenteditable="true"]')
    return own ?? (document.querySelector('.page-root [contenteditable="true"]') as HTMLElement | null)
  }

  // remember what was selected (or the link the cursor is in), and fill in its current settings
  // the text the panel was opened on: once you type in the panel, the selection lives in its fields instead
  const target = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = root()
    target.current = el
    const sel = window.getSelection()
    if (!el || !sel || !sel.rangeCount) return
    const r = sel.getRangeAt(0)
    // the link the cursor is in, or the first link any part of the selection touches
    const a =
      (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : (r.startContainer as HTMLElement))?.closest('a') ??
      (!r.collapsed ? [...el.querySelectorAll('a')].find((x) => r.intersectsNode(x)) : null)
    if (a && el.contains(a)) {
      const ar = document.createRange()
      ar.selectNodeContents(a)
      saved.current = [offsetOf(el, ar.startContainer, ar.startOffset), offsetOf(el, ar.endContainer, ar.endOffset)]
      const ex: Existing = { href: a.getAttribute('href') ?? '', tab: a.getAttribute('target') === '_blank', nofollow: /nofollow/.test(a.getAttribute('rel') ?? ''), popup: a.dataset.popup }
      setExisting(ex)
      setTab(ex.tab)
      setNofollow(ex.nofollow)
      if (ex.popup) {
        setKind('popup')
        setPopup(ex.popup)
      } else setUrl(ex.href)
    } else if (el.contains(r.startContainer) && !r.collapsed) {
      saved.current = [offsetOf(el, r.startContainer, r.startOffset), offsetOf(el, r.endContainer, r.endOffset)]
    }
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
  }, [])

  /** Put the remembered selection back in the text. Without one, the whole text becomes the link. */
  const restore = () => {
    const el = target.current?.isConnected ? target.current : root()
    const sel = window.getSelection()
    if (!el || !sel) return null
    const r = document.createRange()
    if (saved.current) {
      const a = pointAt(el, saved.current[0])
      const b = pointAt(el, saved.current[1])
      r.setStart(a.node, a.offset)
      r.setEnd(b.node, b.offset)
    } else r.selectNodeContents(el)
    el.focus({ preventScroll: true })
    sel.removeAllRanges()
    sel.addRange(r)
    return el
  }

  const href = kind === 'popup' ? `#popup-${popup ?? ''}` : normalizeUrl(url)
  const info = describe(kind === 'popup' ? '' : href)
  const canConfirm = kind === 'popup' ? !!popup : info.ok

  const confirm = () => {
    if (!canConfirm) return
    const el = restore()
    if (!el) return
    document.execCommand('unlink')
    document.execCommand('createLink', false, href)
    // set the extras on the link(s) just made
    const sel = window.getSelection()
    const r = sel && sel.rangeCount ? sel.getRangeAt(0) : null
    el.querySelectorAll('a').forEach((a) => {
      if (a.getAttribute('href') !== href || (r && !r.intersectsNode(a))) return
      if (kind === 'popup') {
        a.dataset.popup = popup!
        a.removeAttribute('target')
        a.removeAttribute('rel')
        return
      }
      delete a.dataset.popup
      if (tab) a.setAttribute('target', '_blank')
      else a.removeAttribute('target')
      const rel = [nofollow && 'nofollow', tab && 'noopener'].filter(Boolean).join(' ')
      if (rel) a.setAttribute('rel', rel)
      else a.removeAttribute('rel')
    })
    el.dispatchEvent(new Event('input', { bubbles: true }))
    onClose()
  }

  const remove = () => {
    const el = restore()
    if (!el) return
    document.execCommand('unlink')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    onClose()
  }

  const upload = (f: File | undefined) => {
    if (!f) return
    if (f.size > 3 * 1024 * 1024) return toast('That file is larger than 3 MB. Upload it to your files and paste its link instead.')
    const reader = new FileReader()
    reader.onload = () => setUrl(String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <Popover anchor={anchor} onClose={onClose} width={320} align="end">
      {/* clicks in the panel never move the text selection */}
      <div
        className="p-3"
        onMouseDown={(e) => !(e.target as HTMLElement).closest('input') && e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirm()
          }
          if (e.key === 'Escape') onClose()
        }}
      >
        <Segmented
          full
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'link', label: 'Link', icon: <Link2 size={13} /> },
            { value: 'popup', label: 'Popup', icon: <LayoutPanelTop size={13} /> },
          ]}
        />

        {kind === 'link' ? (
          <>
            <label className="mt-2.5 flex h-8 items-center gap-2 rounded-[8px] bg-[var(--fill-1)] pl-2.5 pr-1 text-[var(--t3)] focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
              <Link2 size={14} className="flex-none" />
              <input
                ref={input}
                value={url.startsWith('data:') ? 'Uploaded file' : url}
                readOnly={url.startsWith('data:')}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Type in URL"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
              />
              <button title="Upload a file" onClick={() => (url.startsWith('data:') ? setUrl('') : file.current?.click())} className="press flex h-6 w-6 flex-none items-center justify-center rounded-[6px] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]">
                <Upload size={14} />
              </button>
              <input ref={file} type="file" className="hidden" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ''))} />
            </label>

            {/* where the link goes, before you confirm */}
            <div className={cx('mt-2.5 flex items-center gap-2.5 rounded-[10px] bg-[var(--fill-1)] p-2 transition-opacity', !info.ok && 'opacity-50')}>
              <span className="relative flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-[8px] bg-[var(--raised)] text-[var(--t3)] shadow-[0_0_0_1px_var(--line)]">
                <Globe size={16} />
                {/* the site's icon covers the globe once it has loaded */}
                {info.host && (
                  <img
                    key={info.host}
                    src={`https://www.google.com/s2/favicons?domain=${info.host}&sz=64`}
                    alt=""
                    className="absolute inset-0 m-auto h-5 w-5 bg-[var(--raised)]"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[var(--t1)]">{info.title}</span>
                <span className="block truncate text-[11.5px] text-[var(--t3)]">{info.sub}</span>
              </span>
              {info.ok && <CircleCheck size={15} className="flex-none text-[var(--ok)]" />}
            </div>

            <div className="mt-2 flex flex-col">
              <label className="flex min-h-8 items-center justify-between text-[12.5px] text-[var(--t2)]">
                Open link in a new tab
                <Toggle checked={tab} onChange={setTab} label="Open link in a new tab" />
              </label>
              <label className="flex min-h-8 items-center justify-between text-[12.5px] text-[var(--t2)]">
                <span>
                  Nofollow <span className="text-[11px] text-[var(--t4)]">for search engines</span>
                </span>
                <Toggle checked={nofollow} onChange={setNofollow} label="Nofollow" />
              </label>
            </div>
          </>
        ) : popups.length ? (
          // a dropdown, so it stays the same size however many popups the page has
          <div className="mt-2.5">
            <Select value={popup} onChange={setPopup} options={popups.map((p) => ({ value: p.id, label: p.name }))} />
          </div>
        ) : (
          <p className="mt-3 text-[12px] leading-[18px] text-[var(--t3)]">This page has no popups yet. Create one from Popups in the top bar, then link it here.</p>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          {existing && (
            <button onClick={remove} className="press flex h-[30px] items-center gap-1.5 rounded-[8px] px-2 text-[12.5px] font-medium text-[var(--t3)] hover:bg-[var(--fill-1)] hover:text-[var(--dng)]">
              <Unlink size={13} />
              Remove link
            </button>
          )}
          <span className="flex-1" />
          <button onClick={onClose} className="press h-[30px] rounded-[8px] px-3 text-[12.5px] font-medium text-[var(--t2)] hover:bg-[var(--fill-1)]">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm}
            className="press h-[30px] rounded-[8px] bg-[var(--brand)] px-3 text-[12.5px] font-medium text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </Popover>
  )
}
