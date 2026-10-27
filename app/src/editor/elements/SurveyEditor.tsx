import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Tag, Trash2, X } from 'lucide-react'
import { Button, IconButton, Popover, Scrim, Toggle, cx } from '../../ui/kit'
import type { SurveyAnswer, SurveyQuestion } from '../types'

/** An answer as an object, whatever way it was saved. */
export const toAnswer = (a: string | SurveyAnswer): SurveyAnswer => (typeof a === 'string' ? { text: a } : a)

/** Tags from the account (sample in the prototype), plus any already used in this survey. */
const SAMPLE_TAGS = ['Beginner', 'Growing', 'Committed', 'Interested', 'Customer']

/**
 * Writing a survey (Google Forms, refined): a card per question with its title and subtitle side by side, answers
 * with "Open answer" and a tag, and a tool row (move, duplicate, delete). Changes apply on Save; Cancel drops them.
 */
export function SurveyEditor({ questions, onSave, onClose }: { questions: SurveyQuestion[]; onSave: (q: SurveyQuestion[]) => void; onClose: () => void }) {
  const [qs, setQs] = useState<SurveyQuestion[]>(() => questions.map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...toAnswer(a) })) })))
  const [active, setActive] = useState(0)
  const body = useRef<HTMLDivElement>(null)
  const tags = useMemo(() => [...new Set([...SAMPLE_TAGS, ...qs.flatMap((q) => q.answers.map((a) => toAnswer(a).tag ?? '').filter(Boolean))])], [qs])

  const setQ = (i: number, patch: Partial<SurveyQuestion>) => setQs((l) => l.map((q, j) => (j === i ? { ...q, ...patch } : q)))
  const setA = (i: number, k: number, patch: Partial<SurveyAnswer>) =>
    setQs((l) => l.map((q, j) => (j === i ? { ...q, answers: q.answers.map((a, m) => (m === k ? { ...toAnswer(a), ...patch } : a)) } : q)))
  const move = (i: number, d: number) =>
    setQs((l) => {
      const j = i + d
      if (j < 0 || j >= l.length) return l
      const n = [...l]
      ;[n[i], n[j]] = [n[j], n[i]]
      setActive(j)
      return n
    })
  const addQuestion = () => {
    setQs((l) => [...l, { title: '', subtitle: '', answers: [{ text: 'Answer 1' }, { text: 'Answer 2' }] }])
    setActive(qs.length)
    requestAnimationFrame(() => body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }))
  }

  return (
    <Scrim onClose={onClose}>
      <div className="pop-in flex max-h-[86vh] w-[780px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[16px] bg-[var(--raised)] shadow-[var(--shadow-pop)]" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex flex-none items-center gap-2 py-3 pl-5 pr-3 shadow-[inset_0_-1px_0_var(--line)]">
          <span className="flex-1 text-[15px] font-semibold tracking-[-0.01em] text-[var(--t1)]">Survey</span>
          <IconButton tip="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div ref={body} className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-auto bg-[var(--fill-1)] p-4">
          {qs.map((q, i) => (
            <div
              key={i}
              onFocusCapture={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              className="relative flex-none rounded-[12px] bg-[var(--raised)] px-[18px] pt-[18px] shadow-[var(--shadow-card)]"
            >
              {active === i && <span className="absolute bottom-[14px] left-0 top-[14px] w-[3px] rounded-r-[3px] bg-[var(--brand)]" />}
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-[11.5px] font-medium text-[var(--t3)]">Question {i + 1}</span>
                  <Field value={q.title} placeholder="Write your question" onChange={(v) => setQ(i, { title: v })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11.5px] font-medium text-[var(--t3)]">Subtitle</span>
                  <Field value={q.subtitle ?? ''} placeholder="Optional" onChange={(v) => setQ(i, { subtitle: v })} />
                </label>
              </div>

              <div className="mt-2.5 flex flex-col gap-2">
                {q.answers.map((raw, k) => {
                  const a = toAnswer(raw)
                  return (
                    <div key={k} className="flex items-center gap-2.5">
                      <Field grow value={a.text} placeholder={`Answer ${k + 1}`} onChange={(v) => setA(i, k, { text: v })} />
                      <label className="flex flex-none cursor-pointer items-center gap-1.5 text-[12px] text-[var(--t3)]">
                        {/* an open answer lets visitors type their own words; it has no tag (V1) */}
                        <Toggle checked={!!a.open} onChange={(v) => setA(i, k, { open: v, tag: v ? undefined : a.tag })} label="Open answer" />
                        Open answer
                      </label>
                      {a.open ? <span className="w-[112px] flex-none" /> : <TagPick value={a.tag} tags={tags} onChange={(t) => setA(i, k, { tag: t })} />}
                      <IconButton
                        tip="Delete answer"
                        className="flex-none hover:!text-[var(--dng)]"
                        disabled={q.answers.length <= 1}
                        onClick={() => setQ(i, { answers: q.answers.filter((_, m) => m !== k) })}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  )
                })}
                <button
                  className="press self-start py-1 text-[13px] font-medium text-[var(--brand)]"
                  onClick={() => setQ(i, { answers: [...q.answers, { text: `Answer ${q.answers.length + 1}` }] })}
                >
                  + Add answer
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1 py-2 shadow-[inset_0_1px_0_var(--line)]">
                <IconButton tip="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton tip="Move down" disabled={i === qs.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={14} />
                </IconButton>
                <span className="flex-1" />
                <IconButton
                  tip="Duplicate question"
                  onClick={() => {
                    setQs((l) => [...l.slice(0, i + 1), { ...q, answers: q.answers.map((x) => ({ ...toAnswer(x) })) }, ...l.slice(i + 1)])
                    setActive(i + 1)
                  }}
                >
                  <Copy size={14} />
                </IconButton>
                <IconButton tip="Delete question" className="hover:!text-[var(--dng)]" disabled={qs.length <= 1} onClick={() => (setQs((l) => l.filter((_, j) => j !== i)), setActive(Math.max(0, i - 1)))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
          ))}
          <Button className="flex-none self-center" onClick={addQuestion}>
            <Plus size={14} /> Add question
          </Button>
        </div>

        <div className="flex flex-none items-center justify-end gap-2 px-4 py-3 shadow-[inset_0_1px_0_var(--line)]">
          <span className="tnum mr-auto text-[12px] text-[var(--t3)]">
            {qs.length} {qs.length === 1 ? 'question' : 'questions'}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={() => onSave(qs.map((q) => ({ ...q, title: q.title.trim() || 'Untitled question' })))}>
            Save survey
          </Button>
        </div>
      </div>
    </Scrim>
  )
}

function Field({ value, placeholder, onChange, grow }: { value: string; placeholder?: string; onChange: (v: string) => void; grow?: boolean }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'h-[34px] w-full min-w-0 flex-none rounded-[8px] bg-[var(--fill-1)] px-2.5 text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]',
        grow && '!flex-1',
      )}
    />
  )
}

