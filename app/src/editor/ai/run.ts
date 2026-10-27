import { buildSection, el, row, section, upgradeFaq, type Copy, type SectionHeading, type SectionKind, BLOCK_KINDS } from '../blocks'
import { activeDevice, getState, setState, toast, update, checkpoint, labelOf, type AiQuestion, type AiStep, type AiTurn } from '../store'
import { find, parentOf, path, remove, ROOT, walk } from '../tree'
import { THEMES } from '../theme'
import { defaultSettings } from '../panels/SettingsPanel'
import { resolveBrand } from '../brandMarks'
import { REGISTRY } from '../elements'
import type { Device, Direction, Node, PageBrief, PageDoc, PagePlan, SectionTone, Style } from '../types'
import { toJpeg } from 'html-to-image'
import { buildRecipe, type RecipeCopy, type RecipeKnobs } from '../recipes'
import { fixNode, fixStructure } from '../structure'
import { structuralFails } from './quality'
import { HERO_FAMILIES, heroFamily } from '../recipeMeta'
import { resetJourney, setJourney } from './journeyState'
import { newChat } from './chats'
import { lookAt } from './inspect'
import { makeCopy, planForPrompt, quotedText } from './copy'

export type Op =
  | { op: 'say'; text: string }
  | { op: 'title'; text: string }
  | { op: 'error'; text: string }
  | { op: 'theme'; patch: Partial<PageDoc['theme']> }
  | { op: 'addSection'; kind: SectionKind; variant?: number; tone?: SectionTone; after?: string; copy?: Partial<Copy> & SectionHeading & { imageQuery?: string } }
  | { op: 'replaceSection'; id: string; kind: SectionKind; variant?: number; tone?: SectionTone; copy?: Partial<Copy> & SectionHeading & { imageQuery?: string } }
  | { op: 'setProps'; id: string; props: Node['props'] }
  | { op: 'setStyle'; id: string; device?: Device; style: Style }
  | { op: 'remove'; id: string }
  | { op: 'move'; id: string; dir: -1 | 1 }
  | { op: 'options'; id: string; items: string[] }
  | { op: 'reply'; text: string }
  | { op: 'seo'; title?: string; description?: string; keywords?: string }
  | { op: 'insert'; parent: string; after?: string; node: RawNode }
  | { op: 'replace'; id: string; node: RawNode }
  | { op: 'remember'; brief: PageBrief }
  | { op: 'compose'; page: ComposedPage }
  | { op: 'preview'; sections: ComposedPage['sections'] }
  | { op: 'section'; index: number; section: ComposedPage['sections'][number] }
  | { op: 'restart' }
  | { op: 'look'; direction: Direction; index: number }
  | { op: 'critique'; review: { total?: number; scores?: Record<string, number>; leads?: string; fixes?: { id: string; device: string; problem: string; fix: string }[] } }
  | { op: 'recipe'; name: string; copy: RecipeCopy; knobs?: RecipeKnobs; after?: string; replace?: string }
  | { op: 'plan'; plan: PagePlan & { pageType?: string; direction?: string } }
  | { op: 'ask'; questions: AiQuestion[]; directions?: Direction[] }
  | { op: 'score'; score: number; summary?: string; fixes?: { title: string; why: string; prompt: string }[] }

interface RawNode {
  /** the model's own name for this node, so later ops can add children to it */
  key?: string
  type?: string
  props?: Record<string, unknown>
  style?: Record<string, unknown>
  children?: RawNode[]
}

let connected: boolean | null = null
let model: string | null = null
export async function aiStatus() {
  if (connected !== null) return { connected, model }
  try {
    const r = await fetch('/api/ai/status')
    const j = (await r.json()) as { connected: boolean; model: string | null }
    connected = j.connected
    model = j.model
  } catch {
    connected = false
  }
  return { connected, model }
}

/* ---------------- Compact page for the model ---------------- */

const TEXT_KEYS = ['text', 'items', 'faq', 'question', 'recipe', 'sample', 'buttonText', 'name', 'price', 'features', 'author', 'role', 'value', 'label', 'note', 'tone', 'kind'] as const
function compact(n: Node): unknown {
  const o: Record<string, unknown> = { id: n.id, type: n.type }
  for (const k of TEXT_KEYS) if (n.props[k] !== undefined && n.props[k] !== '') o[k] = n.props[k]
  const s = n.style.desktop
  const keep: Record<string, unknown> = {}
  for (const k of ['fontSize', 'textAlign', 'color', 'background', 'paddingY'] as const) if (s[k] !== undefined) keep[k] = s[k]
  if (Object.keys(keep).length) o.style = keep
  // what differs on phones and tablets, so the AI sees (and keeps) the mobile layout
  for (const dev of ['tablet', 'mobile'] as const) {
    const d = n.style[dev]
    if (d && Object.keys(d).length) o[`style_${dev}`] = d
  }
  if (n.type === 'menu') o.menu = { items: (n.props.menu ?? []).map((m) => m.label), burger: n.props.burger !== false }
  if (n.type === 'image' && typeof n.props.src === 'string') o.src = n.props.src.startsWith('data:') ? 'uploaded image' : n.props.src.startsWith('img:') ? 'photo being created' : n.props.src.slice(0, 80)
  // a designed section says which recipe it is (its words and photos can change; its layout only through the recipe op)
  if (n.type === 'section' && n.props.recipe) o.recipe = n.props.recipe
  if (n.type === 'button' && n.props.variant) o.variant = n.props.variant
  // the whole tree: the AI must see every element to change it
  if (n.children?.length) o.children = n.children.map(compact)
  return o
}

/* ---------------- Running a request ---------------- */

interface RunCtx {
  copy: Copy
  lastSectionId: string | null
  changes: number
  /** what this run is: a new page, an edit, variations, a check */
  mode: string
  /** the plan the plan stage made (null until then) */
  plan?: PagePlan | null
  /** the plan stage asked questions instead (answered with the next message) */
  asked?: boolean
  /** the page the AI wrote in one answer (compose stage) */
  composed?: ComposedPage | null
  /** a fixing pass: what it says stays out of the chat */
  quiet?: boolean
  /** a new page was built: shown as ready in the list when the run ends */
  ready?: boolean
  /** resolves when the AI asks its questions (before the page is fully written) */
  onAsk?: Promise<void>
  askedNow?: () => void
  /** a live (online) AI run */
  live?: boolean
  /** the separate critic's review of what was built */
  critique?: unknown
  /** what this run built (sections and custom structures), tidied at the end */
  built?: Set<string>
  /** sections of a new page built the moment the AI wrote them (by their place in the answer) */
  streamed?: Set<number>
  /** the streamed builds, one after the other (a crop may have to be cut first) */
  queue?: Promise<void>
  /** the first screen was built (a picked look applies to it alone) */
  heroDone?: boolean
}

type Stage = 'compose' | 'looks' | 'custom' | 'plan' | 'build' | 'critique' | 'review' | 'edit' | 'check' | 'variations'

/** A request that reshapes the page (not a tweak of one thing): it gets planned, built and reviewed. */
function bigChange(prompt: string, scope?: Node) {
  if (scope && scope.type !== 'section') return false
  return /\b(redesign|rebuild|re-?do|start over|from scratch|whole page|entire page|full page|new page|restructure|rewrite (the |this )?(whole|entire|page)|make (it|the page|this page) (convert|sell|premium|better)|improve (the |this )?(whole )?page|landing page for|sales page for)\b/i.test(prompt)
}

export interface RunOptions {
  prompt: string
  mode?: 'generate' | 'edit' | 'variations' | 'check'
  scopeId?: string | null
  brief?: Record<string, string>
  label?: string
  onOptions?: (items: string[]) => void
  /** the conversion check's result (stage check) */
  onScore?: (r: { score: number; summary?: string; fixes?: { title: string; why: string; prompt: string }[] }) => void
  /** images attached in the chat, as data URLs */
  images?: string[]
  /** what the chat shows as the user's message (defaults to the prompt) */
  display?: string
  /** answers to the AI's questions: plan, build and review like a new page or a big change */
  planned?: boolean
  /** the answer buttons were used (look and photos picked, nothing typed) */
  picks?: boolean

  /** use the built-in engine even when the AI service is connected (demo replays) */
  offline?: boolean
}

let controller: AbortController | null = null
/** the page still being written while you answer the AI's questions (picked up by the answer) */
let writing: { page: Promise<ComposedPage | null>; ac: AbortController } | null = null

export function stopAI() {
  controller?.abort()
}

