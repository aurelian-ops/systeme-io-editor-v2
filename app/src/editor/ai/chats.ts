import { useSyncExternalStore } from 'react'
import { getState, onStoreChange, setState, toast, type AiTurn } from '../store'
import { keepAI } from './run'

/**
 * Chats with the AI, like Claude or ChatGPT: one memory (what the AI knows about the business, in Memory) shared
 * by every chat, and separate conversations you can start, reopen and delete. Kept in this browser for now (the
 * real product keeps them with the account); the open chat is the editor's conversation (aiTurns).
 */

export interface Chat {
  id: string
  /** the first request, shortened (what the chat is about) */
  title: string
  turns: AiTurn[]
  updatedAt: number
  /** the page it was about */
  page?: string
  /** the AI's last words, for a preview line */
  last?: string
  /** kept at the top of the list */
  pinned?: boolean
  /** named by you (kept when the chat goes on) */
  named?: boolean
}

const KEY = 'sio-editor-v2-chats'
const ACTIVE = 'sio-editor-v2-chat'

const slim = (t: AiTurn[]) => t.slice(-40).map(({ images, ...x }) => ({ ...x, images: images?.length ? [] : undefined }))
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function load(): Chat[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Chat[]
  } catch {
    return []
  }
}

let chats = load()
let active: string = localStorage.getItem(ACTIVE) ?? ''
const subs = new Set<() => void>()
let snapshot = { chats, active }
function changed() {
  snapshot = { chats, active }
  try {
    localStorage.setItem(KEY, JSON.stringify(chats))
    localStorage.setItem(ACTIVE, active)
  } catch {
    /* storage full or unavailable */
  }
  subs.forEach((f) => f())
}

export function useChats() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => snapshot,
  )
}

const titleOf = (t: AiTurn[]) => {
  const p = (t[0]?.prompt ?? '').replace(/\s+/g, ' ').trim()
  return p.length > 60 ? `${p.slice(0, 58).trimEnd()}…` : p || 'New chat'
}

// the open chat follows the conversation: every new message is saved into it (a first message starts a chat)
let seen: AiTurn[] | null = null
onStoreChange(() => {
  const turns = getState().aiTurns
  if (turns === seen) return
  seen = turns
  if (!turns.length) return
  const i = chats.findIndex((c) => c.id === active)
  const page = getState().doc.title
  const last = [...turns].reverse().find((t) => t.reply)?.reply
  const was = i >= 0 ? chats[i] : undefined
  const chat: Chat = { id: was ? active : newId(), title: was && (was.named || was.title !== 'New chat') ? was.title : titleOf(turns), turns: slim(turns), updatedAt: Date.now(), page, last, pinned: was?.pinned, named: was?.named }
  if (i < 0) active = chat.id
  chats = [chat, ...chats.filter((c) => c.id !== chat.id)]
  changed()
})

// the conversation open before chats existed becomes the first chat
if (!chats.length && getState().aiTurns.length) {
  seen = null
  setState({ aiTurns: [...getState().aiTurns] })
}

/** A fresh conversation; what the AI knows stays (Memory). A change still waiting is kept first. */
export function newChat() {
  if (getState().aiBusy) return
  if (getState().pending) keepAI()
  active = ''
  changed()
  seen = []
  setState({ aiTurns: seen, aiSteps: [], aiMessage: null, threadOpen: true })
}

/** Back to an earlier chat, exactly where it was. */
export function openChat(id: string) {
  if (getState().aiBusy || id === active) return void setState({ threadOpen: true })
  const c = chats.find((x) => x.id === id)
  if (!c) return
  if (getState().pending) keepAI()
  active = id
  changed()
  seen = c.turns
  setState({ aiTurns: c.turns, aiSteps: [], aiMessage: null, threadOpen: true })
}

/** Delete a chat (Undo brings it back). The memory is untouched. */
export function deleteChat(id: string) {
  const i = chats.findIndex((c) => c.id === id)
  if (i < 0 || (id === active && getState().aiBusy)) return
  const gone = chats[i]
  const wasActive = id === active
  chats = chats.filter((c) => c.id !== id)
  if (wasActive) {
    active = ''
    seen = []
    setState({ aiTurns: seen, aiSteps: [], aiMessage: null })
  }
  changed()
  toast('Chat deleted', () => {
    chats = [...chats.slice(0, i), gone, ...chats.slice(i)].sort((a, b) => b.updatedAt - a.updatedAt)
    if (wasActive) {
      active = gone.id
      seen = gone.turns
      setState({ aiTurns: gone.turns })
    }
    changed()
  })
}

/** Rename a chat (an empty name keeps the old one). */
export function renameChat(id: string, title: string) {
  const t = title.trim()
  if (!t) return
  chats = chats.map((c) => (c.id === id ? { ...c, title: t.slice(0, 80), named: true } : c))
  changed()
}

/** Keep a chat at the top of the list, or let it go back to its place. */
export function pinChat(id: string) {
  chats = chats.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
  changed()
}

/** "2 min ago", "Yesterday", "Mar 4": short, the way chat apps say it. */
export function when(t: number) {
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  const d = new Date(t)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Today, Yesterday, Earlier this week, Older: the groups chat apps use. */
export function groupOf(t: number) {
  const d = new Date(t)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  if (Date.now() - t < 7 * 864e5) return 'This week'
  return 'Older'
}

/** dev only (?chats=…&seed=1): a few earlier chats to see the list full */
export function seedChats() {
  if (chats.length > 2) return
  const mk = (title: string, ago: number, reply: string, page: string): Chat => ({
    id: newId(),
    title,
    updatedAt: Date.now() - ago,
    page,
    last: reply,
    turns: [{ id: newId(), prompt: title, scope: 'Whole page', steps: [], status: 'done', changes: 2, startedAt: Date.now() - ago, endedAt: Date.now() - ago, reply }],
  })
  chats = [
    ...chats,
    mk('Make the hero headline shorter and bolder', 40 * 60e3, 'Shortened the headline to six words and made it bolder.', 'Speak Up sales page'),
    mk('Add a testimonials section after the offer', 26 * 3600e3, 'Added three testimonials after the offer, marked as samples until you add real ones.', 'Speak Up sales page'),
    mk('Opt-in page for my free 7-day morning yoga plan', 3 * 864e5, 'Your page is ready: one clear promise, three reasons, and the sign-up form.', 'Morning yoga plan'),
    mk('How well will this page convert?', 4 * 864e5, 'Scored 72. The strongest part is the offer; the weakest is the proof.', 'Webinar registration'),
    mk('Translate the whole page into French', 12 * 864e5, 'Translated every section into French and kept your names and prices.', 'Fall candle collection'),
  ]
  changed()
}
