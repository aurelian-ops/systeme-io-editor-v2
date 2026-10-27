import { useRef, useState } from 'react'
import { BookOpen, GraduationCap, Mail, MailCheck, Megaphone, Plus, Send, Tag, Users, X, Zap, type LucideIcon } from 'lucide-react'
import { setProps } from '../store'
import { Popover } from '../../ui/kit'
import { useInspector } from '../settings/kit'
import type { Automation } from '../types'

/** V1's automation actions, each with what it does and what it needs. */
const ACTIONS: { action: string; icon: LucideIcon; hint: string; ask: string; group: 'add' | 'remove' }[] = [
  { action: 'Add a tag', icon: Tag, hint: 'Label people so you can target them later', ask: 'Tag name', group: 'add' },
  { action: 'Subscribe to campaign', icon: Megaphone, hint: 'Start an email sequence', ask: 'Campaign', group: 'add' },
  { action: 'Send email', icon: Mail, hint: 'One email to the person who signed up', ask: 'Email', group: 'add' },
  { action: 'Send email to a specific email address', icon: MailCheck, hint: 'Get notified yourself', ask: 'Email address', group: 'add' },
  { action: 'Enroll in course', icon: GraduationCap, hint: 'Give access to a course', ask: 'Course', group: 'add' },
  { action: 'Enroll in a course bundle', icon: BookOpen, hint: 'Give access to several courses', ask: 'Bundle', group: 'add' },
  { action: 'Send webhook', icon: Send, hint: 'Send the data to another app', ask: 'https://', group: 'add' },
  { action: 'Grant access to a community', icon: Users, hint: 'Let them in your community', ask: 'Community', group: 'add' },
  { action: 'Remove tag', icon: Tag, hint: 'Take a label off', ask: 'Tag name', group: 'remove' },
  { action: 'Unsubscribe from campaign', icon: Megaphone, hint: 'Stop an email sequence', ask: 'Campaign', group: 'remove' },
  { action: 'Revoke access to a course', icon: GraduationCap, hint: 'Take course access away', ask: 'Course', group: 'remove' },
  { action: 'Revoke access to a course bundle', icon: BookOpen, hint: 'Take bundle access away', ask: 'Bundle', group: 'remove' },
  { action: 'Revoke access to a community', icon: Users, hint: 'Remove from the community', ask: 'Community', group: 'remove' },
]
const QUICK = ['Add a tag', 'Subscribe to campaign', 'Enroll in course']
const info = (a: string) => ACTIONS.find((x) => x.action === a) ?? ACTIONS[0]

/**
 * Automations read as a sentence (option C, "when / then"): "When this form is submitted, then Add a tag VIP".
 * The three most common actions are one tap; "More" opens the rest, grouped add / remove.
 */
export function Automations({ when = 'this form is submitted' }: { when?: string }) {
  const { node } = useInspector()
  const list = node.props.automations ?? []
  const put = (automations: Automation[], coalesce = false) => setProps(node.id, { automations }, coalesce)
  const more = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [fresh, setFresh] = useState<number | null>(null)
  const add = (action: string) => {
    put([...list, { action }])
    setFresh(list.length)
    setOpen(false)
  }
  return (
    <div className="flex flex-col">
      <div className="mb-1.5 text-[12px] text-[var(--t3)]">Automations</div>
      <div className="flex items-center gap-2 text-[12.5px] text-[var(--t3)]">
        <Zap size={14} className="flex-none text-[var(--brand)]" />
        <span>
          When {when.replace(/(submitted|ticked|clicked)$/, '')}
          <b className="font-medium text-[var(--t1)]">{when.match(/(submitted|ticked|clicked)$/)?.[0]}</b>
        </span>
      </div>
      <div className="ml-[6px] mt-1.5 border-l-[1.5px] border-[var(--line-2)] pl-3.5">
        {list.length > 0 && <div className="mb-1 mt-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[var(--t4)]">Then</div>}
        <div className="flex flex-col gap-1.5">
          {list.map((a, i) => {
            const { icon: Icon, ask } = info(a.action)
            return (
              <div key={i} className="group flex items-center gap-2 rounded-[9px] bg-[var(--fill-1)] p-1.5 pl-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-[var(--raised)] text-[var(--t2)] shadow-[0_0_0_1px_var(--line)]">
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[var(--t1)]">{a.action}</div>
                  <input
                    autoFocus={fresh === i}
                    value={a.value ?? ''}
                    onChange={(e) => put(list.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)), true)}
                    placeholder={ask}
                    className="w-full bg-transparent text-[12px] text-[var(--t3)] outline-none placeholder:text-[var(--t4)] focus:text-[var(--t1)]"
                  />
                </div>
                <button
                  aria-label={`Remove ${a.action}`}
                  onClick={() => put(list.filter((_, j) => j !== i))}
                  className="press flex h-6 w-6 flex-none items-center justify-center rounded-[6px] text-[var(--t4)] opacity-60 hover:bg-[var(--fill-2)] hover:text-[var(--dng)] hover:opacity-100 group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => {
            const Icon = info(q).icon
            return (
              <button key={q} onClick={() => add(q)} className="press flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--fill-1)] px-2.5 text-[12px] font-medium text-[var(--t1)] hover:bg-[var(--fill-2)]">
                <Icon size={13} className="text-[var(--t2)]" />
                {q}
              </button>
            )
          })}
          <button ref={more} onClick={() => setOpen((o) => !o)} className="press flex h-7 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--fill-1)] px-2.5 text-[12px] font-medium text-[var(--t1)] hover:bg-[var(--fill-2)]">
            <Plus size={13} />
            More
          </button>
        </div>
      </div>
      {open && more.current && (
        <Popover anchor={more.current} onClose={() => setOpen(false)} width={268}>
          <div className="scroll-thin max-h-[340px] overflow-auto p-1.5">
            {(['add', 'remove'] as const).map((g) => (
              <div key={g}>
                <div className="px-2 pb-1 pt-2 text-[11px] font-medium text-[var(--t4)]">{g === 'add' ? 'Add or give' : 'Remove or take away'}</div>
                {ACTIONS.filter((x) => x.group === g).map((x) => (
                  <button key={x.action} onClick={() => add(x.action)} className="press group flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left hover:bg-[var(--fill-1)]">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-[var(--fill-1)] text-[var(--t2)] group-hover:bg-[var(--raised)] group-hover:shadow-[0_0_0_1px_var(--line)]">
                      <x.icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] text-[var(--t1)]">{x.action}</span>
                      <span className="block text-[11.5px] leading-[15px] text-[var(--t3)]">{x.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Popover>
      )}
    </div>
  )
}