export async function runAI(opts: RunOptions) {
  const s = getState()
  const mode0 = opts.mode
  if (s.aiBusy && mode0 !== 'variations') return
  const mode = opts.mode ?? (s.doc.sections.length ? 'edit' : 'generate')
  const scope = opts.scopeId ? find(s.doc, opts.scopeId) : undefined
  const label = opts.label ?? (mode === 'generate' ? 'AI built the page' : mode === 'check' ? 'Conversion check' : `AI: ${opts.prompt.slice(0, 48)}`)

  // a new page described on the first screen starts its own chat (an earlier page's conversation would mislead the
  // AI); the old chat stays in the list. Answers to open questions continue the chat
  const lastTurn = s.aiTurns[s.aiTurns.length - 1]
  if (mode === 'generate' && !opts.planned && lastTurn && !(lastTurn.status === 'answered' && (lastTurn.questions?.length || lastTurn.directions?.length))) newChat()
  // "yes, use it" right after the AI asked about an image: send that image again
  const prevTurn = getState().aiTurns[getState().aiTurns.length - 1]
  let reusedImages = false
  if (!opts.images?.length && prevTurn?.status === 'answered' && prevTurn.images?.length) {
    opts = { ...opts, images: prevTurn.images }
    reusedImages = true
  }
  // a typed answer to the AI's questions continues the plan like the answer buttons do
  if (prevTurn?.status === 'answered' && (prevTurn.questions?.length || prevTurn.directions?.length) && mode0 !== 'variations') opts = { ...opts, planned: true }

  if (mode !== 'variations') {
    // a new request while the last one is still undecided: keep that one, so every
    // request gets its own Before / After and its own Undo
    if (getState().pending) {
      checkpoint(getState().pending!.label, 'ai')
      patchTurn({ status: 'kept' })
    }
    const now = getState()
    const turn: AiTurn = {
      id: String(Date.now()),
      prompt: opts.display ?? opts.prompt.replace(/\. (This page is a|\(Funnel step type:).*$/, ''),
      images: reusedImages ? undefined : opts.images,
      scope: scope ? labelOf(scope) : mode === 'generate' ? 'New page' : 'Whole page',
      steps: [],
      status: 'working',
      changes: 0,
      startedAt: Date.now(),
    }
    setState({
      pending: { label, base: structuredClone(now.doc), changes: 0 },
      aiBusy: true,
      aiSteps: [],
      aiMessage: null,
      aiTurns: [...now.aiTurns, turn],
      aiTarget: scope?.id ?? null,
      threadOpen: true,
      editingId: null,
      compareBefore: false,
    })
  }

  const ctx: RunCtx = {
    copy: makeCopy(opts.prompt + ' ' + (opts.brief ? Object.values(opts.brief).join(' ') : ''), opts.brief?.business),
    lastSectionId: mode === 'generate' ? null : (s.doc.sections[s.doc.sections.length - 1]?.id ?? null),
    changes: 0,
    mode,
  }

  keyed = new Map()
  const apply = (op: Op) => applyOp(op, ctx, opts)
  const { connected } = await aiStatus()
  const live = connected && !opts.offline
  let usedLive = false

  // attached images are kept on the server (your logo, your photos): the page uses their address, the AI can reuse them later
  let uploaded = opts.images
  if (live && opts.images?.length) {
    uploaded = await Promise.all(
      opts.images.map(async (data) => {
        try {
          const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) })
          return ((await r.json()) as { url?: string }).url ?? data
        } catch {
          return data
        }
      }),
    )
    const note = (opts.display ?? opts.prompt).slice(0, 90)
    update((d) => void (d.brief = mergeBrief(d.brief, { assets: uploaded!.filter((u) => u.startsWith('/')).map((url) => ({ url, note })) })), { source: 'ai' })
  }

  if (live) {
    const ac = new AbortController()
    if (mode !== 'variations') controller = ac
    /** One stage of the AI (plan, build, review, edit…): its operations are applied as they arrive. */
    const stage = async (name: Stage, extra: Record<string, unknown> = {}): Promise<boolean> => {
      const st = getState()
      const res = await fetch('/api/ai', {
        method: 'POST',
        signal: ac.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: opts.prompt,
          stage: name,
          mode,
          brief: st.doc.brief ?? {},
          // the plan without the page written for it (that is on the page already)
          plan: st.doc.plan ? { ...st.doc.plan, page: undefined } : undefined,
          stepType: opts.brief?.stepType ?? st.doc.stepType,
          device: activeDevice(),
          selection: scope ? { ...(compact(scope) as object), path: path(st.doc, scope.id).map(labelOf) } : null,
          history: historyFor(st.aiTurns.slice(0, -1)),
          images: opts.images,
          page: st.doc.sections.length ? { title: st.doc.title, theme: st.doc.theme, sections: st.doc.sections.map(compact) } : null,
          ...((window as { __model?: string }).__model ? { model: (window as { __model?: string }).__model } : {}),
          ...((window as { __effort?: string }).__effort ? { effort: (window as { __effort?: string }).__effort } : {}),
          ...extra,
        }),
      })
      if (!res.ok) {
        // the service answered with a problem (no credits, bad key, busy): show it instead of pretending to be offline
        const line = (await res.text()).split('\n').find((l) => l.trim().startsWith('{'))
        let text = 'The AI service did not respond. Try again.'
        try {
          if (line) text = (JSON.parse(line) as { text?: string }).text ?? text
        } catch {
          /* keep the default */
        }
        apply({ op: 'error', text })
        setState({ aiBusy: false })
        finish(ctx, mode)
        patchTurn({ status: 'empty', endedAt: Date.now(), note: text })
        return false
      }
      if (!res.body) return false
      usedLive = true
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let nl: number
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          if (!line) continue
          try {
            apply(withUploads(parseLoose(line), uploaded) as Op)
          } catch {
            /* skip a malformed line, keep the rest */
          }
        }
      }
      return true
    }
    // the live AI writes its own reassurance line; the offline defaults ("Free. No card needed.") never leak into its pages,
    // and template photos it did not describe are planned from what the page is about (never a random stock photo)
    ctx.copy.ctaNote = ''
    ctx.live = true
    const about = getState().doc.brief?.offer ?? getState().doc.brief?.business ?? opts.prompt.slice(0, 120)
    ctx.copy.heroImage = `img:${about}, hero photo`
    ctx.copy.about = { ...ctx.copy.about, img: `img:the person behind ${about}, natural portrait` }
    try {
      if (mode === 'variations') await stage('variations')
      else if (mode === 'check') {
        say('Checking the page')
        await stage('check', { screenshot: await pageShot() })
      }
      // a new page, answers to its questions, or a whole-page rebuild (a selected section is edited where it is)
      else if (mode === 'generate' || opts.planned || (!scope && bigChange(opts.prompt))) {
        // a new page: two calls at once, the looks (quick) and the whole page (longer). Answering the looks builds
        // the page already written; an answer that changes the words is applied to it as an edit after
        ctx.asked = false
        ctx.composed = null
        const before = writing
        writing = null
        ac.signal.addEventListener('abort', () => before?.ac.abort())
        if (opts.planned && before) say('Writing your page')
        const kept = opts.planned ? (before ? await before.page : (getState().doc.plan?.page as ComposedPage | undefined)) : undefined
        if (kept?.sections?.length) {
          ctx.composed = kept
          usedLive = true
        } else {
          before?.ac.abort()
          if (mode === 'generate') {
            // a new page starts clean: the outline from the start, no plan or look from an earlier page (what the
            // AI knows about the business stays)
            resetJourney()
            update((d) => {
              d.plan = undefined
              if (d.brief) d.brief = { ...d.brief, look: undefined, shoot: undefined, anchors: undefined, pageType: undefined, direction: undefined }
            }, { source: 'ai' })
          }
          say('Writing your page')
          let asked = () => {}
          ctx.onAsk = new Promise<void>((r) => (asked = r))
          ctx.askedNow = asked
          // AI photos unless the page says otherwise (the switch lives in the page's settings)
          if (!getState().doc.brief?.photos) update((d) => void (d.brief = { ...d.brief, photos: 'ai' }), { source: 'ai' })
          // one call: the AI reads the request as a whole, decides the look and writes the page (no picking step)
          const page = stage('compose').then((ok) => (ok ? (ctx.composed ?? null) : null)).catch(() => null)
          if (!ctx.asked) await Promise.race([page, ctx.onAsk])
          // the looks (or a question) came first: the page goes on being written while you answer
          if (ctx.asked) writing = { page, ac }
          else await page
          // Stop was pressed while the page was being written: nothing is built, the first screen comes back
          if (ac.signal.aborted) throw Object.assign(new Error('stopped'), { name: 'AbortError' })
        }
        if (!ctx.asked && ctx.composed) {
          const fresh = mode === 'generate' || opts.planned || !scope
          const customs = await buildComposed(ctx.composed, ctx, opts, fresh)
          // photos start right away, while the rest is checked
          void fillPhotos()
          if (opts.planned && !opts.picks && !(kept === undefined)) {
            say('Applying your answers')
            await stage('edit')
          }
          if (customs.length) {
            // nothing is improvised outside the editor's elements: the part is named instead, so it can be added by hand
            applyOp({ op: 'reply', text: `I left out ${customs.map((c) => `"${c.name}"`).join(' and ')}: the editor has no ready section for ${customs.length === 1 ? 'it' : 'them'} yet. You can add ${customs.length === 1 ? 'it' : 'them'} from Elements, or tell me what should be there.` }, ctx, opts)
          }
          // the hard checks on desktop and phone: only real problems are fixed, nothing else is touched
          say('Checking it on desktop and phone')
          const looks = await Promise.all([lookAt(getState().doc, 'desktop'), lookAt(getState().doc, 'mobile')])
          const fails = [...structuralFails(getState().doc).filter((f) => f.check !== 'photos'), ...looks.flatMap((l) => l.facts.filter((f) => /overlaps|runs off|overflows|scrolls sideways|header is/.test(f)).map((detail) => ({ check: 'layout', detail })))]
          if (fails.length) {
            say(`Fixing ${fails.length} ${fails.length === 1 ? 'problem' : 'problems'}`)
            ctx.quiet = true
            await stage('review', { screenshots: looks, critique: { fixes: fails.map((f) => ({ id: 'page', device: 'all', problem: f.detail, fix: 'fix exactly this, nothing else' })) } })
            ctx.quiet = false
          }
          if (ctx.composed.done) applyOp({ op: 'reply', text: ctx.composed.done }, ctx, opts)
          // a new page: the outline list shows it as ready (sections to jump to, phone view, the conversion check)
          if (fresh && getState().doc.sections.length) {
            ctx.ready = true
            setState({ threadOpen: true })
            // back to the first screen, the part you picked
            document.querySelector('[data-canvas-scroller]')?.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
      } else await stage('edit')
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setState({ aiBusy: false })
        say('Stopped')
        finish(ctx, mode)
        patchTurn({ status: 'stopped' })
        return
      }
    }
  }

  // the built-in engine only stands in when the AI service is offline (never after a stopped or failed live request)
  if (!usedLive && !live && opts.images?.length) {
    applyOp({ op: 'error', text: 'Images need the AI service, which is offline right now.' }, ctx, opts)
  } else if (!usedLive && !live) {
    for (const op of localPlan(opts, mode, scope)) {
      await wait(op.op === 'addSection' ? (opts.offline ? 900 : 380) : opts.offline ? 420 : 120)
      apply(op)
    }
  }
  finish(ctx, mode)
}

