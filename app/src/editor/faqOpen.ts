import { useSyncExternalStore } from 'react'

/** Which question each FAQ shows open on the canvas (by FAQ id): the one picked in its settings, none otherwise. */
const open = new Map<string, number>()
const subs = new Set<() => void>()

export function setFaqOpen(id: string, i: number | null) {
  if ((open.get(id) ?? null) === i) return
  if (i === null) open.delete(id)
  else open.set(id, i)
  subs.forEach((f) => f())
}

export const useFaqOpen = (id: string) =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => open.get(id) ?? -1,
  )
