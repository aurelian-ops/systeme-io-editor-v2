import { useState, type CSSProperties, type ReactNode } from 'react'
import { Info, TextCursorInput } from 'lucide-react'
import { el } from '../blocks'
import { ICONS } from '../icons'
import { cssColor } from '../theme'
import { border, font, lineHeight, radius, shadow } from '../render/css'
import { useRender } from '../render/PageView'
import { useEditor } from '../store'
import { path } from '../tree'
import { PhoneCountry, useCountryOptions } from './PhoneCountry'
import { EditDesignButton, FieldsDesign, useFormOf } from '../panels/FieldsDesign'
import { Field, Select } from '../../ui/kit'
import { AlignRow, BorderGroup, ColorButton, fieldDomId, G, IconPick, LineHeight, Num, OptionalRow, PText, ShadowRow, SizePosition, useAuto, useInspector } from '../settings/kit'
import type { FieldType, Node, Style, StyleKey } from '../types'
import type { ElementDef } from './types'

/* ---------------- Small inspector helpers shared by the form elements ---------------- */

/** A colour row for labels too long for the fixed label column (V1 wording is often long). */
export function WideColor({ k, label }: { k: StyleKey; label: string }) {
  const { s, set } = useInspector()
  const auto = useAuto(k)
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="min-w-0 text-[12px] leading-[16px] text-[var(--t3)]">{label}</span>
      <ColorButton value={s[k] as string | undefined} onChange={(v) => set(k, v as never)} auto={auto} />
    </div>
  )
}

/** Calm one-line notice for sample data and setup hints. */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[12px] leading-[17px] text-[var(--t3)]">
      <Info size={13} className="mt-[2px] flex-none text-[var(--t4)]" />
      <span>{children}</span>
    </p>
  )
}

/** Same notice on the page canvas (editor only). Uses the page's muted ink so it sits on any section tone. */
export function CanvasNote({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'center' | 'right' }) {
  return (
    <p
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        gap: 6,
        margin: '8px 0 0',
        fontFamily: 'Geist, Inter, sans-serif',
        fontSize: 12,
        lineHeight: '17px',
        color: 'var(--c-muted)',
        textAlign: 'left',
      }}
    >
      <Info size={13} style={{ flex: 'none', marginTop: 2, opacity: 0.8 }} />
      <span>{children}</span>
    </p>
  )
}

/* ---------------- Form input ---------------- */

export const INPUT_TYPES: { value: FieldType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'phone', label: 'Phone number' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'street', label: 'Street address' },
  { value: 'postcode', label: 'Postcode' },
  { value: 'state', label: 'State' },
  { value: 'company', label: 'Company name' },
  { value: 'website', label: 'Website' },
  { value: 'neighborhood', label: 'Neighborhood' },
  { value: 'street_number', label: 'Street number' },
  { value: 'tax_number', label: 'Tax number' },
  { value: 'custom', label: 'Custom field' },
]

const HTML_TYPE: Partial<Record<FieldType, string>> = { email: 'email', phone: 'tel', website: 'url' }
const AUTOCOMPLETE: Partial<Record<FieldType, string>> = {
  email: 'email',
  first_name: 'given-name',
  last_name: 'family-name',
  phone: 'tel',
  country: 'country-name',
  city: 'address-level2',
  street: 'street-address',
  postcode: 'postal-code',
  state: 'address-level1',
  company: 'organization',
  website: 'url',
}

/** Focus ring and placeholder colour need real selectors, scoped by class. */
const INPUT_CSS = `
.sio-in{transition-property:border-color,box-shadow;transition-duration:120ms;transition-timing-function:var(--ease-out,ease)}
.sio-in::placeholder{color:var(--ph,color-mix(in srgb,currentColor 48%,transparent));opacity:1}
.sio-in:focus{outline:none;border-color:var(--c-primary)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--c-primary) 18%,transparent)}
`

export const def: ElementDef = {
  type: 'input',
  label: 'Form input',
  icon: TextCursorInput,
  group: 'Form',
  make: () => el('input', { placeholder: '' }, { borderType: 'full', borderWidth: 1, paddingY: 13, paddingX: 16 }),
  render: ({ node, s, editable }) => <FormInput node={node} s={s} editable={editable} />,
  settings: () => <InputSettings />,
}