function finish(ctx: RunCtx, mode: string) {
  if (mode === 'variations') return
  tidy(ctx)
  void fillPhotos()
  // a new page: the list on the left shows it as ready (its sections, the conversion check), until "Back to elements"
  if (ctx.ready) setJourney({ readyFor: getState().aiTurns[getState().aiTurns.length - 1]?.id })
  // a brand-new page is kept at once (no Keep / Undo against a blank page): the outline shows it as ready,
  // and History still holds "AI built the page" to go back
  const p = getState().pending
  if (p && !p.base.sections.length && ctx.changes && getState().doc.sections.length) {
    checkpoint(p.label, 'ai')
    setState({ pending: null, compareBefore: false })
  }
  const s = getState()
  setState({ aiBusy: false, aiSteps: s.aiSteps.map((x) => ({ ...x, done: true })) })
  window.setTimeout(() => setState({ aiTarget: null }), 700)
  const replied = !!getState().aiTurns[getState().aiTurns.length - 1]?.reply
  if (!ctx.changes && replied) {
    setState({ pending: null, aiMessage: null })
    patchTurn({ status: 'answered', endedAt: Date.now() })
    return
  }
  if (!ctx.changes) {
    setState({ pending: null })
    if (!getState().aiMessage) setState({ aiMessage: 'I could not find what to change for that. Click the part you mean and ask there, or tell me the section.' })
    patchTurn({ status: 'empty', endedAt: Date.now(), note: getState().aiMessage ?? undefined })
    return
  }
  setState((st) => (st.pending ? { pending: { ...st.pending, changes: ctx.changes } } : {}))
  patchTurn({ status: 'done', changes: ctx.changes, endedAt: Date.now() })
}

function patchTurn(patch: Partial<AiTurn>) {
  setState((s) => {
    const turns = [...s.aiTurns]
    const last = turns[turns.length - 1]
    if (!last) return {}
    turns[turns.length - 1] = { ...last, ...patch, steps: patch.steps ?? last.steps.map((x) => (patch.status && patch.status !== 'working' ? { ...x, done: true } : x)) }
    return { aiTurns: turns }
  })
}

export function keepAI() {
  const p = getState().pending
  if (!p) return
  checkpoint(p.label, 'ai')
  setState({ pending: null, aiSteps: [], aiMessage: null, compareBefore: false })
  patchTurn({ status: 'kept' })
  toast('Kept the AI changes')
}

export function discardAI() {
  const p = getState().pending
  if (!p) return
  stopAI()
  // the page goes back; what the AI learned about the business stays
  const { brief, plan } = getState().doc
  update((d) => Object.assign(d, structuredClone(p.base), { brief, plan }))
  setState({ pending: null, aiSteps: [], aiMessage: null, selectedId: null })
  patchTurn({ status: 'discarded' })
  toast('Discarded the AI changes')
}

