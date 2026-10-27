import { useEffect, useState, type ReactNode } from 'react'
import {
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartHorizontal,
  StretchVertical,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Code2,
  Copy,
  Link2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  X,
  Circle as CircleShape,
  Squircle,
  Square as SquareShape,
  CircleOff,
  MousePointerClick,
  Palette,
} from 'lucide-react'
import { duplicateNode, labelOf, moveNode, askDelete, setProps, setState, setStyle, update, useEditor, setColumnCount, MAX_COLUMNS } from '../store'
import { find, path, visiblePath } from '../tree'
import { FormElements } from './FormElements'
import { DesignTabs, FieldsDesign, NavRow, SuccessIcon, SuccessText, useFormOf } from './FieldsDesign'
import { contentWidth, fitColumns, resolveStyle } from '../responsive'
import { DEVICE_LABEL, DEVICES, type Device, type Node, type Style } from '../types'
import { Button, Field, IconButton, NumberField, Segmented, Select, TextField, cx } from '../../ui/kit'
import { REGISTRY } from '../elements'
import { FaqQuestions } from '../settings/FaqQuestions'
import { CodeModal } from '../elements/rawhtml'
import { EDGE } from '../theme'
import { elementDomId } from '../render/domIds'
import { InfoNote } from '../elements/input'
import { DateTimeField, TimeField } from '../settings/DatePicker'
import { CONTENT_WIDTHS } from '../render/PageView'
import { saveBlock } from '../blocksStore'
import { equalWidths } from '../canvas/ColumnResizer'
import { masterOf } from '../masters'
import {
  AlignRow,
  BorderGroup,
  Choice,
  Color,
  ColorButton,
  CopyId,
  CornerRadius,
  Flag,
  FontType,
  FilePick,
  G,
  HelpTip,
  IconPick,
  ImagePick,
  InspectorCtx,
  LineHeight,
  Num,
  PChoice,
  PFlag,
  PNum,
  PText,
  ShadowRow,
  SizePosition,
  Spacing,
  TypographyGroup,
  useInspector,
} from '../settings/kit'

export function Inspector({ id }: { id: string }) {
  const doc = useEditor((s) => s.doc)
  const view = useEditor((s) => s.view)
  const focusDevice = useEditor((s) => s.focusDevice)
  const node = find(doc, id)
  if (!node) return null
  const device: Device = view === 'all' ? focusDevice : view
  const trail = path(doc, id)
  const smart = doc.smartResponsive

  let cols: number | undefined
  if (node.type === 'row' && device !== 'desktop') {
    const n = node.children?.length ?? 1
    const gap = node.style.desktop.gap ?? 24
    const avail = trail[0] ? contentWidth(trail[0], device, smart) : 1000
    cols = smart ? fitColumns(n, avail, node.props.minCol ?? 280, device === 'mobile' ? Math.min(gap, 24) : gap * 0.7) : device === 'mobile' ? 1 : n
  }
  const r = resolveStyle(node, device, smart, { cols })
  const overrides = device === 'desktop' ? 0 : Object.keys(node.style[device] ?? {}).length
  const def = REGISTRY[node.type]
  const master = masterOf(doc, trail)
  // a field inside a form shows only its own settings, like V1 (no delay or visibility of its own)
  const inForm = trail.some((n) => n.type === 'form' && n.id !== node.id)
  const common = { delay: true, visibility: true, htmlId: true, ...def?.common, ...BUILTIN_COMMON[node.type], ...(inForm ? { delay: false, visibility: false } : {}) }

  return (
    <InspectorCtx.Provider value={{ node, device, r }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setState({ selectedId: null, editingId: null })} className="-ml-0.5 pl-1.5">
            <ChevronLeft size={14} />
            Back
          </Button>
          <div className="flex items-center">
            <IconButton tip="Move up" onClick={() => moveNode(id, -1)}>
              <ArrowUp size={15} />
            </IconButton>
            <IconButton tip="Move down" onClick={() => moveNode(id, 1)}>
              <ArrowDown size={15} />
            </IconButton>
            <IconButton tip="Duplicate" kbd="⌘D" onClick={() => duplicateNode(id)}>
              <Copy size={15} />
            </IconButton>
            <IconButton tip="Save as a block" onClick={() => saveBlock(node)}>
              <Save size={15} />
            </IconButton>
            <IconButton tip="Delete" kbd="⌫" data-delete-for={id} onClick={(e) => askDelete(id, e.currentTarget)} className="hover:!text-[var(--dng)]">
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="text-[16px] font-semibold leading-[22px]">{labelOf(node)}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-[var(--t4)]">
            {visiblePath(doc, id)
              .slice(0, -1)
              .map((t) => (
                <button key={t.id} className="press hover:text-[var(--t1)]" onClick={() => setState({ selectedId: t.id, editingId: null })}>
                  {labelOf(t)} ›
                </button>
              ))}
          </div>
        </div>

        {master && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-[8px] bg-[var(--master-tint)] px-2.5 py-2 text-[12px] leading-[17px] text-[var(--master)]">
            <Link2 size={14} className="mt-[1px] flex-none" />
            <span className="flex-1">
              Master block “{master.name}”. Changes here update it everywhere it is used.
              <button
                className="press ml-1 font-medium underline decoration-[var(--master)]/40 underline-offset-2"
                onClick={() =>
                  update((d) => {
                    for (const n of path(d, id)) if (n.props.masterId) delete n.props.masterId
                  })
                }
              >
                Detach
              </button>
            </span>
          </div>
        )}
        {device !== 'desktop' && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-[8px] bg-[var(--brand-tint)] px-2.5 py-2 text-[12px] leading-[17px] text-[var(--brand-ink)]">
            {device === 'tablet' ? <Tablet size={14} className="mt-[1px] flex-none" /> : <Smartphone size={14} className="mt-[1px] flex-none" />}
            <span className="flex-1">
              Changes here apply to {device === 'tablet' ? 'tablet and mobile' : 'mobile only'}. Desktop stays as it is.
              {overrides > 0 && (
                <button
                  className="press ml-1 font-medium underline decoration-[var(--brand)]/40 underline-offset-2"
                  onClick={() =>
                    update((d) => {
                      const n = find(d, id)
                      if (n) delete n.style[device]
                    })
                  }
                >
                  Reset {overrides} {overrides === 1 ? 'change' : 'changes'}
                </button>
              )}
            </span>
          </div>
        )}

        <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto pb-16">
          {def ? def.settings() : <Builtin node={node} />}
          {common.delay && (
            <G title="Delay before displaying item" keys={['delay']}>
              <Num k="delay" label="Delay" max={60} unit="s" fallback={0} />
            </G>
          )}
          {common.visibility && <Visibility node={node} />}
          {node.type !== 'spacer' && <MotionGroup node={node} />}
          {common.htmlId && (
            <G title="(Advanced) HTML attributes" defaultOpen={false}>
              <CopyId id={elementDomId(node)} />
            </G>
          )}
        </div>
      </div>
    </InspectorCtx.Provider>
  )
}

