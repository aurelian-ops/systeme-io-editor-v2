import { useState } from 'react'
import {
  Trash2,
  AtSign,
  Building2,
  ChevronDown,
  ChevronLeft,
  Earth,
  GripVertical,
  Hash,
  House,
  Link2,
  Mail,
  MapPin,
  Minus,
  Percent,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Signpost,
  SquareCheck,
  TextCursorInput,
  Type,
  UserRound,
  UserRoundPen,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { el } from '../blocks'
import { askDelete, setState, update, useEditor } from '../store'
import { find } from '../tree'
import type { FieldType, Node } from '../types'
import { INPUT_TYPES } from '../elements/input'
import { Toggle, cx } from '../../ui/kit'

const FIELD_ICON: Record<FieldType, LucideIcon> = {
  email: AtSign,
  first_name: UserRound,
  last_name: UserRoundPen,
  phone: Phone,
  country: Earth,
  city: MapPin,
  street: Signpost,
  postcode: Mail,
  state: MapPin,
  company: Building2,
  website: Link2,
  neighborhood: House,
  street_number: Hash,
  tax_number: Percent,
  custom: TextCursorInput,
}

/** V1's "Add new field" groups (email is always in a form, so it is not listed). */
const GROUPS: { type: FieldType; label: string }[][] = [
  [
    { type: 'first_name', label: 'First name' },
    { type: 'last_name', label: 'Last name' },
  ],
  [
    { type: 'phone', label: 'Phone number' },
    { type: 'company', label: 'Company name' },
    { type: 'country', label: 'Country' },
  ],
  [
    { type: 'state', label: 'State/Province' },
    { type: 'city', label: 'City' },
    { type: 'neighborhood', label: 'Neighborhood' },
    { type: 'street', label: 'Street address' },
    { type: 'street_number', label: 'Street number' },
    { type: 'postcode', label: 'Postal code' },
    { type: 'tax_number', label: 'Tax number' },
  ],
]

function describe(n: Node): { icon: LucideIcon; label: string } {
  if (n.type === 'input') {
    const t = n.props.inputType ?? 'custom'
    return {
      icon: FIELD_ICON[t] ?? TextCursorInput,
      label: n.props.placeholder || INPUT_TYPES.find((x) => x.value === t)?.label || 'Field',
    }
  }
  if (n.type === 'checkbox') return { icon: SquareCheck, label: 'Checkbox' }
  if (n.type === 'recaptcha') return { icon: ShieldCheck, label: 'reCAPTCHA' }
  if (n.type === 'button')
    return {
      icon: Send,
      label: n.props.action === 'submit' ? 'Submit button' : 'Button',
    }
  if (n.type === 'text') return { icon: Type, label: 'Note' }
  return { icon: TextCursorInput, label: n.type }
}

/** Move one of the form's elements to another place in its list (one undo step). */
function reorder(formId: string, from: number, to: number) {
  update((d) => {
    const col = find(d, formId)?.children?.[0]
    if (!col?.children) return
    const [m] = col.children.splice(from, 1)
    // like V1, nothing goes below the submit button
    const btn = col.children.findIndex((c) => c.type === 'button')
    col.children.splice(m.type !== 'button' && btn >= 0 ? Math.min(to, btn) : to, 0, m)
  })
}

/** A new field goes after the last field, before the button (with the look of the fields already there). */
function removeLast(formId: string, match: (n: Node) => boolean) {
  update((d) => {
    const col = find(d, formId)?.children?.[0]
    if (!col?.children) return
    for (let i = col.children.length - 1; i >= 0; i--)
      if (match(col.children[i])) {
        col.children.splice(i, 1)
        return
      }
  })
}
function removeAll(formId: string, match: (n: Node) => boolean) {
  update((d) => {
    const col = find(d, formId)?.children?.[0]
    if (col?.children) col.children = col.children.filter((c) => !match(c))
  })
}

function addElement(formId: string, kind: FieldType | 'checkbox') {
  update((d) => {
    const col = find(d, formId)?.children?.[0]
    if (!col?.children) return
    const at = col.children.findIndex((c) => c.type === 'button')
    const like = col.children.find((c) => c.type === 'input')
    const label = INPUT_TYPES.find((x) => x.value === kind)?.label ?? ''
    const node =
      kind === 'checkbox'
        ? el(
            'checkbox',
            {
              text: 'Yes, I agree to receive emails from you',
              optional: false,
              message: '',
            },
            {},
          )
        : el(
            'input',
            {
              inputType: kind,
              placeholder: kind === 'custom' || kind === 'country' ? '' : label,
            },
            like
              ? { ...like.style.desktop }
              : {
                  borderType: 'full',
                  borderWidth: 1,
                  paddingY: 14,
                  paddingX: 16,
                },
          )
    col.children.splice(at < 0 ? col.children.length : at, 0, node)
  })
}

/**
 * The form's Elements tab, like V1: its fields in order (drag to reorder, click to edit one), the submit button,
 * and "Add new field" with the field types.
 */
export function FormElements({ formId }: { formId: string }) {
  const form = useEditor((s) => find(s.doc, formId))
  const items = form?.children?.[0]?.children ?? []
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  if (adding) return <AddFields formId={formId} items={items} onBack={() => setAdding(false)} />
  return (
    <div className="flex flex-col">
      <div className="-mx-2 flex flex-col">
        {items.map((n, i) => {
          const { icon: Icon, label } = describe(n)
          const fixed = n.type === 'button'
          return (
            <div
              key={n.id}
              draggable={!fixed}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDrag(i)
              }}
              onDragOver={(e) => {
                if (drag === null) return
                e.preventDefault()
                setOver(i)
              }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={() => {
                if (drag !== null && drag !== i) reorder(formId, drag, i)
                setDrag(null)
                setOver(null)
              }}
              onDragEnd={() => (setDrag(null), setOver(null))}
              className={cx('group flex h-11 items-center gap-2 rounded-[8px] pl-1 pr-2', over === i && drag !== i && 'shadow-[inset_0_2px_0_var(--brand)]', drag === i && 'opacity-40')}
            >
              <span className={cx('flex h-7 w-5 flex-none items-center justify-center text-[var(--t4)]', fixed ? 'invisible' : 'cursor-grab group-hover:text-[var(--t2)]')}>
                <GripVertical size={14} />
              </span>
              <button
                onClick={() => setState({ selectedId: n.id, editingId: null })}
                className="press flex min-w-0 flex-1 items-center gap-3 rounded-[8px] py-1 pr-1 text-left hover:bg-[var(--fill-1)]"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-[var(--fill-1)] text-[var(--t2)]">
                  <Icon size={16} />
                </span>
                <span className="truncate text-[13px] text-[var(--t1)]">{label}</span>
              </button>
              {/* like V1, a field can be removed right here (the email and the button always stay) */}
              {!fixed && !(n.type === 'input' && n.props.inputType === 'email') && (
                <button
                  aria-label={`Delete ${label}`}
                  data-delete-for={n.id}
                  onClick={(e) => askDelete(n.id, e.currentTarget)}
                  className="press flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-[var(--dng)] opacity-0 hover:bg-[var(--fill-1)] focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 h-px bg-[var(--line)]" />
      <button onClick={() => setAdding(true)} className="press -mx-2 mt-2 flex h-9 items-center justify-between rounded-[8px] px-2 text-[13px] text-[var(--t1)] hover:bg-[var(--fill-1)]">
        Add new field
        <Plus size={15} className="text-[var(--t3)]" />
      </button>
    </div>
  )
}

/** One field type in Add new field (its own component, so switches keep their state while the form changes). */
function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-11 items-center gap-3">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-[var(--fill-1)] text-[var(--t2)]">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--t1)]">{label}</span>
      {children}
    </div>
  )
}
function Counter({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Remove one"
        disabled={!value}
        onClick={onMinus}
        className="press flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--fill-1)] text-[var(--t2)] hover:bg-[var(--fill-2)] disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <span className="tnum w-6 text-center text-[13px] text-[var(--t1)]">{value}</span>
      <button aria-label="Add one" onClick={onPlus} className="press flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--fill-1)] text-[var(--t2)] hover:bg-[var(--fill-2)]">
        <Plus size={14} />
      </button>
    </div>
  )
}

/**
 * V1's "Add new field": a switch per field type (on = it is in the form, off = removed), a counter for checkboxes,
 * and custom fields. New fields go above the button and take the look of the fields already there.
 */
function AddFields({ formId, items, onBack }: { formId: string; items: Node[]; onBack: () => void }) {
  const has = (t: FieldType) => items.some((n) => n.type === 'input' && n.props.inputType === t)
  const count = (m: (n: Node) => boolean) => items.filter(m).length
  const isBox = (n: Node) => n.type === 'checkbox'
  const isCustom = (n: Node) => n.type === 'input' && n.props.inputType === 'custom'
  const [custom, setCustom] = useState(count(isCustom) > 0)
  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="press -ml-1 mb-2 flex h-7 items-center gap-1 self-start rounded-[6px] pl-0.5 pr-2 text-[12px] font-medium text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]"
      >
        <ChevronLeft size={14} /> Fields
      </button>
      <div className="mb-1 text-[14px] font-semibold text-[var(--t1)]">Add new field</div>
      {GROUPS.map((g, gi) => (
        <div key={gi} className={cx('flex flex-col py-1', gi > 0 && 'border-t border-[var(--line)]')}>
          {g.map((f) => (
            <Row key={f.type} icon={FIELD_ICON[f.type]} label={f.label}>
              <Toggle checked={has(f.type)} onChange={(on) => (on ? addElement(formId, f.type) : removeAll(formId, (n) => n.type === 'input' && n.props.inputType === f.type))} />
            </Row>
          ))}
        </div>
      ))}
      <div className="flex flex-col border-t border-[var(--line)] py-1">
        <Row icon={SquareCheck} label="Checkbox">
          <Counter value={count(isBox)} onMinus={() => removeLast(formId, isBox)} onPlus={() => addElement(formId, 'checkbox')} />
        </Row>
      </div>
      <div className="flex flex-col border-t border-[var(--line)] py-1">
        <button onClick={() => setCustom((c) => !c)} className="press flex h-11 items-center gap-3 text-left">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-[var(--fill-1)] text-[var(--t2)]">
            <Wrench size={16} />
          </span>
          <span className="flex-1 text-[13px] text-[var(--t1)]">Custom fields</span>
          <ChevronDown
            size={15}
            className="text-[var(--t3)]"
            style={{
              transform: custom ? 'rotate(180deg)' : undefined,
              transition: 'transform 160ms var(--ease-out)',
            }}
          />
        </button>
        {custom && (
          <Row icon={TextCursorInput} label="Custom field">
            <Counter value={count(isCustom)} onMinus={() => removeLast(formId, isCustom)} onPlus={() => addElement(formId, 'custom')} />
          </Row>
        )}
      </div>
    </div>
  )
}