function say(text: string) {
  const step: AiStep = { id: String(Date.now() + Math.random()), text, done: false }
  setState((s) => {
    const turns = [...s.aiTurns]
    const last = turns[turns.length - 1]
    if (last && last.status === 'working') turns[turns.length - 1] = { ...last, steps: [...last.steps.map((x) => ({ ...x, done: true })), step] }
    return { aiSteps: [...s.aiSteps.map((x) => ({ ...x, done: true })), step], aiMessage: text, aiTurns: turns }
  })
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ---------------- Applying operations ---------------- */

const PAGE_LEVEL: SectionKind[] = ['header', 'hero', 'cta', 'footer', 'countdown']

function applyOp(op: Op, ctx: RunCtx, opts: RunOptions) {
  switch (op.op) {
    case 'say':
      return say(op.text)
    case 'reply':
      if (ctx.quiet) return
      if (typeof op.text === 'string' && op.text.trim()) setState((st) => {
        const turns = [...st.aiTurns]
        const last = turns[turns.length - 1]
        if (last) turns[turns.length - 1] = { ...last, reply: (last.reply ? last.reply + '\n\n' : '') + op.text.trim() }
        return { aiTurns: turns }
      })
      return
    case 'insert': {
      const raw0 = normalizeNode(op.node, op.parent === 'page' ? 'section' : undefined)
      if (!raw0) return
      // never placed in a form the editor can't select or edit (it is put right first)
      const node = fixNode(raw0, getState().doc.theme)[0]
      if (!node) return
      ctx.changes++
      const parentRef = resolveRef(op.parent)
      const afterRef = resolveRef(op.after)
      update(
        (d) => {
          const parentId = parentRef === 'page' || !parentRef ? ROOT : parentRef
          const list = parentId === ROOT ? d.sections : find(d, parentId)?.children
          if (!list) return
          let item = node
          if (parentId === ROOT && item.type !== 'section') item = section('blank', 'light', [item.type === 'row' ? item : row([[item]])], { paddingY: 80, gap: 24 })
          // a quote or price box put inside a card goes flat, so there is only one card (never a box in a box)
          const host = parentId === ROOT ? null : find(d, parentId)
          const boxed = (st?: Style) => !!st && ((st.borderType && st.borderType !== 'none') || !!st.background || (!!st.shadow && st.shadow !== 'none'))
          if (host && boxed(host.style.desktop))
            walk([item], (k) => void ((k.type === 'quote' || k.type === 'price') && k.style.desktop.borderType === undefined && Object.assign(k.style.desktop, { borderType: 'none', background: 'transparent', pad: [0, 0, 0, 0], shadow: 'none' })))
          const i = afterRef === 'start' ? 0 : afterRef && afterRef !== 'end' ? list.findIndex((x) => x.id === afterRef) + 1 : list.length
          list.splice(i <= 0 && afterRef !== 'start' ? list.length : i, 0, item)
        },
        { source: 'ai' },
      )
      // name the step only if the model did not announce it with a "say"
      const last = getState().aiSteps[getState().aiSteps.length - 1]
      if (!last || last.target) say(labelOf(node))
      markBuilding(node.id)
      ;(ctx.built ??= new Set()).add(node.id)
      return
    }
    case 'replace': {
      const raw1 = normalizeNode(op.node)
      const node = raw1 ? fixNode(raw1, getState().doc.theme)[0] : null
      const rid = resolveRef(op.id)!
      if (!node || !find(getState().doc, rid)) return
      ctx.changes++
      update(
        (d) => {
          const p = parentOf(d, rid)
          if (p) p.list.splice(p.index, 1, node)
        },
        { source: 'ai' },
      )
      if (getState().selectedId === rid) setState({ selectedId: node.id })
      markBuilding(node.id)
      ;(ctx.built ??= new Set()).add(node.id)
      return
    }
    case 'error':
      setState({ aiMessage: op.text })
      return
    case 'recipe': {
      if (!op.copy || typeof op.copy.headline !== 'string') return
      const node = fixNode(buildRecipe(String(op.name), op.copy, op.knobs ?? {}, getState().doc.theme), getState().doc.theme)[0]
      // the soft block colour is written as a real colour (so the colour picker shows and edits it like any other)
      const t = getState().doc.theme
      walk([node], (n) => {
        for (const st of [n.style.desktop, n.style.tablet, n.style.mobile])
          if (st?.background?.startsWith('color-mix(')) st.background = mixHex(t.primary, t.bg, 0.14)
      })
      // proof written without real proof in the brief is flagged as a sample until replaced
      if (!getState().doc.brief?.proof?.length) walk([node], (n) => void (['quote', 'stat', 'logos'].includes(n.type) && (n.props.sample = true)))
      ctx.changes++
      const target = op.replace ? resolveRef(op.replace) : undefined
      update(
        (d) => {
          if (target) {
            const i = d.sections.findIndex((x) => x.id === target)
            if (i >= 0) return void d.sections.splice(i, 1, node)
          }
          const after = op.after && op.after !== 'end' ? resolveRef(op.after) : ctx.lastSectionId
          const i = op.after === 'start' ? -1 : after ? d.sections.findIndex((x) => x.id === after) : d.sections.length - 1
          d.sections.splice(op.after === 'start' ? 0 : i >= 0 ? i + 1 : d.sections.length, 0, node)
        },
        { source: 'ai' },
      )
      ctx.lastSectionId = node.id
      markBuilding(node.id)
      ;(ctx.built ??= new Set()).add(node.id)
      return
    }
    case 'section': {
      // a new page, section by section as the AI writes it (a rebuild of an existing page waits for the whole answer)
      if (ctx.mode !== 'generate' || opts.planned || !op.section || typeof op.index !== 'number') return
      if (op.section.recipe === 'custom' || !op.section.copy) return
      if (!ctx.streamed) {
        ctx.streamed = new Set()
        update((d) => void (d.sections = []), { source: 'ai' })
        ctx.lastSectionId = null
      }
      if (ctx.streamed.has(op.index)) return
      ctx.streamed.add(op.index)
      const sec = op.section
      ctx.queue = (ctx.queue ?? Promise.resolve()).then(async () => {
        await buildWritten(sec, ctx, opts)
        // its photos start now, while the next section is still being written
        void fillPhotos()
      })
      return
    }
    case 'restart':
      // the answer broke off and is being written again: what it had sent is taken off the page
      if (ctx.streamed) {
        ctx.queue = (ctx.queue ?? Promise.resolve()).then(() => {
          update((d) => void (d.sections = []), { source: 'ai' })
          ctx.streamed = new Set()
          ctx.lastSectionId = null
          ctx.heroDone = false
        })
      }
      return
    case 'preview':
      if (Array.isArray(op.sections) && op.sections.length) {
        setJourney({ preview: op.sections })
        // the first screen's photo is made now, while you choose a look: the looks show it, the page reuses it
        const hero = op.sections.find((x) => x.recipe.startsWith('hero'))
        const want = hero?.copy?.photo
        if (typeof want === 'string' && want.startsWith('img:') && getState().doc.brief?.photos !== 'own') void earlyPhoto(want, hero!.recipe)
      }
      return
    case 'look': {
      // a look arrives before the others: shown at once (the full set replaces these when the answer completes)
      const hex = /^#[0-9a-f]{6}$/i
      const d = op.direction
      if (!d || typeof d.name !== 'string' || !hex.test(d.bg) || !hex.test(d.ink) || !hex.test(d.accent)) return
      setJourney((j) => {
        const looks = [...j.looks]
        looks[op.index] = d
        return { looks }
      })
      return
    }
    case 'compose': {
      if (!op.page || !Array.isArray(op.page.sections)) return
      ctx.composed = op.page
      const pg = op.page
      // the plan and the writing are kept with the page: answering a question (photos, the look) builds it as it is
      update((d) => {
        d.plan = { promise: pg.promise, sections: pg.sections.map((x) => ({ name: x.name, job: x.job })), page: pg } as PagePlan
        d.brief = mergeBrief(d.brief, { ...(pg.pageType ? { pageType: pg.pageType } : {}), ...(pg.direction ? { direction: pg.direction } : {}) })
        if (pg.shoot) d.brief = { ...d.brief, shoot: pg.shoot, anchors: {} }
      }, { source: 'ai' })
      return
    }
    case 'critique':
      ctx.critique = op.review
      if (typeof op.review?.total === 'number') say(`Critic's score: ${Math.round(op.review.total * 10) / 10} / 10${op.review.fixes?.length ? ` · ${op.review.fixes.length} fixes` : ''}`)
      return
    case 'remember':
      // what the AI learned: kept with the page (its memory), never undone with the page changes. A new page about
      // another business starts its facts over (the logo, uploads, photos choice and rules stay)
      if (op.brief && typeof op.brief === 'object')
        update((d) => {
          const nb = op.brief as PageBrief
          const was = d.brief?.business?.trim().toLowerCase()
          const switched = !d.sections.length && !!nb.business && !!was && nb.business.trim().toLowerCase() !== was
          const base: PageBrief | undefined = switched ? { logo: d.brief?.logo, assets: d.brief?.assets, photos: d.brief?.photos, decisions: d.brief?.decisions } : d.brief
          d.brief = mergeBrief(base, nb)
        }, { source: 'ai' })
      return
    case 'plan': {
      if (!op.plan || typeof op.plan !== 'object') return
      ctx.plan = op.plan
      const { pageType, direction, shoot, ...plan } = op.plan as typeof op.plan & { shoot?: PageBrief['shoot'] }
      update((d) => {
        d.plan = plan
        d.brief = mergeBrief(d.brief, { ...(pageType ? { pageType } : {}), ...(direction ? { direction } : {}) })
        // one art direction for every photo of the page (a new plan makes a new shoot)
        if (shoot && typeof shoot === 'object') d.brief = { ...d.brief, shoot, anchors: {} }
      }, { source: 'ai' })
      return
    }
    case 'ask': {
      const qs = (op.questions ?? []).filter((q) => q && typeof q.q === 'string').map((q, i) => ({ id: String(q.id ?? i), q: q.q, options: (q.options ?? []).filter((o) => typeof o === 'string').slice(0, 4) }))
      const hex = /^#[0-9a-f]{6}$/i
      const dirs = (op.directions ?? []).filter((d) => d && typeof d.name === 'string' && hex.test(d.bg) && hex.test(d.ink) && hex.test(d.accent)).slice(0, 4)
      // "Recommended" is shown as a tag: the AI's own word for it is taken out of the description
      for (const d of dirs) if (d.feeling) d.feeling = d.feeling.replace(/^\s*(recommended|best fit|top pick)\s*[:,.\-–—]\s*/i, '').replace(/^./, (c) => c.toUpperCase())
      // four looks, four first-screen layouts (a look that repeats another's layout gets the next one free)
      // (within what the page kind allows: an opt-in page keeps a form on its first screen, an event its facts)
      const kind = `${getState().doc.brief?.pageType ?? ''} ${getState().doc.stepType ?? ''}`.toLowerCase()
      const family = /opt-?in|lead magnet|sign-?up|squeeze/.test(kind) ? 'optin' : /webinar|event|masterclass|workshop|live/.test(kind) ? 'event' : 'general'
      const HEROES = HERO_FAMILIES[family]
      const used = new Set<string>()
      for (const d of dirs) {
        if (!d.hero || !HEROES.includes(d.hero) || used.has(d.hero)) d.hero = HEROES.find((h) => !used.has(h)) ?? HEROES[used.size % HEROES.length]
        used.add(d.hero!)
      }
      if (!qs.length && !dirs.length) return
      ctx.asked = true
      patchTurn({ questions: qs, directions: dirs.length ? dirs : undefined })
      ctx.askedNow?.()
      return
    }
    case 'score': {
      const fixes = (op.fixes ?? []).filter((f) => f && typeof f.title === 'string' && typeof f.prompt === 'string').slice(0, 3)
      const score = Math.max(0, Math.min(100, Math.round(Number(op.score) || 0)))
      patchTurn({ score: { score, summary: op.summary, fixes }, reply: op.summary ?? ' ' })
      opts.onScore?.({ ...op, score, fixes })
      return
    }
    case 'options':
      opts.onOptions?.(op.items.filter((x) => typeof x === 'string').slice(0, 4))
      return
    case 'seo':
      ctx.changes++
      say('SEO title and description')
      update(
        (d) => {
          d.settings = { ...defaultSettings(), ...d.settings }
          if (op.title) d.settings.seoTitle = op.title
          if (op.description) d.settings.seoDescription = op.description
          if (op.keywords) d.settings.seoKeywords = op.keywords
        },
        { source: 'ai' },
      )
      return
    case 'title':
      ctx.changes++
      return update((d) => void (d.title = op.text), { source: 'ai' })
    case 'theme': {
      ctx.changes++
      const patch = sanitizeTheme(op.patch)
      // the look you picked wins over whatever the model wrote
      const look = getState().doc.brief?.look
      if (look) Object.assign(patch, lookTheme(look))
      return update((d) => {
        Object.assign(d.theme, patch)
        // the page's own colour settings would hide the new look: the ones the new theme replaces are cleared
        if (d.settings) {
          if (patch.bg) delete d.settings.background
          if (patch.ink) (delete d.settings.textColor, delete d.settings.headingColor)
          if (patch.primary) delete d.settings.linkColor
        }
      }, { source: 'ai' })
    }
    case 'addSection':
    case 'replaceSection': {
      if (!BLOCK_KINDS.includes(op.kind)) return
      // the live AI writes its own words: a template's built-in English text would leak into the page
      if (ctx.live && !op.copy) return
      const { node } = sectionFromOp(op, ctx)
      if (op.tone && ['light', 'muted', 'dark', 'brand'].includes(op.tone)) node.props.tone = op.tone
      // proof written for the look (no real proof given yet) is flagged as a sample until replaced
      if (!getState().doc.brief?.proof?.length) walk([node], (n) => void (['quote', 'stat', 'logos'].includes(n.type) && (n.props.sample = true)))
      ctx.changes++
      update(
        (d) => {
          if (op.op === 'replaceSection') {
            const i = d.sections.findIndex((x) => x.id === op.id)
            if (i >= 0) d.sections.splice(i, 1, node)
            else d.sections.push(node)
            if (getState().selectedId && path(d, getState().selectedId).length === 0) setState({ selectedId: node.id })
            return
          }
          const after = op.after && op.after !== 'end' ? op.after : ctx.lastSectionId
          const i = after ? d.sections.findIndex((x) => x.id === after) : -1
          if (op.after === 'start') d.sections.unshift(node)
          else if (i >= 0) d.sections.splice(i + 1, 0, node)
          else d.sections.push(node)
        },
        { source: 'ai' },
      )
      ctx.lastSectionId = node.id
      markBuilding(node.id)
      ;(ctx.built ??= new Set()).add(node.id)
      return
    }
    case 'setProps': {
      // recipe inputs are not element props (a recipe section is changed through its elements)
      if (op.props) for (const k of ['copy', 'knobs', 'name']) delete (op.props as Record<string, unknown>)[k]
      if (!op.props || !Object.keys(op.props).length) return
      let rid = resolveRef(op.id)!
      const target = find(getState().doc, rid)
      if (!target) return
      ctx.changes++
      const MEDIA = ['image', 'video', 'audio', 'quote', 'icon']
      // an image address given to a row, a column or a section goes to the image inside it (or a new one at its start)
      if (typeof op.props?.src === 'string' && !MEDIA.includes(target.type)) {
        let img: Node | undefined
        walk([target], (n) => void (!img && n.type === 'image' && (img = n)))
        if (img) rid = img.id
        else {
          const created = el('image', { src: op.props.src, alt: String(op.props.alt ?? ''), aspect: 0 }, { maxWidth: 160, fullWidth: false })
          update((d) => {
            const t = find(d, rid)
            let col: Node | undefined
            if (t) walk([t], (n) => void (!col && n.type === 'column' && (col = n)))
            const host = col ?? (t && ['column', 'contentbox'].includes(t.type) ? t : undefined)
            if (host) (host.children ??= []).unshift(created)
          }, { source: 'ai' })
          return markBuilding(created.id, 900)
        }
      }
      update((d) => {
        const n = find(d, rid)
        if (n) Object.assign(n.props, op.props)
      }, { source: 'ai' })
      return markBuilding(rid, 900)
    }
    case 'setStyle': {
      const rid = resolveRef(op.id)!
      if (!find(getState().doc, rid)) return
      ctx.changes++
      update((d) => {
        const n = find(d, rid)
        if (!n) return
        const dev = op.device ?? 'desktop'
        const bucket = dev === 'desktop' ? n.style.desktop : (n.style[dev] ??= {})
        Object.assign(bucket, op.style)
      }, { source: 'ai' })
      return markBuilding(rid, 900)
    }
    case 'remove':
      if (!find(getState().doc, op.id)) return
      ctx.changes++
      update((d) => void remove(d, op.id), { source: 'ai' })
      return
    case 'move':
      ctx.changes++
      update((d) => {
        const p = parentOf(d, op.id)
        if (!p) return
        const to = p.index + op.dir
        if (to < 0 || to >= p.list.length) return
        const [n] = p.list.splice(p.index, 1)
        p.list.splice(to, 0, n)
      }, { source: 'ai' })
      return
  }
}

function sectionFromOp(op: Extract<Op, { op: 'addSection' | 'replaceSection' }>, ctx: RunCtx) {
  const c = op.copy ?? {}
  const { eyebrow, headline, sub, imageQuery, ...rest } = c
  const heading: SectionHeading = {}
  const merged: Copy = { ...ctx.copy, ...stripUndefined(rest) }
  if (PAGE_LEVEL.includes(op.kind)) {
    if (eyebrow) merged.eyebrow = eyebrow
    if (headline) {
      if (op.kind === 'cta') merged.ctaHeadline = headline
      else merged.headline = headline
    }
    if (sub) {
      if (op.kind === 'cta') merged.ctaSub = sub
      else merged.sub = sub
    }
  } else {
    Object.assign(heading, stripUndefined({ eyebrow, headline, sub }))
  }
  if (imageQuery) {
    // a planned photo: created by the AI or left for the user, once the page is built
    if (op.kind === 'hero') merged.heroImage = `img:${imageQuery}`
    else merged.about = { ...merged.about, img: `img:${imageQuery}` }
  }
  if (rest.about) merged.about = { ...ctx.copy.about, ...rest.about, img: merged.about.img }
  // keep page-level copy so later sections (sign-up, footer) stay consistent
  if (PAGE_LEVEL.includes(op.kind) || op.kind === 'header') ctx.copy = merged
  if (rest.brand) ctx.copy.brand = rest.brand
  const v = Math.max(0, Math.min(2, op.variant ?? 0))
  return { node: buildSection(op.kind, merged, v, heading) }
}

/**
 * Long structures sometimes come back with one bracket too many or too few.
 * Re-balance brackets outside strings instead of losing the whole section.
 */
function parseLoose(line: string): unknown {
  try {
    return JSON.parse(line)
  } catch {
    const out: string[] = []
    const stack: string[] = []
    let inStr = false
    let esc = false
    for (const ch of line) {
      if (inStr) {
        out.push(ch)
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inStr = false
        continue
      }
      if (ch === '"') {
        inStr = true
        out.push(ch)
      } else if (ch === '{' || ch === '[') {
        stack.push(ch === '{' ? '}' : ']')
        out.push(ch)
      } else if (ch === '}' || ch === ']') {
        const at = stack.lastIndexOf(ch)
        if (at < 0) continue // stray closer: drop it
        while (stack.length > at + 1) out.push(stack.pop()!) // close what was left open
        stack.pop()
        out.push(ch)
      } else out.push(ch)
    }
    while (stack.length) out.push(stack.pop()!)
    return JSON.parse(out.join('').replace(/,\s*([}\]])/g, '$1'))
  }
}

