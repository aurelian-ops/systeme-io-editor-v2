import { useSyncExternalStore } from 'react'
import { THEMES } from './theme'
import { find, insert, parentOf, remove } from './tree'
import { calendarFields, carouselSlide, cloneFresh, el, formChildren, surveyFinal, uid, upgradeFaq } from './blocks'
import type { Direction, Checkpoint, Device, Node, PageDoc, Style, StyleKey } from './types'
import { REGISTRY } from './elements'
import { fixStructure } from './structure'
import { recipeDemo, recipeDemo2 } from './recipeDemo'
import { refreshInstances, reloadMasters, syncMasters } from './masters'
import { crossfade, reveal, withLayout } from '../ui/motion'

export type View = Device | 'all'
export type LeftTab = 'elements' | 'blocks'

export interface Pending {
  label: string
  base: PageDoc
  changes: number
  note?: string
}

export interface ToastMsg {
  id: string
  text: string
  undo?: boolean
  /** what Undo does when it is not the page's own undo (a deleted chat comes back) */
  onUndo?: () => void
  /** the message without its "×3": the same action again updates this toast instead of stacking a new one */
  base?: string
  count?: number
}

export interface AiStep {
  id: string
  text: string
  done: boolean
  /** node the step created or changed, so steps can be clicked to jump there */
  target?: string
}

/** One exchange with the AI, kept for the conversation views. */
export interface AiTurn {
  id: string
  prompt: string
  scope: string
  steps: AiStep[]
  status: 'working' | 'done' | 'empty' | 'answered' | 'kept' | 'discarded' | 'stopped'
  changes: number
  startedAt: number
  endedAt?: number
  note?: string
  /** what the AI said back */
  reply?: string
  /** images attached to the request (small previews) */
  images?: string[]
  /** one-tap questions the AI asked before building (answered with the next message) */
  questions?: AiQuestion[]
  /** four looks to pick from before a new page is built */
  directions?: Direction[]
  /** a conversion check: the score and the fixes that matter most */
  score?: { score: number; summary?: string; fixes: { title: string; why: string; prompt: string }[] }
}

export interface AiQuestion {
  id: string
  q: string
  options: string[]
}


export interface EditorState {
  doc: PageDoc
  selectedId: string | null
  view: View
  /** Device used by the inspector when view is 'all'. */
  focusDevice: Device
  past: PageDoc[]
  future: PageDoc[]
  checkpoints: Checkpoint[]
  pending: Pending | null
  building: string[]
  aiBusy: boolean
  aiSteps: AiStep[]
  aiMessage: string | null
  aiTurns: AiTurn[]
  /** the node the AI is writing right now (cursor / glow follow it) */
  aiTarget: string | null
  /** the AI panel on the right of the canvas */
  threadOpen: boolean
  /** show the page as it was before the pending AI change */
  compareBefore: boolean
  leftTab: LeftTab
  panel: null | 'settings' | 'history' | 'popups'
  check: boolean
  preview: boolean
  palette: boolean
  /** width the floating left panel covers on the canvas (0 when hidden) */
  leftInset: number
  toasts: ToastMsg[]
  editingId: string | null
  lastSaved: number | null
  /** Where the next block from the Blocks tab goes (set by the + between sections). */
  insertIndex: number | null
  /** node waiting in the "Save as block" dialog */
  saveBlockFor: string | null
  /** an element waiting for the delete confirmation */
  confirmDelete: string | null
  /** a form showing its "after sign-up" message on the canvas while you edit that message */
  successPreview: string | null
  /** an image just added with a click: its settings open straight on the upload modal (V1) */
  uploadFor: string | null
  /** the button that asked to save (quick save opens next to it) */
  saveBlockAt: { x: number; y: number; w: number; h: number } | null
  /** Canvas popovers live here so they survive hover changes. */
  popover: { kind: 'layouts' | 'rewrite' | 'ask'; id: string; rect: { x: number; y: number; w: number; h: number } } | null
}

const STORAGE_KEY = 'sio-editor-v2-doc'

