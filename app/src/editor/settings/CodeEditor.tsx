import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { cx } from '../../ui/kit'
import { basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { pickedCompletion } from '@codemirror/autocomplete'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import { closeSearchPanel, findNext, findPrevious, getSearchQuery, replaceAll, replaceNext, search, SearchQuery, setSearchQuery } from '@codemirror/search'
import type { Panel } from '@codemirror/view'

/**
 * The code editor (no AI): HTML with CSS and scripts inside it, tag and attribute suggestions as you type, tags that
 * close themselves, matching brackets, line numbers, undo, and find / replace (⌘F). ⌘S saves.
 */

// the editor's own look: our panel tokens, so it fits light and dark editor modes
const look = EditorView.theme({
  // solid, so code scrolled sideways never shows through the line numbers
  '&': { height: '100%', fontSize: '12.5px', backgroundColor: 'var(--raised)', color: 'var(--t1)' },
  '.cm-scroller': { fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: '20px' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--brand)' },
  '.cm-gutters': { backgroundColor: 'var(--raised)', color: 'var(--t4)', border: 'none', borderRight: '1px solid var(--line)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--fill-1)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--brand-tint) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--brand)' },
  '.cm-matchingBracket': { backgroundColor: 'var(--brand-tint)', outline: 'none' },
  '& .cm-foldGutter': { display: 'none !important' },
  // suggestions
  '.cm-tooltip': { border: 'none', borderRadius: '10px', backgroundColor: 'var(--raised)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: '12px', maxHeight: '220px', padding: '4px' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '3px 8px', borderRadius: '6px', color: 'var(--t1)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--brand)', color: '#fff' },
  '.cm-completionDetail': { color: 'var(--t3)', fontStyle: 'normal', marginLeft: '8px' },
  '.cm-completionIcon': { display: 'none' },
  // find / replace bar (our own panel, see findPanel)
  '.cm-panels': { backgroundColor: 'transparent', borderTop: 'none !important', borderBottom: 'none !important' },
  '.cm-searchMatch': { backgroundColor: 'var(--code-find)' },
  '.cm-searchMatch-selected': { backgroundColor: 'var(--code-find-on)' },
  // problems
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--dng)', textUnderlineOffset: '3px' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--warn, #f0b45a)', textUnderlineOffset: '3px' },
  '.cm-tooltip-lint': { padding: '6px 4px', fontFamily: 'Geist, Inter, system-ui, sans-serif', fontSize: '12px', maxWidth: '320px' },
  '.cm-diagnostic': { borderLeft: 'none', padding: '2px 8px', color: 'var(--t1)' },
  '.cm-diagnostic-error': { borderLeft: 'none' },
  // a small dot beside the line number of a line with a problem
  '.cm-gutter-lint': { width: '12px', padding: '0' },
  '.cm-gutter-lint .cm-gutterElement': { padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  '.cm-lint-marker': { width: '6px', height: '6px', borderRadius: '99px', content: 'none' },
  '.cm-lint-marker-error': { backgroundColor: 'var(--dng)', content: 'none' },
  '.cm-lint-marker-warning': { backgroundColor: 'var(--t4)', content: 'none' },
})

// code colours follow the editor's light / dark mode (--code-* in index.css)
const colours = HighlightStyle.define([
  { tag: [t.tagName, t.angleBracket], color: 'var(--code-tag)' },
  { tag: t.attributeName, color: 'var(--code-attr)' },
  { tag: [t.attributeValue, t.string], color: 'var(--code-string)' },
  { tag: [t.comment], color: 'var(--t4)', fontStyle: 'italic' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--code-keyword)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--code-number)' },
  { tag: [t.propertyName], color: 'var(--code-tag)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--code-fn)' },
  { tag: [t.className, t.typeName], color: 'var(--code-attr)' },
  { tag: t.invalid, color: 'var(--dng)' },
])

/* ---------------- What a code box may not hold ---------------- */

/** body: Raw HTML on the page · head: header code · footer: footer code */
export type CodePlace = 'body' | 'head' | 'footer'
export interface CodeProblem {
  from: number
  to: number
  /** what is wrong, naming the exact thing (short) */
  message: string
  /** why, or what to do instead (shorter still; optional) */
  hint?: string
  /** an error blocks Save; a warning only advises */
  severity: 'error' | 'warning'
  /** one-click fix: drop the tag (keeping what is inside it) */
  fix?: 'remove'
}
/**
 * The page itself owns <html>, <head> and <body> (and the doctype): code may not add them, directly or from a script,
 * or it would break the page around it. Head-only tags (meta, title, base, favicon / canonical links) go in the
 * header code. Everything else (scripts, styles, iframes, embeds) is fine.
 */