/** "upload:2" in anything the model writes means the user's second attached image. */
function withUploads(v: unknown, images?: string[]): unknown {
  if (!images?.length) return v
  if (typeof v === 'string') {
    const m = v.match(/^upload:(\d+)$/)
    return m ? (images[Number(m[1]) - 1] ?? v) : v
  }
  if (Array.isArray(v)) return v.map((x) => withUploads(x, images))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withUploads(x, images)]))
  return v
}

/**
 * "crop:1:0.02,0.21,0.47,0.14" anywhere a photo goes means that part of the first attached image (fractions of its
 * width and height from the top-left corner): it is cut out here and kept as a file, so a page copied from a
 * screenshot keeps its real product pictures.
 */
const cropCache = new Map<string, string>()
const CROP_FALLBACK = 'img:the picture shown at this place in the reference'
async function withCrops<T>(v: T, images?: string[]): Promise<T> {
  if (typeof v === 'string') {
    const m = v.match(/^crop:(\d+):([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/)
    if (!m) return v
    const src = images?.[Number(m[1]) - 1]
    const box = m.slice(2).map(Number) as [number, number, number, number]
    if (!src?.startsWith('data:image/') || box.some((x) => !(x >= 0 && x <= 1)) || box[2] < 0.04 || box[3] < 0.02) return CROP_FALLBACK as T
    return (await cropUpload(v, src, box)) as T
  }
  if (Array.isArray(v)) return (await Promise.all(v.map((x) => withCrops(x, images)))) as T
  if (v && typeof v === 'object') return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([k, x]) => [k, await withCrops(x, images)]))) as T
  return v
}
async function cropUpload(key: string, src: string, [x, y, w, h]: [number, number, number, number]): Promise<string> {
  const hit = cropCache.get(key)
  if (hit) return hit
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => no(new Error('image'))
      i.src = src
    })
    const W = img.naturalWidth
    const H = img.naturalHeight
    const sx = Math.round(x * W)
    const sy = Math.round(y * H)
    const sw = Math.max(1, Math.round(Math.min(w, 1 - x) * W))
    const sh = Math.max(1, Math.round(Math.min(h, 1 - y) * H))
    const c = document.createElement('canvas')
    c.width = sw
    c.height = sh
    c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: c.toDataURL('image/png') }) })
    const url = ((await r.json()) as { url?: string }).url
    if (!url) throw new Error('upload')
    cropCache.set(key, url)
    return url
  } catch {
    return CROP_FALLBACK
  }
}

/** Line breaks the model wrote ("\n") become real breaks in headlines and lines (never inside quotes, lists or names). */
const BR_KEYS = new Set(['headline', 'sub', 'eyebrow', 'note', 'byline', 'paragraphs', 'title', 'text'])
// (a quote's words are shown as plain text with their own line breaks; names, links and labels never break)
const NO_BR = new Set(['quote', 'quotes', 'faqs', 'plans', 'fit', 'card', 'price', 'stats', 'groups', 'links', 'labels', 'logos', 'social', 'bullets', 'facts'])
function breaks<T>(v: T, under?: string): T {
  if (under === '-') return v
  if (typeof v === 'string') return (under && BR_KEYS.has(under) && v.includes('\n') ? v.replace(/\s*\n+\s*/g, '<br>') : v) as T
  if (Array.isArray(v)) return v.map((x) => breaks(x, under)) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, breaks(x, NO_BR.has(k) ? '-' : k)])) as T
  return v
}

/** Earlier turns as a short chat history for the model. */
function historyFor(turns: AiTurn[]) {
  const out: { role: 'user' | 'assistant'; text: string }[] = []
  for (const t of turns.slice(-8)) {
    out.push({ role: 'user', text: `${t.prompt} (about: ${t.scope})${t.images?.length ? ` [attached ${t.images.length} image${t.images.length > 1 ? 's' : ''}]` : ''}` })
    const did = t.steps.map((x) => x.text).filter(Boolean)
    const asked = t.questions?.length ? `I asked: ${t.questions.map((q) => `${q.q} (${q.options.join(' / ')})`).join('; ')}` : ''
    const parts = [t.reply, asked, did.length ? `Changes made: ${did.join(', ')}.` : '', t.status === 'discarded' ? 'The user undid these changes.' : t.status === 'kept' ? 'The user kept these changes.' : '']
    out.push({ role: 'assistant', text: parts.filter(Boolean).join(' ') || 'Done.' })
  }
  return out
}

/** a share of colour a blended into colour b, as #hex */
function mixHex(a: string, b: string, share: number) {
  const rgb = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : [128, 128, 128])
  const [x, y] = [rgb(a), rgb(b)]
  return '#' + x.map((v, i) => Math.round(v * share + y[i] * (1 - share)).toString(16).padStart(2, '0')).join('')
}

/** Add what the AI learned to what it knew: fields are replaced, lists grow (without repeats). */
function mergeBrief(old: PageBrief | undefined, add: PageBrief): PageBrief {
  const out: PageBrief = { ...old }
  for (const [k, v] of Object.entries(add) as [keyof PageBrief, unknown][]) {
    if (v === undefined || v === null || v === '') continue
    if (k === 'assets' && Array.isArray(v)) {
      const prev = out.assets ?? []
      for (const x of v as { url: string; note?: string }[]) if (x?.url && !prev.some((p) => p.url === x.url)) prev.push({ url: x.url, note: x.note })
      out.assets = prev.slice(-20)
      continue
    }
    if (Array.isArray(v)) {
      const prev = (out[k] as string[] | undefined) ?? []
      const next = [...prev]
      for (const x of v) if (typeof x === 'string' && x.trim() && !next.some((y) => y.toLowerCase() === x.toLowerCase())) next.push(x.trim())
      ;(out as Record<string, unknown>)[k] = next.slice(-12)
    } else if (typeof v === 'string') (out as Record<string, unknown>)[k] = v
  }
  return out
}

