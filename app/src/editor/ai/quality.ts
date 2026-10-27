import { walk } from '../tree'
import type { Node, PageDoc } from '../types'
import { lookAt } from './inspect'

/**
 * The hard checks a page must pass (the plan's "never ship" list): every part editable by hand, one language, no
 * repeated or missing photos, no placeholder words, nothing overlapping or running off the screen. Used by the test
 * runner and, later, by the build itself.
 */

export interface Fail {
  check: 'editable' | 'language' | 'photos' | 'placeholder' | 'layout'
  detail: string
}

const HOLDS_COLUMNS = new Set(['row', 'contentbox', 'carousel', 'faq', 'survey', 'calendar', 'form'])
const PLACEHOLDER = /(lorem ipsum|placeholder|sample student|client name|replace (it|this) (before|with)|your (name|text) here)/i
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/

const textOf = (n: Node) => [n.props.text, n.props.subtext, n.props.question, ...(n.props.items ?? [])].filter((x): x is string => typeof x === 'string').map((x) => x.replace(/<[^>]+>/g, ' '))

export function structuralFails(doc: PageDoc): Fail[] {
  const out: Fail[] = []
  const photos = new Map<string, number>()
  const texts: string[] = []
  walk(doc.sections, (n, parent) => {
    const d = n.style.desktop ?? {}
    if (n.type === 'column' && parent && !HOLDS_COLUMNS.has(parent.type)) out.push({ check: 'editable', detail: `a column inside a ${parent.type} (${n.id}) can't be reached` })
    if (n.type === 'column' && d.backgroundImage) out.push({ check: 'editable', detail: `a photo hidden as a column background (${n.id}): clicking it selects the row` })
    if (n.type === 'image' && typeof n.props.src === 'string' && !n.props.src.startsWith('img:') && !/^brand:|logo/i.test(n.props.src) && (n.props.aspect ?? 1) !== 0) photos.set(n.props.src, (photos.get(n.props.src) ?? 0) + 1)
    if (n.type === 'image' && typeof n.props.src === 'string' && n.props.src.startsWith('img:')) out.push({ check: 'photos', detail: `photo still missing: ${n.props.src.slice(4, 60)}` })
    for (const t of textOf(n)) {
      texts.push(t)
      if (PLACEHOLDER.test(t)) out.push({ check: 'placeholder', detail: `placeholder words on the page: "${t.slice(0, 60)}"` })
    }
    if (typeof n.props.author === 'string' && PLACEHOLDER.test(n.props.author)) out.push({ check: 'placeholder', detail: `placeholder name: ${n.props.author}` })
  })
  for (const [src, k] of photos) if (k > 1) out.push({ check: 'photos', detail: `the same photo is used ${k} times (${src.slice(-22)})` })
  // one language: on a right-to-left page, no sentence written only in Latin letters (and the reverse)
  const all = texts.join(' ')
  const rtlPage = (all.match(new RegExp(RTL.source, 'g')) ?? []).length > all.length * 0.3
  for (const t of texts) {
    const words = t.match(/\p{L}{3,}/gu) ?? []
    if (words.length < 2) continue
    const rtl = RTL.test(t)
    if (rtlPage && !rtl && /[a-z]{4,}/i.test(t)) out.push({ check: 'language', detail: `English text on a right-to-left page: "${t.slice(0, 50)}"` })
    if (!rtlPage && rtl) out.push({ check: 'language', detail: `right-to-left text on a left-to-right page: "${t.slice(0, 50)}"` })
  }
  return out
}

/** Every hard check, including the measured layout on desktop and phone. */
export async function hardChecks(doc: PageDoc): Promise<Fail[]> {
  const [desk, phone] = await Promise.all([lookAt(doc, 'desktop'), lookAt(doc, 'mobile')])
  const layout = [...desk.facts, ...phone.facts]
    .filter((f) => /overlaps|runs off|overflows|scrolls sideways|header is/.test(f))
    .map((detail) => ({ check: 'layout' as const, detail }))
  return [...structuralFails(doc), ...layout]
}
