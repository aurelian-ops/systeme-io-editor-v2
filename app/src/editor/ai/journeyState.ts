import { useSyncExternalStore } from 'react'
import { useEditor, type AiTurn } from '../store'
import type { ComposedPage } from './run'
import type { Direction } from '../types'

/**
 * A new page, step by step, on the canvas and in the outline list (which takes the left panel's place):
 * pick a look (the AI's four, drawn as artboards), check the plan, watch it build, then "ready".
 * The AI writes the page while you choose, so building after the plan is close to instant.
 */

export type JourneyPhase = 'writing' | 'looks' | 'building' | 'ready'

type Section = ComposedPage['sections'][number]

interface JourneyState {
  look: number
  photos: 'ai' | 'own'
  answers: Record<string, string>
  /** the top of the page (a header, the first screen), sent as soon as the AI wrote it: the artboards show your real words */
  preview?: Section[]
  /** the first screen's photo, made while you choose (its "img:" description → its url) */
  heroPhoto?: { from: string; url: string }
  /** the looks as they arrive, one by one, before the AI's answer is complete */
  looks: Direction[]
  /** the turn whose finished page the outline shows as "ready" (until closed) */
  readyFor?: string
}

const fresh = (): JourneyState => ({ look: 0, photos: 'ai', answers: {}, looks: [] })
let state = fresh()
const subs = new Set<() => void>()

export function setJourney(p: Partial<JourneyState> | ((s: JourneyState) => Partial<JourneyState>)) {
  state = { ...state, ...(typeof p === 'function' ? p(state) : p) }
  subs.forEach((f) => f())
}
export const resetJourney = () => setJourney(fresh())
export const getJourney = () => state

export function useJourneyState() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => state,
  )
}

/** Which step of a new page we are at, from the chat and the page (null: the editor as usual). */
export function useJourney(): { phase: JourneyPhase | null; turn?: AiTurn } {
  const j = useJourneyState()
  const turn = useEditor((s) => s.aiTurns[s.aiTurns.length - 1])
  const empty = useEditor((s) => s.doc.sections.length === 0)
  const buildingNew = useEditor((s) => s.aiBusy && !!s.pending && s.pending.base.sections.length === 0)
  if (turn?.status === 'answered' && turn.directions?.length && empty) return { phase: 'looks', turn }
  // a new page being written: the looks arrive one by one, then the choice
  // the first call of a new page (before the look is picked): the looks are being written
  if (buildingNew && turn?.status === 'working' && !turn.steps.some((x) => x.target) && !empty === false && !(turn.prompt.startsWith('Look:'))) return { phase: 'writing', turn }
  if (buildingNew) return { phase: 'building', turn }
  if (turn && j.readyFor === turn.id) return { phase: 'ready', turn }
  return { phase: null, turn }
}
