import { Code2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { el } from '../blocks'
import { GOOGLE_FONTS } from '../fonts'
import { AlignRow, G, SizePosition, useInspector } from '../settings/kit'
import { Button, IconButton, Scrim } from '../../ui/kit'
import { CodeEditor, CodeNotes, codeProblems, jumpTo } from '../settings/CodeEditor'
import type { EditorView } from '@codemirror/view'
import { customCss, styleBlocks } from '../render/domIds'
import type { Align, Theme } from '../types'
import type { ElementDef } from './types'

/**
 * Raw HTML (like V1): on the live page and in Preview the code is part of the page, so its CSS can restyle any
 * element by its id and its scripts run. In the editor its result is drawn in a sealed frame (scripts never touch the
 * editor) and its CSS applies to the page you design only, never to the editor's own panels.
 */
export const def: ElementDef = {
  type: 'rawhtml',
  label: 'Raw HTML',
  icon: Code2,
  group: 'Other',
  make: () => el('rawhtml', { html: '' }),
  render: ({ node, s, doc, editable }) => <RawHtml html={node.props.html ?? ''} align={s.textAlign ?? 'left'} theme={doc.theme} editable={editable} />,
  settings: () => <RawHtmlSettings />,
}

/* ---------------- Render ---------------- */

const SIZE_SCRIPT = `<script>(function(){var r=document.getElementById('sio-root');var last=-1;function post(){var h=Math.ceil(r.getBoundingClientRect().height);if(h!==last){last=h;parent.postMessage({sioHtmlHeight:h},'*')}}if(window.ResizeObserver)new ResizeObserver(post).observe(r);addEventListener('load',post);setTimeout(post,300);post()})()</script>`

function srcDoc(html: string, align: Align, theme: Theme) {
  const font = GOOGLE_FONTS.includes(theme.fontBody)
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontBody).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap">`
    : ''
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${font}<style>html,body{margin:0;padding:0;background:transparent}body{font-family:"${theme.fontBody}",system-ui,sans-serif;color:${theme.ink};font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}#sio-root{display:flow-root;text-align:${align}}img,video,iframe{max-width:100%}</style></head><body><div id="sio-root">${html}</div>${SIZE_SCRIPT}</body></html>`
}

function RawHtml({ html, align, theme, editable }: { html: string; align: Align; theme: Theme; editable: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(0)
  const empty = !html.trim()
  const doc = useMemo(() => (empty ? '' : srcDoc(html, align, theme)), [empty, html, align, theme])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return
      const h = (e.data as { sioHtmlHeight?: number } | null)?.sioHtmlHeight
      if (typeof h === 'number') setHeight(h)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  if (empty) {
    if (!editable) return null
    // like the empty image and video: a quiet grey box; clicking it opens the code editor
    return (
      <div className="sio-media-empty" data-code-add style={{ minHeight: 120, borderRadius: 10, cursor: 'pointer' }}>
        <Code2 size={22} strokeWidth={1.6} />
        <span>Add HTML</span>
      </div>
    )
  }
  // only styles / scripts (nothing to show): one self-closing line in the editor, no space at all on the live page
  if (!showsSomething(html)) {
    if (!editable) return <LiveHtml html={html} align={align} hidden />
    return (
      <div className="sio-code-wrap sio-code-line">
        <style>{customCss(styleBlocks(html), '.page-root')}</style>
        <span className="sio-code-tag" aria-hidden>
          &lt;<span>CustomHTML</span> /&gt;
        </span>
      </div>
    )
  }
  const result = (
    <iframe
      ref={frame}
      title="Custom HTML"
      sandbox="allow-scripts allow-popups allow-forms"
      srcDoc={doc}
      style={{ display: 'block', width: '100%', height: height || 48, border: 0, background: 'transparent', pointerEvents: editable ? 'none' : 'auto', colorScheme: 'light' }}
    />
  )
  if (!editable) return <LiveHtml html={html} align={align} />
  // in the editor the block reads like code wrapping its result (JSX): <CustomHTML> above, </CustomHTML> below and an
  // indent guide between, so it is clearly custom code even when not selected. The live page shows only the result.
  return (
    <div className="sio-code-wrap">
      {/* its CSS also styles the page being designed (scoped to it, so the editor itself is never touched) */}
      <style>{customCss(styleBlocks(html), '.page-root')}</style>
      <div className="sio-code-tag" aria-hidden>
        &lt;<span>CustomHTML</span>&gt;
      </div>
      <div className="sio-code-body">{result}</div>
      <div className="sio-code-tag" aria-hidden>
        &lt;/<span>CustomHTML</span>&gt;
      </div>
    </div>
  )
}

/** The code as part of the page: HTML placed in, its CSS made to win over the elements' own styles, scripts run. */
/** Whether the code draws anything (not only <style>, <script>, <link>, comments or blank space). */
function showsSomething(html: string) {
  return !!html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(link|meta|base)\b[^>]*>/gi, '')
    .trim()
}

