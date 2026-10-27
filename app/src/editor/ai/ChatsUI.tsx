import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, MessagesSquare, MoreHorizontal, Pencil, Pin, PinOff, Search, SquarePen, Trash2 } from 'lucide-react'
import { getState, onStoreChange, setState, useEditor } from '../store'
import { Button, IconButton, Popover, cx } from '../../ui/kit'
import { deleteChat, groupOf, newChat, openChat, pinChat, renameChat, seedChats, useChats, when, type Chat } from './chats'

/**
 * Chats, like the ChatGPT sidebar: the AI panel shows either the open chat or the list of chats (search, New,
 * pinned first, grouped by when, a "…" menu to pin, rename or delete). The first screen shows the three latest
 * as chips under the box. Memory is shared by every chat.
 */

// dev only (?seed=1): a few earlier chats, to see the list full
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('seed')) seedChats()

/* which the AI panel shows: the open chat or the list of chats */
let view: 'chat' | 'list' = 'chat'
const subs = new Set<() => void>()
export const setPanelView = (v: 'chat' | 'list') => ((view = v), subs.forEach((f) => f()))
export const usePanelView = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => view,
  )
// a message sent from anywhere (the first screen, a toolbar, the box) shows its conversation, never the list
let turnCount = getState().aiTurns.length
onStoreChange(() => {
  const n = getState().aiTurns.length
  if (n > turnCount && view === 'list') setPanelView('chat')
  turnCount = n
})

/** open the AI panel on the list of chats */
export const showAllChats = () => (setPanelView('list'), setState({ threadOpen: true }))

const open = (id: string) => (openChat(id), setPanelView('chat'))
const fresh = () => (newChat(), setPanelView('chat'))

/* ---------------- the list ---------------- */

function useFound(list: Chat[], q: string) {
  return useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? list.filter((c) => (c.title + ' ' + (c.page ?? '') + ' ' + (c.last ?? '')).toLowerCase().includes(s)) : list
  }, [list, q])
}

function Row({ c, on }: { c: Chat; on: boolean }) {
  const more = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) field.current?.select()
  }, [editing])
  if (editing)
    return (
      <input
        ref={field}
        defaultValue={c.title}
        aria-label="Chat name"
        onBlur={(e) => (renameChat(c.id, e.target.value), setEditing(false))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="m-0.5 h-8 rounded-[6px] bg-[var(--raised)] px-2 text-[13px] text-[var(--t1)] outline-none shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]"
      />
    )
  return (
    <div className={cx('group relative flex items-center rounded-[8px]', on ? 'bg-[var(--fill-2)]' : 'hover:bg-[var(--fill-1)]')}>
      <button onClick={() => open(c.id)} title={c.page ? `${c.title} · ${c.page}` : c.title} className="press min-w-0 flex-1 truncate py-[7px] pl-2.5 pr-8 text-left text-[13px] text-[var(--t1)]">
        {c.title}
      </button>
      <button
        ref={more}
        aria-label="More"
        onClick={() => setMenu((m) => !m)}
        className={cx('press absolute right-1 grid h-[26px] w-[26px] place-items-center rounded-[6px] text-[var(--t3)] hover:bg-[var(--fill-2)] hover:text-[var(--t1)]', menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
      >
        <MoreHorizontal size={15} />
      </button>
      {menu && (
        <Popover anchor={more.current} onClose={() => setMenu(false)} width={176} align="end">
          <div className="flex flex-col p-1">
            <MenuItem onClick={() => (pinChat(c.id), setMenu(false))} icon={c.pinned ? <PinOff size={14} /> : <Pin size={14} />}>
              {c.pinned ? 'Unpin' : 'Pin'}
            </MenuItem>
            <MenuItem onClick={() => (setMenu(false), setEditing(true))} icon={<Pencil size={14} />}>
              Rename
            </MenuItem>
            <div className="mx-1.5 my-1 h-px bg-[var(--line)]" />
            <MenuItem danger onClick={() => (setMenu(false), deleteChat(c.id))} icon={<Trash2 size={14} />}>
              Delete
            </MenuItem>
          </div>
        </Popover>
      )}
    </div>
  )
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('press flex h-[30px] items-center gap-2 rounded-[6px] px-2 text-left text-[13px] hover:bg-[var(--fill-1)]', danger ? 'text-[var(--dng)]' : 'text-[var(--t1)]')}>
      {icon}
      {children}
    </button>
  )
}