export function codeProblems(code: string, place: CodePlace): CodeProblem[] {
  const out: CodeProblem[] = []
  const each = (re: RegExp, make: (m: RegExpMatchArray) => Omit<CodeProblem, 'from' | 'to'> | null) => {
    for (const m of code.matchAll(re)) {
      const p = make(m)
      if (p) out.push({ from: m.index!, to: m.index! + m[0].length, ...p })
    }
  }
  each(/<!doctype[^>]*>/gi, () => ({ message: '<!DOCTYPE> isn\'t allowed here', hint: 'The page already starts with one.', severity: 'error', fix: 'remove' }))
  each(/<(\/?)(html|head|body)(\s[^>]*)?>/gi, (m) => ({
    message: `<${m[1]}${m[2].toLowerCase()}> isn't allowed here`,
    hint: `The page already has its own ${m[2].toLowerCase()}. What is inside it is kept.`,
    severity: 'error',
    fix: 'remove',
  }))
  each(/createElement\(\s*['"`](html|head|body)['"`]\s*\)/gi, (m) => ({ message: `This script creates a <${m[1].toLowerCase()}>`, hint: 'The page already has one. Create the element you need inside it instead.', severity: 'error' }))
  each(/document\.(write|writeln|open)\s*\(/gi, (m) => ({ message: `document.${m[1]}() would replace the whole page`, hint: 'Add elements with appendChild instead.', severity: 'error' }))
  each(/document\.(documentElement|body|head)\.(innerHTML|outerHTML)\s*=/gi, (m) => ({ message: `This replaces everything in the page's ${m[1] === 'documentElement' ? 'html' : m[1]}`, hint: 'Change a single element instead (find it by its id).', severity: 'error' }))
  each(/(innerHTML|outerHTML|insertAdjacentHTML)[^;\n]*<\s*(html|head|body)\b/gi, (m) => ({ message: `This script adds a <${m[2].toLowerCase()}>`, hint: 'The page already has one.', severity: 'error' }))
  if (place !== 'head') {
    each(/<(meta|title|base)\b[^>]*>(?:[^<]*<\/title>)?/gi, (m) => ({ message: `<${m[1].toLowerCase()}> isn't allowed here`, hint: 'It only works in the page head: Settings › Tracking › Header code.', severity: 'error', fix: 'remove' }))
    each(/<link\b[^>]*rel=["']?(icon|shortcut icon|apple-touch-icon|canonical|manifest|alternate)\b[^>]*>/gi, (m) => ({ message: `<link rel="${m[1]}"> isn't allowed here`, hint: 'It only works in the page head: Settings › Tracking › Header code.', severity: 'error', fix: 'remove' }))
  }
  if (place === 'body') {
    // tracking belongs with the page's tracking code, so it runs once and early (it still works here)
    // one note per tracking script (not one per call inside it); removing it takes the whole <script> away
    const TRACK: [RegExp, string][] = [
      [/\bgtag\s*\(|googletagmanager\.com|\bdataLayer\b/, 'Google tracking'],
      [/\bfbq\s*\(|connect\.facebook\.net/, 'Meta Pixel'],
      [/\bttq\b|analytics\.tiktok\.com/, 'TikTok Pixel'],
      [/\b_hsq\b|js\.hs-scripts\.com/, 'HubSpot tracking'],
    ]
    each(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
      const name = TRACK.find(([re]) => re.test(m[0]))?.[1]
      return name ? { message: `${name} runs late here`, hint: 'It works, but Header code runs it as the page starts loading.', severity: 'warning', fix: 'remove' } : null
    })
  }
  return out.sort((a, b) => a.from - b.from)
}

/* ---------------- Find and replace: our own bar, in the editor's look ---------------- */

const svg = (d: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const ICON = {
  up: svg('<path d="m18 15-6-6-6 6"/>'),
  down: svg('<path d="m6 9 6 6 6-6"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  more: svg('<path d="m9 18 6-6-6-6"/>', 13),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 13),
}
/** A bar along the bottom of the editor: find (with "3 of 8"), previous / next, match case, whole word, then
 * replace on a second line that you open with the chevron. Esc closes it. */
function findPanel(view: EditorView): Panel {
  const dom = document.createElement('div')
  dom.className = 'sio-find'
  dom.innerHTML = `
    <div class="row">
      <button class="ib tw" data-a="toggle" title="Replace" aria-label="Show replace">${ICON.more}</button>
      <label class="fld"><span class="ic">${ICON.search}</span><input data-f="find" placeholder="Find" aria-label="Find" /><span class="ct" data-ct></span></label>
      <button class="ib tg" data-a="case" title="Match case" aria-pressed="false">Aa</button>
      <button class="ib tg" data-a="word" title="Whole word" aria-pressed="false"><u>ab</u></button>
      <span class="sep"></span>
      <button class="ib" data-a="prev" title="Previous (⇧Enter)" aria-label="Previous">${ICON.up}</button>
      <button class="ib" data-a="next" title="Next (Enter)" aria-label="Next">${ICON.down}</button>
      <button class="ib" data-a="close" title="Close (Esc)" aria-label="Close">${ICON.close}</button>
    </div>
    <div class="row rep" hidden>
      <span class="tw"></span>
      <label class="fld"><input data-f="replace" placeholder="Replace" aria-label="Replace" /></label>
      <button class="txt" data-a="one">Replace</button>
      <button class="txt" data-a="all">Replace all</button>
    </div>`
  const find = dom.querySelector<HTMLInputElement>('[data-f="find"]')!
  const rep = dom.querySelector<HTMLInputElement>('[data-f="replace"]')!
  const ct = dom.querySelector<HTMLElement>('[data-ct]')!
  let caseSensitive = false
  let wholeWord = false
  const commit = () => view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: find.value, replace: rep.value, caseSensitive, wholeWord })) })
  const count = () => {
    const q = getSearchQuery(view.state)
    if (!q.search || !q.valid) return void (ct.textContent = '')
    let n = 0
    let at = 0
    const sel = view.state.selection.main
    const cur = q.getCursor(view.state)
    for (let r = cur.next(); !r.done && n < 999; r = cur.next()) {
      n++
      if (r.value.from === sel.from && r.value.to === sel.to) at = n
    }
    ct.textContent = n ? (at ? `${at} of ${n}` : `${n}`) : 'No results'
  }
  dom.addEventListener('input', () => (commit(), count()))
  dom.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-a]')
    if (!b) return
    const a = b.dataset.a
    if (a === 'next') findNext(view)
    else if (a === 'prev') findPrevious(view)
    else if (a === 'close') closeSearchPanel(view)
    else if (a === 'one') replaceNext(view)
    else if (a === 'all') replaceAll(view)
    else if (a === 'case' || a === 'word') {
      if (a === 'case') caseSensitive = !caseSensitive
      else wholeWord = !wholeWord
      b.setAttribute('aria-pressed', String(a === 'case' ? caseSensitive : wholeWord))
      commit()
    } else if (a === 'toggle') {
      const r = dom.querySelector<HTMLElement>('.rep')!
      r.hidden = !r.hidden
      b.classList.toggle('open', !r.hidden)
      if (!r.hidden) rep.focus()
    }
    count()
  })
  dom.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target === find) (e.preventDefault(), e.shiftKey ? findPrevious(view) : findNext(view), count())
    else if (e.key === 'Enter' && e.target === rep) (e.preventDefault(), replaceNext(view), count())
    else if (e.key === 'Escape') (e.preventDefault(), closeSearchPanel(view), view.focus())
  })
  return {
    dom,
    mount: () => {
      const q = getSearchQuery(view.state)
      find.value = q.search
      find.focus()
      find.select()
      count()
    },
    update: () => count(),
  }
}