function LiveHtml({ html, align, hidden }: { html: string; align: Align; hidden?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.innerHTML = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    const style = document.createElement('style')
    // kept to the page (in Preview the editor's own toolbar shares this document)
    style.textContent = customCss(styleBlocks(html), '.page-root')
    el.prepend(style)
    // scripts placed with innerHTML do not run: recreate each one so it does
    el.querySelectorAll('script').forEach((old) => {
      const run = document.createElement('script')
      for (const a of old.attributes) run.setAttribute(a.name, a.value)
      run.textContent = old.textContent
      old.replaceWith(run)
    })
    return () => void (el.innerHTML = '')
  }, [html])
  // hidden: nothing to show, so the element takes no room (its styles and scripts still work)
  return <div ref={box} data-code-only={hidden ? '' : undefined} style={hidden ? { display: 'none' } : { display: 'flow-root', textAlign: align }} />
}

/* ---------------- Settings ---------------- */

/** Clicking the empty box on the canvas asks the settings to open the code editor (the canvas selects it first). */
let codeAsk: string | null = null
const codeSubs = new Set<() => void>()
export function askForCode(id: string) {
  codeAsk = id
  codeSubs.forEach((f) => f())
}
const useCodeAsk = () =>
  useSyncExternalStore(
    (cb) => (codeSubs.add(cb), () => void codeSubs.delete(cb)),
    () => codeAsk,
  )

function RawHtmlSettings() {
  const { node, setProps } = useInspector()
  const asked = useCodeAsk()
  const [open, setOpen] = useState(() => asked === node.id)
  useEffect(() => {
    if (asked === node.id) (setOpen(true), (codeAsk = null))
  }, [asked, node.id])
  const html = node.props.html ?? ''
  const lines = html ? html.split('\n').length : 0
  return (
    <>
      <G title="Settings" keys={['textAlign']}>
        <AlignRow />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-[var(--t3)]">{lines ? `${lines} ${lines === 1 ? 'line' : 'lines'} of code` : 'No code yet'}</span>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Code2 size={13} /> Edit code
          </Button>
        </div>
      </G>
      <SizePosition pad={false} />
      {open && (
        <CodeModal
          value={html}
          onClose={() => setOpen(false)}
          onSave={(v) => {
            setProps({ html: v }, false)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

export function CodeModal({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value)
  const draftRef = useRef(draft)
  draftRef.current = draft
  // the editor lives in a ref, never in React state (React's dev tools would walk into the code's sealed frame)
  const viewRef = useRef<EditorView | null>(null)
  const getView = useCallback(() => viewRef.current, [])
  const [, ready] = useState(0)
  const problems = codeProblems(draft, 'body')
  // long code: the window opens on the first problem, so you never have to look for it
  const onView = useCallback((v: EditorView | null) => {
    viewRef.current = v
    ready((n) => n + 1)
    if (v && codeProblems(v.state.doc.toString(), 'body').length) requestAnimationFrame(() => v.dom.isConnected && jumpTo(v, 'body', 1))
  }, [])
  const blocking = problems.filter((p) => p.severity === 'error')
  const save = () => !codeProblems(draftRef.current, 'body').some((p) => p.severity === 'error') && onSave(draftRef.current)

  return (
    <Scrim onClose={onClose} className="p-4">
      <div className="pop-in flex w-[760px] max-w-full flex-col overflow-hidden rounded-[14px] bg-[var(--raised)] shadow-[var(--shadow-pop)]" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div>
            <div className="text-[14px] font-semibold leading-[20px] text-[var(--t1)]">Edit code</div>
            <div className="text-[12px] leading-[17px] text-[var(--t3)]">HTML, CSS and scripts run on your page. Style any element with its ID (in its settings › HTML attributes).</div>
          </div>
          <IconButton tip="Close" kbd="Esc" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        {/* Esc first closes the editor's own suggestions or find bar, only then the window */}
        <div
          data-escape-own
          className="mx-4 flex h-[min(440px,62vh)] overflow-hidden rounded-[10px] bg-[var(--raised)] shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
        >
          <CodeEditor value={value} onChange={setDraft} onSave={save} placeholderText="Your HTML" place="body" onView={onView} />
        </div>
        <CodeNotes problems={problems} getView={getView} />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-3 text-[11.5px] text-[var(--t4)]">
            <span className="flex items-center gap-1.5">
              <kbd className="sio-kbd">⌘F</kbd> Find
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="sio-kbd">⌘S</kbd> Save
            </span>
          </span>
          <div className="flex gap-1.5">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="brand" disabled={blocking.length > 0} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Scrim>
  )
}
