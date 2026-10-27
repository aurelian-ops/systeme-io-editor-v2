import { createLucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { el } from '../blocks'
import { ICONS, X_LOGO_PATH } from '../icons'
import { AlignRow, G, PText, SizePosition } from '../settings/kit'
import type { ElementDef } from './types'

const X = ICONS['x-twitter']

/** The X logo for the Elements tile: filled, centred in the 24px icon box like the other tiles' icons. */
const XTile = createLucideIcon('x-logo', [['path', { d: X_LOGO_PATH, fill: 'currentColor', stroke: 'none', transform: 'translate(2.5 3.4) scale(0.0633)', key: 'x' }]])

/** X (Twitter) share button: the small black "Post" pill, opens the X composer with the tweet text. */
export const def: ElementDef = {
  type: 'xshare',
  label: 'X share button',
  icon: XTile,
  group: 'Social',
  make: () => el('xshare', { tweet: 'I just found this page and thought of you.' }),
  render: ({ node, s, editable }) => {
    const tweet = node.props.tweet ?? ''
    const align = s.textAlign ?? 'left'
    const pill: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 30,
      padding: '0 14px 0 12px',
      borderRadius: 999,
      background: '#0f1419',
      color: '#fff',
      fontFamily: 'var(--f-body)',
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: 0,
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 2px rgba(0,0,0,.12)',
      cursor: 'pointer',
      transition: 'background-color 120ms var(--ease-out), transform 120ms var(--ease-out)',
    }
    const body = (
      <>
        <X size={13} />
        Post
      </>
    )
    return (
      <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
        {editable ? (
          <span style={pill} aria-label="Share on X">
            {body}
          </span>
        ) : (
          <a
            href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
            style={{ ...pill, color: '#fff' }}
            onPointerEnter={(e) => (e.currentTarget.style.background = '#272c30')}
            onPointerLeave={(e) => (e.currentTarget.style.background = '#0f1419')}
          >
            {body}
          </a>
        )}
      </div>
    )
  },
  settings: () => (
    <>
      <G title="Button" keys={['textAlign']}>
        <PText p="tweet" label="Tweet text" multiline placeholder="What people will post" />
        <AlignRow />
      </G>
      <SizePosition pad={false} />
    </>
  ),
}