/* ---------------- Picking a tag writes the whole pair ---------------- */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
/**
 * After a tag name is chosen from the suggestions ("<styl" or just "styl" → style, Enter or click), the rest is written:
 * `<style>|</style>` with the cursor between them; tags that never close (img, br…) just get their `>`.
 * CSS and script suggestions inside the code keep working as they are.
 */
const pairOnPick = EditorView.updateListener.of((u) => {
  const picked = u.transactions.map((t) => t.annotation(pickedCompletion)).find(Boolean)
  if (!picked || picked.type !== 'type') return
  const view = u.view
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  // the name just written, with its "<" (or without one: typing "h" and picking h1 still gives the whole tag)
  const m = view.state.sliceDoc(line.from, pos).match(/(<?)([a-zA-Z][\w-]*)$/)
  if (!m || m[2] !== picked.label.replace(/^</, '')) return
  const name = m[2]
  const lt = m[1] ? '' : '<'
  const start = pos - name.length
  const next = view.state.sliceDoc(pos, pos + 1)
  if (next === '>' && !lt) return
  const closing = VOID.has(name.toLowerCase()) ? '>' : `></${name}>`
  queueMicrotask(() =>
    view.dispatch({
      changes: [...(lt ? [{ from: start, insert: lt }] : []), { from: pos, insert: closing }],
      // the cursor lands between the two tags
      selection: { anchor: pos + lt.length + 1 },
    }),
  )
})

