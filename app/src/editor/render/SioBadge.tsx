import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '../../ui/kit'

/**
 * "made with [S]" (Studio signature): the editor's serif voice and the logo on a small frosted pill.
 * It floats 20px from the bottom-right corner of the page (16px on phones) and turns to dark glass
 * over dark sections and photos, so it always reads. Shown in the editor and in Preview, like V1.
 */
export function SioBadge({ compact = false, editor = false }: { compact?: boolean; editor?: boolean }) {
  const gap = compact ? 16 : 20
  return (
    // pinned to the bottom edge, then lifted by the gap: the same space while scrolling and at the very end of the page
    <div style={{ position: 'sticky', bottom: 0, height: 0, zIndex: 20, pointerEvents: 'none' }}>
      <BadgeLink editor={editor} style={{ position: 'absolute', bottom: gap, right: gap }} />
    </div>
  )
}

/** The badge itself; it checks what is behind it and switches to dark glass over dark areas. */
export function BadgeLink({ editor = false, style }: { editor?: boolean; style?: React.CSSProperties }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [dark, setDark] = useState(false)

  // what is behind the badge right now: dark glass over dark sections or photos
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        if (!r.width) return
        el.style.visibility = 'hidden'
        const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement | null
        el.style.visibility = ''
        setDark(isDarkBehind(under))
      })
    }
    check()
    // any scroll (the canvas, the preview, the window) can change what is behind it
    document.addEventListener('scroll', check, { passive: true, capture: true })
    const ro = new ResizeObserver(check)
    ro.observe(el.closest('.page-root') ?? document.body)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('scroll', check, { capture: true })
      ro.disconnect()
    }
  }, [])

  return (
    // the S alone does not spell the name, so it shows on hover, in the editor's own quick tooltip
    <Tooltip label="systeme.io" side="top">
    <a
      ref={ref}
      href="https://systeme.io"
      target="_blank"
      rel="noopener"
      aria-label="Made with systeme.io"
      className="sio-badge"
      data-dark={dark ? '' : undefined}
      style={{ pointerEvents: 'auto', ...style }}
      // in the editor it is shown, not followed (like V1)
      onClick={editor ? (e) => e.preventDefault() : undefined}
    >
      <em>made with</em>
      <img src="/logo.svg" alt="" width={18} height={18} />
    </a>
    </Tooltip>
  )
}

/** True when the nearest painted background behind a point is dark (or a photo). */
function isDarkBehind(start: HTMLElement | null) {
  for (let el = start; el; el = el.parentElement) {
    const cs = getComputedStyle(el)
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return true
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'IFRAME') return true
    const m = cs.backgroundColor.match(/[\d.]+/g)
    if (m && (m[3] === undefined || Number(m[3]) > 0.5)) {
      const [r, g, b] = m.map(Number)
      return (r * 299 + g * 587 + b * 114) / 1000 < 140
    }
    if (el.classList.contains('page-root')) return false
  }
  return false
}