/** How this piece comes in on the live page (the AI sets one; you can change or remove it here). */
function MotionGroup({ node }: { node: Node }) {
  const m = node.props.motion
  const value = m?.custom?.keyframes ? 'custom' : m?.stagger ? 'stagger' : (m?.enter ?? 'none')
  const set = (patch: Partial<NonNullable<Node['props']['motion']>> | null) =>
    update((d) => {
      const n = find(d, node.id)
      if (!n) return
      if (patch === null) delete n.props.motion
      else n.props.motion = { ...n.props.motion, ...patch }
    })
  return (
    <G title="Animation" defaultOpen={!!m}>
      <Field label="Comes in">
        <Select
          value={value}
          onChange={(v) => {
            if (v === 'none') return set(null)
            if (v === 'stagger') return set({ enter: 'fade-up', stagger: true, custom: undefined })
            set({ enter: v as NonNullable<Node['props']['motion']>['enter'], stagger: false, custom: undefined })
          }}
          options={[
            { value: 'none', label: 'No animation' },
            { value: 'fade', label: 'Fade in' },
            { value: 'fade-up', label: 'Rise in' },
            { value: 'zoom', label: 'Zoom in' },
            { value: 'scale', label: 'Grow in' },
            { value: 'clip', label: 'Reveal' },
            { value: 'stagger', label: 'Items one by one' },
            ...(value === 'custom' ? [{ value: 'custom', label: 'Custom (by the AI)' }] : []),
          ]}
        />
      </Field>
      {m && !m.custom && (
        <Field label="Speed">
          <Segmented
            size="sm"
            full
            value={m.speed ?? 'normal'}
            onChange={(v) => set({ speed: v })}
            options={[
              { value: 'quick', label: 'Quick' },
              { value: 'normal', label: 'Normal' },
              { value: 'slow', label: 'Slow' },
            ]}
          />
        </Field>
      )}
      {m?.scroll && (
        <Field label="On scroll">
          <Select
            value={m.scroll}
            onChange={(v) => set({ scroll: v === 'none' ? undefined : (v as NonNullable<Node['props']['motion']>['scroll']) })}
            options={[
              { value: 'none', label: 'Nothing' },
              { value: 'parallax', label: 'Parallax' },
              { value: 'sticky', label: 'Stays in view' },
              { value: 'marquee', label: 'Slides by' },
            ]}
          />
        </Field>
      )}
    </G>
  )
}

const BUILTIN_COMMON: Partial<Record<Node['type'], { delay?: boolean; visibility?: boolean; htmlId?: boolean }>> = {
  column: { delay: false },
  spacer: { delay: false },
}

function Visibility({ node }: { node: Node }) {
  const smart = useEditor((s) => s.doc.smartResponsive)
  return (
    <G title="Item visible on">
      <div className="grid grid-cols-3 gap-1.5">
        {DEVICES.map((d) => {
          const visible = !resolveStyle(node, d, smart).style.hidden
          const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone
          return (
            <button
              key={d}
              onClick={() => setStyle(node.id, 'hidden', visible ? true : d === 'desktop' ? undefined : false, d)}
              className={cx(
                'press flex h-14 flex-col items-center justify-center gap-1 rounded-[8px] text-[12px] font-medium',
                visible ? 'bg-[var(--raised)] text-[var(--t1)] shadow-[var(--shadow-card)]' : 'bg-[var(--fill-1)] text-[var(--t4)] line-through',
              )}
            >
              <Icon size={15} />
              {DEVICE_LABEL[d]}
            </button>
          )
        })}
      </div>
    </G>
  )
}

/* ---------------- Built-in element settings, in V1 order ---------------- */