/** Selects the next (or previous) problem after the cursor and brings it to the middle of the editor. */
export function jumpTo(view: EditorView, place: CodePlace, dir: 1 | -1, problems = codeProblems(view.state.doc.toString(), place)) {
  if (!problems.length) return -1
  const sel = view.state.selection.main
  // from the start when nothing is selected yet (just opened), else from the cursor
  const at = sel.empty && sel.from === 0 ? -1 : sel.from
  let i = dir === 1 ? problems.findIndex((p) => p.from > at) : problems.map((p) => p.from < at).lastIndexOf(true)
  if (i < 0) i = dir === 1 ? 0 : problems.length - 1
  const p = problems[i]
  view.dispatch({ selection: { anchor: p.from, head: p.to }, effects: EditorView.scrollIntoView(p.from, { y: 'center' }) })
  view.focus()
  return i
}

export function CodeEditor({ value, onChange, onSave, placeholderText, place = 'body', onView }: { value: string; onChange: (v: string) => void; onSave: () => void; placeholderText?: string; place?: CodePlace; /** called with the editor once it exists (kept out of React state: it reaches into frames) */ onView?: (v: EditorView | null) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ onChange, onSave })
  latest.current = { onChange, onSave }

  useEffect(() => {
    if (!host.current) return
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => (latest.current.onSave(), true) }]),
          basicSetup,
          search({ top: false, createPanel: findPanel }),
          html({ autoCloseTags: true, matchClosingTags: true }),
          pairOnPick,
          // what is not allowed is underlined where it is, with the reason on hover
          linter((v) => codeProblems(v.state.doc.toString(), place).map((p): Diagnostic => ({ ...p })), { delay: 250 }),
          lintGutter({ hoverTime: 200 }),
          // F8 / ⇧F8: the next / previous problem (as in VS Code)
          keymap.of([
            { key: 'F8', preventDefault: true, run: (v) => (jumpTo(v, place, 1), true) },
            { key: 'Shift-F8', preventDefault: true, run: (v) => (jumpTo(v, place, -1), true) },
          ]),
          syntaxHighlighting(colours),
          look,
          EditorState.tabSize.of(2),
          EditorView.updateListener.of((u) => u.docChanged && latest.current.onChange(u.state.doc.toString())),
          ...(placeholderText ? [EditorView.contentAttributes.of({ 'aria-label': placeholderText })] : []),
        ],
      }),
    })
    view.focus()
    onView?.(view)
    return () => (onView?.(null), view.destroy())
    // the editor owns its text once open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className="h-full min-w-0 flex-1" />
}

/** Under the editor: each problem with its line, what is wrong and why. Step through them (↑ ↓ or F8), click one to
 * go there, fix it in one click. */
