import type { ReactNode } from 'react'
import { PanelTop } from 'lucide-react'
import { el } from '../blocks'
import { cssColor } from '../theme'
import { background, border, font, lineHeight, padding, radius, shadow } from '../render/css'
import { EmptyDrop } from '../render/PageView'
import { Field, Segmented } from '../../ui/kit'
import { AlignRow, BorderGroup, FontType, G, ImagePick, Num, PText, ShadowRow, SizePosition, useInspector } from '../settings/kit'
import type { Node, Style } from '../types'
import type { ElementDef } from './types'
import { WideColor } from './input'

export const def: ElementDef = {
  type: 'contentbox',
  label: 'Content box',
  icon: PanelTop,
  group: 'Text',
  // content goes straight into the box (one column inside, no extra row to select through)
  make: () => el('contentbox', { headerVisible: true, title: 'Content box title' }, { paddingY: 24, paddingX: 24 }, [el('column', {}, { gap: 16 }, [])]),
  render: ({ node, s, editable, children }) => <ContentBox node={node} s={s} editable={editable} body={children()} />,
  settings: () => <ContentBoxSettings />,
}

function ContentBox({ node, s, editable, body }: { node: Node; s: Style; editable: boolean; body: ReactNode }) {
  const p = node.props
  const header = p.headerVisible !== false
  const fs = s.fontSize ?? 18
  const r = radius(s) ?? 'var(--r-card)'
  const hasBorder = !!s.borderType && s.borderType !== 'none'
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: r,
        overflow: 'hidden',
        // in a stretched column the box fills it: the title bar keeps its height, the content takes the rest
        flex: '1 1 auto',
        display: 'grid',
        gridTemplateRows: header ? 'auto 1fr' : '1fr',
        backgroundColor: 'var(--c-bg)',
        ...background(s),
        // a box in a page colour (the accent, the dark): the colour itself, never the readable override its own
        // content gets (a primary box would paint itself white)
        ...(s.background && !s.backgroundImage && !/^(#|rgb)/.test(s.background) ? { backgroundColor: `var(--here, ${cssColor(s.background)})` } : {}),
        ...border(s),
        // the thin outline is the plain box's look; a box with its own colour or border doesn't need it
        boxShadow: [hasBorder || s.background || s.borderType === 'none' ? null : '0 0 0 1px var(--c-edge)', shadow(s.shadow)].filter(Boolean).join(', ') || undefined,
        color: 'var(--c-ink)',
        textAlign: 'left',
      }}
    >
      {header ? (
        <div
          style={{
            background: cssColor(s.contentBackground) ?? 'var(--c-surface)',
            color: cssColor(s.subtextColor) ?? 'var(--c-heading, var(--c-ink))',
            padding: `${Math.round(fs * 0.8)}px 24px`,
            fontFamily: 'var(--f-heading)',
            fontWeight: 'var(--h-weight)' as unknown as number,
            letterSpacing: 'var(--h-track)',
            fontSize: fs,
            lineHeight: lineHeight(s, 1.3),
            textAlign: s.textAlign ?? 'left',
            boxShadow: 'inset 0 -1px 0 var(--c-line)',
            overflowWrap: 'anywhere',
            ...font(s, true),
            backgroundColor: undefined,
          }}
        >
          {p.title || (editable ? <span style={{ opacity: 0.45 }}>Content box title</span> : null)}
        </div>
      ) : null}
      <div style={{ padding: padding(s, [24, 24]) }}>{node.children?.length ? body : editable ? <EmptyDrop /> : null}</div>
    </div>
  )
}

function ContentBoxSettings() {
  const { node, setProps } = useInspector()
  const header = node.props.headerVisible !== false
  return (
    <>
      <G title="Header options" keys={['fontSize', 'fontFamily', 'contentBackground', 'subtextColor', 'textAlign', 'lineHeight']}>
        <Field label="Header visibility" stack>
          <Segmented
            full
            size="sm"
            value={header ? 'on' : 'off'}
            onChange={(v) => setProps({ headerVisible: v === 'on' }, false)}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </Field>
        {header && (
          <>
            <PText p="title" label="Header title" />
            <Num k="fontSize" label="Font size" min={10} max={48} fallback={18} />
            <FontType />
            <WideColor k="contentBackground" label="Background color" />
            <WideColor k="subtextColor" label="Color" />
            <AlignRow />
          </>
        )}
      </G>
      <G title="Color" keys={['background', 'backgroundImage']}>
        <WideColor k="background" label="Background color" />
        <ImagePick k="backgroundImage" label="Background image" />
      </G>
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <BorderGroup />
      <SizePosition />
    </>
  )
}