/**
 * What the AI built is left tidy: a column it left empty next to filled ones goes (the dashed box nobody asked for),
 * and a row left with nothing in it goes too.
 */
function tidy(ctx: RunCtx) {
  // whatever the AI changed, the page stays editable by hand, in order, and free of placeholder words
  if (ctx.changes) update((d) => void (fixStructure(d), keepOrder(d), cleanCopy(d)), { source: 'ai' })
  if (!ctx.built?.size) return
  const ids = ctx.built
  update(
    (d) => {
      // something with nothing to show (an empty card, a column of empty cards) never stays on the page
      // (a form's fields and consent box count: without them the form would be stripped to its button)
      const LEAF = new Set(['headline', 'text', 'image', 'button', 'list', 'quote', 'form', 'input', 'checkbox', 'recaptcha', 'xshare', 'faq', 'price', 'video', 'icon', 'menu', 'countdown', 'stat', 'logos', 'calendar', 'survey', 'carousel', 'rawhtml', 'audio', 'product', 'paybutton'])
      const hasContent = (n: Node): boolean => LEAF.has(n.type) || !!n.children?.some(hasContent)
      const clean = (n: Node) => {
        n.children?.forEach(clean)
        if (n.children && n.type !== 'section') n.children = n.children.filter((c) => c.type === 'divider' || c.type === 'spacer' || hasContent(c))
        if (n.type === 'row' && n.children && n.children.some((c) => c.children?.length)) n.children = n.children.filter((c) => c.type !== 'column' || c.children?.length)
        if (n.children) n.children = n.children.filter((c) => !(c.type === 'row' && !c.children?.some((k) => k.children?.length)))
      }
      walk(d.sections, (n) => void (ids.has(n.id) && clean(n)))
    },
    { source: 'ai' },
  )
}

/** The closing call to action is the last thing before the footer: anything the AI placed after it moves above it. */
function keepOrder(d: PageDoc) {
  const isClose = (n: Node) => n.props.recipe === 'close-cta' || (n.props.kind === 'cta' && n === d.sections[d.sections.length - 1])
  const isFoot = (n: Node) => n.props.kind === 'footer' || /footer/i.test(String(n.props.kind ?? ''))
  const i = d.sections.findIndex((n) => n.props.recipe === 'close-cta')
  if (i < 0) return
  const after = d.sections.slice(i + 1).filter((n) => !isFoot(n) && !isClose(n))
  if (!after.length) return
  d.sections = [...d.sections.slice(0, i).concat(after), d.sections[i], ...d.sections.slice(i + 1).filter((n) => isFoot(n))]
}

const NAMES = ['Maya R.', 'Daniel S.', 'Priya K.', 'Tom W.', 'Lucía M.', 'Amara O.', 'Jonas B.', 'Sofia L.']
const PLACEHOLDER = /^(sample|placeholder|client|customer|student|user|name)( (student|client|customer|name|testimonial|person))?\b/i
const META = /(marked as sample|sample until|replace (it|this|with)|placeholder|lorem ipsum|before publishing)/i

/** Words that only make sense to the person editing never reach the page ("Sample student", "replace before publishing"). */
function cleanCopy(d: PageDoc) {
  // the same photo never shows twice: a repeat becomes a new photo of its own (described by its alt text)
  const seen = new Set<string>()
  walk(d.sections, (n) => {
    const src = n.type === 'image' ? n.props.src : undefined
    if (typeof src !== 'string' || !src || (n.props.aspect ?? 1) === 0 || src.startsWith('brand:')) return
    if (seen.has(src)) n.props.src = `img:${n.props.alt || 'a different detail of the same story'}, a different moment and framing`
    seen.add(n.props.src as string)
  })
  // a testimonial card draws its own five stars: stars written into its words, and star-only texts or star icons
  // placed beside a quote, are dropped
  const STARS = /[★☆⭐✩✭✮]/
  const onlyStars = (t: unknown) => typeof t === 'string' && /^[★☆⭐✩✭✮*\s]+$/.test(t)
  walk(d.sections, (n) => {
    if (n.type === 'quote') for (const key of ['text', 'author', 'role'] as const) if (typeof n.props[key] === 'string' && STARS.test(n.props[key]!)) n.props[key] = n.props[key]!.replace(/[★☆⭐✩✭✮]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (n.children?.some((c) => c.type === 'quote')) n.children = n.children.filter((c) => !((c.type === 'text' && onlyStars(c.props.text)) || (c.type === 'icon' && c.props.icon === 'star')))
  })
  let k = 0
  walk(d.sections, (n) => {
    const p = n.props as Record<string, unknown>
    if (typeof p.author === 'string' && PLACEHOLDER.test(p.author.trim())) (p.author = NAMES[k++ % NAMES.length]), (p.sample = true)
    if (typeof p.role === 'string' && META.test(p.role)) p.role = ''
    // a name line written as "Sample student" in a text element (a quote's byline)
    if (n.type === 'text' && typeof p.text === 'string' && p.text.length < 30 && /^(sample|placeholder)\b/i.test(p.text.trim())) p.text = NAMES[k++ % NAMES.length]
    for (const key of ['text', 'subtext', 'note'] as const) if (typeof p[key] === 'string' && META.test(p[key] as string) && (p[key] as string).length < 90) p[key] = ''
  })
}

/* ---------------- Building the page the AI wrote (compose) ---------------- */


export interface ComposedPage {
  pageType?: string
  direction?: string
  title?: string
  promise?: string
  leads?: string
  theme?: Partial<PageDoc['theme']>
  shoot?: PageBrief['shoot']
  sections: { name: string; job: string; recipe: string; knobs?: Record<string, unknown>; copy?: Record<string, unknown>; custom?: string | null }[]
  done?: string
}

/** nulls and empty lists out (the strict answer spells every field) */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== null && x !== undefined) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null && !(Array.isArray(x) && !x.length)).map(([k, x]) => [k, clean(x)])) as T
  return v
}

/**
 * The page from one answer: the look, the title, then each designed section in order (a moment apart, so you see it
 * arrive). Returns the custom sections still to build, each with the section it goes after.
 */
async function buildComposed(pg: ComposedPage, ctx: RunCtx, opts: RunOptions, fresh: boolean) {
  // the sections sent while the answer was being written are on the page already; the rest follow them
  await ctx.queue
  const streamed = ctx.streamed ?? new Set<number>()
  if (fresh && !streamed.size) {
    update((d) => void (d.sections = []), { source: 'ai' })
    ctx.lastSectionId = null
  }
  if (pg.theme) applyOp({ op: 'theme', patch: clean(pg.theme) }, ctx, opts)
  if (pg.title) applyOp({ op: 'title', text: pg.title }, ctx, opts)
  const customs: { name: string; job: string; build: string; after: string | 'start' }[] = []
  for (const [i, sec] of pg.sections.entries()) {
    // the editor's own designed sections only: a section no recipe covers is left out and said in the reply
    if (sec.recipe === 'custom' || !sec.copy) {
      customs.push({ name: sec.name, job: sec.job, build: sec.custom ?? sec.job, after: ctx.lastSectionId ?? 'start' })
      continue
    }
    if (streamed.has(i)) continue
    await buildWritten(sec, ctx, opts)
    // a moment apart, so each section is seen arriving (the words are already written)
    await wait(180)
  }
  return customs
}

/** One written section onto the page, after the last one built: the logo in its place, the picked look on the first screen. */
async function buildWritten(sec: ComposedPage['sections'][number], ctx: RunCtx, opts: RunOptions) {
  const logo = getState().doc.brief?.logo
  // the logo you gave: in the header and footer, never as a photo anywhere
  if (sec.copy && logo) {
    if (sec.recipe === 'header' || sec.recipe === 'footer') sec.copy.logo = logo
    if (sec.copy.photo === logo) delete sec.copy.photo
  }
  say(sec.name)
  // the first screen is built exactly as the look you picked showed it (its layout, on its own background)
  const look = getState().doc.brief?.look
  const isHero = heroFamily(sec.recipe) !== null
  // (a first screen that holds the sign-up form or the event's date keeps its own layout: the form must stay)
  const asPicked = isHero && !ctx.heroDone && !!look?.hero && heroFamily(look.hero) === heroFamily(sec.recipe)
  if (isHero) ctx.heroDone = true
  const name = asPicked ? look!.hero! : sec.recipe
  const knobs = { ...(clean(sec.knobs ?? {}) as RecipeKnobs), ...(asPicked ? { size: 'big', tone: 'light' } : {}) } as RecipeKnobs
  // pictures cut from a reference screenshot become files; line breaks the model wrote become real ones
  const copy = breaks(await withCrops(clean(sec.copy ?? {}), opts.images)) as unknown as RecipeCopy
  applyOp({ op: 'recipe', name, knobs, copy, after: ctx.lastSectionId ?? 'start' }, ctx, opts)
}

/* ---------------- Photos the AI planned ("img:<description>") ---------------- */

const making = new Set<string>()

/**
 * When the user chose AI photos for this page, every planned photo is created (three at a time) and put in place
 * as soon as it is ready; until then the editor shows "Creating photo…". With "I'll add my own", the planned photos
 * stay as empty images that say what to add.
 */