function FormInput({ node, s, editable }: { node: Node; s: Style; editable: boolean }) {
  const { doc } = useRender()
  const p = node.props
  const pill = doc.theme.radius >= 999
  const type = p.inputType
  const fs = s.fontSize ?? 16
  const Icon = p.icon ? ICONS[p.icon] : undefined
  const isz = Math.round(fs * 1.1)
  // the left padding as set (one value for both sides, or each side on its own)
  const pads = s.pad ?? [s.paddingY ?? 13, s.paddingX ?? 16, s.paddingY ?? 13, s.paddingX ?? 16]
  const padL = pads[3]
  const label = INPUT_TYPES.find((t) => t.value === type)?.label
  const placeholder = p.placeholder ?? (p.inputType === 'custom' ? '' : label) ?? ''
  const hasBorder = s.borderType ? s.borderType !== 'none' : true
  const style: CSSProperties = {
    ['--ph' as string]: cssColor(s.placeholderColor),
    font: 'inherit',
    fontSize: fs,
    lineHeight: lineHeight(s, 1.4),
    textAlign: s.textAlign,
    color: cssColor(s.color) ?? 'var(--c-ink)',
    background: cssColor(s.background) ?? 'var(--c-bg)',
    // four sides, never the "padding" shorthand: when the shorthand changes the browser resets the left side,
    // and the room kept for an icon (or the phone flag) would be lost while you adjust the padding
    paddingTop: pads[0],
    paddingRight: pads[1],
    paddingBottom: pads[2],
    // an icon sits in the left padding; the text starts after it, so both follow the padding you set
    paddingLeft: Icon ? padL + isz + 10 : pads[3],
    minHeight: 48,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: radius(s) ?? (pill ? '999px' : 'var(--r)'),
    border: hasBorder ? undefined : 0,
    // a field's edge must be easy to see (the page's hairline colour is too faint for something you type in)
    ...(s.borderType ? border({ ...s, borderColor: s.borderColor ?? FIELD_EDGE }) : { border: `1px solid ${FIELD_EDGE}` }),
    boxShadow: shadow(s.shadow),
    pointerEvents: editable ? 'none' : undefined,
    ...font(s),
  }
  const [country, setCountry] = useState<string | undefined>(undefined)
  const countries = useCountryOptions(type === 'country' && !editable)
  const domId = fieldDomId(node)
  if (type === 'phone') style.paddingLeft = padL + Math.round(fs * 1.35) + 22
  if (type === 'country') {
    // like V1, Country is a list to choose from, not a text field
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <style>{INPUT_CSS}</style>
        <select
          id={domId}
          className="sio-in"
          name="country"
          autoComplete="country-name"
          required={!p.optional}
          defaultValue=""
          tabIndex={editable ? -1 : undefined}
          aria-label="Country"
          style={{ ...style, appearance: 'none', paddingRight: 40, cursor: editable ? undefined : 'pointer', color: cssColor(s.placeholderColor) ?? 'color-mix(in srgb, var(--c-ink) 48%, transparent)' }}
          onChange={(e) => (e.currentTarget.style.color = (cssColor(s.color) ?? 'var(--c-ink)') as string)}
        >
          <option value="" disabled>
            {p.placeholder || 'Choose a country'}
          </option>
          {(countries ?? []).map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none', color: style.color as string }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{INPUT_CSS}</style>
      <div style={{ position: 'relative' }}>
        {type === 'phone' ? <PhoneCountry editable={editable} value={country} onChange={setCountry} fontSize={fs} left={padL} /> : null}
        {Icon && type !== 'phone' ? (
          <Icon
            size={isz}
            strokeWidth={2}
            aria-hidden
            style={{ position: 'absolute', left: padL, top: '50%', transform: 'translateY(-50%)', color: cssColor(s.placeholderColor) ?? 'var(--c-muted)', pointerEvents: 'none' }}
          />
        ) : null}
        <input
          id={domId}
          className="sio-in"
          name={type === 'custom' ? `custom_${node.id.slice(-6)}` : type}
          type={(type && HTML_TYPE[type]) ?? 'text'}
          autoComplete={type ? AUTOCOMPLETE[type] : undefined}
          placeholder={placeholder}
          aria-label={placeholder || 'Form input'}
          required={!!type && (type === 'email' || !p.optional)}
          readOnly={editable}
          tabIndex={editable ? -1 : undefined}
          style={style}
        />
      </div>
      {editable && !type ? <CanvasNote align={s.textAlign}>Choose an input type in the settings</CanvasNote> : null}
    </div>
  )
}

/** The default edge of a field: a light tint of the page's text colour, clear on light and dark sections. */
// the same default edge as every other element
const FIELD_EDGE = 'var(--c-edge, rgba(128,128,128,.75))'

/** V1's explanation of "Optional" for a field. */
const OPTIONAL_HINT = "Ticking this box means that the user isn't required to complete this field before sending the form"

/** A field inside a form: V1's short settings (the look comes from the form). Country has no placeholder or icon. */
function InFormFieldSettings() {
  const { node } = useInspector()
  const t = node.props.inputType
  const form = useFormOf(node.id)
  const [design, setDesign] = useState(false)
  if (design && form) return <FieldsDesign formId={form.id} kind="input" onBack={() => setDesign(false)} back={INPUT_TYPES.find((x) => x.value === t)?.label ?? 'Field'} />
  return (
    <>
      <G title={INPUT_TYPES.find((x) => x.value === t)?.label ?? 'Field'}>
        {t !== 'country' && <PText p="placeholder" label="Placeholder" stack placeholder={INPUT_TYPES.find((x) => x.value === t)?.label ?? ''} />}
        {t === 'country' && <PText p="placeholder" label="Placeholder" stack placeholder="Choose a country" />}
        {/* the email is what creates the contact, so it is always required */}
        {t !== 'email' && <OptionalRow hint={OPTIONAL_HINT} />}
        {t !== 'country' && t !== 'phone' && <IconPick p="icon" label="Icon selector" />}
      </G>
      {/* like V1: the look is shared by all the form's fields */}
      <EditDesignButton onClick={() => setDesign(true)} />
    </>
  )
}

function InputSettings() {
  const { node, setProps } = useInspector()
  const p = node.props
  const inForm = useEditor((st) => path(st.doc, node.id).some((n) => n.type === 'form'))
  if (inForm) return <InFormFieldSettings />
  return (
    <>
      <G title="Input" keys={['textAlign', 'placeholderColor']}>
        <Field label="Input type">
          <Select<FieldType>
            value={p.inputType}
            onChange={(v) => {
              // the placeholder is written in for you: the type's name, unless you had typed your own
              const was = INPUT_TYPES.find((x) => x.value === p.inputType)?.label
              const mine = p.placeholder && p.placeholder !== was
              const next = v === 'custom' || v === 'country' ? '' : (INPUT_TYPES.find((x) => x.value === v)?.label ?? '')
              setProps({ inputType: v, ...(mine ? {} : { placeholder: next }) }, false)
            }}
            options={INPUT_TYPES}
          />
        </Field>
        <PText p="placeholder" label="Placeholder" placeholder={INPUT_TYPES.find((t) => t.value === p.inputType)?.label ?? 'Type a placeholder'} />
        <AlignRow />
        <WideColor k="placeholderColor" label="Placeholder color" />
        {p.inputType !== 'email' && <OptionalRow hint={OPTIONAL_HINT} />}
        {!p.inputType && <InfoNote>Choose an input type so the answer is saved to the right contact field.</InfoNote>}
      </G>
      <G title="Typography" keys={['fontSize', 'lineHeight']}>
        <Num k="fontSize" label="Font size" min={10} max={40} fallback={16} />
        <LineHeight fallback={1.4} />
        <IconPick p="icon" label="Icon selector" />
      </G>
      <G title="Color" keys={['color', 'background']}>
        <WideColor k="color" label="Color" />
        <WideColor k="background" label="Background color" />
      </G>
      <SizePosition />
      <BorderGroup />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
    </>
  )
}
