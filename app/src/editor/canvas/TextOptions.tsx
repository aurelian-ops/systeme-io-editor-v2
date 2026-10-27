import { useEffect, useState } from 'react'
import { Popover, Spinner } from '../../ui/kit'
import { runAI } from '../ai/run'
import { setProps, toast, useEditor } from '../store'
import { find } from '../tree'

/** Three alternative ways to say the selected text; one click applies it. */
export function TextOptionsPopover({ nodeId, anchor, onClose }: { nodeId: string; anchor: HTMLElement; onClose: () => void }) {
  const node = useEditor((s) => find(s.doc, nodeId))
  const [items, setItems] = useState<string[] | null>(null)

  useEffect(() => {
    let alive = true
    runAI({
      prompt: 'Give 3 alternatives for the selected text.',
      mode: 'variations',
      scopeId: nodeId,
      onOptions: (o) => alive && setItems(o),
    }).then(() => alive && setItems((x) => x ?? []))
    return () => {
      alive = false
    }
  }, [nodeId])

  return (
    <Popover anchor={anchor} onClose={onClose} width={340}>
      <div className="p-1.5">
        <div className="px-2 pb-1 pt-1.5 text-[12px] font-semibold">Rewrite</div>
        {!items ? (
          <div className="flex items-center gap-2 px-2 py-3 text-[12px] text-[var(--t3)]">
            <Spinner size={13} />
            Writing three options…
          </div>
        ) : items.length === 0 ? (
          <div className="px-2 py-3 text-[12px] text-[var(--t3)]">No options this time. Try again.</div>
        ) : (
          items.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                setProps(nodeId, { text: t }, false)
                toast('Text replaced', true)
                onClose()
              }}
              className="press slide-up block w-full rounded-[6px] px-2 py-2 text-left text-[13px] leading-[19px] text-[var(--t1)] hover:bg-[var(--fill-1)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {t}
            </button>
          ))
        )}
        {node?.props.text ? (
          <div className="mt-1 border-t border-[var(--line)] px-2 pb-1 pt-2 text-[11px] text-[var(--t4)]">Current: {node.props.text.replace(/<[^>]+>/g, '').slice(0, 80)}</div>
        ) : null}
      </div>
    </Popover>
  )
}
