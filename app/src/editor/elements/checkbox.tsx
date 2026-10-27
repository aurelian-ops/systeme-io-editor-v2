import { useState } from 'react'
import { SquareCheck } from 'lucide-react'
import { el } from '../blocks'
import { cssColor } from '../theme'
import { font, lineHeight, padding } from '../render/css'
import { EditableText, useRender } from '../render/PageView'
import { getState, setState, useEditor } from '../store'
import { path } from '../tree'
import { AlignRow, fieldDomId, FontType, G, LineHeight, Num, OptionalRow, PText, SizePosition, useInspector } from '../settings/kit'
import { WideColor } from './input'
import { EditDesignButton, FieldsDesign, useFormOf } from '../panels/FieldsDesign'
import { Automations } from '../panels/Inspector'
import type { Node, Style } from '../types'
import type { ElementDef } from './types'

export const def: ElementDef = {
  type: 'checkbox',
  label: 'Checkbox',
  icon: SquareCheck,
  group: 'Form',
  make: () => el('checkbox', { text: 'Yes, I agree to receive emails from you', optional: false, message: '' }, {}),
  render: ({ node, s, editable }) => <Checkbox node={node} s={s} editable={editable} />,
  settings: () => <CheckboxSettings />,
}

const BOX_CSS = `
.sio-cb-box{transition-property:background-color,box-shadow,transform;transition-duration:120ms;transition-timing-function:var(--ease-out,ease)}
.sio-cb:active .sio-cb-box{transform:scale(0.94)}
.sio-cb input:focus-visible + .sio-cb-box{box-shadow:inset 0 0 0 1.5px var(--c-primary),0 0 0 3px color-mix(in srgb,var(--c-primary) 22%,transparent)}
.sio-cb-tick{transition:opacity 120ms var(--ease-out,ease),transform 160ms var(--ease-out,ease)}
`

function Checkbox({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const { editingId } = useRender()
  const p = node.props
  const [checked, setChecked] = useState(false)
  const fs = s.fontSize ?? 15
  const size = Math.max(16, Math.round(fs * 1.2))
  const align = s.textAlign ?? 'left'
  const editing = editable && editingId === node.id
  const on = checked && !editable
  const Wrap = editable ? 'div' : 'label'
  const lh = lineHeight(s, 1.45)
  const lineH = typeof lh === 'number' ? `${lh}em` : lh
  return (
    <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', padding: padding(s) }}>
      <style>{BOX_CSS}</style>
      <Wrap
        className="sio-cb"
        // first click selects, a second click (or a double click) edits the label, like headlines
        onClick={(e) => {
          if (!editable) return
          const st = getState()
          if (st.editingId === node.id) return
          if (st.selectedId === node.id || e.detail >= 2) setState({ selectedId: node.id, editingId: node.id })
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          gap: Math.round(fs * 0.7),
          cursor: editing ? 'text' : editable ? 'default' : 'pointer',
          textAlign: 'left',
          fontSize: fs,
          lineHeight: lh,
          color: cssColor(s.color) ?? 'var(--c-ink)',
          ...font(s),
        }}
      >
        <span style={{ position: 'relative', flex: 'none', display: 'inline-flex', height: lineH, alignItems: 'center' }}>
          <input
            type="checkbox"
            name={`checkbox_${node.id.slice(-6)}`}
            id={fieldDomId(node)}
            checked={on}
            disabled={editable}
            required={!editable && !p.optional}
            onChange={(e) => {
              setChecked(e.target.checked)
              e.target.setCustomValidity('')
            }}
            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(p.message || 'Please tick this box to continue.')}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0, pointerEvents: 'none' }}
          />
          <span
            className="sio-cb-box"
            aria-hidden
            style={{
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              display: 'grid',
              placeItems: 'center',
              background: on ? 'var(--c-primary)' : 'var(--c-bg)',
              boxShadow: on ? 'inset 0 0 0 1.5px var(--c-primary)' : 'inset 0 0 0 1.5px color-mix(in srgb, var(--c-ink) 28%, transparent)',
            }}
          >
            <svg
              className="sio-cb-tick"
              viewBox="0 0 16 16"
              width={size * 0.72}
              height={size * 0.72}
              fill="none"
              stroke="var(--c-on-primary)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.6)' }}
            >
              <path d="M3.5 8.5l3 3 6-7" />
            </svg>
          </span>
        </span>
        <EditableText node={node} as="span" style={{ minWidth: 0, overflowWrap: 'anywhere', outline: 'none' }} />
      </Wrap>
    </div>
  )
}

function CheckboxSettings() {
  const { node } = useInspector()
  const inForm = useEditor((st) => path(st.doc, node.id).some((n) => n.type === 'form'))
  const form = useFormOf(node.id)
  const [design, setDesign] = useState(false)
  if (inForm && design && form) return <FieldsDesign formId={form.id} kind="checkbox" onBack={() => setDesign(false)} back="Checkbox" />
  // inside a form, V1's short settings: its message, Optional, text colour and its id
  if (inForm)
    return (
      <>
        <G title="Checkbox">
          <PText p="message" label="Message if box remains unticked" stack placeholder="Message if box remains unticked" />
          <OptionalRow hint="Selecting this option means that the user isn't required to tick the checkbox before sending the form" />
        </G>
        <G title="Color" keys={['color']}>
          <WideColor k="color" label="Text color" />
        </G>
        <EditDesignButton onClick={() => setDesign(true)} hint="Shared by all checkboxes in this form" />
      </>
    )
  return (
    <>
      <G title="Checkbox">
        <PText p="message" label="Message if box remains unticked" stack placeholder="Please tick this box to continue." />
        <OptionalRow hint="Selecting this option means that the user isn't required to tick the checkbox before sending the form" />
        <Automations when="this box is ticked" />
      </G>
      <G title="Typography" keys={['fontSize', 'lineHeight', 'fontFamily', 'textAlign']}>
        <Num k="fontSize" label="Font size" min={10} max={40} fallback={15} />
        <LineHeight fallback={1.45} />
        <FontType />
        <AlignRow />
      </G>
      <G title="Color" keys={['color']}>
        <WideColor k="color" label="Text color" />
      </G>
      <SizePosition />
    </>
  )
}
