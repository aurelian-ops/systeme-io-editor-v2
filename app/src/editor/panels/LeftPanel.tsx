import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleDollarSign, FileCheck, House, MessageSquareHeart, MessageSquareText, PanelBottom, PanelTop, Save, Search, ThumbsUp, Trash2, Users, type LucideIcon } from 'lucide-react'
import { ALL_ITEMS, LIBRARY, type LibItem } from '../library'
import { askAI, getState, SECTION_NAMES, setCompare, setProps, setState, toast, update, useEditor } from '../store'
import { UploadModal } from '../settings/kit'
import { find, insert, insertionTarget, parentOf, ROOT } from '../tree'
import { asSection, BLOCK_CATEGORIES } from '../blockLibrary'
import { deleteBlock, instantiate, useSavedBlocks } from '../blocksStore'
import { dropAt, endDrag, lastAdded, markAdded, pageCopy, startDrag } from '../dnd'
import { appear, project, rubberband, spring, velocityTracker, withLayout } from '../../ui/motion'
import { PageView } from '../render/PageView'
import { Inspector } from './Inspector'
import { PeekLayer, peek } from './ElementPeek'
import { SettingsPanel } from './SettingsPanel'
import { HistoryPanel } from './HistoryPanel'
import { PopupsPanel } from './PopupsPanel'
import { Button, cx, IconButton, Popover, Segmented } from '../../ui/kit'
import type { Node, PageDoc } from '../types'

export function LeftPanel() {
  const selectedId = useEditor((s) => s.selectedId)
  const panel = useEditor((s) => s.panel)
  const exists = useEditor((s) => !!find(s.doc, s.selectedId))
  const [collapsed, setCollapsed] = useState(false)
  const aside = useRef<HTMLElement>(null)
  const anim = useRef<ReturnType<typeof spring> | null>(null)
  const W = 300

  /** Spring the panel open or shut from wherever it is now (can be reversed mid-way). */
  const settle = (open: boolean, velocity = 0) => {
    const el = aside.current
    if (!el) return
    anim.current?.stop()
    setCollapsed(!open)
    anim.current = spring({
      from: el.getBoundingClientRect().width,
      to: open ? W : 0,
      velocity,
      // a flick may overshoot a little; a click never does
      damping: Math.abs(velocity) > 300 ? 0.82 : 1,
      response: 0.34,
      onUpdate: (w) => setInset(el, Math.max(0, w)),
    })
  }

  // like V1: picking an element always shows its settings, even if the page's Settings / History / Popups were open
  // or the panel was hidden
  useEffect(() => {
    if (!selectedId) return
    if (getState().panel) setState({ panel: null })
    if (collapsed) settle(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    const open = () => settle(true)
    window.addEventListener('editor:open-blocks', open)
    return () => window.removeEventListener('editor:open-blocks', open)
  }, [])

  /** Drag the edge to resize the panel away; release and it decides from where you were heading. */
  const grab = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = aside.current!
    anim.current?.stop()
    const x0 = e.clientX
    const w0 = el.getBoundingClientRect().width
    const vt = velocityTracker()
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      if (Math.abs(dx) > 3) moved = true
      if (!moved) return
      vt.add(ev.timeStamp, dx)
      const w = w0 + dx
      setInset(el, w > W ? W + rubberband(w - W, W) : Math.max(0, w))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.cursor = ''
      if (!moved) return settle(collapsedNow())
      const v = vt.get()
      const rest = el.getBoundingClientRect().width + project(v)
      settle(rest > W / 2, v)
    }
    const collapsedNow = () => el.getBoundingClientRect().width < W / 2
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const comparing = useEditor((s) => s.compareBefore && !!s.pending)
  let body
  if (comparing) body = <ComparingNote />
  else if (panel === 'settings') body = <SettingsPanel />
  else if (panel === 'history') body = <HistoryPanel />
  else if (panel === 'popups') body = <PopupsPanel />
  else if (selectedId && exists) body = <Inspector key={selectedId} id={selectedId} />
  else body = <Library />

  return (
    // the panel floats over the canvas (macOS 26): the canvas runs underneath it, so the page shows through the glass
    <div className="pointer-events-none absolute bottom-0 left-0 top-12 z-30 flex">
      <aside ref={aside} className="flex h-full flex-col" style={{ width: W }}>
        <div className="glass-sidebar pointer-events-auto m-2 flex h-[calc(100%-16px)] w-[284px] flex-none flex-col overflow-hidden rounded-[16px]">{body}</div>
      </aside>
      <PendingUpload />
      <button
        aria-label={collapsed ? 'Show panel' : 'Hide panel'}
        title="Click or drag"
        onPointerDown={grab}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), settle(collapsed))}
        // a real target: the tab you see is 20×56, the area you can hit is 44px wide (Apple's minimum)
        className="press glass-sidebar pointer-events-auto absolute -right-3 top-1/2 z-20 flex h-14 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--t2)] hover:text-[var(--t1)] before:absolute before:-inset-x-3 before:-inset-y-2 before:content-['']"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
  )
}

