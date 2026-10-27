import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react'
import { IconButton, cx } from '../../ui/kit'
import { faqAnswer } from '../blocks'
import { setFaqOpen, useFaqOpen } from '../faqOpen'
import { setProps, toast, update } from '../store'
import { find } from '../tree'
import type { Node } from '../types'
import { useInspector } from './kit'

/**
 * The FAQ's questions, V1's row made calmer (Linear settings): number, the question in a soft field, then show on
 * the page (eye), move up / down and delete, always there. The question on show is outlined in blue; picking a
 * question opens its answer on the canvas, where you drop elements into it. Like V1, the last one can't be deleted.
 */
export function FaqQuestions() {
  const { node } = useInspector()
  const answers = node.children ?? []
  const open = useFaqOpen(node.id)
  const fields = useRef(new Map<string, HTMLInputElement>())
  const focusNext = useRef<string | null>(null)
  useEffect(() => {
    if (!focusNext.current) return
    const f = fields.current.get(focusNext.current)
    if (f) (f.focus(), f.select(), (focusNext.current = null))
  })
  const edit = (f: (list: Node[]) => void) =>
    update((d) => {
      const c = find(d, node.id)
      if (c?.children) f(c.children)
    })
  const show = (i: number | null) => setFaqOpen(node.id, i)
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= answers.length) return
    edit((list) => void ([list[i], list[j]] = [list[j], list[i]]))
    if (open === i) show(j)
    else if (open === j) show(i)
  }
  const remove = (i: number) => {
    edit((list) => void list.splice(i, 1))
    toast(`Deleted question ${i + 1}`)
    show(open === i ? null : open > i ? open - 1 : open)
  }
  const add = () => {
    const a = faqAnswer('New question')
    edit((list) => void list.push(a))
    show(answers.length)
    focusNext.current = a.id
  }

  return (
    <div className="flex flex-col gap-1.5">
      {answers.map((a, i) => {
        const on = i === open
        return (
          <div key={a.id} className="flex items-center gap-0.5">
            <span className="tnum mr-0.5 w-3.5 flex-none text-[12px] text-[var(--t4)]">{i + 1}</span>
            <input
              ref={(el) => void (el ? fields.current.set(a.id, el) : fields.current.delete(a.id))}
              value={a.props.question ?? ''}
              placeholder="Question"
              aria-label={`Question ${i + 1}`}
              // picking a question opens its answer on the page
              onFocus={() => show(i)}
              onChange={(e) => setProps(a.id, { question: e.target.value })}
              className={cx(
                'h-8 min-w-0 flex-1 truncate rounded-[8px] px-2.5 text-[13px] text-[var(--t1)] outline-none transition-[background-color,box-shadow] duration-[120ms] placeholder:text-[var(--t4)] focus:bg-[var(--raised)] focus:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]',
                on ? 'bg-[var(--raised)] shadow-[inset_0_0_0_1px_var(--brand)]' : 'bg-[var(--fill-1)] hover:bg-[var(--fill-2)]',
              )}
            />
            <IconButton tip={on ? 'Hide on the page' : 'Show on the page'} className={cx('h-7 w-[22px] flex-none', on && '!text-[var(--brand)]')} onClick={() => show(on ? null : i)}>
              <Eye size={14} />
            </IconButton>
            <IconButton tip="Move up" className="h-7 w-[22px] flex-none" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp size={14} />
            </IconButton>
            <IconButton tip="Move down" className="h-7 w-[22px] flex-none" disabled={i === answers.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown size={14} />
            </IconButton>
            <IconButton tip="Delete question" className="h-7 w-[22px] flex-none hover:text-[var(--dng)]" disabled={answers.length === 1} onClick={() => remove(i)}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        )
      })}
      <button
        type="button"
        onClick={add}
        className="press mt-1 flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--fill-1)] text-[13px] font-medium text-[var(--t1)] hover:bg-[var(--fill-2)]"
      >
        <Plus size={14} /> Add question
      </button>
    </div>
  )
}