function Builtin({ node }: { node: Node }) {
  switch (node.type) {
    case 'section':
      return <SectionSettings />
    case 'row':
      return <RowSettings />
    case 'column':
      return <ColumnSettings />
    case 'headline':
      return (
        <>
          <TypographyGroup />
          <G title="Color" keys={['color', 'textBackground']}>
            <Color k="color" label="Text color" />
            <Color k="textBackground" label="Text background color" />
          </G>
          <SizePosition>
            <AlignRow />
          </SizePosition>
        </>
      )
    case 'text':
    case 'eyebrow':
      return (
        <>
          <TypographyGroup sizeMax={64} />
          <G title="Color" keys={['color', 'textBackground']}>
            <Color k="color" label="Text color" />
            <Color k="textBackground" label="Text background color" />
          </G>
          <SizePosition>
            <AlignRow />
          </SizePosition>
        </>
      )
    case 'list':
      return <ListSettings />
    case 'button':
      return <ButtonSettings />
    case 'image':
      return <ImageSettings />
    case 'video':
      return <VideoSettings />
    case 'form':
      return <FormSettings />
    case 'faq':
      return <FaqSettings />
    case 'countdown':
      return <CountdownSettings />
    case 'divider':
      return (
        <>
          <G title="Border" keys={['borderStyle', 'borderColor', 'borderWidth', 'radius', 'radii']}>
            <Choice
              k="borderStyle"
              label="Style"
              seg
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'dashed', label: 'Dashed' },
              ]}
            />
            <Color k="borderColor" label="Color" auto={{ hex: EDGE, token: 'ink', label: '' }} />
            <Num k="borderWidth" label="Width" min={1} max={20} fallback={1} />
            <CornerRadius />
          </G>
          <SizePosition pad={false} />
        </>
      )
    case 'spacer':
      return (
        <G title="Size" keys={['height']}>
          <Num k="height" label="Height" max={300} fallback={40} />
        </G>
      )
    case 'quote':
      return (
        <>
          <G title="Testimonial">
            <PText p="text" label="Quote" multiline />
            <PText p="author" label="Name" />
            <PText p="role" label="Detail" />
            <ImagePick p="src" label="Photo" />
          </G>
          <TypographyGroup lh={false} spacing={false} />
          <G title="Color" keys={['color', 'background']}>
            <Color k="color" label="Text color" />
            <Color k="background" label="Background color" />
          </G>
          <BorderGroup />
          <G title="Box" keys={['shadow', 'paddingY', 'paddingX', 'pad']}>
            <ShadowRow />
            <Spacing kind="padding" />
          </G>
        </>
      )
    case 'price':
      return <PriceSettings />
    case 'stat':
      return (
        <>
          <G title="Number">
            <PText p="value" label="Value" />
            <PText p="label" label="Label" />
          </G>
          <TypographyGroup lh={false} spacing={false} />
          <G title="Color" keys={['color']}>
            <Color k="color" label="Color" />
          </G>
          <SizePosition pad={false}>
            <AlignRow />
          </SizePosition>
        </>
      )
    case 'logos':
      return (
        <>
          <G title="Logos">
            <ListEditor items={node.props.items ?? []} onChange={(items) => setProps(node.id, { items })} />
          </G>
          <TypographyGroup lh={false} spacing={false} />
          <G title="Color" keys={['color']}>
            <Color k="color" label="Color" />
          </G>
        </>
      )
    default:
      return null
  }
}

/** Same groups and order as V1's Section settings. */
function SectionSettings() {
  const { node, s, set, state, reset } = useInspector()
  return (
    <>
      <G title="Size and position" keys={['paddingY', 'paddingX', 'pad', 'marginY', 'marginX', 'mar']}>
        <Spacing kind="padding" />
        <Spacing kind="margin" />
      </G>
      <G title="Background" keys={['background', 'contentBackground', 'backgroundImage', 'overlay', 'radius', 'radii']}>
        <Color k="background" label="Background color" />
        <Color k="contentBackground" label="Content background color" />
        <ImagePick k="backgroundImage" label="Background image" />
        {s.backgroundImage && <Color k="overlay" label="Image overlay" />}
        {/* new in V2: with side margins and a background, a section becomes a rounded card on the page */}
        <CornerRadius max={80} />
      </G>
      <G title="Size and position" keys={['maxWidth']}>
        <Field label="Content width" stack state={state('maxWidth')} onReset={() => reset('maxWidth')}>
          <Select
            value={CONTENT_WIDTHS.reduce((a, b) => (Math.abs(b.value - (s.maxWidth ?? 1120)) < Math.abs(a.value - (s.maxWidth ?? 1120)) ? b : a)).value}
            onChange={(v) => set('maxWidth', v)}
            options={CONTENT_WIDTHS}
          />
        </Field>
      </G>
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <G title="Sticky">
        <PFlag p="sticky" label="Do you want this to always be visible? (sticky)" />
        {node.props.sticky && (
          <PChoice
            p="stickyPosition"
            label="Position"
            seg
            options={[
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
            ]}
          />
        )}
      </G>
    </>
  )
}