/* the AI conversation is kept across reloads (the last 40 messages; attached images are not kept) */
const TURNS_KEY = 'sio-editor-v2-ai'
function loadTurns(): AiTurn[] {
  try {
    const t = JSON.parse(localStorage.getItem(TURNS_KEY) ?? '[]') as AiTurn[]
    // a request cut off by a reload is over
    return t.map((x) => (x.status === 'working' ? { ...x, status: 'stopped' as const } : x))
  } catch {
    return []
  }
}


export function emptyDoc(): PageDoc {
  return { title: 'Untitled page', theme: { ...THEMES[0] }, sections: [], smartResponsive: true }
}

/** The funnel step type comes from the funnel (chosen before the editor opens); ?step= simulates it here. */
const STEP = new URLSearchParams(window.location.search).get('step')

/**
 * Like V1, a section only holds rows: an element always sits in a row (one column). Anything that lands directly in a
 * section (a block, a drop, the AI) gets its own row, with no extra spacing so the page looks exactly the same.
 */
/** The name each field type gets as its placeholder. */
const FIELD_LABEL: Record<string, string> = {
  email: 'Email',
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone number',
  city: 'City',
  street: 'Street address',
  postcode: 'Postcode',
  state: 'State',
  company: 'Company name',
  website: 'Website',
  neighborhood: 'Neighborhood',
  street_number: 'Street number',
  tax_number: 'Tax number',
}

/** A row the editor once put around an element in a slide: one column, nothing set on it but the default gap. */
function isAutoRow(n: Node) {
  if (n.type !== 'row' || n.children?.length !== 1) return false
  const keys = Object.keys(n.style?.desktop ?? {}).filter((k) => k !== 'gap' && k !== 'vAlign')
  const colKeys = Object.keys(n.children[0].style?.desktop ?? {}).filter((k) => k !== 'gap')
  return !keys.length && !colKeys.length && !n.style?.tablet && !n.style?.mobile
}

