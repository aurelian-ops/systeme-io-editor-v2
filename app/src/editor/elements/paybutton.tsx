import { useEffect, type CSSProperties } from 'react'
import { CreditCard } from 'lucide-react'
import { el } from '../blocks'
import { ICONS } from '../icons'
import { cssColor } from '../theme'
import { ensureFont } from '../fonts'
import { border, font, lineHeight, padding, radius, shadow } from '../render/css'
import { EditableText, useRender } from '../render/PageView'
import { Field, NumberField, Segmented } from '../../ui/kit'
import { AlignRow, BorderGroup, Color, ColorButton, FontType, G, IconPick, LineHeight, Num, PText, ShadowRow, SizePosition, useInspector } from '../settings/kit'
import type { Node, Style } from '../types'
import type { ElementDef } from './types'

export const def: ElementDef = {
  type: 'paybutton',
  label: 'Payment redirection button',
  icon: CreditCard,
  group: 'Payment',
  make: () =>
    el(
      'paybutton',
      { text: 'Buy now', subtext: 'Secure checkout in one step', icon: 'lock' },
      { textAlign: 'center', fontSize: 18, paddingY: 16, paddingX: 36 },
    ),
  render: ({ node, s, editable }) => <PayButton node={node} s={s} editable={editable} />,
  settings: () => <PayButtonSettings />,
}

function PayButton({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const { doc } = useRender()
  const p = node.props
  useEffect(() => ensureFont(s.subtextFontFamily), [s.subtextFontFamily])
  const Before = p.icon ? ICONS[p.icon] : undefined
  const After = p.iconAfter ? ICONS[p.iconAfter] : undefined
  const fs = s.fontSize ?? 18
  const align = s.textAlign ?? 'center'
  const pill = doc.theme.radius >= 999
  const hv = s.hover ?? {}
  const bg = cssColor(s.background) ?? 'var(--c-primary)'
  const fg = cssColor(s.color) ?? 'var(--c-on-primary)'
  // the hover rule in index.css reads these; fall back to the resting colours so an unset value never blanks the button
  const vars = {
    '--h-color': cssColor(hv.color) ?? fg,
    '--h-bg': cssColor(hv.background) ?? bg,
    '--h-sub': cssColor(hv.subtextColor) ?? cssColor(s.subtextColor) ?? 'inherit',
    '--h-move': hv.movement ? `${-hv.movement}px` : '0px',
  } as CSSProperties
  return (
    <div style={{ display: 'flex', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
      <a
        role="button"
        className={editable ? undefined : 'sio-btn'}
        onClick={(e) => {
          e.preventDefault()
          if (editable) return
          window.dispatchEvent(new CustomEvent('sio:action', { detail: { action: 'checkout' } }))
        }}
        style={{
          ...vars,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          width: s.fullWidth ? '100%' : undefined,
          maxWidth: '100%',
          minHeight: 52,
          boxSizing: 'border-box',
          padding: padding(s, [16, 36]),
          borderRadius: radius(s) ?? (pill ? '999px' : 'var(--r)'),
          background: bg,
          color: fg,
          boxShadow: shadow(s.shadow) ?? 'inset 0 -1px 0 rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
          ...border(s),
          textAlign: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
          userSelect: editable ? undefined : 'none',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5em',
            fontSize: fs,
            lineHeight: lineHeight(s, 1.2),
            fontWeight: 600,
            letterSpacing: '-0.005em',
            ...font(s),
          }}
        >
          {Before ? <Before size={Math.round(fs * 0.95)} strokeWidth={2.2} style={{ flex: 'none' }} /> : null}
          <EditableText node={node} as="span" style={{}} />
          {After ? <After size={Math.round(fs * 0.95)} strokeWidth={2.2} style={{ flex: 'none' }} /> : null}
        </span>
        {p.subtext ? (
          <span
            className="sio-sub"
            style={{
              fontSize: s.subtextSize ?? Math.max(11, Math.round(fs * 0.72)),
              lineHeight: 1.3,
              fontWeight: 400,
              color: cssColor(s.subtextColor),
              opacity: s.subtextColor ? 1 : 0.82,
              fontFamily: s.subtextFontFamily ? `"${s.subtextFontFamily}", var(--f-body)` : undefined,
            }}
          >
            {p.subtext}
          </span>
        ) : null}
      </a>
    </div>
  )
}

function PayButtonSettings() {
  const { s, set } = useInspector()
  return (
    <>
      <G title="Button" keys={['textAlign', 'fullWidth', 'background']}>
        <AlignRow />
        <Field label="Button width">
          <Segmented
            full
            size="sm"
            value={s.fullWidth ? 'fill' : 'auto'}
            onChange={(v) => set('fullWidth', v === 'fill')}
            options={[
              { value: 'auto', label: 'Fluid' },
              { value: 'fill', label: 'Fill width' },
            ]}
          />
        </Field>
        <Color k="background" label="Background color" />
        <IconPick p="icon" label="Icon selector (before text)" />
        <IconPick p="iconAfter" label="Icon selector (after text)" />
      </G>
      <G title="Text" keys={['fontSize', 'lineHeight', 'fontFamily', 'color']}>
        <PText p="text" label="Button text" />
        <Num k="fontSize" label="Font size" min={10} max={48} fallback={18} />
        <LineHeight fallback={1.2} />
        <FontType />
        <Color k="color" label="Color" />
      </G>
      <G title="Sub text" keys={['subtextSize', 'subtextFontFamily', 'subtextColor']}>
        <PText p="subtext" label="Subtext" placeholder="Optional second line" />
        <Num k="subtextSize" label="Font size" min={8} max={32} fallback={13} />
        <FontType k="subtextFontFamily" />
        <Color k="subtextColor" label="Color" />
      </G>
      <HoverEffect />
      <BorderGroup />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <SizePosition />
    </>
  )
}

/** Same model as the built-in Button hover group (style.hover), with V1's labels for this element. */
function HoverEffect() {
  const { s, set } = useInspector()
  const h = s.hover ?? {}
  const put = (patch: Partial<NonNullable<Style['hover']>>) => set('hover', { ...h, ...patch })
  const color = (label: string, k: 'color' | 'background' | 'subtextColor') => (
    <Field label={label}>
      <div className="flex w-full justify-end">
        <ColorButton value={h[k]} onChange={(v) => put({ [k]: v })} />
      </div>
    </Field>
  )
  return (
    <G title="Hover effect" keys={['hover']}>
      {color('Text color', 'color')}
      {color('Background color', 'background')}
      {color('Subtext color', 'subtextColor')}
      <Field label="Movement on hover" stack>
        <NumberField value={h.movement ?? 0} onChange={(v) => put({ movement: v })} max={12} unit="px" />
      </Field>
      <p className="text-[11px] text-[var(--t4)]">Shown in Preview and on the published page.</p>
    </G>
  )
}
