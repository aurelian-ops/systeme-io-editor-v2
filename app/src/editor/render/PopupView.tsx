import { useState, type CSSProperties, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { themeVars } from '../theme'
import type { PageDoc, Popup } from '../types'
import { background, border, padding, radius, shadow } from './css'

/** Theme and page-level colours, so a popup reads like the page it opens on. */
function popupVars(doc: PageDoc): CSSProperties {
  const ps = doc.settings
  return {
    ...themeVars(doc.theme),
    ...(ps?.textColor ? { '--c-ink': ps.textColor } : {}),
    ...(ps?.headingColor ? { '--c-heading': ps.headingColor } : {}),
    ...(ps?.linkColor ? { '--c-link': ps.linkColor } : {}),
  } as CSSProperties
}

/** The popup box itself: close button, headline, text, email field, button and note. */
export function PopupCard({ doc, popup, editable = false, compact = false, onClose }: { doc: PageDoc; popup: Popup; editable?: boolean; compact?: boolean; onClose?: () => void }) {
  const [sent, setSent] = useState(false)
  const s = popup.style ?? {}
  const pill = doc.theme.radius >= 999
  const ctl = pill ? '999px' : 'var(--r)'
  const align = doc.settings?.headingAlign ?? 'center'
  return (
    <div
      className="page-root"
      role="dialog"
      aria-label={popup.name}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...popupVars(doc),
        position: 'relative',
        width: popup.width || 600,
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: padding(s, compact ? [32, 24] : [40, 40]),
        borderRadius: radius(s) ?? 'var(--r-card)',
        boxShadow: shadow(s.shadow) ?? '0 24px 64px -16px rgba(0,0,0,.4)',
        ...border(s),
        ...background({ ...s, background: s.background ?? 'bg' }),
        textAlign: 'center',
        fontSize: doc.settings?.fontSize,
      }}
    >
      {popup.closeButton && (
        <button
          aria-label="Close popup"
          tabIndex={editable ? -1 : 0}
          onClick={editable ? undefined : onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            border: 0,
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--c-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>
      )}
      {popup.headline ? (
        <h3
          style={{
            fontFamily: 'var(--f-heading)',
            fontWeight: 'var(--h-weight)' as unknown as number,
            letterSpacing: 'var(--h-track)',
            fontSize: compact ? 24 : 30,
            lineHeight: 1.15,
            color: 'var(--c-heading, var(--c-ink))',
            textAlign: align,
            textWrap: 'balance',
          }}
        >
          {popup.headline}
        </h3>
      ) : null}
      {popup.text ? <p style={{ marginTop: 10, color: 'var(--c-muted)', fontSize: 16, lineHeight: 1.55, textAlign: align, textWrap: 'pretty' }}>{popup.text}</p> : null}
      {sent ? (
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 16px', borderRadius: ctl, background: 'var(--c-surface)', fontSize: 15, textAlign: 'left' }}>
          <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--c-primary)', color: 'var(--c-on-primary)' }}>
            <Check size={13} strokeWidth={3} />
          </span>
          <span>
            Thanks, you are on the list.
            <span style={{ display: 'block', fontSize: 13, color: 'var(--c-muted)' }}>Preview only. Nothing was sent.</span>
          </span>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!editable) setSent(true)
          }}
          style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <input
            type="email"
            required={!editable}
            readOnly={editable}
            tabIndex={editable ? -1 : 0}
            placeholder="Email address"
            style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 16, padding: '14px 16px', minHeight: 48, borderRadius: ctl, border: '1px solid var(--c-line)', background: 'var(--c-bg)', color: 'var(--c-ink)', outline: 'none' }}
          />
          <button
            type={editable ? 'button' : 'submit'}
            tabIndex={editable ? -1 : 0}
            className={editable ? undefined : 'sio-btn'}
            style={{ width: '100%', font: 'inherit', fontSize: 16, fontWeight: 600, padding: '15px 20px', border: 0, borderRadius: ctl, background: 'var(--c-primary)', color: 'var(--c-on-primary)', cursor: 'pointer' }}
          >
            {popup.buttonText || 'Submit'}
          </button>
        </form>
      )}
      {popup.note ? <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.45, color: 'var(--c-muted)' }}>{popup.note}</p> : null}
    </div>
  )
}

/** Backdrop + popup, laid over whatever container it sits in. Used by Preview. */
export function PopupView({ doc, popup, onClose, maxWidth, children }: { doc: PageDoc; popup: Popup; onClose?: () => void; maxWidth?: number; children?: ReactNode }) {
  return (
    <div
      className="fade-in scroll-thin"
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 30, overflowY: 'auto', background: 'rgba(10,10,10,.48)', display: 'flex', padding: '48px 16px' }}
    >
      <div className="pop-in" style={{ margin: 'auto', width: '100%', maxWidth: Math.min(popup.width || 600, (maxWidth ?? 10000) - 32), display: 'flex', justifyContent: 'center' }}>
        <PopupCard doc={doc} popup={popup} onClose={onClose} compact={(maxWidth ?? 10000) < 600} />
      </div>
      {children}
    </div>
  )
}
