import { useEffect, useState, type ReactNode } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, Palette, type LucideIcon } from 'lucide-react'
import { setProps, setState, useEditor } from '../store'
import { find, path } from '../tree'
import { resolveStyle } from '../responsive'
import type { Node } from '../types'
import { Segmented } from '../../ui/kit'
import { AlignRow, BorderGroup, Color, ColorButton, FontType, G, InspectorCtx, LineHeight, Num, PText, ShadowRow, Spacing, useInspector } from '../settings/kit'

/** The form an element sits in, if any. */
export function useFormOf(id: string): Node | undefined {
  return useEditor((st) => path(st.doc, id).find((n) => n.type === 'form' && n.id !== id))
}
function inForm(form: Node, type: string): Node[] {
  const out: Node[] = []
  const walk = (n: Node) => (n.type === type ? out.push(n) : n.children?.forEach(walk))
  form.children?.forEach(walk)
  return out
}

/**
 * "Edit design" at the bottom of a field's settings (V1), as a settings row that leads one level deeper
 * (icon, label, what it changes, chevron), not a box button.
 */
export function EditDesignButton({ onClick, hint = 'Shared by all fields in this form' }: { onClick: () => void; hint?: string }) {
  return <NavRow icon={Palette} label="Edit design" hint={hint} onClick={onClick} />
}

/** A settings row that leads one level deeper (icon, label, a quiet line, chevron). */
export function NavRow({ icon: Icon, label, hint, onClick }: { icon: LucideIcon; label: string; hint?: string; onClick: () => void }) {
  return (
    <div className="px-2 py-2">
      <button onClick={onClick} className="press group flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-[var(--fill-1)]">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-[var(--fill-1)] text-[var(--t2)] group-hover:bg-[var(--raised)] group-hover:shadow-[0_0_0_1px_var(--line)]">
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-[var(--t1)]">{label}</span>
          {hint && <span className="block truncate text-[12px] text-[var(--t3)]">{hint}</span>}
        </span>
        <ChevronRight size={15} className="flex-none text-[var(--t4)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--t2)]" />
      </button>
    </div>
  )
}

/**
 * What the form shows after a successful sign-up (V1's "Text after successful opt-in"). While this is open the form
 * on the page shows that message, so you see what you change.
 */
export function SuccessText({ onBack }: { onBack: () => void }) {
  const { node } = useInspector()
  const p = node.props
  useEffect(() => {
    setState({ successPreview: node.id })
    return () => setState({ successPreview: null })
  }, [node.id])
  return (
    <>
      <Head title="Text after successful opt-in" onBack={onBack} back="Actions" />
      <G title="Message">
        <PText p="successHeading" label="Heading text" stack placeholder="Welcome, (their first name)." />
        <p className="-mt-1 text-[11.5px] leading-[16px] text-[var(--t4)]">Leave it empty to greet people by the first name they typed.</p>
        <PText p="successText" label="Text after successful opt-in" stack multiline placeholder="Everything you need is on its way to your inbox." />
      </G>
      <G title="Colors">
        <SuccessColor id={node.id} k="successTextColor" value={p.successTextColor} label="Text color" auto={{ token: 'ink', label: '' }} />
        <SuccessColor id={node.id} k="successIconColor" value={p.successIconColor} label="Icon color" auto={{ token: 'primary', label: '' }} />
        <SuccessColor id={node.id} k="successBg" value={p.successBg} label="Background color" />
      </G>
    </>
  )
}
export const SuccessIcon = BadgeCheck

/** One colour of the thank-you (a component of its own, so its picker stays open while you change the colour). */
function SuccessColor({ id, k, value, label, auto }: { id: string; k: 'successTextColor' | 'successIconColor' | 'successBg'; value?: string; label: string; auto?: { token: string; label: string } }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="text-[12px] text-[var(--t2)]">{label}</span>
      <ColorButton value={value} onChange={(v) => setProps(id, { [k]: v }, false)} auto={auto} />
    </div>
  )
}

/** Back to the element's own settings, then the design's title. */
function Head({ title, onBack, back = 'Back' }: { title: string; onBack: () => void; back?: string }) {
  return (
    <div className="px-4 pb-1 pt-2">
      <button onClick={onBack} className="press -ml-1 flex h-7 items-center gap-1 rounded-[6px] pl-0.5 pr-2 text-[12px] font-medium text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]">
        <ChevronLeft size={14} /> {back}
      </button>
      <div className="mt-1 text-[14px] font-semibold text-[var(--t1)]">{title}</div>
    </div>
  )
}

/** Style / Typography tabs, like V1's design panels. */
export function DesignTabs({ style, typography }: { style: ReactNode; typography: ReactNode }) {
  const [tab, setTab] = useState<'style' | 'typography'>('style')
  return (
    <>
      <div className="px-4 pb-1 pt-2">
        <Segmented
          full
          value={tab}
          onChange={setTab}
          options={[
            { value: 'style', label: 'Style' },
            { value: 'typography', label: 'Typography' },
          ]}
        />
      </div>
      {tab === 'style' ? style : typography}
    </>
  )
}

/**
 * The design every field of a form shares (V1's "Fields" panel): one change restyles all of them at once.
 * Fields (inputs) get Style and Typography; checkboxes get their text and colour.
 */
export function FieldsDesign({ formId, kind, onBack, back }: { formId: string; kind: 'input' | 'checkbox'; onBack: () => void; back?: string }) {
  const { device } = useInspector()
  const form = useEditor((st) => find(st.doc, formId))
  const smart = useEditor((st) => st.doc.smartResponsive)
  const all = form ? inForm(form, kind) : []
  const first = all[0]
  if (!first) return null
  const ctx = { node: first, device, r: resolveStyle(first, device, smart), targets: all.map((n) => n.id) }
  return (
    <InspectorCtx.Provider value={ctx}>
      <Head title={kind === 'input' ? 'Fields design' : 'Checkboxes design'} onBack={onBack} back={back} />
      {kind === 'input' ? (
        <DesignTabs
          style={
            <>
              <div className="border-b border-[var(--line)] px-4 py-3">
                <Spacing kind="padding" />
              </div>
              <BorderGroup />
              <G title="Colors" keys={['background', 'color', 'placeholderColor']}>
                <Color k="background" label="Background color" />
                <Color k="color" label="Text color" />
                <Color k="placeholderColor" label="Placeholder color" />
              </G>
              <G title="Shadow" keys={['shadow']}>
                <ShadowRow />
              </G>
            </>
          }
          typography={
            <G title="Typography" keys={['fontSize', 'lineHeight', 'fontFamily', 'textAlign']}>
              <Num k="fontSize" label="Font size" min={10} max={40} fallback={16} />
              <LineHeight fallback={1.4} />
              <FontType />
              <AlignRow />
            </G>
          }
        />
      ) : (
        <>
          <G title="Typography" keys={['fontSize', 'lineHeight', 'fontFamily', 'textAlign']}>
            <Num k="fontSize" label="Font size" min={10} max={40} fallback={15} />
            <LineHeight fallback={1.45} />
            <FontType />
            <AlignRow />
          </G>
          <G title="Color" keys={['color']}>
            <Color k="color" label="Text color" />
          </G>
        </>
      )}
    </InspectorCtx.Provider>
  )
}