export function CodeNotes({ problems, getView, place = 'body' }: { problems: CodeProblem[]; getView: () => EditorView | null; place?: CodePlace }) {
  const [current, setCurrent] = useState(-1)
  // the list fades at its bottom while there is more below
  const [more, setMore] = useState(false)
  const view = getView()
  const list = useRef<HTMLDivElement>(null)
  // follow the cursor: the row of the problem the cursor sits in is the current one
  useEffect(() => {
    const t = setInterval(() => {
      const view = getView()
      if (!view) return
      const at = view.state.selection.main.from
      setCurrent(problems.findIndex((p) => at >= p.from && at <= p.to))
    }, 150)
    return () => clearInterval(t)
  }, [getView, problems])
  useEffect(() => {
    if (current >= 0) list.current?.querySelector<HTMLElement>(`[data-i="${current}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [current])
  if (!problems.length) return null
  const errors = problems.filter((p) => p.severity === 'error').length
  const lineOf = (pos: number) => (view ? view.state.doc.lineAt(Math.min(pos, view.state.doc.length)).number : null)
  const go = (p: CodeProblem) => {
    if (!view) return
    view.dispatch({ selection: { anchor: p.from, head: p.to }, effects: EditorView.scrollIntoView(p.from, { y: 'center' }) })
    view.focus()
  }
  const step = (dir: 1 | -1) => view && setCurrent(jumpTo(view, place, dir, problems))
  const fix = (p: CodeProblem) => {
    if (!view) return
    // the tag goes, the line it sat on goes too when nothing else is on it
    const line = view.state.doc.lineAt(p.from)
    const alone = view.state.sliceDoc(line.from, p.from).trim() === '' && view.state.sliceDoc(p.to, line.to).trim() === ''
    const from = alone ? line.from : p.from
    const to = alone ? Math.min(line.to + 1, view.state.doc.length) : p.to
    // the cursor goes to the next problem, which takes this row's place: the list stays still, you just keep going
    const next = problems.find((q) => q.from >= to)
    const at = next ? next.from - (to - from) : from
    view.dispatch({ changes: { from, to, insert: '' }, selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: 'center' }) })
    view.focus()
  }
  const tips = problems.length - errors
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return (
    <div className="mx-4 mt-2.5 flex flex-col rounded-[10px] bg-[var(--fill-1)] p-1">
      <div className="flex h-8 items-center gap-2 pl-2.5 pr-1 text-[12px]">
        {errors ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--dng)]" />
            <span className="font-semibold text-[var(--t1)]">{errors} to fix before saving</span>
            {tips > 0 && <span className="text-[var(--t3)]">· {plural(tips, 'suggestion', 'suggestions')}</span>}
          </>
        ) : (
          <>
            <Info size={13} className="text-[var(--t3)]" />
            <span className="font-semibold text-[var(--t1)]">{plural(tips, 'suggestion', 'suggestions')}</span>
          </>
        )}
        <span className="flex-1" />
        {/* go through them one by one (F8 / ⇧F8 in the code) */}
        {current >= 0 && <span className="tnum mr-1 text-[11.5px] text-[var(--t3)]">{`${current + 1} of ${problems.length}`}</span>}
        <button title="Previous (⇧F8)" aria-label="Previous problem" onClick={() => step(-1)} className="press grid h-6 w-6 place-items-center rounded-[6px] text-[var(--t2)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]">
          <ChevronUp size={14} />
        </button>
        <button title="Next (F8)" aria-label="Next problem" onClick={() => step(1)} className="press grid h-6 w-6 place-items-center rounded-[6px] text-[var(--t2)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]">
          <ChevronDown size={14} />
        </button>
      </div>
      {/* one line per problem; the fix shows only on the row you are on or hover, so a long list is not a wall of buttons */}
      <div
        ref={(el) => {
          list.current = el
          if (el) queueMicrotask(() => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2))
        }}
        onScroll={(e) => setMore(e.currentTarget.scrollTop + e.currentTarget.clientHeight < e.currentTarget.scrollHeight - 2)}
        className={cx('scroll-thin flex max-h-[140px] flex-col overflow-auto', more && 'sio-fade-end')}
      >
        {problems.map((p, i) => {
          const [, tag, rest] = p.message.match(/^(<[^>]+>)(.*)$/) ?? [, '', p.message]
          return (
            <div
              key={i}
              data-i={i}
              role="button"
              tabIndex={0}
              onClick={() => (go(p), setCurrent(i))}
              onKeyDown={(e) => e.key === 'Enter' && (go(p), setCurrent(i))}
              className={cx(
                'group flex h-[30px] flex-none cursor-pointer items-center gap-2.5 rounded-[7px] pl-2.5 pr-1 text-[12.5px] outline-none hover:bg-[var(--fill-1)] focus-visible:bg-[var(--fill-1)]',
                i === current && '!bg-[var(--raised)] shadow-[var(--shadow-card)]',
              )}
              style={{ scrollMarginBlock: 28 }}
            >
              <span className="tnum w-[22px] flex-none text-right font-mono text-[11px] text-[var(--t4)]">{lineOf(p.from) ?? ''}</span>
              <span className={cx('h-1.5 w-1.5 flex-none rounded-full', p.severity === 'error' ? 'bg-[var(--dng)]' : 'bg-[var(--t4)]')} />
              <span className="flex-none text-[var(--t1)]">
                {tag && <code className="font-mono text-[11.5px] font-medium">{tag}</code>}
                {rest}
              </span>
              {p.hint && <span className="min-w-0 flex-1 truncate text-[var(--t3)]" title={p.hint}>{p.hint}</span>}
              {!p.hint && <span className="flex-1" />}
              {p.fix && (
                <button
                  onClick={(e) => (e.stopPropagation(), fix(p))}
                  className={cx(
                    'press h-6 flex-none rounded-[6px] px-2 text-[12px] font-medium text-[var(--brand)] hover:bg-[var(--brand-tint)]',
                    i === current ? 'visible' : 'invisible group-hover:visible group-focus-visible:visible',
                  )}
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
