import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { el } from '../blocks'
import { AlignRow, G, PChoice, SizePosition } from '../settings/kit'
import type { Node, Style } from '../types'
import type { ElementDef } from './types'
import { InfoNote } from './input'

export const def: ElementDef = {
  type: 'recaptcha',
  label: 'reCAPTCHA',
  icon: ShieldCheck,
  group: 'Form',
  make: () => el('recaptcha', { theme: 'light' }, {}),
  render: ({ node, s, editable }) => <Recaptcha node={node} s={s} editable={editable} />,
  settings: () => <RecaptchaSettings />,
}

/* The widget mirrors Google's own control, so its colours are Google's, not the page theme's. */
const SKIN = {
  light: { bg: '#f9f9f9', line: '#d3d3d3', text: '#000000', sub: '#555555', box: '#ffffff', boxLine: '#c1c1c1', shadow: '0 0 4px 1px rgba(0,0,0,.08)' },
  dark: { bg: '#222222', line: '#4a4a4a', text: '#ffffff', sub: '#a6a6a6', box: '#ffffff', boxLine: '#c1c1c1', shadow: '0 0 4px 1px rgba(0,0,0,.4)' },
}

const SPIN_CSS = `@keyframes sio-rc-spin{to{transform:rotate(360deg)}}@keyframes sio-rc-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}`

function Recaptcha({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const k = SKIN[node.props.theme === 'dark' ? 'dark' : 'light']
  const [state, setState] = useState<'idle' | 'checking' | 'done'>('idle')
  const align = s.textAlign ?? 'left'
  const click = () => {
    if (editable || state !== 'idle') return
    setState('checking')
    window.setTimeout(() => setState('done'), 900)
  }
  return (
    <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
      <style>{SPIN_CSS}</style>
      <div
        role="group"
        aria-label="reCAPTCHA"
        style={{
          width: 302,
          maxWidth: '100%',
          height: 76,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 10px 0 12px',
          background: k.bg,
          border: `1px solid ${k.line}`,
          borderRadius: 3,
          boxShadow: k.shadow,
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'left',
          userSelect: 'none',
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={state === 'done'}
          aria-label="I'm not a robot"
          onClick={click}
          tabIndex={editable ? -1 : 0}
          style={{
            all: 'unset',
            flex: 'none',
            width: 28,
            height: 28,
            boxSizing: 'border-box',
            display: 'grid',
            placeItems: 'center',
            borderRadius: state === 'checking' ? 999 : 2,
            background: state === 'idle' ? k.box : 'transparent',
            border: state === 'idle' ? `2px solid ${k.boxLine}` : '2px solid transparent',
            cursor: 'pointer',
            transition: 'border-radius 160ms ease-out, background-color 160ms ease-out',
          }}
        >
          {state === 'checking' ? (
            <span style={{ width: 24, height: 24, boxSizing: 'border-box', borderRadius: 999, border: '4px solid #4a90e2', borderTopColor: 'transparent', animation: 'sio-rc-spin 800ms linear infinite' }} />
          ) : state === 'done' ? (
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#009e55" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'sio-rc-pop 200ms ease-out' }}>
              <path d="M4 12.5l5 5L20 6" />
            </svg>
          ) : null}
        </button>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: k.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>I'm not a robot</span>
        <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: 64, paddingTop: 2 }}>
          <Logo />
          <span style={{ fontSize: 10, lineHeight: '12px', color: k.sub, marginTop: 2 }}>reCAPTCHA</span>
          <span style={{ fontSize: 8, lineHeight: '10px', color: k.sub }}>Privacy · Terms</span>
        </span>
      </div>
    </div>
  )
}

/** The circular-arrows mark, drawn as three coloured arcs with arrow heads. */
function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
      <path d="M16 4a12 12 0 0 1 11.3 8" fill="none" stroke="#4a90e2" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M29.6 7.6l-1.4 6.2-5.6-2.6z" fill="#4a90e2" />
      <path d="M28 16a12 12 0 0 1-8 11.3" fill="none" stroke="#1c3aa9" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M24.4 29.6l-6.2-1.4 2.6-5.6z" fill="#1c3aa9" />
      <path d="M16 28A12 12 0 0 1 4 16a12 12 0 0 1 .7-4" fill="none" stroke="#a6a6a6" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M1.6 9.8l5.8-2.4.6 6.1z" fill="#a6a6a6" />
    </svg>
  )
}

function RecaptchaSettings() {
  return (
    <>
      <G title="reCAPTCHA" keys={['textAlign']}>
        <InfoNote>To display a CAPTCHA on your page, add the public and private CAPTCHA keys in your custom domain settings.</InfoNote>
        <AlignRow />
        <PChoice
          p="theme"
          label="Captcha theme"
          seg
          stack
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </G>
      <SizePosition pad={false} />
    </>
  )
}