/** The first screen's photo, made as soon as its description is written (the looks show it; the page reuses the file). */
async function earlyPhoto(marker: string, recipe: string) {
  if (making.has(marker)) return
  making.add(marker)
  try {
    const b = getState().doc.brief
    const t = getState().doc.theme
    const aspect = recipe === 'hero-fullbleed' || recipe === 'hero-optin-card' ? 1.6 : recipe === 'hero-bigtype' ? 2.4 : recipe === 'hero-showcase' ? 1.7 : 0.8
    const id = marker.slice(4).match(/^\s*\[([\w-]+)\]/)?.[1]
    const r = await fetch('/api/photo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: marker.slice(4).trim(), aspect, direction: b?.direction, shoot: b?.shoot, palette: [t.primary, t.surface, t.bg] }) })
    const { url } = (await r.json()) as { url?: string }
    if (!url) return
    setJourney({ heroPhoto: { from: marker, url } })
    if (id && !getState().doc.brief?.anchors?.[id]) update((d) => void (d.brief = { ...d.brief, anchors: { ...d.brief?.anchors, [id]: url } }), { source: 'ai' })
    // the page, if it is already there, takes the photo too
    update((d) => walk(d.sections, (n) => void (n.props.src === marker && (n.props.src = url))), { source: 'ai' })
  } catch {
    /* the photo comes with the others later */
  } finally {
    making.delete(marker)
  }
}

export async function fillPhotos() {
  const doc = getState().doc
  if (doc.brief?.photos !== 'ai') return
  const want = new Map<string, number>()
  walk(doc.sections, (n) => {
    // a photo that fills its space (aspect -1) or keeps its own shape (0) is made as a portrait
    if (typeof n.props.src === 'string' && n.props.src.startsWith('img:')) want.set(n.props.src, n.type === 'image' ? ((n.props.aspect ?? 1.5) > 0 ? (n.props.aspect ?? 1.5) : 0.8) : 1)
    for (const st of [n.style.desktop, n.style.tablet, n.style.mobile]) if (st?.backgroundImage?.startsWith('img:')) want.set(st.backgroundImage, 1.5)
  })
  const all = [...want].filter(([m]) => !making.has(m))
  all.forEach(([m]) => making.add(m))
  const who = (m: string) => m.slice(4).match(/^\s*\[([\w-]+)\]/)?.[1]
  // the first photo of each person is made first, alone; every later photo of them uses it as the reference
  const anchorsNeeded = new Set<string>()
  const first: [string, number][] = []
  const rest: [string, number][] = []
  for (const item of all) {
    const id = who(item[0])
    if (id && !getState().doc.brief?.anchors?.[id] && !anchorsNeeded.has(id)) (anchorsNeeded.add(id), first.push(item))
    else rest.push(item)
  }
  // each photo of the page gets its own framing, so no two look alike
  const FRAMES = ['waist-up, natural distance', 'wide shot showing the whole place', 'close-up of hands and the object they hold', 'over-the-shoulder view', 'detail still life, no face', 'three-quarter view, slightly from above']
  const order = [...want.keys()]
  const make = async ([marker, aspect]: [string, number]) => {
      const b = getState().doc.brief
      const t = getState().doc.theme
      const id = who(marker)
      try {
        const r = await fetch('/api/photo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q: marker.slice(4).trim(), aspect, direction: b?.direction, shoot: b?.shoot, anchor: id ? b?.anchors?.[id] : undefined, palette: [t.primary, t.surface, t.bg], framing: order.indexOf(marker) > 0 ? FRAMES[order.indexOf(marker) % FRAMES.length] : undefined }),
        })
        const { url } = (await r.json()) as { url?: string }
        if (url && id && !getState().doc.brief?.anchors?.[id]) update((d) => void (d.brief = { ...d.brief, anchors: { ...d.brief?.anchors, [id]: url } }), { source: 'ai' })
        if (url)
          update(
            (d) =>
              walk(d.sections, (n) => {
                if (n.props.src === marker) n.props.src = url
                for (const st of [n.style.desktop, n.style.tablet, n.style.mobile]) if (st?.backgroundImage === marker) st.backgroundImage = url
              }),
            { source: 'ai' },
          )
      } catch {
        /* stays planned: tried again next time */
      } finally {
        making.delete(marker)
      }
  }
  const run = async (list: [string, number][]) => {
    const one = async () => {
      for (let next = list.shift(); next; next = list.shift()) await make(next)
    }
    await Promise.all([one(), one(), one(), one()])
  }
  await run(first)
  await run(rest)
}
// photos still to create when the editor opens (a reload while they were being made)
window.setTimeout(() => void fillPhotos(), 1500)

/** A small picture of the page as it looks now (desktop), for the review stage; none if it can't be taken. */
async function pageShot(): Promise<string | undefined> {
  const el = document.querySelector<HTMLElement>('.page-root[data-device="desktop"]')
  if (!el) return undefined
  try {
    const w = el.offsetWidth || 1280
    return await toJpeg(el, {
      quality: 0.72,
      pixelRatio: Math.min(1, 720 / w),
      // the canvas is scaled down on screen: draw the page at its real size
      style: { transform: 'none', margin: '0' },
      // editor-only marks (selection, empty drop boxes) are not part of the page
      filter: (n) => !(n instanceof HTMLElement && (n.dataset.emptyDrop !== undefined || n.classList.contains('sio-slide-empty'))),
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      cacheBust: false,
      // web fonts from Google can't be read across origins: the picture uses the fallback fonts (fine for a review)
      skipFonts: true,
    })
  } catch {
    return undefined
  }
}

/** keys the model gave to nodes in this run → real node ids */
let keyed = new Map<string, string>()
const resolveRef = (ref?: string) => (ref && keyed.get(ref)) || ref

const NODE_TYPES = new Set(['section', 'row', 'column', 'headline', 'text', 'eyebrow', 'button', 'image', 'list', 'form', 'faq', 'countdown', 'divider', 'video', 'quote', 'price', 'logos', 'stat', 'spacer', 'icon', 'menu', 'input', 'checkbox', 'paybutton', 'product'])

/** Turn a node the model wrote into a valid tree: known types, fresh ids, rows hold columns, images resolve. */
function normalizeNode(raw: RawNode | undefined, expect?: string): Node | null {
  if (raw && raw.type === 'contentbox') raw = { ...raw, type: 'column' }
  if (!raw || typeof raw !== 'object' || !raw.type || !NODE_TYPES.has(raw.type)) return null
  const props = { ...(raw.props ?? {}) } as Node['props']
  const brand = resolveBrand(typeof props.src === 'string' ? props.src : undefined)
  if (brand) {
    props.src = brand
    if (props.aspect === undefined) props.aspect = 0
  }
  // "img:<description>" stays as it is: a planned photo (created after the build, or left for the user to add)
  if (raw.type === 'image' && !props.src) props.src = `img:${String(props.alt ?? 'a calm, natural photo that fits the page')}`
  if (raw.type === 'image' && typeof props.src === 'string' && props.src.startsWith('data:') && props.aspect === undefined) props.aspect = 0
  if (raw.type === 'section' && !props.kind) props.kind = 'blank'
  if (raw.type === 'list' && !Array.isArray(props.items)) props.items = []
  if (raw.type === 'form' && !Array.isArray(props.fields)) props.fields = [{ type: 'first_name', label: 'First name' }, { type: 'email', label: 'Email address' }]
  // a form's button says what they get; the brief's goal is the best guess when the model gave none
  if (raw.type === 'form' && !props.buttonText) props.buttonText = getState().doc.brief?.goal?.length && getState().doc.brief!.goal!.length < 28 ? getState().doc.brief!.goal! : 'Get instant access'
  if (raw.type === 'button' && !props.text) props.text = 'Get started'
  const style = (raw.style && typeof raw.style === 'object' ? raw.style : {}) as Style
  let kids = (raw.children ?? []).map((c) => normalizeNode(c)).filter((x): x is Node => !!x)
  if (raw.type === 'row') kids = kids.map((k) => (k.type === 'column' ? k : el('column', {}, { gap: 16 }, [k]))).slice(0, 4)
  if (raw.type === 'row' && !kids.length) kids = [el('column', {}, { gap: 16 }, [])]
  if (raw.type === 'section') kids = kids.filter((k) => k.type !== 'section' && k.type !== 'column')
  if (raw.type === 'column') kids = kids.filter((k) => !['section', 'column'].includes(k.type))
  // a card inside a card: the inner testimonial / price box goes flat so there is only one border
  if (raw.type === 'column' && (style.borderType && style.borderType !== 'none' || style.background || style.shadow))
    for (const k of kids)
      if ((k.type === 'quote' || k.type === 'price') && k.style.desktop.borderType === undefined)
        Object.assign(k.style.desktop, { borderType: 'none', background: 'transparent', pad: [0, 0, 0, 0], shadow: 'none' })
  const hasKids = ['section', 'row', 'column'].includes(raw.type)
  // registry elements start from their own defaults (padding, borders…), then take the model's values
  const def = REGISTRY[raw.type as Node['type']]?.make()
  if (def) {
    Object.assign(style, { ...def.style.desktop, ...style })
    for (const [k, v] of Object.entries(def.props)) if ((props as Record<string, unknown>)[k] === undefined) (props as Record<string, unknown>)[k] = v
  }
  const node = el(raw.type as Node['type'], props, {
    ...(raw.type === 'section' ? { paddingY: 88, paddingX: 32, maxWidth: 1120, gap: 32 } : raw.type === 'row' ? { gap: 32 } : raw.type === 'column' ? { gap: 16 } : {}),
    ...style,
  }, hasKids ? kids : undefined)
  // an FAQ the model writes lists questions and answers: its answers become columns of elements
  if (raw.type === 'faq') upgradeFaq(node)
  if (raw.key) keyed.set(String(raw.key), node.id)
  void expect
  return node
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>
}

/** A look the AI proposed, as the page's theme (its fonts and colours exactly). */
export function lookTheme(look: Direction) {
  return sanitizeTheme({ fontHeading: look.fontHeading, fontBody: look.fontBody, bg: look.bg, ink: look.ink, primary: look.accent, ...(look.onAccent ? { onPrimary: look.onAccent } : {}), ...(look.surface ? { surface: look.surface } : {}), ...(look.muted ? { muted: look.muted } : {}), ...(typeof look.radius === 'number' ? { radius: look.radius } : {}) })
}

