import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Gauge, LayoutPanelTop, MessageSquareText, Palette, PenLine } from 'lucide-react'
import { Popover, cx } from '../../ui/kit'
import { runAI } from '../ai/run'
import { kindOf, suggestionsFor } from '../ai/suggest'
import { askAI, labelOf, setState, useEditor } from '../store'
import { find } from '../tree'

const KIND_ICON = { copy: PenLine, design: Palette, layout: LayoutPanelTop, check: Gauge }

/**
 * Ask AI right at the selection: a small box under the element with three ideas that fit it and a line to type in.
 * What you ask changes only this element; "Open in chat" takes the talk to the panel for longer requests.
 */
export function AskPopover({ nodeId, anchor, onClose }: { nodeId: string; anchor: HTMLElement; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  const node = find(doc, nodeId)
  const [text, setText] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => void input.current?.focus(), [])
  if (!node) return null
  const label = labelOf(node)
  const ideas = suggestionsFor(doc, node).filter((s) => !s.draft && !s.check).slice(0, 3)
  const run = (prompt: string) => {
    const p = prompt.trim()
    if (!p) return
    onClose()
    void runAI({ prompt: p, scopeId: nodeId })
  }
  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={340}>
      <div className="flex flex-col p-1.5">
        <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
          <span className="text-[12px] font-semibold text-[var(--t1)]">Change this {label.toLowerCase()}</span>
          <button
            onClick={() => (onClose(), setState({ selectedId: nodeId }), askAI())}
            className="press flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[11.5px] text-[var(--t3)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]"
          >
            <MessageSquareText size={12} /> Open in chat
          </button>
        </div>
        {ideas.map((s) => {
          const Icon = KIND_ICON[kindOf(s)]
          return (
            <button key={s.text} onClick={() => run(s.text)} className="press flex min-h-8 items-center gap-2.5 rounded-[7px] px-2 py-1 text-left text-[12.5px] leading-[17px] text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-[5px] bg-[var(--studio-tint)] text-[var(--studio)]">
                <Icon size={12} strokeWidth={1.9} />
              </span>
              {s.text}
            </button>
          )
        })}
        <div className={cx('mt-1 flex items-end gap-1 rounded-[9px] bg-[var(--fill-1)] p-1 pl-2.5 focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]')}>
          <textarea
            ref={input}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                run(text)
              }
              if (e.key === 'Escape') onClose()
            }}
            placeholder={`Or say what to change about this ${label.toLowerCase()}`}
            className="max-h-[96px] min-h-[30px] flex-1 resize-none bg-transparent py-[5px] text-[12.5px] leading-[20px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            aria-label="Send"
            disabled={!text.trim()}
            onClick={() => run(text)}
            className={cx('press grid h-7 w-7 flex-none place-items-center rounded-[7px]', text.trim() ? 'bg-[var(--ink)] text-[var(--inv)]' : 'bg-[var(--fill-2)] text-[var(--t4)]')}
          >
            <ArrowUp size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </Popover>
  )
}