/** The panel's width also tells the canvas how much of it is covered, so the page stays centred in what you see. */
function setInset(el: HTMLElement, w: number) {
  el.style.width = `${w}px`
  // the card slides out to the left as one piece (nothing is cropped, the shadow stays soft)
  const card = el.firstElementChild as HTMLElement | null
  if (card) card.style.transform = w < 300 ? `translateX(${w - 300}px)` : ""
  document.documentElement.style.setProperty('--left-inset', `${Math.min(w, 300)}px`)
  // the page's zoom follows the panel every frame, so nothing jumps at the end
  setState({ leftInset: Math.min(w, 300) })
}
document.documentElement.style.setProperty('--left-inset', '300px')

/** While the canvas shows the old version, editing is paused; say so instead of showing stale settings. */
function ComparingNote() {
  return (
    <div className="px-4 py-6">
      <div className="text-[13px] font-semibold">Viewing the page before the AI change</div>
      <p className="mt-1 text-[12px] leading-[18px] text-[var(--t3)]">Editing is paused while you compare. Switch back to After to keep editing.</p>
      <Button size="sm" className="mt-3" onClick={() => setCompare(false)}>
        Show after
      </Button>
    </div>
  )
}

/* ---------------- Library: Elements / Blocks / Layers ---------------- */

function Library() {
  const tab = useEditor((s) => s.leftTab)
  return (
    <>
      <div className="px-4 pb-2 pt-4">
        <Segmented
          full
          value={tab}
          onChange={(v) => setState({ leftTab: v })}
          options={[
            { value: 'elements', label: 'Elements' },
            { value: 'blocks', label: 'Blocks' },
          ]}
        />
      </div>
      <div className="scroll-thin scroll-edge min-h-0 flex-1 overflow-y-auto">
        {tab === 'blocks' ? <Blocks /> : <Elements />}
      </div>
    </>
  )
}

function Elements() {
  const [q, setQ] = useState('')
  const groups = LIBRARY.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) })).filter((g) => g.items.length)
  return (
    <div className="px-4 pb-6">
      <label className="mb-3 flex h-8 items-center gap-2 rounded-[8px] bg-[var(--fill-1)] px-2.5 text-[var(--t3)] focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
        <Search size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search elements" className="w-full bg-transparent text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]" />
      </label>
      {groups.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="caps mb-2">{g.title}</div>
          <div className="grid grid-cols-3 gap-2">
            {g.items.map((it) => (
              <Tile key={it.id} item={it} />
            ))}
          </div>
        </div>
      ))}
      <p className="mt-2 text-[12px] leading-[18px] text-[var(--t4)]">Click to add after the selection, or drag onto the page.</p>
      <PeekLayer />
    </div>
  )
}

/** The upload modal for an image just added with a click (only images, only then); closing it keeps the sample. */
function PendingUpload() {
  const id = useEditor((s) => s.uploadFor)
  if (!id) return null
  const close = () => setState({ uploadFor: null })
  return <UploadModal onClose={close} onInsert={(src) => (setProps(id, { src }, false), close())} />
}