export function sanitizeTheme(p: Partial<PageDoc['theme']>) {
  const out: Partial<PageDoc['theme']> = {}
  const colour = /^(#[0-9a-f]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i
  for (const k of ['primary', 'onPrimary', 'ink', 'muted', 'bg', 'surface', 'dark', 'line'] as const) if (p[k] && colour.test(p[k]!)) out[k] = p[k]
  if (typeof p.headingTracking === 'number' && Math.abs(p.headingTracking) <= 0.1) out.headingTracking = p.headingTracking
  if (p.fontHeading) out.fontHeading = p.fontHeading
  if (p.fontBody) out.fontBody = p.fontBody
  if (typeof p.radius === 'number') out.radius = p.radius
  if (typeof p.headingWeight === 'number') out.headingWeight = p.headingWeight
  if (p.preset) out.preset = p.preset
  else if (Object.keys(out).length) out.preset = 'Custom'
  return out
}

function markBuilding(id: string, ms = 1100) {
  setState((s) => {
    const turns = [...s.aiTurns]
    const last = turns[turns.length - 1]
    if (last && last.status === 'working' && last.steps.length) {
      const steps = [...last.steps]
      const cur = steps[steps.length - 1]
      if (!cur.target) steps[steps.length - 1] = { ...cur, target: id }
      turns[turns.length - 1] = { ...last, steps }
    }
    return { building: [...s.building, id], aiTarget: id, aiTurns: turns }
  })
  window.dispatchEvent(new CustomEvent('editor:reveal', { detail: id }))
  window.setTimeout(() => setState((s) => ({ building: s.building.filter((x) => x !== id) })), ms)
}

/* ---------------- Offline engine ---------------- */

function localPlan(opts: RunOptions, mode: string, scope?: Node): Op[] {
  const p = opts.prompt.toLowerCase()
  const doc = getState().doc
  if (mode === 'generate') {
    const ops: Op[] = [{ op: 'say', text: 'Page plan and style' }]
    for (const step of planForPrompt(opts.prompt + ' ' + Object.values(opts.brief ?? {}).join(' '))) {
      ops.push({ op: 'say', text: STEP_NAME[step.kind] ?? step.kind })
      ops.push({ op: 'addSection', kind: step.kind as SectionKind, variant: step.variant })
    }
    ops.push({ op: 'say', text: 'Final check on every device' })
    return ops
  }

  if (mode === 'variations' && scope) {
    const t = scope.props.text ?? ''
    return [{ op: 'options', id: scope.id, items: rewriteOptions(t) }]
  }

  const ops: Op[] = []
  const target = scope ?? null
  const targets = target ? collect(target) : doc.sections.flatMap(collect)

  const color = COLOR_WORDS.find(([re]) => re.test(p))
  if (color) {
    ops.push({ op: 'say', text: `Main colour: ${color[2]}` }, { op: 'theme', patch: { primary: color[1] } })
  }
  const preset = THEMES.find((t) => p.includes(t.preset.toLowerCase()))
  if (preset) ops.push({ op: 'say', text: `${preset.preset} style` }, { op: 'theme', patch: { ...preset } })
  if (/serif|elegant|classic|luxury/.test(p)) ops.push({ op: 'theme', patch: { fontHeading: 'Fraunces', headingWeight: 600 } })
  if (/modern|clean|minimal/.test(p) && !preset) ops.push({ op: 'theme', patch: { fontHeading: 'Inter', fontBody: 'Inter' } })
  if (/round/.test(p)) ops.push({ op: 'theme', patch: { radius: 16 } })
  if (/sharp|square/.test(p)) ops.push({ op: 'theme', patch: { radius: 2 } })

  if (/dark/.test(p)) {
    const secs = target ? [path(doc, target.id)[0]] : doc.sections.filter((s) => s.props.kind === 'hero' || s.props.kind === 'cta')
    for (const s of secs) if (s) ops.push({ op: 'setProps', id: s.id, props: { tone: 'dark' } })
    ops.unshift({ op: 'say', text: 'Darker look' })
  }
  if (/light(er)?\b|white/.test(p) && !/dark/.test(p)) {
    const secs = target ? [path(doc, target.id)[0]] : doc.sections
    for (const s of secs) if (s) ops.push({ op: 'setProps', id: s.id, props: { tone: 'light' } })
  }

  const bigger = /bigger|larger|more impact|bolder/.test(p)
  const smaller = /smaller|tone down|less big/.test(p)
  if (bigger || smaller) {
    for (const n of targets.filter((n) => n.type === 'headline' || (target && n.type === 'text')))
      ops.push({ op: 'setStyle', id: n.id, style: { fontSize: Math.round((n.style.desktop.fontSize ?? 32) * (bigger ? 1.15 : 0.87)) } })
    ops.unshift({ op: 'say', text: bigger ? 'Larger headings' : 'Smaller headings' })
  }
  if (/more space|spac(e|ing)|breath|airy/.test(p) || /tighter|compact|less space/.test(p)) {
    const more = !/tighter|compact|less/.test(p)
    const secs = target ? [path(doc, target.id)[0]] : doc.sections
    for (const s of secs) if (s) ops.push({ op: 'setStyle', id: s.id, style: { paddingY: Math.round((s.style.desktop.paddingY ?? 80) * (more ? 1.25 : 0.75)) } })
    ops.unshift({ op: 'say', text: more ? 'More breathing room' : 'Tighter spacing' })
  }
  if (/center/.test(p)) for (const n of targets.filter((n) => isText(n))) ops.push({ op: 'setStyle', id: n.id, style: { textAlign: 'center' } })
  if (/left.?align|align.*left/.test(p)) for (const n of targets.filter((n) => isText(n))) ops.push({ op: 'setStyle', id: n.id, style: { textAlign: 'left' } })

  if (/short|concise|fewer words|trim/.test(p)) {
    for (const n of targets.filter((n) => (n.type === 'text' || n.type === 'headline') && n.props.text))
      ops.push({ op: 'setProps', id: n.id, props: { text: shorten(n.props.text!) } })
    ops.unshift({ op: 'say', text: 'Shorter copy' })
  }
  const q = quotedText(opts.prompt)
  if (q && target && target.props.text !== undefined) ops.push({ op: 'setProps', id: target.id, props: { text: q } })

  for (const [re, kind] of ADD_WORDS) {
    if (re.test(p) && /add|insert|include|put|need|want/.test(p)) {
      const after = target ? path(doc, target.id)[0]?.id : undefined
      ops.push({ op: 'say', text: STEP_NAME[kind] ?? kind }, { op: 'addSection', kind, after: after ?? 'end' })
    }
  }
  if (/remove|delete|get rid/.test(p)) {
    for (const [re, kind] of ADD_WORDS) if (re.test(p)) for (const s of doc.sections.filter((s) => s.props.kind === kind)) ops.push({ op: 'remove', id: s.id })
    if (target && !ADD_WORDS.some(([re]) => re.test(p))) ops.push({ op: 'remove', id: target.id })
  }

  if (!ops.length) {
    return [
      {
        op: 'error',
        text: 'The AI service is offline, so only simple edits work: colours, spacing, sizes, alignment, shorter copy, add or remove sections.',
      },
    ]
  }
  ops.push({ op: 'say', text: 'Final check on every device' })
  return ops
}

const STEP_NAME: Record<string, string> = {
  header: 'Header with your brand',
  hero: 'Hero and sign-up form',
  logos: 'Trust logos',
  features: 'Benefits',
  steps: 'How it works',
  testimonials: 'Testimonials',
  about: 'About you',
  pricing: 'Pricing',
  countdown: 'Offer timer',
  faq: 'Questions and answers',
  cta: 'Final call to action',
  footer: 'Footer',
}

const COLOR_WORDS: [RegExp, string, string][] = [
  [/\bgreen\b/, '#15803d', 'green'],
  [/\bblue\b/, '#1d6ff2', 'blue'],
  [/purple|violet/, '#6d4aff', 'purple'],
  [/orange/, '#ea580c', 'orange'],
  [/\bred\b/, '#dc2626', 'red'],
  [/pink/, '#db2777', 'pink'],
  [/teal/, '#0f766e', 'teal'],
  [/black|monochrome/, '#111111', 'black'],
  [/gold|yellow/, '#b7791f', 'gold'],
]

const ADD_WORDS: [RegExp, SectionKind][] = [
  [/testimonial|review|social proof/, 'testimonials'],
  [/faq|question/, 'faq'],
  [/pricing|price|plans?\b/, 'pricing'],
  [/countdown|timer|urgency/, 'countdown'],
  [/video/, 'video'],
  [/logo/, 'logos'],
  [/benefit|feature/, 'features'],
  [/how it works|steps/, 'steps'],
  [/about|bio/, 'about'],
  [/sign.?up|opt.?in|form|newsletter/, 'cta'],
  [/numbers|stats/, 'stats'],
]

function collect(n: Node): Node[] {
  const out: Node[] = []
  walk([n], (x) => void out.push(x))
  return out
}
const isText = (n: Node) => ['headline', 'text', 'eyebrow', 'button'].includes(n.type)

function shorten(t: string) {
  const first = t.split(/(?<=[.!?])\s/)[0]
  if (first.length < t.length) return first
  const words = t.split(' ')
  return words.length > 8 ? words.slice(0, Math.ceil(words.length * 0.65)).join(' ').replace(/[,;:]$/, '') : t
}

function rewriteOptions(t: string) {
  const base = t.replace(/\.$/, '')
  return [
    shorten(t),
    `${base.charAt(0).toUpperCase()}${base.slice(1)}, starting today`,
    /\?$/.test(t) ? base : `Want to ${base.charAt(0).toLowerCase()}${base.slice(1)}?`,
  ]
}
