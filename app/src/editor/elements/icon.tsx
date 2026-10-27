import { Star } from 'lucide-react'
import type { CSSProperties } from 'react'
import { el } from '../blocks'
import { ICONS } from '../icons'
import { cssColor } from '../theme'
import { border, radius, shadow } from '../render/css'
import { AlignRow, BorderGroup, Color, G, IconPick, Num, PChoice, PText, ShadowRow, Spacing, useInspector } from '../settings/kit'
import type { ElementDef } from './types'

export const def: ElementDef = {
  type: 'icon',
  label: 'Icon',
  icon: Star,
  group: 'Media',
  make: () => el('icon', { icon: 'star', action: 'none' }, { iconSize: 64, textAlign: 'center' }),
  render: ({ node, s, editable }) => {
    const p = node.props
    const Icon = ICONS[p.icon ?? 'star'] ?? ICONS.star
    const size = s.iconSize ?? 64
    const bg = cssColor(s.background)
    const hasBorder = (s.borderType ?? (s.border ? 'full' : 'none')) !== 'none'
    const boxed = !!bg || hasBorder
    const align = s.textAlign ?? 'center'
    const shape: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: boxed ? Math.round(size * 0.32) : 0,
      background: bg,
      // corner radius is 0 unless you set one (a background never rounds it on its own)
      borderRadius: radius(s),
      boxShadow: shadow(s.shadow),
      ...border(s),
      lineHeight: 0,
      color: cssColor(s.iconColor) ?? 'var(--c-primary)',
    }
    const glyph = <Icon size={size} strokeWidth={size >= 48 ? 1.75 : 2} />
    const link = !editable && p.action === 'url' && p.url
    return (
      <div style={{ display: 'flex', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
        {link ? (
          <a href={p.url} target={p.newWindow ? '_blank' : undefined} rel={p.newWindow ? 'noopener noreferrer' : undefined} style={{ ...shape, textDecoration: 'none' }} aria-label={p.icon ?? 'Icon'}>
            {glyph}
          </a>
        ) : (
          <span style={shape} role="img" aria-label={p.icon ?? 'Icon'}>
            {glyph}
          </span>
        )}
      </div>
    )
  },
  settings: () => <IconSettings />,
}

function IconSettings() {
  const { p } = useInspector()
  return (
    <>
      <G title="Icon" keys={['iconColor', 'background']}>
        <IconPick p="icon" label="Icon selector" allowNone={false} />
        <Color k="iconColor" label="Icon color" />
        <Color k="background" label="Background color" />
        <PChoice
          p="action"
          label="Action when icon clicked"
          stack
          options={[
            { value: 'none', label: 'None' },
            { value: 'url', label: 'Open URL' },
          ]}
        />
        {p.action === 'url' && <PText p="url" label="URL" placeholder="https://" />}
      </G>
      <G title="Size and position" keys={['marginY', 'marginX', 'mar', 'textAlign', 'iconSize']}>
        <Spacing kind="margin" />
        <AlignRow />
        <Num k="iconSize" label="Icon size" min={12} max={240} fallback={64} />
      </G>
      <BorderGroup />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
    </>
  )
}
