import { useEffect, useRef, useState } from 'react'
import { Monitor, Smartphone, Tablet, X } from 'lucide-react'
import { PageView } from './render/PageView'
import { SioBadge } from './render/SioBadge'
import { PopupView } from './render/PopupView'
import { getState, setState, toast, useEditor } from './store'
import { DEVICE_WIDTH, type Device, type Popup, type Props } from './types'
import { IconButton, Segmented } from '../ui/kit'

type ActionDetail = Omit<Partial<Props>, 'action'> & { action?: string }

export function Preview() {
  const open = useEditor((s) => s.preview)
  const doc = useEditor((s) => s.doc)
  const [device, setDevice] = useState<Device>('desktop')
  const [popupId, setPopupId] = useState<string | null>(null)
  const shown = useRef(new Set<string>())
  const current = useRef<string | null>(null)
  current.current = popupId

  const popups: Popup[] = doc.popups ?? []
  const popup = popups.find((p) => p.id === popupId)

  // Esc closes an open popup first, then the preview
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (current.current) setPopupId(null)
      else setState({ preview: false })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  // a link set to open a popup (link panel → Popup) opens it here
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[data-popup]') as HTMLAnchorElement | null
      if (!a) return
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('sio:action', { detail: { action: 'popup', popupId: a.dataset.popup } }))
    }
    document.addEventListener('click', click, true)
    return () => document.removeEventListener('click', click, true)
  }, [open])

  // what buttons, images and forms do in the preview
  useEffect(() => {
    if (!open) return
    const onAction = (e: Event) => {
      const p = ((e as CustomEvent<ActionDetail>).detail ?? {}) as ActionDetail
      switch (p.action ?? 'submit') {
        case 'popup': {
          const target = (getState().doc.popups ?? []).find((x) => x.id === p.popupId)
          if (target) setPopupId(target.id)
          else toast('This button has no popup yet. Pick one in its settings')
          break
        }
        case 'url':
          break
        case 'next':
          toast('In the live page this goes to the next funnel step')
          break
        case 'download': {
          const file = p.fileName || p.url
          if (file) window.open(file, '_blank', 'noopener')
          else toast('Add a file URL to this button to test the download')
          break
        }
        case 'checkout':
          toast('Opens the checkout in the live page')
          break
        case 'submit':
          toast('Form submitted (preview)')
          break
      }
    }
    window.addEventListener('sio:action', onAction)
    return () => window.removeEventListener('sio:action', onAction)
  }, [open])

  // popups that open by themselves: after a delay, or when the pointer leaves towards the top
  useEffect(() => {
    if (!open) return
    shown.current = new Set()
    setPopupId(null)
    const list = (getState().doc.popups ?? []).filter((p) => p.enabled)
    const show = (p: Popup) => {
      if (current.current || shown.current.has(p.id)) return
      shown.current.add(p.id)
      setPopupId(p.id)
    }
    const timers = list.filter((p) => p.auto).map((p) => window.setTimeout(() => show(p), Math.max(0, p.delay) * 1000))
    const exit = list.filter((p) => p.exitIntent)
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget || e.clientY > 4) return
      const next = exit.find((p) => !shown.current.has(p.id))
      if (next) show(next)
    }
    if (exit.length) document.addEventListener('mouseout', onOut)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      document.removeEventListener('mouseout', onOut)
    }
  }, [open])

  if (!open) return null
  const frameW = device === 'desktop' ? undefined : DEVICE_WIDTH[device]
  return (
    <div className="fade-in fixed inset-0 z-[500] flex flex-col bg-[var(--canvas)]">
      <div className="flex h-12 flex-none items-center justify-between border-b border-[var(--line)] bg-[var(--raised)] px-3">
        {/* the title visitors see in the browser tab (SEO title), not the page's internal name */}
        <span className="min-w-0 truncate text-[13px] font-medium">
          Preview
          {doc.settings?.seoTitle?.trim() ? <span className="text-[var(--t3)]"> · {doc.settings.seoTitle.trim()}</span> : null}
        </span>
        <Segmented
          size="sm"
          value={device}
          onChange={setDevice}
          options={[
            { value: 'desktop', icon: <Monitor size={14} />, tip: 'Desktop' },
            { value: 'tablet', icon: <Tablet size={14} />, tip: 'Tablet' },
            { value: 'mobile', icon: <Smartphone size={14} />, tip: 'Mobile' },
          ]}
        />
        <IconButton tip="Close preview" kbd="Esc" onClick={() => setState({ preview: false })}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="scroll-thin absolute inset-0 overflow-auto">
          <div
            className="relative mx-auto bg-white"
            style={{
              width: frameW ?? '100%',
              margin: frameW ? '24px auto' : 0,
              borderRadius: device === 'desktop' ? 0 : device === 'mobile' ? 28 : 12,
              // clip (not hidden) so the badge below can stick to the bottom of the view
              overflow: 'clip',
              boxShadow: frameW ? 'var(--shadow-frame)' : undefined,
            }}
          >
            <PageView doc={doc} device={device} />
            {doc.settings?.affiliateBadge && <SioBadge compact={device === 'mobile'} />}
          </div>
        </div>
        {popup && <PopupView key={popup.id} doc={doc} popup={popup} maxWidth={frameW} onClose={() => setPopupId(null)} />}
      </div>
    </div>
  )
}