/** The AI panel's body when the list is open. */
export function ChatListPanel() {
  const { chats, active } = useChats()
  const busy = useEditor((s) => s.aiBusy)
  const [q, setQ] = useState('')
  const found = useFound(chats, q)
  const pins = found.filter((c) => c.pinned)
  const groups: [string, Chat[]][] = []
  for (const c of found.filter((x) => !x.pinned)) {
    const g = groupOf(c.updatedAt)
    const last = groups[groups.length - 1]
    if (last?.[0] === g) last[1].push(c)
    else groups.push([g, [c]])
  }
  if (pins.length) groups.unshift(['Pinned', pins])
  return (
    <div className="fade-in flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center gap-1.5 px-3 pb-2.5">
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] bg-[var(--fill-1)] px-2.5 focus-within:bg-[var(--raised)] focus-within:shadow-[0_0_0_1px_var(--brand),0_0_0_3px_var(--brand-tint)]">
          <Search size={13} className="flex-none text-[var(--t3)]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]" />
        </label>
        <Button variant="secondary" disabled={busy} onClick={fresh}>
          <SquarePen size={14} /> New
        </Button>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {!chats.length ? (
          <div className="px-2.5 py-8 text-center text-[13px] text-[var(--t3)]">No chats yet. What you ask the AI is kept here.</div>
        ) : !found.length ? (
          <div className="px-2.5 py-8 text-center text-[13px] text-[var(--t3)]">No chat matches “{q}”.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map(([g, list]) => (
              <div key={g} className="flex flex-col">
                <div className="px-2.5 pb-1 text-[11px] font-medium text-[var(--t4)]">{g}</div>
                {list.map((c) => (
                  <Row key={c.id} c={c} on={c.id === active} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- the panel header ---------------- */

/** The AI panel's header: "AI" with New chat and Chats, or "← Chats" when the list is open. */
export function ChatsHeader({ memory, close }: { memory: React.ReactNode; close: React.ReactNode }) {
  const v = usePanelView()
  const busy = useEditor((s) => s.aiBusy)
  const hasTurns = useEditor((s) => s.aiTurns.length > 0)
  return (
    <div className="flex h-12 flex-none items-center justify-between pl-2 pr-2">
      {v === 'list' ? (
        <button onClick={() => setPanelView('chat')} className="press flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-semibold text-[var(--t1)] hover:bg-[var(--fill-1)]">
          <ArrowLeft size={14} className="text-[var(--t3)]" /> Chats
        </button>
      ) : (
        <span className="pl-2 text-[13px] font-semibold">AI</span>
      )}
      <div className="flex flex-none items-center gap-0.5">
        {v === 'chat' && hasTurns && (
          <IconButton tip="New chat" disabled={busy} onClick={fresh}>
            <SquarePen size={15} />
          </IconButton>
        )}
        {v === 'chat' && (
          <IconButton tip="Chats" onClick={() => setPanelView('list')}>
            <MessagesSquare size={15} />
          </IconButton>
        )}
        {memory}
        {close}
      </div>
    </div>
  )
}

/* ---------------- the first screen ---------------- */

/** The three latest chats as chips under the first screen's box, and "All chats" (nothing when there are none). */
export function RecentChats() {
  const { chats } = useChats()
  if (!chats.length) return null
  return (
    <div className="v-rise mt-5 flex items-center justify-center gap-2">
      {chats.slice(0, 3).map((c) => (
        <button
          key={c.id}
          onClick={() => open(c.id)}
          // one row of chips: the name is short here, the full name, page and time show on hover
          title={[c.title, c.page, when(c.updatedAt)].filter(Boolean).join(' · ')}
          className="chat-chip press flex h-8 min-w-0 max-w-[184px] items-center gap-1.5 rounded-full px-3 text-[12.5px] text-[var(--studio-ink)]"
        >
          <MessagesSquare size={13} className="flex-none text-[var(--studio-sub)]" />
          <span className="truncate">{c.title}</span>
        </button>
      ))}
      {chats.length > 3 && (
        <button onClick={showAllChats} className="press h-8 rounded-full px-2.5 text-[12.5px] text-[var(--studio-sub)] hover:text-[var(--studio-ink)]">
          All chats
        </button>
      )}
    </div>
  )
}