function rowsOnly(doc: PageDoc) {
  // forms are made of real elements: an older form (fields listed on it) becomes inputs + a button inside it
  const forms = (list?: Node[]) =>
    list?.forEach((n) => {
      if (n.type === 'form' && !n.children) {
        n.children = formChildren(n)
        for (const k of ['fields', 'buttonText', 'note', 'fieldStyle', 'btnStyle'] as const) delete n.props[k]
      }
      forms(n.children)
    })
  forms(doc.sections)
  // a calendar's step-2 fields are elements too (older calendars drew them as a fixed picture)
  const calendars = (list?: Node[]) =>
    list?.forEach((n) => {
      if (n.type === 'calendar' && !n.children) n.children = [calendarFields()]
      // anything directly in a calendar gets a row around it (a calendar, like a section, only holds rows)
      if (n.type === 'calendar' && n.children)
        n.children = n.children.map((c) =>
          c.type === 'row'
            ? c
            : {
                id: uid('ro'),
                type: 'row',
                props: { minCol: 200 },
                style: { desktop: { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 } },
                children: [c.type === 'column' ? c : { id: uid('co'), type: 'column', props: {}, style: { desktop: { gap: 10 } }, children: [c] }],
              },
        )
      calendars(n.children)
    })
  calendars(doc.sections)
  // a survey's final step is real elements too (older surveys only had a thank-you line); like a section, it holds rows
  const surveys = (list?: Node[]) =>
    list?.forEach((n) => {
      if (n.type === 'survey' && !n.children) n.children = [surveyFinal()]
      if (n.type === 'survey' && n.children)
        n.children = n.children.map((c) =>
          c.type === 'row'
            ? c
            : { id: uid('ro'), type: 'row', props: { minCol: 200 }, style: { desktop: { gap: 20, vAlign: 'start', paddingY: 10, paddingX: 10 } }, children: [c.type === 'column' ? c : { id: uid('co'), type: 'column', props: {}, style: { desktop: { gap: 10 } }, children: [c] }] },
        )
      surveys(n.children)
    })
  surveys(doc.sections)
  // a carousel holds slides (columns) and, like V1, elements go straight into a slide (no row around them);
  // older carousels listed images, and for a while slides wrapped each element in a plain one-column row
  const carousels = (list?: Node[]) =>
    list?.forEach((n) => {
      if (n.type === 'carousel') {
        if (!n.children) {
          n.children = (n.props.slides ?? []).map((sl) => carouselSlide(sl.src ? [el('image', { src: sl.src, alt: sl.caption ?? '', aspect: 16 / 9 }, { radius: 0 })] : []))
          delete n.props.slides
        }
        n.children = n.children.map((c) => (c.type === 'column' ? c : carouselSlide([c])))
        for (const slide of n.children) {
          slide.children = slide.children?.flatMap((c) => (isAutoRow(c) ? (c.children?.[0]?.children ?? []) : [c]))
          // those early slides had no room between elements
          if (slide.style?.desktop?.gap === 0) slide.style.desktop.gap = 16
        }
      }
      carousels(n.children)
    })
  carousels(doc.sections)
  // like V1, an FAQ's answers are made of elements: older FAQs listed plain-text answers on themselves
  const faqs = (list?: Node[]) =>
    list?.forEach((n) => {
      upgradeFaq(n)
      // FAQs are soft cards now: older ones get the cards' corners written in, so the setting shows them
      if (n.type === 'faq' && n.style.desktop.radius === undefined && !n.style.desktop.radii) n.style.desktop.radius = 14
      faqs(n.children)
    })
  faqs(doc.sections)
  // a field with a type always has its placeholder written in (not only shown as a hint)
  const named = (list?: Node[]) =>
    list?.forEach((n) => {
      if (n.type === 'input' && n.props.inputType && n.props.inputType !== 'custom' && n.props.inputType !== 'country' && !n.props.placeholder)
        n.props.placeholder = FIELD_LABEL[n.props.inputType] ?? ''
      named(n.children)
    })
  named(doc.sections)
  doc.popups?.forEach((p) => forms((p as unknown as { sections?: Node[] }).sections))
  for (const sec of doc.sections) {
    if (!sec.children?.some((c) => c.type !== 'row')) continue
    sec.children = sec.children.map((c) =>
      c.type === 'row'
        ? c
        : {
            id: uid('ro'),
            type: 'row',
            props: { minCol: 200 },
            style: { desktop: { gap: 0 } },
            children: [c.type === 'column' ? c : { id: uid('co'), type: 'column', props: {}, style: { desktop: { gap: 20 } }, children: [c] }],
          },
    )
  }
  // every part reachable and editable by hand (columns only where you can select them, plain colours)
  fixStructure(doc)
  return doc
}

function loadDoc(): PageDoc {
  let doc = emptyDoc()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) doc = JSON.parse(raw) as PageDoc
  } catch {
    /* storage unavailable */
  }
  if (STEP) doc.stepType = STEP
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === 'recipes') doc = recipeDemo(emptyDoc())
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === 'recipes2') doc = recipeDemo2(emptyDoc())
  return rowsOnly(doc)
}

