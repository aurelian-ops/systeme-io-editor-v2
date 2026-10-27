import type { Node, PageDoc } from '../types'

/** A one-tap request. `draft` ones open in the message box so you finish the sentence. */
export interface Suggestion {
  text: string
  draft?: string
  /** runs the conversion check instead of a request */
  check?: boolean
}

export type SuggestionKind = 'copy' | 'design' | 'layout' | 'check'

/** Words, look or layout: decides the small icon next to each idea. */
export function kindOf(s: Suggestion): SuggestionKind {
  const t = s.text.toLowerCase()
  if (s.check) return 'check'
  if (/rewrite|shorter|shorten|copy|translate|specific|headline|convincing|text|action-driven/.test(t) && !/full width|bigger/.test(t)) return 'copy'
  if (/premium|dark|look|corners|full width|hide|balanced|bigger|breathing/.test(t)) return 'design'
  return 'layout'
}

const STRUCTURE = new Set(['section', 'row', 'column'])

function stats(nodes: Node[]) {
  const types = new Set<string>()
  let content = 0
  let words = 0
  const walk = (n: Node) => {
    if (!STRUCTURE.has(n.type)) {
      content++
      types.add(n.type)
    }
    for (const v of [n.props.text, n.props.subtext, ...(n.props.items ?? []).map((i: unknown) => (typeof i === 'string' ? i : ''))])
      if (typeof v === 'string') words += v.split(/\s+/).filter(Boolean).length
    n.children?.forEach(walk)
  }
  nodes.forEach(walk)
  return { types, content, words }
}

/**
 * Suggestions that fit where you are: an empty page gets "build" ideas, a page in progress gets
 * what it is still missing, and a selection gets ideas for that one thing, always said in full
 * ("Make the whole page look more premium", not "Make it…").
 */
export function suggestionsFor(doc: PageDoc, sel: Node | undefined): Suggestion[] {
  if (!sel) {
    const s = stats(doc.sections)
    if (!s.content)
      return [
        { text: 'Build a landing page for…', draft: 'Build a landing page for ' },
        { text: 'Build a sales page for…', draft: 'Build a sales page for ' },
        { text: 'Add a sign-up section with a headline and an email form' },
      ]
    const missing: Suggestion[] = []
    // the most useful thing on a page with real content: how well will it convert, and the 3 fixes that matter most
    if (!s.types.has('headline')) missing.push({ text: 'Add a clear headline at the top of the page' })
    if (!s.types.has('button') && !s.types.has('form')) missing.push({ text: 'Add a call-to-action button' })
    if (s.content < 6) missing.push({ text: 'Fill out the page with the sections it is missing' })
    if (!s.types.has('quote')) missing.push({ text: 'Add a section with 3 testimonials' })
    if (!s.types.has('faq') && s.content >= 6) missing.push({ text: 'Add an FAQ near the end of the page' })
    if (s.words > 250) missing.push({ text: 'Shorten the copy on the whole page' })
    missing.push({ text: 'Make the whole page look more premium' })
    if (s.types.has('headline')) missing.push({ text: 'Rewrite the main headline to be more specific' })
    missing.push({ text: 'Make the whole page more convincing for…', draft: 'Make the whole page more convincing for ' })
    return missing.slice(0, 3)
  }

  const s = stats([sel])
  switch (sel.type) {
    case 'section':
      return s.content
        ? [{ text: "Rewrite this section's copy to be more specific" }, { text: 'Make this section look more premium' }, { text: 'Make this section dark' }]
        : [
            { text: 'Fill this section with a headline, text and a button' },
            { text: 'Turn this section into a pricing table with 3 plans' },
            { text: 'Turn this section into…', draft: 'Turn this section into ' },
          ]
    case 'row':
    case 'column': {
      if (!s.content) return [{ text: 'Fill this with a headline, text and a button' }, { text: 'Put 3 feature cards here' }]
      const cols = sel.type === 'row' ? (sel.children?.length ?? 1) : 1
      const out: Suggestion[] = []
      // a headline placed under its text is almost always a slip
      if (headlineAfterText(sel)) out.push({ text: 'Move the headline above the text' })
      if (cols > 1) out.push({ text: 'Make these columns look more balanced' })
      else out.push({ text: 'Put an image next to this text' })
      out.push({ text: 'Rewrite the copy in this row to be more specific' })
      if (cols === 1) out.push({ text: 'Give this row its own background' })
      return out.slice(0, 3)
    }
    case 'headline':
    case 'text':
    case 'eyebrow':
      return [{ text: 'Make this text shorter' }, { text: 'Make this text more specific, with a number' }, { text: 'Translate this text to…', draft: 'Translate this text to ' }]
    case 'button':
      return [{ text: 'Make the button text more action-driven' }, { text: 'Make this button full width on mobile' }]
    case 'image':
      return [{ text: 'Round the corners of this image' }, { text: 'Hide this image on mobile' }]
    case 'list':
      return [{ text: 'Make each list item shorter' }, { text: 'Add two more items to this list' }]
    case 'form':
      return [{ text: 'Add a phone number field to this form' }, { text: 'Make the form button more action-driven' }]
    default:
      return [{ text: `Make this ${sel.type} look more premium` }, { text: 'Change this…', draft: 'Change this so that ' }]
  }
}

/** True when, inside one column, a text comes before the first headline. */
function headlineAfterText(n: Node): boolean {
  const cols = n.type === 'column' ? [n] : (n.children ?? []).filter((c) => c.type === 'column')
  return cols.some((c) => {
    const kids = c.children ?? []
    const h = kids.findIndex((k) => k.type === 'headline')
    const t = kids.findIndex((k) => k.type === 'text')
    return h > 0 && t >= 0 && t < h
  })
}