function RowSettings() {
  const { node, s, set, device } = useInspector()
  const n = node.children?.length ?? 1
  return (
    <>
      <G title="Columns" keys={['columns', 'gap', 'vAlign']}>
        {/* one Row for every layout: 1 to 6 columns, changeable any time (removing never loses content) */}
        <Field label="Columns">
          <NumberField value={n} onChange={(v) => setColumnCount(node.id, v)} min={1} max={MAX_COLUMNS} />
        </Field>
        {/* everything below acts between columns, so a one-column Row doesn't show it */}
        {n > 1 && (
          <>
            {/* how many columns sit side by side before the rest wrap (per device: e.g. 2 per line on tablet) */}
            <Field label="Per line">
              <NumberField value={s.columns ?? n} onChange={(v) => set('columns', Math.max(1, Math.min(n, Math.round(v))))} min={1} max={n} />
            </Field>
            <ColumnWidths n={n} />
            <Num k="gap" label="Gap" max={120} fallback={20} />
            <Choice
              k="vAlign"
              label="Align"
              seg
              options={[
                { value: 'start', label: 'Top', icon: <AlignStartHorizontal size={15} /> },
                { value: 'center', label: 'Middle', icon: <AlignCenterHorizontal size={15} /> },
                { value: 'end', label: 'Bottom', icon: <AlignEndHorizontal size={15} /> },
                // cards in the columns end at the same height, however long their text
                { value: 'stretch', label: 'Stretch', icon: <StretchVertical size={15} /> },
              ]}
            />
            {/* only matters on smaller screens: one value shared by tablet and mobile */}
            {device !== 'desktop' && (
              <Field label="Stack below" hint="On tablet and mobile, columns wrap when they would get narrower than this">
                <NumberField value={node.props.minCol ?? 280} onChange={(v) => setProps(node.id, { minCol: v })} min={120} max={600} unit="px" />
              </Field>
            )}
          </>
        )}
      </G>
      <SizePosition />
      <G title="Background" keys={['background', 'backgroundImage']}>
        <Color k="background" label="Color" />
        <ImagePick k="backgroundImage" label="Background image" />
      </G>
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <BorderGroup />
      {n > 1 && (
        <G title="Mobile" keys={['noStack', 'reverse']}>
          <Flag k="noStack" label="Disable vertically stacking columns on mobile" />
          <Flag k="reverse" label="Reverse row columns on mobile" />
        </G>
      )}
    </>
  )
}

const WIDTH_PRESETS: Record<number, number[][]> = {
  2: [
    [6, 6],
    [4, 8],
    [8, 4],
    [3, 9],
    [9, 3],
  ],
  3: [
    [4, 4, 4],
    [6, 3, 3],
    [3, 6, 3],
    [3, 3, 6],
  ],
  4: [
    [3, 3, 3, 3],
    [6, 2, 2, 2],
    [2, 2, 2, 6],
  ],
}