let state: EditorState = {
  doc: loadDoc(),
  selectedId: null,
  view: 'desktop',
  focusDevice: 'desktop',
  past: [],
  future: [],
  checkpoints: [],
  pending: null,
  building: [],
  aiBusy: false,
  aiSteps: [],
  aiMessage: null,
  aiTurns: loadTurns(),
  aiTarget: null,
  threadOpen: false,
  compareBefore: false,
  leftTab: 'elements',
  panel: null,
  palette: false,
  check: false,
  preview: false,
  toasts: [],
  leftInset: 300,
  editingId: null,
  lastSaved: null,
  insertIndex: null,
  saveBlockFor: null,
  confirmDelete: null,
  successPreview: null,
  uploadFor: null,
  saveBlockAt: null,
  popover: null,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
/** Run something after every change (outside React): the chat list follows the conversation this way. */
export function onStoreChange(l: () => void) {
  listeners.add(l)
  return () => void listeners.delete(l)
}

let savedTurns: AiTurn[] | null = null
listeners.add(() => {
  if (state.aiTurns === savedTurns) return
  savedTurns = state.aiTurns
  try {
    localStorage.setItem(TURNS_KEY, JSON.stringify(state.aiTurns.slice(-40).map(({ images, ...t }) => ({ ...t, images: images?.length ? [] : undefined }))))
  } catch {
    /* storage full or unavailable */
  }
})

export function getState() {
  return state
}
export function setState(patch: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  emit()
}
export function useEditor<T>(sel: (s: EditorState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sel(state),
  )
}

/* ---------------- Document mutations ---------------- */

// master blocks edited on another page or tab show up when you come back
window.addEventListener('focus', () => {
  reloadMasters()
  const doc = structuredClone(state.doc)
  if (refreshInstances(doc)) setState({ doc })
})

let lastCoalesce: { key: string; at: number } | null = null

/**
 * Apply a change to the page. Every change is undoable; rapid edits with the
 * same coalesce key (typing, dragging a slider) collapse into one undo step.
 */
export function update(fn: (d: PageDoc) => void, opts: { coalesce?: string; label?: string; source?: 'you' | 'ai' } = {}) {
  const prev = state.doc
  const next = structuredClone(prev)
  fn(next)
  rowsOnly(next)
  syncMasters(prev, next)
  const now = Date.now()
  const merge = opts.coalesce && lastCoalesce && lastCoalesce.key === opts.coalesce && now - lastCoalesce.at < 900
  lastCoalesce = opts.coalesce ? { key: opts.coalesce, at: now } : null
  const past = merge ? state.past : [...state.past.slice(-99), prev]
  const pending = state.pending ? { ...state.pending, changes: state.pending.changes + (opts.source === 'ai' ? 1 : 0) } : null
  setState({ doc: next, past, future: [], pending, compareBefore: false })
  scheduleAutosave()
}

export function undo() {
  const { past, future, doc } = state
  if (!past.length) return
  const target = structuredClone(past[past.length - 1])
  syncMasters(doc, target)
  withLayout(() => setState({ doc: target, past: past.slice(0, -1), future: [doc, ...future], pending: null, compareBefore: false }))
}
export function redo() {
  const { past, future, doc } = state
  if (!future.length) return
  const target = structuredClone(future[0])
  syncMasters(doc, target)
  withLayout(() => setState({ doc: target, past: [...past, doc], future: future.slice(1) }))
}

export function checkpoint(label: string, source: 'you' | 'ai') {
  const cp: Checkpoint = { id: uid('cp'), label, source, at: Date.now(), doc: structuredClone(state.doc) }
  setState({ checkpoints: [cp, ...state.checkpoints].slice(0, 40) })
}

export function restoreCheckpoint(id: string) {
  const cp = state.checkpoints.find((c) => c.id === id)
  if (!cp) return
  update((d) => Object.assign(d, structuredClone(cp.doc)))
  toast(`Restored “${cp.label}”`, true)
}

let saveTimer: number | undefined
function scheduleAutosave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => save(false), 1200)
}
export function save(announce = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.doc))
    setState({ lastSaved: Date.now() })
    if (announce) toast('Saved')
  } catch {
    if (announce) toast('Could not save in this browser')
  }
}

/* ---------------- Toasts ---------------- */

const toastTimers = new Map<string, number>()
export function toast(text: string, undoable: boolean | (() => void) = false) {
  const onUndo = typeof undoable === 'function' ? undoable : undefined
  const last = state.toasts.at(-1)
  let t: ToastMsg
  if (last && last.base === text) {
    // the same action again (duplicate, duplicate…): one toast that counts
    const count = (last.count ?? 1) + 1
    t = { ...last, text: `${text} ×${count}`, count, undo: !!undoable, onUndo }
    setState({ toasts: [...state.toasts.slice(0, -1), t] })
    window.clearTimeout(toastTimers.get(t.id))
  } else {
    t = { id: uid('t'), text, undo: !!undoable, onUndo, base: text }
    setState({ toasts: [...state.toasts.slice(-2), t] })
  }
  toastTimers.set(
    t.id,
    window.setTimeout(() => {
      toastTimers.delete(t.id)
      setState({ toasts: state.toasts.filter((x) => x.id !== t.id) })
    }, 4200),
  )
}

