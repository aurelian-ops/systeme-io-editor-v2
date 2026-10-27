import { useRef, useState } from 'react'
import { Brain, X } from 'lucide-react'
import { Popover, cx } from '../../ui/kit'
import { update, useEditor } from '../store'
import type { PageBrief } from '../types'

/** What the AI knows, grouped the way people think about it. Single facts first, then the lists. */
const FACTS: [keyof PageBrief, string][] = [
  ['business', ''],
  ['offer', ''],
  ['price', 'Price: '],
  ['audience', 'For: '],
  ['goal', 'Goal: '],
  ['voice', 'Voice: '],
  ['direction', 'Look: '],
]
type ListKey = 'proof' | 'objections' | 'decisions'
const LISTS: [ListKey, string][] = [
  ['proof', 'Proof'],
  ['objections', 'What they worry about'],
  ['decisions', 'Your decisions'],
]

const count = (b?: PageBrief) => (b ? FACTS.filter(([k]) => b[k]).length + LISTS.reduce((n, [k]) => n + (b[k]?.length ?? 0), 0) + (b.assets?.length ?? 0) : 0)

/**
 * The AI's memory of this page (Raycast / Arc): a small button in the AI panel's header with how many things it knows;
 * it opens a compact list grouped by the business, proof, worries and your decisions, each one removable, with a
 * field to add a rule of your own ("never mention discounts"). The AI reads all of it before every change.
 */
export function MemoryButton({ className }: { className?: string } = {}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-expanded={!!anchor}
        className={cx('press inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[12px] text-[var(--t2)] hover:bg-[var(--fill-1)] hover:text-[var(--t1)]', anchor && 'bg-[var(--fill-1)] text-[var(--t1)]', className)}
      >
        <Brain size={14} strokeWidth={1.7} />
        Memory

      </button>
      {anchor && <MemoryList anchor={anchor} onClose={() => setAnchor(null)} />}
    </>
  )
}

/** One thing the AI knows; the × to forget it is always there (quiet), clear on hover. */
function Row({ text, onForget }: { text: string; onForget: () => void }) {
  return (
    <div className="group flex items-start gap-1.5 rounded-[7px] py-1 pl-2 pr-1 hover:bg-[var(--fill-1)]">
      <span className="min-w-0 flex-1 py-0.5 text-[12.5px] leading-[18px] text-[var(--t1)]">{text}</span>
      <button
        type="button"
        aria-label="Forget"
        title="Forget"
        onClick={onForget}
        className="press grid h-6 w-6 flex-none place-items-center rounded-[6px] text-[var(--t4)] opacity-40 transition-opacity duration-[120ms] hover:bg-[var(--fill-2)] hover:text-[var(--t1)] hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-semibold text-[var(--t3)]">{title}</div>
      {children}
    </div>
  )
}

function MemoryList({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const brief = useEditor((s) => s.doc.brief) ?? {}
  const [rule, setRule] = useState('')
  const [confirm, setConfirm] = useState(false)
  const total = count(brief)
  const field = useRef<HTMLInputElement>(null)
  const forget = (k: keyof PageBrief, i?: number) =>
    update(
      (d) => {
        const b = { ...d.brief }
        if (i === undefined) delete b[k]
        else (b[k as ListKey] = (b[k as ListKey] ?? []).filter((_, j) => j !== i))
        d.brief = b
      },
      { label: 'Forgot a fact' },
    )
  const add = () => {
    const t = rule.trim()
    if (!t) return
    update((d) => void (d.brief = { ...d.brief, decisions: [...(d.brief?.decisions ?? []), t] }), { label: 'Added a rule for the AI' })
    setRule('')
  }
  const facts = FACTS.filter(([k]) => brief[k])
  return (
    <Popover anchor={anchor} onClose={onClose} align="end" width={300}>
      <div className="scroll-thin flex max-h-[min(460px,60vh)] flex-col overflow-auto p-1.5">
        {facts.length > 0 && (
          <Group title="About the business">
            {facts.map(([k, label]) => (
              <Row key={k} text={`${label}${brief[k]}`} onForget={() => forget(k)} />
            ))}
          </Group>
        )}
        {LISTS.map(([k, title]) =>
          brief[k]?.length ? (
            <Group key={k} title={title}>
              {brief[k]!.map((t, i) => (
                <Row key={`${k}${i}`} text={t} onForget={() => forget(k, i)} />
              ))}
            </Group>
          ) : null,
        )}
        {brief.assets?.length ? (
          <Group title="Your images">
            {/* every image you sent, kept for the AI to use again; the logo is marked */}
            <div className="flex flex-wrap gap-1.5 px-2 pb-1.5 pt-0.5">
              {brief.assets.map((a) => (
                <span key={a.url} className="group relative h-12 w-12 overflow-hidden rounded-[8px] bg-[var(--fill-1)] shadow-[0_0_0_1px_var(--line-2)]" title={a.note}>
                  <img src={a.url} alt="" className="h-full w-full object-contain" />
                  {brief.logo === a.url && <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[9.5px] font-medium leading-[14px] text-white">Logo</span>}
                  <button
                    type="button"
                    aria-label="Forget this image"
                    onClick={() => update((d) => void (d.brief = { ...d.brief, assets: d.brief?.assets?.filter((x) => x.url !== a.url), ...(d.brief?.logo === a.url ? { logo: undefined } : {}) }), { label: 'Forgot an image' })}
                    className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </Group>
        ) : null}
        {!count(brief) && <div className="px-2 py-3 text-[12.5px] leading-[18px] text-[var(--t3)]">Nothing yet. The AI writes down what you tell it about your business, your brand and your choices as you talk. You can also add your own rules below, before you build.</div>}
      </div>
      {total > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-2.5 py-2 text-[12px]">
          {confirm ? (
            <>
              <span className="text-[var(--t1)]">Forget all {total} things?</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => setConfirm(false)} className="press h-7 rounded-[7px] px-2.5 font-medium text-[var(--t2)] hover:bg-[var(--fill-1)]">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => (update((d) => ((d.brief = {}), (d.plan = undefined)), { label: 'Forgot everything' }), setConfirm(false))}
                  className="press h-7 rounded-[7px] bg-[var(--dng)] px-2.5 font-medium text-white hover:bg-[var(--dng-hover)]"
                >
                  Forget all
                </button>
              </span>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="press -ml-1 h-7 rounded-[7px] px-1.5 text-[var(--t3)] hover:bg-[var(--fill-1)] hover:text-[var(--dng)]">
              Forget everything
            </button>
          )}
        </div>
      )}
      <div className="border-t border-[var(--line)] p-1.5">
        <input
          ref={field}
          value={rule}
          onChange={(e) => setRule(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a rule, e.g. never mention discounts"
          className="h-8 w-full rounded-[7px] bg-[var(--fill-1)] px-2.5 text-[12.5px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
        />
      </div>
    </Popover>
  )
}