/** Click a split, or drag the line between columns on the page. */
function ColumnWidths({ n }: { n: number }) {
  const { s, set, state, reset } = useInspector()
  const cur = s.colWidths?.length === n ? s.colWidths : equalWidths(n)
  const presets = WIDTH_PRESETS[n] ?? [equalWidths(n)]
  return (
    <Field label="Widths" stack state={state('colWidths')} onReset={() => reset('colWidths')}>
      <div className="w-full">
        <div className="grid w-full grid-cols-5 gap-1.5">
          {presets.map((p) => {
            const on = p.join() === cur.join()
            return (
              <button
                key={p.join()}
                title={p.map((x) => `${Math.round((x / 12) * 100)}%`).join(' / ')}
                onClick={() => set('colWidths', p)}
                className={cx(
                  'press flex h-7 gap-[2px] rounded-[6px] p-1',
                  on ? 'bg-[var(--brand-tint)] shadow-[0_0_0_1.5px_var(--brand)]' : 'bg-[var(--fill-1)] hover:bg-[var(--fill-2)]',
                )}
              >
                {p.map((x, i) => (
                  <span key={i} className={cx('h-full rounded-[2px]', on ? 'bg-[var(--brand)]' : 'bg-[var(--t4)]')} style={{ flex: x }} />
                ))}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--t4)]">Or drag the line between columns on the page.</p>
      </div>
    </Field>
  )
}

function ColumnSettings() {
  return (
    <>
      <G title="Box" keys={['background', 'backgroundImage', 'gap', 'vAlign']}>
        <Color k="background" label="Background color" />
        <ImagePick k="backgroundImage" label="Background image" />
        <Num k="gap" label="Spacing" max={80} fallback={16} />
        <Choice
          k="vAlign"
          label="Vertical"
          seg
          options={[
            { value: 'start', label: 'Top' },
            { value: 'center', label: 'Middle' },
            { value: 'end', label: 'Bottom' },
          ]}
        />
        <AlignRow label="Content align" />
      </G>
      <SizePosition />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <BorderGroup />
    </>
  )
}

function ListSettings() {
  // like V1, the bullets are typed straight on the page (Enter adds one, Backspace at the start joins it up)
  const { node } = useInspector()
  const numbered = node.props.marker === 'number'
  return (
    <>
      <G title="Typography" keys={['fontFamily', 'fontSize', 'lineHeight', 'gap', 'iconSize', 'markerGap', 'markerShape', 'textAlign']}>
        <FontType />
        <Num k="fontSize" label="Font size" min={10} max={48} fallback={17} />
        <LineHeight />
        <Num k="gap" label="Vertical spacing" max={60} fallback={10} />
        {/* new in V2: numbered lists (1, 2, 3…) besides icon bullets */}
        <PChoice
          p="marker"
          label="List style"
          seg
          options={[
            { value: 'icon', label: 'Bullets' },
            { value: 'number', label: 'Numbers' },
          ]}
        />
        <Num k="iconSize" label={numbered ? 'Number size' : 'Icon size'} min={8} max={64} fallback={18} />
        <Num k="markerGap" label="Text indent" max={60} fallback={12} ceiling={Infinity} />
        <Choice
          k="markerShape"
          label="Shape"
          seg
          options={[
            { value: 'none', label: 'None', icon: <CircleOff size={14} />, tip: 'No shape' },
            { value: 'circle', label: 'Circle', icon: <CircleShape size={14} />, tip: 'Circle' },
            { value: 'rounded', label: 'Rounded', icon: <Squircle size={14} />, tip: 'Rounded square' },
            { value: 'square', label: 'Square', icon: <SquareShape size={14} />, tip: 'Square' },
          ]}
        />
        {!numbered && <IconPick p="icon" label="Icon selector" allowNone={false} />}
        {/* new in V2: the whole list moves as one block (V1 needed margins for this) */}
        <AlignRow />
      </G>
      <G title="Color" keys={['background', 'iconColor', 'markerBg', 'color']}>
        <Color k="color" label="Text color" />
        <Color k="background" label="Background color" />
        <Color k="iconColor" label={numbered ? 'Number color' : 'Icon color'} auto={{ token: 'primary', label: 'Brand' }} />
        {(node.style.desktop.markerShape ?? 'none') !== 'none' && <Color k="markerBg" label={numbered ? 'Number background' : 'Icon background'} auto={{ token: 'primary', label: 'Soft brand', mix: 14 }} />}
      </G>
      <SizePosition />
    </>
  )
}

function ButtonSettings() {
  const { node, s, set } = useInspector()
  const p = node.props
  const popups = useEditor((st) => st.doc.popups) ?? []
  const action = p.action ?? 'submit'
  const form = useFormOf(node.id)
  // a form's submit button (V1): its look in Style / Typography tabs; what happens on submit lives in the form's Actions
  if (form)
    return (
      <>
      <G title="Button">
        <PText p="text" label="Button text" />
        <PText p="subtext" label="Subtext" placeholder="Optional second line" />
      </G>
      <DesignTabs
        style={
          <>
            <div className="border-b border-[var(--line)] px-4 py-3">
              <Spacing kind="padding" />
            </div>
            <BorderGroup />
            <G title="Colors" keys={['background', 'color', 'subtextColor']}>
              <Color k="background" label="Background color" />
              <Color k="color" label="Text color" />
              <Color k="subtextColor" label="Subtext color" />
            </G>
            <G title="Shadow" keys={['shadow']}>
              <ShadowRow />
            </G>
            <HoverGroup />
          </>
        }
        typography={
          <>
            <G title="Text" keys={['fontSize', 'lineHeight', 'fontFamily', 'subtextSize']}>
              <Num k="fontSize" label="Font size" min={10} max={48} fallback={16} />
              <LineHeight fallback={1.2} />
              <FontType />
              {p.subtext && <Num k="subtextSize" label="Subtext font size" min={8} max={32} fallback={12} />}
              <IconPick p="icon" label="Icon selector (before text)" />
              <IconPick p="iconAfter" label="Icon selector (after text)" />
            </G>
            <G title="Layout" keys={['textAlign', 'fullWidth']}>
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
            </G>
          </>
        }
      />
      </>
    )
  return (
    <>
      <G title="Action">
        <PChoice
          p="action"
          label="Action when button clicked"
          stack
          options={[
            { value: 'submit', label: 'Submit form' },
            { value: 'popup', label: 'Show popup' },
            { value: 'url', label: 'Open URL' },
            { value: 'next', label: 'Next step URL' },
            { value: 'download', label: 'Download file' },
          ]}
        />
        {action === 'submit' && (
          <>
            <PChoice
              p="redirect"
              label="Redirect users after contact registration?"
              stack
              options={[
                { value: 'next', label: 'To the next step' },
                { value: 'url', label: 'To a custom URL' },
                { value: 'none', label: 'No redirection' },
              ]}
            />
            {p.redirect === 'url' && <PText p="redirectUrl" label="URL" placeholder="https://" />}
            <PFlag p="doubleOptIn" label="Enable double opt-in on this form" />
            <Automations />
          </>
        )}
        {action === 'popup' && (
          <Field label="Popup" stack>
            <Select
              value={p.popupId ?? ''}
              onChange={(v) => setProps(node.id, { popupId: v }, false)}
              options={[{ value: '', label: popups.length ? 'Select a popup' : 'No popups yet. Create one in Popups' }, ...popups.map((x) => ({ value: x.id, label: x.name }))]}
            />
          </Field>
        )}
        {action === 'url' && (
          <>
            <PText p="url" label="URL" placeholder="https://" />
            <PFlag p="newWindow" label="Open in a new window" />
          </>
        )}
        {action === 'download' && <PText p="fileName" label="File URL" placeholder="https://…/guide.pdf" />}
      </G>
      <G title="Layout" keys={['textAlign', 'fullWidth']}>
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
        <PChoice
          p="variant"
          label="Style"
          seg
          options={[
            { value: 'primary', label: 'Filled' },
            { value: 'secondary', label: 'Outline' },
          ]}
        />
      </G>
      <SizePosition />
      <G title="Typography" keys={['fontSize', 'lineHeight', 'fontFamily', 'subtextSize']}>
        <PText p="text" label="Button text" />
        <Num k="fontSize" label="Font size" min={10} max={48} fallback={16} />
        <LineHeight fallback={1.2} />
        <FontType />
        <PText p="subtext" label="Subtext" placeholder="Optional second line" />
        {p.subtext && <Num k="subtextSize" label="Subtext font size" min={8} max={32} fallback={12} />}
        <IconPick p="icon" label="Icon selector (before text)" />
        <IconPick p="iconAfter" label="Icon selector (after text)" />
      </G>
      <G title="Color" keys={['background', 'color', 'subtextColor']}>
        <Color k="background" label="Background color" />
        <Color k="color" label="Text color" />
        {p.subtext && <Color k="subtextColor" label="Subtext color" />}
      </G>
      <BorderGroup />
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <HoverGroup />
    </>
  )
}

function HoverGroup() {
  const { s, set } = useInspector()
  const h = s.hover ?? {}
  const put = (patch: Partial<NonNullable<Style['hover']>>) => set('hover', { ...h, ...patch })
  return (
    <G title="Hover effect" keys={['hover']}>
      <Field label="Text color">
        <div className="flex w-full justify-end">
          <ColorButton value={h.color} onChange={(v) => put({ color: v })} />
        </div>
      </Field>
      <Field label="Background">
        <div className="flex w-full justify-end">
          <ColorButton value={h.background} onChange={(v) => put({ background: v })} />
        </div>
      </Field>
      <Field label="Subtext color">
        <div className="flex w-full justify-end">
          <ColorButton value={h.subtextColor} onChange={(v) => put({ subtextColor: v })} />
        </div>
      </Field>
      <Field label="Movement">
        <NumberField value={h.movement ?? 0} onChange={(v) => put({ movement: v })} max={12} unit="px" />
      </Field>
      <p className="text-[11px] text-[var(--t4)]">Shown in Preview and on the published page.</p>
    </G>
  )
}


import { Automations } from './Automations'
export { Automations }

function ImageSettings() {
  const { node, s, set, device } = useInspector()
  const fill = s.fullWidth !== false && s.maxWidth === undefined
  const room = useRoom(node.id, device)
  return (
    <>
      <G title="Image">
        <ImagePick p="src" />
        <PChoice
          p="action"
          label="Action when image clicked"
          stack
          options={[
            { value: 'none', label: 'None' },
            { value: 'url', label: 'Open URL' },
            { value: 'popup', label: 'Show popup' },
          ]}
        />
        {node.props.action === 'url' && <PText p="url" label="URL" placeholder="https://" />}
        <PText p="alt" label="Alt text" placeholder="Describe the image" />
        <Field label="Shape">
          <Select
            value={node.props.aspect === -1 ? -1 : [16 / 9, 1.5, 4 / 3, 1, 0.8, 0.5625].reduce((a, b) => (Math.abs(b - (node.props.aspect ?? 1.5)) < Math.abs(a - (node.props.aspect ?? 1.5)) ? b : a))}
            onChange={(v) => setProps(node.id, { aspect: v }, false)}
            options={[
              { value: 16 / 9, label: 'Wide 16:9' },
              { value: 1.5, label: 'Landscape 3:2' },
              { value: 4 / 3, label: 'Classic 4:3' },
              { value: 1, label: 'Square' },
              { value: 0.8, label: 'Portrait 4:5' },
              { value: 0.5625, label: 'Story 9:16' },
              { value: -1, label: 'Fill the space' },
            ]}
          />
        </Field>
        <Field label="Fill 100% width">
          <div className="flex w-full justify-end">
            <ToggleInline
              checked={fill}
              onChange={(v) => {
                // like V1, the size starts at the width it has now, so the image does not jump
                if (v) set('maxWidth', undefined)
                else set('maxWidth', room || 480)
              }}
            />
          </div>
        </Field>
        {!fill && <Num k="maxWidth" label="Image size" min={40} max={Math.max(room || 1600, s.maxWidth ?? 0)} fallback={480} />}
        <AlignRow />
        <Color k="overlay" label="Overlay color" />
      </G>
      <SizePosition pad={false} />
      <BorderGroup />
      <G title="Filters" keys={['blur']}>
        <Num k="blur" label="Blur" max={20} fallback={0} />
      </G>
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
    </>
  )
}

/** Width the element can take in its column (the slider's end, like V1), followed as the column changes. */
function useRoom(id: string, device: string) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.page-root[data-device="${device}"] [data-node="${id}"]`)
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.round(el.offsetWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [id, device])
  return w
}

function ToggleInline({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx('press relative h-[18px] w-[30px] rounded-full', checked ? 'bg-[var(--brand)]' : 'bg-[var(--fill-2)]')}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)]"
        style={{ left: checked ? 14 : 2, transition: 'left 200ms var(--ease-spring)' }}
      />
    </button>
  )
}

function VideoSettings() {
  const { node } = useInspector()
  const [code, setCode] = useState(false)
  // like V1: a direct link takes YouTube, Vimeo or a video file's address (older pages said youtube / vimeo)
  const t = node.props.videoType
  const type = t === 'upload' || t === 'embed' ? t : 'direct'
  const embed = node.props.html ?? ''
  return (
    <>
      <G title="Video">
        <Field label="Video type" stack>
          <Select
            value={type}
            onChange={(v) => setProps(node.id, { videoType: v }, false)}
            options={[
              { value: 'direct', label: 'Direct link' },
              { value: 'embed', label: 'Custom embed' },
              { value: 'upload', label: 'Upload file' },
            ]}
          />
        </Field>
        {type === 'upload' && <FilePick file="videoFile" name="videoName" label="Video file" kind="video" hint="MP4, WebM or MOV" />}
        {type === 'direct' && (
          <Field label="URL" stack>
            <TextField value={node.props.src} onChange={(v) => setProps(node.id, { src: toEmbed(v) })} placeholder="YouTube, Vimeo or .mp4 link" />
          </Field>
        )}
        {type === 'embed' && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--t3)]">
              {embed ? `${embed.split('\n').length} ${embed.split('\n').length === 1 ? 'line' : 'lines'} of code` : 'No code yet'}
              <HelpTip text="Paste the embed code from your video host (Wistia, Loom, Bunny, Vidyard…)." />
            </span>
            <Button size="sm" onClick={() => setCode(true)}>
              <Code2 size={13} /> Edit code
            </Button>
          </div>
        )}
        {type !== 'embed' && (
          <>
            <PFlag p="autoplay" label="Auto play (muted)" />
            <Field label="Controls">
              <Segmented
                full
                size="sm"
                value={node.props.controls === false ? 'off' : 'on'}
                onChange={(v) => setProps(node.id, { controls: v === 'on' }, false)}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </Field>
          </>
        )}
        {type === 'upload' && <ImagePick p="poster" label="Thumbnail image" />}
        <Field label="Aspect ratio">
          <Select
            value={[16 / 9, 4 / 3, 1, 9 / 16].reduce((a, b) => (Math.abs(b - (node.props.aspect ?? 16 / 9)) < Math.abs(a - (node.props.aspect ?? 16 / 9)) ? b : a))}
            onChange={(v) => setProps(node.id, { aspect: v }, false)}
            options={[
              { value: 16 / 9, label: '16:9' },
              { value: 4 / 3, label: '4:3' },
              { value: 1, label: '1:1' },
              { value: 9 / 16, label: '9:16' },
            ]}
          />
        </Field>
      </G>
      {code && <CodeModal value={embed} onClose={() => setCode(false)} onSave={(v) => (setProps(node.id, { html: v }, false), setCode(false))} />}
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
      <BorderGroup />
      <SizePosition pad={false} />
    </>
  )
}


function FormSettings() {
  const { node } = useInspector()
  const [designOf, setDesignOf] = useState<'input' | 'checkbox' | null>(null)
  const [success, setSuccess] = useState(false)
  const [tab, setTab] = useState<'elements' | 'design' | 'actions'>('elements')
  const p = node.props
  return (
    <>
      <div className="px-4 pb-1 pt-1">
        <Segmented
          full
          value={tab}
          onChange={setTab}
          options={[
            { value: 'elements', label: 'Elements' },
            { value: 'design', label: 'Design' },
            { value: 'actions', label: 'Actions' },
          ]}
        />
      </div>
      {tab === 'elements' && (
        <div className="px-4 py-3">
          <FormElements formId={node.id} />
        </div>
      )}
      {tab === 'design' && designOf && <FieldsDesign formId={node.id} kind={designOf} onBack={() => setDesignOf(null)} back="Design" />}
      {tab === 'design' && !designOf && (
        <>
          <G title="Layout" keys={['gap', 'background']}>
            <PChoice
              p="layout"
              label="Layout"
              seg
              options={[
                { value: 'stacked', label: 'Stacked' },
                { value: 'inline', label: 'Side by side' },
              ]}
            />
            <FormSpacing />
            <Color k="background" label="Background color" />
          </G>
          <BorderGroup />
          <G title="Shadow" keys={['shadow']}>
            <ShadowRow />
          </G>
          <SizePosition />
          {/* the fields' look lives in one place: the same panel a field's "Edit design" opens */}
          <NavRow icon={Palette} label="Fields design" hint="Padding, border, colours, typography" onClick={() => setDesignOf('input')} />
          {inFormOf(node, 'checkbox').length > 0 && <NavRow icon={Palette} label="Checkboxes design" hint="Text size, font, colour" onClick={() => setDesignOf('checkbox')} />}
          <G title="Button">
            <ButtonPosition />
          </G>
          {inFormOf(node, 'button')[0] && <NavRow icon={MousePointerClick} label="Button design" hint="Opens the submit button's settings" onClick={() => setState({ selectedId: inFormOf(node, 'button')[0].id, editingId: null })} />}
        </>
      )}
      {tab === 'actions' && success && <SuccessText onBack={() => setSuccess(false)} />}
      {tab === 'actions' && !success && (
        <>
        <G title="After submit">
          <PChoice
            p="redirect"
            label="Redirect users after contact registration?"
            stack
            options={[
              { value: 'next', label: 'To the next step' },
              { value: 'url', label: 'To a custom URL' },
              { value: 'none', label: 'No redirection' },
            ]}
          />
          {p.redirect === 'url' && <PText p="redirectUrl" label="URL" placeholder="https://" />}
          <PFlag p="doubleOptIn" label="Enable double opt-in on this form" />
          <Automations />
        </G>
        {/* like V1: the message shown after a sign-up (when the form does not send people elsewhere) */}
        <NavRow icon={SuccessIcon} label="Customize text after successful opt-in" hint={p.redirect !== 'none' ? 'Shown when "No redirection" is chosen' : (p.successHeading ?? 'Welcome, (their first name).')} onClick={() => setSuccess(true)} />
        </>
      )}
    </>
  )
}

/* ---------------- The form's own elements, edited together from the form ---------------- */

/** The elements of a type inside a form (its fields, its buttons). */
const inFormOf = (form: Node, type: string) => inForm(form, type)
function inForm(form: Node, type: string): Node[] {
  const out: Node[] = []
  const walk = (n: Node) => (n.type === type ? out.push(n) : n.children?.forEach(walk))
  form.children?.forEach(walk)
  return out
}
/** Change a style on all of them at once, in one undo step. */
function styleAll(form: Node, type: string, patch: Partial<Style>) {
  const ids = new Set(inForm(form, type).map((n) => n.id))
  update(
    (d) => {
      const walk = (n: Node) => {
        if (ids.has(n.id)) n.style.desktop = { ...n.style.desktop, ...patch }
        n.children?.forEach(walk)
      }
      d.sections.forEach(walk)
    },
    { coalesce: `${form.id}:all-${type}:${Object.keys(patch).join(',')}` },
  )
}
function FormSpacing() {
  const { node } = useInspector()
  const col = node.children?.[0]
  if (!col) return null
  return (
    <Field label="Row spacing">
      <NumberField value={col.style.desktop.gap ?? 10} onChange={(v) => setStyle(col.id, 'gap', v, 'desktop')} max={48} />
    </Field>
  )
}

function ButtonPosition() {
  const { node } = useInspector()
  const b = inForm(node, 'button')[0]
  if (!b) return null
  const v = b.style.desktop.fullWidth ? 'full' : (b.style.desktop.textAlign ?? 'left')
  return (
    <Field label="Button position" stack>
      <Segmented
        full
        size="sm"
        value={v}
        onChange={(x) => styleAll(node, 'button', x === 'full' ? { fullWidth: true, textAlign: undefined } : { fullWidth: undefined, textAlign: x as Style['textAlign'] })}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'full', label: 'Full' },
        ]}
      />
    </Field>
  )
}


function FaqSettings() {
  return (
    <>
      <G title="Questions">
        <FaqQuestions />
      </G>
      <G title="Layout" keys={['gap']}>
        <Num k="gap" label="Space between items" max={48} fallback={10} />
        <PFlag p="showIcons" label="Display dropdown icons" />
        <IconPick p="icon" label="Icon selector (opened state)" />
        <IconPick p="iconAfter" label="Icon selector (closed state)" />
      </G>
      <G title="Typography" keys={['fontFamily', 'fontSize']}>
        <FontType />
        <Num k="fontSize" label="Title font size" min={10} max={40} fallback={17} />
      </G>
      <G title="Color" keys={['color', 'background', 'iconColor']}>
        <Color k="color" label="Title color" />
        <Color k="background" label="Background color" />
        <Color k="iconColor" label="Icon color" />
      </G>
      {/* each question is a soft card; a border is optional (none by default) */}
      <BorderGroup />
      <G title="Size and position" keys={['marginY', 'marginX', 'mar', 'paddingY', 'paddingX', 'pad']}>
        <Spacing kind="margin" />
        <Spacing kind="padding" />
      </G>
      <G title="Shadow" keys={['shadow']}>
        <ShadowRow />
      </G>
    </>
  )
}

function CountdownSettings() {
  const { node } = useInspector()
  const p = node.props
  // older pages: "minutes after arrival" is a delay in minutes
  const type = p.countdownType === 'minutes' ? 'delay' : (p.countdownType ?? 'fixed')
  return (
    <>
      <G title="Countdown">
        <PChoice
          p="countdownType"
          label="Countdown type"
          stack
          options={[
            { value: 'fixed', label: 'Date and time' },
            { value: 'delay', label: 'Delay' },
            { value: 'daily', label: 'Daily' },
            { value: 'funnel', label: 'Same as deadline funnel settings' },
          ]}
        />
        {type === 'fixed' && (
          <Field label="Ends" stack>
            <DateTimeField value={p.endsAt ?? Date.now() + 86400000} onChange={(t) => setProps(node.id, { endsAt: t }, false)} />
          </Field>
        )}
        {type === 'delay' && (
          <>
            {/* like V1: counted from when each visitor first sees the page */}
            <PNum p="delayDays" label="Days" min={0} max={30} />
            <PNum p="delayHours" label="Hours" min={0} max={23} fallback={1} />
            <PNum p="delayMinutes" label="Minutes" min={0} max={59} />
            <PNum p="delaySeconds" label="Seconds" min={0} max={59} />
          </>
        )}
        {type === 'daily' && (
          <Field label="Ends every day at" stack>
            <TimeField value={p.dailyTime ?? '23:59'} onChange={(v) => setProps(node.id, { dailyTime: v }, false)} />
          </Field>
        )}
        {type === 'funnel' && <InfoNote>Ends at the deadline set in this funnel step's settings (a sample deadline here).</InfoNote>}
        <PChoice
          p="expireAction"
          label="Action when countdown expires?"
          stack
          options={[
            { value: 'nothing', label: 'Do nothing' },
            { value: 'redirect', label: 'Redirect to URL' },
          ]}
        />
        {p.expireAction === 'redirect' && <PText p="url" label="URL" placeholder="https://" />}
      </G>
      <G title="Typography" keys={['fontSize', 'subtextSize', 'fontFamily']}>
        <Num k="fontSize" label="Time font size" min={12} max={120} fallback={40} />
        <Num k="subtextSize" label="Text font size" min={8} max={40} fallback={13} />
        <FontType />
      </G>
      <G title="Color" keys={['color', 'subtextColor']}>
        <Color k="color" label="Time color" />
        <Color k="subtextColor" label="Label color" />
      </G>
      <SizePosition pad={false}>
        <AlignRow />
      </SizePosition>
    </>
  )
}

function PriceSettings() {
  const { node } = useInspector()
  return (
    <>
      <G title="Offer">
        <PText p="name" label="Name" />
        <PText p="price" label="Price" />
        <PText p="period" label="Period" />
        <PText p="buttonText" label="Button" />
        <PFlag p="featured" label="Highlight this offer" />
        <div className="text-[12px] text-[var(--t3)]">Included</div>
        <ListEditor items={node.props.features ?? []} onChange={(features) => setProps(node.id, { features })} />
      </G>
      <G title="Box" keys={['background', 'paddingY', 'paddingX', 'pad', 'shadow']}>
        <Color k="background" label="Background color" />
        <Spacing kind="padding" />
        <ShadowRow />
      </G>
      <BorderGroup />
    </>
  )
}

export function ListEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <TextField value={it} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
          <IconButton tip="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X size={14} />
          </IconButton>
        </div>
      ))}
      <Button size="sm" variant="ghost" className="self-start" onClick={() => onChange([...items, 'New item'])}>
        <Plus size={13} /> Add item
      </Button>
    </div>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-[16px] text-[var(--t4)]">{children}</p>
}

export function toEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url
}