function Tile({ item }: { item: LibItem }) {
  const Icon = item.icon
  const add = () => {
    const s = getState()
    const drop = (parentId: string, index: number) => dropAt({ kind: 'item', itemId: item.id }, parentId, index)
    if (item.section) {
      const idx = s.insertIndex ?? s.doc.sections.length
      drop(ROOT, idx)
      setState({ insertIndex: null })
      return
    }
    let t = insertionTarget(s.doc, s.selectedId ?? (find(s.doc, lastAdded) ? lastAdded : null))
    // only an empty page fills the row it creates; anywhere else a click-added element gets a row of its own
    const freshPage = !t
    if (!t) {
      // empty page: create a section to hold it
      const sec = ALL_ITEMS.find((i) => i.id === 'section')!.make()
      update((d) => void d.sections.push(sec))
      t = { parentId: sec.children![0].children![0].id, index: 0 }
    }
    // a layout nests inside a column you selected; otherwise it goes into the section, after the row that holds the selection
    if (item.layout && find(s.doc, s.selectedId)?.type !== 'column') {
      const p = find(getState().doc, t.parentId)
      if (p?.type === 'column') {
        const sec = getState().doc.sections.find((x) => JSON.stringify(x).includes(`"id":"${p.id}"`))
        if (sec) t = { parentId: sec.id, index: sec.children?.length ?? 0 }
      }
    }
    // like V1, an element added with a click gets a new row right after the row it would have gone into, even an empty
    // one; only on an empty page does it go into the section and row made for it
    if (!item.layout && !freshPage) {
      const d = getState().doc
      const col = find(d, t.parentId)
      const inRow = col?.type === 'column' ? parentOf(d, col.id) : undefined
      const rowNode = inRow ? find(d, inRow.parentId) : undefined
      const inSection = rowNode?.type === 'row' ? parentOf(d, rowNode.id) : undefined
      if (inSection && find(d, inSection.parentId)?.type === 'section') {
        dropAt({ kind: 'item', itemId: item.id }, inSection.parentId, inSection.index + 1, true)
        if (item.id === 'image') setState({ uploadFor: lastAdded })
        return
      }
    }
    drop(t.parentId, t.index)
    // like V1, an image added with a click asks for its file right away (a drag does not)
    if (item.id === 'image') setState({ uploadFor: lastAdded })
  }
  // E · Peek (Apple Keynote / Freeform): a light tile with a large glyph; rest on it to see a preview
  return (
    <button
      draggable
      onDragStart={(e) => (peek.hide(), startDrag({ kind: 'item', itemId: item.id }, e))}
      onDragEnd={endDrag}
      onClick={() => (peek.hide(), add())}
      onPointerEnter={(e) => peek.enter(item, e.currentTarget)}
      onPointerLeave={peek.leave}
      className="drag-source press group flex aspect-[1/0.92] flex-col items-center justify-center gap-2 rounded-[10px] text-[12px] font-medium text-[var(--t1)] hover:bg-black/[.045] active:bg-black/[.07]"
    >
      <Icon size={24} strokeWidth={1.5} className="group-hover:scale-[1.08]" style={{ transition: 'scale 360ms var(--ease-spring)' }} />
      <span className="px-1 text-center leading-[15px]">{item.label}</span>
    </button>
  )
}

/** Remembered while the panel switches tabs, so coming back lands in the same category. */
let lastCategory: string | null = null