/* ---------------- Selection helpers ---------------- */

/** Switch between the page before and after an AI change, with a short cross-fade. */
export function setCompare(before: boolean) {
  if (state.compareBefore === before) return
  crossfade(document.querySelector('[data-canvas-content]'))
  setState({ compareBefore: before })
}

export function select(id: string | null) {
  if (state.selectedId === id) return
  setState({ selectedId: id, editingId: id === state.editingId ? state.editingId : null })
}

/** "Ask AI" from anywhere (toolbar, ⌘J): opens the surface of the current AI direction. */
export function askAI() {
  // nothing to talk about yet: the first screen is where a page starts
  if (!state.doc.sections.length && !state.aiBusy) return
  setState({ threadOpen: true })
  requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('editor:focus-ai')))
}

export function activeDevice(): Device {
  return state.view === 'all' ? state.focusDevice : state.view
}

/* ---------------- Common edits ---------------- */

export function setStyle(id: string, key: StyleKey, value: Style[StyleKey] | undefined, device: Device = activeDevice()) {
  update(
    (d) => {
      const n = find(d, id)
      if (!n) return
      const bucket = device === 'desktop' ? n.style.desktop : (n.style[device] ??= {})
      if (value === undefined) delete (bucket as Record<string, unknown>)[key]
      else (bucket as Record<string, unknown>)[key] = value
    },
    { coalesce: `${id}:${device}:${key}` },
  )
}

export function resetStyle(id: string, key: StyleKey, device: Device) {
  setStyle(id, key, undefined, device)
}

/** The same style on several elements at once (a form's fields), in one undo step. */
export function setStyleMany(ids: string[], key: StyleKey, value: Style[StyleKey] | undefined, device: Device = activeDevice()) {
  update(
    (d) => {
      for (const id of ids) {
        const n = find(d, id)
        if (!n) continue
        const bucket = device === 'desktop' ? n.style.desktop : (n.style[device] ??= {})
        if (value === undefined) delete (bucket as Record<string, unknown>)[key]
        else (bucket as Record<string, unknown>)[key] = value
      }
    },
    { coalesce: `${ids.join(',')}:${device}:${key}` },
  )
}

export function setProps(id: string, patch: Partial<Node['props']>, coalesce = true) {
  update(
    (d) => {
      const n = find(d, id)
      if (!n) return
      Object.assign(n.props, patch)
      // the AI's illustrative proof (a sample quote, stat or logo) becomes real once you write your own in it
      if (n.props.sample && !('sample' in patch) && !('motion' in patch)) delete n.props.sample
    },
    coalesce ? { coalesce: `${id}:props:${Object.keys(patch).join(',')}` } : {},
  )
}

/** The trash button the confirm grows out of (kept outside the state: it is a DOM node). */
let deleteAnchor: HTMLElement | null = null
export const deleteAnchorEl = () => deleteAnchor

/** Delete from the toolbar, the settings or the keyboard: ask first, like V1, right at the trash button. */
export function askDelete(id: string, anchor?: HTMLElement | null) {
  if (!find(state.doc, id)) return
  // from the keyboard: the element's own trash on the canvas, else the one in its settings
  deleteAnchor =
    anchor ??
    document.querySelector<HTMLElement>(`[data-overlay] [data-delete-for="${id}"]`) ??
    document.querySelector<HTMLElement>(`[data-delete-for="${id}"]`)
  setState({ confirmDelete: id })
}

export function removeNode(id: string) {
  const n = find(state.doc, id)
  if (!n) return
  withLayout(() => {
    update((d) => {
      remove(d, id)
    })
    setState({ selectedId: null })
  })
  toast(`Deleted ${labelOf(n)}`, true)
}

export const MAX_COLUMNS = 6

/**
 * Set how many columns a row has (1 to 6). New columns are empty and the space is shared evenly again;
 * removing columns never loses content: it moves into the last column that stays.
 */