/** A tag chip: green when set; opens the account's tags (or a new one typed in), "No tag" clears it. */
function TagPick({ value, tags, onChange }: { value?: string; tags: string[]; onChange: (t: string | undefined) => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = tags.filter((t) => t.toLowerCase().includes(q.trim().toLowerCase()))
  const fresh = q.trim() && !tags.some((t) => t.toLowerCase() === q.trim().toLowerCase()) ? q.trim() : null
  const pick = (t: string | undefined) => (onChange(t), setOpen(false), setQ(''))
  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'press flex h-6 w-[112px] flex-none items-center gap-1.5 overflow-hidden rounded-full px-2 text-[12px] font-medium',
          value ? 'bg-[rgba(31,157,85,.12)] text-[#17723f]' : 'bg-[var(--fill-1)] text-[var(--t3)] hover:bg-[var(--fill-2)]',
        )}
      >
        <Tag size={12} className="flex-none" />
        <span className="truncate">{value || 'Add tag'}</span>
      </button>
      {open && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} width={200} align="end">
          <div className="flex flex-col gap-0.5 p-1">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (fresh ? pick(fresh) : list[0] && pick(list[0]))}
              placeholder="Find or create a tag"
              className="mb-1 h-8 rounded-[6px] bg-[var(--fill-1)] px-2 text-[12.5px] outline-none placeholder:text-[var(--t4)]"
            />
            {fresh && (
              <button onClick={() => pick(fresh)} className="press flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-left text-[12.5px] text-[var(--brand)] hover:bg-[var(--fill-1)]">
                <Plus size={13} /> Create “{fresh}”
              </button>
            )}
            {list.map((t) => (
              <button key={t} onClick={() => pick(t)} className={cx('press flex h-8 items-center rounded-[6px] px-2 text-left text-[12.5px] hover:bg-[var(--fill-1)]', t === value && 'font-semibold')}>
                {t}
              </button>
            ))}
            {value && (
              <button onClick={() => pick(undefined)} className="press flex h-8 items-center rounded-[6px] px-2 text-left text-[12.5px] text-[var(--t3)] hover:bg-[var(--fill-1)]">
                No tag
              </button>
            )}
          </div>
        </Popover>
      )}
    </>
  )
}