/** Same icons as the V1 block categories. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  mine: Save,
  optin: FileCheck,
  features: ThumbsUp,
  footers: PanelBottom,
  team: Users,
  welcome: House,
  pricing: CircleDollarSign,
  headers: PanelTop,
  testimonials: MessageSquareHeart,
}

function Blocks() {
  const theme = useEditor((s) => s.doc.theme)
  const title = useEditor((s) => s.doc.title)
  const kinds = useEditor((s) => s.doc.sections.map((x) => x.props.kind).join(' '))
  const insertIndex = useEditor((s) => s.insertIndex)
  const count = useEditor((s) => s.doc.sections.length)
  const busy = useEditor((s) => s.aiBusy)
  const saved = useSavedBlocks()
  const [cat, setCat] = useState<string | null>(lastCategory)
  const top = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const copy = useMemo(() => pageCopy(), [title, kinds])
  const category = BLOCK_CATEGORIES.find((c) => c.id === cat)
  const built = useMemo(() => category?.blocks.map((b) => ({ def: b, node: b.make(copy, theme) })) ?? [], [category, copy, theme])
  const savedPreviews = useMemo(() => saved.map((b) => ({ block: b, node: asSection(instantiate(b)) })), [saved])
  const doc = getState().doc
  const idx = insertIndex ?? count

  const open = (id: string | null) => {
    lastCategory = id
    setCat(id)
    top.current?.closest('.scroll-thin')?.scrollTo({ top: 0 })
  }

  /** Hands over to the AI panel with the position already written, so people just finish the sentence. */
  const describe = () => {
    const prev = doc.sections[idx - 1]
    const where = !prev ? 'at the top of the page' : prev.props.kind === 'footer' && insertIndex === null ? 'before the footer' : `after the ${(SECTION_NAMES[prev.props.kind ?? ''] ?? 'section').toLowerCase()}`
    askAI()
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('editor:ai-draft', { detail: `Add a section ${where}: ` })))
    setState({ insertIndex: null })
  }

  /** Click inserts at the chosen position (the + between sections) or at the end. */
  const add = (n: Node, label: string) => {
    const s = getState()
    const at = s.insertIndex ?? s.doc.sections.length
    withLayout(() => update((d) => insert(d, ROOT, at, n)))
    appear(n.id)
    markAdded(n.id)
    setState({ insertIndex: null, selectedId: null, editingId: null })
    toast(`Added ${label}`, true)
    window.dispatchEvent(new CustomEvent('editor:reveal', { detail: n.id }))
  }

  return (
    <div ref={top} className="px-4 pb-6">
      {cat === null ? (
        <>
          <div className="-mx-2 flex flex-col">
            {[{ id: 'mine', name: 'My blocks', n: saved.length }, ...BLOCK_CATEGORIES.map((c) => ({ id: c.id, name: c.name, n: c.blocks.length }))].map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                className={cx(
                  'group flex h-9 items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] font-medium text-[var(--t1)] hover:bg-[var(--fill-1)]',
                  r.id === 'mine' && 'mb-1 shadow-[0_1px_0_var(--line)] rounded-b-none',
                )}
                style={{ transition: 'background-color 120ms var(--ease-out)' }}
              >
                {(() => {
                  const Icon = CATEGORY_ICON[r.id] ?? Save
                  return <Icon size={16} strokeWidth={1.75} className="flex-none text-[var(--t2)] group-hover:text-[var(--t1)]" />
                })()}
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-[12px] font-normal tabular-nums text-[var(--t4)]">{r.n}</span>
                <ChevronRight size={14} className="flex-none text-[var(--t4)] group-hover:text-[var(--t2)]" />
              </button>
            ))}
          </div>
          <button
            onClick={describe}
            disabled={busy}
            className="-mx-2 mt-1 flex h-9 w-[calc(100%+16px)] items-center gap-2 rounded-[6px] px-2 text-left text-[13px] font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-tint)]"
            style={{ transition: 'background-color 120ms var(--ease-out)' }}
          >
            <MessageSquareText size={14} className="flex-none" />
            <span className="flex-1">Not here? Describe it to the AI</span>
            <ChevronRight size={14} className="flex-none opacity-60" />
          </button>
          <p className="mt-3 text-[12px] leading-[18px] text-[var(--t4)]">Click a block to add it to the page, or drag it where you want it.</p>
        </>
      ) : (
        <>
          <div className="-ml-2 mb-2 flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => open(null)} className="!px-1.5">
              <ChevronLeft size={14} />
              Back
            </Button>
          </div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold">{cat === 'mine' ? 'My blocks' : category?.name}</span>
            <span className="text-[11px] tabular-nums text-[var(--t4)]">{cat === 'mine' ? saved.length : built.length}</span>
          </div>
          {cat === 'mine' ? (
            savedPreviews.length ? (
              <div className="flex flex-col gap-4">
                {savedPreviews.map(({ block, node }) => (
                  <BlockThumb
                    key={block.id}
                    node={node}
                    name={block.name}
                    master={block.master}
                    make={() => asSection(instantiate(block))}
                    onAdd={(n) => add(n, `“${block.name}”`)}
                    onDelete={() => {
                      deleteBlock(block.id)
                      toast(`Deleted “${block.name}” from My blocks`)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] bg-[var(--fill-1)] px-4 py-6 text-center">
                <Save size={18} className="mx-auto text-[var(--t3)]" />
                <div className="mt-2 text-[13px] font-semibold text-[var(--t1)]">No saved blocks yet</div>
                <p className="mt-1 text-[12px] leading-[18px] text-[var(--t3)]">Save any element or section with the save icon in its settings and it shows up here.</p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              {built.map(({ def, node }) => (
                <BlockThumb key={def.id} node={node} name={def.name} make={() => def.make(pageCopy(), getState().doc.theme)} onAdd={(n) => add(n, category!.single)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const THUMB_W = 268
const THUMB_Z = THUMB_W / 1280
const THUMB_MAX = 210

/** A live, scaled preview of a block. It renders only once scrolled near, so opening a category is instant. */
function BlockThumb({ node, name, make, onAdd, onDelete, master }: { node: Node; name: string; make: () => Node; onAdd: (n: Node) => void; onDelete?: () => void; master?: boolean }) {
  const theme = useEditor((s) => s.doc.theme)
  const settings = useEditor((s) => s.doc.settings)
  const smart = useEditor((s) => s.doc.smartResponsive)
  const view = useMemo(() => ({ title: '', theme, settings, smartResponsive: smart, sections: [] }) as PageDoc, [theme, settings, smart])
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const del = useRef<HTMLSpanElement>(null)
  const [seen, setSeen] = useState(false)
  const [h, setH] = useState(130)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el || seen) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { root: el.closest('.scroll-thin'), rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  useEffect(() => {
    const el = inner.current
    if (!seen || !el) return
    const fit = () => setH(Math.min(THUMB_MAX, Math.max(40, Math.round(el.offsetHeight * THUMB_Z))))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [seen])

  const go = () => onAdd(make())
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => startDrag({ kind: 'node', make, section: true }, e)}
      onDragEnd={endDrag}
      onClick={go}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && go()}
      className="drag-source group text-left outline-none"
    >
      <div
        ref={box}
        className="relative overflow-hidden rounded-[8px] bg-[var(--fill-1)] shadow-[var(--shadow-card)] group-hover:shadow-[0_0_0_2px_var(--brand)] group-focus-visible:shadow-[0_0_0_2px_var(--brand)]"
        style={{ height: h, transition: 'box-shadow 120ms var(--ease-out), height 200ms var(--ease-out)' }}
      >
        {seen && (
          <div ref={inner} className="fade-in" style={{ width: 1280, zoom: THUMB_Z, pointerEvents: 'none' }}>
            <PageView doc={view} device="desktop" only={[node]} />
          </div>
        )}
        {/* a shield above the preview, so embedded videos never catch the click */}
        <div className="absolute inset-0" />
      </div>
      <div className="mt-1.5 flex items-start gap-1">
        <div className="line-clamp-2 flex-1 text-[12px] leading-[17px] text-[var(--t2)] group-hover:text-[var(--t1)]">
          {name}
          {master && <span className="ml-1.5 rounded-[4px] bg-[var(--master-tint)] px-1 py-px text-[10px] font-semibold text-[var(--master)]">Master</span>}
        </div>
        {onDelete && (
          <span ref={del} className="-mr-1 -mt-1.5 inline-flex flex-none">
            <IconButton
              tip="Delete"
              className={cx('h-7 w-7 hover:!text-[var(--dng)] focus-visible:opacity-100 group-hover:opacity-100', !confirm && 'opacity-0')}
              onClick={(e) => {
                e.stopPropagation()
                setConfirm(true)
              }}
            >
              <Trash2 size={13} />
            </IconButton>
          </span>
        )}
      </div>
      {confirm && (
        <Popover anchor={del.current} onClose={() => setConfirm(false)} width={248} align="end">
          <div className="p-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-[var(--t1)]">Delete “{name}”?</div>
            <p className="mt-1 text-[12px] leading-[18px] text-[var(--t3)]">It is removed from My blocks on every page. Copies already on a page stay.</p>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setConfirm(false)
                  onDelete?.()
                }}
              >
                Delete block
              </Button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  )
}

