import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Columns3, CornerDownLeft, LayoutTemplate, MessageSquareText, Monitor, Palette, Play, Plus, ScanSearch, Smartphone, Tablet } from 'lucide-react'
import { LIBRARY } from './library'
import { BLOCK_KINDS, buildSection, SECTION_LABEL } from './blocks'
import { getState, labelOf, SECTION_NAMES, setState, toast, update, useEditor } from './store'
import { insert, insertionTarget, ROOT } from './tree'
import { THEMES } from './theme'
import { dropAt, pageCopy } from './dnd'
import { runAI } from './ai/run'
import { Kbd, Scrim, cx } from '../ui/kit'

interface Cmd {
  id: string
  group: string
  label: string
  icon: React.ReactNode
  run: () => void
}

/** ⌘K: opens instantly, no entrance motion (high-frequency keyboard UI). */
export function CommandPalette() {
  const open = useEditor((s) => s.palette)
  const sections = useEditor((s) => s.doc.sections)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setI(0)
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [open])

  const cmds = useMemo<Cmd[]>(() => {
    const out: Cmd[] = []
    for (const s of sections)
      out.push({
        id: `go-${s.id}`,
        group: 'Go to',
        // "Go to" needs to tell sections apart, so it keeps their kind ("Hero", "Pricing")
        label: SECTION_NAMES[s.props.kind ?? ''] ?? labelOf(s),
        icon: <CornerDownLeft size={14} />,
        run: () => {
          setState({ selectedId: s.id, editingId: null })
          window.dispatchEvent(new CustomEvent('editor:reveal', { detail: s.id }))
        },
      })
    for (const k of BLOCK_KINDS)
      out.push({
        id: `blk-${k}`,
        group: 'Add block',
        label: SECTION_LABEL[k],
        icon: <LayoutTemplate size={14} />,
        run: () => {
          const n = buildSection(k, pageCopy(), 0)
          const sel = getState().selectedId
          const idx = sel ? getState().doc.sections.findIndex((x) => JSON.stringify(x).includes(`"id":"${sel}"`)) + 1 : getState().doc.sections.length
          update((d) => insert(d, ROOT, idx || d.sections.length, n))
          setState({ selectedId: n.id })
          toast(`Added ${SECTION_LABEL[k]}`, true)
          window.dispatchEvent(new CustomEvent('editor:reveal', { detail: n.id }))
        },
      })
    for (const g of LIBRARY)
      for (const it of g.items) {
        if (it.section) continue
        const Icon = it.icon
        out.push({
          id: `el-${it.id}`,
          group: 'Add element',
          label: it.label,
          icon: <Icon size={14} />,
          run: () => {
            const t = insertionTarget(getState().doc, getState().selectedId)
            if (t) dropAt({ kind: 'item', itemId: it.id }, t.parentId, t.index)
          },
        })
      }
    const views = [
      ['desktop', 'Desktop', <Monitor key="d" size={14} />],
      ['tablet', 'Tablet', <Tablet key="t" size={14} />],
      ['mobile', 'Mobile', <Smartphone key="m" size={14} />],
      ['all', 'All devices', <Columns3 key="a" size={14} />],
    ] as const
    for (const [v, l, ic] of views) out.push({ id: `v-${v}`, group: 'View', label: `Show ${l}`, icon: ic, run: () => setState({ view: v, focusDevice: v === 'all' ? 'desktop' : v }) })
    out.push({ id: 'preview', group: 'View', label: 'Preview', icon: <Play size={14} />, run: () => setState({ preview: true }) })
    out.push({ id: 'history', group: 'View', label: 'History', icon: <Clock3 size={14} />, run: () => setState({ panel: 'history', selectedId: null }) })
    out.push({ id: 'check', group: 'View', label: 'Responsive check', icon: <ScanSearch size={14} />, run: () => window.dispatchEvent(new CustomEvent('editor:open-check')) })
    for (const t of THEMES) out.push({ id: `t-${t.preset}`, group: 'Style', label: `Apply ${t.preset} style`, icon: <Palette size={14} />, run: () => update((d) => void (d.theme = { ...t })) })
    return out
  }, [sections])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? cmds.filter((c) => (c.label + ' ' + c.group).toLowerCase().includes(s)) : cmds
    return list.slice(0, 60)
  }, [cmds, q])

  const askAI = q.trim().length > 3
  const total = filtered.length + (askAI ? 1 : 0)

  if (!open) return null
  const close = () => setState({ palette: false })
  const runAt = (idx: number) => {
    close()
    if (askAI && idx === 0) runAI({ prompt: q.trim(), scopeId: getState().selectedId })
    else filtered[idx - (askAI ? 1 : 0)]?.run()
  }

  let lastGroup = ''
  return (
    <Scrim onClose={close} className="!items-start pt-[14vh]">
      <div className="w-[560px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] bg-[var(--raised)] shadow-[var(--shadow-pop)]" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-4">
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setI(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setI((x) => Math.min(total - 1, x + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setI((x) => Math.max(0, x - 1))
              }
              if (e.key === 'Enter') runAt(i)
            }}
            placeholder="Add, find, or ask AI…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--t4)]"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="scroll-thin max-h-[52vh] overflow-auto p-1.5">
          {askAI && (
            <button
              onMouseEnter={() => setI(0)}
              onClick={() => runAt(0)}
              className={cx('flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px]', i === 0 && 'bg-[var(--fill-1)]')}
            >
              <MessageSquareText size={14} className="text-[var(--brand)]" />
              <span className="truncate">
                Ask AI: <span className="text-[var(--t2)]">{q}</span>
              </span>
            </button>
          )}
          {filtered.map((c, k) => {
            const idx = k + (askAI ? 1 : 0)
            const head = c.group !== lastGroup
            lastGroup = c.group
            return (
              <div key={c.id}>
                {head && <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-[var(--t4)]">{c.group}</div>}
                <button
                  onMouseEnter={() => setI(idx)}
                  onClick={() => runAt(idx)}
                  className={cx('flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px] text-[var(--t1)]', i === idx && 'bg-[var(--fill-1)]')}
                >
                  <span className="text-[var(--t3)]">{c.icon}</span>
                  {c.label}
                  {c.group.startsWith('Add') && <Plus size={12} className="ml-auto text-[var(--t4)]" />}
                </button>
              </div>
            )
          })}
          {total === 0 && <div className="px-3 py-6 text-center text-[13px] text-[var(--t3)]">Nothing matches. Type a longer request to ask the AI.</div>}
        </div>
      </div>
    </Scrim>
  )
}