export function setColumnCount(rowId: string, count: number) {
  const k = Math.max(1, Math.min(MAX_COLUMNS, Math.round(count)))
  const r = find(state.doc, rowId)
  if (!r || r.type !== 'row' || (r.children?.length ?? 0) === k) return
  withLayout(() =>
    update((d) => {
      const row = find(d, rowId)
      if (!row) return
      const cols = (row.children ??= [])
      const like = cols[0]
      // a one-column row has no gap to speak of: when it grows, columns start 20px apart (unless you set a gap)
      if (cols.length === 1 && k > 1 && !(row.style.desktop.gap && row.style.desktop.gap > 0)) row.style.desktop.gap = 20
      // columns taken away earlier are remembered with what was moved out of them, so adding them back undoes the merge
      const parked = [...(row.props.parked ?? [])]
      while (cols.length < k) {
        const back = parked.pop()
        if (back) {
          const keep = cols[cols.length - 1]
          const moved = (keep.children ?? []).filter((c) => back.moved.includes(c.id))
          keep.children = (keep.children ?? []).filter((c) => !back.moved.includes(c.id))
          cols.push({ ...back.col, children: moved })
        } else cols.push({ id: uid('co'), type: 'column', props: {}, style: { desktop: { gap: like?.style.desktop.gap ?? 20 } }, children: [] })
      }
      if (cols.length > k) {
        const keep = cols[k - 1]
        const extras = cols.splice(k)
        // content keeps its reading order; the last column removed is the first one restored
        for (const extra of extras) keep.children = [...(keep.children ?? []), ...(extra.children ?? [])]
        for (const extra of [...extras].reverse()) parked.push({ col: { ...extra, children: [] }, moved: (extra.children ?? []).map((c) => c.id) })
      }
      if (parked.length) row.props.parked = parked
      else delete row.props.parked
      // widths and "per line" were set for the old count: start fresh, evenly shared
      for (const dev of ['desktop', 'tablet', 'mobile'] as const) {
        const st = row.style[dev]
        if (st) delete st.colWidths, delete st.columns
      }
    }),
  )
}

export function duplicateNode(id: string) {
  const p = parentOf(state.doc, id)
  const n = find(state.doc, id)
  if (!p || !n) return
  const copy = cloneFresh(n)
  withLayout(() => {
    update((d) => insert(d, p.parentId, p.index + 1, copy))
    setState({ selectedId: copy.id })
  })
  reveal(copy.id, id)
  toast(`Duplicated ${labelOf(n)}`, true)
}

export function moveNode(id: string, dir: -1 | 1) {
  const p = parentOf(state.doc, id)
  if (!p) return
  const to = p.index + dir
  if (to < 0 || to >= p.list.length) return
  withLayout(() =>
    update((d) => {
      const pp = parentOf(d, id)!
      const [n] = pp.list.splice(pp.index, 1)
      pp.list.splice(to, 0, n)
    }),
  )
}

export function labelOf(n: Node) {
  // like V1, a section is just "Section" in the editor (tag, trail, settings, toasts); its kind stays for the AI
  if (n.type === 'section') return 'Section'
  return TYPE_LABEL[n.type] ?? REGISTRY[n.type]?.label ?? n.type
}

export const SECTION_NAMES: Record<string, string> = {
  header: 'Header',
  hero: 'Hero',
  logos: 'Logos',
  features: 'Benefits',
  steps: 'How it works',
  about: 'About',
  testimonials: 'Testimonials',
  stats: 'Numbers',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'Sign-up',
  countdown: 'Offer timer',
  video: 'Video',
  footer: 'Footer',
  blank: 'Section',
}

export const TYPE_LABEL: Partial<Record<Node['type'], string>> = {
  section: 'Section',
  row: 'Row',
  column: 'Column',
  headline: 'Text headline',
  text: 'Text',
  eyebrow: 'Label',
  button: 'Button',
  image: 'Image',
  list: 'Bulleted list',
  form: 'Form',
  faq: 'FAQ',
  countdown: 'Countdown',
  divider: 'Horizontal line',
  video: 'Video',
  quote: 'Testimonial',
  price: 'Price card',
  logos: 'Logo strip',
  stat: 'Number',
  spacer: 'Spacer',
}
